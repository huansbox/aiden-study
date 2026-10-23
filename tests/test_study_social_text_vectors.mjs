import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { buildCatalog } from "../scripts/build_private_study_catalog.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
import { socialTextVectorsSyntheticPack } from "./helpers/synthetic-study-pack.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
const pack = () => socialTextVectorsSyntheticPack();
const question = kind => pack().questions.at(kind === "text" ? -2 : -1);
const raw = value => JSON.stringify(value);
const parse = value => globalThis.StudyPrivatePack.parse(raw(value));
const shard = q => ({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1, questions: [q], explanations: { [q.id]: "原創合成解說" } });
const parseQuestion = q => globalThis.StudyPrivatePack.parse(raw(shard(q)), [], null, true);
await import("../docs/study/answer.js");
const { gradeBlanks, hasCompleteBlanks, isBlankCorrect } = globalThis.StudyAnswer;

test("text normalization accepts only complete canonical/alias strings; Unicode length and empty input guards", () => {
  const q = question("text");
  for (const value of ["Alpha", " Ａｌｐｈａ　", "甲城"]) assert.equal(isBlankCorrect(q.blanks[0], value, true), true);
  for (const value of ["alpha", "Al pha", "Alpha town", "甲", "甲城鎮", "", "　", "錯詞"]) assert.equal(isBlankCorrect(q.blanks[0], value, true), false);
  assert.equal(gradeBlanks({ ...q, subject: "chinese", unit: 1 }, ["Al pha", "<b>合成</b>"]).correct, true, "legacy public text retains internal-whitespace equivalence");
  assert.equal(gradeBlanks(q, [" Ａｌｐｈａ ", "乙鎮"]).correct, true);
  for (const values of [[], ["Alpha"], ["Alpha", "　"], ["Alpha", "乙鎮", "多餘"], Array(2), ["😀".repeat(101), "乙鎮"]]) {
    assert.equal(hasCompleteBlanks(q, values), false);
    assert.equal(gradeBlanks(q, values).correct, false);
  }
  assert.equal(hasCompleteBlanks(q, ["😀".repeat(100), "乙鎮"]), true);
});

test("two complete permutations pass; duplicate pair and unrelated last-two swap fail with one-vector feedback", () => {
  const q = question("vectors");
  assert.equal(gradeBlanks(q, ["1", "2", "3", "4"]).correct, true);
  assert.equal(gradeBlanks(q, ["2", "1", "3", "4"]).correct, true);
  assert.deepEqual(gradeBlanks(q, ["2", "2", "3", "4"]), { correct: false, results: [false, true, true, true], answers: ["1", "2", "3", "4"] });
  // The nearest noncanonical vector disagrees with canonical in the wrong second blank.
  assert.deepEqual(gradeBlanks(q, ["2", "3", "3", "4"]), { correct: false, results: [true, false, true, true], answers: ["2", "1", "3", "4"] });
  assert.equal(gradeBlanks(q, ["2", "1", "4", "3"]).correct, false);
  assert.deepEqual(gradeBlanks(q, ["2", "1", "3", "3"]).results, [true, true, true, false]);
  delete q.acceptedAnswers;
  assert.equal(gradeBlanks(q, ["2", "1", "3", "4"]).correct, false, "old select keeps canonical-only scoring");
});

