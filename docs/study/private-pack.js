// 私用 U1 題包契約；內容只留在本機，與 child 進度分開保存。
(function(root) {
  "use strict";
  const KEY = "study:private-pack:g4-s1-math-u1";
  const MAX_BYTES = 128 * 1024;
  const IDS = ["tyk111-I-01", "tyk113-II-11a", "tyk113-II-11d", "tyk111-II-02", "tyk111-IV-01", "anh114-II-08"].map(id => `math-g4s1-${id}-v1`);
  const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
  const text = x => typeof x === "string" && x.trim().length > 0;
  function keys(value, required) {
    return object(value) && Object.keys(value).length === required.length && required.every(k => Object.hasOwn(value, k));
  }
  function semantic(q) {
    // 不自行判定文字改動是否仍是同一道題；只忽略 JSON 欄位順序。
    return JSON.stringify([q.type, q.text, q.options, q.answer, q.blanks ? q.blanks.map(b => [b.input, b.answer]) : null]);
  }
  function parse(raw, publicQuestions = [], previous = null) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error("題包超過 128 KiB 或不是文字檔。");
    let pack;
    try { pack = JSON.parse(raw); } catch { throw new Error("JSON 格式無法讀取。"); }
    if (!keys(pack, ["schemaVersion", "packId", "revision", "questions", "explanations"]) || pack.schemaVersion !== 1 || pack.packId !== "g4-s1-math-u1" || !Number.isSafeInteger(pack.revision) || pack.revision < 1) throw new Error("題包版本或欄位不支援。");
    if (!Array.isArray(pack.questions) || pack.questions.length !== IDS.length || !keys(pack.explanations, IDS)) throw new Error("題包必須包含首批六題與每題解說。");
    const seen = new Set(publicQuestions.map(q => q.id));
    for (const q of pack.questions) {
      if (!object(q) || !IDS.includes(q.id) || seen.has(q.id)) throw new Error("題目 ID 不支援或重複。");
      seen.add(q.id);
      const fields = ["id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer"];
      if (q.type === "fill_in_blank") fields.push("blanks");
      if (!keys(q, fields) || q.subject !== "math" || q.unit !== 15 || !["text", "subtopic", "source"].every(k => text(q[k])) || !text(pack.explanations[q.id])) throw new Error("題目範圍、文字或解說無效。");
      if (!Array.isArray(q.options)) throw new Error("選項格式無效。");
      if (q.type === "multiple_choice") {
        if (q.options.length !== 4 || !q.options.every(text) || !/^[1-4]$/.test(q.answer) || typeof q.answer !== "string") throw new Error("選擇題需四個選項與 1–4 字串答案。");
      } else if (q.type === "fill_in_blank") {
        if (q.options.length || q.answer !== "" || !Array.isArray(q.blanks) || q.blanks.length < 1 || q.blanks.length > 9) throw new Error("填空題格式無效。");
        for (const [i, b] of q.blanks.entries()) {
          if (!keys(b, ["answer", "input"]) || typeof b.answer !== "string" || !(b.input === "number" ? /^(0|[1-9][0-9]{0,7})$/.test(b.answer) : b.input === "comparison" && /^[<>=]$/.test(b.answer))) throw new Error("填空答案或輸入方式無效。");
          if (!q.text.includes(`（${"１２３４５６７８９"[i]}）`)) throw new Error("填空題缺少對應的全形空格標記。");
        }
      } else throw new Error("此題型尚未支援。");
      const old = previous && previous.questions.find(p => p.id === q.id);
      if (old && semantic(old) !== semantic(q)) throw new Error("相同 ID 的作答內容已改變，未替換原題包。");
    }
    if (previous) {
      if (pack.revision < previous.revision) throw new Error("不能匯入較舊版本。");
      const normalized = p => JSON.stringify(IDS.map(id => {
        const q = p.questions.find(q => q.id === id);
        return [id, semantic(q), q.subtopic, q.source, p.explanations[id]];
      }));
      if (pack.revision === previous.revision && normalized(pack) !== normalized(previous)) throw new Error("內容更新必須提高 revision。");
    }
    return pack;
  }
  function save(raw, publicQuestions, previous, readStored, safeSet) {
    const pack = parse(raw, publicQuestions, previous);
    // 另一分頁可能已匯入／升版；寫入前讀最新持久包，不以本頁快照代替。
    // readStored 必須保留讀取失敗，不能將 SecurityError 吞成「沒有包」。
    let storedRaw;
    try { storedRaw = readStored(KEY); }
    catch { throw new Error("無法讀取本機題包，未匯入。請確認儲存空間可用後重試。"); }
    if (storedRaw !== null) {
      let stored;
      try { stored = parse(storedRaw, publicQuestions); }
      catch { throw new Error("本機題包已損毀或版本不支援，未覆寫。請先保留原檔並請家長協助處理。"); }
      parse(raw, publicQuestions, stored);
    }
    if (!safeSet(KEY, JSON.stringify(pack))) throw new Error("題包未保存：本機儲存空間不足或遭封鎖，原題包與進度保留。");
    return pack;
  }
  root.StudyPrivatePack = { KEY, MAX_BYTES, IDS, parse, save };
})(globalThis);
