import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expandedSyntheticPack, groupedSyntheticPack, ids, navigationSyntheticPack, scienceSyntheticPack, syntheticPack } from "./helpers/synthetic-study-pack.mjs";

const source = (name) => readFileSync(new URL(`../docs/study/${name}`, import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));

class Root {
  constructor() { this.html = ""; this.listeners = new Map(); this.listenerCounts = new Map(); this.removedFeedback = 0; this.focusedAction = ""; }
  set innerHTML(value) { this.html = value; }
  get innerHTML() { return this.html; }
  addEventListener(name, fn) { this.listeners.set(name, fn); this.listenerCounts.set(name, (this.listenerCounts.get(name) || 0) + 1); }
  removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); this.listenerCounts.set(name, (this.listenerCounts.get(name) || 0) - 1); }
  querySelector(selector) {
    const action = selector.match(/\[data-action="([^"]+)"\]/)?.[1];
    if (!action) return null;
    const tag = this.html.match(new RegExp(`<(?:button|select)[^>]*data-action="${action}"[^>]*>`))?.[0];
    if (!tag || (selector.includes(":not(:disabled)") && /\sdisabled(?:\s|>)/.test(tag))) return null;
    return { disabled: /\sdisabled(?:\s|>)/.test(tag), focus: () => { this.focusedAction = action; } };
  }
  querySelectorAll(selector) {
    return selector === ".preview-feedback, .preview-reveal"
      ? [{ remove: () => this.removedFeedback++ }, { remove: () => this.removedFeedback++ }]
      : [];
  }
}

function response(body, init = {}) {
  return new Response(typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body), init);
}

function harness({ fetchImpl, pack = expandedSyntheticPack(), search = "?child=bingpu" } = {}) {
  const host = new Root(), requests = [], windowListeners = new Map(), documentListeners = new Map();
  let forbiddenTouches = 0;
  const auth = {
    endpoint: "https://family.invalid/api",
    ready: Promise.resolve(),
    state: { status: "connected" },
    async fetch(path, init = {}) {
      requests.push({ path: String(path), method: init.method || "GET", signal: init.signal });
      return fetchImpl ? fetchImpl(path, init) : response(pack);
    },
  };
  const document = {
    visibilityState: "visible",
    getElementById: () => null,
    addEventListener: (name, fn) => documentListeners.set(name, fn),
    removeEventListener: (name, fn) => { if (documentListeners.get(name) === fn) documentListeners.delete(name); },
  };
  const context = vm.createContext({
    KidsAuth: auth, document, location: { search }, URL, URLSearchParams, TextEncoder, TextDecoder,
    AbortController, Response, Headers, ReadableStream,
    setTimeout: () => 1, clearTimeout() {},
    addEventListener: (name, fn) => windowListeners.set(name, fn),
    removeEventListener: (name, fn) => { if (windowListeners.get(name) === fn) windowListeners.delete(name); },
  });
  context.window = context;
  for (const name of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "KidsWiringV1", "Storage", "State"])
    Object.defineProperty(context, name, { configurable: true, get() { forbiddenTouches++; throw Error(`preview accessed ${name}`); } });
  vm.runInContext(source("private-pack.js"), context);
  vm.runInContext(source("material.js"), context);
  vm.runInContext(source("answer.js"), context);
  vm.runInContext(source("science-topics.js"), context);
  vm.runInContext(source("preview.js"), context);
  return {
    host, auth, requests, context, document, windowListeners, documentListeners,
    get forbiddenTouches() { return forbiddenTouches; },
    boot(options = {}) { return context.StudyPreview.boot({ root: host, auth, search, documentRef: document, windowRef: context, ...options }); },
    hide() { document.visibilityState = "hidden"; documentListeners.get("visibilitychange")?.(); },
    pagehide() { windowListeners.get("pagehide")?.(); },
    pageshow(persisted = true) { windowListeners.get("pageshow")?.({ persisted }); },
  };
}

