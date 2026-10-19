import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = name => readFileSync(new URL(`../docs/shared/${name}`, import.meta.url), "utf8");
const four = ["emu3000", "emu900", "700t", "n700s"];
const seven = ["e500", "ct273", "breezy-blue", ...four];

function harness(modelId, { completed = false, contentVersion = 2, missingMechanism = false, missingWorkshop = false } = {}) {
  const events = new Map(), subscribers = new Set(), mounts = [], writes = [];
  const host = {}, element = {
    innerHTML: "", addEventListener(name, listener) { events.set(name, listener); },
    removeEventListener(name) { events.delete(name); }, contains: () => true,
    querySelector: () => host, querySelectorAll: () => [], dispatchEvent() {},
  };
  let reloads = 0;
  const context = vm.createContext({
    console, Set, Map, Date, Promise, queueMicrotask, setTimeout, clearTimeout,
    CustomEvent: class {}, matchMedia: () => ({ matches: true }),
    location: { reload() { reloads++; } },
    Image: class { set src(_) { queueMicrotask(() => this.onload?.()); } },
  });
  context.window = context;
  for (const file of ["collection-core.js", ...["e500", "ct273", "breezy-blue", "emu3000", "emu900", "700t", "n700s", "r200"].map(id => `brick-${id}.js`), "brick-models.js"])
    vm.runInContext(source(file), context);
  const C = context.KidsCollectionCore;
  const build = { id: `saved-${modelId}`, modelId, contentVersion, placed: [], completedAt: completed ? "2026-10-18T12:00:00Z" : null };
  if (completed) build.placed = C.requiredParts(build).map(part => part.id);
  const state = { ...C.snapshot(C.empty()), activeBuild: build, builds: [build], grants: [{ id: "saved-pack", date: "2026-10-18", kind: "first", buildId: build.id, packIndex: C.packStart(build) }], sync: { status: "ready" } };
  const collection = {
    snapshot: () => state, ready: Promise.resolve(),
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener); },
    ...Object.fromEntries(["placePart", "allocate", "selectModel", "setDisplayed", "flush"].map(name => [name, () => { writes.push(name); throw Error("unexpected collection mutation"); }])),
  };
  if (!missingWorkshop) context.KidsTrainWorkshop = { mount(_host, options) {
    const record = { options, updates: [], destroyed: false }; mounts.push(record);
    return { update(snapshot) { record.updates.push(snapshot); }, destroy() { record.destroyed = true; } };
  } };
  if (!missingMechanism) {
    context.KidsEmuMechanism = { create() {} };
    context.KidsHighspeedMechanism = { create() {} };
  }
  vm.runInContext(source("brick-workshop.js"), context);
  const mounted = context.KidsBrickWorkshop.mount(element, { collection });
  const click = (action, buildId) => {
    const target = { dataset: { action, build: buildId }, disabled: false };
    target.closest = () => target;
    events.get("click")({ target });
  };
  return { context, state, element, mounts, writes, mounted, click, get reloads() { return reloads; }, notify() { for (const listener of subscribers) listener(state); } };
}

test("seven graphical models route saved v1/v2 builds to the picture workshop; R200 retains its old workshop", () => {
  for (const modelId of [...seven, "r200"]) for (const contentVersion of [1, 2]) {
    const h = harness(modelId, { contentVersion });
    try {
      assert.equal(h.mounts.length, modelId === "r200" ? 0 : 1, `${modelId} v${contentVersion}`);
      if (modelId !== "r200") {
        const options = h.mounts[0].options;
        assert.equal(options.model.id, modelId);
        assert.equal(options.inspection, false);
        assert.equal(options.collection.snapshot().activeBuild.id, `saved-${modelId}`);
        assert.equal(typeof options.onFinalPlacement, "function");
      }
      assert.deepEqual(h.writes, []);
    } finally { h.mounted.destroy(); }
  }
});

test("missing required feature scripts show a reload gate without consuming saved packs", () => {
  for (const modelId of four) {
    const h = harness(modelId, { missingMechanism: true });
    try {
      assert.match(h.element.innerHTML, /拼裝工作台沒有完整載入/);
      assert.equal(h.mounts.length, 0);
      h.click("reload-workshop");
      assert.equal(h.reloads, 1);
      assert.deepEqual(h.writes, []);
      assert.equal(h.state.grants[0].id, "saved-pack");
      assert.equal(h.state.activeBuild.id, `saved-${modelId}`);
    } finally { h.mounted.destroy(); }
  }
});

