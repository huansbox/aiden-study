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
    renderCount: 0,
    get innerHTML() { return this._innerHTML; },
    set innerHTML(value) { this._innerHTML = value; this.renderCount += 1; },
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

function harness(placed = []) {
  const callbacks = new Set();
  const windowListeners = new Map();
  const activeBuild = {
    id: "car-build",
    modelId: "car",
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
  const models = [
    ["car", "小汽車", "#d94a3d"],
    ["train", "火車", "#2779a7"],
    ["plane", "飛機", "#e7b84b"],
  ].map(([id, title, fill]) => ({
    id,
    title,
    viewBox: "0 0 300 180",
    steps: [{
      title: "第一包",
      parts: [1, 2, 3].map((number) => ({
        id: `p1-${number}`,
        name: `零件${number}`,
        svg: `<rect x="${number * 55}" y="70" width="50" height="30" fill="${fill}"/>`,
        box: { x: number * 55, y: 70, width: 50, height: 30 },
        z: number,
      })),
    }],
  }));
  context.KidsBrickModels = { models, get: (id) => models.find((model) => model.id === id) || null };
  vm.runInContext(source("brick-workshop.js"), context);
  const element = rootElement();
  const mounted = context.KidsBrickWorkshop.mount(element, { collection });
  const notify = () => { for (const callback of callbacks) callback(state); };
  const fireWindow = (name, extra = {}) => {
    for (const listener of [...windowListeners.get(name) || []]) listener({ type: name, ...extra });
  };
  return { context, element, state, collection, placements, selectCalls, allocateCalls, mounted, notify, fireWindow };
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
  assert.match(h.element.innerHTML, /三件作品都收集完成了/);
  assert.match(h.element.innerHTML, /data-view="shelf"/);
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
