import test from "node:test";
import assert from "node:assert/strict";
import "../docs/study/private-pack.js";
import "../docs/study/answer.js";
import "../docs/study/math-input.js";
import { finalMathQuestion, choiceSetQuestion } from "./helpers/synthetic-final-math.mjs";
import { syntheticPack, syntheticPngData } from "./helpers/synthetic-study-pack.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
const P = globalThis.StudyPrivatePack, A = globalThis.StudyAnswer, M = globalThis.StudyMathInput;
const parse = q => P.parse(JSON.stringify({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1,
  questions: [q], explanations: { [q.id]: "Synthetic explanation" } }), [], null, true);
const correct = ["12", ".52", "3 3/6", "2", "合成別名", ">"];

test("math mixed inputs are scoped and preserve original choices, forms and answer bounds", () => {
  const q = finalMathQuestion(); parse(q); parse(choiceSetQuestion());
  for (const mutate of [q => { q.unit = 15; }, q => { q.blanks[0].accept = ["13"]; },
    q => { q.blanks[1].answer = "0.521"; }, q => { q.blanks[2].form = "any"; },
    q => { q.blanks[2].answer = "3 6/6"; }, q => { q.blanks[2].accept = ["3 4/6"]; },
    q => { q.options = ["A"]; }, q => { q.blanks[3].answer = "3"; }]) {
    const invalid = structuredClone(q); mutate(invalid); assert.throws(() => parse(invalid));
  }
  for (const unit of [24, 25, 26, 27, 28]) parse({ ...q, unit, material: { kind: "png", data: syntheticPngData(), alt: "Synthetic figure" } });
  assert.equal(A.gradeBlanks(q, correct).correct, true);
  const changed = structuredClone(q); changed.blanks[2].form = "mixed_or_whole";
  assert.notEqual(P.semantic(q), P.semantic(changed));
});

test("decimal answers accept equivalent trailing zero within two places and reject numeric prefixes", () => {
  const q = { ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "decimal", answer: "7.9" }] };
  for (const input of ["7.9", "7.90", "07.90"]) assert.equal(A.gradeBlanks(q, [input]).correct, true);
  for (const input of ["7.900", "7.9cm", "7,9", "７.９", "7.91", "79e-1"]) assert.equal(A.gradeBlanks(q, [input]).correct, false);
  q.blanks = [{ input: "number", answer: "12" }];
  assert.equal(A.gradeBlanks(q, ["12.0"]).correct, true);
  assert.equal(A.gradeBlanks(q, ["12cm"]).correct, false);
});

test("fractions retain required form and denominator instead of silently accepting reduction", () => {
  const q = { ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "fraction", answer: "3 3/6", form: "mixed" }] };
  for (const input of ["3 3/6", "03 03/06"]) assert.equal(A.gradeBlanks(q, [input]).correct, true);
  for (const input of ["3 1/2", "21/6", "3.5", "3 3/0", "3"]) assert.equal(A.gradeBlanks(q, [input]).correct, false);
  q.blanks = [{ input: "fraction", answer: "21/6", form: "improper" }];
  assert.equal(A.gradeBlanks(q, ["21/6"]).correct, true); assert.equal(A.gradeBlanks(q, ["3 3/6"]).correct, false);
  q.blanks = [{ input: "fraction", answer: "4", form: "mixed_or_whole" }];
  assert.equal(A.gradeBlanks(q, ["4"]).correct, true); assert.equal(A.gradeBlanks(q, ["4 0/6"]).correct, false);
});

test("fraction UI collects three fields and exact choice sets ignore order without accepting subsets", () => {
  const q = finalMathQuestion(); let state = M.initial(q); state = M.update(q, state, "blank", "2");
  for (const [field, value] of [["whole", "3"], ["numerator", "3"]]) state = M.update(q, state, "fraction", value, field);
  assert.equal(state.values[2], ""); state = M.update(q, state, "fraction", "6", "denominator");
  assert.equal(state.values[2], "3 3/6"); assert.match(M.render(q, state), /整數部分/);
  const set = choiceSetQuestion(); assert.equal(A.gradeChoiceSet(set, ["3", "1"]), true);
  for (const values of [["1"], ["1", "2", "3"], ["1", "1"], [1, 3]]) assert.equal(A.gradeChoiceSet(set, values), false);
});

test("mixed math and classification save as one activity each and reward at batch end", async () => {
  const events = [], family = { allowed: () => true, ready: Promise.resolve(), profile: () => ({ terms: ["g4-s1"] }), task: () => null,
    setActive() {}, beginRound() {}, record: e => events.push(["record", e]), finishRound: () => events.push(["finish"]) };
  const ports = { family, publishedStudyUnits: [27], search: "?child=aiden&subject=math&term=g4-s1" };
  let e = await boot(storage(), "aiden", ports); const pack = syntheticPack(), mixed = finalMathQuestion(), set = { ...choiceSetQuestion(), unit: 27 };
  pack.revision++; pack.questions.push(mixed, set); pack.explanations[mixed.id] = pack.explanations[set.id] = "Synthetic explanation";
  e.app.importPrivatePack(JSON.stringify(pack)); e.app.State.saveBatch("27", [mixed.id, set.id]); e.app.startQuiz("full", 27);
  assert.match(e.node("page-quiz").innerHTML, /math-input-panel/);
  e.app.submitAnswer(["13", ...correct.slice(1)]); assert.equal(e.app.State.doneCount(27), 0);
  e = await boot(e.st, "aiden", ports); e.app.startQuiz("full", 27);
  assert.equal(e.app.quiz.queue[0], set.id); e.app.submitAnswer(["3", "1"]); e.app.advance();
  assert.equal(e.app.quiz.queue[0], mixed.id); e.app.submitAnswer(correct);
  assert.equal(e.app.State.doneCount(27), 2); assert.equal(events.filter(e => e[0] === "finish").length, 0);
  e.app.advance(); assert.equal(events.filter(e => e[0] === "finish").length, 1);
});
