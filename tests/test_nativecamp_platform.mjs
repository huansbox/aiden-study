import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import "../docs/shared/family-core.js";
import "../docs/nativecamp/core.js";
const F = globalThis.KidsFamilyCore, C = globalThis.NativeCampCore;
const origin = "https://kids.linshuhuan.com", date = "2026-09-17";
const lesson = { id: "2026-09-15", date: "2026-09-15", title: "Counting", concepts:
  ["is-are", "odd-even", "too-many"].map((id) => ({ id, title: id, ...Object.fromEntries(
    ["try", "say"].map((mode) => [mode, Array.from({ length: 3 }, (_, index) => ({
      id: `${id}-${mode}-${index + 1}`, type: "choice", prompt: "Choose one.",
      choices: [{ id: "yes", text: "Yes" }, { id: "no", text: "No" }], answer: "yes",
    }))]),
  ) })) };
const request = (env, path, cookie, init = {}) => worker.fetch(new Request(origin + "/api/v1/" + path, {
  ...init, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...init.headers },
}), env);
async function login(env) {
  const response = await request(env, "session", null, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: env.TOKEN }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
function environment() {
  const settings = F.defaults();
  for (const profile of Object.values(settings.children)) profile.apps.push("nativecamp");
  return { TOKEN: "isolated-nativecamp", KV: kvStub({ "c:family:settings": {
    value: JSON.stringify({ rev: 1, data: settings }),
  } }) };
}
async function browser(env, { child = "aiden", storage = new Map(), offline = false } = {}) {
  const cookie = await login(env), listeners = new Map(), calls = [], shown = [], pendingRequests = new Set();
  const localStorage = {
    get length() { return storage.size; }, key: (i) => [...storage.keys()][i],
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key),
  };
  const element = () => ({ children: [], removed: false,
    append(...children) { this.children.push(...children); }, appendChild(child) { shown.push(child); },
    remove() { this.removed = true; }, setAttribute() {},
    addEventListener() {}, classList: { add() {} } });
  const document = { currentScript: { src: origin + "/shared/family-client.js" }, visibilityState: "visible",
    getElementById: () => null, createElement: element, body: element(), addEventListener() {} };
  const auth = { endpoint: origin + "/api", state: { status: "connected" }, ready: Promise.resolve(),
    canAttempt: () => auth.state.status !== "required",
    refresh: async () => { auth.state.status = offline ? "offline" : "connected"; return auth.state; },
    fetch: async (target, init = {}) => {
      if (offline) throw Error("offline");
      const url = String(target).startsWith("/v1/") ? auth.endpoint + target : String(target);
      calls.push({ url, method: init.method || "GET" });
      const pending = worker.fetch(new Request(url, { ...init, headers: { Origin: origin, Cookie: cookie, ...init.headers } }), env);
      pendingRequests.add(pending);
      try { return await pending; } finally { pendingRequests.delete(pending); }
    },
  };
  const context = vm.createContext({ document, location: { search: `?child=${child}`, reload() {} },
    localStorage, KidsAuth: auth, URL, URLSearchParams, AbortController, Blob, Intl, Date,
    crypto, performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    CustomEvent: class { constructor(type) { this.type = type; } }, navigator: {},
    addEventListener: (name, fn) => { const list = listeners.get(name) || []; list.push(fn); listeners.set(name, list); },
    dispatchEvent: (event) => { for (const fn of listeners.get(event.type) || []) fn(event); },
  });
  context.window = context;
  for (const path of ["shared/sync-v1.js", "shared/wiring-v1.js", "shared/family-core.js", "shared/family-client.js", "nativecamp/core.js"])
    vm.runInContext(readFileSync(new URL("../docs/" + path, import.meta.url), "utf8"), context);
  context.nativecampWiring = context.KidsWiringV1.createWiring({ appId: "nativecamp", schemaVersion: 1, legacyChild: "aiden", legacyKey: null });
  vm.runInContext(readFileSync(new URL("../docs/nativecamp/platform.js", import.meta.url), "utf8"), context);
  const notices = [], bridge = await context.NativeCampPlatform.boot(lesson, (event) => notices.push(event.type));
  return { bridge, storage, cookie, calls, notices, context,
    async settleRequests() {
      await new Promise((resolve) => setImmediate(resolve));
      while (pendingRequests.size) {
        await Promise.all([...pendingRequests]);
        await new Promise((resolve) => setImmediate(resolve));
      }
    },
    rewards: () => shown.filter((node) => node.id === "family-reward" && !node.removed),
    setOffline(value) { offline = value; }, event(name) { context.dispatchEvent({ type: name }); } };
}
function firstRounds(bridge) {
  for (const mode of ["try", "say"]) for (const concept of lesson.concepts) for (let i = 0; i < 2; i++) {
    let progress = bridge.getProgress();
    const next = C.nextQuestion(progress, lesson, mode, date, concept.id);
    if (mode === "say") progress = C.markPending(progress, lesson, mode, date, concept.id, next.question.id, "reveal");
    const result = mode === "try" ? C.submitTry(progress, lesson, date, concept.id, next.question.id, "yes") :
      C.submitSay(progress, lesson, date, concept.id, next.question.id, "gotIt");
    bridge.saveProgress(result.progress, { answered: mode === "try", correct: true });
  }
}
test("new app supports parent visibility and activity without adding scheduled assignments", async () => {
  const env = environment(), cookie = await login(env);
  const reg = JSON.parse(readFileSync(new URL("../docs/registry.json", import.meta.url)));
  const settings = (await (await request(env, "settings", cookie)).json()).data;
  assert.ok(F.homeEntries(settings, "aiden", reg).some((entry) => entry.id === "nativecamp"));
  assert.throws(() => F.validateTask({ id: "new", app: "nativecamp", quantity: 3 }));
  settings.children.aiden.apps = settings.children.aiden.apps.filter((id) => id !== "nativecamp");
  assert.ok(!F.homeEntries(settings, "aiden", reg).some((entry) => entry.id === "nativecamp"));
});
test("independent device storage and cookies restore first results, both Done flags and deferred date", async () => {
  const env = environment(), a = await browser(env);
  firstRounds(a.bridge);
  const final = a.bridge.getProgress();
  a.bridge.saveProgress(final, { answered: true, correct: true }); // identical save is not another answer
  await a.bridge.syncNow();
  const b = await browser(env);
  assert.notEqual(a.cookie, b.cookie);
  assert.notEqual(a.storage, b.storage);
  assert.deepEqual(JSON.parse(JSON.stringify(b.bridge.getProgress())), JSON.parse(JSON.stringify(final)));
  const summary = C.summarizeLesson(b.bridge.getProgress(), lesson, date);
  assert.ok(summary.try.done && summary.say.done);
  assert.equal(summary.try.concepts[0].attempted, 2);
  assert.equal(summary.try.concepts[0].dueOn, "2026-09-18");
  const streams = (await (await request(env, "activity/aiden", a.cookie)).json()).streams;
  const total = F.summarize(streams).total;
  assert.equal(total.completed, 12);
  assert.equal(total.answered, 6);
  assert.equal(total.correct, 6);
  assert.equal(total.seconds, 0, "opening the menu does not start practice time");
  const sibling = await browser(env, { child: "bingpu" });
  assert.deepEqual(JSON.parse(JSON.stringify(sibling.bridge.getProgress())), C.createProgress());
  assert.equal(sibling.storage.has("nativecamp:progress:aiden"), false);
  assert.equal(await env.KV.get("p:aiden:study"), null);
});
test("offline edits survive reload and upload on reconnect; other child remains unchanged", async () => {
  const env = environment(), a = await browser(env);
  a.setOffline(true);
  firstRounds(a.bridge);
  await a.bridge.syncNow();
  assert.match(a.bridge.status(), /Offline/);
  const reloaded = await browser(env, { storage: a.storage, offline: true });
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.bridge.getProgress())), JSON.parse(JSON.stringify(a.bridge.getProgress())));
  reloaded.setOffline(false);
  reloaded.event("online");
  await new Promise((resolve) => setImmediate(resolve));
  await reloaded.bridge.syncNow();
  const b = await browser(env);
  assert.ok(C.summarizeLesson(b.bridge.getProgress(), lesson, date).try.done);
  assert.equal(await env.KV.get("p:bingpu:nativecamp"), null);
});

