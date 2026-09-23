import test from "node:test";
import assert from "node:assert/strict";
import { boot, storage, publicQuestions } from "./helpers/study-harness.mjs";
import { syntheticPack, expandedSyntheticPack, ids, addedIds } from "./helpers/synthetic-study-pack.mjs";
import worker from "../worker/worker.mjs";
import { kvStub } from "../worker/kv-stub.mjs";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const cacheKey = "study:private-pack:g4-s1-math-u1";
const progressKey = "study:progress:test-child";
const plain = x => JSON.parse(JSON.stringify(x));
const answer = q => q.blanks ? q.blanks.map(b => b.answer) : q.answer;
const flush = async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); };
async function ready(pack = syntheticPack()) {
  const st = storage(); st.map.set(cacheKey, JSON.stringify(pack));
  const e = await boot(st); e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math"); return e;
}

test("six-question cache upgrades to fourteen activities with chapter counts, original mastery and half-batch intact", async () => {
  for (const done of [2, 6]) {
    let e = await ready();
    ids.slice(0, done).forEach(id => e.app.State.addMastered(15, id));
    e.app.State.saveBatch("15", ids.slice(done));
    const before = e.st.getItem(progressKey);
    e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack())); e.app.renderHome();
    assert.equal(e.st.getItem(progressKey), before);
    assert.equal(e.app.State.doneCount(15), done);
    assert.match(e.node("page-home").innerHTML, new RegExp(`已答對 ${done} / 7`));
    assert.match(e.node("page-home").innerHTML, /四上數學 14 題、自然 0 題，版本 2/);
    assert.deepEqual([15,16,17,18,19].map(unit => e.app.activePack.questions.filter(q => q.unit === unit).length), [7,2,2,1,2]);
    e = await boot(e.st);
    e.app.startQuiz("full", 15);
    assert.deepEqual(plain(e.app.quiz.queue), done === 6 ? [addedIds[0]] : ids.slice(done));
    while (e.app.quiz.queue.length) {
      e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0])));
      if (e.app.quiz.queue.length) e.app.advance();
    }
    if (done === 2) {
      assert.equal(e.app.State.doneCount(15), 6);
      assert.deepEqual(plain(e.app.Picker.nextBatch(15)), [addedIds[0]]);
    }
  }
});

test("missing new chapters retain synced unknown records through save/export/restore and block all start/reset entry points", async () => {
  for (const withOldCache of [false, true]) {
    const st = storage(); if (withOldCache) st.map.set(cacheKey, JSON.stringify(syntheticPack()));
    let e = await boot(st);
    const publicQ = publicQuestions.find(q => q.unit === 5);
    const newQ = expandedSyntheticPack().questions.filter(q => q.unit > 15);
    const restored = { ...plain(e.app.state), studyTerm: "g4-s1", subject: "math",
      mastered: { 5: [publicQ.id] }, challenge: { 5: { batch: [publicQ.id] } },
      stats: { [publicQ.id]: { practiced: 2, correct: 1 } }, errorBank: [], flagged: [] };
    for (const unit of [16,17,18,19]) {
      const qs = newQ.filter(q => q.unit === unit);
      restored.mastered[unit] = [qs[0].id];
      restored.challenge[unit] = { batch: qs.map(q => q.id) };
      restored.challenge[`${unit}/合成分組`] = { batch: qs.map(q => q.id) };
      restored.stats[qs[0].id] = { practiced: 2, correct: 0 };
      restored.errorBank.push({ questionId: qs[0].id, unit });
      restored.flagged.push({ questionId: qs.at(-1).id, unit, flaggedAt: 1 });
    }
    e.syncConfig.saveData(restored); e.syncConfig.onAdopt(restored);
    const before = e.st.getItem(progressKey);
    for (const unit of [16,17,18,19]) {
      e.app.startQuiz("full", unit); e.window._startFull(unit); e.window._startError(String(unit));
      e.window._resetChallenge(unit); e.app.State.resetMastered(unit);
      e.app.State.resetChallenge(String(unit)); e.app.State.resetChallenge(`${unit}/合成分組`);
      e.app.State.resetChallenge(`handwriting:${unit}`);
    }
    assert.equal(e.st.getItem(progressKey), before);
    assert.match(e.node("page-home").innerHTML, /已有進度保留/);
    assert.ok(!e.node("page-home").innerHTML.includes("0 題通關"));
    e.window._exportProgress();
    const backup = e.node("backup-text").value;
    const target = await boot();
    await target.app.wiring.commitImport(target.child, target.app.parseBackup(backup));
    e = await boot(target.st);
    assert.deepEqual(plain(e.app.state), JSON.parse(before));
    e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack())); e.app.renderHome();
    assert.equal(e.app.State.getFlagged().length, 4);
    assert.equal(e.app.State.doneCount(16), 1);
    assert.equal(e.app.State.getErrorBank([16,17,18,19]).length, 4);
    assert.deepEqual(plain(e.app.state.mastered[5]), [publicQ.id]);
    assert.deepEqual(plain(e.app.state.challenge[5]), restored.challenge[5]);
  }
});