test("missing the whole picture workshop blocks the new four models and preserves the older fallback", () => {
  for (const modelId of [...seven,"r200"]) {
    const h=harness(modelId,{missingWorkshop:true});
    try {
      if (four.includes(modelId)) {
        assert.match(h.element.innerHTML,/拼裝工作台沒有完整載入/);
        assert.doesNotMatch(h.element.innerHTML,/brick-bench|data-action="part"/);
        h.click("reload-workshop");assert.equal(h.reloads,1);
      } else assert.doesNotMatch(h.element.innerHTML,/拼裝工作台沒有完整載入/);
      assert.equal(h.mounts.length,0);
      assert.deepEqual(h.writes,[]);
      assert.equal(h.state.activeBuild.id,`saved-${modelId}`);
      assert.equal(h.state.grants[0].id,"saved-pack");
    } finally {h.mounted.destroy();}
  }
});

test("the four redesigned partial thumbnails show saved parts without future-part ghosts", () => {
  for (const modelId of four) {
    const h = harness(modelId);
    try {
      h.state.activeBuild.placed = ["p2-1"];
      h.mounts[0].options.onShelf();
      const partial = h.element.innerHTML.split('class="brick-in-progress"')[1]?.split("</section>")[0] || "";
      assert.match(partial, /brick-thumbnail__placed/);
      assert.doesNotMatch(partial, /brick-thumbnail__ghost/);
      assert.match(partial, /繼續拼/);
    } finally { h.mounted.destroy(); }
  }
});

test("all four completed models can replay their features through a read-only adapter and return to the same completed card", async () => {
  for (const modelId of four) {
    const h = harness(modelId, { completed: true });
    try {
      await new Promise(resolve => setImmediate(resolve));
      const before = JSON.stringify(h.state);
      assert.match(h.element.innerHTML, /玩玩零件/);
      h.click("inspect-build", `saved-${modelId}`);
      const inspection = h.mounts.at(-1).options;
      assert.equal(inspection.inspection, true);
      assert.deepEqual(Object.keys(inspection.collection), ["snapshot"]);
      assert.equal(inspection.collection.snapshot().activeBuild.id, `saved-${modelId}`);
      assert.equal(inspection.onFinalPlacement, undefined);
      inspection.onClose();
      assert.match(h.element.innerHTML, /作品完成/);
      assert.match(h.element.innerHTML, /玩玩零件/);
      assert.equal(h.mounts.at(-1).destroyed, true);
      assert.equal(JSON.stringify(h.state), before);
      assert.deepEqual(h.writes, []);
    } finally { h.mounted.destroy(); }
  }
});

test("the shelf can inspect a non-active completed model while retaining the active partial build and return view", () => {
  const h = harness("emu900");
  try {
    const completed = { id: "older-emu3000", modelId: "emu3000", contentVersion: 1, placed: [], completedAt: "2026-10-18T12:00:00Z" };
    completed.placed = h.context.KidsCollectionCore.requiredParts(completed).map(part => part.id);
    h.state.builds.push(completed);
    h.mounts[0].options.onShelf();
    const before = JSON.stringify(h.state);
    h.click("inspect-build", completed.id);
    const record = h.mounts.at(-1);
    assert.equal(record.options.collection.snapshot().activeBuild.id, completed.id);
    assert.equal(h.state.activeBuild.modelId, "emu900");
    h.notify();
    assert.equal(record.updates.at(-1).activeBuild.id, completed.id);
    record.options.onClose();
    assert.match(h.element.innerHTML, /我的收藏室/);
    assert.equal(JSON.stringify(h.state), before);
    assert.deepEqual(h.writes, []);
  } finally { h.mounted.destroy(); }
});

test("stale play buttons cannot inspect unfinished builds or R200", () => {
  for (const modelId of ["emu3000", "r200"]) {
    const h = harness(modelId);
    try {
      const previous = h.mounts.length;
      h.click("inspect-build", `saved-${modelId}`);
      assert.equal(h.mounts.length, previous);
      assert.deepEqual(h.writes, []);
    } finally { h.mounted.destroy(); }
  }
});
