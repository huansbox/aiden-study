import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
import { withExistingBuild } from "./helpers/existing-collection.mjs";
const code=(name)=>readFileSync(new URL("../docs/shared/"+name,import.meta.url),"utf8");
function client(runtime,{storage=new Map(),child="aiden"}={}) {
  let offline=false,failWrites=false,loseResponse=false,forcedStatus=0;
  const events=new Map();
  const requests=[];
  const localStorage={get length(){return storage.size;},key:i=>[...storage.keys()][i],getItem:k=>storage.get(k)??null,setItem(k,v){if(failWrites)throw Error("full");storage.set(k,String(v));},removeItem:k=>storage.delete(k)};
  const ctx=vm.createContext({Intl,Date,URL,JSON,Map,Set,Promise,crypto:globalThis.crypto,localStorage,CustomEvent:class{constructor(type){this.type=type;}},addEventListener:(k,f)=>events.set(k,f),dispatchEvent:()=>{}});
  ctx.window=ctx;
  ctx.KidsFamily={read(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}},async request(path,init={}){
    if(offline)throw Error("offline");
    if(forcedStatus){const e=Error("temporary storage failure");e.status=forcedStatus;throw e;}
    if(init.method)requests.push({path,body:JSON.parse(init.body)});
    const response=await runtime.fetch(new Request("http://local"+path,{...init,headers:{Authorization:"Bearer test-token","Content-Type":"application/json"}}));
    if(loseResponse&&init.method){loseResponse=false;throw Error("response lost");}
    const body=await response.json();
    if(!response.ok){const e=Error(body.error);e.status=response.status;e.generation=body.generation;throw e;}return body;
  }};
  vm.runInContext(code("collection-core.js"),ctx);vm.runInContext(code("collection-client.js"),ctx);
  return {collection:ctx.KidsCollection.create(child),storage,requests,setOffline:v=>offline=v,setFailWrites:v=>failWrites=v,setLoseResponse:v=>loseResponse=v,setStatus:v=>forcedStatus=v};
}

