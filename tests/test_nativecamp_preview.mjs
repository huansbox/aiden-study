import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import "../docs/nativecamp/core.js";
import { weeklyFixture } from "./helpers/nativecamp-weekly.mjs";
const sound = (ref) => typeof ref === "string" && ref.startsWith("audio/") ? ref + "?v=20260918-openai" : ref;
const C = globalThis.NativeCampCore;
const source = (path) => readFileSync(new URL("../docs/nativecamp/" + path, import.meta.url), "utf8");
const lesson = JSON.parse(source("lessons/2026-09-15.json"));
const catalog = { schemaVersion: 1, lessons: [{ id: lesson.id, date: lesson.date, teacher: "Silvana" }] };
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
function harness({ child = "bingpu", audioFailure = false, privateFetch, mount = true, previewLesson = lesson, previewCatalog = [], search = "", practiceDate = "2026-09-18" } = {}) {
  const root = new Root(), media = [], played = [], commands = [], requests = [], revoked = [], objectURLs = [], listeners = new Map();
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
  vm.runInContext(source("catalog.js"), context);
  for (const name of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "nativecampWiring", "NativeCampPlatform"])
    Object.defineProperty(context, name, { get() { storageTouches++; throw Error("Preview must not access " + name); } });
  vm.runInContext(source("question-view.js"), context);
  vm.runInContext(source("audio.js"), context);
  const createAudio = context.NativeCampAudio.create;
  context.NativeCampAudio.create = (options) => {
    const controller = createAudio(options);
    return { ...controller,
      play(resource, options) { commands.push({ resource, effect: options?.effect }); return controller.play(resource, options); },
      unlock() { commands.push({ unlock: true }); controller.unlock(); },
    };
  };
  vm.runInContext(source("preview.js"), context);
  const options = { root, lesson: previewLesson, child, auth, catalog: previewCatalog, search, date: () => practiceDate,
    createObjectURL: () => { const url = "blob:preview-" + (objectURLs.length + 1); objectURLs.push(url); return url; },
    revokeObjectURL: (url) => revoked.push(url),
    makeAudio: () => {
      const audio = { src: "", paused: true, plays: 0, async play() { this.plays++; this.paused = false; played.push(this.src); if (failAudio) throw Error("media"); },
        pause() { this.paused = true; }, removeAttribute() { this.src = ""; }, load() {} };
      media.push(audio); return audio;
    },
  };
  const preview = context.NativeCampPreview, app = mount ? preview.mount(options) : null;
  return { root, app, preview, auth, media, played, commands, requests, revoked, objectURLs, context, options,
    get storageTouches() { return storageTouches; }, setAudioFailure(value) { failAudio = value; },
    event(name) { listeners.get(name)?.(); },
    hide() { document.visibilityState = "hidden"; listeners.get("visibilitychange")?.(); },
    show() { document.visibilityState = "visible"; listeners.get("visibilitychange")?.(); },
    async load({ fail = false, search = `?child=${child}` } = {}) {
      return preview.boot({ ...options, search, fetchImpl: async (path, init) => {
        requests.push({ path: "lesson", method: init.method || "GET" });
        if (fail) { readFailures++; throw Error("offline"); }
        return new Response(JSON.stringify(path.endsWith("catalog.json") ? catalog : lesson), { headers: { "Content-Type": "application/json" } });
      } });
    },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("Preview calendar shows the linked month, pages across years and keeps answer state without learning access", async () => {
  const h = harness({ previewCatalog: catalog.lessons, search: "?child=bingpu&lesson=2026-09-15", practiceDate: "2027-01-02" });
  assert.match(h.root.innerHTML, />September 2026<\/h2>/);
  assert.match(h.root.innerHTML, /preview.html\?child=bingpu&amp;lesson=2026-09-15" aria-current="page"/);
  await h.app.handle("pick", { choice: "is" });
  for (let count = 0; count < 4; count++) await h.app.handle("calendar-month", { direction: "1" });
  assert.match(h.root.innerHTML, />January 2027<\/h2>/);
  assert.match(h.root.innerHTML, /data-choice="is" aria-pressed="true"/);
  await h.app.handle("calendar-month", { direction: "-1" });
  assert.match(h.root.innerHTML, />December 2026<\/h2>/);
  assert.equal(h.storageTouches, 0);
  h.app.destroy();
  const current = harness({ previewCatalog: catalog.lessons, practiceDate: "2027-01-02" });
  assert.match(current.root.innerHTML, />January 2027<\/h2>/);
  current.app.destroy();
});

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
  assert.ok(h.requests.every((request) => request.method === "GET" && request.path.startsWith("/v1/nativecamp-audio/")));
  h.app.destroy();
});

