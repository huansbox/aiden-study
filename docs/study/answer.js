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
  function isBlankCorrect(blank, value) {
    const v = String(value ?? "").trim();
    if (blank.input === "number") {
      const got = parseFloat(v), want = parseFloat(blank.answer);
      return Number.isFinite(got) && got === want;
    }
    return normalizeCompare(v) === normalizeCompare(blank.answer);
  }

  root.StudyAnswer = { normalizeCompare, isBlankCorrect };
})(globalThis);
