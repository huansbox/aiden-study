import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boot } from "./helpers/study-harness.mjs";
import { socialTopicsSyntheticPack } from "./helpers/synthetic-study-pack.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
const materialsKey = "@social-topic:U2-materials";

test("social U2 metadata has four nonoverlapping broad topics covering all 67 released activities", async () => {
  const e = await boot(), topics = e.window.StudyScienceTopics;
  const metadata = JSON.parse(readFileSync(new URL("../data/study/g4-s1-math-u1/mapping-metadata.json", import.meta.url), "utf8"));
  const rows = metadata.items.filter(row => row.unit === 23);
  const definitions = topics.topicsForUnit(23);
  assert.equal(rows.length, 67);
  assert.equal(new Set(rows.map(row => row.concept)).size, 58);
  assert.deepEqual(plain(definitions.map(({ key, label }) => ({ key, label }))), [
    { key: materialsKey, label: "住屋建材與環境" },
    { key: "@social-topic:U2-life", label: "漢人住屋與三合院生活" },
    { key: "@social-topic:U2-preservation", label: "住屋改變與文化保存" },
    { key: "@social-topic:U2-utensils", label: "生活器物與環境" }
  ]);
  const counts = new Map(definitions.map(topic => [topic.key, 0]));
  for (const row of rows) {
    const q = { unit: row.unit, subtopic: row.concept };
    const memberships = definitions.filter(topic => topic.subtopics.includes(row.concept));
    assert.equal(memberships.length, 1, `${row.appId} must belong to exactly one topic`);
    assert.equal(topics.topicForQuestion(q)?.key, memberships[0].key);
    assert.equal(topics.matches(q, memberships[0].key), true);
    assert.equal(topics.matches(q, row.concept), true, "original fine selectors stay exact");
    counts.set(memberships[0].key, counts.get(memberships[0].key) + 1);
  }
  assert.deepEqual([...counts.values()], [26, 20, 8, 13]);
  assert.equal(topics.topicsForUnit(22).length, 0, "U1 keeps its three original broad labels");
  assert.equal(topics.topicsForUnit(20).length + topics.topicsForUnit(21).length, 7);
  assert.equal(topics.matches({ unit: 22, subtopic: "住屋建材與環境" }, materialsKey), false);
  for (const key of ["@social-topic:unknown", "@science-topic:unknown"]) {
    assert.equal(topics.isTopicSelection(key), false);
    assert.equal(topics.matches({ unit: 23, subtopic: key }, key), false, "unknown topic keys never fall through to fine selectors");
  }
  const future = { unit: 23, subtopic: "新細標籤待分類" };
  assert.equal(topics.topicForQuestion(future), null);
  assert.equal(topics.matches(future, ""), true);
  assert.ok(definitions.every(topic => !topics.matches(future, topic.key)));
});

test("social U2 child topics reuse fine mastered history, old batches and errors without changing other scopes", async () => {
  const e = await boot(), pack = socialTopicsSyntheticPack();
  e.app.importPrivatePack(JSON.stringify(pack));
  e.app.State.setStudyTerm("g4-s1"); e.app.State.setSubject("social");
  const [materials, life, utensils, secondMaterial, preservation, unknown] = pack.questions.filter(q => q.unit === 23);
  const u1 = pack.questions.find(q => q.unit === 22), futureId = "social-g4s1-unloaded-future-v1";
  const originalPack = plain(e.app.activePack);
  assert.deepEqual(plain(e.app.questionIdsFor(23, materialsKey)), [materials.id, secondMaterial.id]);
  assert.deepEqual(plain(e.app.questionIdsFor(23, "@social-topic:U2-life")), [life.id], "image grouped activity stays whole");
  assert.deepEqual(plain(e.app.questionIdsFor(23, "@social-topic:U2-utensils")), [utensils.id], "multi-blank activity stays whole");
  assert.ok(e.app.questionIdsFor(23).includes(unknown.id));
  assert.deepEqual(plain(e.app.questionIdsFor(23, "@social-topic:unknown")), []);
  for (const id of [materials.id, secondMaterial.id, life.id, unknown.id, futureId]) e.app.State.addMastered(23, id);
  e.app.State.addMastered(22, u1.id);
  e.app.State.addToErrorBank(materials.id, 23); e.app.State.addToErrorBank(life.id, 23);
  e.app.State.saveBatch(`23/${materials.subtopic}`, [materials.id, futureId]);
  e.app.State.saveBatch(`23/${materialsKey}`, [materials.id, futureId]);
  e.app.renderHome();
  const home = e.node("page-home").innerHTML;
  for (const label of ["住屋建材與環境", "漢人住屋與三合院生活", "住屋改變與文化保存", "生活器物與環境", "整單元練習"]) assert.ok(home.includes(label));
  assert.doesNotMatch(home, /土埆厝建材|三合院空間與農業生活|新細標籤待分類/);
  assert.equal(e.app.State.doneCount(23, materialsKey), 2);
  assert.equal(e.app.State.isCleared(23, materialsKey), true);
  const fineBatch = plain(e.app.state.challenge[`23/${materials.subtopic}`]);
  e.window._resetChallenge(23, materialsKey);
  assert.equal(e.app.State.doneCount(23, materialsKey), 0);
  assert.ok([life.id, unknown.id, futureId].every(id => e.app.State.getMasteredSet(23).has(id)));
  assert.equal(e.app.State.getMasteredSet(22).has(u1.id), true);
  assert.deepEqual(plain(e.app.state.challenge[`23/${materials.subtopic}`]), fineBatch);
  assert.deepEqual(plain(e.app.state.challenge[`23/${materialsKey}`].batch), [futureId]);
  e.window._startFull(23, materials.subtopic);
  assert.deepEqual(plain(e.app.quiz.queue), [materials.id], "old fine batch resumes precisely");
  e.window._startFull(23, materialsKey);
  assert.deepEqual(new Set(plain(e.app.quiz.queue)), new Set([materials.id, secondMaterial.id]));
  assert.match(e.node("page-quiz").innerHTML, /練習主題 — 第2單元／住屋建材與環境/);
  e.window._startError("23");
  assert.deepEqual(new Set(plain(e.app.quiz.queue)), new Set([materials.id, life.id]));
  assert.deepEqual(plain(e.app.activePack), originalPack, "grouping never rewrites question content or IDs");
  assert.ok(e.app.questionIdsFor(23).includes(preservation.id));
});