test("adding another lesson and reviewing the original preserve both lessons across independent devices", async () => {
  const env = environment(), first = await browser(env);
  firstRounds(first.bridge);
  const originalState = JSON.parse(JSON.stringify(first.bridge.getProgress().lessons[lesson.id]));
  const newer = { ...structuredClone(lesson), id: "2026-09-16", date: "2026-09-16" };
  const added = C.submitTry(first.bridge.getProgress(), newer, date, "is-are", "is-are-try-1", "no");
  first.bridge.saveProgress(added.progress, { answered: true, correct: false });
  await first.bridge.syncNow();
  const second = await browser(env), restored = second.bridge.getProgress();
  assert.deepEqual(JSON.parse(JSON.stringify(restored.lessons[lesson.id])), originalState);
  assert.equal(restored.lessons[newer.id].try["is-are"].initial[0].outcome, "incorrect");
  const due = C.nextQuestion(restored, lesson, "try", "2026-09-18", "is-are");
  assert.equal(due.phase, "deferred");
  const reviewed = C.submitTry(restored, lesson, "2026-09-18", "is-are", due.question.id, "yes");
  second.bridge.saveProgress(reviewed.progress, { answered: true, correct: true });
  await second.bridge.syncNow(); await first.bridge.syncNow();
  const final = first.bridge.getProgress();
  assert.equal(final.lessons[lesson.id].try["is-are"].initial.length, 3);
  assert.equal(final.lessons[lesson.id].try["is-are"].dueOn, null);
  assert.deepEqual(JSON.parse(JSON.stringify(final.lessons[newer.id])), JSON.parse(JSON.stringify(restored.lessons[newer.id])));
  assert.equal(await env.KV.get("p:bingpu:nativecamp"), null);
});
test("Native Camp records activity immediately and exposes rewards only through finishRound", async () => {
  const a = await browser(environment());
  a.bridge.setActive(true);
  for (const practiceDate of [date, "2026-09-18"]) {
    let next;
    while ((next = C.nextQuestion(a.bridge.getProgress(), lesson, "try", practiceDate))) {
      const result = C.submitTry(a.bridge.getProgress(), lesson, practiceDate, next.concept.id, next.question.id, "no");
      a.bridge.saveProgress(result.progress, { answered: true, correct: false });
    }
  }
  assert.equal(a.context.KidsFamily.summary("aiden").total.answered, 12);
  assert.equal(a.rewards().length, 0);
  a.bridge.setActive(false);
  assert.equal(a.rewards().length, 0, "Pausing does not publish pending badges.");
  a.bridge.finishRound();
  assert.equal(a.rewards().length, 1);
  const label = a.rewards()[0].children.find((node) => node.textContent)?.textContent;
  assert.match(label, /New badge/);
  assert.doesNotMatch(label, /[\u3400-\u9FFF]/);
  a.bridge.finishRound();
  assert.equal(a.rewards().length, 1);
  a.bridge.setActive(true);
  assert.equal(a.rewards().length, 0, "Beginning another round clears the previous reward.");
});

