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
