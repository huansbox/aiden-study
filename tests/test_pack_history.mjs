import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import "../docs/shared/collection-core.js";
const C = globalThis.KidsCollectionCore;
const source = (path) => readFileSync(new URL("../docs/" + path, import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));

// Execute the real home renderer and navigation with only the DOM/services substituted.
async function home(state, models = ["e500", "r200"]) {
  const handlers = new Map();
  let subscriber, mounts = 0;
  const element = (dataset, selector) => ({ dataset, addEventListener: (_, fn) => handlers.set(selector, fn) });
  const root = {
    innerHTML: "",
    querySelector(selector) {
      if (selector === "[data-pack-history]" && this.innerHTML.includes("data-pack-history")) return element({}, selector);
      if (selector === "#collection-workshop" && this.innerHTML.includes('id="collection-workshop"')) return {};
      return null;
    },
    querySelectorAll(selector) {
      const attribute = selector.startsWith("[data-results-tab]") ? "data-results-tab" : "data-view";
      return [...this.innerHTML.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map((m) =>
        element({ [attribute === "data-view" ? "view" : "resultsTab"]: m[1] }, `${attribute}:${m[1]}`));
    },
  };
  const context = vm.createContext({
    URL, URLSearchParams, location: { search: "?child=aiden", hash: "" },
    document: { getElementById: () => root, querySelector: () => ({}), addEventListener() {}, visibilityState: "visible" },
    addEventListener() {}, setInterval() {}, scrollTo() {}, restoreForwardTarget: () => null,
    fetch: async () => ({ ok: true, json: async () => JSON.parse(source("registry.json")) }),
    KidsSyncV1: { bootIdentity: () => ({ child: "aiden" }) },
    KidsCollectionCore: C,
    KidsCollection: { create: () => ({ snapshot: () => state, subscribe: (fn) => { subscriber = fn; }, refresh: async () => {}, flush: async () => {} }) },
    KidsBrickModels: { models: models.map((id) => ({ id })), get: (id) => id ? { title: `模型 ${id}` } : null },
    KidsBrickWorkshop: { mount: () => { mounts++; return { destroy() {} }; } },
  });
  context.window = context;
  vm.runInContext(source("shared/family-core.js"), context);
  const config = { available: true, data: context.KidsFamilyCore.defaults() };
  context.KidsFamily = {
    core: context.KidsFamilyCore, cachedSettings: () => config, settings: async () => config,
    activity: async () => {}, summary: () => ({ today: { answered: 0, seconds: 0 }, total: { answered: 0 }, tasks: {}, done: {} }),
    avatar: () => "avatar.png", base: new URL("https://kids.test/"), entryHref: () => "https://kids.test/study/",
  };
  vm.runInContext(source("shared/home.js"), context);
  await settle();
  return { root, click: (selector) => { assert.ok(handlers.has(selector), selector); handlers.get(selector)(); }, update: () => subscriber(), mounts: () => mounts };
}

function fixture() {
  const yesterday = new Date("2026-10-11T10:00:00Z");
  const entries = ["study:math", "study:science", "study:social"];
  let state = C.apply(C.empty(), { type: "goals", expectedGoalRevision: 0, targets: entries.map((entryId) => ({ entryId, metric: "answered", quantity: 1 })) }, yesterday);
  for (const entryId of entries) state = C.apply(state, { type: "record", event: { entryId, answered: true, occurredAt: yesterday.toISOString() } }, yesterday);
  state = C.apply(state, { type: "select-model", modelId: "r200" }, yesterday);
  for (const [packIndex, parts] of [[0, [1, 2, 3]], [1, [3]]]) for (const n of parts) {
    state = C.apply(state, { type: "place", buildId: "r200", grantId: state.grants[packIndex].id, packIndex, partId: `p${packIndex + 1}-${n}` }, yesterday);
  }
  return { ...C.snapshot(state, "2026-10-12"), sync: { status: "ready", pending: 0 } };
}

test("隔天今日歸零仍看見兩包待拼，紀錄保留昨天三包及各包實際零件位置", async () => {
  const state = fixture(), before = structuredClone(state), h = await home(state);
  assert.match(h.root.innerHTML, /今日拼裝包 0 \/ 3/);
  assert.match(h.root.innerHTML, /還有 2 包可以拼/);
  h.click("[data-pack-history]");
  assert.match(h.root.innerHTML, /2026\/10\/11<\/time> · 已獲得 3 包/);
  assert.match(h.root.innerHTML, /還有 2 包未拼完 · 1 包已拼好/);
  assert.match(h.root.innerHTML, /第 1 包 · 已拼好/);
  assert.match(h.root.innerHTML, /第 2 包 · 拼裝中（1 \/ 3 組）/);
  assert.match(h.root.innerHTML, /第 3 包 · 待拼（0 \/ 3 組）/);
  h.click("data-view:home");
  h.click("data-view:results");
  assert.equal(h.mounts(), 1, "首頁待拼按鈕直接開工作台，不留在上次的紀錄頁");
  assert.deepEqual(state, before, "看紀錄與開工作台不改發包、分配或零件");
});

test("已完成車款仍有未拆包時保留入口；紀錄依日期區分且背景更新已拼狀態", async () => {
  const state = fixture();
  state.grants.push(...Array.from({ length: 9 }, (_, i) => ({ id: `older:${i}`, date: "2026-10-10", buildId: "r200", packIndex: i + 3 })));
  state.builds[0].placed = state.grants.flatMap((g) => [1, 2, 3].map((n) => `p${g.packIndex + 1}-${n}`));
  state.builds[0].completedAt = "2026-10-11T12:00:00Z";
  state.activeBuild = state.builds[0];
  state.grants.push({ id: "2026-10-12:goal:1", date: "2026-10-12", buildId: null, packIndex: null });
  const h = await home(state);
  assert.match(h.root.innerHTML, /還有 1 包可以拼/);
  h.click("[data-pack-history]");
  assert.match(h.root.innerHTML, /未拆開 · 保留在零件盒/);
  assert.ok(h.root.innerHTML.indexOf("2026/10/12") < h.root.innerHTML.indexOf("2026/10/11"));
  assert.match(h.root.innerHTML, /還有 0 包未拼完 · 3 包已拼好/);
  state.sync.status = "offline";
  h.update();
  assert.match(h.root.innerHTML, /這台裝置已保存的紀錄/);
  assert.match(h.root.innerHTML, /已獲得 3 包/);
  const allCollected = await home(state, ["r200"]);
  assert.doesNotMatch(allCollected.root.innerHTML, /包可以拼/);
  assert.match(allCollected.root.innerHTML, /零件盒保留 1 包，等新作品再拼/);
});

test("沒有發包資料時不出現可拼按鈕或虛構領取紀錄", async () => {
  const h = await home({ ...C.snapshot(C.empty()), sync: { status: "ready" } });
  assert.doesNotMatch(h.root.innerHTML, /包可以拼/);
  h.click("[data-pack-history]");
  assert.match(h.root.innerHTML, /目前還沒有發包紀錄/);
});