test("四種每日目標離線完成後重開補送，各一包且多裝置重讀不加發", async () => {
  const runtime = await collectionRuntime();
  try {
    const h = client(runtime); await h.collection.ready;
    const entries = ["study:math", "study:science", "study:social", "spelling"];
    await h.collection.saveGoals(entries.map((entryId) => ({ entryId, metric: entryId === "spelling" ? "rounds" : "answered", quantity: 1 })));
    h.setOffline(true);
    for (const entryId of entries) {
      const round = { entryId, roundId: entryId.replace(":", "-") };
      h.collection.beginRound(round); h.collection.record({ ...round, answered: true });
      await h.collection.finishRound(round); await h.collection.finishRound(round);
    }
    assert.equal(h.collection.snapshot().grants.length, 0, "雲端確認後才發包");
    const reopened = client(runtime, { storage: h.storage }); await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().daily.earned, 4);
    assert.equal(reopened.collection.snapshot().daily.limit, null);
    assert.equal(reopened.collection.snapshot().sync.pending, 0);
    const other = client(runtime); await other.collection.ready;
    other.collection.record({ entryId: "study:science", answered: true }); await other.collection.flush();
    await reopened.collection.refresh();
    assert.equal(reopened.collection.snapshot().grants.length, 5);
    const sibling = client(runtime, { child: "bingpu" }); await sibling.collection.ready;
    assert.equal(sibling.collection.snapshot().grants.length, 0);
  } finally { await runtime.dispose(); }
});
test("離線record/round重開補送、重複finish不加發、回應遺失重試保留同一包",async()=>{
  const runtime=await collectionRuntime();
  try{
    const h=client(runtime);await h.collection.ready;
    await h.collection.saveGoals([{entryId:"spelling",metric:"rounds",quantity:1}]);
    h.setOffline(true);
    h.collection.beginRound({roundId:"one",entryId:"spelling"});
    await h.collection.finishRound({roundId:"one",entryId:"spelling"});
    assert.equal(h.collection.snapshot().sync.pending,0);
    h.collection.record({roundId:"one",entryId:"spelling",answered:true});
    await h.collection.finishRound({roundId:"one",entryId:"spelling"});
    await h.collection.finishRound({roundId:"one",entryId:"spelling"});
    assert.equal(h.collection.snapshot().sync.pending,2);
    const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().grants.length,1);
    assert.equal(reopened.collection.snapshot().sync.pending,0);
    reopened.setLoseResponse(true);
    await assert.rejects(reopened.collection.selectModel("e500"),(error)=>error.code==="selection-pending" && error.pendingSelection.modelId==="e500");
    assert.equal(reopened.collection.snapshot().sync.pending,1);
    assert.equal(reopened.collection.snapshot().pendingSelection.modelId,"e500");
    assert.equal(reopened.collection.snapshot().pendingSelection.commandId,reopened.requests.at(-1).body.commandId);
    assert.equal(reopened.requests.at(-1).body.expectedSelectionGeneration,0);
    await reopened.collection.flush();
    assert.equal(reopened.collection.snapshot().activeBuild.modelId,"e500");
    assert.equal(reopened.collection.snapshot().selectionGeneration,1);
    assert.equal(reopened.collection.snapshot().pendingSelection,null);
    assert.equal(reopened.collection.snapshot().grants.length,1);
  }finally{await runtime.dispose();}
});
test("回合不能跨統計重置借用舊作答；重新開始的新世代回合才可發包",async()=>{
  const runtime=await collectionRuntime();
  try{
    const h=client(runtime);await h.collection.ready;
    await h.collection.saveGoals([{entryId:"spelling",metric:"rounds",quantity:1}]);
    const oldRound={roundId:"before-reset",entryId:"spelling"};
    h.collection.beginRound(oldRound);
    h.collection.record({...oldRound,answered:true,generation:0});await h.collection.flush();
    await runtime.KV.put("c:activity-generation:aiden","1");
    h.storage.set("family:generation:aiden","1");
    await h.collection.finishRound(oldRound);
    assert.equal(h.requests.filter(r=>r.path.endsWith("/round")).length,0,"不能把舊回合改標成新世代");
    assert.equal(h.collection.snapshot().grants.length,0);
    h.collection.record({...oldRound,answered:true,generation:1});await h.collection.flush();
    await h.collection.finishRound(oldRound);
    assert.equal(h.collection.snapshot().grants.length,0,"跨重置的回合已失效，新增作答不能復活它");
    assert.equal(h.requests.at(-1).body.event.roundId,undefined);
    const fresh={roundId:"after-reset",entryId:"spelling"};
    h.collection.beginRound(fresh);h.collection.record({...fresh,answered:true,generation:1});
    await h.collection.finishRound(fresh);
    assert.equal(h.collection.snapshot().grants.length,1);
    assert.equal(h.requests.at(-1).body.generation,1);
  }finally{await runtime.dispose();}
});
test("已分包零件離線持久化並與另一裝置合併；暫時storage失敗保留outbox",async()=>{
  const runtime=await collectionRuntime();
  try{
    const h=client(runtime);await h.collection.ready;
    await h.collection.saveGoals([{entryId:"math",metric:"answered",quantity:1}]);
    h.collection.record({entryId:"math",answered:true});await h.collection.flush();
    await h.collection.selectModel("e500");
    const grant=h.collection.snapshot().grants[0],part={grantId:grant.id,buildId:grant.buildId,packIndex:1,partId:"p2-1"};
    const other=client(runtime);await other.collection.ready;
    h.setOffline(true);await h.collection.placePart(part);await h.collection.flush();
    assert.deepEqual([...h.collection.snapshot().activeBuild.placed],["p2-1"]);
    await other.collection.placePart({...part,partId:"p2-2"});await other.collection.flush();
    h.setOffline(false);h.setStatus(503);await h.collection.flush();
    assert.equal(h.collection.snapshot().sync.pending,1);
    h.setStatus(0);await h.collection.flush();
    assert.deepEqual([...h.collection.snapshot().activeBuild.placed].sort(),["p2-1","p2-2"]);
    h.setFailWrites(true);
    await assert.rejects(h.collection.placePart({...part,partId:"p2-3"}),/無法保存/);
    assert.equal(h.collection.snapshot().activeBuild.placed.includes("p2-3"),false);
  }finally{await runtime.dispose();}
});
test("EMU3000 新版第 11 包可離線保存並重開同步，第 13、14 包不進 outbox",async()=>{
  const runtime=await collectionRuntime();
  try{
    const seeded=await runtime.seedFixtures({days:12});
    await runtime.restoreFixture(withExistingBuild({...globalThis.KidsCollectionCore.empty(),...seeded},"emu3000"));
    const h=client(runtime);await h.collection.ready;
    const buildId=h.collection.snapshot().activeBuild.id;
    const grants=h.collection.snapshot().grants.filter(g=>g.buildId===buildId);
    assert.equal(grants.length,11);
    const last=grants.find(g=>g.packIndex===11);
    h.setOffline(true);
    await h.collection.placePart({grantId:last.id,buildId,packIndex:11,partId:"p12-3"});
    for(const index of [12,13])await assert.rejects(h.collection.placePart({grantId:last.id,buildId,packIndex:index,partId:`p${index+1}-1`}),/請先連線取得/);
    assert.equal(h.collection.snapshot().sync.pending,1);
    const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().sync.pending,0);
    assert.deepEqual([...reopened.collection.snapshot().activeBuild.placed],["p12-3"]);
    assert.equal(reopened.collection.snapshot().activeBuild.completedAt,null);
  }finally{await runtime.dispose();}
});

