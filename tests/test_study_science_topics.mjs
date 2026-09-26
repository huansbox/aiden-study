import test from "node:test";
import assert from "node:assert/strict";
import { boot } from "./helpers/study-harness.mjs";
import { scienceSyntheticPack } from "./helpers/synthetic-study-pack.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
function topicPack() {
  const pack = scienceSyntheticPack();
  const science = pack.questions.filter(q => q.subject === "science");
  science[0].subtopic = "S1a 土壤的組成";
  science[1].unit = 20;
  science[1].subtopic = "S1b 水流強度與搬運";
  const unknown = { ...science[0], id: "science-g4s1-synthetic-unknown-v1", subtopic: "新細概念待分類" };
  const animal = { ...science[1], id: "science-g4s1-synthetic-animal-v1", unit: 21, subtopic: "S2b 魚體部位與功能" };
  pack.questions.push(unknown, animal);
  pack.explanations[unknown.id] = "合成解說：檢查待分類題。";
  pack.explanations[animal.id] = "合成解說：檢查動物題。";
  return { pack, science: [science[0], science[1], unknown, animal] };
}

test("science topics scope the child picker while keeping IDs, fine history and unloaded progress", async () => {
  const { pack, science: [surface, change, unknown, animal] } = topicPack();
  const e = await boot();
  e.app.importPrivatePack(JSON.stringify(pack));
  e.app.State.setStudyTerm("g4-s1");
  e.app.State.setSubject("science");
  const topic = "@science-topic:S1a";
  const futureId = "science-g4s1-future-unloaded-v1";
  assert.deepEqual(plain(e.app.questionIdsFor(20, topic)), [surface.id]);
  assert.deepEqual(plain(e.app.questionIdsFor(20)), [surface.id, change.id, unknown.id]);
  assert.deepEqual(plain(e.app.questionIdsFor(21, "@science-topic:S2b-animals")), [animal.id]);
  assert.deepEqual(plain(e.app.questionIdsFor(20, "@science-topic:unmapped")), []);
  assert.deepEqual(plain(e.app.questionIdsFor(20, surface.subtopic)), [surface.id], "old fine selectors still resolve precisely");

  const mathId = pack.questions.find(q => q.subject === "math").id;
  for (const id of [surface.id, change.id, unknown.id, mathId, futureId]) e.app.State.addMastered(id === mathId ? 15 : 20, id);
  e.app.State.saveBatch(`20/${surface.subtopic}`, [surface.id]);
  e.app.State.saveBatch(`20/${topic}`, [surface.id, futureId]);
  const oldFineBatch = plain(e.app.state.challenge[`20/${surface.subtopic}`]);
  assert.equal(e.app.State.doneCount(20, topic), 1);
  assert.equal(e.app.State.isCleared(20, topic), true);
  e.window._resetChallenge(20, topic);
  assert.equal(e.app.State.doneCount(20, topic), 0);
  assert.deepEqual(plain(e.app.Picker.nextBatch(20, topic)), [surface.id]);
  assert.equal(e.app.State.getMasteredSet(20).has(change.id), true);
  assert.equal(e.app.State.getMasteredSet(20).has(unknown.id), true);
  assert.equal(e.app.State.getMasteredSet(20).has(futureId), true);
  assert.equal(e.app.State.getMasteredSet(15).has(mathId), true);
  assert.deepEqual(plain(e.app.state.challenge[`20/${surface.subtopic}`]), oldFineBatch);
  assert.deepEqual(plain(e.app.state.challenge[`20/${topic}`].batch), [futureId]);
  e.app.renderHome();
  const home = e.node("page-home").innerHTML;
  assert.match(home, /練習主題/);
  assert.match(home, /地表物質/);
  assert.match(home, /地表變化與保護/);
  assert.match(home, /整單元練習/);
  assert.doesNotMatch(home, /S1a 土壤的組成|新細概念待分類/);
});

test("third-batch fine tags map to the existing seven science topics", async () => {
  const e = await boot();
  const topics = e.window.StudyScienceTopics;
  assert.equal(topics.topicsForUnit(20).length + topics.topicsForUnit(21).length, 7);
  for (const [unit, key, fineTags] of [
    [20, "@science-topic:S1b", ["S1b 地表作用與結果"]],
    [21, "@science-topic:S2b-plants", ["S2b 水生植物圖像分類", "S2b 沉水植物與水位", "S2b 植物觀察紀錄判讀"]]
  ]) {
    for (const subtopic of fineTags) {
      const question = { unit, subtopic };
      assert.equal(topics.topicForQuestion(question)?.key, key);
      assert.equal(topics.matches(question, key), true);
      assert.equal(topics.matches(question, subtopic), true, "fine-tag history remains readable");
    }
  }
  const unknown = { unit: 21, subtopic: "S2b 尚未分類的合成細標籤" };
  assert.equal(topics.topicForQuestion(unknown), null);
  assert.equal(topics.matches(unknown, ""), true);
  assert.equal(topics.matches(unknown, "@science-topic:S2b-plants"), false);
  const excludedWindTag = { unit: 20, subtopic: "S1b 風力與顆粒大小" };
  assert.equal(topics.topicForQuestion(excludedWindTag), null);
  assert.equal(topics.matches(excludedWindTag, ""), true);
  assert.equal(topics.matches(excludedWindTag, "@science-topic:S1b"), false);
});
