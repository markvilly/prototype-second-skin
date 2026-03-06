import { useState, useEffect, useRef, useCallback } from "react";

// --- ECOLOGICAL DATA SIMULATOR ---
// In production, this fetches from Alplakes API + Open-Meteo
// For the prototype, we simulate realistic seasonal data with drift

function generateEcoState(time) {
  const t = time * 0.001;
  const slow = t * 0.05;
  const mid = t * 0.15;
  const fast = t * 0.4;

  const waterTemp = 0.35 + 0.15 * Math.sin(slow) + 0.08 * Math.sin(mid * 1.3) + 0.04 * Math.sin(fast * 2.1);
  const tempAnomaly = Math.abs(0.12 * Math.sin(mid * 0.7) + 0.08 * Math.sin(fast * 1.9));
  const currentSpeed = 0.3 + 0.2 * Math.sin(mid * 0.9) + 0.15 * Math.sin(fast * 1.6);
  const algae = 0.2 + 0.15 * Math.sin(slow * 1.2) + 0.1 * Math.sin(mid * 2.1);
  const wind = 0.25 + 0.2 * Math.sin(mid * 0.6) + 0.15 * Math.sin(fast * 2.8);
  const airQuality = 0.8 - 0.15 * Math.sin(slow * 0.8) - 0.1 * Math.sin(fast * 1.4);

  const clamp = (v) => Math.max(0, Math.min(1, v));

  const state = {
    waterTemp: clamp(waterTemp),
    tempAnomaly: clamp(tempAnomaly),
    currentSpeed: clamp(currentSpeed),
    algaeLevel: clamp(algae),
    windSpeed: clamp(wind),
    airQuality: clamp(airQuality),
  };

  state.stressIndex = clamp(
    state.tempAnomaly * 0.35 + (1 - state.airQuality) * 0.25 + state.algaeLevel * 0.25 + state.windSpeed * 0.15
  );

  return state;
}

// --- SOUND ENGINE ---
function useSoundEngine(eco, muted) {
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
      nodesRef.current = { master, drone, drone2, droneGain, drone2Gain, lfo, lfoGain, noiseFilter, noiseGain };
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
    n.drone2.frequency.linearRampToValueAtTime(90 + eco.waterTemp * 60 + eco.stressIndex * 30, now + 2);
    n.lfo.frequency.linearRampToValueAtTime(0.04 + eco.currentSpeed * 0.3, now + 2);
    n.lfoGain.gain.linearRampToValueAtTime(4 + eco.stressIndex * 20, now + 2);
    n.noiseFilter.frequency.linearRampToValueAtTime(200 + eco.windSpeed * 1200, now + 2);
    n.noiseGain.gain.linearRampToValueAtTime(0.02 + eco.windSpeed * 0.15, now + 2);
    n.drone2Gain.gain.linearRampToValueAtTime(0.05 + eco.stressIndex * 0.25, now + 2);
  }, [eco]);

  useEffect(() => {
    if (!nodesRef.current.master) return;
    const now = ctxRef.current.currentTime;
    nodesRef.current.master.gain.linearRampToValueAtTime(muted ? 0 : 0.12, now + 0.5);
  }, [muted]);

  return { initAudio };
}

