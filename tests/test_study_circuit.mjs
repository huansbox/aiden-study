import test from "node:test";
import assert from "node:assert/strict";
import "../docs/study/circuit.js";
import "../docs/study/private-pack.js";
import { syntheticPack, syntheticPngData } from "./helpers/synthetic-study-pack.mjs";
import { circuitQuestion } from "./helpers/synthetic-circuit.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
const C = globalThis.StudyCircuit, P = globalThis.StudyPrivatePack;
const response = edges => ({ batteryPlaced: true, edges });
const straight = [["battery-positive", "bulb-base"], ["battery-negative", "bulb-shell"]];
const crossed = [["bulb-base", "battery-negative"], ["bulb-shell", "battery-positive"]];
const packFor = q => ({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1, questions: [q], explanations: { [q.id]: "Synthetic explanation" } });
const parse = q => P.parse(JSON.stringify(packFor(q)), [], null, true);
const plain = value => JSON.parse(JSON.stringify(value));
const draftKey = "study:operation-draft:aiden";
const partial = { batteryPlaced: true, edges: [["battery-positive", "bulb-shell"]], selected: "battery-negative" };
const circuitPorts = child => ({ publishedStudyUnits: [30], search: `?child=${child}&subject=science&term=g4-s1`,
  family: { allowed: () => true, ready: Promise.resolve(), profile: () => ({ terms: ["g4-s1"] }), task: () => null, setActive() {}, beginRound() {}, record() {}, finishRound() {} } });
async function startCircuit(st = storage(), child = "aiden", questions = [circuitQuestion()]) {
  const e = await boot(st, child, circuitPorts(child));
  if (!e.app.activePack) {
    const pack = syntheticPack(); pack.revision++;
    pack.questions.push(...questions);
    for (const q of questions) pack.explanations[q.id] = "Synthetic circuit explanation";
    e.app.importPrivatePack(JSON.stringify(pack));
    e.app.State.saveBatch("30", questions.map(q => q.id));
  }
  e.app.startQuiz("full", 30);
  // Exercise the real app's click handlers with DOM ports; rendering remains the real circuit renderer.
  const controls = [["place"], ["clear"], ["delete", "0"], ...C.IDS.map(id => ["terminal", id])]
    .map(([action, value]) => ({ disabled: false, dataset: { circuitAction: action, circuitValue: value } }));
  const query = e.window.document.querySelectorAll;
  e.window.document.querySelectorAll = selector => selector === "#circuit-panel [data-circuit-action]" ? controls : query(selector);
  e.app.quiz._renderCircuit();
  e.click = (action, value) => controls.find(button => button.dataset.circuitAction === action && button.dataset.circuitValue === value).onclick();
  return e;
}
function drawPartial(e) {
  e.click("place");
  for (const id of ["battery-positive", "bulb-shell", "battery-negative"]) e.click("terminal", id);
}

test("circuit grading accepts reversed wires and polarity while rejecting open, glass, shorted and repeated contacts", () => {
  assert.equal(C.grade(response(straight)), true);
  assert.equal(C.grade(response(crossed)), true);
  assert.equal(C.grade(response([...straight].reverse().map(edge => [...edge].reverse()))), true);
  for (const value of [C.initial(), { batteryPlaced: false, edges: straight }, response([straight[0]]),
    response([straight[0], straight[0]]), response([["battery-positive", "bulb-glass"], straight[1]]),
    response([["battery-positive", "battery-negative"], ["bulb-base", "bulb-shell"]]),
    response([["battery-positive", "bulb-base"], ["battery-positive", "bulb-shell"]]),
    response([["battery-positive", "battery-positive"], straight[1]])]) assert.equal(C.grade(value), false);
});