async function selectQuestion(app, unit, subtopic, index = 0) {
  app.handle("unit", { value: String(unit) });
  app.handle("subtopic", { value: subtopic });
  app.handle("question", { index: String(index) });
}

test("production parser and fixed authenticated GET load the synthetic family pack without learning access", async () => {
  const h = harness();
  const originalParse = h.context.StudyPrivatePack.parse;
  let parseCalls = 0;
  h.context.StudyPrivatePack.parse = (...args) => { parseCalls++; return originalParse(...args); };
  const app = await h.boot();
  assert.ok(app);
  assert.equal(parseCalls, 1);
  assert.deepEqual(h.requests.map(({ path, method }) => ({ path, method })), [
    { path: "https://family.invalid/api/v1/packs/g4-s1-math-u1", method: "GET" },
  ]);
  assert.match(h.host.innerHTML, /家長試玩，不記錄孩子進度/);
  assert.match(h.host.innerHTML, /\.\.\/parent\/\?child=bingpu/);
  assert.equal(h.forbiddenTouches, 0);
  app.destroy();
});

test("subject switch reaches science true_false and choice without touching child state", async () => {
  const h = harness({ pack: scienceSyntheticPack() }), app = await h.boot();
  app.handle("subject", { value: "science" });
  assert.equal(app.state.unit, 20);
  assert.match(h.host.innerHTML, /是非題/);
  assert.match(h.host.innerHTML, /data-value="true"/);
  app.handle("answer-choice", { value: "false" });
  app.handle("check");
  assert.equal(app.state.result, "wrong");
  app.handle("reveal");
  assert.match(h.host.innerHTML, /O（正確）/);
  app.handle("unit", { value: "21" });
  assert.deepEqual([...app.state.values], [""]);
  assert.match(h.host.innerHTML, /四選一/);
  app.handle("answer-choice", { value: "1" });
  app.handle("check");
  assert.equal(app.state.result, "correct");
  app.handle("subject", { value: "math" });
  assert.equal(app.state.unit, 15);
  assert.equal(h.forbiddenTouches, 0);
  assert.equal(h.requests.length, 1);
  app.destroy();
});

