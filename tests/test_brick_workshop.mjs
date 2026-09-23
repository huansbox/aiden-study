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
    guideNodes: [],
    get innerHTML() { return this._innerHTML; },
    set innerHTML(value) {
      this._innerHTML = value;
      this.renderHistory.push(value);
      this.renderCount += 1;
      this.guideNodes = [...value.matchAll(/<g data-target-guide="([^"]+)"([^>]*)>/g)].map(([, part, attributes]) => ({
        dataset: { targetGuide: part },
        style: { display: attributes.includes('display:none') ? "none" : "" },
      }));
    },
    lastFocused: null,
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(listener);
    },
    removeEventListener(name, listener) { listeners.get(name)?.delete(listener); },
    contains() { return true; },
    querySelectorAll(selector) {
      if (selector === "[data-target-guide]") return this.guideNodes;
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

function controlledClock() {
  let now = 0, nextId = 1;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    pending() { return [...timers.values()].map((timer) => timer.at - now).sort((a, b) => a - b); },
    advance(milliseconds) {
      const end = now + milliseconds;
      for (;;) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
      }
      now = end;
    },
  };
}

function harness(placed = [], {
  modelIds = ["car", "train", "plane"], imageArtwork = false, variantArtwork = false, packCount = 1,
  withCelebration = false, initialCompleted = false, reducedMotion = false, controlledTimers = false, withAudio = false,
} = {}) {
  const callbacks = new Set();
  const windowListeners = new Map();
  const imageLoads = [];
  const dragGhosts = [];
  const clock = controlledTimers ? controlledClock() : null;
  const closeCalls = [];
  const audioCalls = [];
  class TestImage {
    set src(value) { this.url = value; imageLoads.push(this); }
  }
  const activeModelId = modelIds[0];
  const activeBuild = {
    id: `${activeModelId}-build`,
    modelId: activeModelId,
    placed: [...placed],
    completedAt: initialCompleted ? "2026-09-23T12:00:00.000Z" : null,
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
    createElement: () => { const ghost = { style: {}, remove() {} }; dragGhosts.push(ghost); return ghost; },
  };
  const context = vm.createContext({
    console,
    document,
    CustomEvent: class {},
    Date: clock ? class extends Date { static now() { return clock.now(); } } : Date,
    Promise,
    queueMicrotask,
    setTimeout: clock?.setTimeout || setTimeout,
    clearTimeout: clock?.clearTimeout || clearTimeout,
    matchMedia: () => ({ matches: reducedMotion }),
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
    emu3000: ["台鐵 EMU3000 型電聯車", "#f2f1e9"],
    r200: ["台鐵 R200 型柴電機車", "#1c4c70"],
  };
  const models = modelIds.map((id) => ({
    id,
    title: entries[id][0],
    series: ["e500", "emu3000", "r200"].includes(id) ? "臺灣火車系列" : undefined,
    viewBox: "0 0 300 180",
    steps: Array.from({ length: packCount }, (_, pack) => ({
      title: `第${pack + 1}包`,
      parts: [1, 2, 3].map((number) => {
        const partId = `p${pack + 1}-${number}`;
        const svgFor = (suffix = "") => `<image href="/art/${id}-${partId}${suffix}.png" x="${number * 55}" y="70" width="50" height="30"/>`;
        const peers = variantArtwork ? Array.from({ length: number - 1 }, (_, index) => `p${pack + 1}-${index + 1}`) : [];
        return {
          id: partId,
          name: pack === 0 ? `零件${number}` : `零件${pack + 1}-${number}`,
          svg: imageArtwork ? svgFor() : `<rect x="${number * 55}" y="70" width="50" height="30" fill="${entries[id][1]}"/>`,
          occlusionPeers: peers,
          variants: variantArtwork ? Array.from({ length: (1 << peers.length) - 1 }, (_, mask) => ({ mask, svg: svgFor(`-v${mask}`) })) : [],
          box: { x: number * 55, y: 70, width: 50, height: 30 },
          z: pack * 3 + number,
        };
      }),
    })),
  }));
  context.KidsBrickModels = { models, get: (id) => models.find((model) => model.id === id) || null };
  if (withAudio) context.KidsBrickAudio = {
    create() {
      audioCalls.push({ method: "create", args: [] });
      return Object.fromEntries(["unlock", "place", "celebrate", "stop", "setEnabled", "destroy"].map((method) =>
        [method, (...args) => audioCalls.push({ method, args })],
      ));
    },
  };
  if (withCelebration) vm.runInContext(source("brick-celebration.js"), context);
  vm.runInContext(source("brick-workshop.js"), context);
  const element = rootElement();
  const mounted = context.KidsBrickWorkshop.mount(element, { collection, onClose: () => closeCalls.push(true) });
  const notify = () => { for (const callback of callbacks) callback(state); };
  const fireWindow = (name, extra = {}) => {
    for (const listener of [...windowListeners.get(name) || []]) listener({ type: name, ...extra });
  };
  return { context, element, state, collection, placements, selectCalls, allocateCalls, imageLoads, dragGhosts, mounted, notify, fireWindow, clock, closeCalls, audioCalls };
}

function placedCount(html) {
  return (html.match(/brick-svg-part--placed/g) || []).length;
}

const completePartIds = Array.from({ length: 14 }, (_, pack) =>
  [1, 2, 3].map((number) => `p${pack + 1}-${number}`),
).flat();
const celebrationMarker = /data-celebration(?:\s|>)/;
function celebrationHarness(options = {}, placed = options.initialCompleted ? completePartIds : completePartIds.slice(0, -1)) {
  const h = harness(placed, {
    modelIds: ["e500"], packCount: 14, withCelebration: true, controlledTimers: true, ...options,
  });
  h.state.grants.push({ id: "last-pack", buildId: h.state.activeBuild.id, packIndex: 13 });
  h.mounted.render();
  return h;
}
function clickFinalGroup(h) {
  h.element.fire("click", action({ action: "part", part: "p14-3" }));
  h.element.fire("click", action({ action: "target", part: "p14-3" }));
}
function finishLocalBuild(h) {
  clickFinalGroup(h);
  assert.equal(h.placements.length, 1, "the current visit places its final group");
  assert.equal(h.state.activeBuild.placed.length, 42);
  h.clock.advance(320);
}
function confirmCompletion(h) {
  h.state.activeBuild.completedAt = "2026-09-23T12:00:00.000Z";
  h.state.revision++;
  h.notify();
}

for (const modelId of ["emu3000", "r200"]) {
  test(`${modelId} celebrates its 36th group after confirmation and keeps the final target visible`, async () => {
    const ids = Array.from({ length: 12 }, (_, pack) => [1, 2, 3].map(n => `p${pack + 1}-${n}`)).flat();
    const h = harness(ids.slice(0, -1), { modelIds: [modelId], packCount: 12, withCelebration: true, controlledTimers: true, withAudio: true });
    try {
      h.state.grants.push({ id: "last-pack", buildId: h.state.activeBuild.id, packIndex: 11 });
      h.mounted.render();
      assert.match(h.element.innerHTML, /最後一片，放這裡/);
      assert.equal(h.element.guideNodes.find(node => node.dataset.targetGuide === "p12-3").style.display, "");
      h.element.fire("click", action({ action: "part", part: "p12-3" }));
      h.element.fire("click", action({ action: "target", part: "p12-3" }));
      await Promise.resolve();
      h.clock.advance(320);
      assert.equal(h.state.activeBuild.placed.length, 36);
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      confirmCompletion(h);
      assert.match(h.element.innerHTML, celebrationMarker);
      assert.match(h.element.innerHTML, /36 組積木，全部完成/);
      assert.match(h.element.innerHTML, new RegExp(modelId.toUpperCase() + "，出發！"));
      assert.ok(h.audioCalls.some(call => call.method === "celebrate"));
      h.clock.advance(6000);
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      assert.match(h.element.innerHTML, /data-action="display"/);
    } finally { h.mounted.destroy(); }
  });
}

test("E500 celebration waits for server completion and keeps its DOM through subscription updates", async () => {
  const h = celebrationHarness();
  try {
    await Promise.resolve();
    h.state.sync = { status: "offline", pending: 1 };
    finishLocalBuild(h);
    h.notify();
    assert.match(h.element.innerHTML, /最後一片已放好/);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), []);

    confirmCompletion(h);
    assert.match(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), [6000]);
    const html = h.element.innerHTML, renders = h.element.renderCount;
    h.state.revision++;
    h.state.sync = { status: "ready", pending: 0 };
    h.notify();
    h.mounted.render();
    await Promise.resolve();
    assert.equal(h.element.innerHTML, html);
    assert.equal(h.element.renderCount, renders, "save callbacks must not replace the animation DOM");
    assert.deepEqual(h.clock.pending(), [6000]);
  } finally { h.mounted.destroy(); }
});

