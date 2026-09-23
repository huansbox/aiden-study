import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { collectionRuntime } from "./helpers/collection-runtime.mjs";
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
    assert.equal(reopened.collection.snapshot().grants.length,2);
    assert.equal(reopened.collection.snapshot().sync.pending,0);
    reopened.setLoseResponse(true);
    await assert.rejects(reopened.collection.selectModel("car"));
    assert.equal(reopened.collection.snapshot().sync.pending,1);
    await reopened.collection.flush();
    assert.equal(reopened.collection.snapshot().activeBuild.modelId,"car");
    assert.equal(reopened.collection.snapshot().grants.length,2);
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
    assert.equal(h.collection.snapshot().grants.length,2);
    assert.equal(h.requests.at(-1).body.generation,1);
  }finally{await runtime.dispose();}
});
test("已分包零件離線持久化並與另一裝置合併；暫時storage失敗保留outbox",async()=>{
  const runtime=await collectionRuntime();
  try{
    const h=client(runtime);await h.collection.ready;
    await h.collection.saveGoals([{entryId:"math",metric:"answered",quantity:1}]);
    h.collection.record({entryId:"math",answered:true});await h.collection.flush();
    await h.collection.selectModel("car");
    const grant=h.collection.snapshot().grants[0],part={grantId:grant.id,buildId:"car",packIndex:0,partId:"p1-1"};
    const other=client(runtime);await other.collection.ready;
    h.setOffline(true);await h.collection.placePart(part);await h.collection.flush();
    assert.deepEqual([...h.collection.snapshot().activeBuild.placed],["p1-1"]);
    await other.collection.placePart({...part,partId:"p1-2"});await other.collection.flush();
    h.setOffline(false);h.setStatus(503);await h.collection.flush();
    assert.equal(h.collection.snapshot().sync.pending,1);
    h.setStatus(0);await h.collection.flush();
    assert.deepEqual([...h.collection.snapshot().activeBuild.placed].sort(),["p1-1","p1-2"]);
    h.setFailWrites(true);
    await assert.rejects(h.collection.placePart({...part,partId:"p1-3"}),/無法保存/);
    assert.equal(h.collection.snapshot().activeBuild.placed.includes("p1-3"),false);
  }finally{await runtime.dispose();}
});
test("EMU3000 第 12 包可離線保存並重開同步，第 13、14 包不進 outbox",async()=>{
  const runtime=await collectionRuntime();
  try{
    await runtime.seedFixtures({days:12});
    const h=client(runtime);await h.collection.ready;
    await h.collection.selectModel("emu3000");
    const grants=h.collection.snapshot().grants.filter(g=>g.buildId==="emu3000");
    assert.equal(grants.length,12);
    const last=grants.find(g=>g.packIndex===11);
    h.setOffline(true);
    await h.collection.placePart({grantId:last.id,buildId:"emu3000",packIndex:11,partId:"p12-3"});
    for(const index of [12,13])await assert.rejects(h.collection.placePart({grantId:last.id,buildId:"emu3000",packIndex:index,partId:`p${index+1}-1`}),/請先連線取得/);
    assert.equal(h.collection.snapshot().sync.pending,1);
    const reopened=client(runtime,{storage:h.storage});await reopened.collection.ready;
    assert.equal(reopened.collection.snapshot().sync.pending,0);
    assert.deepEqual([...reopened.collection.snapshot().activeBuild.placed],["p12-3"]);
    assert.equal(reopened.collection.snapshot().activeBuild.completedAt,null);
  }finally{await runtime.dispose();}
});
