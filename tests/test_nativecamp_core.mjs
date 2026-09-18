import test from "node:test";
import assert from "node:assert/strict";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/question-view.js";
import { legacyProgress, weeklyFixture } from "./helpers/nativecamp-weekly.mjs";
const C = globalThis.NativeCampCore;
const day = "2026-09-17", tomorrow = "2026-09-18";
export function testLesson() {
  return { schemaVersion: 1, id: "2026-09-15", date: "2026-09-15", title: "Three ideas", concepts: ["is-are", "odd-even", "too-many"].map((id) => ({ id, title: id,
    try: [1, 2, 3].map((n) => ({ id: `${id}-try-${n}`, type: "choice", prompt: "There ___ a cat.", instruction: "Choose a word.", scene: { kind: "cats", count: n }, choices: [{ id: "is", text: "is" }, { id: "are", text: "are" }], answer: "is", answerText: "There is a cat.", explanation: "Use is for one cat.", audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })),
    say: [1, 2, 3].map((n) => ({ id: `${id}-say-${n}`, prompt: "What can you see?", instruction: "Start with There.", scene: { kind: "cats", count: n }, answerText: "There is a cat.", accepted: ["There is one cat."], audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })) })) };
}
const lesson = testLesson();
test("word and family scenes validate their required short text and render literal text without leaking hidden answers", () => {
  for (const scene of [
    { kind: "word-card", text: "I am eight years old.", heading: "Make it short." },
    { kind: "family-link", relation: "Mum's brother", name: "Tom", pronoun: "He" },
  ]) {
    const copy = testLesson(); copy.concepts[0].try[0].scene = scene;
    assert.equal(C.validateLesson(copy), copy);
    const html = globalThis.NativeCampQuestionView.sceneHtml(scene);
    assert.ok(html.includes(scene.kind));
    assert.doesNotMatch(html, /uncle|I'm|scene-number|scene-grid/);
  }
  const escaped = globalThis.NativeCampQuestionView.sceneHtml({ kind: "word-card", text: '<img src=x onerror="bad()">', heading: "<b>Short</b>" });
  assert.doesNotMatch(escaped, /<img|<b>/);
  assert.match(escaped, /&lt;img/);
  for (const scene of [
    { kind: "word-card", text: "" }, { kind: "word-card", text: "x".repeat(161) },
    { kind: "family-link", relation: "Mum's brother" },
    { kind: "family-link", relation: "x".repeat(101), name: "Tom" },
    { kind: "family-link", relation: "Mum's brother", name: "Tom", pronoun: {} },
  ]) {
    const copy = testLesson(); copy.concepts[0].try[0].scene = scene;
    assert.throws(() => C.validateLesson(copy));
  }
});
function answer(progress, concept = "is-are", correct = true, date = day) {
  const next = C.nextQuestion(progress, lesson, "try", date, concept);
  assert.ok(next, "A question must be ready.");
  return C.submitTry(progress, lesson, date, concept, next.question.id, correct ? "is" : "are").progress;
}
function say(progress, rating, date = day, concept = "is-are") {
  const next = C.nextQuestion(progress, lesson, "say", date, concept);
  progress = C.markPending(progress, lesson, "say", date, concept, next.question.id, "reveal");
  return C.submitSay(progress, lesson, date, concept, next.question.id, rating).progress;
}
test("two first independent answers complete once; reload and tomorrow never reopen", () => {
  let progress = answer(answer(C.createProgress()));
  const before = C.summarizeLesson(progress, lesson, day).try;
  assert.equal(before.done, false);
  assert.deepEqual([before.concepts[0].attempted, before.concepts[0].independent, before.concepts[0].done, before.concepts[0].due], [2, 2, true, false]);
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
  assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
  const after = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
  assert.deepEqual([after.attempted, after.independent, after.done, after.dueOn], [2, 2, true, null]);
  assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
});
test("wrong or assisted first answers require a third question and preserve difficulty after completion", () => {
  for (const helped of [false, true]) {
    let progress = C.createProgress();
    if (helped) progress = C.markPending(progress, lesson, "try", day, "is-are", "is-are-try-1", "help");
    progress = answer(progress, "is-are", helped);
    progress = answer(progress);
    assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are").question.id, "is-are-try-3");
    assert.equal(C.nextQuestion(progress, lesson, "try", day).concept.id, "odd-even", "Try it spaces the extra question after the other concepts.");
    progress = answer(progress);
    const first = C.summarizeLesson(progress, lesson, day).try.concepts[0];
    assert.equal(first.attempted, 3);
    assert.equal(first.dueOn, null);
    assert.equal(first.done, true);
    assert.equal(helped ? first.helped : first.incorrect, 1);
    assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
    assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
    const reviewed = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
    assert.equal(reviewed.attempted, 3, "A spaced repeat never changes the initial denominator.");
    assert.equal(reviewed.reviews, 0);
    assert.equal(reviewed.needsPractice, true);
    assert.equal(reviewed.dueOn, null);
  }
});
test("third failure completes the amount without declaring mastery or requiring an old question", () => {
  let progress = answer(answer(answer(C.createProgress(), "is-are", false), "is-are", false), "is-are", false);
  assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
  assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
  const info = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
  assert.deepEqual([info.incorrect, info.attempted, info.reviews, info.dueOn, info.done, info.needsPractice], [3, 3, 0, null, true, true]);
});
test("a duplicate submission and an unrecorded correction never replace the first answer", () => {
  const initial = C.createProgress();
  const result = C.submitTry(initial, lesson, day, "is-are", "is-are-try-1", "are");
  const duplicate = C.submitTry(result.progress, lesson, day, "is-are", "is-are-try-1", "is");
  assert.equal(duplicate.recorded, false);
  assert.equal(C.checkAnswer(lesson.concepts[0].try[0], "is"), true);
  assert.equal(C.summarizeLesson(duplicate.progress, lesson, day).try.concepts[0].incorrect, 1);
  assert.equal(C.summarizeLesson(initial, lesson, day).try.concepts[0].attempted, 0, "Input snapshots are not mutated.");
});
test("content help remains saved through wrong answers and reloads; malformed persisted ids are rejected", () => {
  let progress = C.markPending(C.createProgress(), lesson, "try", day, "is-are", "is-are-try-1", "help");
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are").pending.helped, true);
  progress = answer(progress, "is-are", false);
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(progress.lessons[lesson.id].try["is-are"].initial[0].helped, true);
  const invalid = structuredClone(progress);
  delete invalid.lessons[lesson.id].try["is-are"].initial[0].questionId;
  assert.throws(() => C.validateProgress(invalid));
  assert.throws(() => C.validateProgress({ schemaVersion: 3, lessons: {} }));
});
test("Say it requires reveal, preserves hints, and does not borrow Try it success", () => {
  let progress = answer(answer(C.createProgress()));
  assert.equal(C.summarizeLesson(progress, lesson, day).say.concepts[0].attempted, 0);
  assert.throws(() => C.submitSay(progress, lesson, day, "is-are", "is-are-say-1", "gotIt"), /Show the answer/);
  progress = C.markPending(progress, lesson, "say", day, "is-are", "is-are-say-1", "help");
  progress = C.markPending(progress, lesson, "say", day, "is-are", "is-are-say-1", "reveal");
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.throws(() => C.submitSay(progress, lesson, day, "is-are", "is-are-say-1", "gotIt"), /hint was given/);
  assert.throws(() => C.submitSay(progress, lesson, day, "is-are", "is-are-say-1", "perfect"), /parent rating/);
  progress = C.submitSay(progress, lesson, day, "is-are", "is-are-say-1", "withHelp").progress;
  progress = say(say(progress, "gotIt"), "gotIt");
  const result = C.summarizeLesson(progress, lesson, day);
  assert.deepEqual([result.say.concepts[0].gotIt, result.say.concepts[0].withHelp, result.say.concepts[0].dueOn], [2, 1, null]);
  assert.equal(result.try.concepts[0].attempted, 2);
});
test("Say it takes one concept per round and does not return after success", () => {
  let progress = say(say(C.createProgress(), "gotIt"), "gotIt");
  assert.equal(C.nextQuestion(progress, lesson, "say", day, "is-are"), null);
  assert.equal(C.nextQuestion(progress, lesson, "say", tomorrow, "is-are"), null);
  assert.equal(C.summarizeLesson(progress, lesson, tomorrow).say.concepts[0].dueOn, null);
});
test("all concepts must finish their initial round for the mode's Done; waiting reviews never remove it", () => {
  let progress = C.createProgress();
  for (const concept of lesson.concepts) progress = answer(answer(progress, concept.id), concept.id);
  assert.equal(C.summarizeLesson(progress, lesson, day).try.done, true);
  assert.equal(C.summarizeLesson(progress, lesson, tomorrow).try.done, true);
  assert.equal(C.summarizeLesson(progress, lesson, tomorrow).say.done, false);
  assert.equal(C.summarizeLesson(progress, lesson, day).try.concepts.reduce((n, c) => n + c.attempted, 0), 6);
});
test("word-card answers accept explicitly listed equivalent orders and reject incomplete or duplicate tokens", () => {
  const question = { type: "order", tokens: [{ id: "red", text: "red" }, { id: "blue", text: "blue" }], acceptedOrders: [["red", "blue"], ["blue", "red"]] };
  assert.equal(C.checkAnswer(question, ["red", "blue"]), true);
  assert.equal(C.checkAnswer(question, ["blue", "red"]), true);
  assert.equal(C.checkAnswer(question, ["red"]), false);
  assert.throws(() => C.checkAnswer(question, ["red", "red"]), /each card/);
  assert.throws(() => C.checkAnswer(lesson.concepts[0].try[0], "missing"), /Pick an answer/);
});
test("the day boundary is Asia/Taipei regardless of the runner's timezone", () => {
  assert.equal(C.today(new Date("2026-09-17T15:59:59Z")), "2026-09-17");
  assert.equal(C.today(new Date("2026-09-17T16:00:00Z")), "2026-09-18");
  assert.equal(C.nextDay("2026-12-31"), "2027-01-01");
  assert.throws(() => C.nextDay("2026-02-30"));
});
test("external progress rejects impossible completion, assistance, and review histories instead of getting stuck", () => {
  let complete = answer(answer(answer(C.createProgress(), "is-are", false)));
  const mutate = (source, edit) => { const result = structuredClone(source); edit(result.lessons[lesson.id].try["is-are"]); return result; };
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.completedOn = null; s.dueOn = null; })));
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.initial[1].helped = true; })));
  const early = answer(answer(C.createProgress()));
  assert.throws(() => C.validateProgress(mutate(early, (s) => { s.completedOn = null; s.dueOn = null; s.deferredQuestionId = null; })));
  assert.throws(() => C.validateProgress(mutate(early, (s) => { s.dueOn = "2026-09-19"; })));
  complete = C.validateProgress(legacyProgress());
  complete.lessons[lesson.id].try["is-are"] = structuredClone(complete.lessons[lesson.id].try["odd-even"]);
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.reviews[0].date = day; })));
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.reviews[0].questionId = "is-are-try-1"; })));
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.pending = { questionId: "is-are-try-3", phase: "initial", date: tomorrow, helped: false, revealed: false }; })));
  const said = say(say(C.createProgress(), "gotIt"), "gotIt");
  said.lessons[lesson.id].say["is-are"].initial[0].helped = true;
  assert.throws(() => C.validateProgress(said));
});

