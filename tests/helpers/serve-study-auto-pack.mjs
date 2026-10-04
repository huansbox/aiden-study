// CUA 專用本機 synthetic server；只 bind loopback，絕不讀真題／family token。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../../worker/worker.mjs";
import { kvStub } from "../../worker/kv-stub.mjs";
import { syntheticPack, expandedSyntheticPack, socialSecondSyntheticPack, ids, addedIds } from "./synthetic-study-pack.mjs";

import { buildCatalog } from "../../scripts/build_private_study_catalog.mjs";
const root=resolve(fileURLToPath(new URL("../../docs/",import.meta.url)));
const port=Number(process.argv[2] || 8778);
const endpoint=`http://127.0.0.1:${port}`;
const KV=kvStub({"c:study:g4-s1-math-u1":{value:JSON.stringify(syntheticPack())}});
let failed=false;
let catalogMode=false;
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,endpoint);
    if(url.pathname==="/test-control"){
      failed=url.searchParams.get("mode")==="failed";
      if (url.searchParams.get("mode") === "expanded") await KV.put("c:study:g4-s1-math-u1", JSON.stringify(expandedSyntheticPack()));
      res.writeHead(302,{Location:"/study/?child=test-child"});res.end();return;
    }
    if(url.pathname==="/test-start"){
      catalogMode = url.searchParams.get("scenario") === "catalog";
      const partialReset = url.searchParams.get("scenario") === "partial-cache-reset";
      const upgrade = url.searchParams.get("scenario") === "upgrade" || partialReset;
      failed = false;
      await KV.put("c:study:g4-s1-math-u1", JSON.stringify(syntheticPack()));
      if(catalogMode) {
        const pack=socialSecondSyntheticPack();
        const built=await buildCatalog(pack,pack,[],65536);
        for(const [hash,raw] of built.shards) await KV.put(`c:study:shard:${hash}`,raw);
        await KV.put("c:study:catalog:v2",JSON.stringify(built.manifest));
      }
      const progress={schemaVersion:1,studyTerm:"g4-s1",semester:"final",subject:"math",mastered:{},challenge:{15:{batch:ids}},stats:{},errorBank:[],flagged:[]};
      if (upgrade) { progress.mastered[15] = ids.slice(0,2); progress.challenge[15].batch = ids.slice(2); }
      if (partialReset) { progress.mastered[15] = [...ids, addedIds[0]]; progress.challenge[15] = { batch: [ids[0], addedIds[0]], queue: [addedIds[0]] }; }
      const flaggedCount = Number(url.searchParams.get("flags"));
      if ([1, 6].includes(flaggedCount)) {
        progress.flagged = ids.slice(0, flaggedCount).map(questionId => ({ questionId, unit: 15, flaggedAt: 1 }));
      }
      res.setHeader("Content-Type","text/html; charset=utf-8");
      res.end(`<script>localStorage.clear();localStorage.setItem('study:progress:test-child',${JSON.stringify(JSON.stringify(progress))});${catalogMode ? "localStorage.setItem('kids_sync_token','test-token');" : ""}${upgrade ? `localStorage.setItem('kids_sync_token','test-token');localStorage.setItem('study:private-pack:g4-s1-math-u1',${JSON.stringify(JSON.stringify(syntheticPack()))});` : ""}indexedDB.deleteDatabase("study-private-catalog").onsuccess=()=>location.replace('/study/?child=test-child');</script>`);return;
    }
    if(url.pathname.startsWith("/v1/")){
      if(failed && url.pathname.includes("/packs/")){res.writeHead(503);res.end();return;}
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=Buffer.concat(chunks);
      const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,...(body.length?{body}: {})}),{TOKEN:"test-token",KV});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const path=resolve(root,`.${decodeURIComponent(url.pathname)}`,url.pathname.endsWith("/")?"index.html":"");
    if(!path.startsWith(root+sep)){res.writeHead(404);res.end();return;}
    let bytes=await readFile(path);
    if(catalogMode && path===resolve(root,"study/preview.html")) bytes=Buffer.from(bytes.toString().replace(/<script src="..\/shared\/device-auth.js[^>]*><\/script>/,`<script>window.KidsAuth={endpoint:${JSON.stringify(endpoint)},ready:Promise.resolve(),fetch:(url,init)=>fetch(url,{...init,headers:{Authorization:"Bearer test-token"}})};</script>`));
    if(path.endsWith("sync-v1.js")) bytes=Buffer.from(bytes.toString().replace('"https://aiden-kids-sync.huansbox.workers.dev"',JSON.stringify(endpoint)));
    if(path===resolve(root,"study/index.html")){
      if(catalogMode) bytes=Buffer.from(bytes.toString().replace(/<script src="..\/shared\/(?:device-auth|family-(?:core|client|app)|collection-(?:core|client))\.js[^>]*><\/script>/g,""));
      const controls=`<aside>隔離 synthetic 測試：<a href="/test-control?mode=failed">服務失敗</a> | <a href="/test-control?mode=ok">服務恢復</a> | <a href="/test-control?mode=expanded">發布合成十四題</a></aside>`;
      bytes=Buffer.from(bytes.toString().replace("<body>",`<body>${controls}`));
    }
    const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream","Cache-Control":"no-store","Content-Security-Policy":"connect-src 'self'"});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
server.listen(port,"127.0.0.1",()=>console.log(`synthetic local server ready: ${endpoint}/test-start`));
