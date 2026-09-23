import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = (name) =>
  readFileSync(new URL(`../docs/shared/${name}`, import.meta.url), "utf8");

function rootElement() {
  const listeners = new Map();
  const element = {
    _innerHTML: "",
    renderHistory: [],
    renderCount: 0,
    get innerHTML() { return this._innerHTML; },
    set innerHTML(value) { this._innerHTML = value; this.renderHistory.push(value); this.renderCount += 1; },
    lastFocused: null,
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    contains() { return true; },
    querySelectorAll(selector) {
      const match = selector.match(/data-action="([^"]+)"/);
      if (!match || !["part", "target"].includes(match[1])) return [];
      return ["p1-1", "p1-2", "p1-3"].map((part) => ({
        dataset: { action: match[1], part },
        tagName: "BUTTON",
        focus: () => { element.lastFocused = { action: match[1], part }; },
        getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 180, width: 50, height: 30 }),
      }));
    },
    dispatchEvent() {},
    replaceChildren() { this.innerHTML = ""; },
    fire(name, target, extra = {}) {
      const event = { target, button: 0, preventDefault() {}, ...extra };
      for (const listener of [...listeners.get(name) || []]) listener(event);
    },
  };
  return element;
}

function action(dataset, extra = {}) {
  const target = { dataset, disabled: false, ...extra };
  target.closest = () => target;
  return target;
}

function harness(placed = [], { modelIds = ["car", "train", "plane"], imageArtwork = false, packCount = 1 } = {}) {
  const callbacks = new Set();
  const windowListeners = new Map();
  const imageLoads = [];
  class TestImage {
    set src(value) { this.url = value; imageLoads.push(this); }
  }
  const activeModelId = modelIds[0];
  const activeBuild = {
    id: `${activeModelId}-build`,
    modelId: activeModelId,
    placed: [...placed],
    completedAt: null,
  };
  const state = {
    version: 1,
    revision: 1,
    daily: { date: "2026-09-22", targets: [], first: true, all: false },
    grants: [
      {
        id: "grant-1",
        date: "2026-09-22",
        kind: "first",
        buildId: activeBuild.id,
        packIndex: 0,
      },
    ],
    activeBuild,
    builds: [activeBuild],
    displayedBuildIds: [],
    sync: { status: "ready", message: "", pending: 0 },
  };
  const placements = [], selectCalls = [], allocateCalls = [];
  const collection = {
    ready: Promise.resolve(),
    snapshot: () => state,
    subscribe(callback) { callbacks.add(callback); return () => callbacks.delete(callback); },
    async placePart(details) {
      placements.push(details);
      if (!activeBuild.placed.includes(details.partId)) activeBuild.placed.push(details.partId);
      state.revision += 1;
      for (const callback of callbacks) callback(state);
    },
    async selectModel(modelId) { selectCalls.push(modelId); },
    async allocate() { allocateCalls.push(true); },
    async setDisplayed() {},
  };
  const document = {
    body: { append() {} },
    createElement: () => ({ style: {}, remove() {} }),
  };
  const context = vm.createContext({
    console,
    document,
    CustomEvent: class {},
    Date,
    Promise,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    Image: TestImage,
    Set,
    Math,
    addEventListener(name, listener) {
      if (!windowListeners.has(name)) windowListeners.set(name, new Set());
      windowListeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { windowListeners.get(name)?.delete(listener); },
  });
  context.window = context;
  context.globalThis = context;
  const entries = {
    car: ["小汽車", "#d94a3d"],
    train: ["火車", "#2779a7"],
    plane: ["飛機", "#e7b84b"],
    e500: ["台鐵 E500 型電力機車", "#d94a3d"],
  };
  const models = modelIds.map((id) => ({
    id,
    title: entries[id][0],
    series: id === "e500" ? "臺灣火車系列" : undefined,
    viewBox: "0 0 300 180",
    steps: Array.from({ length: packCount }, (_, pack) => ({
      title: `第${pack + 1}包`,
      parts: [1, 2, 3].map((number) => ({
        id: `p${pack + 1}-${number}`,
        name: pack === 0 ? `零件${number}` : `零件${pack + 1}-${number}`,
        svg: imageArtwork
          ? `<image href="/art/${id}-p${pack + 1}-${number}.png" x="${number * 55}" y="70" width="50" height="30"/>`
          : `<rect x="${number * 55}" y="70" width="50" height="30" fill="${entries[id][1]}"/>`,
        box: { x: number * 55, y: 70, width: 50, height: 30 },
        z: pack * 3 + number,
      })),
    })),
  }));
  context.KidsBrickModels = { models, get: (id) => models.find((model) => model.id === id) || null };
  vm.runInContext(source("brick-workshop.js"), context);
  const element = rootElement();
  const mounted = context.KidsBrickWorkshop.mount(element, { collection });
  const notify = () => { for (const callback of callbacks) callback(state); };
  const fireWindow = (name, extra = {}) => {
    for (const listener of [...windowListeners.get(name) || []]) listener({ type: name, ...extra });
  };
  return { context, element, state, collection, placements, selectCalls, allocateCalls, imageLoads, mounted, notify, fireWindow };
}

function placedCount(html) {
  return (html.match(/brick-svg-part--placed/g) || []).length;
}

test("render keeps one and two saved parts visible while only remaining parts are ghosts", async () => {
  const one = harness(["p1-1"]);
  await Promise.resolve();
  assert.equal(placedCount(one.element.innerHTML), 1);
  assert.match(one.element.innerHTML, /brick-svg-part--placed[^>]*data-part-id="p1-1"/);
  assert.doesNotMatch(one.element.innerHTML, /data-action="target" data-part="p1-1"/);
  assert.match(one.element.innerHTML, /data-action="target" data-part="p1-2"/);

  one.state.activeBuild.placed.push("p1-2");
  one.mounted.render();
  assert.equal(placedCount(one.element.innerHTML), 2);
  assert.match(one.element.innerHTML, /brick-svg-part--placed[^>]*data-part-id="p1-2"/);
  assert.match(one.element.innerHTML, /data-action="target" data-part="p1-3"/);
  one.mounted.destroy();
});

test("clicking a tray part then its target saves the fixed grant placement", async () => {
  const h = harness();
  h.element.fire("click", action({ action: "part", part: "p1-2" }));
  assert.match(h.element.innerHTML, /放到亮起位置：零件2/);
  h.element.fire("click", action({ action: "target", part: "p1-2" }));
  await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(h.placements)), [
    {
      grantId: "grant-1",
      buildId: "car-build",
      packIndex: 0,
      partId: "p1-2",
    },
  ]);
  assert.equal(placedCount(h.element.innerHTML), 1);
  assert.match(h.element.innerHTML, /brick-svg-part--placed[^>]*data-part-id="p1-2"/);
  h.mounted.destroy();
});

