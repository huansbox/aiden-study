import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {uiHarness} from "./helpers/train-workshop-ui.mjs";
const context=vm.createContext({console,Set});context.window=context;
for(const file of ["brick-ct273.js","ct273-mechanism.js","train-workshop.js"]) vm.runInContext(readFileSync(new URL(`../docs/shared/${file}`,import.meta.url),"utf8"),context);
const model=context.KidsBrickCT273, first=count=>model.steps.flatMap(s=>s.parts).slice(0,count).map(p=>p.id);
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test("old CT273 saves keep exact identities and grants across wheel and rod boundaries",()=>{
  for(const count of [0,6,7,8,9,21,33,34,35,36,41]) {
    const state={activeBuild:{id:"old-ct273",modelId:"ct273",placed:first(count)},grants:Array.from({length:14},(_,packIndex)=>({id:`old-${packIndex}`,buildId:"old-ct273",packIndex}))};
    const old=JSON.stringify(state),view=context.KidsTrainWorkshop.describe(model,state);
    assert.equal(view.packIndex,Math.floor(count/3));
    assert.deepEqual(Array.from(view.remaining,p=>p.id),Array.from(first((Math.floor(count/3)+1)*3).slice(count)));
    assert.equal(JSON.stringify(state),old);
  }
});

test("all 14 CT273 packs save the original 42 IDs once in arbitrary within-pack order",async()=>{
  const h=uiHarness([],{modelId:"ct273"});await settle();
  try {
    for(let pack=0;pack<14;pack++) {
      for(const part of [3,1,2]){h.click("part",`p${pack+1}-${part}`);h.click("place");h.click("place");await settle();}
      assert.equal(h.calls.length,(pack+1)*3);
      assert.match(h.host.innerHTML,/看看本包開始前/);
      if(pack<13){h.click("next");await settle();}
    }
    assert.equal(new Set(h.state.activeBuild.placed).size,42);
    assert.equal(h.state.grants.length,14);
    for(const call of h.calls){assert.equal(call.buildId,"existing-ct273");assert.equal(call.grantId,`earned-${call.packIndex}`);}
    assert.equal(h.finalCandidate,true);
  } finally {h.mounted.destroy();}
});

test("turning and trial uncoupling never save; absent or failed rods cannot unlock linked play",async()=>{
  const h=uiHarness(first(33),{modelId:"ct273"});await settle();
  try {
    h.click("mechanism");h.click("ct-next");h.click("ct-detach");
    assert.equal(h.calls.length,0);
    assert.doesNotMatch(h.host.innerHTML,/data-ct-rod/);
    h.failSave();h.click("part","p12-1");h.click("place");await settle();
    assert.equal(h.state.activeBuild.placed.length,33);
    assert.doesNotMatch(h.host.innerHTML,/data-ct-rod/);
    h.allowSave();h.click("part","p12-1");h.click("place");await settle();
    assert.match(h.host.innerHTML,/data-ct-rod/);
    const calls=h.calls.length,save=JSON.stringify(h.state);
    h.click("ct-detach");h.click("ct-prev");h.click("ct-detach");h.click("ct-next");
    assert.equal(h.calls.length,calls);assert.equal(JSON.stringify(h.state),save);
  } finally {h.mounted.destroy();}
});

test("reopening an old partial rod pack keeps its placed rod and resumes only missing parts",async()=>{
  const saved=[...first(33),"p12-1","p12-3"],h=uiHarness(saved,{modelId:"ct273",packs:12});await settle();
  try {
    assert.match(h.host.innerHTML,/本包 2 \/ 3/);
    h.click("mechanism");assert.match(h.host.innerHTML,/data-ct-rod/);
    h.click("pause");h.click("resume");assert.match(h.host.innerHTML,/data-ct-rod/);
    h.click("part","p12-2");h.click("place");await settle();
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].partId,"p12-2");
    h.click("before");assert.doesNotMatch(h.host.innerHTML,/data-ct-rod/);
    assert.doesNotMatch(h.host.innerHTML,/data-e500-action="next"/);
    assert.equal(h.state.activeBuild.placed.length,36);
  } finally {h.mounted.destroy();}
});

