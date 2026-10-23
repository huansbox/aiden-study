import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { IDBFactory } from "fake-indexeddb";
import { buildCatalog } from "../scripts/build_private_study_catalog.mjs";
import { socialUnitTwoSyntheticPack } from "./helpers/synthetic-study-pack.mjs";
import { boot, storage } from "./helpers/study-harness.mjs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import "../docs/study/answer.js";

const answers = ["10", "2", "7", "7", "4", "8", "1"];
function fixture() {
  const p = socialUnitTwoSyntheticPack();
  p.revision = 22;
  const q = { id: "social-g4s1-synthetic-U1-bank-v1", subject: "social", unit: 22, type: "fill_in_blank",
    text: "原創合成題 " + [..."１２３４５６７"].map(n => `（${n}）`).join(" "), subtopic: "地圖與位置", source: "synthetic fixture only",
    options: Array.from({ length: 10 }, (_, i) => `合成詞語 ${i + 1}`), answer: "", blanks: answers.map(answer => ({ input: "select", answer })) };
  p.questions.push(q); p.explanations[q.id] = "原創合成解說：依指定線索選答。";
  return p;
}
const q = () => fixture().questions.at(-1);
const shard = question => ({ schemaVersion: 2, packId: "g4-s1-math-u1", revision: 1, questions: [question], explanations: { [question.id]: "原創合成解說" } });
const parse = question => globalThis.StudyPrivatePack.parse(JSON.stringify(shard(question)), [], null, true);
const C = globalThis.StudyPackCatalog;
const wait = async () => { for (let n = 0; n < 15; n++) await new Promise(resolve => setImmediate(resolve)); };

test("unit22 accepts complete select bank; text, aliases, vectors and invalid cross-scope remain rejected", () => {
  const parsed = parse(q()).questions[0];
  assert.deepEqual(parsed.options, q().options);
  assert.deepEqual(parsed.blanks.map(b => b.answer), answers);
  for (const mutate of [
    q => { q.acceptedAnswers = [answers]; }, q => { q.blanks[0].aliases = ["甲"]; },
    q => { q.options = []; q.blanks = [{ input: "text", answer: "甲" }]; },
    q => { q.blanks[0].input = "text"; }, q => { q.blanks[0].input = "number"; },
    q => { q.blanks[0].answer = "11"; }, q => { q.options.push(...Array(6).fill("合成")); },
    q => { q.text = q.text.replace("（７）", "(7)"); },
    q => { q.subject = "science"; q.unit = 21; q.id = q.id.replace("social-", "science-"); },
  ]) { const question = q(); mutate(question); assert.throws(() => parse(question)); }
});

test("all seven selections are required and repeated bank entries grade per blank without a one-use rule", () => {
  const { hasCompleteBlanks, gradeBlanks } = globalThis.StudyAnswer;
  for (const values of [answers.slice(1), [...answers.slice(0, 6), ""], [...answers, "1"], Array(7)]) {
    assert.equal(hasCompleteBlanks(q(), values), false);
    assert.equal(gradeBlanks(q(), values).correct, false);
  }
  assert.equal(gradeBlanks(q(), answers).correct, true);
  const wrong = [...answers]; wrong[2] = "6";
  assert.deepEqual(gradeBlanks(q(), wrong), { correct: false, results: [true, true, false, true, true, true, true], answers });
});

test("child partial answers do not record, wrong/retry survives reload, and completion rewards wait for batch end", async () => {
  let records = 0, finishes = 0;
  const family = { ready: Promise.resolve(), allowed: () => true, profile: () => ({ terms: ["g4-s1"] }), task: () => null,
    beginRound() {}, record() { records++; }, finishRound() { finishes++; }, setActive() {} };
  const ports = { search: "?child=test-child&subject=social&term=g4-s1", family };
  let e = await boot(storage(), "test-child", ports);
  e.node("fill-input-panel").querySelector = () => e.node("fib-select");
  e.app.importPrivatePack(JSON.stringify(fixture()));
  const sentinel = fixture().questions.find(q => q.unit === 23).id;
  e.app.State.addMastered(23, sentinel);
  e.app.State.saveBatch("22", [q().id]); e.app.startQuiz("full", 22);
  for (const option of q().options) assert.ok(e.node("fill-input-panel").innerHTML.includes(option));
  e.app.submitAnswer(answers.slice(0, 6)); assert.equal(e.app.quiz.isAnswered, false); assert.equal(records, 0);
  const wrong = [...answers]; wrong[2] = "6";
  e.app.submitAnswer(wrong); assert.equal(records, 1); assert.equal(finishes, 0); assert.equal(e.app.State.doneCount(22), 0);
  e = await boot(e.st, "test-child", ports); e.node("fill-input-panel").querySelector = () => e.node("fib-select"); e.app.startQuiz("full", 22);
  assert.deepEqual([...e.app.quiz.queue], [q().id]);
  e.app.submitAnswer(answers); assert.equal(records, 2); assert.equal(finishes, 0); assert.equal(e.app.State.doneCount(22), 1);
  assert.equal(e.app.State.doneCount(23), 1); e.app.advance(); assert.equal(finishes, 1);
});

