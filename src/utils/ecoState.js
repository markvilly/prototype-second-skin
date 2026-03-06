// --- ECOLOGICAL DATA SIMULATOR ---
// In production, this fetches from Alplakes API + Open-Meteo
// For the prototype, we simulate realistic seasonal data with drift

export function generateEcoState(time) {
  const t = time * 0.001;
  const slow = t * 0.05;
  const mid = t * 0.15;
  const fast = t * 0.4;

  const waterTemp =
    0.35 +
    0.15 * Math.sin(slow) +
    0.08 * Math.sin(mid * 1.3) +
    0.04 * Math.sin(fast * 2.1);
  const tempAnomaly = Math.abs(
    0.12 * Math.sin(mid * 0.7) + 0.08 * Math.sin(fast * 1.9)
  );
  const currentSpeed =
    0.3 + 0.2 * Math.sin(mid * 0.9) + 0.15 * Math.sin(fast * 1.6);
  const algae =
    0.2 + 0.15 * Math.sin(slow * 1.2) + 0.1 * Math.sin(mid * 2.1);
  const wind = 0.25 + 0.2 * Math.sin(mid * 0.6) + 0.15 * Math.sin(fast * 2.8);
  const airQuality =
    0.8 - 0.15 * Math.sin(slow * 0.8) - 0.1 * Math.sin(fast * 1.4);

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
    state.tempAnomaly * 0.35 +
      (1 - state.airQuality) * 0.25 +
      state.algaeLevel * 0.25 +
      state.windSpeed * 0.15
  );

  return state;
}