test("social23 parser rejects cross-scope, mixed inputs, invalid aliases and malformed complete vectors", () => {
  parse(pack());
  const invalidText = [
    q => { q.subject = "math"; q.unit = 17; q.id = q.id.replace("social-", "math-"); },
    q => { q.subject = "science"; q.unit = 21; q.id = q.id.replace("social-", "science-"); },
    q => { q.unit = 22; }, q => { q.options = ["甲", "乙"]; }, q => { q.answer = "Alpha"; },
    q => { q.acceptedAnswers = [["1", "2"]]; }, q => { q.extra = "unknown"; },
    q => { q.blanks[1] = { input: "select", answer: "1" }; },
    ...[null, "甲", Array(9).fill("甲"), ["Ａｌｐｈａ"], ["甲城", "　甲城 "], ["　"], ["\ufeff"], [1], ["甲".repeat(21)]].map(aliases => q => { q.blanks[0].aliases = aliases; }),
    ...["", "　", "\ufeff", "甲".repeat(21), 1].map(answer => q => { q.blanks[0].answer = answer; }),
    q => { q.blanks[0].unknown = "x"; }, q => { q.blanks = []; }, q => { q.text = "missing markers"; },
  ];
  for (const mutate of invalidText) { const q = question("text"); mutate(q); assert.throws(() => parseQuestion(q)); }
  for (const count of [1, 20]) { const q = question("text"); q.blanks[0] = { input: "text", answer: "😀".repeat(count) }; parseQuestion(q); }
  const aliasesBoundary = question("text"); aliasesBoundary.blanks[0].aliases = Array.from({ length: 8 }, (_, i) => `合成別名${i}`); parseQuestion(aliasesBoundary);
  const vectorsBoundary = question("vectors"); vectorsBoundary.acceptedAnswers = [["1", "2", "3", "4"], ...Array.from({ length: 7 }, (_, i) => [String(i % 4 + 1), String(Math.floor(i / 4) + 1), "1", "1"])]; parseQuestion(vectorsBoundary);
  const invalidVectors = [
    q => { q.blanks[0].aliases = ["1"]; }, q => { q.unit = 22; },
    ...[null, [], "12", [["2", "1", "3", "4"]], [["1", "2", "3", "4"], ["1", "2", "3", "4"]], [["1", "2"]], [[1, "2", "3", "4"]], [["1", "2", "3", "5"]], [["01", "2", "3", "4"]], Array(9).fill(["1", "2", "3", "4"])].map(acceptedAnswers => q => { q.acceptedAnswers = acceptedAnswers; }),
  ];
  for (const mutate of invalidVectors) { const q = question("vectors"); mutate(q); assert.throws(() => parseQuestion(q)); }
});

test("same-ID aliases and vector edits are immutable in import and catalog converter; absent old fields keep semantic shape", async () => {
  const original = pack();
  for (const mutate of [p => p.questions.at(-2).blanks[0].aliases.push("甲都"), p => p.questions.at(-1).acceptedAnswers.pop()]) {
    const changed = pack(); changed.revision++; mutate(changed);
    assert.throws(() => globalThis.StudyPrivatePack.parse(raw(changed), [], original), /相同 ID/);
    await assert.rejects(buildCatalog(changed, original, []), /相同題號/);
  }
  const q = question("vectors"); delete q.acceptedAnswers;
  assert.equal(globalThis.StudyPrivatePack.semantic(q), raw([q.subject, q.unit, q.subtopic, q.type, q.text, q.options, q.answer, q.blanks.map(b => [b.input, b.answer]), null, null]));
});

