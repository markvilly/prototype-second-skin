import { useRef, useEffect, useCallback, useState } from "react";

// Rolling average: exponential moving average over ~1 hour of real time.
// dt = 0.12s (120ms update interval), tau = 3600s (1 hour)
const EMA_ALPHA = 0.12 / 3600; // ≈ 0.0000333
const INITIAL_AVG_BPM = 72;    // normal human resting rate

// --- HEARTBEAT SYNTHESIZER ---
// onBeat: fired each beat so the UI ring syncs exactly to audio
function createHeartbeat(ctx, destination, onBeat) {
  // Dedicated gain for the heartbeat — connects straight to destination
  // so its level is independent of the ambient drone master.
  const heartGain = ctx.createGain();
  heartGain.gain.value = 1.0;
  heartGain.connect(destination);

  // Bandpass shaping: 200-400 Hz is well within laptop speaker range
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 220;
  filter.Q.value = 0.8;
  filter.connect(heartGain);

  let timeoutId = null;
  let currentBPM = INITIAL_AVG_BPM;
  let running = false;

  function playThump(startFreq, endFreq, gainPeak, delayMs) {
    const t = ctx.currentTime + delayMs / 1000;

    const osc = ctx.createOscillator();
    // Sawtooth has rich harmonics — much more audible on laptop speakers
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.18);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(env);
    env.connect(filter);

    osc.start(t);
    osc.stop(t + 0.28);
  }

  function beat() {
    if (!running) return;

    // Tell UI to flash the ring in lockstep with this thump
    onBeat();

    // LUB — primary thump: 260 Hz → 160 Hz
    playThump(260, 160, 1.0, 0);
    // DUB — secondary thump: 320 Hz → 200 Hz, quieter, ~200 ms later
    playThump(320, 200, 0.5, 200);

    timeoutId = setTimeout(beat, 60000 / currentBPM);
  }

  function start() {
    if (running) return;
    running = true;
    beat();
  }

  function stop() {
    running = false;
    if (timeoutId) clearTimeout(timeoutId);
  }

  function updateBPM(avgBpm, stressIndex, now) {
    currentBPM = avgBpm;
    // Louder and brighter under ecological stress
    heartGain.gain.linearRampToValueAtTime(0.8 + stressIndex * 0.6, now + 2);
    filter.frequency.linearRampToValueAtTime(180 + stressIndex * 200, now + 2);
  }

  return { start, stop, updateBPM, getCurrentBPM: () => currentBPM };
}

// --- SOUND ENGINE ---
export function useSoundEngine(eco, muted) {
  const ctxRef = useRef(null);
  const nodesRef = useRef({});
  const startedRef = useRef(false);
  const heartbeatRef = useRef(null);
  const avgBpmRef = useRef(INITIAL_AVG_BPM);

  const [audioStarted, setAudioStarted] = useState(false);
  const [bpm, setBpm] = useState(INITIAL_AVG_BPM);
  const [beatCount, setBeatCount] = useState(0);

  const initAudio = useCallback(() => {
    if (startedRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Safari and some Chrome versions start the context suspended even on
      // a user-gesture click — resume() is required.
      ctx.resume();

      // --- Ambient drone bed ---
      const master = ctx.createGain();
      master.gain.value = 0.15;
      master.connect(ctx.destination);

      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 80;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.3;
      drone.connect(droneGain).connect(master);
      drone.start();

      const drone2 = ctx.createOscillator();
      drone2.type = "sine";
      drone2.frequency.value = 120;
      const drone2Gain = ctx.createGain();
      drone2Gain.gain.value = 0.12;
      drone2.connect(drone2Gain).connect(master);
      drone2.start();

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 8;
      lfo.connect(lfoGain).connect(drone.frequency);
      lfo.start();

      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      noise.buffer = buf;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 400;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.05;
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start();

      // --- Heartbeat — goes direct to destination, not through master ---
      // This keeps it audible and independent of the ambient mute level.
      const heartbeat = createHeartbeat(ctx, ctx.destination, () => {
        setBeatCount((c) => c + 1);
      });
      heartbeat.start();
      heartbeatRef.current = heartbeat;

      ctxRef.current = ctx;
      nodesRef.current = {
        master,
        drone,
        drone2,
        droneGain,
        drone2Gain,
        lfo,
        lfoGain,
        noiseFilter,
        noiseGain,
      };
      startedRef.current = true;
      setAudioStarted(true);
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  }, []);

  useEffect(() => {
    // EMA always runs so the average has settled before audio starts
    const rawBpm = 36 + eco.stressIndex * 94;
    avgBpmRef.current = EMA_ALPHA * rawBpm + (1 - EMA_ALPHA) * avgBpmRef.current;

    if (!startedRef.current || !ctxRef.current) return;
    const n = nodesRef.current;
    const now = ctxRef.current.currentTime;

    n.drone.frequency.linearRampToValueAtTime(60 + eco.waterTemp * 80, now + 2);
    n.drone2.frequency.linearRampToValueAtTime(
      90 + eco.waterTemp * 60 + eco.stressIndex * 30,
      now + 2
    );
    n.lfo.frequency.linearRampToValueAtTime(
      0.04 + eco.currentSpeed * 0.3,
      now + 2
    );
    n.lfoGain.gain.linearRampToValueAtTime(4 + eco.stressIndex * 20, now + 2);
    n.noiseFilter.frequency.linearRampToValueAtTime(
      200 + eco.windSpeed * 1200,
      now + 2
    );
    n.noiseGain.gain.linearRampToValueAtTime(
      0.02 + eco.windSpeed * 0.08,
      now + 2
    );
    n.drone2Gain.gain.linearRampToValueAtTime(
      0.04 + eco.stressIndex * 0.2,
      now + 2
    );

    if (heartbeatRef.current) {
      heartbeatRef.current.updateBPM(avgBpmRef.current, eco.stressIndex, now);
      setBpm(Math.round(avgBpmRef.current));
    }
  }, [eco]);

  // Mute only controls the ambient drone bed; heartbeat stays audible
  useEffect(() => {
    if (!nodesRef.current.master) return;
    const now = ctxRef.current.currentTime;
    nodesRef.current.master.gain.linearRampToValueAtTime(
      muted ? 0 : 0.15,
      now + 0.5
    );
  }, [muted]);

  const rawBpm = Math.round(36 + eco.stressIndex * 94);

  return {
    initAudio,
    bpm: audioStarted ? bpm : INITIAL_AVG_BPM,
    rawBpm,
    beatCount,
  };
}
