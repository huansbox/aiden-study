import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
export async function collectionRuntime({ persist } = {}) {
  // Fixture入口只存在測試bundle，正式Worker完全不匯入此class或route。
  const source = `import worker from "../../worker/worker.mjs";
    import { ChildCollection } from "../../worker/collection-object.mjs";
    export class TestCollection extends ChildCollection {
      seed(days) {
        return this.ctx.storage.transactionSync(() => {
          let state=this.readState(); const C=globalThis.KidsCollectionCore;
          for(let i=1;i<=days;i++) {
            const now=new Date(Date.now()-86400000*i), occurredAt=now.toISOString(), roundId="fixture-"+C.dateKey(now);
            state=C.apply(state,{type:"round",hasPractice:true,event:{entryId:"spelling",roundId,occurredAt}},now);
          }
          this.sql.exec("INSERT INTO state(id,json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",JSON.stringify(state));
          return C.snapshot(state);
        });
      }
    }
    export default {async fetch(request,env,ctx){
      const url=new URL(request.url);
      if(url.pathname==="/__collection_fixture") {
        const {child,days}=await request.json();
        if(!["aiden","bingpu"].includes(child)||!Number.isInteger(days)||days<1||days>90)return new Response("invalid fixture",{status:400});
        return Response.json(await env.COLLECTIONS.getByName(child).seed(days));
      }
      return worker.fetch(request,env,ctx);
    }};`;
  const bundled = await build({ stdin: { contents: source, resolveDir: fileURLToPath(new URL("./", import.meta.url)), sourcefile: "collection-test-entry.mjs" }, bundle: true, write: false, format: "esm", platform: "neutral", external: ["cloudflare:workers"] });
  const mf = new Miniflare({ modules: true, script: bundled.outputFiles[0].text, compatibilityDate: "2026-07-01", cf: false, bindings: { TOKEN: "test-token", LOCAL_DEV: true }, kvNamespaces: ["KV"], durableObjects: { COLLECTIONS: { className: "TestCollection", useSQLite: true } }, ...(persist ? { durableObjectsPersist: persist } : {}) });
  return { mf, KV: await mf.getKVNamespace("KV"), fetch: async (request) => mf.dispatchFetch(request.url, { method: request.method, headers: Object.fromEntries(request.headers), ...(!["GET", "HEAD"].includes(request.method) ? { body: await request.arrayBuffer() } : {}) }),
    async seedFixtures({child="aiden",days=12}={}) { const response=await mf.dispatchFetch("http://local/__collection_fixture",{method:"POST",body:JSON.stringify({child,days})});if(!response.ok)throw Error("invalid fixture");return response.json(); },
    dispose: () => mf.dispose() };
}
