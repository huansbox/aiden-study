/* 四上自然與社會練習主題；保留既有檔名/API。細標籤仍是題包 metadata 與舊進度的原始名稱。 */
(function(root) {
  "use strict";
  // Rev25 retained these immutable shards. Positions are zero-based in descriptor.ids,
  // so the public topic map needs no private IDs, source locators, or question text.
  const soundLight = "547f3bea37dced529508819d2b9b411d3e9c295d84a20fd7ba80993e127b0bf5";
  const electricity = "04a9b79f26a46bdbfbe15f1a901c427bc05797794c1e6cf8a48f10935fe82748";
  const circuitActivity = "fcfbc866e9592fc1f40518b5c9fdbfb8ac9e32c0ff1202494e17dd37e9d4d8de";
  const definitions = [
    { unit: 20, key: "@science-topic:S1a", label: "地表物質", subtopics: [
      "S1a 土壤的組成", "S1a 岩石中的礦物與用途", "S1a 砂質土壤與水稻栽培",
      "S1a 地表物質的特性與用途"
    ] },
    { unit: 20, key: "@science-topic:S1b", label: "地表變化與保護", subtopics: [
      "S1b 人類活動與地表變動", "S1b 山坡地開發風險", "S1b 水流強度與搬運",
      "S1b 森林資源保護行動", "S1b 植被與坡地保護", "S1b 顆粒大小與搬運",
      "S1b 地表作用與結果", "S1b 流水搬運圖示", "S1b 坡度與流水侵蝕比較",
      "S1b 地表材料與侵蝕抵抗", "S1b 坡度、降雨與流水搬運", "S1b 測風計風力強弱判讀"
    ] },
    { unit: 20, key: "@science-topic:S1c", label: "地震與防災", subtopics: [
      "S1c 地震與地裂", "S1c 地震與堰塞湖", "S1c 地震當下行動", "S1c 地震保命步驟",
      "S1c 地震與地表變動"
    ] },
    { unit: 21, key: "@science-topic:S2a", label: "水域環境與觀察", subtopics: [
      "S2a 人工水域與觀察場域", "S2a 水生動物與棲地", "S2a 水域調查安全與紀錄",
      "S2a 水域調查紀錄", "S2a 海洋水域特徵", "S2a 淡水與海水棲地"
    ] },
    { unit: 21, key: "@science-topic:S2b-plants", label: "水生植物", subtopics: [
      "S2b 沉水植物與水流", "S2b 陸生與水生植物構造", "S2b 睡蓮葉柄與水位",
      "S2b 漂浮植物通氣構造", "S2b 蓮的通氣構造",
      "S2b 水生植物圖像分類", "S2b 沉水植物與水位", "S2b 植物觀察紀錄判讀",
      "S2b 水生植物形態與生活"
    ] },
    { unit: 21, key: "@science-topic:S2b-animals", label: "水生動物", subtopics: [
      "S2b 水生動物呼吸構造", "S2b 動物呼吸、運動與棲地",
      "S2b 魚體形狀與水阻", "S2b 魚體部位與功能"
    ] },
    { unit: 21, key: "@science-topic:S2c", label: "水域保護", subtopics: [
      "S2c 人類行為與水域後果", "S2c 水域保護與破壞行為", "S2c 水域活動與環境破壞",
      "S2c 放生與水域生態", "S2c 肥料流入、藻類與缺氧", "S2c 捕魚季節與護魚措施"
    ] },
    { unit: 23, key: "@social-topic:U2-materials", label: "住屋建材與環境", subtopics: [
      "住屋與器物的就地取材", "住屋建材與環境", "傳統住屋的材料、形式與保存",
      "傳統材料與自然循環", "原住民族住屋與環境", "地下屋與族群", "地下屋與地點",
      "地下屋與環境", "地下屋建材", "石板屋特徵", "土埆厝建材", "傳統住屋就地取材",
      "傳統住屋建材", "雅美族地下屋", "石板屋特性", "石板屋建材", "石板屋功能",
      "石板屋與族群", "漢人傳統住屋建材", "竹管仔厝建材", "傳統住屋的建材",
      "漢人的傳統住屋", "傳統住屋的建材與環境", "傳統住屋的建築智慧"
    ] },
    { unit: 23, key: "@social-topic:U2-life", label: "漢人住屋與三合院生活", subtopics: [
      "三合院的空間與倫理", "三合院空間與農業生活", "漢人傳統住屋形式", "三合院空間與倫理",
      "三合院空間與自給自足生活", "傳統住屋形式與空間", "三合院正身與空間用途",
      "漢人住屋形式改變", "傳統住屋空間與視角", "三合院空間用途", "三合院周遭水池用途",
      "三合院稻埕用途", "三合院周遭竹林果樹", "三合院的環境與生活", "漢人傳統住屋的形式"
    ] },
    { unit: 23, key: "@social-topic:U2-preservation", label: "住屋改變與文化保存", subtopics: [
      "傳統住屋的文化展示", "傳統住屋的改變與保存", "傳統住屋與現代改建",
      "傳統住屋的活化與保存", "傳統住屋保存", "傳統住屋的保存與再利用", "傳統住屋的改變"
    ] },
    { unit: 23, key: "@social-topic:U2-utensils", label: "生活器物與環境", subtopics: [
      "傳統器物與自然資源", "傳統器物的用途與今昔對照", "魚筌材質、構造與用途",
      "器物用途的今昔對照", "傳統器物的功能", "傳統住屋與生活器物", "傳統生活器物",
      "塑膠廢棄物與環境", "減塑與重複使用", "塑膠材料與減塑理由",
      "生活器物的今昔改變與減塑", "現代生活器物與環境"
    ] },
    { unit: 29, key: "@science-topic:S3-sound", label: "聲音的產生與傳播", positions: {
      [soundLight]: [0, 2, 5, 6, 12]
    } },
    { unit: 29, key: "@science-topic:S3-light-sources", label: "光源與看見物體", positions: {
      [soundLight]: [3, 21, 23, 28, 30, 34, 38, 40]
    } },
    { unit: 29, key: "@science-topic:S3-shadows", label: "光直線前進與影子", positions: {
      [soundLight]: [1, 16, 18, 19, 22, 24, 25, 26, 29, 31, 33, 37, 43, 46, 47, 48, 49, 50, 51, 52]
    } },
    { unit: 29, key: "@science-topic:S3-reflection", label: "鏡面與光的反射", positions: {
      [soundLight]: [4, 8, 10, 17, 27, 32, 36, 42, 44, 45]
    } },
    { unit: 29, key: "@science-topic:S3-applications", label: "生活中的反光與聲光訊號", positions: {
      [soundLight]: [7, 9, 11, 13, 14, 15, 20, 35, 39, 41]
    } },
    { unit: 30, key: "@science-topic:S4-circuit", label: "電池、燈泡與通路", positions: {
      [electricity]: [0, 2, 4, 25, 28, 33, 34, 35, 41, 42], [circuitActivity]: [0]
    } },
    { unit: 30, key: "@science-topic:S4-conductors", label: "導體、絕緣與開關", positions: {
      [electricity]: [8, 20, 30, 31, 44]
    } },
    { unit: 30, key: "@science-topic:S4-series-parallel", label: "串聯、並聯與亮度", positions: {
      [electricity]: [3, 5, 9, 21, 23, 26, 27, 32, 36, 47, 48, 49, 50]
    } },
    { unit: 30, key: "@science-topic:S4-devices", label: "小馬達與 LED", positions: {
      [electricity]: [1, 11, 12, 13, 24, 37, 43]
    } },
    { unit: 30, key: "@science-topic:S4-safety", label: "用電安全與電池回收", positions: {
      [electricity]: [6, 7, 10, 29, 40, 45, 46]
    } },
    { unit: 30, key: "@science-topic:S4-energy", label: "生活用電與節電", positions: {
      [electricity]: [14, 15, 16, 17, 18, 19, 22, 38, 39]
    } }
  ];
  const byKey = new Map(definitions.map(topic => [topic.key, topic]));
  const bySubtopic = new Map(definitions.flatMap(topic => (topic.subtopics || []).map(subtopic => [`${topic.unit}/${subtopic}`, topic])));
  const topicsForUnit = (unit, manifest) => definitions.filter(topic => topic.unit === unit && (manifest || !topic.positions));
  const catalogTopics = new WeakMap();
  function topicsById(manifest) {
    let byId = catalogTopics.get(manifest);
    if (!byId) {
      byId = new Map();
      for (const shard of manifest.shards) {
        for (const topic of topicsForUnit(shard.unit, manifest)) {
          for (const position of topic.positions?.[shard.hash] || []) {
            const id = shard.ids[position];
            if (id) byId.set(id, topic);
          }
        }
      }
      catalogTopics.set(manifest, byId);
    }
    return byId;
  }
  const topicForQuestion = (q, manifest) => {
    const topic = manifest && topicsById(manifest).get(q.id);
    return (topic?.unit === q.unit ? topic : bySubtopic.get(`${q.unit}/${q.subtopic}`)) || null;
  };
  const isTopicSelection = selection => byKey.has(selection);
  function matches(q, selection, manifest) {
    if (!selection) return true;
    const topic = byKey.get(selection);
    if (topic) return q.unit === topic.unit && topicForQuestion(q, manifest) === topic;
    if (selection.startsWith("@science-topic:") || selection.startsWith("@social-topic:")) return false;
    return q.subtopic === selection; // 舊細標籤的進度與批次仍可精確讀取。
  }
  const labelFor = selection => byKey.get(selection)?.label || selection;
  root.StudyScienceTopics = { topicsForUnit, topicForQuestion, isTopicSelection, matches, labelFor };
})(typeof window !== "undefined" ? window : globalThis);