test("only the newly placed group animates once; saved groups stay still through save and sound redraws", async () => {
  const h = harness(["p1-1"]);
  const before = h.element.renderHistory.length;
  h.element.fire("click", action({ action: "part", part: "p1-2" }));
  h.element.fire("click", action({ action: "target", part: "p1-2" }));
  const placementHtml = h.element.renderHistory.slice(before).find((html) =>
    /brick-svg-part--just-placed" data-part-id="p1-2"/.test(html),
  );
  assert.ok(placementHtml, "the locally placed group receives the short snap animation");
  assert.match(placementHtml, /brick-svg-part--placed" data-part-id="p1-1"/);
  assert.doesNotMatch(placementHtml, /brick-svg-part--just-placed" data-part-id="p1-1"/);
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(h.element.renderHistory.filter((html) => /brick-svg-part--just-placed/.test(html)).length, 1);
  assert.doesNotMatch(h.element.innerHTML, /brick-svg-part--just-placed/);
  h.element.fire("click", action({ action: "sound" }));
  assert.doesNotMatch(h.element.innerHTML, /brick-svg-part--just-placed/);
  h.mounted.destroy();
});

test("failed image art blocks placement, retry resumes without losing saved progress", async () => {
  const h = harness(["p1-1"], { imageArtwork: true });
  assert.match(h.element.innerHTML, /正在載入拼裝圖片/);
  assert.equal(h.imageLoads.length, 3);
  h.imageLoads[0].onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /正在載入這包圖片/);
  h.imageLoads[1].onerror();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /這包圖片載入失敗/);
  assert.match(h.element.innerHTML, /重試載入圖片/);
  assert.equal(h.placements.length, 0);
  assert.deepEqual(h.state.activeBuild.placed, ["p1-1"]);

  h.element.fire("click", action({ action: "retry-art" }));
  assert.equal(h.imageLoads.length, 4);
  for (const image of h.imageLoads.slice(2)) image.onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /data-action="part" data-part="p1-2"/);
  h.element.fire("click", action({ action: "part", part: "p1-2" }));
  h.element.fire("click", action({ action: "target", part: "p1-2" }));
  await Promise.resolve();
  assert.equal(h.placements.length, 1);
  assert.deepEqual(h.state.activeBuild.placed, ["p1-1", "p1-2"]);
  h.mounted.destroy();
});