test("加碼可離線連續完成三輪，重開補送領三包；回應遺失仍以原 commandId 去重",async()=>{
  const runtime=await collectionRuntime();
  try {
    const h=client(runtime);await h.collection.ready;
    await h.collection.saveGoals([{entryId:"spelling",metric:"rounds",quantity:1}]);
    h.setOffline(true);
    for(let n=1;n<=3;n++) {
      const round={roundId:`bonus-offline-${n}`,entryId:"spelling"};
      h.collection.beginRound(round);h.collection.record({...round,answered:true});
      await h.collection.finishRound(round);await h.collection.finishRound(round);
    }
    assert.equal(h.collection.snapshot().sync.pending,6);
    const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().grants.length,3);
    assert.equal(reopened.collection.snapshot().daily.targets[0].bonusCompleted,2);
    assert.equal(reopened.collection.snapshot().daily.targets[0].done,true);
    const round={roundId:"bonus-lost-response",entryId:"spelling"};
    reopened.collection.beginRound(round);reopened.collection.record({...round,answered:true});await reopened.collection.flush();
    reopened.setLoseResponse(true);await reopened.collection.finishRound(round);await reopened.collection.flush();
    assert.equal(reopened.collection.snapshot().grants.length,4);
    assert.equal(reopened.collection.snapshot().daily.targets[0].progress,4);
    assert.equal(reopened.collection.snapshot().sync.pending,0);
  } finally {await runtime.dispose();}
});

test("未送達選車可重開看見 pending，release 推進世代後拒絕舊選擇並讀回新世代，保留錯誤再重選",async()=>{
  const runtime=await collectionRuntime();
  try {
    const old=client(runtime);await old.collection.ready;old.setOffline(true);
    let pendingError;
    try{await old.collection.selectModel("e500");}catch(error){pendingError=error;}
    assert.equal(pendingError.code,"selection-pending");
    assert.equal(pendingError.pendingSelection.modelId,"e500");
    assert.equal(old.collection.snapshot().activeBuild,null);
    assert.equal(old.collection.snapshot().pendingSelection.commandId,pendingError.pendingSelection.commandId);
    const reopened=client(runtime,{storage:old.storage});reopened.setOffline(true);await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().pendingSelection.commandId,pendingError.pendingSelection.commandId);
    const other=client(runtime);await other.collection.ready;
    await other.collection.selectModel("ct273");
    const active=other.collection.snapshot();
    await other.collection.releaseBuild(active.activeBuild.id,active.revision);
    assert.equal(other.collection.snapshot().selectionGeneration,2);
    reopened.setOffline(false);await reopened.collection.flush();
    const rejected=reopened.collection.snapshot();
    assert.equal(rejected.pendingSelection,null);assert.equal(rejected.activeBuild,null);assert.equal(rejected.sync.pending,0);
    assert.equal(rejected.sync.status,"error");assert.match(rejected.sync.message,/選車狀態已更新/);
    assert.equal(rejected.selectionGeneration,2,"明確拒絕後同步最新世代");
    await reopened.collection.selectModel("breezy-blue");
    assert.equal(reopened.requests.at(-1).body.expectedSelectionGeneration,2);
    assert.equal(reopened.collection.snapshot().activeBuild.modelId,"breezy-blue");
  } finally {await runtime.dispose();}
});