test("v1 migration preserves initial, review and pending history while resuming only unfinished concepts", () => {
  const old = legacyProgress(), snapshot = structuredClone(old), restored = C.validateProgress(old);
  assert.equal(restored.schemaVersion, 2);
  assert.deepEqual(restored.lessons, old.lessons);
  assert.deepEqual(old, snapshot);
  for (const id of ["is-are", "odd-even"]) assert.equal(C.nextQuestion(restored, lesson, "try", "2026-09-25", id), null);
  const next = C.nextQuestion(restored, lesson, "try", "2026-09-25");
  assert.equal(next.question.id, "too-many-try-2");
  assert.equal(next.pending.helped, true);
  const continued = C.submitTry(restored, lesson, "2026-09-25", "too-many", next.question.id, "is").progress;
  assert.equal(continued.lessons[lesson.id].try["too-many"].initial.at(-1).outcome, "helped");
  assert.deepEqual(continued.lessons[lesson.id].try["odd-even"], old.lessons[lesson.id].try["odd-even"]);
  assert.equal(C.summarizeLesson(continued, lesson, "2026-09-25").try.concepts[1].needsPractice, true, "A later successful review does not erase first-answer difficulty.");
});

test("order questions accept distractor subsets, equivalent orders and distinct repeated word cards", () => {
  const q = { type: "order", tokens: [{ id: "it-a", text: "it" }, { id: "is", text: "is" }, { id: "it-b", text: "it" }, { id: "are", text: "are" }], acceptedOrders: [["it-a", "is", "it-b"], ["is", "it-a", "it-b"]] };
  assert.equal(C.checkAnswer(q, ["it-b", "is", "it-a"]), true);
  assert.equal(C.checkAnswer(q, ["is", "it-a", "it-b"]), true);
  assert.equal(C.checkAnswer(q, ["it-a", "is"]), false);
  assert.equal(C.checkAnswer(q, ["it-a", "are", "it-b"]), false);
  assert.equal(C.checkAnswer(q, ["it-a", "is", "it-b", "are"]), false);
  assert.throws(() => C.checkAnswer(q, ["it-a", "is", "it-a"]));
  const bundle = testLesson(); Object.assign(bundle.concepts[0].try[0], q);
  assert.equal(C.validateLesson(bundle), bundle);
  bundle.concepts[0].try[0].acceptedOrders = [["is"]];
  assert.throws(() => C.validateLesson(bundle), /complete answer/);
});

