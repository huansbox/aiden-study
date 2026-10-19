import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import "../docs/shared/collection-core.js";
const C=globalThis.KidsCollectionCore;
const now=new Date("2026-10-19T12:00:00Z");
function fixture() {
  let state=C.apply(C.empty(),{type:"goals",expectedGoalRevision:0,targets:[{entryId:"math",metric:"answered",quantity:1}]},now);
  state.grants=[{id:"original-a",date:"2026-10-18",kind:"first",buildId:null,packIndex:null},{id:"original-b",date:"2026-10-17",kind:"first",buildId:null,packIndex:null}];
  return C.apply(state,{type:"select-model",modelId:"emu3000",commandId:"initial"},now);
}

test("維護共用核對允許新增包與原包已配新作，拒絕原包遺失、改日期及舊作品殘留",()=>{
  const original=fixture(), before=C.snapshot(original,"2026-10-19"), id=before.activeBuild.id;
  let state=C.apply(original,{type:"release-build",expectedActiveBuildId:id,expectedRevision:original.revision},now);
  state=C.apply(state,{type:"record",event:{entryId:"math",answered:true,occurredAt:now.toISOString()}},now);
  state=C.apply(state,{type:"select-model",modelId:"r200",commandId:"later-selection",expectedSelectionGeneration:state.selectionGeneration},now);
  const after=C.snapshot(state,"2026-10-19"), result=C.verifyRelease(before,after,id);
  assert.equal(result.originalTotal,2);assert.equal(result.total,3);assert.equal(result.added,1);assert.equal(result.released,2);
  assert.equal(result.unassigned,0,"原包合理配給新作也可核對成功");
  assert.throws(()=>C.verifyRelease(before,{...after,grants:after.grants.slice(1)},id),/ID、日期/);
  const changed=structuredClone(after);changed.grants[0].date="2026-10-19";
  assert.throws(()=>C.verifyRelease(before,changed,id),/ID、日期/);
  const stale=structuredClone(after);stale.grants[0].buildId=id;
  assert.throws(()=>C.verifyRelease(before,stale,id),/殘留/);
});

test("維護頁退包成功但回應遺失，期間新增一包及新選車，重試可清除 pending 且不動新作品",async()=>{
  let state=fixture(), loseResponse=true;
  const storage=new Map(), commands=new Map(), events=new Map();
  const elements=new Map(["maintenance-child","maintenance-summary","maintenance-read","maintenance-backup","maintenance-release","maintenance-status"].map(id=>[id,{value:id==="maintenance-child"?"aiden":"",textContent:"",disabled:false,append(){},replaceChildren(){},addEventListener(type,fn){events.set(`${id}:${type}`,fn);}}]));
  const context=vm.createContext({URL:class extends URL {static createObjectURL(){return "blob:synthetic";}static revokeObjectURL(){}},URLSearchParams,Blob,JSON,Map,Set,crypto:globalThis.crypto,setTimeout(){},location:{search:"?child=aiden"},localStorage:{removeItem(key){storage.delete(key);}},document:{getElementById(id){return elements.get(id);},createElement(){return {click(){},remove(){}};},body:{append(){}}},KidsCollectionCore:C});
  context.window=context;
  context.KidsFamily={read:(key)=>storage.get(key)||null,write:(key,value)=>{storage.set(key,structuredClone(value));return true;},async request(path,init={}){
    if(init.method){const command=JSON.parse(init.body);if(!commands.has(command.commandId)){state=C.apply(state,command,now);commands.set(command.commandId,true);}if(loseResponse){loseResponse=false;throw Error("response lost");}return {snapshot:C.snapshot(state,"2026-10-19"),duplicate:true};}
    return C.snapshot(state,"2026-10-19");
  }};
  vm.runInContext(readFileSync(new URL("../docs/parent/collection-maintenance.js",import.meta.url),"utf8"),context);
  await new Promise(resolve=>setImmediate(resolve));
  events.get("maintenance-backup:click")();
  await events.get("maintenance-release:click")();
  const pendingKey="collection:maintenance:release:aiden";
  assert.ok(storage.has(pendingKey));assert.equal(state.activeBuildId,null,"伺服器已成功退包");
  state=C.apply(state,{type:"record",event:{entryId:"math",answered:true,occurredAt:now.toISOString()}},now);
  state=C.apply(state,{type:"select-model",modelId:"r200",commandId:"child-chooses",expectedSelectionGeneration:state.selectionGeneration},now);
  const nextBuild=state.activeBuildId, beforeRetry=structuredClone(state);
  await events.get("maintenance-release:click")();
  assert.equal(storage.has(pendingKey),false,"新增包不會造成永久 pending");
  assert.equal(state.activeBuildId,nextBuild);assert.deepEqual(state,beforeRetry,"重試不碰新作品或新包");
  assert.match(elements.get("maintenance-status").textContent,/原有 2 包的 ID 與日期皆保留，目前共 3 包（另新增 1 包）/);
  assert.match(elements.get("maintenance-status").textContent,/未對新作品退包/);
});