test("returning to a cached lesson page preserves another lesson saved in shared device storage", async () => {
  const env = environment(), storage = new Map();
  const first = await browser(env, { storage }), second = await browser(env, { storage });
  const newer = { ...structuredClone(lesson), id: "2026-09-16", date: "2026-09-16" };
  const added = C.submitTry(second.bridge.getProgress(), newer, date, "is-are", "is-are-try-1", "no");
  second.bridge.saveProgress(added.progress, { answered: true, correct: false });
  await second.bridge.syncNow();
  first.context.dispatchEvent({ type: "pageshow", persisted: true });
  await first.settleRequests();
  await first.bridge.syncNow();
  assert.ok(first.bridge.getProgress().lessons[newer.id]);
  const resumed = C.submitTry(first.bridge.getProgress(), lesson, date, "is-are", "is-are-try-1", "yes");
  assert.equal(resumed.recorded, true);
  first.bridge.saveProgress(resumed.progress, { answered: true, correct: true });
  assert.deepEqual(Object.keys(JSON.parse(storage.get("nativecamp:progress:aiden")).lessons).sort(), [lesson.id, newer.id], "local save contains both lessons");
  await first.bridge.syncNow();
  const remote = JSON.parse(await env.KV.get("p:aiden:nativecamp")).data;
  assert.deepEqual(Object.keys(remote.lessons).sort(), [lesson.id, newer.id]);
  assert.deepEqual(remote.lessons[newer.id], JSON.parse(JSON.stringify(added.progress.lessons[newer.id])));
});

