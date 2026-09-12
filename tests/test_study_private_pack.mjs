import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { boot, storage, publicQuestions } from "./helpers/study-harness.mjs";
import { syntheticPack, ids } from "./helpers/synthetic-study-pack.mjs";
const plain = x => JSON.parse(JSON.stringify(x));
const key = child => `study:progress:${child}`;
const packKey = "study:private-pack:g4-s1-math-u1";
const answer = q => q.type === "fill_in_blank" ? q.blanks.map(b => b.answer) : q.answer;
function oldProgress() {
  const q = publicQuestions.find(q => q.unit === 5);
  return { schemaVersion: 1, semester: "final", subject: "math", mastered: { 5: [q.id] }, challenge: { 5: { batch: [q.id] } }, stats: { [q.id]: { practiced: 3, correct: 1 } }, errorBank: [{ questionId: q.id, unit: 5 }], flagged: [{ questionId: "missing-old-id", unit: 5 }] };
}
function oldPart(s) {
  return plain({ mastered: s.mastered[5], challenge: s.challenge[5], stats: Object.fromEntries(Object.entries(s.stats).filter(([id]) => !ids.includes(id))), errorBank: s.errorBank.filter(e => e.unit !== 15), flagged: s.flagged.filter(e => e.unit !== 15) });
}
async function ready() {
  const st = storage(); st.map.set(key("test-child"), JSON.stringify(oldProgress()));
  const env = await boot(st); env.app.importPrivatePack(JSON.stringify(syntheticPack())); env.app.State.setStudyTerm("g4-s1");
  env.app.State.saveBatch("15", ids);
  return env;
}
test("real boot / State / Picker: partial correct, wrong recycle, reload, finish without feedback advance; old scope unchanged", async () => {
  let e = await ready(); const before = oldPart(e.app.state);
  e.app.startQuiz("full", 15);
  for (let i = 0; i < 2; i++) { e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0]))); e.app.advance(); }
  e.app.submitAnswer(["999"]);
  const remaining = plain(e.app.quiz.queue);
  assert.deepEqual(remaining, [ids[3], ids[4], ids[5], ids[2]]);
  e = await boot(e.st);
  assert.equal(e.app.State.doneCount(15), 2);
  e.app.startQuiz("full", 15);
  assert.deepEqual(plain(e.app.quiz.queue), remaining);
  assert.deepEqual(plain(e.app.quiz._fillValues), [""]);
  while(e.app.quiz.queue.length) { e.app.submitAnswer(answer(e.app.map.get(e.app.quiz.queue[0]))); if(e.app.quiz.queue.length) e.app.advance(); }
  e = await boot(e.st);
  assert.equal(e.app.State.isCleared(15), true);
  assert.equal(e.app.State.doneCount(15), 6);
  assert.deepEqual(plain(e.app.Picker.nextBatch(15)), []);
  e.app.State.setStudyTerm("g3-s2");
  assert.deepEqual(oldPart(e.app.state), before);
  assert.deepEqual(plain(e.app.currentScope().units.map(u => u.id)), [5,6,7,8,9]);
});
test("last wrong persists; skip leaves question unmastered for a later batch", async () => {
  let e = await ready(); ids.slice(0,5).forEach(id => e.app.State.addMastered(15,id)); e.app.State.saveBatch("15",[ids[5]]);
  e.app.startQuiz("full",15); e.app.submitAnswer(["0"]); e = await boot(e.st);
  assert.equal(e.app.State.isCleared(15),false); assert.deepEqual(plain(e.app.Picker.nextBatch(15)),[ids[5]]);
  e.app.startQuiz("full",15); e.app.skipCurrentQuestion(); e = await boot(e.st);
  assert.equal(e.app.State.doneCount(15),5); assert.deepEqual(plain(e.app.Picker.nextBatch(15)),[ids[5]]);
});
test("actual submit preserves public choice threshold and error-mode / handwriting mastery rules", async () => {
  const e = await boot();
  const q = publicQuestions.find(q => q.unit === 5 && q.type === "multiple_choice");
  e.app.State.setSubject("math");
  e.app.State.saveBatch("5", [q.id]);
  e.app.startQuiz("full", 5);
  const wrong = q.answer === "1" ? "2" : "1";
  e.app.submitAnswer(wrong);
  assert.equal(e.app.State.getErrorBank(5).length, 0);
  e.app.advance(); e.app.submitAnswer(wrong);
  assert.equal(e.app.State.getErrorBank(5).length, 1);
  e.app.startQuiz("error", [5]); e.app.submitAnswer(q.answer);
  assert.equal(e.app.State.getErrorBank(5).length, 0);
  assert.equal(e.app.State.getMasteredSet(5).has(q.id), false);
  const chinese = publicQuestions.find(q => q.unit === 13);
  e.app.State.setSubject("chinese");
  e.app.State.addToErrorBank(chinese.id, 13, "choice");
  e.app.State.addToErrorBank(chinese.id, 13, "handwriting");
  e.app.startQuiz("error", [13], null, "handwriting");
  e.app.submitAnswer(chinese.answer);
  assert.equal(e.app.State.getErrorBank(13, "handwriting").length, 0);
  assert.equal(e.app.State.getErrorBank(13, "choice").length, 1);
  assert.equal(e.app.State.getMasteredSet(13, "handwriting").has(chinese.id), true);
  assert.equal(e.app.State.getMasteredSet(13, "choice").has(chinese.id), false);
});
test("missing pack: real sync adopt → save/export → restore → reimport preserves every unknown progress field", async () => {
  const e = await boot();
  const remote = { ...oldProgress(), studyTerm:"g4-s1", mastered:{...oldProgress().mastered,15:[ids[0]]}, challenge:{15:{batch:ids.slice(1)}}, stats:{[ids[1]]:{practiced:1,correct:0}}, errorBank:[{questionId:ids[1],unit:15}], flagged:[{questionId:ids[5],unit:15,flaggedAt:123}] };
  e.syncConfig.saveData(remote); e.syncConfig.onAdopt(remote);
  e.app.State.setStudyTerm("g3-s2"); e.app.State.setStudyTerm("g4-s1");
  const before = JSON.parse(e.st.getItem(key(e.child)));
  e.window._startFull(15); e.window._resetChallenge(15); e.window._startError("15");
  e.app.State.resetMastered(15); e.app.State.resetChallenge("15");
  assert.deepEqual(JSON.parse(e.st.getItem(key(e.child))), before);
  assert.match(e.node("page-home").innerHTML,/尚未匯入本機題包/);
  e.window._exportProgress();
  const backup = e.node("backup-text").value;
  assert.ok(backup.includes(ids[1]));
  const target = await boot();
  const restored = target.app.parseBackup(backup);
  await target.app.wiring.commitImport(target.child,restored);
  const rebooted = await boot(target.st);
  assert.deepEqual(plain(rebooted.app.state),before);
  rebooted.app.importPrivatePack(JSON.stringify(syntheticPack()));
  assert.equal(rebooted.app.State.doneCount(15),1);
  assert.deepEqual(plain(rebooted.app.Picker.nextBatch(15)),ids.slice(1,5));
  assert.deepEqual(plain(rebooted.app.State.getErrorBank(15)),remote.errorBank);
  assert.deepEqual(plain(rebooted.app.State.getFlagged()),remote.flagged);
});
test("scopes isolate error pool, reset and flags; unit numbers remain unique", async () => {
  const e = await ready(); const before = oldPart(e.app.state);
  e.app.State.addToErrorBank(ids[1],15); e.app.State.flagQuestion(ids[5],15);
  assert.deepEqual(plain(e.app.Picker.forErrorPractice([15])),[ids[1]]);
  e.window._resetChallenge(15); e.app.State.unflagAll();
  assert.deepEqual(oldPart(e.app.state),before);
  e.app.State.setStudyTerm("g3-s2");
  const saved = JSON.stringify(e.app.state); e.window._startFull(15); assert.equal(JSON.stringify(e.app.state),saved);
  assert.ok(e.app.Picker.forErrorPractice([5,6,7,8,9]).every(id => !ids.includes(id)));
  const units=Object.values(e.app.STUDY_TERMS).flatMap(t=>Object.values(t.subjects).flatMap(s=>Object.values(s.semesters).flatMap(s=>s.units.map(u=>u.id))));
  assert.equal(new Set(units).size,15); assert.equal(units.length,15); assert.equal(e.app.unitNum(15),1);
});
test("invalid imports and quota failures atomically retain active pack, indices and persisted progress", async () => {
  const e=await ready(); const original=e.app.activePack; const saved=e.st.getItem(packKey); const progress=e.st.getItem(key(e.child));
  const invalids=["{", "x".repeat(131073)];
  for(const mutate of [p=>p.schemaVersion=2,p=>p.revision=0,p=>p.questions.pop(),p=>p.questions[1].id=ids[0],p=>p.questions[0].unit=5,p=>p.questions[0].answer="5",p=>p.questions[0].answer=2,p=>p.questions[1].blanks[0].answer="100000000",p=>p.questions[4].blanks[0].answer="＞",p=>p.questions[1].blanks[0].input="text",p=>delete p.explanations[ids[0]],p=>p.explanations[ids[0]]=" ",p=>p.questions[0].image="https://example.invalid/a",p=>{p.revision++;p.questions[0].text+="changed";},p=>p.explanations[ids[0]]+="changed"]){const p=syntheticPack();mutate(p);invalids.push(JSON.stringify(p));}
  for(const raw of invalids){ assert.throws(()=>e.app.importPrivatePack(raw)); assert.equal(e.app.activePack,original); assert.equal(e.st.getItem(packKey),saved);assert.equal(e.st.getItem(key(e.child)),progress); }
  e.st.fail=k=>k===packKey;assert.throws(()=>e.app.importPrivatePack(JSON.stringify(syntheticPack())),/未保存/);
  assert.equal(e.app.activePack,original);assert.equal(e.app.map.size,1930);
  assert.throws(()=>e.window.StudyPrivatePack.parse(JSON.stringify(syntheticPack()),[{id:ids[0]}]),/ID/);
});
test("file UI reports size/read/storage failure safely; invalid stored pack does not erase progress on boot", async () => {
  const e = await ready();
  const pack = e.app.activePack;
  const progress = e.st.getItem(key(e.child));
  let read = false;
  await e.window._importPrivatePackFile({ files: [{ size: 131073, text() { read = true; } }] });
  assert.equal(read, false);
  assert.match(e.node("page-home").innerHTML, /未匯入/);
  await e.window._importPrivatePackFile({ files: [{ size: 1, text() { throw Error('<img src=x>'); } }] });
  assert.match(e.node("page-home").innerHTML, /&lt;img src=x&gt;/);
  assert.equal(e.app.activePack, pack);
  assert.equal(e.st.getItem(key(e.child)), progress);
  e.st.map.set(packKey, "bad JSON");
  const rebooted = await boot(e.st);
  assert.equal(rebooted.app.activePack, null);
  assert.match(rebooted.node("page-home").innerHTML, /本機題包無法載入/);
  assert.equal(e.st.getItem(key(e.child)), progress);
});
test("same pack reorder is idempotent; higher revision explanation update preserves progress; downgrade rejected", async()=>{
  const e=await ready();e.app.State.addMastered(15,ids[0]);const before=e.st.getItem(key(e.child));
  const p=syntheticPack();p.questions.reverse();p.questions=p.questions.map(q=>Object.fromEntries(Object.entries(q).reverse()));
  e.app.importPrivatePack(JSON.stringify(p));assert.equal(e.st.getItem(key(e.child)),before);
  p.revision=2;p.explanations[ids[0]]="更新合成解說";e.app.importPrivatePack(JSON.stringify(p));
  assert.equal(e.app.State.doneCount(15),1); assert.throws(()=>e.app.importPrivatePack(JSON.stringify(syntheticPack())),/較舊/);
});
test("blocked progress save has visible warning, one atomic answer write and no false persisted completion",async()=>{
  const e=await ready();e.app.startQuiz("full",15);const saved=e.st.getItem(key(e.child));
  e.st.fail=k=>k===key(e.child);e.app.submitAnswer("2");
  assert.equal(e.st.getItem(key(e.child)),saved);assert.equal(e.app.saveFailed,true);assert.match(e.node("save-warning").textContent,/進度未保存/);
  const reloaded=await boot(e.st);assert.equal(reloaded.app.State.doneCount(15),0);
  e.st.fail=()=>false;e.app.advance();const writes=e.st.writes.length;e.app.submitAnswer(["12345678"]);
  assert.equal(e.st.writes.slice(writes).filter(k=>k===key(e.child)).length,1);assert.equal(e.app.saveFailed,false);
});
test("two children share pack only; actual wiring sync loadData and backup/report output contain no private text",async()=>{
  const e=await ready();e.app.startQuiz("full",15);e.app.submitAnswer("2");e.app.leaveQuiz();e.app.State.flagQuestion(ids[1],15);
  const other=await boot(e.st,"test-other");other.app.State.setStudyTerm("g4-s1");assert.equal(other.app.activePack.questions.length,6);assert.equal(other.app.State.doneCount(15),0);
  const output=JSON.stringify(e.syncConfig.loadData())+e.app.buildBackupText(e.app.state)+decodeURIComponent(e.app.buildReportUrl());
  for(const q of syntheticPack().questions) assert.ok(!output.includes(q.text));
  for(const text of Object.values(syntheticPack().explanations)) assert.ok(!output.includes(text));
  assert.ok(decodeURIComponent(e.app.buildReportUrl()).includes("revision: 1"));
  assert.ok(!output.includes("synthetic fixture only"));
  assert.equal(e.requests.some(x=>String(x).startsWith("http")),false);
});
test("untrusted question/option/report rendering escapes before generated markup; explanation uses textContent",async()=>{
  const e=await boot();const p=syntheticPack();const payload='<img src=x onerror="alert(1)"> & <svg/onload=alert(2)>';
  p.questions[0].text=payload;p.questions[0].options[0]=payload;p.questions[1].text=payload+"（１）";p.explanations[ids[0]]=payload;
  e.app.importPrivatePack(JSON.stringify(p));e.app.State.setStudyTerm("g4-s1");e.app.State.saveBatch("15",ids);e.app.startQuiz("full",15);
  assert.ok(!e.node("page-quiz").innerHTML.includes('<img src=x'));assert.match(e.node("page-quiz").innerHTML,/&lt;img/);
  e.app.submitAnswer("2");assert.equal(e.node("explain-card").textContent,payload);
  e.app.State.flagQuestion(ids[0],15);assert.ok(!e.app.renderFlaggedSection().includes('<img src=x'));
  e.app.advance();assert.match(e.node("page-quiz").innerHTML,/&lt;img/);assert.match(e.node("page-quiz").innerHTML,/data-chip="0"/);
});
test("public bank still contains exactly original 1924 IDs/unit/subject mapping and manifest start_url",()=>{
  assert.equal(publicQuestions.length,1924);assert.ok(publicQuestions.every(q=>q.unit>=1&&q.unit<=14));
  const digest=createHash("sha256").update(JSON.stringify(publicQuestions.map(q=>[q.id,q.unit,q.subject]))).digest("hex");
  assert.equal(digest,"c18fb3beb467fb7b6ece7c2767aec922fbebd5506b0b4852eda89709566b24c8");
  const manifest=JSON.parse(readFileSync(new URL("../docs/study/manifest.json",import.meta.url),"utf8"));
  assert.equal(manifest.name,"課業練習");assert.equal(manifest.start_url,".");
});
