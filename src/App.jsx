import { useState, useEffect } from "react";
import { generateEcoState } from "./utils/ecoState";
import { useSoundEngine } from "./hooks/useSoundEngine";
import Particles from "./components/Particles";
import HeartbeatPulse from "./components/HeartbeatPulse";
import XRayPanel from "./components/XRayPanel";
import Controls from "./components/Controls";

// --- MAIN INTERFACE ---
export default function App() {
  const [eco, setEco] = useState(generateEcoState(0));
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(true);
  const [xray, setXray] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const { initAudio, bpm } = useSoundEngine(eco, muted);

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
  const letterSpacing = eco.tempAnomaly * 0.3;
  const textOpacity = 0.4 + eco.airQuality * 0.4 - eco.stressIndex * 0.2;

  const bgColor = `hsl(${hue}, ${sat}%, ${light}%)`;
  const textColor = `hsla(${hue + 30}, ${Math.min(sat + 20, 60)}%, ${55 + eco.airQuality * 20}%, ${textOpacity})`;
  const accentColor = `hsla(${hue - 20}, ${sat + 10}%, ${40 + eco.stressIndex * 15}%, 0.6)`;

  const stressLabel =
    eco.stressIndex < 0.25
      ? "equilibrium"
      : eco.stressIndex < 0.45
      ? "drift"
      : eco.stressIndex < 0.65
      ? "tension"
      : "rupture";

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
      <HeartbeatPulse bpm={bpm} stressIndex={eco.stressIndex} />

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
              marginTop: "2rem",
              fontSize: "0.65rem",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.1em",
              color: `hsla(${hue}, 20%, 55%, 0.3)`,
              transition: "all 3s ease",
            }}
          >
            {bpm} bpm
          </div>

          <div
            style={{
              marginTop: "1rem",
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
          <XRayPanel eco={eco} hue={hue} stressLabel={stressLabel} bpm={bpm} />
        )}
      </div>

      {/* Controls */}
      <Controls
        hue={hue}
        audioReady={audioReady}
        muted={muted}
        xray={xray}
        onStartAudio={handleStartAudio}
        onToggleMute={() => setMuted(!muted)}
        onToggleXray={() => setXray(!xray)}
      />

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
