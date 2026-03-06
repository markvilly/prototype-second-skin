import { useRef, useEffect, useCallback } from "react";

// --- SOUND ENGINE ---
export function useSoundEngine(eco, muted) {
  const ctxRef = useRef(null);
  const nodesRef = useRef({});
  const startedRef = useRef(false);

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
  }, [eco]);

  useEffect(() => {
    if (!nodesRef.current.master) return;
    const now = ctxRef.current.currentTime;
    nodesRef.current.master.gain.linearRampToValueAtTime(
      muted ? 0 : 0.12,
      now + 0.5
    );
  }, [muted]);

  return { initAudio };
}