test("a stale page cannot save over a lesson changed after its last progress read", async () => {
  const env = environment(), storage = new Map();
  const first = await browser(env, { storage }), second = await browser(env, { storage });
  const stale = C.submitTry(first.bridge.getProgress(), lesson, date, "is-are", "is-are-try-1", "yes");
  const newer = { ...structuredClone(lesson), id: "2026-09-16", date: "2026-09-16" };
  const added = C.submitTry(second.bridge.getProgress(), newer, date, "is-are", "is-are-try-1", "no");
  second.bridge.saveProgress(added.progress);
  const saved = storage.get("nativecamp:progress:aiden");
  assert.throws(() => first.bridge.saveProgress(stale.progress), /saved practice changed/);
  assert.equal(storage.get("nativecamp:progress:aiden"), saved);
  assert.ok(first.bridge.getProgress().lessons[newer.id]);
});
test("malformed remote progress cannot replace local data or advance its sync revision", async () => {
  const env = environment(), a = await browser(env);
  firstRounds(a.bridge);
  await a.bridge.syncNow();
  const key = "nativecamp:progress:aiden", before = a.storage.get(key);
  const metaBefore = JSON.parse(a.storage.get("nativecamp:sync:aiden"));
  const remote = JSON.parse(await env.KV.get("p:aiden:nativecamp"));
  for (const data of [{ schemaVersion: 1, lessons: "broken" }, null]) {
    await env.KV.put("p:aiden:nativecamp", JSON.stringify({ ...remote, rev: remote.rev + 1, data }));
    await a.bridge.syncNow();
    assert.match(a.bridge.status(), /could not be read/);
    assert.equal(a.storage.get(key), before);
    assert.equal(JSON.parse(a.storage.get("nativecamp:sync:aiden")).syncedRev, metaBefore.syncedRev);
  }
});
test("contradictory completion or help records cannot overwrite either independent device", async () => {
  const env = environment(), a = await browser(env);
  firstRounds(a.bridge);
  await a.bridge.syncNow();
  const b = await browser(env);
  assert.notEqual(a.storage, b.storage);
  const key = "nativecamp:progress:aiden", metaKey = "nativecamp:sync:aiden";
  const snapshots = [a, b].map((device) => ({
    raw: device.storage.get(key), rev: JSON.parse(device.storage.get(metaKey)).syncedRev,
  }));
  const remote = JSON.parse(await env.KV.get("p:aiden:nativecamp"));
  const missingCompletion = structuredClone(remote.data);
  const state = missingCompletion.lessons[lesson.id].try["is-are"];
  state.initial.push({ questionId: "is-are-try-3", date, outcome: "independent", helped: false });
  state.completedOn = state.dueOn = state.deferredQuestionId = null;
  const helpedIndependent = structuredClone(remote.data);
  helpedIndependent.lessons[lesson.id].try["is-are"].initial[0].helped = true;
  const helpedGotIt = structuredClone(remote.data);
  helpedGotIt.lessons[lesson.id].say["is-are"].initial[0].helped = true;
  for (const data of [missingCompletion, helpedIndependent, helpedGotIt]) {
    assert.throws(() => C.validateProgress(data), "the actual app validator must reject the contradiction");
    await env.KV.put("p:aiden:nativecamp", JSON.stringify({ ...remote, rev: remote.rev + 1, data }));
    for (const [index, device] of [a, b].entries()) {
      await device.bridge.syncNow();
      assert.match(device.bridge.status(), /could not be read/);
      assert.equal(device.storage.get(key), snapshots[index].raw);
      assert.equal(JSON.parse(device.storage.get(metaKey)).syncedRev, snapshots[index].rev);
      assert.deepEqual(JSON.parse(JSON.stringify(device.bridge.getProgress())), JSON.parse(snapshots[index].raw));
    }
  }
});
test("teacher audio requires auth, validates its stored content and exposes no key in playback URL", async () => {
  const env = environment(), cookie = await login(env), id = "test-teacher-question";
  const bytes = Buffer.from([73, 68, 51, 4, 0, 0, 0, 0]);
  await env.KV.put(`c:nativecamp:audio:${id}`, JSON.stringify({ contentType: "audio/mpeg", base64: bytes.toString("base64") }));
  assert.equal((await request(env, `nativecamp-audio/${id}`)).status, 401);
  const response = await request(env, `nativecamp-audio/${id}`, cookie);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.match(response.headers.get("Cache-Control"), /no-store/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal((await request(env, `nativecamp-audio/${id}`, cookie, { method: "PUT" })).status, 405);
  assert.equal((await request(env, "nativecamp-audio/unknown", cookie)).status, 404);
  const a = await browser(env), url = await a.bridge.privateAudio(id);
  assert.match(url, /^blob:/);
  assert.ok(!url.includes(env.TOKEN));
  assert.ok(a.calls.every((call) => !call.url.includes("?k=")));
  for (const value of ["broken", JSON.stringify({ contentType: "text/html", base64: bytes.toString("base64") }),
    JSON.stringify({ contentType: "audio/mpeg", base64: "####" }),
    JSON.stringify({ contentType: "audio/mpeg", base64: Buffer.from("not audio").toString("base64") })]) {
    await env.KV.put(`c:nativecamp:audio:${id}`, value);
    assert.equal((await request(env, `nativecamp-audio/${id}`, cookie)).status, 500);
  }
  a.event("pagehide");
});
test("parent summary rejects malformed data and keeps both rating categories separate", () => {
  const context = vm.createContext({ NativeCampCore: C }); context.window = context;
  vm.runInContext(readFileSync(new URL("../docs/parent/nativecamp.js", import.meta.url), "utf8"), context);
  const P = context.NativeCampParent;
  assert.equal(P.readSummary({ rev: 0, data: null }, lesson, date), null);
  assert.throws(() => P.readSummary({ rev: 1, data: null }, lesson, date));
  let progress = C.createProgress();
  progress = C.submitTry(progress, lesson, date, "is-are", "is-are-try-1", "no").progress;
  progress = C.markPending(progress, lesson, "say", date, "is-are", "is-are-say-1", "reveal");
  progress = C.submitSay(progress, lesson, date, "is-are", "is-are-say-1", "withHelp").progress;
  const result = P.readSummary({ rev: 1, data: progress }, lesson, date);
  assert.equal(result.try.concepts[0].incorrect, 1);
  assert.equal(result.say.concepts[0].withHelp, 1);
  const html = P.summaryHTML(result, lesson);
  assert.match(html, /Try it/); assert.match(html, /Say it/);
  assert.match(html, /Independent/); assert.match(html, /Not yet/);
  assert.doesNotMatch(html, /[\u3400-\u9FFF]|%|total score/i);
});

test("leaving a question aborts its private audio load and never caches a late response", async () => {
  const a = await browser(environment());
  const controller = new AbortController();
  let deliver, observedSignal;
  a.context.KidsAuth.fetch = async (path, { signal }) => {
    observedSignal = signal;
    return new Promise((resolve) => { deliver = resolve; });
  };
  const load = a.bridge.privateAudio("cancelled-teacher", { signal: controller.signal });
  controller.abort();
  assert.equal(observedSignal.aborted, true);
  deliver(new Response(new Uint8Array([73, 68, 51, 4]), { headers: { "Content-Type": "audio/mpeg" } }));
  await assert.rejects(load, /recording could not play/);
  let newRequests = 0;
  a.context.KidsAuth.fetch = async () => {
    newRequests++;
    return new Response(new Uint8Array([73, 68, 51, 4]), { headers: { "Content-Type": "audio/mpeg" } });
  };
  const url = await a.bridge.privateAudio("cancelled-teacher");
  assert.match(url, /^blob:/);
  assert.equal(newRequests, 1, "Cancelled results must not enter the cache.");
  await assert.rejects(a.bridge.privateAudio("cancelled-teacher", { signal: controller.signal }), /cancelled/);
  a.event("pagehide");
});

test("an earlier lesson page's delayed sync acknowledgement cannot erase a later page's new lesson", async () => {
  const env = environment(), storage = new Map(), a = await browser(env, { storage });
  const fetch = a.context.KidsAuth.fetch;
  let entered, release;
  const reached = new Promise((resolve) => { entered = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  a.context.KidsAuth.fetch = async (path, init = {}) => {
    const response = await fetch(path, init);
    if (String(path).endsWith("/nativecamp") && init.method === "PUT") { entered(); await gate; }
    return response;
  };
  const first = C.submitTry(a.bridge.getProgress(), lesson, date, "is-are", "is-are-try-1", "yes");
  a.bridge.saveProgress(first.progress);
  const pending = a.bridge.syncNow();
  try {
    await reached;
    const b = await browser(env, { storage });
    const newer = { ...structuredClone(lesson), id: "2026-09-16", date: "2026-09-16" };
    const added = C.submitTry(b.bridge.getProgress(), newer, date, "is-are", "is-are-try-1", "no");
    b.bridge.saveProgress(added.progress);
    const beforeAck = storage.get("nativecamp:sync:aiden");
    release(); await pending;
    assert.equal(storage.get("nativecamp:sync:aiden"), beforeAck, "A superseded response must not clear the later page's dirty flag or revise its metadata.");
    await b.bridge.syncNow();
    const remote = JSON.parse(await env.KV.get("p:aiden:nativecamp"));
    assert.equal(remote.data.lessons[newer.id].try["is-are"].initial[0].outcome, "incorrect");
    assert.equal(remote.data.lessons[lesson.id].try["is-are"].initial[0].outcome, "independent");
    assert.deepEqual(JSON.parse(JSON.stringify(b.bridge.getProgress())), remote.data);
  } finally { release(); await pending; }
});
