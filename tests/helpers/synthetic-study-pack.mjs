// Entirely synthetic text/answers; IDs alone mirror the frozen six-question contract.
import { deflateSync } from "node:zlib";

function pngChunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([name, data])) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, name, data, checksum]);
}
export function syntheticPngData(bitDepth = 8, colorType = 6, width = 1, height = 1, paletteCount = colorType === 3 ? 1 : 0, paletteEntries = 16) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = bitDepth; ihdr[9] = colorType;
  const palette = Array.from({ length: paletteCount }, () => pngChunk("PLTE", Buffer.alloc(paletteEntries * 3, 128)));
  const row = colorType === 3 ? Buffer.from([0, ...Array(width).fill(0)]) : Buffer.from([0, ...Array(width).fill([12, 34, 56, 255]).flat()]);
  const pixels = Buffer.concat(Array(height).fill(row));
  const bytes = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr), ...palette, pngChunk("IDAT", deflateSync(pixels)), pngChunk("IEND", Buffer.alloc(0))]);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}
export const ids = ["tyk111-I-01", "tyk113-II-11a", "tyk113-II-11d", "tyk111-II-02", "tyk111-IV-01", "anh114-II-08"].map(x => `math-g4s1-${x}-v1`);
export function syntheticPack() {
  return { schemaVersion: 1, packId: "g4-s1-math-u1", revision: 1,
    questions: ids.map((id, i) => ({ id, subject: "math", unit: 15, subtopic: "合成位值", source: "synthetic fixture only",
      ...(i === 0 ? { type: "multiple_choice", text: "合成練習：哪個數字最大？", options: ["3", "8", "5", "1"], answer: "2" }
        : { type: "fill_in_blank", text: i === 4 ? "合成練習：8（１）3。" : `合成練習：請輸入 ${i === 1 ? "12345678" : i + 1}：（１）`, options: [], answer: "",
          blanks: [{ input: i === 4 ? "comparison" : "number", answer: i === 4 ? ">" : i === 1 ? "12345678" : String(i + 1) }] })
    })), explanations: Object.fromEntries(ids.map((id, i) => [id, `合成解說 ${i + 1}：依題目指定的數字作答。`])) };
}

// #59 activity IDs and shapes only; all text/answers below are invented.
export const additions = [
  ["U1-N001", "tyk113-I-03", 15, "multiple_choice", 0],
  ["U2-N001", "tyk113-II-03", 16, "number", 3],
  ["U2-N002", "tyk113-V-02", 16, "comparison", 1],
  ["U3-N001", "tyk113-I-02", 17, "multiple_choice", 0],
  ["U3-N002", "tyk113-II-04", 17, "number", 1],
  ["U4-N001", "tyk113-I-04", 18, "multiple_choice", 0],
  ["U5-N001", "tyk113-V-03", 19, "comparison", 1],
  ["U5-N002", "c-anho-112-final-II-3", 19, "number", 2],
];
export const addedIds = additions.map(([, original]) => `math-g4s1-${original}-v1`);
export function expandedSyntheticPack() {
  const pack = syntheticPack();
  pack.revision = 2;
  additions.forEach(([, original, unit, input, count], index) => {
    const id = addedIds[index];
    const common = { id, subject: "math", unit, subtopic: `合成單元 ${unit - 14}`, source: "synthetic expansion only" };
    const blanks = Array.from({ length: count }, (_, i) => ({ input, answer: input === "comparison" ? "<" : String(20 + index + i) }));
    pack.questions.push({ ...common, ...(input === "multiple_choice"
      ? { type: "multiple_choice", text: `合成單元 ${unit - 14}：哪個數字最大？`, options: ["3", "8", "5", "1"], answer: "2" }
      : { type: "fill_in_blank", text: `合成單元 ${unit - 14}：` + blanks.map((b, i) => `請填 ${b.answer}：（${"１２３４５６７８９"[i]}）`).join("；"), options: [], answer: "", blanks }) });
    pack.explanations[id] = `新增合成解說 ${index + 1}：依指定內容逐格作答。`;
  });
  return pack;
}

