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
    async delete(key) { store.delete(key); },
    async list({ prefix = "", limit = 1000, cursor = "" } = {}) {
      const entries=[...store.entries()].filter(([name])=>name.startsWith(prefix)&&name>cursor).sort(([a],[b])=>a<b?-1:a>b?1:0);
      const page=entries.slice(0,limit);
      return {
        keys: page.map(([name,v])=>({name,metadata:v.metadata})),
        list_complete: entries.length<=limit,
        cursor: page.at(-1)?.[0] || "",
      };
    },
  };
}
