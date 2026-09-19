// Entirely synthetic text/answers; IDs alone mirror the frozen six-question contract.
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
