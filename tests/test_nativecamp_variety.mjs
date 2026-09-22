import test from "node:test";
import assert from "node:assert/strict";
import "../docs/nativecamp/core.js";
import "../docs/nativecamp/question-view.js";
import { varietyFixture } from "./helpers/nativecamp-variety.mjs";

const C = globalThis.NativeCampCore, V = globalThis.NativeCampQuestionView;
const day = "2026-09-22";
const answer = (progress, lesson, conceptId, correct = true) => {
  const next = C.nextQuestion(progress, lesson, "try", day, conceptId), q = next.question;
  return C.submitTry(progress, lesson, day, next.concept.id, q.id, q.type === "repair" ? { wordId: "s1", choiceId: correct ? "are" : "am" } : correct ? q.acceptedOrders[0] : [q.tokens.at(-1).id]).progress;
};

test("new packs can author Build, Change and Fix directly without a legacy revision wrapper", () => {
  const lesson = varietyFixture();
  for (const concept of lesson.concepts) { concept.try = concept.tryRevision.questions; delete concept.tryRevision; }
  C.validateLesson(lesson);
  let progress = C.createProgress();
  for (const concept of lesson.concepts) {
    assert.equal(C.nextQuestion(progress, lesson, "try", day).concept.id, concept.id);
    progress = answer(progress, lesson, concept.id);
  }
  assert.equal(C.nextQuestion(progress, lesson, "try", day).question.stage, "change");
  lesson.concepts[0].try.reverse();
  assert.throws(() => C.validateLesson(lesson), /Build, Change, and Fix/);
});

test("updated Try questions interleave Build, Change, and only the needed Fix without changing Say", () => {
  const lesson = C.validateLesson(varietyFixture()); let progress = C.createProgress();
  const sequence = [], originalSay = C.nextQuestion(progress, lesson, "say", day).question;
  for (let next; (next = C.nextQuestion(progress, lesson, "try", day));) {
    sequence.push([next.concept.id, next.question.stage]);
    progress = answer(progress, lesson, next.concept.id, sequence.length !== 1);
  }
  assert.deepEqual(sequence, [
    ...lesson.concepts.map(c => [c.id, "build"]),
    ...lesson.concepts.map(c => [c.id, "change"]),
    [lesson.concepts[0].id, "fix"],
  ]);
  assert.equal(C.summarizeLesson(progress, lesson, day).try.done, true);
  assert.equal(C.nextQuestion(progress, lesson, "say", day).question, originalSay);
  assert.equal(progress.lessons[lesson.id].try[lesson.concepts[0].id].initial[0].outcome, "incorrect");
  assert.deepEqual(C.validateProgress(JSON.parse(JSON.stringify(progress))), progress);
});

test("original first answers, help and old deferred IDs pin only their concept to original questions", () => {
  const lesson = varietyFixture(), original = structuredClone(lesson);
  original.concepts.forEach(c => delete c.tryRevision);
  const concept = lesson.concepts[0], first = concept.try[0];
  let tried = C.submitTry(C.createProgress(), original, day, concept.id, first.id, first.answer).progress;
  assert.equal(C.nextQuestion(tried, lesson, "try", day, concept.id).question, concept.try[1]);
  assert.equal(C.nextQuestion(tried, lesson, "try", day, lesson.concepts[1].id).question.stage, "build");
  const pending = C.markPending(C.createProgress(), original, "try", day, concept.id, first.id, "help");
  assert.equal(C.nextQuestion(pending, lesson, "try", day, concept.id).question, first);
  const before = JSON.stringify(pending);
  const rejected = C.submitTry(pending, lesson, day, concept.id, concept.tryRevision.questions[0].id, ["w0"]);
  assert.equal(rejected.recorded, false);
  assert.equal(JSON.stringify(pending), before);
  tried = C.submitTry(tried, original, day, concept.id, concept.try[1].id, concept.try[1].answer).progress;
  assert.equal(C.nextQuestion(tried, lesson, "try", day, concept.id), null);
  assert.deepEqual(C.summarizeLesson(tried, lesson, day), C.summarizeLesson(tried, original, day));
  const state = tried.lessons[lesson.id].try[concept.id];
  state.dueOn = "2026-09-23"; state.deferredQuestionId = concept.try[2].id;
  assert.deepEqual(C.questionsForConcept(C.validateProgress(tried), lesson, "try", concept), concept.try);
});

test("new pending survives reload; unknown saved question IDs stop instead of silently changing a question", () => {
  const lesson = varietyFixture(), concept = lesson.concepts[0], first = concept.tryRevision.questions[0];
  const progress = C.markPending(C.createProgress(), lesson, "try", day, concept.id, first.id, "help");
  assert.equal(C.nextQuestion(C.validateProgress(progress), lesson, "try", day, concept.id).question.id, first.id);
  const submitted = answer(progress, lesson, concept.id);
  assert.equal(submitted.lessons[lesson.id].try[concept.id].initial[0].outcome, "helped");
  progress.lessons[lesson.id].try[concept.id].pending.questionId = "missing-question";
  assert.throws(() => C.nextQuestion(progress, lesson, "try", day, concept.id), /Ask a parent/);
});

test("single-word repair requires choosing the right location and replacement; malformed repair data fails", () => {
  const lesson = varietyFixture(), q = lesson.concepts[0].tryRevision.questions[2];
  assert.equal(C.checkAnswer(q, q.answer), true);
  assert.equal(C.checkAnswer(q, { wordId: "s0", choiceId: "are" }), false);
  assert.equal(C.checkAnswer(q, { wordId: "s1", choiceId: "am" }), false);
  assert.throws(() => C.checkAnswer(q, { wordId: "s1" }), /replacement/);
  assert.throws(() => C.checkAnswer(q, { wordId: "absent", choiceId: "are" }), /replacement/);
  for (const edit of [
    q => q.answerText = "They are counting pens.",
    q => q.answer.wordId = "missing",
    q => q.choices[1].text = "are not",
    q => q.sentence[1].id = q.sentence[0].id,
    q => q.choices[1].text = "is",
  ]) {
    const broken = varietyFixture(); edit(broken.concepts[0].tryRevision.questions[2]);
    assert.throws(() => C.validateLesson(broken));
  }
  const duplicate = varietyFixture(); duplicate.concepts[0].tryRevision.questions[0].id = duplicate.concepts[0].try[0].id;
  assert.throws(() => C.validateLesson(duplicate), /repeated/);
});

test("updated word banks differ by question but stay stable on rerender, selected-card removal and reload", () => {
  const lesson = varietyFixture(), q = lesson.concepts[0].tryRevision.questions[0];
  const bank = html => [...html.matchAll(/data-action="add-word" data-word="([^"]+)"/g)].map(match => match[1]);
  const order = bank(V.answerControls(q, null, []));
  assert.deepEqual(bank(V.answerControls(structuredClone(q), null, [])), order);
  assert.deepEqual(bank(V.answerControls(q, null, [order[2]])), order.filter(id => id !== order[2]));
  assert.notDeepEqual(order, bank(V.answerControls({ ...q, id: q.id + "-different" }, null, [])));
  const old = { ...q }; delete old.stage;
  assert.deepEqual(bank(V.answerControls(old, null, [])), q.tokens.map(t => t.id));
  const repair = lesson.concepts[0].tryRevision.questions[2];
  assert.doesNotMatch(V.answerControls(repair, null, []), /repair-choice/);
  const html = V.answerControls(repair, repair.answer, []);
  assert.match(html, /aria-label="Change is" aria-pressed="true">are<\/button>/);
  assert.match(html, /aria-label="Replacement words"/);
});