test("weekly review waits for Taipei Sunday, prioritizes first difficulty and freezes both modes", () => {
  const weekly = weeklyFixture(); C.validateLesson(weekly);
  const progress = C.validateProgress(legacyProgress());
  assert.equal(C.nextQuestion(progress, weekly, "try", "2026-09-19"), null);
  assert.throws(() => C.startLesson(progress, weekly, "2026-09-19"), /not open/);
  const started = C.startLesson(progress, weekly, "2026-09-20"), frozen = structuredClone(started.weekly[weekly.id]);
  assert.deepEqual(frozen.selected.try, ["weekly-weak", "weekly-known", "weekly-older"]);
  assert.deepEqual(frozen.selected.say, ["weekly-known", "weekly-weak", "weekly-older"]);
  assert.equal(C.nextQuestion(started, weekly, "try", "2026-09-20", "weekly-unknown"), null);
  let changed = answer(started, "too-many", false, "2026-09-21");
  changed = C.validateProgress(JSON.parse(JSON.stringify(changed)));
  assert.deepEqual(C.startLesson(changed, weekly, "2026-09-22").weekly[weekly.id], frozen);
  assert.deepEqual(C.practiceConcepts(changed, weekly, "try").map((c) => c.id), frozen.selected.try);
  assert.deepEqual(changed.lessons[lesson.id].try["odd-even"], progress.lessons[lesson.id].try["odd-even"]);
});