test("expanded content rejects same-revision additions, removals, new-ID updates, moved chapters/subtopics and malformed IDs atomically", async () => {
  const e = await ready();
  const addedWithoutRevision = expandedSyntheticPack(); addedWithoutRevision.revision = 1;
  assert.throws(() => e.app.importPrivatePack(JSON.stringify(addedWithoutRevision)), /revision/);
  e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack()));
  const saved = e.st.getItem(cacheKey), active = e.app.activePack, map = e.app.map;
  const mutations = [
    p => { p.revision++; p.questions.pop(); delete p.explanations[addedIds.at(-1)]; },
    p => { p.explanations[addedIds[1]] += "changed"; },
    p => { p.questions.find(q => q.id === addedIds[1]).source += "changed"; },
    p => { p.revision++; p.questions.find(q => q.id === addedIds[1]).unit = 17; },
    p => { p.revision++; p.questions.find(q => q.id === addedIds[1]).subject = "science"; },
    p => { p.revision++; p.questions[0].subtopic += "changed"; },
    p => { p.revision++; p.questions.find(q => q.id === addedIds[1]).blanks[1].answer = "999"; },
    p => { p.questions.at(-1).id = "math-g4s1-x');alert(1)-v1"; },
    p => { p.questions.at(-1).id = ids[0]; },
    p => { p.questions.at(-1).unit = 20; },
    p => { p.questions.at(-1).text = "missing full-width markers"; },
    p => { p.explanations["orphan"] = "extra"; },
  ];
  for (const mutate of mutations) {
    const p = expandedSyntheticPack(); mutate(p);
    assert.throws(() => e.app.importPrivatePack(JSON.stringify(p)));
    assert.equal(e.st.getItem(cacheKey), saved); assert.equal(e.app.activePack, active); assert.equal(e.app.map, map);
  }
  const reordered = expandedSyntheticPack();
  reordered.questions.reverse(); reordered.questions = reordered.questions.map(q => Object.fromEntries(Object.entries(q).reverse()));
  e.app.importPrivatePack(JSON.stringify(reordered));
  const update = expandedSyntheticPack(); update.revision++; update.explanations[addedIds[1]] += "updated";
  e.app.importPrivatePack(JSON.stringify(update));
  assert.equal(e.app.activePack.revision, 3);
  assert.throws(() => e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack())), /較舊/);
});

test("new chapters use all-or-nothing ordered blanks and isolate reset, error pools, children and public progress", async () => {
  const e = await ready(expandedSyntheticPack());
  const publicQ = publicQuestions.find(q => q.unit === 5);
  e.app.State.addMastered(5, publicQ.id);
  e.app.State.addMastered(17, addedIds[3]);
  e.app.State.addToErrorBank(addedIds[1], 16); e.app.State.addToErrorBank(addedIds[4], 17);
  assert.deepEqual(new Set(plain(e.app.Picker.forErrorPractice([16,17]))), new Set([addedIds[1], addedIds[4]]));
  e.app.State.saveBatch("16", [addedIds[1]]); e.app.startQuiz("full", 16);
  const correct = answer(e.app.map.get(addedIds[1]));
  e.app.submitAnswer([correct[0], "999", correct[2]]);
  assert.equal(e.app.State.doneCount(16), 0); assert.deepEqual(plain(e.app.quiz.queue), [addedIds[1]]);
  e.app.advance(); e.app.submitAnswer(correct);
  assert.equal(e.app.State.doneCount(16), 1);
  e.app.leaveQuiz(); e.window._resetChallenge(16);
  assert.equal(e.app.State.doneCount(16), 0); assert.equal(e.app.State.doneCount(17), 1);
  assert.deepEqual(plain(e.app.state.mastered[5]), { modes: { choice: [publicQ.id] } });
  const other = await boot(e.st, "test-other"); other.app.State.setStudyTerm("g4-s1"); other.app.State.setSubject("math");
  assert.equal(other.app.activePack.questions.length, 14); assert.equal(other.app.State.doneCount(17), 0);
  const output = JSON.stringify(e.syncConfig.loadData()) + e.app.buildBackupText(e.app.state);
  for (const q of expandedSyntheticPack().questions) assert.ok(!output.includes(q.text));
  e.app.State.setStudyTerm("g3-s2"); const before = e.st.getItem(progressKey);
  e.window._startFull(16); e.window._resetChallenge(16);
  assert.equal(e.st.getItem(progressKey), before);
});

