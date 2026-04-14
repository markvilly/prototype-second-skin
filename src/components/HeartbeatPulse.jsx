import { useState, useEffect } from "react";

// --- HEARTBEAT PULSE RING ---
// beatCount increments once per beat in the sound engine — we react to it
// so the visual pulse is locked in time with the actual audio thump.
function HeartbeatPulse({ beatCount, stressIndex }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (beatCount === 0) return; // don't fire on mount before audio starts
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 180);
    return () => clearTimeout(t);
  }, [beatCount]);

  // Stress-driven color: calm blue-grey → warm amber → distressed red
  const ringColor =
    stressIndex < 0.25
      ? "140, 180, 200"
      : stressIndex < 0.65
      ? `${Math.round(140 + stressIndex * 120)}, ${Math.round(180 - stressIndex * 80)}, ${Math.round(200 - stressIndex * 120)}`
      : "220, 100, 80";

  const scale = pulse ? 1 + stressIndex * 0.15 : 1;
  const borderOpacity = pulse ? 0.5 + stressIndex * 0.3 : 0.08 + stressIndex * 0.08;
  const glowSpread = pulse ? Math.round(stressIndex * 40) : 0;
  const glowOpacity = pulse ? 0.15 + stressIndex * 0.25 : 0;

  const size = "min(70vw, 70vh)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `1px solid rgba(${ringColor}, ${borderOpacity})`,
          boxShadow: pulse
            ? `0 0 ${glowSpread}px rgba(${ringColor}, ${glowOpacity}), inset 0 0 ${Math.round(glowSpread * 0.5)}px rgba(${ringColor}, ${glowOpacity * 0.5})`
            : "none",
          transform: `scale(${scale})`,
          transition: pulse
            ? "transform 0.05s ease-out, border-color 0.05s ease, box-shadow 0.05s ease"
            : "transform 0.6s ease-out, border-color 0.6s ease, box-shadow 0.6s ease",
        }}
      />
    </div>
  );
}

export default HeartbeatPulse;