test("catalog lazy load and real Worker share unit22 validation, preserve unit23 and make no progress writes", async () => {
  globalThis.indexedDB = new IDBFactory();
  const p = fixture(), built = await buildCatalog(p, socialUnitTwoSyntheticPack());
  const kv = kvStub();
  for (const [hash, bytes] of built.shards) await kv.put(`c:study:shard:${hash}`, bytes);
  await kv.put("c:study:catalog:v2", JSON.stringify(built.manifest));
  let writes = 0; const originalPut = kv.put.bind(kv); kv.put = (...args) => { writes++; return originalPut(...args); };
  const requests = [], env = { KV: kv, TOKEN: "test-token" };
  const fetch = (url, init) => { requests.push(url); return worker.fetch(new Request(url, init), env); };
  const st = storage(); st.map.set("kids_sync_token", "test-token");
  const e = await boot(st, "test-child", { fetch, catalogCache: C.cache }); await wait();
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("social"); e.app.renderHome();
  assert.equal(e.app.activePack, null); assert.equal(requests.filter(url => url.includes("/shards/")).length, 0);
  await e.window._startFull(22);
  assert.ok(e.app.activePack.questions.every(q => q.unit === 22));
  assert.deepEqual([...e.app.activePack.questions.find(item => item.id === q().id).options], q().options);
  assert.equal(C.count(built.manifest, 23), 3); assert.equal(writes, 0);
  const bad = q(); bad.acceptedAnswers = [answers];
  const bytes = JSON.stringify(shard(bad)), hash = createHash("sha256").update(bytes).digest("hex");
  await originalPut(`c:study:shard:${hash}`, bytes);
  const url = `https://synthetic.invalid/v1/packs/g4-s1-math-u1/shards/${hash}`;
  assert.equal((await worker.fetch(new Request(url, { headers: { Authorization: "Bearer test-token" } }), env)).status, 500);
});

test("preview displays all ten options and seven blanks, requires completion, shares grading and stays read-only", () => {
  let forbidden = 0;
  const host = { innerHTML: "", addEventListener() {}, removeEventListener() {}, querySelector() { return null; } };
  const context = vm.createContext({ document: { getElementById() { return null; } }, URLSearchParams, location: { search: "" }, addEventListener() {} });
  for (const key of ["localStorage", "sessionStorage", "KidsFamily", "KidsSyncV1", "State", "Storage"]) Object.defineProperty(context, key, { get() { forbidden++; throw Error(key); } });
  for (const file of ["private-pack.js", "answer.js", "material.js", "science-topics.js", "preview.js"]) vm.runInContext(readFileSync(new URL(`../docs/study/${file}`, import.meta.url), "utf8"), context);
  const app = context.StudyPreview.mount({ root: host, pack: fixture() });
  app.handle("subject", { value: "social" }); app.handle("unit", { value: "22" }); app.handle("question", { index: "5" });
  for (const option of q().options) assert.ok(host.innerHTML.includes(option));
  assert.equal((host.innerHTML.match(/data-action="answer-select"/g) || []).length, 10);
  for (let blank = 1; blank <= 7; blank++) {
    assert.ok(host.innerHTML.includes(`第 ${blank} 空／共 7 空`));
    for (const option of q().options) assert.ok(host.innerHTML.includes(option));
    app.handle("next-part");
  }
  for (const [index, value] of answers.slice(0, 6).entries()) app.handle("answer-select", { index, value });
  app.handle("check"); assert.equal(app.state.result, "");
  app.handle("answer-select", { index: 6, value: "2" }); app.handle("check"); assert.equal(app.state.result, "wrong");
  app.handle("answer-select", { index: 6, value: "1" }); app.handle("check"); assert.equal(app.state.result, "correct");
  assert.equal(forbidden, 0); app.destroy();
});