test("等待選車期間新練習只改 revision、不改 selectionGeneration，原選擇仍可安全補送",async()=>{
  const runtime=await collectionRuntime();
  try {
    const selecting=client(runtime);await selecting.collection.ready;selecting.setOffline(true);
    await assert.rejects(selecting.collection.selectModel("ct273"),(error)=>error.code==="selection-pending");
    const learner=client(runtime);await learner.collection.ready;
    await learner.collection.saveGoals([{entryId:"math",metric:"answered",quantity:1}]);
    learner.collection.record({entryId:"math",answered:true});await learner.collection.flush();
    assert.ok(learner.collection.snapshot().revision>0);assert.equal(learner.collection.snapshot().selectionGeneration,0);
    selecting.setOffline(false);await selecting.collection.flush();
    assert.equal(selecting.collection.snapshot().pendingSelection,null);
    assert.equal(selecting.collection.snapshot().activeBuild.modelId,"ct273");
    assert.equal(selecting.collection.snapshot().selectionGeneration,1);
  } finally {await runtime.dispose();}
});

test("舊離線尚未送達的未開放選車被明確拒絕，清除 pending 後可新選開放車款",async()=>{
  const runtime=await collectionRuntime();
  try {
    const h=client(runtime);await h.collection.ready;h.setOffline(true);
    await assert.rejects(h.collection.selectModel("r200"),error=>error.code==="selection-pending");
    const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
    const rejected=reopened.collection.snapshot();
    assert.equal(rejected.pendingSelection,null);assert.equal(rejected.activeBuild,null);
    assert.equal(rejected.sync.pending,0);assert.equal(rejected.sync.status,"error");
    assert.match(rejected.sync.message,/尚未開放新選/);
    await reopened.collection.selectModel("e500");
    assert.equal(reopened.collection.snapshot().activeBuild.modelId,"e500");
  } finally {await runtime.dispose();}
});

test("四款新開放車的 client 選車可離線重開確認，僅建立同一作品並保留原配包",async()=>{
  const runtime=await collectionRuntime();
  try {
    for(const modelId of ["emu3000","emu900","700t","n700s"]) {
      const before=globalThis.KidsCollectionCore.empty();
      before.grants=[{id:`original-${modelId}`,date:"2026-10-18",kind:"first",buildId:null,packIndex:null}];
      await runtime.restoreFixture(before);
      const h=client(runtime);await h.collection.ready;h.setOffline(true);
      await assert.rejects(h.collection.selectModel(modelId),error=>error.code==="selection-pending");
      const pendingId=h.collection.snapshot().pendingSelection.commandId;
      const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
      const chosen=reopened.collection.snapshot();
      assert.equal(chosen.pendingSelection,null);
      assert.equal(chosen.activeBuild.modelId,modelId);
      assert.equal(chosen.activeBuild.contentVersion,2);
      assert.equal(chosen.builds.length,1);
      assert.equal(chosen.selectionGeneration,1);
      assert.equal(chosen.grants[0].id,`original-${modelId}`);
      assert.equal(chosen.grants[0].packIndex,1);
      assert.equal(reopened.requests.find(request=>request.path.endsWith("/select-model")).body.commandId,pendingId);
      await reopened.collection.flush();
      assert.equal(reopened.collection.snapshot().builds.length,1);
    }
  } finally {await runtime.dispose();}
});
