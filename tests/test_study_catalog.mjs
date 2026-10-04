import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { buildCatalog } from "../scripts/build_private_study_catalog.mjs";
import { expandedSyntheticPack, scienceSyntheticPack, ids } from "./helpers/synthetic-study-pack.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
const C=globalThis.StudyPackCatalog;
const wait=async()=>{for(let n=0;n<15;n++) await new Promise(r=>setImmediate(r));};
function fixture() {
  const pack=scienceSyntheticPack();
  for(let i=0;i<14;i++) {
    const q={...pack.questions[0],id:`math-g4s1-catalog-${i}-v1`,unit:16};
    pack.questions.push(q);pack.explanations[q.id]="合成解說";
  }
  return pack;
}
async function setup(pack=fixture()) {
  globalThis.indexedDB=new IDBFactory();
  const built=await buildCatalog(pack,pack,[],2200);
  const kv={"c:study:catalog:v2":{value:JSON.stringify(built.manifest)}};
  for(const [hash,raw] of built.shards) kv[`c:study:shard:${hash}`]={value:raw};
  const env={TOKEN:"test-token",KV:kvStub(kv)}, requests=[];
  const fetch=async(url,init)=>{requests.push(url);return worker.fetch(new Request(url,init),env);};
  const st=storage();st.map.set("kids_sync_token","test-token");
  const e=await boot(st,"test-child",{fetch,catalogCache:C.cache});await wait();
  e.app.State.setStudyTerm("g4-s1");e.app.State.setSubject("math");e.app.renderHome();
  return {e,env,requests,built,pack,fetch};
}
test("builder shards by unit, supports many shards and >256 KiB aggregate, preserves exact questions",async()=>{
  const p=fixture();for(const q of p.questions)p.explanations[q.id]+="說明".repeat(4000);
  const result=await buildCatalog(p,p,[],60000);
  assert.ok(Buffer.byteLength(JSON.stringify(p))>262144);
  assert.ok(result.manifest.shards.filter(s=>s.unit===16).length>1);
  const decoded=[...result.shards.values()].map(raw=>JSON.parse(raw));
  assert.deepEqual(new Map(decoded.flatMap(s=>s.questions).map(q=>[q.id,q])),new Map(p.questions.map(q=>[q.id,q])));
  assert.ok(decoded.some(s=>s.questions.every(q=>!ids.includes(q.id))));
  const changed=structuredClone(p);changed.revision++;changed.questions[0].answer="4";
  await assert.rejects(buildCatalog(changed,p),/相同題號/);
  const removed=structuredClone(p);removed.questions.pop();delete removed.explanations[p.questions.at(-1).id];removed.revision++;
  await assert.rejects(buildCatalog(removed,p),/相同題號/);
});
test("manifest rejects duplicate IDs, misplaced units, changes at same revision and removed IDs",async()=>{
  const p=fixture(),{manifest}=await buildCatalog(p,p,[],2200);
  for(const change of [m=>m.shards[0].ids.push(m.shards[0].ids[0]),m=>m.shards[0].unit=22,m=>m.shards[0].hash="a".repeat(64)]) {
    const m=structuredClone(manifest);change(m);assert.throws(()=>C.parseManifest(JSON.stringify(m),manifest));
  }
  const next=structuredClone(manifest);next.revision++;next.shards.pop();assert.throws(()=>C.parseManifest(JSON.stringify(next),manifest));
});
test("real app boot only downloads catalog; click loads selected unit shards and batch stays at ten",async()=>{
  const {e,requests,built}=await setup();
  assert.ok(requests.some(u=>u.endsWith("/catalog")));assert.equal(requests.filter(u=>u.includes("/shards/")).length,0);
  assert.equal(e.app.questionIdsFor(16).length,14);assert.equal(e.app.activePack,null);
  await e.window._startFull(16);
  const initialBatch=e.app.quiz.queue.length;assert.ok(initialBatch > 0 && initialBatch <= 10);
  assert.equal(requests.filter(u=>u.includes("/shards/")).length,built.manifest.shards.filter(s=>s.unit===16).length);
  assert.ok(e.app.activePack.questions.every(q=>q.unit===16));
  const question=e.app.map.get(e.app.quiz.queue[0]);e.app.submitAnswer(question.answer);
  assert.equal(e.app.State.doneCount(16),1);
  const before=e.st.getItem("study:progress:test-child");
  const again=await boot(e.st,"test-child",{fetch:async()=>{throw Error("offline");},catalogCache:C.cache});await wait();
  again.app.State.setStudyTerm("g4-s1");again.app.State.setSubject("math");await again.window._startFull(16);
  assert.equal(again.app.quiz.queue.length,initialBatch-1);assert.equal(again.app.State.doneCount(16),1);
  assert.equal(JSON.parse(before).mastered["16"].modes.choice.length,1);
});
test("all-error practice loads every requested unit; flagged metadata remains restorable before content",async()=>{
  const {e,pack}=await setup();
  const a=pack.questions.find(q=>q.unit===15),b=pack.questions.find(q=>q.unit===16);
  e.app.state.errorBank=[{questionId:a.id,unit:15},{questionId:b.id,unit:16}];
  e.app.state.flagged=[{questionId:pack.questions.find(q=>q.unit===20).id,unit:20}];
  e.app.State.setSubject("science");e.app.renderHome();assert.equal(e.app.State.getFlagged().length,1);
  e.app.State.unflagAll();assert.equal(e.app.state.flagged.length,0);
  e.app.State.setSubject("math");await e.window._startError("15,16");
  assert.deepEqual(new Set(e.app.quiz.queue),new Set([a.id,b.id]));
});
test("cached reload: equal background catalog keeps the first practice click; a real upgrade cancels stale preparation",async()=>{
  for(const upgrade of [false,true]) {
    const {e,env,pack}=await setup();
    await e.window._startFull(20);
    e.app.State.addMastered(15,ids[0]);
    const before=e.st.getItem("study:progress:test-child");
    const next=structuredClone(pack);
    if(upgrade) {
      next.revision++;
      const q={...next.questions.find(q=>q.unit===20),id:"science-g4s1-catalog-upgrade-extra-v1"};
      next.questions.push(q);next.explanations[q.id]="合成升版解說";
    }
    const built=await buildCatalog(next,pack,[],2200);
    for(const [hash,raw] of built.shards)await env.KV.put(`c:study:shard:${hash}`,raw);
    await env.KV.put("c:study:catalog:v2",JSON.stringify(built.manifest));
    let releaseCatalog,releaseUnit,startedUnit;
    const catalogGate=new Promise(resolve=>{releaseCatalog=resolve;});
    const unitGate=new Promise(resolve=>{releaseUnit=resolve;});
    const unitStarted=new Promise(resolve=>{startedUnit=resolve;});
    const fetch=async(url,init)=>{
      if(url.endsWith("/catalog"))await catalogGate;
      return worker.fetch(new Request(url,init),env);
    };
    const cache={...C.cache,unit:async unit=>{startedUnit();await unitGate;return C.cache.unit(unit);}};
    const reloaded=await boot(e.st,"test-child",{fetch,catalogCache:cache});
    reloaded.app.State.setStudyTerm("g4-s1");reloaded.app.State.setSubject("science");reloaded.app.renderHome();
    const starting=reloaded.window._startFull(20);
    await unitStarted;
    releaseCatalog();await wait(); // Background response finishes while the user's first click is preparing.
    releaseUnit();await starting;
    assert.equal(!reloaded.node("page-quiz").classList.contains("hidden"),!upgrade);
    if(upgrade) {
      assert.equal(reloaded.app.activePack,null,"old preparation must not activate after a newer catalog");
      await reloaded.window._startFull(20);
      assert.equal(reloaded.app.activePack.revision,next.revision);
      assert.ok(reloaded.app.activePack.questions.some(q=>q.id==="science-g4s1-catalog-upgrade-extra-v1"));
    } else {
      assert.equal(reloaded.app.activePack.revision,pack.revision);
      assert.ok(reloaded.app.quiz.queue.length>0,"the original click must start the cached practice");
    }
    assert.deepEqual(JSON.parse(reloaded.st.getItem("study:progress:test-child")).mastered[15],JSON.parse(before).mastered[15]);
  }
});
test("Worker requires family authorization, is read-only, hashes immutable shards and never writes progress",async()=>{
  const {env,built}=await setup();const base="https://test/v1/packs/g4-s1-math-u1";
  for(const path of ["/catalog",`/shards/${built.manifest.shards[0].hash}`]) {
    assert.equal((await worker.fetch(new Request(base+path),env)).status,401);
    assert.equal((await worker.fetch(new Request(base+path,{method:"PUT",headers:{Authorization:"Bearer test-token"}}),env)).status,405);
  }
  const hash=built.manifest.shards[0].hash;await env.KV.put(`c:study:shard:${hash}`,built.shards.get(hash)+" ");
  assert.equal((await worker.fetch(new Request(base+`/shards/${hash}`,{headers:{Authorization:"Bearer test-token"}}),env)).status,500);
  assert.equal(await env.KV.get("p:test-child:study"),null);
});
test("IndexedDB serializes stale writers and rejects downgrade while keeping unit cache",async()=>{
  const {built,pack}=await setup();const m=built.manifest;
  const raws=built.manifest.shards.filter(s=>s.unit===16).map(s=>built.shards.get(s.hash));
  const part={...C.combine(raws.map(JSON.parse),m.revision),shards:raws};
  await C.cache.saveUnit(m,part);
  const next=structuredClone(pack);next.revision++;
  const n=await buildCatalog(next,pack,[],2200);await C.cache.saveManifest(n.manifest);
  await assert.rejects(C.cache.saveUnit(m,part),/較舊/);
  assert.deepEqual((await C.cache.unit(16)).pack,part);
  assert.equal((await C.cache.manifest()).revision,next.revision);
});