test("real Worker shard parser accepts both seams, rejects invalid vectors, and serves only authorized GET without progress writes", async () => {
  const built = await buildCatalog(pack(), pack(), []);
  const kv = kvStub();
  for (const [hash, bytes] of built.shards) await kv.put(`c:study:shard:${hash}`, bytes);
  await kv.put("c:study:catalog:v2", raw(built.manifest));
  let writes = 0;
  const originalPut = kv.put.bind(kv); kv.put = (...args) => { writes++; return originalPut(...args); };
  for (const descriptor of built.manifest.shards.filter(d => d.unit === 23)) {
    const url = `https://synthetic.invalid/v1/packs/g4-s1-math-u1/shards/${descriptor.hash}`;
    const request = method => new Request(url, { method, headers: { Authorization: "Bearer synthetic-token" } });
    const response = await worker.fetch(request("GET"), { KV: kv, TOKEN: "synthetic-token" });
    assert.equal(response.status, 200);
    assert.equal((await worker.fetch(new Request(url), { KV: kv, TOKEN: "synthetic-token" })).status, 401);
    assert.equal((await worker.fetch(request("POST"), { KV: kv, TOKEN: "synthetic-token" })).status, 405);
  }
  assert.equal(writes, 0);
  const bad = question("vectors"); bad.acceptedAnswers[1][0] = "9";
  const bytes = raw(shard(bad));
  const hash = (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex");
  await kv.put(`c:study:shard:${hash}`, bytes);
  assert.equal((await worker.fetch(new Request(`https://synthetic.invalid/v1/packs/g4-s1-math-u1/shards/${hash}`, { headers: { Authorization: "Bearer synthetic-token" } }), { KV: kv, TOKEN: "synthetic-token" })).status, 500);
});

test("child partial input never records; text retry survives reload and family rewards wait until round end", async () => {
  let records = 0, finishes = 0;
  const family = { ready: Promise.resolve(), allowed: () => true, profile: () => ({ terms: ["g4-s1"] }), task: () => null, beginRound() {}, record() { records++; }, finishRound() { finishes++; }, setActive() {} };
  const ports = { search: "?child=test-child&subject=social&term=g4-s1", family };
  let e = await boot(storage(), "test-child", ports);
  e.node("fill-input-panel").querySelector = () => e.node("fib-text");
  const p = pack(), q = p.questions.at(-2);
  e.app.importPrivatePack(raw(p)); e.app.State.saveBatch("23", [q.id]); e.app.startQuiz("full", 23);
  e.app.submitAnswer(["Alpha", "　"]);
  assert.equal(e.app.quiz.isAnswered, false); assert.equal(records, 0);
  e.app.submitAnswer(["錯詞", "乙鎮"]);
  assert.equal(records, 1); assert.equal(finishes, 0); assert.equal(e.app.State.doneCount(23), 0);
  e = await boot(e.st, "test-child", ports); e.node("fill-input-panel").querySelector = () => e.node("fib-text"); e.app.startQuiz("full", 23);
  assert.deepEqual(plain(e.app.quiz.queue), [q.id]);
  e.app.submitAnswer([" Ａｌｐｈａ ", "乙鎮"]);
  assert.equal(records, 2); assert.equal(finishes, 0); assert.equal(e.app.State.doneCount(23), 1);
  e.app.advance(); assert.equal(finishes, 1);
});

test("preview shares grading, renders native text inputs and inert markup, and never accesses child storage", () => {
  let forbidden = 0;
  const host = { innerHTML: "", addEventListener() {}, removeEventListener() {}, querySelector() { return null; } };
  const context = vm.createContext({ document: { getElementById() { return null; } }, URLSearchParams, location: { search: "" }, addEventListener() {} });
  for (const key of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "State", "Storage"]) Object.defineProperty(context, key, { get() { forbidden++; throw Error(key); } });
  for (const file of ["private-pack.js", "answer.js", "material.js", "science-topics.js", "preview.js"]) vm.runInContext(readFileSync(new URL(`../docs/study/${file}`, import.meta.url), "utf8"), context);
  const app = context.StudyPreview.mount({ root: host, pack: pack() });
  app.handle("subject", { value: "social" }); app.handle("unit", { value: "23" }); app.handle("question", { index: "3" });
  assert.match(host.innerHTML, /type="text" inputmode="text" maxlength="200"/);
  app.handle("answer-number", { index: "0", value: " Ａｌｐｈａ " }); app.handle("check"); assert.equal(app.state.result, "");
  app.handle("answer-number", { index: "1", value: "乙鎮" }); app.handle("check"); assert.equal(app.state.result, "correct");
  assert.match(host.innerHTML, /&lt;b&gt;合成&lt;\/b&gt;/); assert.doesNotMatch(host.innerHTML, /<b>合成<\/b>/);
  app.handle("question", { index: "4" });
  for (const [index, value] of ["2", "2", "3", "4"].entries()) app.handle("answer-select", { index, value });
  app.handle("check"); assert.equal(app.state.result, "wrong");
  app.handle("answer-select", { index: 1, value: "1" }); app.handle("check"); assert.equal(app.state.result, "correct");
  assert.equal(forbidden, 0);
  app.destroy();
});
