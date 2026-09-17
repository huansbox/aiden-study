import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import "../docs/nativecamp/core.js";
const C = globalThis.NativeCampCore;
const source = (path) => readFileSync(new URL("../docs/nativecamp/" + path, import.meta.url), "utf8");
const lesson = JSON.parse(source("lessons/2026-09-15.json"));
class Root {
  constructor() { this.html = ""; this.events = new Map(); this.nodes = new Map(); this.listenerCounts = new Map(); }
  set innerHTML(html) { this.html = html; this.nodes.clear(); }
  get innerHTML() { return this.html; }
  querySelector(selector) {
    const id = selector.startsWith("#") ? selector.slice(1) : null;
    if (id && !this.html.includes(`id="${id}"`)) return null;
    if (!id && !this.html.includes('data-action="retry-preview"')) return null;
    if (!this.nodes.has(selector)) this.nodes.set(selector, { textContent: "", addEventListener: (name, fn) => this.events.set(`retry:${name}`, fn) });
    return this.nodes.get(selector);
  }
  addEventListener(name, handler) { this.events.set(name, handler); this.listenerCounts.set(name, (this.listenerCounts.get(name) || 0) + 1); }
  removeEventListener(name) { this.events.delete(name); this.listenerCounts.set(name, (this.listenerCounts.get(name) || 0) - 1); }
}
function harness({ child = "bingpu", audioFailure = false, privateFetch, mount = true } = {}) {
  const root = new Root(), media = [], requests = [], revoked = [], objectURLs = [], listeners = new Map();
  let failAudio = audioFailure, readFailures = 0, storageTouches = 0;
  const auth = { ready: Promise.resolve(), state: { status: "connected" }, refresh: async () => auth.state,
    async fetch(path, init) {
      requests.push({ path, method: init?.method || "GET", signal: init?.signal });
      if (privateFetch) return privateFetch(path, init);
      return new Response(new Uint8Array([73, 68, 51, 4, 0, 0]), { headers: { "Content-Type": "audio/mpeg" } });
    },
  };
  const document = { visibilityState: "visible",
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const context = vm.createContext({ NativeCampCore: C, KidsAuth: auth, document, URLSearchParams, AbortController,
    setTimeout: () => 1, clearTimeout() {},
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) });
  context.window = context;
  for (const name of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "nativecampWiring", "NativeCampPlatform"])
    Object.defineProperty(context, name, { get() { storageTouches++; throw Error("Preview must not access " + name); } });
  vm.runInContext(source("question-view.js"), context);
  vm.runInContext(source("preview.js"), context);
  const options = { root, lesson, child, auth,
    createObjectURL: () => { const url = "blob:preview-" + (objectURLs.length + 1); objectURLs.push(url); return url; },
    revokeObjectURL: (url) => revoked.push(url),
    makeAudio: () => {
      const audio = { src: "", paused: false, plays: 0, async play() { this.plays++; if (failAudio) throw Error("media"); },
        pause() { this.paused = true; }, removeAttribute() { this.src = ""; }, load() {} };
      media.push(audio); return audio;
    },
  };
  const preview = context.NativeCampPreview, app = mount ? preview.mount(options) : null;
  return { root, app, preview, auth, media, requests, revoked, objectURLs, context, options,
    get storageTouches() { return storageTouches; }, setAudioFailure(value) { failAudio = value; },
    event(name) { listeners.get(name)?.(); },
    hide() { document.visibilityState = "hidden"; listeners.get("visibilitychange")?.(); },
    async load({ fail = false, search = `?child=${child}` } = {}) {
      return preview.boot({ ...options, search, fetchImpl: async (_path, init) => {
        requests.push({ path: "lesson", method: init.method || "GET" });
        if (fail) { readFailures++; throw Error("offline"); }
        return new Response(JSON.stringify(lesson), { headers: { "Content-Type": "application/json" } });
      } });
    },
  };
}
async function choose(app, mode, concept, index) {
  await app.handle("mode", { mode });
  await app.handle("concept", { concept: concept.id });
  await app.handle("question", { question: concept[mode][index].id });
}
test("all 18 real questions are freely reachable with shared pictures and no learning writes", async () => {
  const h = harness(), reached = new Set();
  for (const mode of ["try", "say"]) for (const concept of lesson.concepts) for (let index = 0; index < concept[mode].length; index++) {
    await choose(h.app, mode, concept, index);
    const q = concept[mode][index]; reached.add(q.id);
    assert.ok(h.root.innerHTML.includes(q.prompt));
    assert.ok(h.root.innerHTML.includes(h.context.NativeCampQuestionView.sceneHtml(q.scene)));
    assert.match(h.root.innerHTML, /Nothing is saved/);
    assert.match(h.root.innerHTML, /All 18 questions/);
    assert.match(h.root.innerHTML, /\.\.\/parent\/\?child=bingpu/);
    await h.app.handle("reveal");
    assert.ok(h.root.innerHTML.includes(q.answerText));
  }
  assert.equal(reached.size, 18);
  assert.equal(h.storageTouches, 0);
  assert.deepEqual(h.requests, []);
  h.app.destroy();
});
test("choice Check and Show answer are memory-only, answer sound stays hidden until revealed", async () => {
  const h = harness(), q = lesson.concepts[0].try[0];
  assert.doesNotMatch(h.root.innerHTML, /data-action="answer-audio"/);
  await h.app.handle("answer-audio");
  assert.equal(h.media.length, 0);
  await h.app.handle("check");
  assert.doesNotMatch(h.root.innerHTML, /EXAMPLE ANSWER/);
  const wrong = q.choices.find((option) => option.id !== q.answer).id;
  h.root.events.get("click")({ target: { closest: () => ({ disabled: false, dataset: { action: "pick", choice: wrong } }) } });
  await h.app.handle("check");
  assert.match(h.root.innerHTML, /Look at the example, then try again/);
  await h.app.handle("pick", { choice: q.answer });
  await h.app.handle("check");
  assert.match(h.root.innerHTML, /That matches/);
  await h.app.handle("answer-audio");
  assert.equal(h.media[0].src, q.audio.answer);
  await h.app.handle("mode", { mode: "say" });
  assert.ok(h.media[0].paused);
  assert.doesNotMatch(h.root.innerHTML, /EXAMPLE ANSWER|data-action="answer-audio"/);
  await h.app.handle("reveal");
  assert.match(h.root.innerHTML, /EXAMPLE ANSWER/);
  assert.doesNotMatch(h.root.innerHTML, /data-rating|First answer saved/);
  assert.equal(h.storageTouches, 0);
  h.app.destroy();
  const reopened = harness();
  assert.doesNotMatch(reopened.root.innerHTML, /EXAMPLE ANSWER|aria-pressed="true"[^>]*>is</);
  reopened.app.destroy();
});
test("word cards can be removed and checked against each accepted ordering", async () => {
  const h = harness();
  for (const concept of lesson.concepts) for (let index = 0; index < concept.try.length; index++) {
    const q = concept.try[index]; if (q.type !== "order") continue;
    for (const order of q.acceptedOrders) {
      await choose(h.app, "try", concept, index);
      await h.app.handle("add-word", { word: order[0] });
      await h.app.handle("remove-word", { word: order[0] });
      assert.doesNotMatch(h.root.innerHTML, /data-action="remove-word"/);
      for (const word of order) await h.app.handle("add-word", { word });
      await h.app.handle("check");
      assert.match(h.root.innerHTML, /That matches/);
    }
  }
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("teacher sound is authorized per play, revoked when stopped, and retried after media failure", async () => {
  const h = harness({ audioFailure: true });
  const concept = lesson.concepts.find((item) => item.say.some((q) => typeof q.audio.question !== "string"));
  const index = concept.say.findIndex((q) => typeof q.audio.question !== "string");
  await choose(h.app, "say", concept, index);
  await h.app.handle("question-audio");
  assert.match(h.root.innerHTML, /Could not play this sound/);
  assert.match(h.root.innerHTML, /data-action="retry-audio"/);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.revoked, ["blob:preview-1"]);
  h.setAudioFailure(false);
  await h.app.handle("retry-audio");
  assert.equal(h.requests.length, 2, "retry obtains a new authorized recording rather than a stale URL");
  assert.equal(h.media[1].src, "blob:preview-2");
  await h.app.handle("question", { question: concept.say[(index + 1) % 3].id });
  assert.ok(h.media[1].paused);
  assert.deepEqual(h.revoked, ["blob:preview-1", "blob:preview-2"]);
  await h.app.handle("question-audio");
  h.event("pagehide");
  assert.ok(h.media.at(-1).paused);
  assert.equal(h.root.querySelector("#preview-audio-message").textContent, "");
  assert.ok(h.requests.every((request) => request.method === "GET" && request.path.startsWith("/v1/nativecamp-audio/")));
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("a late private sound cannot play after another question is selected", async () => {
  let respond;
  const h = harness({ privateFetch: () => new Promise((resolve) => { respond = resolve; }) });
  const concept = lesson.concepts.find((item) => item.say.some((q) => typeof q.audio.question !== "string"));
  const index = concept.say.findIndex((q) => typeof q.audio.question !== "string");
  await choose(h.app, "say", concept, index);
  const pending = h.app.handle("question-audio");
  await h.app.handle("question", { question: concept.say[(index + 1) % 3].id });
  assert.equal(h.requests[0].signal.aborted, true);
  respond(new Response(new Uint8Array([73, 68, 51, 4]), { headers: { "Content-Type": "audio/mpeg" } }));
  await pending;
  assert.equal(h.media.length, 0);
  assert.deepEqual(h.revoked, ["blob:preview-1"]);
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("loading or auth failure is readable and retry recovers without touching progress", async () => {
  const h = harness({ mount: false });
  assert.equal(await h.load({ fail: true }), null);
  assert.match(h.root.innerHTML, /preview could not be loaded/);
  assert.match(h.root.innerHTML, /data-action="retry-preview"/);
  assert.match(h.root.innerHTML, /parent\/\?child=bingpu/);
  assert.ok(await h.load());
  assert.match(h.root.innerHTML, /Preview questions/);
  h.auth.state.status = "required";
  assert.equal(await h.load(), null);
  assert.match(h.root.innerHTML, /Connect your family from the parent page/);
  h.auth.state.status = "connected";
  const app = await h.load();
  assert.ok(app); app.destroy();
  assert.equal(h.storageTouches, 0);
  assert.ok(h.requests.every((request) => request.method === "GET"));
});
test("preview HTML loads no progress, wiring or family activity runtime", () => {
  const scripts = [...source("preview.html").matchAll(/<script src="([^"]+)"/g)].map((match) => match[1].split("?")[0]);
  assert.deepEqual(scripts, ["../shared/device-auth.js", "core.js", "question-view.js", "preview.js"]);
});
test("overlapping preview retries cannot mount two controllers or replace a newer success", async () => {
  for (const staleFails of [false, true]) {
    const h = harness({ mount: false }), pending = [];
    await h.load({ fail: true });
    const options = { ...h.options, search: "?child=bingpu", fetchImpl: () => new Promise((resolve) => pending.push(resolve)) };
    const older = h.preview.boot(options);
    await new Promise((resolve) => setImmediate(resolve));
    const newer = h.preview.boot(options);
    assert.match(h.root.innerHTML, /Loading questions/);
    assert.doesNotMatch(h.root.innerHTML, /data-action="retry-preview"/);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(pending.length, 2);
    pending[1](new Response(JSON.stringify(lesson), { headers: { "Content-Type": "application/json" } }));
    const currentApp = await newer;
    assert.ok(currentApp);
    pending[0](staleFails ? new Response("unavailable", { status: 503 }) : new Response(JSON.stringify(lesson), { headers: { "Content-Type": "application/json" } }));
    assert.equal(await older, null);
    assert.match(h.root.innerHTML, /Preview questions/);
    assert.doesNotMatch(h.root.innerHTML, /preview could not be loaded/);
    assert.equal(h.root.listenerCounts.get("click"), 1, "only the latest controller owns the page click listener");
    h.root.events.get("click")({ target: { closest: () => ({ disabled: false, dataset: { action: "question-audio" } }) } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.media.length, 1, "a single Listen starts one recording");
    currentApp.destroy();
  }
});