test("E500 celebration ends after 6 seconds, does not auto-repeat, and can be replayed manually", () => {
  const h = celebrationHarness({ withAudio: true });
  try {
    finishLocalBuild(h);
    confirmCompletion(h);
    h.clock.advance(5999);
    assert.match(h.element.innerHTML, celebrationMarker);
    const stops = h.audioCalls.filter((call) => call.method === "stop").length;
    h.clock.advance(1);
    assert.equal(h.audioCalls.filter((call) => call.method === "stop").length, stops + 1);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.match(h.element.innerHTML, /data-action="display"/);
    assert.match(h.element.innerHTML, /data-action="celebration-replay"/);
    h.notify();
    h.element.fire("click", action({ action: "view", view: "shelf" }));
    h.element.fire("click", action({ action: "view", view: "workshop" }));
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), []);

    h.element.fire("click", action({ action: "celebration-replay" }));
    assert.match(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), [6000]);
    h.clock.advance(6000);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.state.activeBuild.placed, completePartIds);
  } finally { h.mounted.destroy(); }
});

test("remote completion of a cached E500 never auto-celebrates without a local final placement", async (t) => {
  for (const cachedCount of [41, 42]) await t.test(`${cachedCount} cached parts`, async () => {
    const h = celebrationHarness({}, completePartIds.slice(0, cachedCount));
    try {
      await Promise.resolve();
      assert.equal(h.placements.length, 0);
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      h.state.activeBuild.placed = [...completePartIds];
      confirmCompletion(h);
      h.notify();
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      assert.match(h.element.innerHTML, /data-action="display"/);
      assert.deepEqual(h.clock.pending(), []);
      h.element.fire("click", action({ action: "view", view: "shelf" }));
      h.element.fire("click", action({ action: "view", view: "workshop" }));
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      h.element.fire("click", action({ action: "celebration-replay" }));
      assert.match(h.element.innerHTML, celebrationMarker, "explicit replay remains available after a remote completion");
    } finally { h.mounted.destroy(); }
  });
});

