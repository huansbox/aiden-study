import {uiHarness} from "./helpers/train-workshop-ui.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const context = vm.createContext({ console, Set });
context.window = context;
for (const file of ["brick-e500.js", "train-workshop.js"]) {
  const path = new URL(`../docs/shared/${file}`, import.meta.url);
  vm.runInContext(readFileSync(path, "utf8"), context);
}
const model = context.KidsBrickE500;
const first = count => model.steps.flatMap(step => step.parts.map(part => part.id)).slice(0, count);
function snapshot(placed, packs = 14) {
  return { activeBuild: { id: "existing-e500", modelId: "e500", placed },
    grants: Array.from({ length: packs }, (_, packIndex) => ({ id: `earned-${packIndex}`, buildId: "existing-e500", packIndex })) };
}

test("an old half-built E500 resumes its earned pack without replacing placed IDs", () => {
  const saved = snapshot([...first(21), "p8-3"]);
  const original = JSON.stringify(saved);
  const view = context.KidsTrainWorkshop?.describe(model, saved);
  assert.equal(view?.packIndex, 7);
  assert.deepEqual(Array.from(view.remaining, part => part.id), ["p8-1", "p8-2"]);
  assert.deepEqual(Array.from(view.before), Array.from(first(21)));
  assert.equal(JSON.stringify(saved), original);
});

const settle = () => new Promise(resolve => setImmediate(resolve));

test("a background sync cannot replace the control being tapped before its click", async () => {
  const h=uiHarness();await settle();
  const html=h.host.innerHTML;
  h.fire("pointerdown",{pointerId:17,button:0,target:{closest:selector=>selector==='[data-e500-action="part"]'?null:{dataset:{e500Action:"pause"}}}});
  h.state.sync={status:"offline"};h.mounted.update(h.state);
  assert.ok(h.host.innerHTML === html,"sync must keep the tapped DOM");
  h.fire("pointerup",{pointerId:17});
  h.fire("lostpointercapture",{pointerId:17});
  assert.ok(h.host.innerHTML === html,"normal touch capture release must preserve the following click");
  h.click("pause");
  assert.match(h.host.innerHTML,/回工作台接著拼/);
  assert.match(h.host.innerHTML,/已存本機，待連線/);
  h.mounted.destroy();
});

test("remote placement while dragging cleans the dropped ghost and shows fresh progress", async () => {
  const h=uiHarness([],{motion:true});await settle();
  const control={dataset:{e500Action:"part",part:"p1-1"}};
  h.fire("pointerdown",{pointerId:18,button:0,clientX:0,clientY:0,target:{closest:()=>control}});
  const b=model.steps[0].parts[0].box;
  h.fire("pointermove",{pointerId:18,clientX:b.x+b.width/2,clientY:b.y+b.height/2,preventDefault(){}});
  assert.equal(h.ghosts.length,1);
  h.state.activeBuild.placed.push("p1-1");h.mounted.update(h.state);
  h.fire("pointerup",{pointerId:18});await settle();
  assert.equal(h.calls.length,0);
  assert.equal(h.ghosts[0].removed,true);
  assert.match(h.host.innerHTML,/本包 1 \/ 3 組已接好/);
  h.mounted.destroy();
});

test("all 14 real packs accept arbitrary part order once and stop between packs", async () => {
  const h=uiHarness();await settle();
  try {
    for(let pack=0;pack<14;pack++) {
      for(const number of [3,1,2]) {
        const id=`p${pack+1}-${number}`;
        h.click("part",id);h.click("place");h.click("place");await settle();
        assert.equal(h.state.activeBuild.placed.at(-1),id);
      }
      assert.equal(h.calls.length,(pack+1)*3);
      assert.match(h.host.innerHTML,/看看本包開始前/);
      if(pack<13) {assert.match(h.host.innerHTML,/打開下一包/);h.click("next");}
    }
    assert.equal(h.finalCandidate,true);
    assert.equal(h.soundCount,42);
    assert.equal(h.state.grants.length,14);
    assert.equal(new Set(h.calls.map(call=>call.partId)).size,42);
    for(const call of h.calls) assert.equal(call.grantId,`earned-${call.packIndex}`);
  } finally {h.mounted.destroy();}
});

test("a failed local save leaves the piece available; retry and reopening preserve exact partial IDs", async () => {
  const h=uiHarness([...first(21),"p8-3"]);await settle();
  h.failSave();h.click("part","p8-1");h.click("place");await settle();
  assert.equal(h.state.activeBuild.placed.length,22);
  assert.match(h.host.innerHTML,/無法保存/);
  h.allowSave();h.click("part","p8-1");h.click("place");await settle();
  assert.equal(h.state.activeBuild.placed.length,23);
  h.mounted.destroy();
  const reopened=uiHarness([...h.state.activeBuild.placed]);await settle();
  assert.match(reopened.host.innerHTML,/本包 2 \/ 3 組已接好/);
  reopened.click("part","p8-2");reopened.click("place");await settle();
  assert.equal(reopened.calls.length,1);
  assert.equal(reopened.state.activeBuild.placed.length,24);
  reopened.mounted.destroy();
});

test("no earned pack or failed pictures cannot save an invisible piece", async () => {
  for(const options of [{packs:0},{failImages:true}]) {
    const h=uiHarness([],options);await settle();
    h.click("part","p1-1");h.click("place");await settle();
    assert.equal(h.calls.length,0);
    h.mounted.destroy();
  }
});

test("leaving or resizing during the joining animation cancels without saving", async () => {
  for(const event of ["resize","blur","pagehide","destroy"]) {
    const h=uiHarness(first(21),{motion:true});await settle();
    h.click("part","p8-1");h.click("place");
    assert.equal(h.animations.length,1);
    assert.equal(h.calls.length,0);
    if(event === "destroy")h.mounted.destroy();else h.windows.get(event)();
    await settle();
    assert.equal(h.calls.length,0);
    assert.equal(h.state.activeBuild.placed.length,21);
    h.mounted.destroy();
  }
});

test("another tab completing a moving part does not submit the piece again", async () => {
  const h=uiHarness(first(21),{motion:true});await settle();
  h.click("part","p8-1");h.click("place");
  h.state.activeBuild.placed.push("p8-1");h.mounted.update(h.state);
  h.animations[0].resolve();await settle();
  assert.equal(h.calls.length,0);
  h.mounted.destroy();
});

test("finishing each earned pack holds its before/after until next; never opens an unearned pack", () => {
  for (let pack = 0; pack < 14; pack++) {
    const saved = snapshot(first((pack + 1) * 3), pack + 1);
    const held = context.KidsTrainWorkshop.describe(model, saved, pack);
    assert.equal(held.packIndex, pack);
    assert.equal(held.packDone, true);
    assert.equal(held.before.size, pack * 3);
    assert.equal(held.nextGrant, undefined);
    assert.equal(context.KidsTrainWorkshop.describe(model, saved).packIndex, null);
    if (pack < 13) {
      saved.grants.push({ id: `earned-${pack+1}`, buildId: "existing-e500", packIndex: pack+1 });
      assert.equal(context.KidsTrainWorkshop.describe(model, saved, pack).nextGrant.packIndex, pack+1);
    }
  }
});
