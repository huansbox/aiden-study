import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/app.js";
const C = globalThis.NativeCampCore, A = globalThis.NativeCampApp;
const originalLesson = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/2026-09-15.json", import.meta.url), "utf8"));
const date = "2026-09-17";
// Replace only the DOM/media boundary. The real renderer, event controller, lesson,
// answer checks, schedule, and persisted data are exercised together.
class Root {
  constructor() { this.html = ""; this.renders = 0; this.nodes = new Map(); this.events = new Map(); }
  set innerHTML(value) { this.html = value; this.renders++; this.nodes.clear(); }
  get innerHTML() { return this.html; }
  querySelector(selector) {
    if (!selector.startsWith("#")) return null;
    const id = selector.slice(1);
    if (!this.html.includes(`id="${id}"`)) return null;
    if (!this.nodes.has(id)) this.nodes.set(id, { textContent: "" });
    return this.nodes.get(id);
  }
  querySelectorAll() { return []; }
  addEventListener(name, handler) { this.events.set(name, handler); }
  removeEventListener(name) { this.events.delete(name); }
}
function harness({ progress = C.createProgress(), lesson = structuredClone(originalLesson), failAudio = false } = {}) {
  const root = new Root(), activities = [], media = [];
  let saved = C.validateProgress(progress), saves = 0, privateRequests = 0, active = false, app;
  const bridge = {
    homeHref: "../?child=aiden", status: () => "Saved on this device.", getProgress: () => saved,
    async saveProgress(value, activity) { saved = C.validateProgress(value); saves++; if (activity) activities.push(activity); app?.onChange({ type: "status" }); },
    setActive(value) { active = value; },
    async syncNow() { app?.onChange({ type: "status" }); },
    async privateAudio() { privateRequests++; return "blob:teacher-audio-" + privateRequests; },
  };
  app = A.mount({ root, lesson, bridge, date: () => date, makeAudio: () => {
    const audio = { src: "", paused: false, async play() { if (failAudio) throw Error("Media unavailable"); }, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
    media.push(audio); return audio;
  } });
  return { app, root, lesson, activities, media, bridge,
    get progress() { return saved; }, get saves() { return saves; }, get active() { return active; }, get privateRequests() { return privateRequests; },
    adopt(value) { saved = C.validateProgress(value); app.onChange({ type: "progress" }); },
  };
}
test("real lesson opens; Listen and status-only notifications preserve selection and never record an answer", async () => {
  const h = harness();
  assert.equal(h.active, false);
  await h.app.handle("start-try");
  assert.equal(h.active, true);
  await h.app.handle("pick", { choice: "is" });
  assert.match(h.root.innerHTML, /data-choice="is" aria-pressed="true"/);
  await h.app.handle("question-audio");
  assert.equal(h.media.length, 1);
  const rendered = h.root.renders;
  await h.bridge.syncNow();
  assert.equal(h.root.renders, rendered);
  assert.equal(h.media[0].paused, false);
  assert.equal(h.saves, 0);
  assert.deepEqual(h.activities, []);
  await h.app.handle("check");
  assert.equal(h.saves, 1);
  assert.deepEqual(h.activities, [{ answered: true, correct: true }]);
  assert.equal(h.media[0].paused, true);
  await h.app.handle("check");
  assert.equal(h.saves, 1, "Repeated Check cannot score the first answer twice.");
});
test("Say it hides answer text and media until reveal; rating refers to the first answer", async () => {
  const h = harness();
  const question = h.lesson.concepts[0].say[0];
  await h.app.handle("start-say", { concept: "is-are" });
  assert.doesNotMatch(h.root.innerHTML, new RegExp(question.answerText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(h.root.innerHTML, /data-action="answer-audio"|data-rating=/);
  await h.app.handle("answer-audio");
  assert.equal(h.media.length, 0);
  await h.app.handle("rate", { rating: "gotIt" });
  assert.equal(h.activities.length, 0);
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).say.concepts[0].attempted, 0);
  await h.app.handle("reveal");
  assert.ok(h.root.innerHTML.includes(question.answerText));
  assert.match(h.root.innerHTML, /data-action="answer-audio"/);
  await h.app.handle("answer-audio");
  assert.equal(h.media[0].src, question.audio.answer);
  await h.app.handle("rate", { rating: "gotIt" });
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).say.concepts[0].gotIt, 1);
  assert.deepEqual(h.activities, [{ answered: false }]);
  assert.equal(h.media[0].paused, true);
});
test("Say it hint survives remount, disables Got it, and counts With help without an automatic speech score", async () => {
  const first = harness();
  await first.app.handle("start-say", { concept: "is-are" });
  await first.app.handle("help");
  const second = harness({ progress: first.progress });
  await second.app.handle("start-say", { concept: "is-are" });
  assert.match(second.root.innerHTML, /With help is saved/);
  await second.app.handle("reveal");
  assert.match(second.root.innerHTML, /data-rating="gotIt" disabled/);
  await second.app.handle("rate", { rating: "gotIt" });
  assert.equal(C.summarizeLesson(second.progress, second.lesson, date).say.concepts[0].attempted, 0);
  await second.app.handle("rate", { rating: "withHelp" });
  assert.equal(C.summarizeLesson(second.progress, second.lesson, date).say.concepts[0].withHelp, 1);
});
test("Try it wrong answer can be corrected without replacing or recounting its first result", async () => {
  const h = harness();
  await h.app.handle("start-try");
  await h.app.handle("help");
  await h.app.handle("pick", { choice: "are" });
  await h.app.handle("check");
  const saves = h.saves;
  assert.equal(h.progress.lessons[h.lesson.id].try["is-are"].initial[0].helped, true);
  await h.app.handle("correct");
  await h.app.handle("pick", { choice: "is" });
  await h.app.handle("check-correction");
  assert.equal(h.saves, saves);
  assert.match(h.root.innerHTML, /Your first answer has not changed/);
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).try.concepts[0].incorrect, 1);
  assert.deepEqual(h.activities, [{ answered: true, correct: false }]);
});
test("word cards can be removed before Check, and a status update preserves their order", async () => {
  const lesson = structuredClone(originalLesson);
  const orderQuestion = lesson.concepts.flatMap((c) => c.try).find((q) => q.type === "order");
  lesson.concepts[0].try[0] = structuredClone(orderQuestion);
  lesson.concepts[0].try[0].id = "is-are-try-first-order";
  const h = harness({ lesson });
  await h.app.handle("start-try");
  const first = orderQuestion.tokens[0].id, second = orderQuestion.tokens[1].id;
  await h.app.handle("add-word", { word: first });
  await h.app.handle("add-word", { word: second });
  await h.app.handle("remove-word", { word: first });
  assert.match(h.root.innerHTML, new RegExp(`data-action="remove-word"[^>]*data-word="${second}"`));
  assert.match(h.root.innerHTML, new RegExp(`data-action="add-word"[^>]*data-word="${first}"`));
  const before = h.root.innerHTML;
  await h.bridge.syncNow();
  assert.equal(h.root.innerHTML, before);
  assert.equal(h.saves, 0);
});
test("remote adopted progress replaces a stale question and its unsent answer without writing back", async () => {
  const h = harness();
  await h.app.handle("start-try");
  await h.app.handle("pick", { choice: "are" });
  const remote = C.submitTry(C.createProgress(), h.lesson, date, "is-are", "is-are-try-1", "is").progress;
  h.adopt(remote);
  assert.match(h.root.innerHTML, /Your saved practice changed/);
  assert.equal(h.saves, 0);
  await h.app.handle("check");
  assert.equal(h.saves, 0, "The previous choice must not become the new question's answer.");
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).try.concepts[0].attempted, 1);
});
test("audio failure is retryable without an attempt, and private audio is requested only on Listen", async () => {
  const lesson = structuredClone(originalLesson);
  lesson.concepts[0].say[0].audio.question = { private: "teacher-question" };
  const h = harness({ lesson, failAudio: true });
  await h.app.handle("start-say", { concept: "is-are" });
  assert.equal(h.privateRequests, 0);
  await h.app.handle("question-audio");
  assert.equal(h.privateRequests, 1);
  assert.match(h.root.innerHTML, /Could not play the sound/);
  assert.match(h.root.innerHTML, /data-action="retry-audio"/);
  await h.app.handle("retry-audio");
  assert.equal(h.media.length, 2);
  assert.equal(h.privateRequests, 2, "The bridge owns Blob URLs; retry reacquires a valid URL after a bfcache return.");
  assert.equal(h.media[1].src, "blob:teacher-audio-2");
  assert.equal(h.saves, 0);
  await h.app.handle("home");
  assert.equal(h.active, false);
  assert.equal(h.media[1].paused, true);
});
test("finished Try it opens its progress summary from the home card", async () => {
  let progress = C.createProgress();
  for (const concept of originalLesson.concepts) {
    for (const question of concept.try.slice(0, 2)) {
      progress = C.submitTry(progress, originalLesson, date, concept.id, question.id,
        question.type === "choice" ? question.answer : question.acceptedOrders[0]).progress;
    }
  }
  const h = harness({ progress });
  const card = h.root.innerHTML.match(/<article class="mode-card try">([\s\S]*?)<\/article>/)[1];
  const action = card.match(/data-action="([^"]+)"/)[1];
  assert.match(card, /See my progress/);
  await h.app.handle(action);
  assert.match(h.root.innerHTML, /<h1>See the first answers\.<\/h1>/);
  assert.equal(h.saves, 0);
  assert.equal(h.active, false);
});