test("a pending next pack keeps the completed pack and its one-time placement animation visible", async () => {
  const h = harness(["p1-1", "p1-2"], { imageArtwork: true, packCount: 2 });
  h.state.grants.push({ id: "grant-2", date: "2026-09-22", kind: "all", buildId: h.state.activeBuild.id, packIndex: 1 });
  for (const image of h.imageLoads) image.onload();
  await Promise.resolve();
  h.element.fire("click", action({ action: "part", part: "p1-3" }));
  h.element.fire("click", action({ action: "target", part: "p1-3" }));
  const afterPlacement = h.element.innerHTML;
  assert.match(afterPlacement, /brick-svg-part--just-placed" data-part-id="p1-3"/);
  assert.match(afterPlacement, /正在載入這包圖片/);
  assert.doesNotMatch(afterPlacement, /brick-art-gate/);
  assert.equal(h.imageLoads.length, 6);
  for (const image of h.imageLoads.slice(3)) image.onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /brick-svg-part--just-placed" data-part-id="p1-3"/, "image callbacks wait for the snap animation");
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.match(h.element.innerHTML, /data-action="part" data-part="p2-1"/);
  assert.doesNotMatch(h.element.innerHTML, /brick-svg-part--just-placed/);
  h.mounted.destroy();
});

test("completed work and the collection room show image failure and retry without changing ownership", async () => {
  const h = harness(["p1-1", "p1-2", "p1-3"], { imageArtwork: true });
  h.state.activeBuild.completedAt = "2026-09-22T12:00:00.000Z";
  h.mounted.render();
  h.imageLoads[0].onload();
  h.imageLoads[1].onload();
  h.imageLoads[2].onerror();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /拼裝圖片載入失敗/);
  assert.match(h.element.innerHTML, /data-action="retry-art"/);
  h.element.fire("click", action({ action: "view", view: "shelf" }));
  assert.match(h.element.innerHTML, /拼裝圖片載入失敗/);
  assert.match(h.element.innerHTML, /已收藏/);
  assert.match(h.element.innerHTML, /data-action="retry-art"/);
  h.element.fire("click", action({ action: "retry-art" }));
  const retry = h.imageLoads.filter((image) => image.url === "/art/car-p1-3.png").at(-1);
  assert.notEqual(retry, h.imageLoads[2]);
  retry.onload();
  await Promise.resolve();
  assert.doesNotMatch(h.element.innerHTML, /拼裝圖片載入失敗/);
  assert.match(h.element.innerHTML, /已收藏/);
  assert.deepEqual(h.state.activeBuild.placed, ["p1-1", "p1-2", "p1-3"]);
  h.mounted.destroy();
});

test("thumbnail shows saved pieces and can render a complete catalog preview", () => {
  const h = harness();
  const total = h.context.KidsBrickModels.get("car").steps.reduce(
    (count, step) => count + step.parts.length,
    0,
  );
  const partial = h.context.KidsBrickWorkshop.thumbnail("car", {
    placed: ["p1-1"],
  });
  assert.equal((partial.match(/brick-thumbnail__placed/g) || []).length, 1);
  assert.equal((partial.match(/brick-thumbnail__ghost/g) || []).length, total - 1);
  const complete = h.context.KidsBrickWorkshop.thumbnail("car", {
    complete: true,
    ghosts: false,
  });
  assert.equal((complete.match(/brick-thumbnail__placed/g) || []).length, total);
  assert.doesNotMatch(complete, /brick-thumbnail__ghost/);
  h.mounted.destroy();
});

test("local final placement waits for server completion before offering the display shelf", () => {
  const h = harness(
    Array.from({ length: 14 }, (_, pack) =>
      Array.from({ length: 3 }, (_, part) => `p${pack + 1}-${part + 1}`),
    ).flat(),
  );
  h.state.sync = { status: "offline", message: "目前離線", pending: 1 };
  h.mounted.render();
  assert.match(h.element.innerHTML, /最後一片已放好/);
  assert.match(h.element.innerHTML, /data-action="flush"/);
  assert.doesNotMatch(h.element.innerHTML, /作品完成/);
  assert.doesNotMatch(h.element.innerHTML, /放上展示架/);

  h.state.activeBuild.completedAt = "2026-09-22T12:00:00.000Z";
  h.state.sync = { status: "ready", message: "", pending: 0 };
  h.mounted.render();
  assert.match(h.element.innerHTML, /作品完成/);
  assert.match(h.element.innerHTML, /放上展示架/);
  h.mounted.destroy();
});

