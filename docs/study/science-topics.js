/* 四上自然與社會練習主題；保留既有檔名/API。細標籤仍是題包 metadata 與舊進度的原始名稱。 */
(function(root) {
  "use strict";
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
    if (selection.startsWith("@science-topic:") || selection.startsWith("@social-topic:")) return false;
    return q.subtopic === selection; // 舊細標籤的進度與批次仍可精確讀取。
  }
  const labelFor = selection => byKey.get(selection)?.label || selection;
  root.StudyScienceTopics = { topicsForUnit, topicForQuestion, isTopicSelection, matches, labelFor };
})(typeof window !== "undefined" ? window : globalThis);
