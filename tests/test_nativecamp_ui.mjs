import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/catalog.js";
import "../docs/nativecamp/question-view.js";
import "../docs/nativecamp/audio.js";
import "../docs/nativecamp/app.js";
import { weeklyFixture } from "./helpers/nativecamp-weekly.mjs";
const sound = (ref) => typeof ref === "string" && ref.startsWith("audio/") ? ref + "?v=20260918-openai" : ref;
const C = globalThis.NativeCampCore, A = globalThis.NativeCampApp;
const originalLesson = JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/2026-09-15.json", import.meta.url), "utf8"));
const date = "2026-09-17";
const catalog = globalThis.NativeCampCatalog.validateCatalog(JSON.parse(readFileSync(new URL("../docs/nativecamp/lessons/catalog.json", import.meta.url), "utf8")));
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
class Events {
  constructor() { this.handlers = new Map(); this.visibilityState = "visible"; }
  addEventListener(name, handler) { this.handlers.set(name, handler); }
  removeEventListener(name) { this.handlers.delete(name); }
  emit(name) { this.handlers.get(name)?.(); }
}
function harness({ progress = C.createProgress(), lesson = structuredClone(originalLesson), catalog = [], lessons = {}, child = "aiden", failAudio = false, practiceDate = date, makeContext = () => null, beforeSave, loadPrivate } = {}) {
  const root = new Root(), activities = [], media = [], plays = [], roundFinishes = [], eventTarget = new Events(), documentTarget = new Events();
  let saved = C.validateProgress(progress), saves = 0, privateRequests = 0, active = false, app;
  const bridge = {
    homeHref: "../?child=aiden", status: () => "Saved on this device.", getProgress: () => saved,
    async saveProgress(value, activity) { await beforeSave?.(); saved = C.validateProgress(value); saves++; if (activity) activities.push(activity); app?.onChange({ type: "status" }); },
    setActive(value) { active = value; },
    finishRound() { roundFinishes.push(root.innerHTML); active = false; },
    async syncNow() { app?.onChange({ type: "status" }); },
    async privateAudio(id, options) { privateRequests++; return loadPrivate ? loadPrivate(id, options) : "blob:teacher-audio-" + privateRequests; },
  };
  app = A.mount({ root, lesson, bridge, catalog, lessons, child, date: () => practiceDate, eventTarget, documentTarget,
    makeAudioController: (options) => globalThis.NativeCampAudio.create({ ...options, makeContext }), makeAudio: () => {
    const audio = { src: "", paused: true, async play() { plays.push(this.src); if (failAudio) throw Error("Media unavailable"); this.paused = false; }, pause() { this.paused = true; }, removeAttribute() {}, load() {} };
    media.push(audio); return audio;
  } });
  return { app, root, lesson, activities, media, plays, roundFinishes, bridge, eventTarget, documentTarget,
    get progress() { return saved; }, get saves() { return saves; }, get active() { return active; }, get privateRequests() { return privateRequests; },
    adopt(value) { saved = C.validateProgress(value); app.onChange({ type: "progress" }); },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
function effectClock() {
  const notes = [];
  const context = {
    state: "running", currentTime: 0, destination: {},
    createOscillator() {
      const note = { frequency: { setValueAtTime(value) { note.pitch = value; } }, connect() {}, start() {}, stop() {}, disconnect() { note.disconnected = true; } };
      notes.push(note); return note;
    },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; },
    close() {},
  };
  return { notes, makeContext: () => context, finish() { notes.at(-1)?.onended?.(); } };
}
test("lesson navigation preserves unfinished courses and returning from practice keeps the selected lesson", async () => {
  const concept = originalLesson.concepts[0]; let progress = C.createProgress();
  for (const q of concept.try.slice(0, 2)) progress = C.submitTry(progress, originalLesson, date, concept.id, q.id, q.answer).progress;
  const h = harness({ lesson: { ...structuredClone(originalLesson), id: "2026-09-16", date: "2026-09-16" }, catalog, child: "bingpu", progress, practiceDate: "2026-09-18" });
  const before = structuredClone(h.progress.lessons[originalLesson.id]);
  assert.match(h.root.innerHTML, /lesson=2026-09-15[^>]*>.*?Silvana/);
  assert.doesNotMatch(h.root.innerHTML, /Review ready/);
  assert.match(h.root.innerHTML, /child=bingpu&amp;lesson=2026-09-16" aria-current="page"/);
  assert.doesNotMatch(h.root.innerHTML, /[\u3400-\u9fff]|\p{Extended_Pictographic}/u);
  await h.app.handle("start-try");
  assert.doesNotMatch(h.root.innerHTML, /aria-label="Lessons"/, "Lesson navigation cannot interrupt a question by accident.");
  await h.app.handle("pick", { choice: "is" }); await h.app.handle("check");
  await h.app.handle("home");
  assert.deepEqual(h.progress.lessons[originalLesson.id], before);
  assert.equal(h.progress.lessons["2026-09-16"].try[concept.id].initial.length, 1);
  assert.match(h.root.innerHTML, /child=bingpu&amp;lesson=2026-09-16" aria-current="page"/);
  h.app.destroy();
});
test("real lesson opens; Listen and status-only notifications preserve selection and never record an answer", async () => {
  const h = harness();
  assert.equal(h.active, false);
  await h.app.handle("start-try");
  assert.equal(h.active, true);
  assert.deepEqual(h.plays, [sound(h.lesson.concepts[0].try[0].audio.question)]);
  await h.app.handle("pick", { choice: "is" });
  assert.match(h.root.innerHTML, /data-choice="is" aria-pressed="true"/);
  await h.app.handle("question-audio");
  assert.equal(h.media.length, 1);
  assert.equal(h.plays.length, 2, "Only entering the question and explicit Listen play the prompt.");
  const rendered = h.root.renders;
  await h.bridge.syncNow();
  assert.equal(h.root.renders, rendered);
  assert.equal(h.media[0].paused, false);
  assert.equal(h.saves, 0);
  assert.deepEqual(h.activities, []);
  await h.app.handle("check");
  assert.equal(h.saves, 1);
  assert.equal(h.roundFinishes.length, 0, "Recording a single answer must not show round rewards.");
  assert.deepEqual(h.activities, [{ answered: true, correct: true }]);
  assert.equal(h.media[0].src, sound(h.lesson.concepts[0].try[0].audio.answer));
  assert.equal(h.media[0].paused, false);
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
  assert.deepEqual(h.plays, [sound(question.audio.question)], "The hidden answer cannot play; the question plays automatically.");
  await h.app.handle("rate", { rating: "gotIt" });
  assert.equal(h.activities.length, 0);
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).say.concepts[0].attempted, 0);
  await h.app.handle("reveal");
  assert.deepEqual(h.plays, [sound(question.audio.question), sound(question.audio.answer)]);
  assert.ok(h.root.innerHTML.includes(question.answerText));
  assert.match(h.root.innerHTML, /Before showing the answer\./);
  assert.match(h.root.innerHTML, /data-action="answer-audio"/);
  await h.app.handle("answer-audio");
  assert.equal(h.media[0].src, sound(question.audio.answer));
  await h.app.handle("rate", { rating: "gotIt" });
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).say.concepts[0].gotIt, 1);
  assert.deepEqual(h.activities, [{ answered: false }]);
  assert.equal(h.media[0].src, sound(h.lesson.concepts[0].say[1].audio.question));
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
  assert.equal(h.plays.length, 1, "Picking and removing words or a status notification must not restart the prompt.");
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
test("failed question autoplay is retryable without an attempt, including an authorized private recording", async () => {
  const lesson = structuredClone(originalLesson);
  lesson.concepts[0].say[0].audio.question = { private: "teacher-question" };
  const h = harness({ lesson, failAudio: true });
  await h.app.handle("start-say", { concept: "is-are" });
  assert.equal(h.privateRequests, 1);
  await h.app.handle("question-audio");
  assert.equal(h.privateRequests, 2);
  assert.match(h.root.innerHTML, /Could not play/);
  assert.match(h.root.innerHTML, /data-action="retry-audio"/);
  await h.app.handle("retry-audio");
  assert.equal(h.media.length, 1);
  assert.equal(h.privateRequests, 3, "The bridge owns Blob URLs; retry reacquires a valid URL after a bfcache return.");
  assert.equal(h.media[0].src, "blob:teacher-audio-3");
  assert.equal(h.saves, 0);
  await h.app.handle("home");
  assert.equal(h.active, false);
  assert.equal(h.media[0].paused, true);
});
test("Try it plays feedback before the complete answer for independent, helped, and wrong first answers", async () => {
  for (const outcome of ["independent", "helped", "incorrect"]) {
    const clock = effectClock(), h = harness({ makeContext: clock.makeContext });
    const first = h.lesson.concepts[0].try[0], second = h.lesson.concepts[0].try[1];
    await h.app.handle("start-try");
    if (outcome === "helped") await h.app.handle("help");
    await h.app.handle("pick", { choice: outcome === "incorrect" ? "are" : "is" });
    const checked = h.app.handle("check");
    await settle();
    assert.ok(h.root.innerHTML.includes(first.answerText), "The answer is visible while the short feedback plays.");
    assert.deepEqual(h.plays, [sound(first.audio.question)]);
    assert.equal(clock.notes[0].pitch, outcome === "incorrect" ? 246.94 : 523.25);
    clock.finish(); await checked;
    assert.deepEqual(h.plays, [sound(first.audio.question), sound(first.audio.answer)]);
    assert.equal(h.progress.lessons[h.lesson.id].try["is-are"].initial[0].outcome, outcome);
    h.media[0].onended();
    assert.match(h.root.innerHTML, /data-action="next"/);
    assert.equal(h.plays.length, 2, "Finishing the spoken answer must not advance the question.");
    await h.app.handle("next");
    assert.equal(h.plays.at(-1), sound(second.audio.question));
    h.app.destroy();
  }
});
test("Say it Got it precedes the next question, and the last rating plays only encouragement", async () => {
  const clock = effectClock(), h = harness({ makeContext: clock.makeContext });
  const [first, second] = h.lesson.concepts[0].say;
  await h.app.handle("start-say", { concept: "is-are" });
  await h.app.handle("reveal");
  const firstRating = h.app.handle("rate", { rating: "gotIt" });
  await settle();
  assert.ok(h.root.innerHTML.includes(second.prompt));
  assert.deepEqual(h.plays, [sound(first.audio.question), sound(first.audio.answer)]);
  assert.equal(clock.notes.length, 3);
  assert.equal(h.roundFinishes.length, 0);
  clock.finish(); await firstRating;
  assert.equal(h.plays.at(-1), sound(second.audio.question));
  await h.app.handle("reveal");
  const lastRating = h.app.handle("rate", { rating: "gotIt" });
  await settle();
  assert.match(h.root.innerHTML, /Done for now/);
  assert.equal(h.roundFinishes.length, 1);
  assert.match(h.roundFinishes[0], /Done for now/, "The result screen must exist before rewards are shown.");
  assert.equal(clock.notes.length, 6);
  clock.finish(); await lastRating;
  assert.deepEqual(h.plays, [sound(first.audio.question), sound(first.audio.answer), sound(second.audio.question), sound(second.audio.answer)]);
  assert.equal(h.saves, 4, "Reveal and rating each persist once; playing audio never writes progress.");
  h.eventTarget.emit("pageshow");
  await h.app.handle("sync");
  assert.equal(h.roundFinishes.length, 1, "Revisiting the same result screen must not finish the round twice.");
  h.app.destroy();
});
test("Say it With help and Not yet advance without a correct-answer sound", async () => {
  for (const rating of ["withHelp", "notYet"]) {
    const clock = effectClock(), h = harness({ makeContext: clock.makeContext });
    await h.app.handle("start-say", { concept: "is-are" });
    await h.app.handle("reveal");
    await h.app.handle("rate", { rating });
    assert.equal(clock.notes.length, 0);
    assert.equal(h.plays.at(-1), sound(h.lesson.concepts[0].say[1].audio.question));
    h.app.destroy();
  }
});
test("leaving during encouragement cancels the following answer and stops every effect note", async () => {
  const clock = effectClock(), h = harness({ makeContext: clock.makeContext });
  await h.app.handle("start-try");
  await h.app.handle("pick", { choice: "is" });
  const check = h.app.handle("check");
  await settle();
  assert.equal(clock.notes.length, 3);
  await h.app.handle("home");
  await check;
  assert.equal(h.plays.length, 1);
  assert.ok(clock.notes.every((note) => note.disconnected));
  assert.equal(h.active, false);
  assert.equal(h.roundFinishes.length, 0, "Returning home partway through practice is not a completed round.");
  assert.match(h.root.innerHTML, /Choose a practice mode/);
  h.app.destroy();
});
test("a save completed after hiding the page cannot revive feedback audio", async () => {
  let finishSave;
  const h = harness({ beforeSave: () => new Promise((resolve) => { finishSave = resolve; }) });
  await h.app.handle("start-try");
  await h.app.handle("pick", { choice: "is" });
  const check = h.app.handle("check");
  await settle();
  h.documentTarget.visibilityState = "hidden";
  h.documentTarget.emit("visibilitychange");
  finishSave(); await check;
  assert.equal(h.saves, 1);
  assert.equal(h.plays.length, 1);
  assert.equal(h.active, false);
  assert.match(h.root.innerHTML, /data-action="next"/);
  h.documentTarget.visibilityState = "visible";
  h.documentTarget.emit("visibilitychange");
  assert.equal(h.plays.length, 1, "Returning to the page does not unexpectedly repeat audio.");
  await h.app.handle("answer-audio");
  assert.equal(h.plays.at(-1), sound(h.lesson.concepts[0].try[0].audio.answer));
  h.app.destroy();
});
test("pagehide cancels private question loading, and returning permits a fresh Listen", async () => {
  let resolveOld, signal, request = 0;
  const lesson = structuredClone(originalLesson);
  lesson.concepts[0].say[0].audio.question = { private: "teacher-question" };
  const h = harness({ lesson, loadPrivate: (_id, options) => {
    if (++request === 1) { signal = options.signal; return new Promise((resolve) => { resolveOld = resolve; }); }
    return "blob:current-question";
  } });
  const start = h.app.handle("start-say", { concept: "is-are" });
  await settle();
  h.eventTarget.emit("pagehide");
  assert.equal(signal.aborted, true);
  resolveOld("blob:old-question"); await start;
  assert.deepEqual(h.plays, []);
  assert.equal(h.active, false);
  assert.equal(h.roundFinishes.length, 0, "Leaving the page is not a round completion.");
  h.eventTarget.emit("pageshow");
  await h.app.handle("question-audio");
  assert.deepEqual(h.plays, ["blob:current-question"]);
  h.app.destroy();
  assert.equal(h.eventTarget.handlers.size, 0);
  assert.equal(h.documentTarget.handlers.size, 0);
  assert.equal(h.media[0].paused, true);
});
test("Try it finishes the round only after Continue leaves its last feedback", async () => {
  for (const [progress, practiceDate] of [[C.createProgress(), date]]) {
    const h = harness({ progress, practiceDate });
    await h.app.handle("start-try");
    let next;
    while ((next = C.nextQuestion(h.progress, h.lesson, "try", practiceDate))) {
      if (next.question.type === "choice") await h.app.handle("pick", { choice: next.question.answer });
      else for (const word of next.question.acceptedOrders[0]) await h.app.handle("add-word", { word });
      await h.app.handle("check");
      assert.equal(h.roundFinishes.length, 0, "Even the last answer's feedback remains part of practice.");
      h.documentTarget.visibilityState = "hidden"; h.documentTarget.emit("visibilitychange");
      h.documentTarget.visibilityState = "visible"; h.documentTarget.emit("visibilitychange");
      assert.equal(h.roundFinishes.length, 0, "Pausing and resuming does not finish a round.");
      await h.app.handle("next");
    }
    assert.equal(h.roundFinishes.length, 1);
    assert.match(h.roundFinishes[0], /Done for now/);
    await h.app.handle("sync");
    assert.equal(h.roundFinishes.length, 1);
    h.app.destroy();
  }
});
test("a last Say it rating saved in the background defers rewards until its result screen is visible", async () => {
  let delaySave = false, finishSave;
  const h = harness({ beforeSave: () => delaySave ? new Promise((resolve) => { finishSave = resolve; }) : undefined });
  await h.app.handle("start-say", { concept: "is-are" });
  await h.app.handle("reveal");
  await h.app.handle("rate", { rating: "gotIt" });
  await h.app.handle("reveal");
  delaySave = true;
  const lastRating = h.app.handle("rate", { rating: "gotIt" });
  await settle();
  h.documentTarget.visibilityState = "hidden"; h.documentTarget.emit("visibilitychange");
  finishSave(); await lastRating;
  assert.match(h.root.innerHTML, /Done for now/);
  assert.equal(h.roundFinishes.length, 0);
  h.documentTarget.visibilityState = "visible"; h.documentTarget.emit("visibilitychange");
  assert.equal(h.roundFinishes.length, 1);
  h.documentTarget.emit("visibilitychange");
  assert.equal(h.roundFinishes.length, 1);
  h.app.destroy();
});
function completedProgress(modes = ["try", "say"]) {
  let progress = C.createProgress();
  for (const mode of modes) {
    for (const concept of originalLesson.concepts) {
      for (const question of concept[mode].slice(0, 2)) {
        if (mode === "try") progress = C.submitTry(progress, originalLesson, date, concept.id, question.id,
          question.type === "choice" ? question.answer : question.acceptedOrders[0]).progress;
        else {
          progress = C.markPending(progress, originalLesson, "say", date, concept.id, question.id, "reveal");
          progress = C.submitSay(progress, originalLesson, date, concept.id, question.id, "gotIt").progress;
        }
      }
    }
  }
  return progress;
}
function homeCard(h, mode) {
  const html = h.root.innerHTML.match(new RegExp(`<article class="mode-card ${mode}">([\\s\\S]*?)<\\/article>`))[1];
  return { html, action: html.match(/data-action="([^"]+)"/)[1], mode: html.match(/data-mode="([^"]+)"/)[1] };
}
test("finished lessons fold away and direct child actions cannot restart or change results", async () => {
  const progress = completedProgress(), h = harness({ progress, catalog, lessons: { [originalLesson.id]: originalLesson } });
  const before = JSON.stringify(h.progress);
  assert.match(h.root.innerHTML, /<details class="finished-lessons"><summary>Finished/);
  assert.doesNotMatch(h.root.innerHTML, /href="[^"]*lesson=2026-09-15"/);
  for (const mode of ["try", "say"]) {
    await h.app.handle("home");
    assert.doesNotMatch(h.root.innerHTML, /data-action="start-try"|data-action="choose-say"/);
    await h.app.handle(mode === "try" ? "start-try" : "start-say", { concept: "is-are" });
    await h.app.handle("check");
    assert.doesNotMatch(h.root.innerHTML, /id="question-prompt"|Review tomorrow|One short review/);
  }
  assert.equal(JSON.stringify(h.progress), before);
  assert.equal(h.saves, 0);
  assert.equal(h.active, false);
});
test("Try it Done does not complete Say it; the simple home and all child screens have no parent-summary entry", async () => {
  const h = harness({ progress: completedProgress(["try"]) });
  assert.ok(h.root.innerHTML.includes(originalLesson.title));
  assert.doesNotMatch(h.root.innerHTML, /class="hero"|class="concept-tags"|A LITTLE PRACTICE|Your English lesson|Tap, choose|grown-up helps/);
  assert.match(homeCard(h, "try").html, /Done/);
  assert.doesNotMatch(homeCard(h, "say").html, /Done/);
  await h.app.handle("choose-say");
  assert.equal((h.root.innerHTML.match(/Not started/g) || []).length, 3);
  assert.doesNotMatch(h.root.innerHTML, /class="pill done"/);
  const screens = [h.root.innerHTML];
  await h.app.handle("start-say", { concept: "is-are" }); screens.push(h.root.innerHTML);
  await h.app.handle("reveal"); screens.push(h.root.innerHTML);
  await h.app.handle("rate", { rating: "gotIt" });
  await h.app.handle("reveal");
  await h.app.handle("rate", { rating: "gotIt" }); screens.push(h.root.innerHTML);
  assert.match(h.root.innerHTML, /Done for now\./);
  assert.match(h.root.innerHTML, /Choose another idea/);
  for (const screen of screens) assert.doesNotMatch(screen, /Parent summary|PARENT SUMMARY|data-action="summary"/);
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).say.done, false);
  assert.equal(C.summarizeLesson(h.progress, h.lesson, date).try.done, true);
});
test("legacy deferred questions remain history and cannot reopen through a child deep link", async () => {
  const progress = completedProgress();
  progress.schemaVersion = 1; delete progress.weekly;
  for (const mode of ["try", "say"]) for (const concept of originalLesson.concepts) {
    const state = progress.lessons[originalLesson.id][mode][concept.id];
    state.dueOn = "2026-09-18"; state.deferredQuestionId = concept[mode][2].id;
  }
  const h = harness({ progress, practiceDate: "2026-09-18" });
  assert.match(h.root.innerHTML, /Finished/);
  await h.app.handle("start-try");
  assert.doesNotMatch(h.root.innerHTML, /id="question-prompt"/);
  await h.app.handle("home");
  await h.app.handle("start-say", { concept: "too-many" });
  assert.doesNotMatch(h.root.innerHTML, /id="question-prompt"|One short review|Review ready/);
  assert.deepEqual(h.progress.lessons, progress.lessons);
  assert.equal(h.saves, 0);
});