test("collection room combines the display shelf and full series without a third nested tab", () => {
  const h = harness();
  assert.doesNotMatch(h.element.innerHTML, /data-view="catalog"/);
  h.element.fire("click", action({ action: "view", view: "shelf" }));
  assert.match(h.element.innerHTML, /我的收藏/);
  assert.match(h.element.innerHTML, /第一系列/);
  assert.match(h.element.innerHTML, /小汽車/);
  h.mounted.destroy();
});

test("selecting a model sends one server-confirmed operation and does not allocate twice", async () => {
  const h = harness();
  h.state.activeBuild = null;
  h.state.builds = [];
  h.state.grants = [{ id: "free-pack", date: "2026-09-22", kind: "first", buildId: null, packIndex: null }];
  h.mounted.render();
  h.element.fire("click", action({ action: "start-model", model: "train" }));
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(h.selectCalls, ["train"]);
  assert.equal(h.allocateCalls.length, 0);
  h.mounted.destroy();
});

test("model picker disables owned models and routes a completed series back to the collection room", () => {
  const h = harness(["p1-1", "p1-2", "p1-3"]);
  h.state.activeBuild.completedAt = "2026-09-22T12:00:00.000Z";
  h.state.grants.push({ id: "free-pack", date: "2026-09-22", kind: "all", buildId: null, packIndex: null });
  h.element.fire("click", action({ action: "choose-next" }));
  assert.match(h.element.innerHTML, /brick-model-card is-owned[^>]*data-model="car"[^>]*disabled/);
  assert.match(h.element.innerHTML, /data-model="train"(?![^>]*disabled)/);

  h.state.builds = ["car", "train", "plane"].map((modelId, index) => ({
    id: `finished-${index}`,
    modelId,
    placed: ["p1-1", "p1-2", "p1-3"],
    completedAt: "2026-09-22T12:00:00.000Z",
  }));
  h.mounted.render();
  assert.match(h.element.innerHTML, /這個系列目前的作品都收集完成了/);
  assert.match(h.element.innerHTML, /data-view="shelf"/);
  h.mounted.destroy();
});

test("E500 is the only selectable series model and spare packs stay in the box after completion", async () => {
  const h = harness([], { modelIds: ["e500"] });
  h.state.activeBuild = null;
  h.state.builds = [];
  h.state.grants = [{ id: "free-pack", date: "2026-09-22", kind: "first", buildId: null, packIndex: null }];
  h.mounted.render();
  assert.match(h.element.innerHTML, /臺灣火車系列/);
  assert.match(h.element.innerHTML, /data-model="e500"/);
  assert.doesNotMatch(h.element.innerHTML, /data-model="(?:car|train|plane)"/);
  h.element.fire("click", action({ action: "start-model", model: "e500" }));
  await Promise.resolve();
  assert.deepEqual(h.selectCalls, ["e500"]);

  h.state.activeBuild = { id: "e500", modelId: "e500", placed: ["p1-1", "p1-2", "p1-3"], completedAt: "2026-09-22T12:00:00.000Z" };
  h.state.builds = [h.state.activeBuild];
  h.mounted.render();
  assert.match(h.element.innerHTML, /臺灣火車系列目前的作品都收集完成了/);
  assert.match(h.element.innerHTML, /剩下的 1 包會留在零件盒/);
  assert.doesNotMatch(h.element.innerHTML, /data-model="e500"/);
  assert.match(h.element.innerHTML, /放上展示架/);
  h.mounted.destroy();
});

test("keyboard selection focuses the target and Escape returns focus to the same part", () => {
  const h = harness();
  h.element.fire("click", action({ action: "part", part: "p1-2" }));
  assert.deepEqual(h.element.lastFocused, { action: "target", part: "p1-2" });
  h.element.fire("keydown", action({ action: "target", part: "p1-2" }), { key: "Escape" });
  assert.deepEqual(h.element.lastFocused, { action: "part", part: "p1-2" });
  assert.doesNotMatch(h.element.innerHTML, /放到亮起位置/);
  h.mounted.destroy();
});