test("every new chapter escapes private content and keeps full/compact/IDs-only reports free of payloads", async () => {
  const payload = '<img src="/private-probe" onerror="alert(1)"> & <svg/onload=alert(2)>';
  for (const unit of [16,17,18,19]) {
    const p = expandedSyntheticPack();
    const q = p.questions.find(q => q.unit === unit);
    q.text = payload + q.text; if (q.options.length) q.options[0] = payload;
    q.source = "PRIVATE_SOURCE_SENTINEL"; p.explanations[q.id] = payload;
    const e = await ready(p); e.app.State.saveBatch(String(unit), [q.id]); e.app.startQuiz("full", unit);
    assert.match(e.node("page-quiz").innerHTML, /&lt;img/);
    assert.ok(!e.node("page-quiz").innerHTML.includes('<img src="/private-probe"'));
    e.app.submitAnswer(answer(q)); assert.equal(e.node("explain-card").textContent, payload);
    e.app.State.flagQuestion(q.id, unit);
    const report = decodeURIComponent(e.app.buildReportUrl());
    assert.ok(!report.includes(payload)); assert.ok(!report.includes(q.source)); assert.match(report, /revision: 2/);
  }
  for (const [count, kind] of [[1, "full"], [35, "compact"], [140, "ids"]]) {
    const p = expandedSyntheticPack();
    const reportIds = [];
    for (let i = 0; i < count; i++) {
      const q = { ...structuredClone(p.questions[0]), id: `math-g4s1-report-${i}-v1`, unit: 17, text: payload, source: "PRIVATE_SOURCE_SENTINEL" };
      p.questions.push(q); p.explanations[q.id] = payload; reportIds.push(q.id);
    }
    const e = await ready(p);
    reportIds.forEach(id => e.app.State.flagQuestion(id, 17));
    const url = e.app.buildReportUrl(); assert.ok(url.length <= 7000);
    const body = new URL(url).searchParams.get("body"); assert.ok(body);
    assert.ok(!body.includes(payload)); assert.ok(!body.includes("PRIVATE_SOURCE_SENTINEL"));
    if (kind === "full") assert.match(body, /###/);
    if (kind === "compact") { assert.ok(!body.includes("###")); assert.match(body, /revision 2/); }
    if (kind === "ids") { assert.ok(!body.includes("revision")); assert.match(body, /math-g4s1-report-/); }
  }
});

test("background expanded download defers until home, preserves drafts and rechecks the latest stored pack", async () => {
  const st = storage(); st.map.set(cacheKey, JSON.stringify(syntheticPack())); st.map.set("kids_sync_token", "test-token");
  let resolve;
  const waiting = new Promise(r => { resolve = r; });
  const fetch = async url => String(url).includes("/packs/") ? waiting : new Response(JSON.stringify({ rev: 0, data: null }));
  const e = await boot(st, "test-child", { fetch }); e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math");
  e.app.State.saveBatch("15", ids); e.app.startQuiz("full", 15);
  const queue = plain(e.app.quiz.queue), saved = st.getItem(cacheKey);
  e.node("sync-token-input").value = "unfinished draft"; e.node("backup-io").innerHTML = "restore draft";
  resolve(new Response(JSON.stringify(expandedSyntheticPack()))); await flush();
  assert.equal(e.app.activePack.questions.length, 6); assert.equal(st.getItem(cacheKey), saved);
  assert.deepEqual(plain(e.app.quiz.queue), queue);
  e.app.leaveQuiz();
  assert.equal(e.app.activePack.questions.length, 14);
  assert.deepEqual(plain(e.app.Picker.nextBatch(15)), ids);
  assert.equal(e.node("sync-token-input").value, "unfinished draft");
  assert.equal(e.node("backup-io").innerHTML, "restore draft");
  const stale = await boot(st);
  const update = expandedSyntheticPack(); update.revision = 3; update.explanations[addedIds[0]] += "changed";
  e.app.importPrivatePack(JSON.stringify(update));
  assert.throws(() => stale.app.importPrivatePack(JSON.stringify(expandedSyntheticPack())), /較舊/);
  assert.equal(JSON.parse(st.getItem(cacheKey)).revision, 3);
});

test("Worker accepts both deployed revisions with the same authorized content key and preserves progress", async () => {
  const contentKey = "c:study:g4-s1-math-u1";
  for (const p of [syntheticPack(), expandedSyntheticPack()]) {
    const raw = JSON.stringify(p);
    const KV = kvStub({ [contentKey]: { value: raw }, "p:test-child:study": { value: "synthetic-progress" } });
    const response = await worker.fetch(new Request("https://sync.test/v1/packs/g4-s1-math-u1", { headers: { Authorization: "Bearer test-token" } }), { TOKEN: "test-token", KV });
    assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(await response.text(), raw); assert.equal(await KV.get("p:test-child:study"), "synthetic-progress");
  }
});

test("actual frozen rev1 validator rejects expansion without overwriting cache; updated client reads both", async () => {
  // Snapshot of 88b14d5's production validator, not a reimplementation of its rules.
  const context = vm.createContext({ TextEncoder });
  vm.runInContext(readFileSync(new URL("./helpers/private-pack-rev1.fixture.js", import.meta.url), "utf8"), context);
  const old = context.StudyPrivatePack;
  const firstRaw = JSON.stringify(syntheticPack()), nextRaw = JSON.stringify(expandedSyntheticPack());
  const first = old.parse(firstRaw);
  let stored = firstRaw;
  const write = (_, raw) => { stored = raw; return true; };
  assert.throws(() => old.save(nextRaw, [], first, () => stored, write), /六題/);
  assert.equal(stored, firstRaw);
  stored = nextRaw; // A newer tab has already updated the shared cache.
  assert.throws(() => old.save(firstRaw, [], first, () => stored, write), /本機題包/);
  assert.equal(stored, nextRaw);
  assert.throws(() => old.parse(stored));
  const e = await ready();
  assert.equal(e.window.StudyPrivatePack.parse(firstRaw).questions.length, 6);
  assert.equal(e.window.StudyPrivatePack.parse(nextRaw).questions.length, 14);
});

test("expanded cache and all chapter progress survive HTTP/UTF8/size/quota failures and stale pending responses", async () => {
  const st = storage(); st.map.set(cacheKey, JSON.stringify(expandedSyntheticPack())); st.map.set("kids_sync_token", "test-token");
  let reply = () => new Response("", { status: 503 });
  const fetch = async url => String(url).includes("/packs/") ? reply() : new Response(JSON.stringify({ rev: 0, data: null }));
  const e = await boot(st, "test-child", { fetch }); await flush();
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("math"); e.app.State.addMastered(17, addedIds[3]); e.app.State.saveBatch("19", addedIds.slice(-2));
  const cache = st.getItem(cacheKey), progress = st.getItem(progressKey);
  for (const response of [() => new Response("", { status: 401 }), () => new Response(new Uint8Array([0xff])), () => new Response("x".repeat(131073))]) {
    reply = response; await e.app.loadPrivatePack();
    assert.equal(st.getItem(cacheKey), cache); assert.equal(st.getItem(progressKey), progress); assert.equal(e.app.activePack.questions.length, 14);
  }
  const next = expandedSyntheticPack(); next.revision = 3; next.explanations[addedIds[0]] += "new";
  reply = () => new Response(JSON.stringify(next)); st.fail = key => key === cacheKey;
  await e.app.loadPrivatePack(); assert.equal(st.getItem(cacheKey), cache); assert.equal(st.getItem(progressKey), progress);
  st.fail = () => false;
  e.app.startQuiz("full", 19); await e.app.loadPrivatePack();
  const other = await boot(st); const newer = structuredClone(next); newer.revision = 4;
  other.app.importPrivatePack(JSON.stringify(newer));
  const queue = plain(e.app.quiz.queue);
  e.app.leaveQuiz();
  assert.equal(e.app.activePack.revision, 2); assert.equal(JSON.parse(st.getItem(cacheKey)).revision, 4);
  assert.deepEqual(plain(e.app.Picker.nextBatch(19)), queue);
  assert.match(e.node("page-home").innerHTML, /較舊版本/);
});

test("additional valid activities have no arbitrary total count cap and each new batch remains at most ten", async () => {
  const p = expandedSyntheticPack();
  for (let i = 0; i < 24; i++) {
    const q = { ...p.questions[0], id: `math-g4s1-extra-${i}-v1`, unit: 16 };
    p.questions.push(q); p.explanations[q.id] = "合成額外題目解說";
  }
  const e = await ready(p); e.app.startQuiz("full", 16);
  assert.ok(e.app.quiz.queue.length > 0 && e.app.quiz.queue.length <= 10);
  assert.equal(e.app.activePack.questions.length, 38);
});

test("rev1 same-chapter resets only visible mastery and retain unknown saved work through actual home actions", async () => {
  const publicQ = publicQuestions.find(q => q.unit === 5);
  for (const action of ["_startFull", "_resetChallenge"]) {
    for (const savedFormat of ["batch", "queue"]) {
      let e = await ready();
      const futureId = addedIds[0];
      const synced = { ...plain(e.app.state), mastered: { 15: [...ids, futureId], 5: [publicQ.id] },
        challenge: { 15: { [savedFormat]: [ids[0], futureId] }, 5: { batch: [publicQ.id] } },
        stats: { [futureId]: { practiced: 1, correct: 1 } },
        errorBank: [{ questionId: futureId, unit: 15 }], flagged: [] };
      e.syncConfig.saveData(synced); e.syncConfig.onAdopt(synced);
      assert.equal(e.app.State.isCleared(15), true); // Old cache only sees 6/6.
      e.window[action](15);
      assert.equal(e.app.State.doneCount(15), 0); // User's requested old-question reset works.
      assert.equal(e.app.State.getMasteredSet(15).has(futureId), true);
      assert.ok(e.app.state.challenge[15][savedFormat].includes(futureId));
      assert.deepEqual(plain(e.app.state.mastered[5]), synced.mastered[5]);
      assert.deepEqual(plain(e.app.state.challenge[5]), synced.challenge[5]);
      e = await boot(e.st);
      assert.equal(e.app.State.getMasteredSet(15).has(futureId), true);
      assert.ok(e.app.state.challenge[15][savedFormat].includes(futureId));
      e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack()));
      assert.equal(e.app.State.doneCount(15), 1);
      assert.ok(!plain(e.app.Picker.nextBatch(15)).includes(futureId));
      assert.deepEqual(plain(e.app.state.stats[futureId]), synced.stats[futureId]);
      assert.deepEqual(plain(e.app.state.errorBank), synced.errorBank);
    }
  }
});

