import { useRef, useEffect, useCallback, useState } from "react";

// --- HEARTBEAT SYNTHESIZER ---
function createHeartbeat(ctx, master) {
  // Low-pass filter for chest-feel muffled thump
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 80;
  filter.Q.value = 8;

  const heartGain = ctx.createGain();
  heartGain.gain.value = 0.15;

  filter.connect(heartGain);
  heartGain.connect(master);

  let timeoutId = null;
  let currentBPM = 40;
  let running = false;

  function playThump(startFreq, endFreq, gainPeak, delayMs) {
    const t = ctx.currentTime + delayMs / 1000;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.linearRampToValueAtTime(endFreq, t + 0.12);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gainPeak, t + 0.01);
    env.gain.exponentialDecayToValueAtTime =
      env.gain.exponentialRampToValueAtTime;
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(env);
    env.connect(filter);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  function beat() {
    if (!running) return;
    // LUB: 55Hz → 35Hz, gain 1.0, immediate
    playThump(55, 35, 1.0, 0);
    // DUB: 65Hz → 40Hz, gain 0.6, delayed 120ms
    playThump(65, 40, 0.6, 120);

    const jitter = currentBPM > 80 ? (Math.random() - 0.5) * 120 : 0;
    const interval = 60000 / (currentBPM + jitter);
    timeoutId = setTimeout(beat, interval);
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

  function updateBPM(stressIndex, now) {
    currentBPM = 36 + stressIndex * 94;
    heartGain.gain.linearRampToValueAtTime(
      0.15 + stressIndex * 0.55,
      now + 2
    );
    filter.frequency.linearRampToValueAtTime(
      80 + stressIndex * 200,
      now + 2
    );
  }

  return { start, stop, updateBPM, getCurrentBPM: () => currentBPM };
}

// --- SOUND ENGINE ---
export function useSoundEngine(eco, muted) {
  const ctxRef = useRef(null);
  const nodesRef = useRef({});
  const startedRef = useRef(false);
  const heartbeatRef = useRef(null);
  const [bpm, setBpm] = useState(40);

  const initAudio = useCallback(() => {
    if (startedRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0.12;
      master.connect(ctx.destination);

      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = 80;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.4;
      drone.connect(droneGain).connect(master);
      drone.start();

      const drone2 = ctx.createOscillator();
      drone2.type = "sine";
      drone2.frequency.value = 120;
      const drone2Gain = ctx.createGain();
      drone2Gain.gain.value = 0.15;
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
      noiseGain.gain.value = 0.08;
      noise.connect(noiseFilter).connect(noiseGain).connect(master);
      noise.start();

      // Heartbeat synthesizer
      const heartbeat = createHeartbeat(ctx, master);
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
    } catch (e) {
      console.warn("Audio init failed:", e);
    }
  }, []);

  useEffect(() => {
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
      0.02 + eco.windSpeed * 0.15,
      now + 2
    );
    n.drone2Gain.gain.linearRampToValueAtTime(
      0.05 + eco.stressIndex * 0.25,
      now + 2
    );

    // Update heartbeat BPM
    if (heartbeatRef.current) {
      heartbeatRef.current.updateBPM(eco.stressIndex, now);
      setBpm(Math.round(heartbeatRef.current.getCurrentBPM()));
    }
  }, [eco]);

  useEffect(() => {
    if (!nodesRef.current.master) return;
    const now = ctxRef.current.currentTime;
    nodesRef.current.master.gain.linearRampToValueAtTime(
      muted ? 0 : 0.12,
      now + 0.5
    );
  }, [muted]);

  // Also expose bpm derived from eco even when audio isn't started
  const derivedBpm = Math.round(36 + eco.stressIndex * 94);

  return { initAudio, bpm: startedRef.current ? bpm : derivedBpm };
}
