import test from "node:test";
import assert from "node:assert/strict";
import "../docs/nativecamp/core.js";
const C = globalThis.NativeCampCore;
const day = "2026-09-17", tomorrow = "2026-09-18";
export function testLesson() {
  return { schemaVersion: 1, id: "2026-09-15", date: "2026-09-15", title: "Three ideas", concepts: ["is-are", "odd-even", "too-many"].map((id) => ({ id, title: id,
    try: [1, 2, 3].map((n) => ({ id: `${id}-try-${n}`, type: "choice", prompt: "There ___ a cat.", instruction: "Choose a word.", scene: { kind: "cats", count: n }, choices: [{ id: "is", text: "is" }, { id: "are", text: "are" }], answer: "is", answerText: "There is a cat.", explanation: "Use is for one cat.", audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })),
    say: [1, 2, 3].map((n) => ({ id: `${id}-say-${n}`, prompt: "What can you see?", instruction: "Start with There.", scene: { kind: "cats", count: n }, answerText: "There is a cat.", accepted: ["There is one cat."], audio: { question: "audio/question.mp3", answer: "audio/answer.mp3" } })) })) };
}
const lesson = testLesson();
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
test("two first independent answers defer only the third question; reload and Taiwan tomorrow preserve Done", () => {
  let progress = answer(answer(C.createProgress()));
  const before = C.summarizeLesson(progress, lesson, day).try;
  assert.equal(before.done, false);
  assert.deepEqual([before.concepts[0].attempted, before.concepts[0].independent, before.concepts[0].done, before.concepts[0].due], [2, 2, true, false]);
  progress = C.validateProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
  const review = C.nextQuestion(progress, lesson, "try", tomorrow, "is-are");
  assert.deepEqual([review.question.id, review.phase, review.total], ["is-are-try-3", "deferred", 1]);
  progress = answer(progress, "is-are", true, tomorrow);
  const after = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
  assert.deepEqual([after.attempted, after.independent, after.done, after.dueOn], [3, 3, true, null]);
  assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
});
test("wrong or assisted first answers require a third question and tomorrow review even when the third succeeds", () => {
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
    assert.equal(first.dueOn, tomorrow);
    assert.equal(first.done, true);
    assert.equal(helped ? first.helped : first.incorrect, 1);
    assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
    progress = answer(progress, "is-are", true, tomorrow);
    const reviewed = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
    assert.equal(reviewed.attempted, 3, "A spaced repeat never changes the initial denominator.");
    assert.equal(reviewed.reviews, 1);
    assert.equal(reviewed.dueOn, null);
  }
});
test("third failure ends today; later failure ends that review day and keeps initial results", () => {
  let progress = answer(answer(answer(C.createProgress(), "is-are", false), "is-are", false), "is-are", false);
  assert.equal(C.nextQuestion(progress, lesson, "try", day, "is-are"), null);
  progress = answer(progress, "is-are", false, tomorrow);
  assert.equal(C.nextQuestion(progress, lesson, "try", tomorrow, "is-are"), null);
  const info = C.summarizeLesson(progress, lesson, tomorrow).try.concepts[0];
  assert.deepEqual([info.incorrect, info.attempted, info.reviews, info.dueOn, info.done], [3, 3, 1, "2026-09-19", true]);
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
  assert.throws(() => C.validateProgress({ schemaVersion: 2, lessons: {} }));
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
  assert.deepEqual([result.say.concepts[0].gotIt, result.say.concepts[0].withHelp, result.say.concepts[0].dueOn], [2, 1, tomorrow]);
  assert.equal(result.try.concepts[0].attempted, 2);
});
test("Say it takes one concept per round; successful first two leave exactly one later question", () => {
  let progress = say(say(C.createProgress(), "gotIt"), "gotIt");
  assert.equal(C.nextQuestion(progress, lesson, "say", day, "is-are"), null);
  assert.equal(C.nextQuestion(progress, lesson, "say", tomorrow, "is-are").total, 1);
  progress = say(progress, "notYet", tomorrow);
  assert.equal(C.nextQuestion(progress, lesson, "say", tomorrow, "is-are"), null);
  assert.equal(C.summarizeLesson(progress, lesson, tomorrow).say.concepts[0].dueOn, "2026-09-19");
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
  assert.throws(() => C.checkAnswer(question, ["red"]), /each word/);
  assert.throws(() => C.checkAnswer(question, ["red", "red"]), /each word/);
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
  complete = answer(complete, "is-are", false, tomorrow);
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.reviews[0].date = day; })));
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.reviews[0].questionId = "odd-even-try-1"; })));
  assert.throws(() => C.validateProgress(mutate(complete, (s) => { s.pending = { questionId: "is-are-try-3", phase: "initial", date: tomorrow, helped: false, revealed: false }; })));
  const said = say(say(C.createProgress(), "gotIt"), "gotIt");
  said.lessons[lesson.id].say["is-are"].initial[0].helped = true;
  assert.throws(() => C.validateProgress(said));
});
