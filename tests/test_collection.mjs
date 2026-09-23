import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../docs/shared/collection-core.js";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
const C = globalThis.KidsCollectionCore;
test("E500 can begin with a pack while an existing train build keeps its original identity and placed part", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const event = { entryId: "spelling", roundId: "first", occurredAt: now.toISOString() };
  let fresh = C.apply(C.empty(), { type: "round", hasPractice: true, event }, now);
  fresh = C.apply(fresh, { type: "select-model", modelId: "e500" }, now);
  assert.equal(fresh.activeBuildId, "e500");
  assert.equal(fresh.grants[0].buildId, "e500");

  let legacy = C.apply(C.apply(C.empty(), { type: "round", hasPractice: true, event }, now), { type: "select-model", modelId: "train" }, now);
  const grant = legacy.grants[0];
  legacy = C.apply(legacy, { type: "place", grantId: grant.id, buildId: "train", packIndex: 0, partId: "p1-1" }, now);
  const restored = C.snapshot(C.apply(legacy, { type: "allocate" }, now), "2026-09-22");
  assert.equal(restored.activeBuild.modelId, "train");
  assert.deepEqual(restored.activeBuild.placed, ["p1-1"]);
  assert.equal(restored.grants[0].buildId, "train");
});
test("每日份量、單項兩包、空目標只有完整回合一包", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  let state = C.apply(C.empty(), { type: "goals", expectedGoalRevision: 0, targets: [{ entryId: "study:math", metric: "answered", quantity: 2 }] }, now);
  for (let i=0;i<2;i++) state=C.apply(state,{type:"record",event:{entryId:"study:math",answered:true,occurredAt:now.toISOString()}},now);
  assert.equal(state.grants.length,2);
  state=C.apply(state,{type:"record",event:{entryId:"study:math",answered:true,occurredAt:now.toISOString()}},now);
  assert.equal(state.grants.length,2);
  let empty=C.apply(C.empty(),{type:"record",event:{entryId:"spelling",answered:true,occurredAt:now.toISOString()}},now);
  assert.equal(empty.grants.length,0);
  assert.throws(()=>C.apply(empty,{type:"round",event:{entryId:"spelling",roundId:"r",occurredAt:now.toISOString()}},now));
  empty=C.apply(empty,{type:"round",hasPractice:true,event:{entryId:"spelling",roundId:"r",occurredAt:now.toISOString()}},now);
  assert.deepEqual(empty.grants.map(g=>g.kind),["first"]);
});
test("設定修改即時生效，跨日保留已發包且清空不補全完成獎",()=>{
  const now=new Date("2026-09-22T12:00:00Z");
  let s=C.apply(C.empty(),{type:"goals",expectedGoalRevision:0,targets:[{entryId:"math",metric:"answered",quantity:1}]},now);
  s=C.apply(s,{type:"record",event:{entryId:"math",answered:true,occurredAt:now.toISOString()}},now);
  s=C.apply(s,{type:"goals",expectedGoalRevision:1,targets:[]},now);
  assert.equal(C.snapshot(s,"2026-09-22").daily.targets.length,0);
  assert.equal(C.snapshot(s,"2026-09-23").daily.targets.length,0);
  assert.equal(s.grants.length,2);
});
test("真 SQLite DO：重送、跨裝置分包衝突、round去重、世代與孩子隔離",async()=>{
  const runtime=await collectionRuntime();
  let seq=0;
  const call=async(child,type,data={})=>{
    const response=await runtime.fetch(new Request(`http://local/v1/collection/${child}${type?"/"+type:""}`,{method:type?"POST":"GET",headers:{Authorization:"Bearer test-token","Content-Type":"application/json"},...(type?{body:JSON.stringify({commandId:"cmd"+(++seq),...data})}:{})}));
    return {status:response.status,body:await response.json()};
  };
  try {
    const event={entryId:"spelling",roundId:"r1",answered:true,occurredAt:new Date().toISOString()};
    assert.equal((await call("aiden","round",{generation:0,event})).status,400);
    const first={commandId:"record-1",generation:0,event};
    assert.equal((await call("aiden","record",first)).status,200);
    assert.equal((await call("aiden","record",first)).status,200);
    await call("aiden","round",{generation:0,event});
    await call("aiden","round",{generation:0,event});
    const view=(await call("aiden")).body;
    assert.equal(view.grants.length,1);
    const selected=await Promise.all([call("aiden","select-model",{modelId:"car"}),call("aiden","select-model",{modelId:"train"})]);
    assert.equal(selected.filter(r=>r.status===200).length,1);
    const current=(await call("aiden")).body,grant=current.grants[0];
    assert.ok(grant.buildId);
    const part={grantId:grant.id,buildId:grant.buildId,packIndex:0,partId:"p1-1"};
    await Promise.all([call("aiden","place",part),call("aiden","place",part)]);
    assert.equal((await call("aiden")).body.activeBuild.placed.length,1);
    assert.equal((await call("bingpu")).body.grants.length,0);
    await runtime.KV.put("c:activity-generation:aiden","1");
    assert.equal((await call("aiden","record",{generation:0,event:{...event,roundId:"r2"}})).status,409);
    assert.equal((await call("aiden")).body.grants.length,1);
    assert.equal((await call("aiden","place",part)).status,200);
  } finally { await runtime.dispose(); }
});
test("14包42零件完成永久收藏；後續重送不回退，可以選下一件",()=>{
  let s=C.empty();
  for(let day=1;day<=7;day++) {
    const now=new Date(`2026-09-${String(day).padStart(2,"0")}T12:00:00Z`);
    if(day===1)s=C.apply(s,{type:"goals",expectedGoalRevision:0,targets:[{entryId:"math",metric:"answered",quantity:1}]},now);
    s=C.apply(s,{type:"record",event:{entryId:"math",answered:true,occurredAt:now.toISOString()}},now);
  }
  s=C.apply(s,{type:"select-model",modelId:"car"});
  assert.equal(s.grants.filter(g=>g.buildId==="car").length,14);
  for(const g of s.grants)for(let n=1;n<=3;n++)s=C.apply(s,{type:"place",grantId:g.id,buildId:"car",packIndex:g.packIndex,partId:`p${g.packIndex+1}-${n}`});
  assert.equal(s.builds[0].placed.length,42);assert.ok(s.builds[0].completedAt);
  const completedAt=s.builds[0].completedAt;
  s=C.apply(s,{type:"display",buildId:"car",displayed:true});
  s=C.apply(s,{type:"select-model",modelId:"train"});
  s=C.apply(s,{type:"place",grantId:s.grants[0].id,buildId:"car",packIndex:0,partId:"p1-1"});
  assert.equal(s.builds[0].completedAt,completedAt);
  assert.deepEqual(s.displayedBuildIds,["car"]);assert.equal(s.activeBuildId,"train");
});
test("EMU3000 與 R200 各在 12 包、36 組完成，剩餘包留給下一件；舊車仍需 14 包",()=>{
  let state=C.empty();
  state.grants=Array.from({length:26},(_,i)=>({id:`grant-${i}`,date:"2026-09-01",kind:"first",buildId:null,packIndex:null}));
  state=C.apply(state,{type:"select-model",modelId:"emu3000"});
  assert.equal(state.grants.filter(g=>g.buildId==="emu3000").length,12);
  assert.equal(state.grants.filter(g=>!g.buildId).length,14);
  assert.deepEqual(state.grants.filter(g=>g.buildId==="emu3000").map(g=>g.packIndex),Array.from({length:12},(_,i)=>i));
  const emuGrants=state.grants.filter(g=>g.buildId==="emu3000");
  for(const grant of emuGrants)for(let n=1;n<=3;n++){
    state=C.apply(state,{type:"place",grantId:grant.id,buildId:"emu3000",packIndex:grant.packIndex,partId:`p${grant.packIndex+1}-${n}`});
    if(grant.packIndex<11||n<3)assert.equal(state.builds[0].completedAt,null);
  }
  assert.equal(state.builds[0].placed.length,36);
  assert.ok(state.builds[0].completedAt);
  state=C.apply(state,{type:"select-model",modelId:"r200"});
  assert.equal(state.grants.filter(g=>g.buildId==="r200").length,12);
  assert.equal(state.grants.filter(g=>!g.buildId).length,2);
  for(const grant of state.grants.filter(g=>g.buildId==="r200"))for(let n=1;n<=3;n++)
    state=C.apply(state,{type:"place",grantId:grant.id,buildId:"r200",packIndex:grant.packIndex,partId:`p${grant.packIndex+1}-${n}`});
  assert.equal(state.builds[1].placed.length,36);
  assert.ok(state.builds[1].completedAt);
  state=C.apply(state,{type:"select-model",modelId:"e500"});
  assert.equal(state.grants.filter(g=>g.buildId==="e500").length,2);
  assert.equal(state.builds[2].completedAt,null);
  assert.equal(C.PACK_COUNTS.car,14);
  assert.equal(C.PACK_COUNTS.train,14);
  assert.equal(C.PACK_COUNTS.plane,14);
});
test("12 包車型拒絕第 13、14 包，即使持久資料意外含有該包授權",()=>{
  for(const modelId of ["emu3000","r200"]){
    let state=C.apply(C.empty(),{type:"select-model",modelId});
    for(const index of [12,13]){
      const grant={id:`invalid-${index}`,buildId:modelId,packIndex:index,date:"2026-09-01",kind:"first"};
      state.grants.push(grant);
      assert.throws(()=>C.apply(state,{type:"place",grantId:grant.id,buildId:modelId,packIndex:index,partId:`p${index+1}-1`}),/零件位置不正確/);
    }
    assert.deepEqual(state.builds[0].placed,[]);
    assert.equal(state.builds[0].completedAt,null);
  }
});
test("SQLite持久化重啟後保留命令去重及已配包半成品",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"aiden-collection-"));
  let runtime=await collectionRuntime({persist:dir});
  const send=async(type,data)=>{
    const response=await runtime.fetch(new Request("http://local/v1/collection/aiden/"+type,{method:"POST",headers:{Authorization:"Bearer test-token"},body:JSON.stringify(data)}));
    assert.equal(response.status,200);return (await response.json()).snapshot;
  };
  const record={commandId:"persist-record",generation:0,event:{entryId:"math",answered:true,occurredAt:new Date().toISOString()}};
  try{
    await send("goals",{commandId:"persist-goals",expectedGoalRevision:0,targets:[{entryId:"math",metric:"answered",quantity:1}]});
    await send("record",record);
    const selected=await send("select-model",{commandId:"persist-model",modelId:"car"});
    await send("place",{commandId:"persist-place",grantId:selected.grants[0].id,buildId:"car",packIndex:0,partId:"p1-1"});
    await runtime.dispose();runtime=await collectionRuntime({persist:dir});
    const state=await send("record",record);
    assert.equal(state.grants.length,2);assert.equal(state.daily.targets[0].progress,1);
    assert.deepEqual(state.activeBuild.placed,["p1-1"]);
  }finally{await runtime.dispose();await rm(dir,{recursive:true,force:true});}
});
test("SQLite 重啟保留 EMU3000 的 12 包分配，餘下包可給下一車型",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"aiden-collection-model-"));
  let runtime=await collectionRuntime({persist:dir});
  let seq=0;
  const call=async(type,data={})=>{
    const response=await runtime.fetch(new Request(`http://local/v1/collection/aiden${type?"/"+type:""}`,{
      method:type?"POST":"GET",headers:{Authorization:"Bearer test-token"},
      ...(type?{body:JSON.stringify({commandId:`model-persist-${++seq}`,...data})}:{})
    }));
    return {status:response.status,body:await response.json()};
  };
  try{
    await runtime.seedFixtures({days:14});
    const selected=await call("select-model",{modelId:"emu3000"});
    assert.equal(selected.status,200);
    assert.equal(selected.body.snapshot.grants.filter(g=>g.buildId==="emu3000").length,12);
    assert.equal(selected.body.snapshot.grants.filter(g=>!g.buildId).length,2);
    await runtime.dispose();runtime=await collectionRuntime({persist:dir});
    const restored=(await call()).body;
    assert.equal(restored.activeBuild.modelId,"emu3000");
    assert.deepEqual(restored.grants.filter(g=>g.buildId==="emu3000").map(g=>g.packIndex),Array.from({length:12},(_,i)=>i));
    const last=restored.grants.find(g=>g.packIndex===11);
    assert.equal((await call("place",{grantId:last.id,buildId:"emu3000",packIndex:11,partId:"p12-1"})).status,200);
    for(const index of [12,13])assert.equal((await call("place",{grantId:last.id,buildId:"emu3000",packIndex:index,partId:`p${index+1}-1`})).status,400);
    const after=(await call()).body;
    assert.deepEqual(after.activeBuild.placed,["p12-1"]);
    assert.equal(after.grants.filter(g=>!g.buildId).length,2);
  }finally{await runtime.dispose();await rm(dir,{recursive:true,force:true});}
});
test("既有activity大數字不反推包；test-only fixture重播不重複發包",async()=>{
  const runtime=await collectionRuntime();
  try{
    await runtime.KV.put("m:aiden:study:legacy",JSON.stringify({version:1,days:{[C.dateKey()]:{completed:900,answered:900,correct:900,seconds:3600}},tasks:{},done:{}}));
    const response=await runtime.fetch(new Request("http://local/v1/collection/aiden",{headers:{Authorization:"Bearer test-token"}}));
    assert.equal((await response.json()).grants.length,0);
    assert.equal((await runtime.seedFixtures({child:"aiden",days:12})).grants.length,12);
    assert.equal((await runtime.seedFixtures({child:"aiden",days:12})).grants.length,12);
  }finally{await runtime.dispose();}
});
test("Worker遇外部storage/RPC失敗回503，validation錯誤才回400",async()=>{
  const env={TOKEN:"test-token",KV:kvStub(),COLLECTIONS:{getByName(){throw Error("storage temporarily unavailable");}}};
  const request=()=>new Request("http://local/v1/collection/aiden/record",{method:"POST",headers:{Authorization:"Bearer test-token"},body:JSON.stringify({commandId:"failure",generation:0,event:{entryId:"math",answered:true,occurredAt:new Date().toISOString()}})});
  assert.equal((await worker.fetch(request(),env)).status,503);
  const validEnv={...env,COLLECTIONS:{getByName(){return {};}}};
  const invalid=new Request("http://local/v1/collection/aiden/record",{method:"POST",headers:{Authorization:"Bearer test-token"},body:"null"});
  assert.equal((await worker.fetch(invalid,validEnv)).status,400);
});
test("DO只接受同世代回合作答證據，舊client不得以新世代完成舊回合",async()=>{
  const runtime=await collectionRuntime();let seq=0;
  const send=async(type,data)=>{
    const response=await runtime.fetch(new Request(`http://local/v1/collection/aiden/${type}`,{method:"POST",headers:{Authorization:"Bearer test-token"},body:JSON.stringify({commandId:`generation-${++seq}`,...data})}));
    return {status:response.status,body:await response.json()};
  };
  try{
    await send("goals",{expectedGoalRevision:0,targets:[{entryId:"spelling",metric:"rounds",quantity:1}]});
    const event={entryId:"spelling",roundId:"old-evidence",answered:true,occurredAt:new Date().toISOString()};
    assert.equal((await send("record",{generation:0,event})).status,200);
    await runtime.KV.put("c:activity-generation:aiden","1");
    assert.equal((await send("round",{generation:1,event})).status,400);
    const fresh={...event,roundId:"fresh-evidence"};
    await send("record",{generation:1,event:fresh});
    const completed=await send("round",{generation:1,event:fresh});
    assert.equal(completed.status,200);assert.equal(completed.body.snapshot.grants.length,2);
    assert.equal(completed.body.snapshot.daily.targets[0].progress,1);
  }finally{await runtime.dispose();}
});
