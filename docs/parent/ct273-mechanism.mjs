// Single-side coupling experiment. Wheel spacing follows model-ct273.js (144, 218, 292).
export const CENTERS = [285, 450, 615];
export const AXLE_Y = 236;
export const CRANK_RADIUS = 29;
export const normalize = angle => ((angle % 360) + 360) % 360;
export const angularDelta = (from, to) => ((to - from + 540) % 360) - 180;
export function createMechanism() {
  const state = { installed: [false, false, false], angles: [0, 0, 0], linked: false };
  return {
    state,
    install(index) {
      if (!Number.isInteger(index) || index < 0 || index > 2 || state.installed[index]) return false;
      state.installed[index] = true;
      return true;
    },
    align() {
      if (!state.installed.every(Boolean) || state.linked) return false;
      state.angles.fill(state.angles[0]);
      return true;
    },
    connect() {
      if (!state.installed.every(Boolean) || state.linked) return false;
      state.angles.fill(state.angles[0]);
      state.linked = true;
      return true;
    },
    disconnect() { state.linked = false; },
    turn(index, delta) {
      if (!state.installed[index] || !Number.isFinite(delta)) return false;
      const angle = normalize(state.angles[index] + delta);
      if (state.linked) state.angles.fill(angle);
      else state.angles[index] = angle;
      return true;
    },
    pins() {
      return CENTERS.map((x, i) => {
        const radians = state.angles[i] * Math.PI / 180;
        return { x: x + CRANK_RADIUS * Math.cos(radians), y: AXLE_Y + CRANK_RADIUS * Math.sin(radians) };
      });
    },
  };
}