test("science preview defaults to the whole unit and filters the same broad topics without child writes", async () => {
  const pack = scienceSyntheticPack();
  const science = pack.questions.filter((q) => q.subject === "science");
  science[0].subtopic = "S1a 土壤的組成";
  science[1].subtopic = "S2b 魚體部位與功能";
  const plant = { ...science[1], id: "science-g4s1-synthetic-plant-v1", subtopic: "S2b 沉水植物與水流" };
  pack.questions.push(plant);
  pack.explanations[plant.id] = "合成植物解說。";
  const h = harness({ pack }), app = await h.boot();
  app.handle("subject", { value: "science" });
  assert.equal(app.state.subtopic, "");
  assert.match(h.host.innerHTML, /練習主題/);
  assert.match(h.host.innerHTML, /整單元練習/);
  assert.match(h.host.innerHTML, /地表物質/);
  assert.doesNotMatch(h.host.innerHTML, /S1a 土壤的組成/);
  app.handle("unit", { value: "21" });
  assert.match(h.host.innerHTML, />第 1 題／共 2 題<\/option>/);
  assert.match(h.host.innerHTML, /水生植物/);
  assert.match(h.host.innerHTML, /水生動物/);
  app.handle("subtopic", { value: "@science-topic:S2b-plants" });
  assert.match(h.host.innerHTML, />第 1 題／共 1 題<\/option>/);
  assert.ok(h.host.innerHTML.includes(plant.text));
  assert.equal(h.forbiddenTouches, 0);
  app.destroy();
});
test("preview shows private image and table groups, scores the complete group in memory", async () => {
  const h = harness({ pack: groupedSyntheticPack() }), app = await h.boot();
  app.handle("subject", { value: "science" });
  app.handle("unit", { value: "21" });
  app.handle("subtopic", { value: "合成圖像" });
  assert.match(h.host.innerHTML, /整組選答（3 小題）/);
  assert.match(h.host.innerHTML, /data:image\/png;base64/);
  assert.match(h.host.innerHTML, /放大圖片/);
  assert.match(h.host.innerHTML, /data-action="check" disabled/);
  assert.match(h.host.innerHTML, /小題 1／3/);
  assert.equal((h.host.innerHTML.match(/preview-group-question/g) || []).length, 1);
  app.handle("answer-group", { index: 0, value: "1" });
  app.handle("next-part");
  assert.equal(app.state.partIndex, 1);
  app.handle("previous-part");
  assert.equal(app.state.values[0], "1");
  app.handle("next-part");
  app.handle("answer-group", { index: 1, value: "2" });
  assert.match(h.host.innerHTML, /data-action="check" disabled/);
  app.handle("answer-group", { index: 2, value: "1" });
  app.handle("next-part");
  app.handle("check");
  assert.equal(app.state.result, "wrong");
  assert.match(h.host.innerHTML, /正解：丙：中間/);
  app.handle("answer-group", { index: 2, value: "3" });
  app.handle("check");
  assert.equal(app.state.result, "correct");
  app.handle("subtopic", { value: "合成表格" });
  assert.match(h.host.innerHTML, /study-material-table/);
  assert.match(h.host.innerHTML, /合成動物表/);
  assert.equal(app.state.values.length, 8);
  assert.equal(app.state.partIndex, 0);
  app.handle("next-part");
  app.handle("reset");
  assert.equal(app.state.partIndex, 0);
  assert.equal(h.forbiddenTouches, 0);
  app.destroy();
});

test("compact navigator reaches all 60 questions, enforces boundaries, clears answers and retains navigation focus", async () => {
  const pack = navigationSyntheticPack(60);
  const h = harness({ pack }), app = await h.boot();
  assert.equal((h.host.innerHTML.match(/data-action="question"/g) || []).length, 1, "one native jump select replaces the button wall");
  assert.match(h.host.innerHTML, />第 1 題／共 60 題<\/option>/);
  assert.match(h.host.innerHTML, /data-action="previous-question" disabled/);
  assert.doesNotMatch(h.host.innerHTML, /data-action="next-question" disabled/);

  app.handle("answer-choice", { value: "2" });
  app.handle("reveal");
  assert.equal(app.state.revealed, true);
  app.handle("next-question");
  assert.equal(app.state.questionIndex, 1);
  assert.deepEqual([...app.state.values], [""]);
  assert.equal(app.state.result, "");
  assert.equal(app.state.revealed, false);
  assert.ok(h.host.innerHTML.includes(pack.questions[1].text));
  assert.equal(h.host.focusedAction, "next-question");

  app.handle("question", { value: "59" });
  assert.equal(app.state.questionIndex, 59);
  assert.ok(h.host.innerHTML.includes(pack.questions[59].text));
  assert.match(h.host.innerHTML, /data-action="next-question" disabled/);
  assert.equal(h.host.focusedAction, "question", "the select is the fallback focus at the last boundary");
  app.handle("next-question");
  assert.equal(app.state.questionIndex, 59, "next cannot pass the last question");
  app.handle("previous-question");
  assert.equal(app.state.questionIndex, 58);
  assert.equal(h.host.focusedAction, "previous-question");
  app.handle("question", { value: "0" });
  app.handle("previous-question");
  assert.equal(app.state.questionIndex, 0, "previous cannot pass the first question");
  app.destroy();
});

