import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
import { syntheticPack, ids } from "./helpers/synthetic-study-pack.mjs";

const url = "https://sync.test/v1/packs/g4-s1-math-u1";
const contentKey = "c:study:g4-s1-math-u1";
const cacheKey = "study:private-pack:g4-s1-math-u1";
const progressKey = "study:progress:test-child";
const raw = p => JSON.stringify(p || syntheticPack());
const plain = x => JSON.parse(JSON.stringify(x));
const flush = async () => { for (let i=0;i<40;i++) await Promise.resolve(); };
const answer = q => q.blanks ? q.blanks.map(b=>b.answer) : q.answer;
function request(method="GET", token="test-token", target=url) {
  return new Request(target, { method, headers: token ? { Authorization: `Bearer ${token}`, Origin: "https://kids.linshuhuan.com" } : {} });
}
function network(reply = () => new Response(raw())) {
  const requests = [];
  return { requests, fetch: async (url, init) => {
    requests.push({ url, init });
    if (url.includes("/v1/packs/")) return reply(url, init);
    // Sync stays on its real protocol, with entirely synthetic progress.
    return new Response(JSON.stringify({ rev: 0, data: null }));
  } };
}
function seeded(p) {
  const st=storage(); st.map.set("kids_sync_token","test-token");
  if(p) st.map.set(cacheKey,raw(p));
  return st;
}