test("saved linked pins maintain constant spacing through positive and negative turns; trials stay local",()=>{
  const m=context.KidsCT273Mechanism.create(),ids=new Set([...first(9),"p12-1"]),old=[...ids];m.sync(ids);
  for(const degrees of [90,90,720,-1080,179,-359,18.5]) {
    m.turn(2,degrees);const pins=m.pins();
    for(let i=1;i<3;i++) {assert.ok(Math.abs(pins[i].y-pins[0].y)<1e-8);assert.ok(Math.abs(pins[i].x-pins[0].x-i*165)<1e-8);}
  }
  m.trial();const second=m.pins()[1];m.turn(0,40);assert.deepEqual(m.pins()[1],second);
  m.endTrial();assert.ok(Math.abs(m.pins()[0].y-m.pins()[1].y)<1e-8);
  assert.doesNotMatch(m.controls(new Set(first(33)),{disabled:true}),/一起轉|三個大輪的角度/);
  assert.deepEqual([...ids],old);
  assert.equal(m.delta(179,-179),2);assert.equal(m.delta(-179,179),-2);
});

test("side view shows only the saved half of the frame",()=>{
  const m=context.KidsCT273Mechanism.create();
  for(const id of ["p4-1","p4-2"]) {
    const scene=m.scene(new Set([id]));
    assert.match(scene,new RegExp(`data-ct-frame="${id}"`));
    assert.doesNotMatch(scene,new RegExp(`data-ct-frame="${id==="p4-1"?"p4-2":"p4-1"}"`));
  }
  const both=m.scene(new Set(["p4-1","p4-2"]));
  assert.match(both,/data-ct-frame="p4-1"/);assert.match(both,/data-ct-frame="p4-2"/);
});

test("before comparison restores a previously saved rod after a temporary trial",async()=>{
  const h=uiHarness(first(36),{modelId:"ct273"});await settle();
  try {
    for(const part of [1,2,3]){h.click("part",`p13-${part}`);h.click("place");await settle();}
    h.click("mechanism");h.click("ct-detach");assert.doesNotMatch(h.host.innerHTML,/data-ct-rod/);
    h.click("before");assert.match(h.host.innerHTML,/data-ct-rod/);
    assert.equal(h.state.activeBuild.placed.length,39);
    assert.equal(h.calls.length,3);
  } finally {h.mounted.destroy();}
});

test("sync while dragging a CT273 part cancels stale placement without consuming it twice",async()=>{
  const h=uiHarness(first(6),{modelId:"ct273",motion:true});await settle();
  try {
    h.click("part","p3-1");h.click("place");
    h.state.activeBuild.placed.push("p3-1");h.mounted.update(h.state);
    h.animations[0].resolve();await settle();
    assert.equal(h.calls.length,0);assert.equal(h.ghosts[0].removed,true);
    assert.match(h.host.innerHTML,/本包 1 \/ 3/);
  }finally {h.mounted.destroy();}
});

test("background progress waits for wheel dragging to end, then updates the half-built frame",async()=>{
  const h=uiHarness(first(9),{modelId:"ct273",motion:true});await settle();
  try {
    h.click("mechanism");
    const wheel={dataset:{ctWheel:"0"}},target={closest:selector=>selector==="[data-ct-wheel]"?wheel:null};
    h.fire("pointerdown",{target,pointerId:1,button:0,clientX:285,clientY:176});
    h.state.activeBuild.placed.push("p4-1");h.mounted.update(h.state);
    assert.doesNotMatch(h.host.innerHTML,/data-ct-frame="p4-1"/);
    h.fire("pointerup",{target,pointerId:1});
    assert.match(h.host.innerHTML,/data-ct-frame="p4-1"/);
    assert.equal(h.calls.length,0);
  } finally {h.mounted.destroy();}
});


test("v2 CT273 starts at wheels, retains wheel and rod operation, and completes 39 body groups",async()=>{
  const h=uiHarness([],{modelId:"ct273",contentVersion:2,packs:13});await settle();
  try {
    assert.match(h.host.innerHTML,/data-placed="p1-1"/);
    for(let pack=2;pack<=14;pack++) {
      for(const part of [3,1,2]){h.click("part",`p${pack}-${part}`);h.click("place");await settle();}
      if(pack===3){assert.match(h.host.innerHTML,/data-ct-wheel=/);h.click("ct-next");assert.equal(h.calls.length,6);}
      if(pack===12){h.click("mechanism");assert.match(h.host.innerHTML,/data-ct-rod/);h.click("ct-next");assert.equal(h.calls.length,33);}
      if(pack<14){h.click("next");await settle();}
    }
    assert.equal(h.calls.length,39);assert.equal(h.finalCandidate,true);
    assert.match(h.host.innerHTML,/39<small> \/ 39/);
    assert.ok(h.calls.every(call=>call.packIndex>=1));
  } finally {h.mounted.destroy();}
});