test("circuit manipulation requires placing the cell and supports deleting and redrawing wires", () => {
  let value = C.update(C.initial(), "terminal", "bulb-base"); assert.equal(value.selected, null);
  value = C.update(value, "place");
  for (const id of straight.flat()) value = C.update(value, "terminal", id);
  assert.equal(C.grade(value), true);
  value = C.update(value, "delete", "0"); assert.equal(value.edges.length, 1);
  value = C.update(value, "terminal", "battery-positive"); value = C.update(value, "terminal", "bulb-glass");
  assert.equal(C.complete(value), true); assert.equal(C.grade(value), false);
  assert.deepEqual(C.update(value, "clear"), C.initial());
});

test("circuit draft restoration accepts incomplete work without sharing mutable edges and rejects impossible state", () => {
  const saved = structuredClone(partial), restored = C.restore(saved);
  assert.deepEqual(restored, partial);
  restored.edges[0][0] = "bulb-glass";
  assert.deepEqual(saved, partial);
  for (const state of [null, {}, { ...partial, batteryPlaced: "true" }, { ...partial, edges: {} },
    { ...partial, edges: [["battery-positive", "unknown"]] }, { ...partial, edges: [["bulb-base", "bulb-base"]] },
    { ...partial, edges: [...straight, straight[0]] }, { ...partial, edges: [straight[0], [...straight[0]].reverse()] },
    { ...partial, selected: "unknown" }, { ...partial, selected: undefined }, { ...partial, batteryPlaced: false },
    { ...partial, edges: straight }]) assert.deepEqual(C.restore(state), C.initial());
});

test("Study circuit clicks preserve the battery, wire and pending endpoint across reload only for the same child", async () => {
  let e = await startCircuit();
  drawPartial(e);
  assert.deepEqual(JSON.parse(e.st.getItem(draftKey)).state, partial);
  e.app.submitAnswer(e.app.quiz._circuitResponse);
  assert.equal(e.app.quiz.isAnswered, false, "an incomplete submission must retain the draft");
  const sibling = await startCircuit(e.st, "bingpu");
  assert.deepEqual(plain(sibling.app.quiz._circuitResponse), C.initial());
  assert.deepEqual(JSON.parse(e.st.getItem(draftKey)).state, partial);
  e = await startCircuit(e.st);
  assert.deepEqual(plain(e.app.quiz._circuitResponse), partial);
  assert.match(e.node("circuit-panel").innerHTML, /data-circuit-value="battery-negative"[^>]*aria-pressed="true"/);
  e.click("terminal", "bulb-base");
  assert.equal(e.node("circuit-submit").disabled, false);
  e = await startCircuit(e.st);
  assert.equal(C.grade(plain(e.app.quiz._circuitResponse)), true, "both completed wires also survive reload");
  e.click("delete", "0");
  e = await startCircuit(e.st);
  assert.deepEqual(plain(e.app.quiz._circuitResponse), { batteryPlaced: true, edges: [["battery-negative", "bulb-base"]], selected: null });
  e.click("clear");
  assert.equal(e.st.getItem(draftKey), "");
  e = await startCircuit(e.st);
  assert.deepEqual(plain(e.app.quiz._circuitResponse), C.initial());
});

test("Study circuit ignores damaged, oversized, other-question and changed-semantic drafts", async () => {
  const q = circuitQuestion(), envelope = { id: q.id, semantic: P.semantic(q), state: partial };
  const changed = structuredClone(q); changed.circuit.terminals[2].x++;
  const e = await startCircuit();
  for (const raw of ["{", " ".repeat(262145), JSON.stringify({ ...envelope, id: "different-question" }),
    JSON.stringify({ ...envelope, semantic: P.semantic(changed) }), JSON.stringify({ ...envelope, state: { ...partial, edges: [["bad", "bulb-base"]] } })]) {
    e.st.setItem(draftKey, raw);
    const resumed = await startCircuit(e.st);
    assert.deepEqual(plain(resumed.app.quiz._circuitResponse), C.initial());
  }
});