test("Worker content route: auth, CORS, read-only, fixed pack, no-store, status and progress isolation", async () => {
  const kv=kvStub({
    [contentKey]:{value:raw()},
    "p:test-child:study":{value:JSON.stringify({rev:3,data:{mastered:{15:[ids[0]]}}})},
  });
  const env={TOKEN:"test-token",KV:kv};
  for (const token of [null,"wrong"]) {
    const res=await worker.fetch(request("GET",token),env); assert.equal(res.status,401); assert.ok(!(await res.text()).includes(ids[0]));
  }
  const res=await worker.fetch(request(),env);
  assert.equal(res.status,200); assert.equal(res.headers.get("Cache-Control"),"no-store");
  assert.equal(res.headers.get("Access-Control-Allow-Origin"),"https://kids.linshuhuan.com");
  assert.deepEqual(await res.json(),syntheticPack());
  for(const method of ["PUT","POST","DELETE","PATCH","HEAD"]) assert.equal((await worker.fetch(request(method),env)).status,405);
  assert.equal((await worker.fetch(request("OPTIONS",null),env)).status,204);
  assert.equal((await worker.fetch(request("GET","test-token",url+"-other"),env)).status,404);
  const before=await kv.get("p:test-child:study");
  const status=await worker.fetch(request("GET","test-token","https://sync.test/v1/status"),env);
  assert.deepEqual(await status.json(),{keys:[]});
  assert.equal(await kv.get(contentKey),raw()); assert.equal(await kv.get("p:test-child:study"),before);
});
test("Worker missing / corrupt / oversized / bad schema / KV exception never return content", async () => {
  for(const [value,status] of [[null,404],["{private broken",500],["x".repeat(131073),500],[raw({...syntheticPack(),schemaVersion:9}),500]]) {
    const KV=kvStub(value===null?{}:{[contentKey]:{value}});
    const res=await worker.fetch(request(),{TOKEN:"test-token",KV});
    assert.equal(res.status,status); assert.ok(!(await res.text()).includes("private broken"));
  }
  const res=await worker.fetch(request(),{TOKEN:"test-token",KV:{get(){throw Error("sensitive upstream");}}});
  assert.equal(res.status,500); assert.deepEqual(await res.json(),{error:"internal"});
});
test("real boot auto-download → two correct one wrong → reload/resume; shared content and isolated progress", async () => {
  const net=network(); let e=await boot(seeded(),"test-child",net); await flush();
  assert.equal(e.app.activePack.questions.length,6);
  assert.equal(e.app.state.studyTerm,"g3-s2");
  const packReq=net.requests.find(r=>r.url.includes("/packs/"));
  assert.equal(packReq.init.headers.Authorization,"Bearer test-token"); assert.equal(packReq.init.cache,"no-store"); assert.ok(!packReq.url.includes("test-token"));
  e.app.State.setStudyTerm("g4-s1"); e.app.State.saveBatch("15",ids); e.app.startQuiz("full",15);
  for(let i=0;i<2;i++){e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0])));e.app.advance();}
  e.app.submitAnswer(["999"]); const queue=plain(e.app.quiz.queue);
  e=await boot(e.st,"test-child",net); await flush();
  assert.equal(e.app.State.doneCount(15),2); e.app.startQuiz("full",15); assert.deepEqual(plain(e.app.quiz.queue),queue);
  const progress=e.st.getItem(progressKey);
  const sibling=await boot(e.st,"test-other",net); await flush();
  assert.equal(sibling.app.State.doneCount(15),0); assert.equal(e.st.getItem(progressKey),progress);
  assert.ok(!progress.includes("合成"));
  e.window._exportProgress(); assert.ok(!e.node("backup-text").value.includes("合成"));
  for(const r of net.requests.filter(r=>r.url.includes("/progress/"))) assert.ok(!String(r.init?.body).includes("合成"));
});
test("no token is nonblocking; existing settings callback and select-term retry take effect", async () => {
  let status=404; const net=network(()=>new Response(status===200?raw():"",{status}));
  const e=await boot(storage(),"test-child",net); assert.equal(net.requests.length,0);
  assert.match(e.node("pack-status").textContent,/尚未設定家庭金鑰/);
  e.node("sync-token-input").value="test-token"; e.window._saveSyncToken(); await flush();
  assert.match(e.node("pack-status").textContent,/尚未發布/);
  status=200; e.window._setStudyTerm("g4-s1"); await flush();
  assert.equal(e.app.activePack.questions.length,6);
});
test("background wait cannot block local boot or change live quiz; apply at home then persist revision", async () => {
  let resolve; const waiting=new Promise(r=>resolve=r); const net=network(()=>waiting);
  const e=await boot(seeded(syntheticPack()),"test-child",net);
  e.app.State.setStudyTerm("g4-s1"); e.app.State.saveBatch("15",ids); e.app.startQuiz("full",15);
  const map=e.app.map, queue=plain(e.app.quiz.queue), progress=e.st.getItem(progressKey);
  const p=syntheticPack();p.revision=2;p.explanations[ids[0]]="新的合成解說";
  resolve(new Response(raw(p))); await flush();
  assert.equal(e.app.map,map); assert.deepEqual(plain(e.app.quiz.queue),queue); assert.equal(e.st.getItem(progressKey),progress);
  assert.equal(JSON.parse(e.st.getItem(cacheKey)).revision,1);
  e.window._goHome(); assert.equal(e.app.activePack.revision,2); assert.equal(e.st.getItem(progressKey),progress);
});
test("network/HTTP/invalid/size/revision/semantic/storage failures keep active cache and every progress field", async () => {
  let reply=()=>new Response(raw()); const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",net); await flush();
  e.app.State.setStudyTerm("g4-s1");e.app.State.addMastered(15,ids[0]);
  const p=syntheticPack();p.revision=2;e.app.importPrivatePack(raw(p));
  const original=e.app.activePack, cache=e.st.getItem(cacheKey), progress=e.st.getItem(progressKey);
  const invalid=[];
  for(const [status,hint] of [[401,/金鑰不正確/],[404,/尚未發布/],[500,/服務異常/]]) invalid.push([()=>new Response("",{status}),hint]);
  invalid.push([()=>{throw Error("do not expose upstream token");},/無法連線/]);
  invalid.push([()=>new Response("{"),/JSON/],[()=>new Response("x".repeat(131073)),/128 KiB/]);
  invalid.push([()=>new Response(raw(),{headers:{"Content-Length":"131073"}}),/128 KiB/]);
  for(const [change,hint] of [[p=>p.schemaVersion=9,/版本/],[p=>p.packId="other",/版本/],[p=>p.questions[0].answer="3",/相同 ID/],[p=>p.explanations[ids[0]]+="different",/revision/],[p=>p.revision=1,/較舊/]]) {
    const bad=structuredClone(p);change(bad);invalid.push([()=>new Response(raw(bad)),hint]);
  }
  for(const [fn,hint] of invalid){reply=fn;await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,hint);assert.equal(e.app.activePack,original);assert.equal(e.st.getItem(cacheKey),cache);assert.equal(e.st.getItem(progressKey),progress);}
  reply=()=>new Response(raw(p));e.st.fail=k=>k===cacheKey;await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/未保存/);assert.equal(e.app.activePack,original);
});
test("timeout includes stalled body; retry can supersede an old response without overwriting new cache", async () => {
  const timers=[]; let resolve;
  let reply=()=>new Response(new ReadableStream({start(){}}));
  const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",{...net,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;}});
  await flush(); timers.findLast(t=>t.ms===8000).fn();await flush();
  assert.match(e.node("pack-status").textContent,/逾時/);assert.equal(e.app.activePack.revision,1);
  reply=()=>new Promise(r=>resolve=r);const old=e.app.loadPrivatePack();
  const p=syntheticPack();p.revision=2;reply=()=>new Response(raw(p));await e.app.loadPrivatePack();
  resolve(new Response(raw()));await old;
  assert.equal(e.app.activePack.revision,2);
});

