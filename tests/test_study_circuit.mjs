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