test("filter changes reset count and stale state for one-question and empty results", async () => {
  const h = harness({ pack: navigationSyntheticPack(18) }), app = await h.boot();
  app.handle("question", { value: "8" });
  app.handle("answer-choice", { value: "2" });
  app.handle("reveal");
  app.handle("subtopic", { value: "合成單題概念" });
  assert.equal(app.state.questionIndex, 0);
  assert.deepEqual([...app.state.values], [""]);
  assert.equal(app.state.revealed, false);
  assert.match(h.host.innerHTML, />第 1 題／共 1 題<\/option>/);
  assert.match(h.host.innerHTML, /data-action="previous-question" disabled/);
  assert.match(h.host.innerHTML, /data-action="next-question" disabled/);
  assert.doesNotMatch(h.host.innerHTML, /合成導覽解說|還沒答對|答對了/);

  app.handle("unit", { value: "19" });
  assert.match(h.host.innerHTML, /這個篩選目前沒有題目/);
  assert.doesNotMatch(h.host.innerHTML, /preview-question-nav/);
  app.handle("unit", { value: "15" });
  assert.match(h.host.innerHTML, />第 1 題／共 18 題<\/option>/);
  app.destroy();
});

test("unit, direct subtopic and arbitrary question selection cover every deployed answer shape", async () => {
  const h = harness(), app = await h.boot();
  const pack = expandedSyntheticPack();
  const cases = [
    pack.questions.find((q) => q.type === "multiple_choice"),
    pack.questions.find((q) => q.type === "fill_in_blank" && q.blanks.length === 1 && q.blanks[0].input === "number"),
    pack.questions.find((q) => q.type === "fill_in_blank" && q.blanks.length === 1 && q.blanks[0].input === "comparison"),
    pack.questions.find((q) => q.type === "fill_in_blank" && q.blanks.length > 1),
  ];
  for (const q of cases) {
    const list = pack.questions.filter((candidate) => candidate.unit === q.unit && candidate.subtopic === q.subtopic);
    await selectQuestion(app, q.unit, q.subtopic, list.findIndex((candidate) => candidate.id === q.id));
    assert.ok(h.host.innerHTML.includes(q.text));
    if (q.type === "multiple_choice") {
      app.handle("answer-choice", { value: q.answer === "1" ? "2" : "1" });
      app.handle("check");
      assert.match(h.host.innerHTML, /還沒答對/);
      app.handle("answer-choice", { value: q.answer });
    } else {
      q.blanks.forEach((blank, index) => app.handle(blank.input === "comparison" ? "answer-compare" : "answer-number", { index: String(index), value: index ? "999" : "999" }));
      app.handle("check");
      assert.match(h.host.innerHTML, /還沒答對/);
      q.blanks.forEach((blank, index) => app.handle(blank.input === "comparison" ? "answer-compare" : "answer-number", { index: String(index), value: blank.input === "number" ? `${blank.answer}.0` : blank.answer }));
    }
    app.handle("check");
    assert.match(h.host.innerHTML, /答對了/);
    assert.ok(h.host.innerHTML.includes(pack.explanations[q.id]));
    app.handle("retry-answer");
    assert.doesNotMatch(h.host.innerHTML, /答對了|還沒答對|合成解說|新增合成解說/);
  }
  assert.equal(h.forbiddenTouches, 0);
  app.destroy();
});

test("wrong answers remain retryable, reveal is explicit, reset and empty filters clear stale content", async () => {
  const h = harness({ pack: syntheticPack() }), app = await h.boot();
  const first = syntheticPack().questions[0];
  app.handle("answer-choice", { value: "1" });
  app.handle("check");
  assert.match(h.host.innerHTML, /還沒答對/);
  assert.doesNotMatch(h.host.innerHTML, new RegExp(first.options[Number(first.answer) - 1] + "<\/p>"));
  app.handle("reveal");
  assert.ok(h.host.innerHTML.includes(first.options[Number(first.answer) - 1]));
  assert.ok(h.host.innerHTML.includes(syntheticPack().explanations[first.id]));
  app.handle("reset");
  assert.doesNotMatch(h.host.innerHTML, /還沒答對|合成解說/);
  app.handle("unit", { value: "19" });
  assert.match(h.host.innerHTML, /這個篩選目前沒有題目/);
  assert.doesNotMatch(h.host.innerHTML, /哪個數字最大|合成解說/);
  assert.equal(h.forbiddenTouches, 0);
  app.destroy();
});

