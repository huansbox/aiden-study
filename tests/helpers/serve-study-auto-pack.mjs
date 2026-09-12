// CUA 專用本機 synthetic server；只 bind loopback，絕不讀真題／family token。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../../worker/worker.mjs";
import { kvStub } from "../../worker/kv-stub.mjs";
import { syntheticPack, ids } from "./synthetic-study-pack.mjs";

const root=resolve(fileURLToPath(new URL("../../docs/",import.meta.url)));
const port=Number(process.argv[2] || 8778);
const endpoint=`http://127.0.0.1:${port}`;
const KV=kvStub({"c:study:g4-s1-math-u1":{value:JSON.stringify(syntheticPack())}});
let failed=false;
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,endpoint);
    if(url.pathname==="/test-control"){
      failed=url.searchParams.get("mode")==="failed";
      res.writeHead(302,{Location:"/study/?child=test-child"});res.end();return;
    }
    if(url.pathname==="/test-start"){
      const progress={schemaVersion:1,studyTerm:"g4-s1",semester:"final",subject:"math",mastered:{},challenge:{15:{batch:ids}},stats:{},errorBank:[],flagged:[]};
      res.setHeader("Content-Type","text/html; charset=utf-8");
      res.end(`<script>localStorage.clear();localStorage.setItem('study:progress:test-child',${JSON.stringify(JSON.stringify(progress))});location.replace('/study/?child=test-child');</script>`);return;
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
    if(path.endsWith("sync-v1.js")) bytes=Buffer.from(bytes.toString().replace('"https://aiden-kids-sync.huansbox.workers.dev"',JSON.stringify(endpoint)));
    if(path===resolve(root,"study/index.html")){
      const controls=`<aside>隔離 synthetic 測試：<a href="/test-control?mode=failed">服務失敗</a> | <a href="/test-control?mode=ok">服務恢復</a></aside>`;
      bytes=Buffer.from(bytes.toString().replace("<body>",`<body>${controls}`));
    }
    const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
    res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream","Cache-Control":"no-store","Content-Security-Policy":"connect-src 'self'"});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
});
server.listen(port,"127.0.0.1",()=>console.log(`synthetic local server ready: ${endpoint}/test-start`));