test("skipping E500 celebration by button or Escape clears its timer without another automatic replay", async (t) => {
  for (const method of ["button", "Escape"]) await t.test(method, () => {
    const h = celebrationHarness({ withAudio: true });
    try {
      finishLocalBuild(h);
      confirmCompletion(h);
      const stops = h.audioCalls.filter((call) => call.method === "stop").length;
      if (method === "button") h.element.fire("click", action({ action: "celebration-skip" }));
      else h.element.fire("keydown", action({}), { key: "Escape" });
      assert.equal(h.audioCalls.filter((call) => call.method === "stop").length, stops + 1);
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      assert.match(h.element.innerHTML, /data-action="display"/);
      assert.deepEqual(h.clock.pending(), []);
      const renders = h.element.renderCount;
      h.clock.advance(5000);
      assert.equal(h.element.renderCount, renders);
      h.notify();
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    } finally { h.mounted.destroy(); }
  });
});

test("existing completed collections, reduced motion, and unsupported models do not auto-celebrate", async (t) => {
  for (const [name, options] of [
    ["existing E500", { initialCompleted: true }],
    ["reduced motion", { reducedMotion: true }],
    ["legacy train", { modelIds: ["train"] }],
    ["missing celebration module", { withCelebration: false }],
  ]) await t.test(name, async () => {
    const h = celebrationHarness(options);
    try {
      await Promise.resolve();
      if (!options.initialCompleted) {
        finishLocalBuild(h);
        confirmCompletion(h);
      }
      h.notify();
      assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      assert.match(h.element.innerHTML, /data-action="display"/);
      assert.deepEqual(h.clock.pending(), []);
      if (options.initialCompleted) {
        h.element.fire("click", action({ action: "celebration-replay" }));
        assert.match(h.element.innerHTML, celebrationMarker, "old collections can opt into a replay");
      }
    } finally { h.mounted.destroy(); }
  });
});