test("natural-science-only release preserves math/social shard hashes and reuses cached unit without download",async()=>{
  const {e,built,pack,env,requests}=await setup();await e.window._startFull(16);e.window._goHome();
  const next=structuredClone(pack);next.revision++;
  const base=next.questions.find(q=>q.subject==="science"),q={...base,id:"science-g4s1-catalog-added-v1"};next.questions.push(q);next.explanations[q.id]="合成新增";
  const n=await buildCatalog(next,pack,[],2200);
  assert.deepEqual(n.manifest.shards.filter(s=>s.subject==="math"),built.manifest.shards.filter(s=>s.subject==="math"));
  for(const [hash,raw] of n.shards)await env.KV.put(`c:study:shard:${hash}`,raw);
  await env.KV.put("c:study:catalog:v2",JSON.stringify(n.manifest));await e.app.loadPrivatePack();
  const before=requests.filter(u=>u.includes("/shards/")).length;await e.window._startFull(16);
  assert.equal(requests.filter(u=>u.includes("/shards/")).length,before);
});
test("missing one shard cannot activate a partial unit or discard unknown saved batch IDs",async()=>{
  const {e,built,env}=await setup();
  const list=built.manifest.shards.filter(s=>s.unit===16);
  e.app.state.challenge[16]={batch:[list[0].ids[0],"math-g4s1-future-v1"]};
  const progress=JSON.stringify(e.app.state);await env.KV.delete(`c:study:shard:${list.at(-1).hash}`);
  await e.window._startFull(16);
  assert.equal(e.app.activePack,null);assert.equal(JSON.stringify(e.app.state),progress);
  assert.match(e.node("pack-status").textContent,/未載入/);
});
test("catalog received during a live round waits for home; existing questions and batch never change",async()=>{
  const {e,built,pack,env}=await setup();await e.window._startFull(16);
  const queue=[...e.app.quiz.queue],active=e.app.activePack;
  const next=structuredClone(pack);next.revision++;
  const n=await buildCatalog(next,pack,[],2200);await env.KV.put("c:study:catalog:v2",JSON.stringify(n.manifest));
  await e.app.loadPrivatePack();assert.equal(e.app.activePack,active);assert.deepEqual([...e.app.quiz.queue],queue);
  assert.equal(e.app.activePack.revision,built.manifest.revision);e.window._goHome();
  assert.match(e.node("page-home").innerHTML,new RegExp(`版本 ${next.revision}`));
});
test("old cached complete unit stays usable after an updated catalog points at temporarily missing shards",async()=>{
  const {e,pack,env}=await setup();await e.window._startFull(16);e.window._goHome();
  const next=structuredClone(pack);next.revision++;const q={...next.questions.find(q=>q.unit===16),id:"math-g4s1-future-local-v1"};next.questions.push(q);next.explanations[q.id]="新增";
  const n=await buildCatalog(next,pack,[],2200);await env.KV.put("c:study:catalog:v2",JSON.stringify(n.manifest));await e.app.loadPrivatePack();
  await e.window._startFull(16);assert.ok(e.app.quiz.queue.length>0);assert.equal(e.app.activePack.questions.some(q=>q.id==="math-g4s1-future-local-v1"),false);
  assert.equal(e.app.questionIdsFor(16).length,15);assert.equal(e.app.State.isCleared(16),false);
});