test("editing a number after feedback immediately clears the visible result without rerendering the focused input", async () => {
  const h = harness(), app = await h.boot();
  const pack = expandedSyntheticPack();
  const q = pack.questions.find((item) => item.type === "fill_in_blank" && item.blanks[0].input === "number");
  const index = pack.questions.filter((item) => item.unit === q.unit && item.subtopic === q.subtopic).findIndex((item) => item.id === q.id);
  await selectQuestion(app, q.unit, q.subtopic, index);
  app.handle("answer-number", { index: "0", value: q.blanks[0].answer });
  app.handle("check");
  assert.equal(app.state.result, "correct");
  h.host.listeners.get("input")({ target: { value: "7", dataset: { index: "0" }, closest: () => ({ value: "7", dataset: { index: "0" } }) } });
  assert.equal(app.state.result, "");
  assert.equal(app.state.revealed, false);
  assert.equal(h.host.removedFeedback, 2);
  app.destroy();
});

test("successful pagehide releases the pack and DOM; bfcache pageshow reauthorizes, reloads and reparses", async () => {
  const h = harness(), app = await h.boot();
  const secondUnit = expandedSyntheticPack().questions.find((q) => q.unit === 16);
  await selectQuestion(app, secondUnit.unit, secondUnit.subtopic);
  app.handle("answer-choice", { value: "2" });
  app.handle("reveal");
  assert.match(h.host.innerHTML, /新增合成解說/);
  h.hide();
  assert.match(h.host.innerHTML, /新增合成解說/, "backgrounding does not pretend the page was left");
  h.pagehide();
  assert.equal(app.state.pack, null);
  assert.doesNotMatch(h.host.innerHTML, /合成練習|合成解說|答對了|還沒答對/);
  assert.match(h.host.innerHTML, /返回頁面後會重新載入家庭題包/);
  h.pageshow();
  await settle();
  await settle();
  assert.equal(h.requests.length, 2);
  assert.match(h.host.innerHTML, /家長試玩，不記錄孩子進度/);
  assert.doesNotMatch(h.host.innerHTML, /新增合成解說|答對了|還沒答對/);
  assert.equal(h.forbiddenTouches, 0);
});

test("pagehide during loading aborts and invalidates the late response; persisted return starts a fresh load", async () => {
  let call = 0, resolveOld;
  const h = harness({ fetchImpl: () => {
    call++;
    if (call === 1) return new Promise((resolve) => { resolveOld = resolve; });
    return response(expandedSyntheticPack());
  } });
  let parseCalls = 0;
  const originalParse = h.context.StudyPrivatePack.parse;
  h.context.StudyPrivatePack.parse = (...args) => { parseCalls++; return originalParse(...args); };
  const loading = h.boot();
  await settle();
  assert.equal(h.requests.length, 1);
  h.pagehide();
  assert.equal(h.requests[0].signal.aborted, true);
  resolveOld(response(expandedSyntheticPack()));
  assert.equal(await loading, null);
  assert.equal(parseCalls, 0);
  assert.doesNotMatch(h.host.innerHTML, /合成練習|合成解說/);
  h.pageshow();
  await settle();
  await settle();
  assert.equal(h.requests.length, 2);
  assert.equal(parseCalls, 1);
  assert.match(h.host.innerHTML, /家長試玩，不記錄孩子進度/);
});

