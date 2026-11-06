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
  const isFinalMath = q => q.subject === "math" && [24, 25, 26, 27, 28].includes(q.unit);
  function canonicalFraction(value, form) {
    const input = String(value ?? "").trim();
    if (/^[0-9]{1,6}$/.test(input)) return ["mixed_or_whole", "any"].includes(form) ? String(Number(input)) : null;
    const match = /^(?:([0-9]{1,6})\s+)?([0-9]{1,6})\s*\/\s*([0-9]{1,6})$/.exec(input);
    if (!match) return null;
    const w = match[1] === undefined ? null : Number(match[1]), n = Number(match[2]), d = Number(match[3]);
    if (!d || form === "proper" && (w !== null || n >= d) || form === "improper" && (w !== null || n < d) || form === "proper_or_improper" && w !== null ||
        ["mixed", "mixed_or_whole"].includes(form) && (w === null || w < 1 || n < 1 || n >= d) ||
        form === "any" && w !== null && n >= d ||
        !["proper", "improper", "proper_or_improper", "mixed", "mixed_or_whole", "any"].includes(form)) return null;
    return `${w === null ? "" : w + " "}${n}/${d}`;
  }
  function fractionValue(value, form) {
    const canonical = canonicalFraction(value, form);
    if (canonical === null) return null;
    if (!canonical.includes("/")) return [BigInt(canonical), 1n];
    const [head, denominator] = canonical.split("/"), parts = head.split(" ").map(BigInt);
    return [parts.length === 2 ? parts[0] * BigInt(denominator) + parts[1] : parts[0], BigInt(denominator)];
  }
  const compareRational = (a, b) => a[0] * BigInt(b[1]) - BigInt(b[0]) * a[1];
  const inRange = (value, range) => {
    const low = compareRational(value, range.min), high = compareRational(value, range.max);
    return (range.minInclusive ? low >= 0n : low > 0n) && (range.maxInclusive ? high <= 0n : high < 0n);
  };
  const decimalValue = input => { const [whole, part = ""] = input.split("."); return [BigInt((whole || "0") + part), 10n ** BigInt(part.length)]; };
  function mathAnswerLabel(blank, options = []) {
    if (blank.input === "decimal_expression") return `${blank.answer}＝${blank.value}`;
    if (blank.range) {
      const format = v => v[1] === 1 ? String(v[0]) : `${v[0]}/${v[1]}`;
      const condition = `${format(blank.range.min)} ${blank.range.minInclusive ? "≤" : "<"} 答案 ${blank.range.maxInclusive ? "≤" : "<"} ${format(blank.range.max)}`;
      return blank.input === "fraction_interval" ? `填 ${blank.count} 個數值不同的${blank.form === "mixed" ? "帶分數" : blank.form === "improper" ? "假分數" : blank.form === "proper" ? "真分數" : blank.form === "mixed_or_whole" ? "帶分數或整數" : "分數"}；每個都符合 ${condition}` : `${condition}（最多兩位小數）`;
    }
    return blank.input === "select" ? options[Number(blank.answer) - 1] : blank.answer;
  }
  function mathBlankCorrect(blank, value) {
    const input = String(value ?? "").trim();
    if (blank.input === "decimal") return /^(?:[0-9]{1,8}(?:\.[0-9]{1,2})?|\.[0-9]{1,2})$/.test(input) && (blank.range ? inRange(decimalValue(input), blank.range) : Number(input) === Number(blank.answer));
    if (blank.input === "decimal_expression") return root.StudyMathInteractions.gradeDecimalExpression(blank, input);
    if (blank.input === "fraction_interval") {
      if (!Array.isArray(value) || value.length !== blank.count || !value.every(v => typeof v === "string")) return false;
      const terms = value.map(v => fractionValue(v, blank.form));
      return terms.every(v => v && inRange(v, blank.range)) && terms.every((v, i) => terms.slice(i + 1).every(other => compareRational(v, other) !== 0n));
    }
    if (blank.input === "fraction") {
      const got = fractionValue(input, blank.form), want = fractionValue(blank.answer, blank.form);
      return got !== null && want !== null && (!blank.denominator || got[1] === BigInt(blank.denominator)) && compareRational(got, want) === 0n;
    }
    if (blank.input === "number") return /^[0-9]{1,8}(?:\.0+)?$/.test(input) && Number(input) === Number(blank.answer);
    if (blank.input === "text") return isBlankCorrect(blank, input, true);
    return isBlankCorrect(blank, input);
  }
  const gradeChoiceSet = (q, values) => Array.isArray(values) && values.length === q.answerSet.length && new Set(values).size === values.length && values.every(value => q.answerSet.includes(value));
  const isSocialText = q => q.subject === "social" && q.unit === 23 && q.blanks[0]?.input === "text";
  const hasCompleteBlanks = (q, values) => Array.isArray(values) && values.length === q.blanks.length &&
    q.blanks.every((blank, index) => isFinalMath(q) && blank.input === "fraction_interval" ? Array.isArray(values[index]) && values[index].length === blank.count && values[index].every(v => typeof v === "string" && !!v.trim()) : isSocialText(q) ? !!normalizeText(values[index]) && Array.from(String(values[index])).length <= 100 : !!String(values[index] ?? "").trim());

  function gradeBlanks(q, values) {
    if (!hasCompleteBlanks(q, values)) return { correct: false, results: q.blanks.map(() => false) };
    if (!q.acceptedAnswers) {
      const results = q.blanks.map((blank, index) => isFinalMath(q) ? mathBlankCorrect(blank, values[index]) : isBlankCorrect(blank, values[index], isSocialText(q)));
      return { correct: results.every(Boolean), results, answers: q.blanks.map(blank => isFinalMath(q) ? mathAnswerLabel(blank, q.options) : blank.answer) };
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

  root.StudyAnswer = { normalizeCompare, normalizeText, isBlankCorrect, hasCompleteBlanks, gradeBlanks, isFinalMath, canonicalFraction, gradeChoiceSet, mathAnswerLabel };
})(globalThis);