test("selection byte guards reject before fetch and accept exact boundaries",async()=>{
  const fake={shards:[{unit:15,bytes:C.MAX_UNIT_BYTES}]};assert.equal(C.checkBudget(fake,[15]),C.MAX_UNIT_BYTES);
  fake.shards[0].bytes++;assert.throws(()=>C.checkBudget(fake,[15]),/4 MiB/);
  fake.shards=[15,16,17,18].map(unit=>({unit,bytes:C.MAX_UNIT_BYTES}));assert.equal(C.checkBudget(fake,[15,16,17,18]),C.MAX_SELECTION_BYTES);
  fake.shards.push({unit:19,bytes:1});assert.throws(()=>C.checkBudget(fake,[15,16,17,18,19]),/16 MiB/);
  await assert.rejects(C.loadUnit({shards:[{unit:15,bytes:C.MAX_UNIT_BYTES+1}]},15,"unreachable",null),/4 MiB/);
});
test("unavailable IndexedDB still permits authenticated online practice without changing progress schema",async()=>{
  const p=fixture(),built=await buildCatalog(p,p,[],2200),requests=[];
  const cache={manifest:async()=>{throw Error("denied");},saveManifest:async()=>{throw Error("denied");},unit:async()=>{throw Error("denied");},saveUnit:async()=>{throw Error("denied");}};
  const st=storage();st.map.set("kids_sync_token","test-token");
  const e=await boot(st,"test-child",{catalogCache:cache,fetch:async url=>{requests.push(url);return url.endsWith("/catalog")?new Response(JSON.stringify(built.manifest)):url.includes("/shards/")?new Response(built.shards.get(url.split("/").at(-1))):new Response(JSON.stringify({rev:0,data:null}));}});
  await wait();e.app.State.setStudyTerm("g4-s1");e.app.State.setSubject("math");await e.window._startFull(16);
  assert.ok(e.app.quiz.queue.length>0);assert.equal(e.app.activePack.questions.length,14);
  assert.match(e.node("pack-status").textContent,/未能保存|無法保存|下次需要連線/);
});
test("corrupt cached answers are rejected by shard fingerprint and recover online",async()=>{
  const {e,fetch}=await setup();await e.window._startFull(16);e.window._goHome();
  const snapshot=await C.cache.unit(16);snapshot.pack.questions[0].answer="4";
  const db=await new Promise(resolve=>{const r=indexedDB.open("study-private-catalog",1);r.onsuccess=()=>resolve(r.result);});
  await new Promise(resolve=>{const tx=db.transaction("content","readwrite");tx.objectStore("content").put(snapshot,"unit:16");tx.oncomplete=resolve;});db.close();
  await assert.rejects(C.validateCached(snapshot,16),/指紋/);
  const again=await boot(e.st,"test-child",{fetch,catalogCache:C.cache});await wait();again.app.State.setStudyTerm("g4-s1");again.app.State.setSubject("math");await again.window._startFull(16);
  assert.equal(again.app.map.get(snapshot.pack.questions[0].id).answer,"2");
  await C.validateCached(await C.cache.unit(16),16);
});
test("fallback retries missing new shard on the next practice and eventually admits the new question",async()=>{
  const {e,pack,env,requests}=await setup();await e.window._startFull(16);e.window._goHome();
  const next=structuredClone(pack);next.revision++;const q={...next.questions.find(q=>q.unit===16),id:"math-g4s1-retry-v1"};next.questions.push(q);next.explanations[q.id]="新增";
  const n=await buildCatalog(next,pack,[],2200);await env.KV.put("c:study:catalog:v2",JSON.stringify(n.manifest));await e.app.loadPrivatePack();await e.window._startFull(16);e.window._goHome();
  const before=requests.length;for(const [hash,raw] of n.shards)await env.KV.put(`c:study:shard:${hash}`,raw);
  await e.window._startFull(16);assert.ok(requests.length>before);assert.ok(e.app.map.has(q.id));
});
test("legacy queue migration waits for unloaded private unit then preserves already completed IDs",async()=>{
  const {e,fetch,pack}=await setup();const selected=pack.questions.filter(q=>q.unit===16).map(q=>q.id);
  const st=storage();st.map.set("kids_sync_token","test-token");st.map.set("study:progress:test-child",JSON.stringify({schemaVersion:1,studyTerm:"g4-s1",semester:"final",subject:"math",challenge:{16:{queue:selected.slice(2)}},stats:{},errorBank:[],flagged:[]}));
  const again=await boot(st,"test-child",{fetch,catalogCache:C.cache});await wait();
  assert.ok(again.app.state._needMasteredBackfill);await again.window._startFull(16);
  assert.equal(again.app.State.doneCount(16),2);assert.ok(!again.app.quiz.queue.includes(selected[0]));assert.equal(again.app.state._needMasteredBackfill,undefined);
});