// --- PARTICLE SYSTEM ---
function Particles({ eco }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 60; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.3,
          size: 1 + Math.random() * 2,
          alpha: 0.1 + Math.random() * 0.3,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const speed = 0.3 + eco.currentSpeed * 2;
      const windBias = (eco.windSpeed - 0.3) * 1.5;

      particlesRef.current.forEach((p) => {
        p.x += (p.vx + windBias * 0.5) * speed;
        p.y += p.vy * speed * 0.6;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const stress = eco.stressIndex;
        const r = Math.round(180 + stress * 75);
        const g = Math.round(200 - stress * 80);
        const b = Math.round(220 - stress * 40);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + stress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * (0.5 + eco.airQuality * 0.5)})`;
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, [eco]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  );
}

// --- MAIN INTERFACE ---
export default function SecondSkin() {
  const [eco, setEco] = useState(generateEcoState(0));
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(true);
  const [xray, setXray] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const { initAudio } = useSoundEngine(eco, muted);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => {
        const next = t + 120;
        setEco(generateEcoState(next));
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const handleStartAudio = () => {
    initAudio();
    setAudioReady(true);
    setMuted(false);
  };

  // Derive visual properties from ecological state
  const hue = Math.round(180 + eco.waterTemp * 40 - eco.stressIndex * 60);
  const sat = Math.round(30 + eco.algaeLevel * 40);
  const light = Math.round(8 + eco.airQuality * 10 - eco.stressIndex * 5);
  const blur = eco.tempAnomaly * 6;
  const grain = eco.stressIndex * 0.6;
  const animDuration = 8 - eco.currentSpeed * 5;
  const letterSpacing = eco.tempAnomaly * 0.3;
  const textOpacity = 0.4 + eco.airQuality * 0.4 - eco.stressIndex * 0.2;

  const bgColor = `hsl(${hue}, ${sat}%, ${light}%)`;
  const textColor = `hsla(${hue + 30}, ${Math.min(sat + 20, 60)}%, ${55 + eco.airQuality * 20}%, ${textOpacity})`;
  const accentColor = `hsla(${hue - 20}, ${sat + 10}%, ${40 + eco.stressIndex * 15}%, 0.6)`;

  const stressLabel =
    eco.stressIndex < 0.25 ? "equilibrium" : eco.stressIndex < 0.45 ? "drift" : eco.stressIndex < 0.65 ? "tension" : "rupture";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: bgColor,
        transition: "background 3s ease",
        overflow: "hidden",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        cursor: "crosshair",
      }}
    >
      {/* Grain overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          opacity: grain,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
          transition: "opacity 3s ease",
        }}
      />

      {/* Blur overlay for anomaly */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          transition: "backdrop-filter 3s ease",
        }}
      />

      <Particles eco={eco} />

      {/* Main content layer */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem",
        }}
      >
        {/* Title / Membrane text */}
        <div
          style={{
            textAlign: "center",
            maxWidth: "70ch",
            transition: "all 3s ease",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              fontWeight: 300,
              color: textColor,
              letterSpacing: `${letterSpacing}em`,
              lineHeight: 1.1,
              margin: 0,
              transition: "all 3s ease",
              filter: `blur(${eco.tempAnomaly * 1.5}px)`,
            }}
          >
            second skin
          </h1>

          <div
            style={{
              marginTop: "2rem",
              fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)",
              color: accentColor,
              letterSpacing: `${0.05 + letterSpacing * 0.5}em`,
              lineHeight: 1.8,
              fontStyle: "italic",
              transition: "all 3s ease",
            }}
          >
            {eco.stressIndex < 0.3
              ? "the lake breathes slowly. the membrane rests."
              : eco.stressIndex < 0.5
              ? "something shifts beneath the surface. the skin tightens."
              : eco.stressIndex < 0.7
              ? "currents pull against each other. the interface strains."
              : "the membrane fractures. the ecosystem speaks through rupture."}
          </div>

          <div
            style={{
              marginTop: "3rem",
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: `hsla(${hue}, 20%, 50%, 0.35)`,
              transition: "all 3s ease",
            }}
          >
            ecological state — {stressLabel}
          </div>
        </div>

        {/* X-Ray mode: reveals the data */}
        {xray && (
          <div
            style={{
              position: "fixed",
              bottom: "5rem",
              left: "2rem",
              right: "2rem",
              zIndex: 10,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.75rem",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            {[
              { label: "water temp", value: eco.waterTemp, unit: `${(4 + eco.waterTemp * 20).toFixed(1)}°C` },
              { label: "anomaly", value: eco.tempAnomaly, unit: `${(eco.tempAnomaly * 5).toFixed(1)}°` },
              { label: "current", value: eco.currentSpeed, unit: `${(eco.currentSpeed * 0.8).toFixed(2)} m/s` },
              { label: "algae", value: eco.algaeLevel, unit: `${(eco.algaeLevel * 30).toFixed(1)} µg/L` },
              { label: "wind", value: eco.windSpeed, unit: `${(eco.windSpeed * 40).toFixed(0)} km/h` },
              { label: "stress", value: eco.stressIndex, unit: stressLabel },
            ].map((d) => (
              <div
                key={d.label}
                style={{
                  background: `hsla(${hue}, 15%, 15%, 0.6)`,
                  backdropFilter: "blur(10px)",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  border: `1px solid hsla(${hue}, 20%, 30%, 0.3)`,
                }}
              >
                <div
                  style={{
                    fontSize: "0.55rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: `hsla(${hue}, 20%, 60%, 0.6)`,
                    marginBottom: "0.3rem",
                  }}
                >
                  {d.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 300,
                      color: `hsla(${hue + 20}, 30%, 70%, 0.9)`,
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    {d.unit}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "0.4rem",
                    height: "2px",
                    background: `hsla(${hue}, 15%, 25%, 0.4)`,
                    borderRadius: "1px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${d.value * 100}%`,
                      background: `hsla(${hue + 20}, 40%, 55%, 0.7)`,
                      borderRadius: "1px",
                      transition: "width 3s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 20,
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {!audioReady ? (
          <button
            onClick={handleStartAudio}
            style={{
              background: `hsla(${hue}, 15%, 20%, 0.5)`,
              border: `1px solid hsla(${hue}, 20%, 35%, 0.3)`,
              color: `hsla(${hue}, 20%, 65%, 0.7)`,
              padding: "0.5rem 0.85rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
            }}
          >
            enable sound
          </button>
        ) : (
          <button
            onClick={() => setMuted(!muted)}
            style={{
              background: `hsla(${hue}, 15%, 20%, 0.5)`,
              border: `1px solid hsla(${hue}, 20%, 35%, 0.3)`,
              color: `hsla(${hue}, 20%, 65%, 0.7)`,
              padding: "0.5rem 0.85rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              backdropFilter: "blur(8px)",
            }}
          >
            {muted ? "unmute" : "mute"}
          </button>
        )}
        <button
          onClick={() => setXray(!xray)}
          style={{
            background: xray ? `hsla(${hue}, 25%, 25%, 0.6)` : `hsla(${hue}, 15%, 20%, 0.5)`,
            border: `1px solid hsla(${hue}, 20%, 35%, 0.3)`,
            color: `hsla(${hue}, 20%, 65%, 0.7)`,
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
          }}
        >
          {xray ? "skin" : "x-ray"}
        </button>
      </div>

      {/* Bottom attribution */}
      <div
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "1.5rem",
          zIndex: 20,
          fontSize: "0.55rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: `hsla(${hue}, 15%, 45%, 0.35)`,
          lineHeight: 1.8,
        }}
      >
        second skin — ecosystem-centered interface
        <br />
        data: alplakes.eawag.ch + open-meteo.com
        <br />
        lake geneva · la becque residency
      </div>
    </div>
  );
}