test("closing, destroying, or leaving the workshop cancels the E500 celebration timer", async (t) => {
  for (const method of ["close", "destroy", "shelf"]) await t.test(method, async () => {
    const h = celebrationHarness({ withAudio: true });
    try {
      await Promise.resolve();
      finishLocalBuild(h);
      confirmCompletion(h);
      assert.deepEqual(h.clock.pending(), [6000]);
      const stops = h.audioCalls.filter((call) => call.method === "stop").length;
      if (method === "destroy") h.mounted.destroy();
      else if (method === "close") h.element.fire("click", action({ action: "close" }));
      else h.element.fire("click", action({ action: "view", view: "shelf" }));
      assert.equal(h.audioCalls.filter((call) => call.method === "stop").length, stops + 1);
      assert.equal(h.audioCalls.filter((call) => call.method === "destroy").length, method === "destroy" ? 1 : 0);
      assert.deepEqual(h.clock.pending(), []);
      if (method === "close") assert.equal(h.closeCalls.length, 1);
      if (method === "destroy") assert.equal(h.element.innerHTML, "");
      const renders = h.element.renderCount;
      const audioCount = h.audioCalls.length;
      h.clock.advance(7000);
      assert.equal(h.audioCalls.length, audioCount, "cancelled timers cannot restart sound");
      assert.equal(h.element.renderCount, renders);
      if (method === "destroy") {
        h.notify();
        assert.equal(h.element.renderCount, renders, "destroy unsubscribes collection updates");
      }
      if (method === "shelf") {
        h.element.fire("click", action({ action: "view", view: "workshop" }));
        assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
      }
    } finally { h.mounted.destroy(); }
  });
});

test("workshop sound follows confirmed completion and resumes from the animation time after unmuting", async () => {
  const h = celebrationHarness({ withAudio: true });
  const calls = (method) => h.audioCalls.filter((call) => call.method === method);
  try {
    await Promise.resolve();
    assert.equal(calls("create").length, 1);
    h.state.sync = { status: "offline", pending: 1 };
    finishLocalBuild(h);
    assert.equal(calls("place").length, 1);
    assert.equal(calls("celebrate").length, 0, "local placement alone does not start celebration audio");
    confirmCompletion(h);
    assert.equal(calls("celebrate").length, 1);
    assert.equal(calls("celebrate")[0].args[0] ?? 0, 0);
    const renders = h.element.renderCount;
    h.notify();
    h.mounted.render();
    assert.equal(calls("celebrate").length, 1, "subscription redraws do not restart audio");

    h.element.fire("click", action({ action: "sound" }));
    assert.deepEqual(calls("setEnabled").at(-1).args, [false]);
    assert.equal(calls("celebrate").length, 1, "muting does not schedule more celebration audio");
    h.clock.advance(1750);
    const unmuteStart = h.audioCalls.length;
    h.element.fire("click", action({ action: "sound" }));
    assert.deepEqual(h.audioCalls.slice(unmuteStart), [
      { method: "setEnabled", args: [true] },
      { method: "unlock", args: [] },
      { method: "celebrate", args: [1.75] },
    ]);
    assert.equal(h.element.renderCount, renders, "sound controls preserve the current animation DOM");
    assert.deepEqual(h.clock.pending(), [4250], "unmuting preserves the original visual end time");

    h.element.fire("click", action({ action: "celebration-skip" }));
    const replayStart = h.audioCalls.length;
    h.element.fire("click", action({ action: "celebration-replay" }));
    const replayCalls = h.audioCalls.slice(replayStart);
    assert.equal(replayCalls[0].method, "unlock", "manual replay unlocks audio from its user gesture");
    assert.equal(replayCalls.filter((call) => call.method === "celebrate").length, 1);
    assert.equal(replayCalls.find((call) => call.method === "celebrate").args[0] ?? 0, 0);
    assert.equal(calls("place").length, 1, "replay does not repeat the placement sound");
  } finally { h.mounted.destroy(); }
  assert.equal(calls("destroy").length, 1);
});

test("missing audio module leaves completion, sound controls, skip, and replay usable", () => {
  const h = celebrationHarness();
  try {
    assert.equal(h.context.KidsBrickAudio, undefined);
    finishLocalBuild(h);
    confirmCompletion(h);
    h.element.fire("click", action({ action: "sound" }));
    h.clock.advance(1000);
    h.element.fire("click", action({ action: "sound" }));
    assert.match(h.element.innerHTML, celebrationMarker);
    h.element.fire("click", action({ action: "celebration-skip" }));
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    h.element.fire("click", action({ action: "celebration-replay" }));
    assert.match(h.element.innerHTML, celebrationMarker);
    h.clock.advance(6000);
    assert.match(h.element.innerHTML, /data-action="display"/);
    assert.equal(h.placements.length, 1);
  } finally { h.mounted.destroy(); }
});