test("weekly child deep links stay closed before Sunday and starting saves a fixed selection without activity", async () => {
  const lesson = weeklyFixture(), early = harness({ lesson, practiceDate: "2026-09-19" });
  assert.match(early.root.innerHTML, /Opens Sep 20/);
  assert.doesNotMatch(early.root.innerHTML, /data-action="start-try"|data-action="choose-say"/);
  await early.app.handle("start-try"); await early.app.handle("start-say", { concept: lesson.concepts[0].id });
  assert.equal(early.saves, 0); assert.deepEqual(early.plays, []);
  const h = harness({ lesson, practiceDate: "2026-09-20" });
  await h.app.handle("start-try");
  assert.equal(h.saves, 1); assert.deepEqual(h.activities, []);
  const frozen = structuredClone(h.progress.weekly[lesson.id]);
  await h.app.handle("pick", { choice: "is" }); await h.app.handle("check");
  const restored = harness({ lesson, progress: h.progress, practiceDate: "2026-09-21" });
  await restored.app.handle("start-try");
  assert.equal(restored.saves, 0);
  assert.deepEqual(restored.progress.weekly[lesson.id], frozen);
  assert.equal(C.nextQuestion(restored.progress, lesson, "try", "2026-09-21").question.id, lesson.concepts[0].try[1].id);
});

test("order Check accepts a complete sentence while leaving its distractor in the bank", async () => {
  const lesson = structuredClone(originalLesson), q = lesson.concepts[0].try[0];
  Object.assign(q, { type: "order", tokens: [{ id: "there", text: "There" }, { id: "is", text: "is" }, { id: "cat", text: "a cat." }, { id: "are", text: "are" }], acceptedOrders: [["there", "is", "cat"]] });
  const h = harness({ lesson }); await h.app.handle("start-try");
  for (const word of ["there", "is", "cat"]) await h.app.handle("add-word", { word });
  assert.match(h.root.innerHTML, /data-action="check"[^>]*>.*?Check/);
  assert.match(h.root.innerHTML, /data-action="add-word" data-word="are"/);
  await h.app.handle("check");
  assert.equal(h.progress.lessons[lesson.id].try[lesson.concepts[0].id].initial[0].outcome, "independent");
});
