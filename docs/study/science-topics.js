/* 四上自然練習主題。細標籤仍是題包 metadata 與舊進度的原始名稱。 */
(function(root) {
  "use strict";
  const definitions = [
    { unit: 20, key: "@science-topic:S1a", label: "地表物質", subtopics: [
      "S1a 土壤的組成", "S1a 岩石中的礦物與用途", "S1a 砂質土壤與水稻栽培"
    ] },
    { unit: 20, key: "@science-topic:S1b", label: "地表變化與保護", subtopics: [
      "S1b 人類活動與地表變動", "S1b 山坡地開發風險", "S1b 水流強度與搬運",
      "S1b 森林資源保護行動", "S1b 植被與坡地保護", "S1b 顆粒大小與搬運",
      "S1b 地表作用與結果"
    ] },
    { unit: 20, key: "@science-topic:S1c", label: "地震與防災", subtopics: [
      "S1c 地震與地裂", "S1c 地震與堰塞湖"
    ] },
    { unit: 21, key: "@science-topic:S2a", label: "水域環境與觀察", subtopics: [
      "S2a 人工水域與觀察場域", "S2a 水生動物與棲地", "S2a 水域調查安全與紀錄",
      "S2a 水域調查紀錄", "S2a 海洋水域特徵", "S2a 淡水與海水棲地"
    ] },
    { unit: 21, key: "@science-topic:S2b-plants", label: "水生植物", subtopics: [
      "S2b 沉水植物與水流", "S2b 陸生與水生植物構造", "S2b 睡蓮葉柄與水位",
      "S2b 漂浮植物通氣構造", "S2b 蓮的通氣構造",
      "S2b 水生植物圖像分類", "S2b 沉水植物與水位", "S2b 植物觀察紀錄判讀"
    ] },
    { unit: 21, key: "@science-topic:S2b-animals", label: "水生動物", subtopics: [
      "S2b 水生動物呼吸構造", "S2b 動物呼吸、運動與棲地",
      "S2b 魚體形狀與水阻", "S2b 魚體部位與功能"
    ] },
    { unit: 21, key: "@science-topic:S2c", label: "水域保護", subtopics: [
      "S2c 人類行為與水域後果", "S2c 水域保護與破壞行為", "S2c 水域活動與環境破壞",
      "S2c 放生與水域生態", "S2c 肥料流入、藻類與缺氧", "S2c 捕魚季節與護魚措施"
    ] }
  ];
  const byKey = new Map(definitions.map(topic => [topic.key, topic]));
  const bySubtopic = new Map(definitions.flatMap(topic => topic.subtopics.map(subtopic => [`${topic.unit}/${subtopic}`, topic])));
  const topicsForUnit = unit => definitions.filter(topic => topic.unit === unit);
  const topicForQuestion = q => bySubtopic.get(`${q.unit}/${q.subtopic}`) || null;
  const isTopicSelection = selection => byKey.has(selection);
  function matches(q, selection) {
    if (!selection) return true;
    const topic = byKey.get(selection);
    if (topic) return q.unit === topic.unit && topic.subtopics.includes(q.subtopic);
    if (selection.startsWith("@science-topic:")) return false;
    return q.subtopic === selection; // 舊細標籤的進度與批次仍可精確讀取。
  }
  const labelFor = selection => byKey.get(selection)?.label || selection;
  root.StudyScienceTopics = { topicsForUnit, topicForQuestion, isTopicSelection, matches, labelFor };
})(typeof window !== "undefined" ? window : globalThis);
