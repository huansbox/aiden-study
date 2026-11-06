import test from "node:test";
import assert from "node:assert/strict";
import { appendCatalog, buildCatalog } from "../scripts/build_private_study_catalog.mjs";
import { syntheticPack, syntheticPngData } from "./helpers/synthetic-study-pack.mjs";
import "../docs/shared/family-core.js";
import { boot, storage } from "./helpers/study-harness.mjs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";

const P = globalThis.StudyPrivatePack, C = globalThis.StudyPackCatalog;
const units = { math: [24, 25, 26, 27, 28], science: [29, 30], social: [31, 32] };
const question = (subject, unit) => ({
  id: `${subject}-g4s1-synthetic-final-${unit}-v1`, subject, unit,
  type: "multiple_choice", text: "Synthetic question", subtopic: "Synthetic topic",
  options: ["A", "B", "C", "D"], answer: "1", source: "Synthetic source",
});
const parse = q => P.parse(JSON.stringify({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1,
  questions: [q], explanations: { [q.id]: "Synthetic explanation" } }), [], null, true);
const perPartQuestion = () => ({ ...question("social", 31), type: "grouped_choice", options: [], answer: "23",
  parts: [{ id: "a", text: "Synthetic first question", options: ["First A", "First B"] },
    { id: "b", text: "Synthetic second question", options: ["Second A", "Second B", "Second C"] }] });

test("final candidate units parse and route by subject but remain unpublished", async () => {
  const pack = syntheticPack(); pack.revision++;
  for (const [subject, ids] of Object.entries(units)) for (const unit of ids) {
    const q = question(subject, unit); parse(q);
    pack.questions.push(q); pack.explanations[q.id] = "Synthetic explanation";
    assert.equal(globalThis.KidsFamilyCore.STUDY_UNITS.find(u => u.id === unit).published, false);
    for (const wrong of Object.keys(units).filter(s => s !== subject)) {
      assert.throws(() => parse({ ...q, subject: wrong, id: q.id.replace(subject, wrong) }));
    }
  }
  const built = await buildCatalog(pack, syntheticPack());
  for (const [subject, ids] of Object.entries(units)) for (const unit of ids) {
    const descriptor = built.manifest.shards.find(s => s.unit === unit);
    assert.equal(descriptor.subject, subject);
    assert.equal(C.count(built.manifest, unit), 1);
    await C.verifyShard(built.shards.get(descriptor.hash), descriptor);
  }
});

test("final media and selection extensions preserve old unit and type guards", () => {
  const material = { kind: "png", data: syntheticPngData(), alt: "Synthetic diagram" };
  for (const unit of [29, 30]) {
    parse({ ...question("science", unit), material });
    assert.throws(() => parse({ ...question("science", unit), type: "fill_in_blank", answer: "",
      options: ["A", "B"], text: "Synthetic （１）", blanks: [{ input: "select", answer: "1" }] }));
  }
  for (const unit of [31, 32]) {
    const q = { ...question("social", unit), material, type: "fill_in_blank", answer: "",
      text: "Synthetic （１）", options: ["A", "B"], blanks: [{ input: "select", answer: "1" }] };
    parse(q);
    assert.throws(() => parse({ ...q, material: { kind: "table", caption: "Synthetic", columns: ["A", "B"], rows: [["1", "2"]] } }));
    assert.throws(() => parse({ ...q, blanks: [{ input: "select", answer: "3" }] }));
    assert.throws(() => parse({ ...q, acceptedAnswers: [["1"]] }));
    assert.throws(() => parse({ ...q, options: [], blanks: [{ input: "text", answer: "A" }] }));
  }
  for (const unit of units.math) assert.throws(() => parse({ ...question("math", unit), material }));
});

test("appending a batch preserves every old shard byte and rejects incomplete or changed baselines", async () => {
  const baseline = syntheticPack(), old = await buildCatalog(baseline, baseline, [], 1100);
  assert.ok(old.shards.size > 1);
  const next = structuredClone(baseline); next.revision++;
  const q = { ...question("math", 24), unit: 15 };
  next.questions.push(q); next.explanations[q.id] = "Synthetic explanation";
  const result = await appendCatalog(next, baseline, old.manifest, old.shards, [], 1100);
  assert.deepEqual(result.manifest.shards.slice(0, old.manifest.shards.length), old.manifest.shards);
  assert.equal(result.manifest.shards.length, old.manifest.shards.length + 1);
  for (const [hash, raw] of old.shards) assert.equal(result.shards.get(hash), raw);
  await assert.rejects(appendCatalog(next, baseline, old.manifest, new Map()), /缺件/);
  for (const mutate of [
    p => { p.questions[0].answer = "4"; },
    p => { p.explanations[p.questions[0].id] += "changed"; },
    p => { p.questions.shift(); },
  ]) {
    const changed = structuredClone(next); mutate(changed);
    await assert.rejects(appendCatalog(changed, baseline, old.manifest, old.shards), /不可修改或移除/);
  }
  const rebuilt = await appendCatalog(baseline, baseline, old.manifest, old.shards);
  assert.deepEqual(rebuilt.manifest, old.manifest);
  assert.deepEqual(rebuilt.shards, old.shards);
});