test("rev1 partial batch retains unavailable U1 activity across start, wrong recycle, skip, finish and clear", async () => {
  let e = await ready();
  const futureId = addedIds[0];
  const synced = { ...plain(e.app.state), mastered: { 15: ids.slice(0,2) },
    challenge: { 15: { batch: [ids[2], futureId, ...ids.slice(3)] } } };
  e.syncConfig.saveData(synced); e.syncConfig.onAdopt(synced);
  e.window._startFull(15);
  assert.deepEqual(plain(e.app.quiz.queue), ids.slice(2));
  assert.deepEqual(plain(e.app.state.challenge[15].batch), [...ids.slice(2), futureId]);
  e.app.submitAnswer(["999"]); e.app.advance();
  assert.deepEqual(plain(e.app.state.challenge[15].batch), [ids[3], ids[4], ids[5], ids[2], futureId]);
  e.app.skipCurrentQuestion();
  assert.ok(e.app.state.challenge[15].batch.includes(futureId));
  while (e.app.quiz.queue.length) {
    e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0])));
    e.app.advance(); // Includes finishBatch -> clearBatch.
  }
  assert.deepEqual(plain(e.app.state.challenge[15].batch), [futureId]);
  e = await boot(e.st);
  e.app.importPrivatePack(JSON.stringify(expandedSyntheticPack()));
  e.window._startFull(15);
  assert.deepEqual(plain(e.app.quiz.queue), [futureId]);
});

test("private subtopic reset preserves loaded IDs outside its target as well as unavailable IDs", async () => {
  const p = syntheticPack(); p.questions[0].subtopic = "另一概念";
  const e = await ready(p), futureId = addedIds[0], group = "15/合成位值";
  const synced = { ...plain(e.app.state), mastered: { 15: [...ids, futureId] },
    challenge: { [group]: { batch: [ids[0], ids[1], futureId] } } };
  e.syncConfig.saveData(synced); e.syncConfig.onAdopt(synced);
  e.window._resetChallenge(15, "合成位值");
  assert.deepEqual([...e.app.State.getMasteredSet(15)], [ids[0], futureId]);
  assert.deepEqual(plain(e.app.state.challenge[group].batch), [ids[0], futureId]);
});