test("the last E500 group has a visible labelled destination before selection", () => {
  const h = celebrationHarness();
  try {
    assert.deepEqual(h.element.guideNodes.map((guide) => [guide.dataset.targetGuide, guide.style.display]), [["p14-3", ""]]);
    assert.match(h.element.innerHTML, /最後一片，放這裡/);
    const hit = h.element.innerHTML.match(/<rect class="brick-target-guide__hit"[^>]+>/)?.[0];
    assert.ok(hit);
    assert.match(hit, /data-action="target" data-part="p14-3"/);
    const value = (attribute) => Number(hit.match(new RegExp(`\\b${attribute}="([^"]+)"`))[1]);
    const { box } = h.context.KidsBrickModels.get("e500").steps[13].parts[2];
    assert.ok(value("x") <= box.x && value("x") + value("width") >= box.x + box.width);
    assert.ok(value("y") <= box.y && value("y") + value("height") >= box.y + box.height);
    assert.ok(value("x") >= 0 && value("x") + value("width") <= 300);
    assert.ok(value("y") >= 0 && value("y") + value("height") <= 180);
    clickFinalGroup(h);
    assert.equal(h.placements[0].partId, "p14-3", "the guide uses the same placement action as the model target");
  } finally { h.mounted.destroy(); }
});

test("selection and dragging reveal only the matching target guide without replacing captured DOM", async () => {
  const h = harness([], { controlledTimers: true, withAudio: true });
  const visible = () => h.element.guideNodes.filter((guide) => guide.style.display !== "none").map((guide) => guide.dataset.targetGuide);
  try {
    await Promise.resolve();
    assert.deepEqual(visible(), []);
    h.element.fire("click", action({ action: "part", part: "p1-1" }));
    assert.deepEqual(visible(), ["p1-1"]);
    assert.doesNotMatch(h.element.innerHTML, /最後一片，放這裡/);
    const guides = h.element.guideNodes, renders = h.element.renderCount, captures = [];
    const source = action({ action: "part", part: "p1-3" }, { setPointerCapture: (id) => captures.push(id) });
    const unlocks = h.audioCalls.filter((call) => call.method === "unlock").length;
    h.element.fire("pointerdown", source, { pointerId: 31, pointerType: "mouse", clientX: 100, clientY: 100 });
    h.element.fire("pointermove", source, { pointerId: 31, pointerType: "mouse", clientX: 120, clientY: 100 });
    assert.deepEqual(visible(), ["p1-3"]);
    assert.deepEqual(captures, [31]);
    assert.ok(h.audioCalls.filter((call) => call.method === "unlock").length > unlocks);
    h.notify();
    assert.equal(h.element.guideNodes, guides, "dragging updates the existing guide styles");
    assert.equal(h.element.renderCount, renders, "subscription updates retain pointer capture during drag");
    h.element.fire("pointercancel", source, { pointerId: 31 });
    await Promise.resolve();
    assert.deepEqual(visible(), []);
    assert.equal(h.placements.length, 0);
    assert.equal(h.audioCalls.filter((call) => call.method === "place").length, 0);
  } finally { h.mounted.destroy(); }
});

test("missing artwork blocks the final placement until retry, then local completion can celebrate", async () => {
  const h = celebrationHarness({ imageArtwork: true });
  try {
    await Promise.resolve();
    assert.equal(h.imageLoads.length, 42);
    clickFinalGroup(h);
    assert.equal(h.placements.length, 0, "unloaded artwork cannot authorize a final placement");
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), []);
    const failed = h.imageLoads.at(-1);
    for (const image of h.imageLoads) image === failed ? image.onerror() : image.onload();
    await Promise.resolve();
    assert.match(h.element.innerHTML, /這包圖片載入失敗/);
    clickFinalGroup(h);
    assert.equal(h.placements.length, 0, "failed artwork cannot authorize a final placement");
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    h.element.fire("click", action({ action: "retry-art" }));
    const retry = h.imageLoads.at(-1);
    assert.notEqual(retry, failed);
    assert.equal(retry.url, failed.url);
    assert.deepEqual(h.clock.pending(), []);
    retry.onload();
    await Promise.resolve();
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), []);
    finishLocalBuild(h);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    confirmCompletion(h);
    assert.match(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), [6000]);
    const renders = h.element.renderCount;
    failed.onload();
    await Promise.resolve();
    assert.equal(h.element.renderCount, renders, "a stale image request cannot restart celebration");
    h.mounted.destroy();
    const destroyedRenders = h.element.renderCount;
    retry.onload();
    await Promise.resolve();
    h.clock.advance(5000);
    assert.equal(h.element.renderCount, destroyedRenders, "late image callbacks cannot revive a destroyed workshop");
  } finally { h.mounted.destroy(); }
});