test("Study circuit clears graded drafts before retry or a new question and clears explicit practice resets", async () => {
  const second = { ...circuitQuestion(), id: "science-g4s1-synthetic-circuit-second-v1" };
  let e = await startCircuit(storage(), "aiden", [circuitQuestion(), second]);
  drawPartial(e); e.click("terminal", "bulb-glass");
  e.node("circuit-submit").onclick();
  assert.equal(e.app.quiz.answered.at(-1).correct, false);
  assert.equal(e.st.getItem(draftKey), "");
  e.app.advance();
  assert.equal(e.app.quiz.activeQuestionId, second.id);
  assert.deepEqual(plain(e.app.quiz._circuitResponse), C.initial());
  drawPartial(e); e.click("terminal", "bulb-base");
  e.node("circuit-submit").onclick();
  assert.equal(e.st.getItem(draftKey), "");
  e.app.advance();
  assert.equal(e.app.quiz.activeQuestionId, circuitQuestion().id);
  assert.deepEqual(plain(e.app.quiz._circuitResponse), C.initial(), "the wrong answer must not reappear on retry");
  for (const reset of ["_resetChallenge", "_resetAndStartFull"]) {
    drawPartial(e);
    await e.window[reset](30);
    assert.equal(e.st.getItem(draftKey), "");
    e = await startCircuit(e.st);
    assert.deepEqual(plain(e.app.quiz._circuitResponse), C.initial());
  }
});

test("circuit contract is limited to science 30 and keeps fixed neutral terminals immutable", () => {
  const q = circuitQuestion(); parse(q);
  for (const [width, height] of [[1, 1], [130, 90], [180, 260], [90, 129], [89, 130]]) {
    const invalid = structuredClone(q);
    invalid.material.data = syntheticPngData(8, 6, width, height);
    assert.throws(() => parse(invalid), /PNG/);
  }
  for (const mutate of [q => { q.unit = 29; }, q => { q.answer = "open"; }, q => { q.options = ["A"]; },
    q => { delete q.material; }, q => { q.circuit.terminals.pop(); },
    q => { q.circuit.terminals[2].id = "anything"; }, q => { q.circuit.terminals[2].x = 1; },
    q => { q.circuit.terminals[4] = { ...q.circuit.terminals[3], id: "bulb-base" }; }]) {
    const invalid = structuredClone(q); mutate(invalid); assert.throws(() => parse(invalid));
  }
  const moved = structuredClone(q); moved.circuit.terminals[2].x++;
  assert.notEqual(P.semantic(q), P.semantic(moved));
  assert.doesNotMatch(C.render(q, C.initial()), /玻璃|螺紋|金屬|底部/);
});

test("circuit wrong then correct uses one activity and rewards only after the batch", async () => {
  const events = [], family = { allowed: () => true, ready: Promise.resolve(), profile: () => ({ terms: ["g4-s1"] }), task: () => null,
    setActive() {}, beginRound() {}, record: e => events.push(["record", e]), finishRound: () => events.push(["finish"]) };
  const ports = { family, publishedStudyUnits: [30], search: "?child=aiden&subject=science&term=g4-s1" };
  let e = await boot(storage(), "aiden", ports);
  const pack = syntheticPack(), q = circuitQuestion(); pack.revision++;
  pack.questions.push(q); pack.explanations[q.id] = "Synthetic circuit explanation";
  e.app.importPrivatePack(JSON.stringify(pack)); e.app.State.saveBatch("30", [q.id]); e.app.startQuiz("full", 30);
  assert.match(e.node("page-quiz").innerHTML, /circuit-panel/);
  assert.match(e.node("circuit-panel").innerHTML, /放入一顆電池/);
  e.app.submitAnswer(C.initial()); assert.equal(events.length, 0);
  e.app.submitAnswer(response([["battery-positive", "bulb-glass"], straight[1]]));
  assert.equal(e.app.State.doneCount(30), 0); assert.equal(events.length, 1);
  e = await boot(e.st, "aiden", ports); e.app.startQuiz("full", 30);
  assert.equal(e.app.quiz._circuitResponse.batteryPlaced, false);
  e.app.submitAnswer(response(crossed));
  assert.equal(e.app.State.doneCount(30), 1); assert.equal(events.filter(e => e[0] === "finish").length, 0);
  e.app.advance(); assert.equal(events.filter(e => e[0] === "finish").length, 1);
});
