import test from "node:test";
import assert from "node:assert/strict";
import "../docs/study/private-pack.js";
import "../docs/study/answer.js";
import "../docs/study/math-input.js";
import "../docs/study/math-interactions.js";
import { finalMathQuestion, choiceSetQuestion } from "./helpers/synthetic-final-math.mjs";
import { syntheticPack, syntheticPngData } from "./helpers/synthetic-study-pack.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
const P = globalThis.StudyPrivatePack, A = globalThis.StudyAnswer, M = globalThis.StudyMathInput;
const parse = q => P.parse(JSON.stringify({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1,
  questions: [q], explanations: { [q.id]: "Synthetic explanation" } }), [], null, true);
const correct = ["12", ".52", "3 3/6", "2", "合成別名", ">"];

test("answered math navigation identifies every correct and incorrect blank", () => {
  const q = finalMathQuestion(), state = M.initial(q);
  state.values = correct;
  const html = M.render(q, state, true, [false, true, true, true, false, true]);
  assert.match(html, /第 1 空（要修正）/);
  assert.match(html, /第 2 空（答對）/);
  assert.match(html, /第 5 空（要修正）/);
});

test("math mixed inputs are scoped and preserve original choices, forms and answer bounds", () => {
  const q = finalMathQuestion(); parse(q); parse(choiceSetQuestion());
  for (const mutate of [q => { q.unit = 15; }, q => { q.blanks[0].accept = ["13"]; },
    q => { q.blanks[1].answer = "0.521"; }, q => { q.blanks[2].form = "unbounded"; },
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

test("fractions accept equivalent values while enforcing form and explicit denominator", () => {
  const q = { ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "fraction", answer: "3 3/6", form: "mixed" }] };
  for (const input of ["3 3/6", "03 03/06", "3 1/2", "3 100000/200000"]) assert.equal(A.gradeBlanks(q, [input]).correct, true);
  for (const input of ["21/6", "3.5", "3 3/0", "3", "3 1000000/2000000"]) assert.equal(A.gradeBlanks(q, [input]).correct, false);
  q.blanks[0].denominator = 6; parse(q);
  assert.equal(A.gradeBlanks(q, ["3 1/2"]).correct, false);
  assert.equal(A.gradeBlanks(q, ["3 3/6"]).correct, true);
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

const intervalQuestion = () => ({ ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "fraction_interval", answer: "", form: "mixed", count: 2, distinct: true, range: { min: [2, 1], max: [5, 2], minInclusive: false, maxInclusive: false } }] });
test("open fraction intervals require exact, distinct values and the requested form", () => {
  const q = intervalQuestion(); parse(q);
  for (const values of [["2 1/3", "2 1/4"], ["2 2/9", "2 4/9"], ["2 333332/999999", "2 333333/999999"]]) assert.equal(A.gradeBlanks(q, [values]).correct, true);
  for (const values of [["2 1/3", "2 2/6"], ["2 1/2", "2 1/3"], ["2", "2 1/3"], ["7/3", "9/4"], ["2 1/3"], ["2 1/3", ""], ["2 1/0", "2 1/3"]]) assert.equal(A.gradeBlanks(q, [values]).correct, false);
  assert.equal(A.hasCompleteBlanks(q, [["2 1/3", ""]]), false);
  assert.match(A.gradeBlanks(q, [["2 1/3", "2 2/6"]]).answers[0], /數值不同.*2 < 答案 < 5\/2/);
  const changed = structuredClone(q); changed.blanks[0].range.maxInclusive = true;
  assert.notEqual(P.semantic(q), P.semantic(changed));
  assert.equal(A.gradeBlanks(changed, [["2 1/2", "2 1/3"]]).correct, true);
  for (const mutate of [b => b.count = 5, b => b.distinct = false, b => b.form = "any", b => b.answer = "2 1/3", b => b.range.min = [5, 2], b => b.range.max = [9007199254740992, 1], b => b.range.min = [2, 0], b => b.range.extra = true]) {
    const invalid = intervalQuestion(); mutate(invalid.blanks[0]); assert.throws(() => parse(invalid));
  }
});
test("decimal ranges accept the continuous two-place interval including explicit endpoints", () => {
  const q = { ...intervalQuestion(), blanks: [{ input: "decimal", answer: "7.9", range: { min: [78, 10], max: [8, 1], minInclusive: true, maxInclusive: false } }] };
  parse(q);
  for (const v of ["7.8", "7.81", "7.90", "7.99"]) assert.equal(A.gradeBlanks(q, [v]).correct, true);
  for (const v of ["7.79", "8", "7.999", "7.9cm", "79e-1"]) assert.equal(A.gradeBlanks(q, [v]).correct, false);
  for (const mutate of [b => b.answer = "8", b => b.range.max = [1, 0], b => b.range.minInclusive = 1, b => b.range.max = [100000000, 1]]) {
    const invalid = structuredClone(q); mutate(invalid.blanks[0]); assert.throws(() => parse(invalid));
  }
  const changed = structuredClone(q); changed.blanks[0].range.maxInclusive = true;
  assert.notEqual(P.semantic(q), P.semantic(changed));
});
test("fraction interval UI keeps separate entries and cannot submit a partially filled pair", () => {
  const q = intervalQuestion(); let state = M.initial(q);
  for (const [field, value] of [["0:whole", "2"], ["0:numerator", "1"], ["0:denominator", "3"]]) state = M.update(q, state, "fraction", value, field);
  assert.equal(M.complete(q, state), false);
  for (const [field, value] of [["1:whole", "2"], ["1:numerator", "1"], ["1:denominator", "4"]]) state = M.update(q, state, "fraction", value, field);
  assert.deepEqual(state.values, [["2 1/3", "2 1/4"]]); assert.equal(M.complete(q, state), true);
  assert.equal(A.gradeBlanks(q, state.values).correct, true);
  assert.match(M.render(q, state), /第 2 個答案/);
  assert.match(M.render(q, state, true, [false]), /數值不同/);
});
test("proper fractions reject mixed and improper forms and equivalent written denominators remain optional", () => {
  const q = { ...intervalQuestion(), blanks: [{ input: "fraction", answer: "2/6", form: "proper" }] }; parse(q);
  assert.equal(A.gradeBlanks(q, ["1/3"]).correct, true);
  for (const v of ["1 1/3", "4/3", "0.33"]) assert.equal(A.gradeBlanks(q, [v]).correct, false);
  q.blanks[0].denominator = 2; assert.throws(() => parse(q));
});

test("decimal expression accepts a valid bounded method rather than only the final number", () => {
  const q = { ...intervalQuestion(), unit: 25, blanks: [{ input: "decimal_expression", answer: "6.8-1.25", value: "5.55" }] };
  parse(q);
  for (const v of ["6.8-1.25", "（６.８０－１.２５）＝５.５５", "6.80-(1.25)=5.55"]) assert.equal(A.gradeBlanks(q, [v]).correct, true);
  for (const v of ["5.55", "5+0.55", "6.8-1.25=5.56", "6.8-1.250", "6.8/1.25"]) assert.equal(A.gradeBlanks(q, [v]).correct, false);
  assert.match(M.render(q, M.initial(q)), /列式/);
  assert.match(A.gradeBlanks(q, ["5.55"]).answers[0], /6.8-1.25＝5.55/);
  const changed = structuredClone(q); changed.blanks[0].value = "5.54";
  assert.notEqual(P.semantic(q), P.semantic(changed)); assert.throws(() => parse(changed));
  q.unit = 27; assert.throws(() => parse(q));
});

test("guided decimal conversion, method and result remain one Study activity", async () => {
  const events = [], family = { allowed: () => true, ready: Promise.resolve(), profile: () => ({ terms: ["g4-s1"] }), task: () => null,
    setActive() {}, beginRound() {}, record: e => events.push(["record", e]), finishRound: () => events.push(["finish"]) };
  const q = { ...finalMathQuestion(), unit: 25, options: [], text: "Synthetic conversion （１）, method （２）, result （３）", blanks: [
    { input: "decimal", answer: "6.8" }, { input: "decimal_expression", answer: "6.8-1.25", value: "5.55" }, { input: "decimal", answer: "5.55" }
  ] };
  const e = await boot(storage(), "aiden", { family, publishedStudyUnits: [25], search: "?child=aiden&subject=math&term=g4-s1" }), pack = syntheticPack();
  pack.questions.push(q); pack.explanations[q.id] = "Synthetic guided conversion";
  e.app.importPrivatePack(JSON.stringify(pack)); e.app.State.saveBatch("25", [q.id]); e.app.startQuiz("full", 25);
  e.app.submitAnswer(["6.8", "5.55", "5.55"]); assert.equal(e.app.State.doneCount(25), 0);
  e.app.advance(); e.app.submitAnswer(["6.8", "6.80-(1.25)=5.55", "5.55"]);
  assert.equal(e.app.State.doneCount(25), 1); assert.equal(events.filter(e => e[0] === "finish").length, 0);
  e.app.advance(); assert.equal(events.filter(e => e[0] === "finish").length, 1);
});


test("free fraction form retains integers, fractions and standard mixed numbers without treating blanks as zero", () => {
  const q = { ...finalMathQuestion(), options: [], text: "Synthetic （１）", blanks: [{ input: "fraction", form: "any", answer: "7/3" }] };
  parse(q);
  for (const v of ["7/3", "2 1/3", "14/6", "0 7/3"]) assert.equal(A.gradeBlanks(q, [v]).correct, v !== "0 7/3");
  for (const v of ["2 7/3", "2.333333", "7÷3", "7/0", "", " /3", "-7/3", "1/1000000"]) assert.equal(A.gradeBlanks(q, [v]).correct, false);
  q.blanks[0].answer="2"; parse(q);
  for(const v of ["2", "4/2", "2 0/3"]) assert.equal(A.gradeBlanks(q,[v]).correct,true);
  q.blanks[0].answer="0";parse(q);
  for(const v of ["0", "0/3", "0 0/7"]) assert.equal(A.gradeBlanks(q,[v]).correct,true);
  let state=M.initial(q);state=M.update(q,state,"fraction","0","whole");assert.equal(M.complete(q,state),true);
  state=M.update(q,state,"fraction","","whole");assert.equal(M.complete(q,state),false);
  state=M.update(q,state,"fraction","0","numerator");assert.equal(M.complete(q,state),false);
  state=M.update(q,state,"fraction","3","denominator");assert.deepEqual(state.values,["0/3"]);
  assert.match(M.render(q,state),/整數部分/);assert.equal(A.gradeBlanks(q,state.values).correct,true);
  assert.notEqual(P.semantic(q),P.semantic({...q,blanks:[{...q.blanks[0],form:"mixed_or_whole"}]}));
});
