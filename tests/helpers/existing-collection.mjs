// Synthetic saved builds; this fixture does not use or bypass the production selection API.
import "../../docs/shared/collection-core.js";
const C = globalThis.KidsCollectionCore;

export function withExistingBuild(previous, modelId, { id = `saved-${modelId}`, contentVersion = 2, now = new Date() } = {}) {
  if (!C.MODELS.includes(modelId)) throw new Error("unknown synthetic saved model");
  const state = structuredClone(previous);
  state.builds.push({ id, modelId, contentVersion, placed: [], completedAt: null });
  state.activeBuildId = id;
  return C.apply(state, { type: "allocate" }, now);
}