export function navigationSyntheticPack(count = 18) {
  if (!Number.isInteger(count) || count < ids.length) throw Error("Synthetic navigation count must preserve the original six fixtures");
  const pack = syntheticPack();
  pack.revision = 100 + count;
  for (let index = pack.questions.length; index < count; index++) {
    const number = index + 1;
    const id = `math-g4s1-synthetic-nav-${String(number).padStart(3, "0")}-v1`;
    const subtopic = number === count ? "合成單題概念" : "合成多題概念";
    pack.questions.push({
      id, subject: "math", unit: 15, subtopic, source: "synthetic navigation fixture only",
      type: "multiple_choice", text: `合成導覽題第 ${number} 題：哪個數字最大？`,
      options: ["3", "8", "5", "1"], answer: "2",
    });
    pack.explanations[id] = `合成導覽解說 ${number}：依題目指定的數字作答。`;
  }
  return pack;
}

export function scienceSyntheticPack() {
  const pack = syntheticPack();
  pack.revision = 5;
  const questions = [
    { id: "science-g4s1-synthetic-S1-01-v1", subject: "science", unit: 20, type: "true_false", text: "合成自然練習：觀察紀錄需要日期。", subtopic: "合成觀察", source: "synthetic fixture only", options: [], answer: "true" },
    { id: "science-g4s1-synthetic-S2-01-v1", subject: "science", unit: 21, type: "multiple_choice", text: "合成自然練習：哪一項是觀察工具？", subtopic: "合成工具", source: "synthetic fixture only", options: ["尺", "碗", "枕頭", "鞋"], answer: "1" },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：依觀察目的選擇作法。";
  return pack;
}

export function socialSyntheticPack() {
  const pack = scienceSyntheticPack();
  pack.revision = 11;
  const questions = [
    { id: "social-g4s1-synthetic-map-01-v1", subject: "social", unit: 22, type: "multiple_choice",
      text: "合成社會練習：依文字線索，哪個位置在北方？", subtopic: "地圖與位置", source: "synthetic fixture only",
      options: ["甲", "乙", "丙", "丁"], answer: "2" },
    { id: "social-g4s1-synthetic-land-01-v1", subject: "social", unit: 22, type: "true_false",
      text: "合成社會練習：不同地形會影響生活方式。", subtopic: "地形與生活", source: "synthetic fixture only",
      options: [], answer: "true" },
    { id: "social-g4s1-synthetic-water-01-v1", subject: "social", unit: 22, type: "true_false",
      text: "合成社會練習：所有地方的降雨量都完全相同。", subtopic: "氣候與水資源", source: "synthetic fixture only",
      options: [], answer: "false" },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：依題目中的文字線索判斷。";
  return pack;
}

export function socialSecondSyntheticPack() {
  const pack = socialSyntheticPack();
  pack.revision = 12;
  const questions = [
    { id: "social-g4s1-synthetic-land-group-v1", subject: "social", unit: 22, type: "grouped_choice",
      text: "合成社會練習：依地形剖面圖選出位置。", subtopic: "地形與生活", source: "synthetic fixture only",
      options: ["山地", "丘陵", "台地", "盆地", "平原"], answer: "12345",
      parts: Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), text: `合成位置 ${i + 1}` })),
      material: { kind: "png", data: syntheticPngData(8, 6, 550, 304), alt: "合成地形剖面圖" } },
    { id: "social-g4s1-synthetic-rain-compare-v1", subject: "social", unit: 22, type: "multiple_choice",
      text: "合成社會練習：比較兩張雨量圖。", subtopic: "氣候與水資源", source: "synthetic fixture only",
      options: ["甲", "乙"], answer: "2",
      material: { kind: "png", data: syntheticPngData(8, 6, 550, 304), alt: "合成雨量比較圖" } },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：依圖中的線索判讀。";
  return pack;
}