test("legacy subset cache cannot finish backfill before all manifest unit IDs are loaded",async()=>{
  const {fetch,pack}=await setup();
  const selected=pack.questions.filter(q=>q.unit===16).map(q=>q.id);
  const partial=structuredClone(pack);
  partial.questions=partial.questions.filter(q=>q.unit!==16 || selected.slice(0,2).includes(q.id));
  partial.explanations=Object.fromEntries(partial.questions.map(q=>[q.id,pack.explanations[q.id]]));
  const st=storage();st.map.set("kids_sync_token","test-token");
  st.map.set("study:private-pack:g4-s1-math-u1",JSON.stringify(partial));
  st.map.set("study:progress:test-child",JSON.stringify({schemaVersion:1,studyTerm:"g4-s1",semester:"final",subject:"math",challenge:{16:{queue:selected.slice(3)}},stats:{},errorBank:[],flagged:[]}));
  let online=false;
  const ports={catalogCache:C.cache,fetch:(...args)=>online ? fetch(...args) : Promise.reject(Error("offline"))};
  const e=await boot(st,"test-child",ports);await wait();
  assert.deepEqual([...e.app.state._needMasteredBackfill],["16"]);
  assert.equal(e.app.State.doneCount(16),0);
  assert.deepEqual([...e.app.state.challenge[16].queue],selected.slice(3));
  // Pending migration must also survive a reload that now has an empty mastered object.
  const reloaded=await boot(st,"test-child",ports);await wait();
  assert.deepEqual([...reloaded.app.state._needMasteredBackfill],["16"]);
  online=true;await reloaded.window._startFull(16);
  assert.equal(reloaded.app.State.doneCount(16),3);
  for(const id of selected.slice(0,3)) assert.ok(!reloaded.app.quiz.queue.includes(id));
  assert.equal(reloaded.app.state._needMasteredBackfill,undefined);
});
