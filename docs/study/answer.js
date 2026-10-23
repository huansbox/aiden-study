// Study 與家長試玩共用的純答案判定；不得在此讀寫題目、進度或瀏覽器儲存。
(function(root) {
  "use strict";

  // 全半形正規化＋去空白（與 data_helpers.normalize_for_compare 對齊）
  function normalizeCompare(s) {
    let out = "";
    for (const ch of String(s ?? "")) {
      const c = ch.codePointAt(0);
      if (c >= 0xFF01 && c <= 0xFF5E) out += String.fromCodePoint(c - 0xFEE0);
      else if (ch === "　") out += " ";
      else out += ch;
    }
    return out.replace(/\s+/g, "");
  }

  // 單格比對：number 用數值相等（63 與 63.0 視為相同），其餘全半形正規化字串比對
  function isBlankCorrect(blank, value, strictText = false) {
    const v = String(value ?? "").trim();
    if (blank.input === "text" && strictText) {
      const normalized = normalizeText(v);
      return !!normalized && [blank.answer, ...(blank.aliases || [])].some(answer => normalizeText(answer) === normalized);
    }
    if (blank.input === "number") {
      const got = parseFloat(v), want = parseFloat(blank.answer);
      return Number.isFinite(got) && got === want;
    }
    return normalizeCompare(v) === normalizeCompare(blank.answer);
  }

  // 文字題只接受完整字串；保留字串內的空白，不做包含或模糊比對。
  const normalizeText = value => String(value ?? "").normalize("NFKC").trim();
  const isSocialText = q => q.subject === "social" && q.unit === 23 && q.blanks[0]?.input === "text";
  const hasCompleteBlanks = (q, values) => Array.isArray(values) && values.length === q.blanks.length &&
    q.blanks.every((blank, index) => isSocialText(q) ? !!normalizeText(values[index]) && Array.from(String(values[index])).length <= 100 : !!String(values[index] ?? "").trim());

  function gradeBlanks(q, values) {
    if (!hasCompleteBlanks(q, values)) return { correct: false, results: q.blanks.map(() => false) };
    if (!q.acceptedAnswers) {
      const results = q.blanks.map((blank, index) => isBlankCorrect(blank, values[index], isSocialText(q)));
      return { correct: results.every(Boolean), results, answers: q.blanks.map(blank => blank.answer) };
    }
    // 回饋固定對照同一完整向量；不能將不同排列的逐格最佳答案拼在一起。
    let results = q.blanks.map(() => false), score = -1, answers = q.acceptedAnswers[0];
    for (const vector of q.acceptedAnswers) {
      const candidate = vector.map((answer, index) => values[index] === answer);
      const matches = candidate.filter(Boolean).length;
      if (matches > score) { results = candidate; score = matches; answers = vector; }
    }
    return { correct: results.every(Boolean), results, answers };
  }

  root.StudyAnswer = { normalizeCompare, normalizeText, isBlankCorrect, hasCompleteBlanks, gradeBlanks };
})(globalThis);