test("weekly completion closes each mode, keeps new difficulty and never reopens", () => {
  const weekly = weeklyFixture(); let progress = C.startLesson(C.createProgress(), weekly, "2026-09-20");
  const first = C.nextQuestion(progress, weekly, "try", "2026-09-20");
  progress = C.submitTry(progress, weekly, "2026-09-20", first.concept.id, first.question.id, "are").progress;
  while (true) {
    const next = C.nextQuestion(progress, weekly, "try", "2026-09-20"); if (!next) break;
    progress = C.submitTry(progress, weekly, "2026-09-20", next.concept.id, next.question.id, "is").progress;
  }
  const summary = C.summarizeLesson(progress, weekly, "2026-09-27");
  assert.equal(summary.try.done, true); assert.equal(summary.say.done, false);
  assert.equal(C.nextQuestion(progress, weekly, "try", "2026-09-27"), null);
  assert.equal(C.sourcePerformance(progress, first.concept.sourceConcept, "try").needsPractice, true);
  assert.equal(C.sourcePerformance(progress, first.concept.sourceConcept, "say").needsPractice, false);
  assert.deepEqual(C.validateProgress(JSON.parse(JSON.stringify(progress))), progress);
  const following = weeklyFixture(); following.id = "weekly-2026-09-21"; following.date = "2026-09-27";
  following.weekly = { weekStart: "2026-09-21", weekEnd: "2026-09-27", opensOn: "2026-09-27", conceptCount: 2, earlierCount: 1 };
  following.concepts.at(-1).sourceConcept = { lessonId: "2026-09-23", conceptId: "other", date: "2026-09-23" };
  const selected = C.startLesson(progress, following, "2026-09-27").weekly[following.id].selected.try;
  assert.ok(selected.includes(first.concept.id), "An earlier weekly difficulty should be selected next week.");
});

test("weekly contracts reject future sources, impossible weeks and broken frozen references", () => {
  const weekly = weeklyFixture();
  for (const edit of [(x) => { x.concepts[0].sourceConcept.date = "2026-09-21"; }, (x) => { x.weekly.weekStart = "2026-09-15"; }, (x) => { x.weekly.earlierCount = x.weekly.conceptCount; }]) {
    const broken = structuredClone(weekly); edit(broken); assert.throws(() => C.validateLesson(broken));
  }
  const saved = C.startLesson(C.createProgress(), weekly, "2026-09-20");
  const broken = structuredClone(saved); broken.weekly[weekly.id].selected.try.push(broken.weekly[weekly.id].selected.try[0]);
  assert.throws(() => C.validateProgress(broken));
  const changed = structuredClone(weekly); changed.concepts.shift();
  assert.throws(() => C.nextQuestion(saved, changed, "try", "2026-09-21"), /changed/);
});
