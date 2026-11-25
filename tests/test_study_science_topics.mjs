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

test("fourth- and fifth-batch fine tags stay in the existing ground-change and earthquake topics", async () => {
  const e = await boot();
  const topics = e.window.StudyScienceTopics;
  for (const [subtopic, key] of [
    ["S1b 流水搬運圖示", "@science-topic:S1b"],
    ["S1b 坡度與流水侵蝕比較", "@science-topic:S1b"],
    ["S1c 地震當下行動", "@science-topic:S1c"],
    ["S1c 地震保命步驟", "@science-topic:S1c"]
  ]) {
    const question = { unit: 20, subtopic };
    assert.equal(topics.topicForQuestion(question)?.key, key);
    assert.equal(topics.matches(question, key), true);
    assert.equal(topics.matches(question, subtopic), true);
  }
  assert.equal(topics.topicsForUnit(20).length + topics.topicsForUnit(21).length, 7);
});

test("sixth-batch fine tags stay under ground change while old fine selectors remain exact", async () => {
  const e = await boot();
  const topics = e.window.StudyScienceTopics;
  for (const subtopic of ["S1b 地表材料與侵蝕抵抗", "S1b 坡度、降雨與流水搬運", "S1b 測風計風力強弱判讀"]) {
    const question = { unit: 20, subtopic };
    assert.equal(topics.topicForQuestion(question)?.key, "@science-topic:S1b");
    assert.equal(topics.matches(question, "@science-topic:S1b"), true);
    assert.equal(topics.matches(question, subtopic), true);
    assert.equal(topics.matches(question, "@science-topic:S1a"), false);
  }
  assert.equal(topics.topicsForUnit(20).length + topics.topicsForUnit(21).length, 7);
});

test("final science topics partition the original shards and keep whole-unit and old selector access", async () => {
  const shard = (unit, hash, size, subtopic) => ({
    unit, hash, subject: "science",
    ids: Array.from({ length: size }, (_, index) => `science-g4s1-synthetic-topic-${unit}-${size}-${index}-v1`),
    subtopics: Array(size).fill(subtopic)
  });
  const soundLight = shard(29, "547f3bea37dced529508819d2b9b411d3e9c295d84a20fd7ba80993e127b0bf5", 53, "聲音與光");
  const electricity = shard(30, "04a9b79f26a46bdbfbe15f1a901c427bc05797794c1e6cf8a48f10935fe82748", 51, "電路與用電");
  const circuit = shard(30, "fcfbc866e9592fc1f40518b5c9fdbfb8ac9e32c0ff1202494e17dd37e9d4d8de", 1, "電路與用電");
  const future = shard(29, "0".repeat(64), 1, "聲音與光");
  const manifest = { shards: [electricity, future, circuit, soundLight] };
  const cache = { manifest: async () => manifest };
  const e = await boot(undefined, "test-child", { catalogCache: cache });
  e.app.State.setStudyTerm("g4-s1");
  e.app.State.setSubject("science");
  e.app.renderHome();
  const topics = e.window.StudyScienceTopics;
  for (const [unit, expectedCounts, count] of [[29, [5, 8, 20, 10, 10], 54], [30, [11, 5, 13, 7, 7, 9], 52]]) {
    const unitTopics = topics.topicsForUnit(unit, manifest);
    const idsByTopic = [...unitTopics].map(topic => [...e.app.questionIdsFor(unit, topic.key)]);
    assert.deepEqual(idsByTopic.map(ids => ids.length), expectedCounts);
    assert.equal(new Set(idsByTopic.flat()).size, unit === 29 ? count - 1 : count);
    assert.equal(e.app.questionIdsFor(unit).length, count);
    for (const topic of unitTopics) assert.ok(e.node("page-home").innerHTML.includes(topic.label));
  }
  const sound = "@science-topic:S3-sound";
  assert.ok(e.app.questionIdsFor(29, sound).includes(soundLight.ids[0]));
  assert.equal(e.app.questionIdsFor(29, "聲音與光").length, 54);
  assert.ok(e.app.questionIdsFor(30, "@science-topic:S4-circuit").includes(circuit.ids[0]));
  e.app.State.addMastered(29, soundLight.ids[0]);
  assert.equal(e.app.State.doneCount(29, sound), 1);
  assert.doesNotMatch(e.node("page-home").innerHTML, /接續上次/);
  e.app.State.saveBatch("29/聲音與光", [soundLight.ids[0], soundLight.ids[1]]);
  e.app.renderHome();
  assert.match(e.node("page-home").innerHTML, /聲音與光.*上次還有 1 題/);
  assert.match(e.node("page-home").innerHTML, /接續上次/);
  e.app.State.addMastered(29, soundLight.ids[1]);
  e.app.renderHome();
  assert.doesNotMatch(e.node("page-home").innerHTML, /接續上次/);
  assert.equal(topics.topicForQuestion({ unit: 29, id: future.ids[0], subtopic: "聲音與光" }, manifest), null);
  assert.equal(topics.topicsForUnit(29).length, 0, "manual packs keep their original concepts");
});