test("server confirmation during the final snap waits for that placement animation to finish", async () => {
  const h = celebrationHarness({}, completePartIds.slice(0, -1));
  try {
    await Promise.resolve();
    clickFinalGroup(h);
    await Promise.resolve();
    assert.equal(h.state.activeBuild.placed.length, 42);
    assert.match(h.element.innerHTML, /brick-svg-part--just-placed/);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    confirmCompletion(h);
    h.clock.advance(319);
    assert.doesNotMatch(h.element.innerHTML, celebrationMarker);
    h.clock.advance(1);
    assert.match(h.element.innerHTML, celebrationMarker);
    assert.deepEqual(h.clock.pending(), [6000]);
  } finally { h.mounted.destroy(); }
});

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

test("same-pack third group changes artwork when an earlier group is placed later", async () => {
  const h = harness([], { imageArtwork: true, variantArtwork: true });
  assert.equal(h.imageLoads.length, 7, "all same-pack variants preload before assembly");
  for (const image of h.imageLoads) image.onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /data-action="target" data-part="p1-3">[^<]*<image[^>]*p1-3-v0\.png/);
  assert.match(h.element.innerHTML.match(/<button[^>]*data-action="part" data-part="p1-3"[\s\S]*?<\/button>/)?.[0] || "", /p1-3-v0\.png/);

  const source = action({ action: "part", part: "p1-3" });
  h.element.fire("pointerdown", source, { pointerId: 21, pointerType: "mouse", clientX: 100, clientY: 100 });
  h.element.fire("pointermove", source, { pointerId: 21, pointerType: "mouse", clientX: 120, clientY: 100, preventDefault() {} });
  assert.match(h.dragGhosts.at(-1).innerHTML, /p1-3-v0\.png/);
  h.element.fire("pointercancel", source, { pointerId: 21 });
  await Promise.resolve();

  h.element.fire("click", action({ action: "part", part: "p1-3" }));
  h.element.fire("click", action({ action: "target", part: "p1-3" }));
  await Promise.resolve();
  assert.match(h.element.innerHTML, /brick-svg-part--placed[^>]*data-part-id="p1-3">[^<]*<image[^>]*p1-3-v0\.png/);
  h.element.fire("click", action({ action: "part", part: "p1-1" }));
  h.element.fire("click", action({ action: "target", part: "p1-1" }));
  await Promise.resolve();
  assert.match(h.element.innerHTML, /brick-svg-part--placed[^>]*data-part-id="p1-3">[^<]*<image[^>]*p1-3-v1\.png/);
  assert.match(h.element.innerHTML.match(/<button[^>]*data-action="part" data-part="p1-3"[\s\S]*?<\/button>/)?.[0] || "", /p1-3-v1\.png/);
  assert.match(h.context.KidsBrickWorkshop.thumbnail("car", { placed: ["p1-3"] }), /p1-3-v0\.png/);
  assert.match(h.context.KidsBrickWorkshop.thumbnail("car", { placed: ["p1-1", "p1-3"] }), /p1-3-v1\.png/);
  assert.match(h.context.KidsBrickWorkshop.thumbnail("car", { complete: true }), /car-p1-3\.png/);
  h.mounted.destroy();
});

test("a failed same-pack variant can retry before placing the third group", async () => {
  const h = harness(["p1-1"], { imageArtwork: true, variantArtwork: true });
  const failed = h.imageLoads.find((image) => image.url.endsWith("p1-3-v1.png"));
  assert.ok(failed, "the mask-one variant is preloaded");
  for (const image of h.imageLoads) image === failed ? image.onerror() : image.onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /這包圖片載入失敗/);
  assert.deepEqual(h.state.activeBuild.placed, ["p1-1"]);
  h.element.fire("click", action({ action: "retry-art" }));
  const retry = h.imageLoads.filter((image) => image.url === failed.url).at(-1);
  assert.notEqual(retry, failed);
  retry.onload();
  await Promise.resolve();
  assert.match(h.element.innerHTML, /data-action="part" data-part="p1-3"/);
  h.element.fire("click", action({ action: "part", part: "p1-3" }));
  h.element.fire("click", action({ action: "target", part: "p1-3" }));
  await Promise.resolve();
  assert.equal(h.placements.length, 1);
  assert.deepEqual(h.state.activeBuild.placed, ["p1-1", "p1-3"]);
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
