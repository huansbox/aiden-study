// in-memory KV stub（單元／契約測試用；線性一致——生產 KV 為最終一致，此差異為 spec 已知接受限制）

export function kvStub(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key) {
      return store.has(key) ? store.get(key).value : null;
    },
    async put(key, value, opts = {}) {
      store.set(key, { value, metadata: opts.metadata ?? null });
    },
    async list({ prefix = "" } = {}) {
      return {
        keys: [...store.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, v]) => ({ name, metadata: v.metadata })),
      };
    },
  };
}