test("per-part choices are scoped, bounded and immutable independently of the shared answer string", () => {
  const q = perPartQuestion(); parse(q); parse({ ...q, unit: 32 });
  for (const mutate of [
    q => { q.unit = 22; }, q => { q.unit = 23; },
    q => { q.subject = "science"; q.unit = 29; q.id = q.id.replace("social", "science"); },
    q => { q.options = ["A", "B"]; }, q => { delete q.parts[1].options; },
    q => { q.parts[0].options = ["A"]; }, q => { q.parts[0].options.push("C", "D", "E"); },
    q => { q.parts[0].options[0] = " "; }, q => { q.answer = "33"; },
  ]) { const invalid = structuredClone(q); mutate(invalid); assert.throws(() => parse(invalid)); }
  const altered = structuredClone(q); altered.parts[0].options.reverse();
  assert.notEqual(P.semantic(q), P.semantic(altered));
});

test("the authenticated Worker serves and validates per-part choice shards", async () => {
  const pack = syntheticPack(), q = perPartQuestion(); pack.revision++;
  pack.questions.push(q); pack.explanations[q.id] = "Synthetic explanation";
  const built = await buildCatalog(pack, syntheticPack());
  const descriptor = built.manifest.shards.find(s => s.unit === 31);
  const env = { TOKEN: "synthetic-token", KV: kvStub({
    "c:study:catalog:v2": { value: JSON.stringify(built.manifest) },
    [`c:study:shard:${descriptor.hash}`]: { value: built.shards.get(descriptor.hash) },
  }) };
  const url = `https://family.invalid/v1/packs/g4-s1-math-u1/shards/${descriptor.hash}`;
  const response = await worker.fetch(new Request(url, { headers: { Authorization: "Bearer synthetic-token" } }), env);
  assert.equal(response.status, 200);
  const served = await C.verifyShard(await response.text(), descriptor);
  assert.deepEqual(served.questions[0].parts, q.parts);
  assert.equal((await worker.fetch(new Request(url), env)).status, 401);
});

test("per-part Study choices preserve one activity, old progress and batch-end reward through wrong answer and reload", async () => {
  const events = [], family = { allowed: () => true, ready: Promise.resolve(), profile: () => ({ terms: ["g4-s1"] }), task: () => null, remaining: () => 0,
    setActive() {}, beginRound() {}, record: event => events.push(["record", event]), finishRound: () => events.push(["finish"]) };
  const ports = { family, publishedStudyUnits: [31], search: "?child=aiden&subject=social&term=g4-s1" };
  let e = await boot(storage(), "aiden", ports);
  const pack = syntheticPack(), q = perPartQuestion(); pack.revision++;
  pack.questions.push(q); pack.explanations[q.id] = "Synthetic explanation";
  e.app.importPrivatePack(JSON.stringify(pack));
  e.app.State.addMastered(15, pack.questions[0].id);
  e.app.State.saveBatch("31", [q.id]); e.app.startQuiz("full", 31);
  assert.match(e.node("group-parts").innerHTML, /First B/);
  assert.doesNotMatch(e.node("group-parts").innerHTML, /Second C/);
  e.node("group-next").onclick();
  assert.match(e.node("group-parts").innerHTML, /Second C/);
  e.app.submitAnswer(["1", "1"]);
  assert.equal(e.app.State.doneCount(31), 0);
  assert.equal(events.filter(e => e[0] === "finish").length, 0);
  e = await boot(e.st, "aiden", ports); e.app.startQuiz("full", 31);
  assert.equal(e.app.State.doneCount(15), 1);
  assert.equal(e.app.quiz.queue[0], q.id);
  e.app.submitAnswer(["2", "3"]);
  assert.equal(e.app.State.doneCount(31), 1);
  assert.equal(events.filter(e => e[0] === "record").length, 2);
  assert.equal(events.filter(e => e[0] === "finish").length, 0);
  e.app.advance();
  assert.equal(events.filter(e => e[0] === "finish").length, 1);
});
