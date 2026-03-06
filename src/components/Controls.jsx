// --- CONTROLS ---
function Controls({ hue, audioReady, muted, xray, onStartAudio, onToggleMute, onToggleXray }) {
  const btnStyle = (active = false) => ({
    background: active
      ? `hsla(${hue}, 25%, 25%, 0.6)`
      : `hsla(${hue}, 15%, 20%, 0.5)`,
    border: `1px solid hsla(${hue}, 20%, 35%, 0.3)`,
    color: `hsla(${hue}, 20%, 65%, 0.7)`,
    padding: "0.5rem 0.85rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.65rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    backdropFilter: "blur(8px)",
  });

  return (
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
        <button onClick={onStartAudio} style={btnStyle()}>
          enable sound
        </button>
      ) : (
        <button onClick={onToggleMute} style={btnStyle()}>
          {muted ? "unmute" : "mute"}
        </button>
      )}
      <button onClick={onToggleXray} style={btnStyle(xray)}>
        {xray ? "skin" : "x-ray"}
      </button>
    </div>
  );
}

export default Controls;