export function socialUnitTwoSyntheticPack() {
  const pack = socialSecondSyntheticPack();
  pack.revision = 20;
  const questions = [
    { id: "social-g4s1-synthetic-U2-choice-v1", subject: "social", unit: 23, type: "multiple_choice",
      text: "合成社會練習：依材料選出適合的器物。", subtopic: "傳統器物", source: "synthetic fixture only",
      options: ["合成甲", "合成乙", "合成丙"], answer: "3" },
    { id: "social-g4s1-synthetic-U2-group-v1", subject: "social", unit: 23, type: "grouped_choice",
      text: "合成社會練習：選出符合線索的住屋。", subtopic: "傳統住屋", source: "synthetic fixture only",
      options: ["合成甲", "合成乙", "合成丙"], answer: "312",
      parts: Array.from({ length: 3 }, (_, i) => ({ id: String(i + 1), text: `合成住屋線索 ${i + 1}` })) },
    { id: "social-g4s1-synthetic-U2-word-bank-v1", subject: "social", unit: 23, type: "fill_in_blank",
      text: "合成閱讀：請從完整詞庫選出每一空的答案。\n" + Array.from({ length: 13 }, (_, i) => `合成句 ${i + 1}（${String(i + 1).replace(/[0-9]/g, digit => "０１２３４５６７８９"[Number(digit)])}）。`).join("\n"),
      subtopic: "傳統住屋", source: "synthetic fixture only", answer: "",
      options: Array.from({ length: 15 }, (_, i) => `${"ABCDEFGHIJKLMOP"[i]}. 合成詞語 ${i + 1}`),
      blanks: [15, 1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9].map(answer => ({ input: "select", answer: String(answer) })) },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：比較題目提供的材料與線索。";
  return pack;
}

export function groupedSyntheticPack() {
  const pack = scienceSyntheticPack();
  pack.revision = 6;
  const questions = [
    { id: "science-g4s1-synthetic-group-image-v1", subject: "science", unit: 21, type: "grouped_choice",
      text: "合成圖：依觀察標籤逐項選擇。", subtopic: "合成圖像", source: "synthetic fixture only",
      options: ["甲：上方", "乙：下方", "丙：中間"], answer: "123",
      parts: [{ id: "A", text: "圖 A" }, { id: "B", text: "圖 B" }, { id: "C", text: "圖 C" }],
      material: { kind: "png", data: syntheticPngData(8, 6, 550, 304), alt: "550×304 合成尺寸圖" } },
    { id: "science-g4s1-synthetic-group-table-v1", subject: "science", unit: 21, type: "grouped_choice",
      text: "合成表：依資料逐項判斷。", subtopic: "合成表格", source: "synthetic fixture only",
      options: ["O", "X"], answer: "12121212",
      parts: Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), text: `合成敘述 ${i + 1}` })),
      material: { kind: "table", caption: "合成動物表", columns: ["代碼", "呼吸", "運動", "環境"], rows: [["A", "鰓", "游", "水中"], ["B", "肺", "走", "陸地"]] } },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：逐項對照共同材料。";
  return pack;
}

// 原創合成題，僅供 schema／判分／瀏覽器驗證，不取材自任何原卷。
export function socialTextVectorsSyntheticPack() {
  const pack = socialUnitTwoSyntheticPack();
  pack.revision = 21;
  const questions = [
    { id: "social-g4s1-synthetic-U2-text-v1", subject: "social", unit: 23, type: "fill_in_blank",
      text: "合成短答：第一個標籤（１），第二個標籤（２）。", subtopic: "合成文字", source: "synthetic fixture only",
      options: [], answer: "", blanks: [{ input: "text", answer: "Alpha", aliases: ["甲城"] }, { input: "text", answer: "<b>合成</b>", aliases: ["乙鎮"] }] },
    { id: "social-g4s1-synthetic-U2-vectors-v1", subject: "social", unit: 23, type: "fill_in_blank",
      text: "合成排列：前兩格可以互換（１）（２）；末兩格必須依序（３）（４）。", subtopic: "合成排列", source: "synthetic fixture only",
      options: ["甲標籤", "乙標籤", "丙標籤", "丁標籤"], answer: "",
      blanks: ["1", "2", "3", "4"].map(answer => ({ input: "select", answer })),
      acceptedAnswers: [["1", "2", "3", "4"], ["2", "1", "3", "4"]] },
  ];
  pack.questions.push(...questions);
  for (const q of questions) pack.explanations[q.id] = "合成解說：逐項核對本題指定的標籤與排列。";
  return pack;
}