test("touch uses implicit capture and keeps its source mounted through cancel", async () => {
  const h = harness();
  let captured = false, released = false, lostCapture;
  const source = action(
    { action: "part", part: "p1-2" },
    {
      setPointerCapture() { captured = true; },
      hasPointerCapture() { return captured && !released; },
      releasePointerCapture() { released = true; },
    },
  );
  const inner = {
    closest: () => source,
    hasPointerCapture: () => true,
    addEventListener(name, listener) {
      if (name === "lostpointercapture") lostCapture = listener;
    },
  };
  h.element.fire("pointerdown", inner, {
    pointerId: 7,
    pointerType: "touch",
    clientX: 100,
    clientY: 100,
  });
  assert.equal(captured, false, "a stationary touch must keep native click synthesis");

  h.element.fire("pointerdown", action({ action: "part", part: "p1-3" }), {
    pointerId: 8,
    pointerType: "touch",
    clientX: 160,
    clientY: 100,
  });
  h.element.fire("pointermove", action({ action: "part", part: "p1-3" }), {
    pointerId: 8,
    pointerType: "touch",
    clientX: 190,
    clientY: 100,
  });

  const beforeDragRender = h.element.renderCount;
  h.element.fire("pointermove", inner, {
    pointerId: 7,
    pointerType: "touch",
    clientX: 120,
    clientY: 100,
  });
  assert.equal(captured, false, "touch keeps the browser's implicit capture target");
  assert.equal(
    h.element.renderCount,
    beforeDragRender,
    "the captured source stays in the DOM for the whole drag",
  );
  h.element.fire("pointercancel", inner, { pointerId: 7 });
  assert.equal(released, false, "implicit touch capture is released by the browser");
  assert.equal(h.element.renderCount, beforeDragRender, "cancel waits for lostpointercapture");
  lostCapture();
  await Promise.resolve();
  assert.ok(h.element.renderCount > beforeDragRender, "cancel renders after capture is released");
  h.mounted.destroy();
});

test("subscription rendering waits until a control tap has completed", async () => {
  const h = harness();
  await Promise.resolve();
  const close = action({ action: "close" });
  const beforeTap = h.element.renderCount;

  h.element.fire("pointerdown", close, { pointerId: 11, pointerType: "touch" });
  h.notify();
  assert.equal(h.element.renderCount, beforeTap, "the pressed control must stay mounted");
  h.element.fire("pointerup", close, { pointerId: 11, pointerType: "touch" });
  assert.equal(h.element.renderCount, beforeTap, "pointerup alone must not replace the click target");
  h.element.fire("click", close, { pointerId: 11, pointerType: "touch" });
  await Promise.resolve();
  assert.ok(h.element.renderCount > beforeTap, "the deferred snapshot renders after click");
  h.mounted.destroy();
});

test("destroy aborts a pending captured drop without saving it", async () => {
  const h = harness();
  let captured = true, lostCapture;
  const source = action({ action: "part", part: "p1-2" });
  const inner = {
    closest: () => source,
    hasPointerCapture: () => captured,
    addEventListener(name, listener) {
      if (name === "lostpointercapture") lostCapture = listener;
    },
    removeEventListener() {},
    releasePointerCapture() { captured = false; },
  };
  h.element.fire("pointerdown", inner, {
    pointerId: 12,
    pointerType: "touch",
    clientX: 100,
    clientY: 100,
  });
  h.element.fire("pointermove", inner, {
    pointerId: 12,
    pointerType: "touch",
    clientX: 120,
    clientY: 100,
  });
  h.element.fire("pointerup", inner, {
    pointerId: 12,
    pointerType: "touch",
    clientX: 120,
    clientY: 100,
  });
  assert.equal(h.placements.length, 0, "the drop waits for capture release");
  h.mounted.destroy();
  lostCapture();
  await Promise.resolve();
  assert.equal(h.placements.length, 0, "an unmounted workshop cannot commit the pending drop");
});

test("window blur releases an active touch drag without leaving rendering blocked", async () => {
  const h = harness();
  let captured = true, released = false;
  const source = action({ action: "part", part: "p1-2" });
  const inner = {
    closest: () => source,
    hasPointerCapture: () => captured,
    addEventListener() {},
    removeEventListener() {},
    releasePointerCapture() { captured = false; released = true; },
  };
  h.element.fire("pointerdown", inner, {
    pointerId: 13,
    pointerType: "touch",
    clientX: 100,
    clientY: 100,
  });
  h.element.fire("pointermove", inner, {
    pointerId: 13,
    pointerType: "touch",
    clientX: 120,
    clientY: 100,
  });
  const beforeBlur = h.element.renderCount;
  h.fireWindow("blur");
  await Promise.resolve();
  assert.equal(released, true, "blur actively releases the implicit capture");
  assert.ok(h.element.renderCount > beforeBlur, "blur finalizes the canceled drag");
  h.mounted.destroy();
});