test("parent Preview exposes the whole weekly pool and subset answers without freezing or storing child practice", async () => {
  const weekly = weeklyFixture(), q = weekly.concepts[0].try[0];
  Object.assign(q, { type: "order", tokens: [{ id: "there", text: "There" }, { id: "is", text: "is" }, { id: "cat", text: "a cat." }, { id: "are", text: "are" }], acceptedOrders: [["there", "is", "cat"]] });
  const h = harness({ previewLesson: weekly });
  assert.match(h.root.innerHTML, /All 30 questions/);
  for (const word of ["there", "is", "cat"]) await h.app.handle("add-word", { word });
  await h.app.handle("check"); assert.match(h.root.innerHTML, /That matches/);
  for (const mode of ["try", "say"]) {
    await h.app.handle("mode", { mode });
    for (const concept of weekly.concepts) {
      await h.app.handle("concept", { concept: concept.id });
      for (const question of concept[mode]) {
        await h.app.handle("question", { question: question.id });
        assert.ok(h.root.innerHTML.includes(question.prompt));
      }
    }
  }
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("choice Check and Show answer are memory-only, answer sound stays hidden until revealed", async () => {
  const h = harness(), q = lesson.concepts[0].try[0];
  await settle();
  assert.deepEqual(h.played, [sound(q.audio.question)], "the first question starts automatically");
  assert.doesNotMatch(h.root.innerHTML, /data-action="answer-audio"/);
  await h.app.handle("answer-audio");
  assert.deepEqual(h.played, [sound(q.audio.question)]);
  await h.app.handle("check");
  assert.doesNotMatch(h.root.innerHTML, /EXAMPLE ANSWER/);
  const wrong = q.choices.find((option) => option.id !== q.answer).id;
  h.root.events.get("click")({ target: { closest: () => ({ disabled: false, dataset: { action: "pick", choice: wrong } }) } });
  assert.ok(h.commands.some((command) => command.unlock), "click unlocks sound before async work");
  assert.deepEqual(h.played, [sound(q.audio.question)], "selecting an answer does not replay the question");
  await h.app.handle("check");
  assert.match(h.root.innerHTML, /Look at the example, then try again/);
  assert.equal(h.played.at(-1), sound(q.audio.answer));
  assert.deepEqual(h.commands.at(-1), { resource: q.audio.answer, effect: "neutral" });
  await h.app.handle("pick", { choice: q.answer });
  assert.equal(h.played.length, 2, "voluntary correction does not restart the question");
  await h.app.handle("check");
  assert.match(h.root.innerHTML, /That matches/);
  assert.deepEqual(h.commands.at(-1), { resource: q.audio.answer, effect: "correct" });
  await h.app.handle("answer-audio");
  assert.equal(h.played.at(-1), sound(q.audio.answer));
  assert.equal(h.commands.at(-1).effect, undefined, "manual replay does not repeat the reward");
  await h.app.handle("mode", { mode: "say" });
  await settle();
  assert.equal(h.played.at(-1), sound(lesson.concepts[0].say[0].audio.question));
  assert.doesNotMatch(h.root.innerHTML, /EXAMPLE ANSWER|data-action="answer-audio"/);
  await h.app.handle("reveal");
  assert.match(h.root.innerHTML, /EXAMPLE ANSWER/);
  assert.equal(h.played.at(-1), sound(lesson.concepts[0].say[0].audio.answer));
  assert.equal(h.commands.at(-1).effect, undefined, "revealing an oral example is not a correct rating");
  assert.doesNotMatch(h.root.innerHTML, /data-rating|First answer saved/);
  assert.equal(h.storageTouches, 0);
  h.app.destroy();
  const reopened = harness();
  assert.doesNotMatch(reopened.root.innerHTML, /EXAMPLE ANSWER|aria-pressed="true"[^>]*>is</);
  reopened.app.destroy();
});
test("each mode, concept and question entry plays once, while blocked autoplay remains recoverable", async () => {
  const h = harness({ audioFailure: true });
  await settle();
  assert.match(h.root.innerHTML, /Could not play this sound/);
  assert.match(h.root.innerHTML, /data-action="pick"/);
  assert.match(h.root.innerHTML, /data-action="reveal"/);
  h.setAudioFailure(false);
  await h.app.handle("retry-audio");
  assert.equal(h.played.at(-1), sound(lesson.concepts[0].try[0].audio.question));
  assert.doesNotMatch(h.root.innerHTML, /data-action="retry-audio"/);
  const concept = lesson.concepts[1];
  for (const [action, data, resource] of [
    ["mode", { mode: "say" }, lesson.concepts[0].say[0].audio.question],
    ["concept", { concept: concept.id }, concept.say[0].audio.question],
    ["question", { question: concept.say[1].id }, concept.say[1].audio.question],
  ]) {
    const count = h.played.length;
    await h.app.handle(action, data); await settle();
    assert.equal(h.played.length, count + 1);
    assert.equal(h.played.at(-1), sound(resource));
    assert.doesNotMatch(h.root.innerHTML, /EXAMPLE ANSWER/);
  }
  h.hide();
  assert.ok(h.media[0].paused);
  assert.equal(h.media[0].src, "");
  assert.equal(h.root.querySelector("#preview-audio-message").textContent, "");
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("mounting in a hidden page or finishing a slow boot after hiding stays silent until Listen", async () => {
  for (const delayedBoot of [false, true]) {
    const h = harness({ mount: false }); let app;
    if (delayedBoot) {
      let respond;
      const pending = h.preview.boot({ ...h.options, search: "?child=bingpu",
        fetchImpl: (path) => path.endsWith("catalog.json") ? Promise.resolve(new Response(JSON.stringify(catalog))) : new Promise((resolve) => { respond = resolve; }) });
      await settle();
      h.hide();
      respond(new Response(JSON.stringify(lesson), { headers: { "Content-Type": "application/json" } }));
      app = await pending;
    } else {
      h.hide();
      app = h.preview.mount(h.options);
    }
    await settle();
    assert.ok(app);
    assert.match(h.root.innerHTML, /data-action="question-audio"/);
    assert.equal(h.played.length, 0, "hidden mount never starts its initial prompt");
    assert.equal(h.commands.length, 0, "hidden autoplay never queues an effect or resource request");
    h.show(); await settle();
    assert.equal(h.played.length, 0, "becoming visible does not automatically replay the question");
    await app.handle("question-audio");
    assert.deepEqual(h.played, [sound(lesson.concepts[0].try[0].audio.question)]);
    assert.equal(h.storageTouches, 0); app.destroy();
  }
});
test("word cards can be removed and checked against each accepted ordering", async () => {
  const h = harness();
  for (const concept of lesson.concepts) for (let index = 0; index < concept.try.length; index++) {
    const q = concept.try[index]; if (q.type !== "order") continue;
    for (const order of q.acceptedOrders) {
      await choose(h.app, "try", concept, index);
      await settle(); const count = h.played.length;
      await h.app.handle("add-word", { word: order[0] });
      await h.app.handle("remove-word", { word: order[0] });
      assert.doesNotMatch(h.root.innerHTML, /data-action="remove-word"/);
      for (const word of order) await h.app.handle("add-word", { word });
      assert.equal(h.played.length, count, "adding or removing word cards never repeats the prompt");
      await h.app.handle("check");
      assert.match(h.root.innerHTML, /That matches/);
      assert.equal(h.played.at(-1), sound(q.audio.answer));
    }
  }
  assert.equal(h.storageTouches, 0); h.app.destroy();
});
test("teacher sound is authorized per play, revoked when stopped, and retried after media failure", async () => {
  const h = harness({ audioFailure: true });
  const concept = lesson.concepts.find((item) => item.say.some((q) => typeof q.audio.question !== "string"));
  const index = concept.say.findIndex((q) => typeof q.audio.question !== "string");
  await choose(h.app, "say", concept, index);
  await settle();
  assert.match(h.root.innerHTML, /Could not play this sound/);
  assert.match(h.root.innerHTML, /data-action="retry-audio"/);
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.revoked, ["blob:preview-1"]);
  h.setAudioFailure(false);
  await h.app.handle("retry-audio");
  assert.equal(h.requests.length, 2, "retry obtains a new authorized recording rather than a stale URL");
  assert.equal(h.played.at(-1), "blob:preview-2");
  await h.app.handle("question", { question: concept.say[(index + 1) % 3].id });
  await settle();
  assert.equal(h.played.at(-1), sound(concept.say[(index + 1) % 3].audio.question));
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
  await settle();
  assert.equal(h.requests.length, 1);
  await h.app.handle("question", { question: concept.say[(index + 1) % 3].id });
  await settle();
  assert.equal(h.requests[0].signal.aborted, true);
  respond(new Response(new Uint8Array([73, 68, 51, 4]), { headers: { "Content-Type": "audio/mpeg" } }));
  await settle();
  assert.ok(h.played.every((url) => !url.startsWith("blob:")));
  assert.equal(h.played.at(-1), sound(concept.say[(index + 1) % 3].audio.question));
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
  assert.deepEqual(scripts, ["../shared/device-auth.js", "core.js", "catalog.js", "question-view.js", "audio.js", "preview.js"]);
});

test("preview loads the requested lesson and keeps both child and lesson in its return and selection links", async () => {
  const h = harness({ mount: false });
  const selected = { ...structuredClone(lesson), id: "2026-09-14", date: "2026-09-14", title: "Older lesson" };
  const list = { schemaVersion: 1, lessons: [...catalog.lessons, { id: selected.id, date: selected.date, teacher: "Edon" }] };
  const app = await h.preview.boot({ ...h.options, search: "?child=bingpu&lesson=2026-09-14", fetchImpl: async (path) => new Response(JSON.stringify(path.endsWith("catalog.json") ? list : selected)) });
  assert.ok(app);
  assert.match(h.root.innerHTML, /Older lesson/);
  assert.match(h.root.innerHTML, /\.\.\/parent\/\?child=bingpu&amp;lesson=2026-09-14/);
  assert.match(h.root.innerHTML, /preview.html\?child=bingpu&amp;lesson=2026-09-14" aria-current="page"/);
  assert.equal(h.storageTouches, 0);
  app.destroy();
});
test("overlapping preview retries cannot mount two controllers or replace a newer success", async () => {
  for (const staleFails of [false, true]) {
    const h = harness({ mount: false }), pending = [];
    await h.load({ fail: true });
    const options = { ...h.options, search: "?child=bingpu", fetchImpl: (path) => path.endsWith("catalog.json") ? Promise.resolve(new Response(JSON.stringify(catalog))) : new Promise((resolve) => pending.push(resolve)) };
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
    await settle();
    assert.equal(h.played.length, 1, "only the current mount automatically plays its question");
    h.root.events.get("click")({ target: { closest: () => ({ disabled: false, dataset: { action: "question-audio" } }) } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.media.length, 1, "a single controller reuses one voice player");
    assert.equal(h.played.length, 2, "Listen adds exactly one replay after the initial automatic question");
    currentApp.destroy();
  }
});
