// --- X-RAY DATA PANEL ---
function XRayPanel({ eco, hue, stressLabel, bpm }) {
  const metrics = [
    {
      label: "water temp",
      value: eco.waterTemp,
      unit: `${(4 + eco.waterTemp * 20).toFixed(1)}°C`,
      barColor: null,
    },
    {
      label: "anomaly",
      value: eco.tempAnomaly,
      unit: `${(eco.tempAnomaly * 5).toFixed(1)}°`,
      barColor: null,
    },
    {
      label: "current",
      value: eco.currentSpeed,
      unit: `${(eco.currentSpeed * 0.8).toFixed(2)} m/s`,
      barColor: null,
    },
    {
      label: "algae",
      value: eco.algaeLevel,
      unit: `${(eco.algaeLevel * 30).toFixed(1)} µg/L`,
      barColor: null,
    },
    {
      label: "wind",
      value: eco.windSpeed,
      unit: `${(eco.windSpeed * 40).toFixed(0)} km/h`,
      barColor: null,
    },
    { label: "stress", value: eco.stressIndex, unit: stressLabel, barColor: null },
    {
      label: "pulse",
      value: (bpm - 36) / 94, // normalise 36–130 bpm → 0–1
      unit: `${bpm} bpm`,
      barColor: `hsla(5, 70%, 55%, 0.8)`,
    },
  ];

  return (
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
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      {metrics.map((d) => (
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
              color: d.label === "pulse"
                ? "hsla(5, 60%, 65%, 0.7)"
                : `hsla(${hue}, 20%, 60%, 0.6)`,
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
                color: d.label === "pulse"
                  ? "hsla(5, 50%, 72%, 0.9)"
                  : `hsla(${hue + 20}, 30%, 70%, 0.9)`,
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
                background: d.barColor || `hsla(${hue + 20}, 40%, 55%, 0.7)`,
                borderRadius: "1px",
                transition: "width 3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default XRayPanel;