test("401, 404, offline, oversized, invalid UTF-8, bad JSON and invalid contract are clear and retryable", async () => {
  const scenarios = [
    [() => response({ error: "unauthorized" }, { status: 401 }), /家庭連線已失效/],
    [() => response({ error: "missing" }, { status: 404 }), /尚未發布/],
    [() => { throw Error("offline"); }, /無法連線取得題包/],
    [() => response("{}", { headers: { "Content-Length": String(129 * 1024) } }), /超過 128 KiB/],
    [() => response(new Uint8Array([0xff, 0xfe])), /不是有效 UTF-8/],
    [() => response("{"), /JSON 格式無法讀取/],
    [() => response({ schemaVersion: 1, packId: "wrong", revision: 1, questions: [], explanations: {} }), /版本或欄位不支援/],
  ];
  for (const [fetchImpl, expected] of scenarios) {
    const h = harness({ fetchImpl });
    assert.equal(await h.boot(), null);
    assert.match(h.host.innerHTML, /無法載入題包/);
    assert.match(h.host.innerHTML, expected);
    assert.match(h.host.innerHTML, /data-action="retry"/);
    assert.match(h.host.innerHTML, /返回家長後台/);
    assert.doesNotMatch(h.host.innerHTML, /合成練習|合成解說/);
    assert.equal(h.forbiddenTouches, 0);
  }
});

test("timeout clears old content and an older failure cannot replace a newer success", async () => {
  let calls = 0, resolveOld;
  const h = harness({ fetchImpl: () => {
    calls++;
    if (calls === 1) return new Promise((resolve) => { resolveOld = resolve; });
    return response(expandedSyntheticPack());
  } });
  const older = h.boot();
  await settle();
  const newer = h.boot();
  const app = await newer;
  assert.ok(app);
  resolveOld(response("unavailable", { status: 503 }));
  assert.equal(await older, null);
  assert.match(h.host.innerHTML, /家長試玩，不記錄孩子進度/);
  assert.doesNotMatch(h.host.innerHTML, /無法載入題包/);
  app.destroy();

  const timed = harness({ fetchImpl: () => new Promise(() => {}) });
  assert.equal(await timed.boot({ setTimer: (fn) => { fn(); return 1; }, clearTimer() {} }), null);
  assert.match(timed.host.innerHTML, /逾時/);
  assert.doesNotMatch(timed.host.innerHTML, /合成練習|合成解說/);
});

test("preview HTML excludes formal Study state, sync, wiring and activity runtimes", () => {
  assert.match(source("preview.html"), /preview\.js\?v=20260926-practice-topics/);
  assert.match(source("preview.html"), /preview\.css\?v=20260923-group-stepwise/);
  const scripts = [...source("preview.html").matchAll(/<script src="([^"]+)"/g)].map((match) => match[1].split("?")[0]);
  assert.deepEqual(scripts, ["../shared/device-auth.js", "private-pack.js", "material.js", "answer.js", "science-topics.js", "preview.js"]);
  const preview = source("preview.js");
  for (const forbidden of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "KidsWiringV1", "family.record", "family.finishRound", "StudyPrivatePack.KEY"])
    assert.ok(!preview.includes(forbidden), `preview source must not include ${forbidden}`);
  assert.match(source("../parent/parent.js"), /study\/preview\.html\?child=\$\{child\}/);
  assert.match(source("../parent/parent.js"), /四上數學／自然試玩/);
});

test("shared answer seam retains Study number and comparison equivalence rules", () => {
  const context = vm.createContext({});
  vm.runInContext(source("answer.js"), context);
  assert.equal(context.StudyAnswer.isBlankCorrect({ input: "number", answer: "63" }, "63.0"), true);
  assert.equal(context.StudyAnswer.isBlankCorrect({ input: "number", answer: "63" }, "63abc"), true);
  assert.equal(context.StudyAnswer.isBlankCorrect({ input: "comparison", answer: ">" }, " ＞ "), true);
  assert.equal(context.StudyAnswer.isBlankCorrect({ input: "comparison", answer: ">" }, "<"), false);
  assert.deepEqual(ids.length, 6);
});