test("production Worker.fetch behind real client: cached reload failure and public progress remain unchanged", async () => {
  const KV=kvStub({[contentKey]:{value:raw()}});
  let failed=false;
  const ports={fetch:(url,init)=>{
    if(failed && url.includes("/packs/")) return Promise.resolve(new Response("",{status:503}));
    return worker.fetch(new Request(url,init),{TOKEN:"test-token",KV});
  }};
  let e=await boot(seeded(),"test-child",ports);await flush();
  const q=e.app.map.values().next().value;
  e.app.State.addMastered(q.unit,q.id);
  e.app.State.setStudyTerm("g4-s1");e.app.State.addMastered(15,ids[0]);
  const previous=plain(e.app.state),cache=e.st.getItem(cacheKey);
  failed=true;e=await boot(e.st,"test-child",ports);await flush();
  assert.equal(e.st.getItem(cacheKey),cache);assert.equal(e.app.activePack.questions.length,6);
  assert.deepEqual(plain(e.app.state),previous);assert.match(e.node("pack-status").textContent,/服務異常/);
  const status=await worker.fetch(request("GET","test-token","https://sync.test/v1/status"),{TOKEN:"test-token",KV});
  assert.deepEqual(await status.json(),{keys:[]});assert.equal(await KV.get(contentKey),raw());
});

test("deferred response is rechecked against latest persisted revision; corrupt cache and interrupted UTF-8 are retained", async () => {
  let reply=()=>new Response(raw());const net=network(()=>reply());
  const e=await boot(seeded(syntheticPack()),"test-child",net);await flush();
  e.app.State.setStudyTerm("g4-s1");e.app.startQuiz("full",15);
  const p=syntheticPack();p.revision=2;reply=()=>new Response(raw(p));await e.app.loadPrivatePack();
  const newer=syntheticPack();newer.revision=3;e.st.map.set(cacheKey,raw(newer));
  e.window._goHome();assert.equal(e.app.activePack.revision,1);assert.equal(JSON.parse(e.st.getItem(cacheKey)).revision,3);
  assert.match(e.node("page-home").innerHTML,/較舊/);
  e.st.map.set(cacheKey,"broken");await e.app.loadPrivatePack();assert.equal(e.st.getItem(cacheKey),"broken");assert.equal(e.app.activePack.revision,1);
  assert.match(e.node("pack-status").textContent,/本機題包已損毀/);
  reply=()=>new Response(new Uint8Array([0xff]));await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/UTF-8/);
  reply=()=>new Response(new ReadableStream({start(c){c.error(Error("secret upstream detail"));}}));
  await e.app.loadPrivatePack();assert.match(e.node("pack-status").textContent,/讀取題包中斷/);assert.ok(!e.node("pack-status").textContent.includes("secret upstream"));
});

test("background completion updates practice area without replacing parent forms or restore confirmation", async () => {
  let resolve;const waiting=new Promise(r=>resolve=r);
  const e=await boot(seeded(),"test-child",network(()=>waiting));
  e.node("page-home").innerHTML="parent-form-and-restore-confirmation";
  e.node("sync-token-input").value="unfinished-edit";
  e.node("backup-io").innerHTML="restore-confirmation";
  resolve(new Response(raw()));await flush();
  assert.equal(e.node("page-home").innerHTML,"parent-form-and-restore-confirmation");
  assert.equal(e.node("sync-token-input").value,"unfinished-edit");
  assert.equal(e.node("backup-io").innerHTML,"restore-confirmation");
  assert.equal(e.app.activePack.questions.length,6);
  assert.match(e.node("pack-status").textContent,/題包已保存/);
});
