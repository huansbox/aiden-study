// 四上家庭題包；保留歷史 U1 key，內容與 child 進度分開保存。
(function(root) {
  "use strict";
  const KEY = "study:private-pack:g4-s1-math-u1";
  const MAX_BYTES = 256 * 1024;
  const IDS = ["tyk111-I-01", "tyk113-II-11a", "tyk113-II-11d", "tyk111-II-02", "tyk111-IV-01", "anh114-II-08"].map(id => `math-g4s1-${id}-v1`);
  const SUBJECT_UNITS = { math: [15, 16, 17, 18, 19, 24, 25, 26, 27, 28], science: [20, 21, 29, 30], social: [22, 23, 31, 32] };
  const UNITS = Object.values(SUBJECT_UNITS).flat().sort((a, b) => a - b);
  const ID_RE = /^(math|science|social)-g4s1-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-v[1-9][0-9]*$/;
  const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
  const text = x => typeof x === "string" && x.trim().length > 0;
  const boundedText = (x, limit) => text(x) && Array.from(x).length <= limit;
  const finalMath = q => q.subject === "math" && [24, 25, 26, 27, 28].includes(q.unit);
  function fraction(value, form) {
    if (typeof value !== "string") return null;
    const whole = /^(0|[1-9][0-9]{0,5})$/.exec(value);
    if (whole) return form === "mixed_or_whole" ? [BigInt(value), 1n] : null;
    const match = /^(?:(0|[1-9][0-9]{0,5}) )?(0|[1-9][0-9]{0,5})\/([1-9][0-9]{0,5})$/.exec(value);
    if (!match) return null;
    const w = match[1] === undefined ? null : BigInt(match[1]), n = BigInt(match[2]), d = BigInt(match[3]);
    if (form === "proper" && (w !== null || n >= d) || form === "improper" && (w !== null || n < d) || form === "proper_or_improper" && w !== null ||
        ["mixed", "mixed_or_whole"].includes(form) && (w === null || w < 1n || n < 1n || n >= d) ||
        !["proper", "improper", "proper_or_improper", "mixed", "mixed_or_whole"].includes(form)) return null;
    return [(w || 0n) * d + n, d];
  }
  const rational = value => Array.isArray(value) && value.length === 2 && value.every(Number.isSafeInteger) && value[0] >= 0 && value[1] > 0;
  const compareRational = (a, b) => BigInt(a[0]) * BigInt(b[1]) - BigInt(b[0]) * BigInt(a[1]);
  function validateRange(range) {
    if (!keys(range, ["min", "max", "minInclusive", "maxInclusive"]) || !rational(range.min) || !rational(range.max) ||
        typeof range.minInclusive !== "boolean" || typeof range.maxInclusive !== "boolean" || compareRational(range.min, range.max) >= 0n) throw new Error("數學範圍需有明確有理數上下界。");
  }
  const inRange = (v, r) => (r.minInclusive ? compareRational(v, r.min) >= 0n : compareRational(v, r.min) > 0n) && (r.maxInclusive ? compareRational(v, r.max) <= 0n : compareRational(v, r.max) < 0n);
  function validateMathBlanks(q) {
    if (q.answer !== "" || !Array.isArray(q.blanks) || q.blanks.length < 1 || q.blanks.length > 9) throw new Error("數學填空格式無效。");
    const select = q.blanks.some(b => b?.input === "select");
    if (select ? q.options.length < 2 || q.options.length > 15 || !q.options.every(x => boundedText(x, 300)) : q.options.length) throw new Error("數學原選項格式無效。");
    for (const [index, b] of q.blanks.entries()) {
      const fields = ["input", "answer"];
      if (b?.input === "text" && Object.hasOwn(b, "aliases")) fields.push("aliases");
      if (b?.input === "fraction") { fields.push("form"); for (const field of ["accept", "denominator"]) if (Object.hasOwn(b, field)) fields.push(field); }
      if (b?.input === "fraction_interval") fields.push("form", "count", "distinct", "range");
      if (b?.input === "decimal" && Object.hasOwn(b, "range")) fields.push("range");
      if (!keys(b, fields) || typeof b.answer !== "string") throw new Error("數學填空欄位無效。");
      if (Object.hasOwn(b, "range")) validateRange(b.range);
      if (b.input === "number") { if (!/^(0|[1-9][0-9]{0,7})$/.test(b.answer)) throw new Error("整數答案無效。"); }
      else if (b.input === "decimal") {
        if (!/^(0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/.test(b.answer)) throw new Error("小數答案限兩位小數。");
        const [whole, part = ""] = b.answer.split(".");
        if (b.range && (compareRational(b.range.max, [9999999999, 100]) > 0n || !inRange([BigInt(whole + part), 10n ** BigInt(part.length)], b.range))) throw new Error("小數示例或上下界超出範圍。");
      }
      else if (b.input === "comparison") { if (!/^[<>=]$/.test(b.answer)) throw new Error("比較符號無效。"); }
      else if (b.input === "select") { if (!/^(?:[1-9]|1[0-5])$/.test(b.answer) || Number(b.answer) > q.options.length) throw new Error("原選項索引無效。"); }
      else if (b.input === "text") {
        if (Object.hasOwn(b, "aliases") && (!Array.isArray(b.aliases) || b.aliases.length > 8)) throw new Error("文字別名無效。");
        const terms = [b.answer, ...(b.aliases || [])];
        if (!terms.every(term => boundedText(term, 20) && term.normalize("NFKC").trim()) || new Set(terms.map(term => term.normalize("NFKC").trim())).size !== terms.length) throw new Error("文字答案無效。");
      } else if (b.input === "fraction_interval") {
        if (b.answer !== "" || !Number.isInteger(b.count) || b.count < 1 || b.count > 4 || b.distinct !== true || !["proper", "improper", "proper_or_improper", "mixed", "mixed_or_whole"].includes(b.form)) throw new Error("分數區間格式無效。");
      } else if (b.input === "fraction") {
        const target = fraction(b.answer, b.form);
        if (!target || Object.hasOwn(b, "accept") && (!Array.isArray(b.accept) || b.accept.length > 8)) throw new Error("分數形式無效。");
        const terms = [b.answer, ...(b.accept || [])];
        if (new Set(terms).size !== terms.length || !terms.every(term => { const v = fraction(term, b.form); return v && v[0] * target[1] === target[0] * v[1]; })) throw new Error("分數明列等值答案無效。");
        if (Object.hasOwn(b, "denominator") && (!Number.isSafeInteger(b.denominator) || b.denominator < 1 || b.denominator > 999999 || !terms.every(term => fraction(term, b.form)[1] === BigInt(b.denominator)))) throw new Error("指定分母無效。");
      } else throw new Error("數學輸入型態尚未支援。");
      const marker = String(index + 1).replace(/[0-9]/g, digit => "０１２３４５６７８９"[Number(digit)]);
      if (!q.text.includes(`（${marker}）`)) throw new Error("數學填空標記缺漏。");
    }
  }
  function keys(value, required) {
    return object(value) && Object.keys(value).length === required.length && required.every(k => Object.hasOwn(value, k));
  }
  function semantic(q) {
    // 不自行判定文字改動是否仍是同一道題；只忽略 JSON 欄位順序。
    // unit 與 subtopic 也是進度／半批的索引，不可在同 ID 下搬動。
    return JSON.stringify([q.subject, q.unit, q.subtopic, q.type, q.text, q.options, q.answer,
      q.blanks ? q.blanks.map(b => b.input === "fraction_interval" ? [b.input, b.answer, b.form, b.count, b.distinct, [b.range.min, b.range.max, b.range.minInclusive, b.range.maxInclusive]] : b.input === "fraction" ? [b.input, b.answer, b.form, b.accept || [], ...(Object.hasOwn(b, "denominator") ? [b.denominator] : [])] : b.input === "decimal" && b.range ? [b.input, b.answer, [b.range.min, b.range.max, b.range.minInclusive, b.range.maxInclusive]] : Object.hasOwn(b, "aliases") ? [b.input, b.answer, b.aliases] : [b.input, b.answer]) : null,
      q.parts ? q.parts.map(part => Object.hasOwn(part, "options") ? [part.id, part.text, part.options] : [part.id, part.text]) : null,
      q.material ? q.material.kind === "png" ? ["png", q.material.data, q.material.alt]
        : ["table", q.material.caption, q.material.columns, q.material.rows] : null,
      ...(Object.hasOwn(q, "acceptedAnswers") ? [q.acceptedAnswers] : []),
      ...(q.circuit ? [q.circuit.terminals.map(node => [node.id, node.x, node.y])] : []),
      ...(Object.hasOwn(q, "answerSet") ? [q.answerSet] : [])]);
  }
  function pngBytes(data, maxBytes) {
    if (typeof data !== "string" || !/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error("PNG 格式無效。");
    const base64 = data.slice(22);
    if (!base64 || base64.length > Math.ceil(maxBytes / 3) * 4) throw new Error(`PNG 超過 ${maxBytes / 1024} KiB。`);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes = [];
    for (let i = 0; i < base64.length; i += 4) {
      const a = alphabet.indexOf(base64[i]), b = alphabet.indexOf(base64[i + 1]);
      const c = base64[i + 2] === "=" ? 0 : alphabet.indexOf(base64[i + 2]);
      const d = base64[i + 3] === "=" ? 0 : alphabet.indexOf(base64[i + 3]);
      if ((base64[i + 2] === "=" && (b & 15)) || (base64[i + 3] === "=" && base64[i + 2] !== "=" && (c & 3))) throw new Error("PNG base64 非標準編碼。");
      bytes.push((a << 2) | (b >> 4));
      if (base64[i + 2] !== "=") bytes.push(((b & 15) << 4) | (c >> 2));
      if (base64[i + 3] !== "=") bytes.push(((c & 3) << 6) | d);
    }
    if (bytes.length > maxBytes) throw new Error(`PNG 超過 ${maxBytes / 1024} KiB。`);
    return Uint8Array.from(bytes);
  }
  function pngValid(data, maxBytes, expectedSize) {
    const bytes = pngBytes(data, maxBytes);
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (signature.some((byte, i) => bytes[i] !== byte)) return false;
    const view = new DataView(bytes.buffer);
    let offset = 8, ihdr = false, plte = false, idat = false, iend = false, bitDepth, colorType;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), start = offset + 8, end = start + length;
      if (end + 4 > bytes.length) return false;
      const type = String.fromCharCode(...bytes.slice(offset + 4, start));
      if (!/^[A-Za-z]{4}$/.test(type)) return false;
      let crc = 0xffffffff;
      for (let i = offset + 4; i < end; i++) {
        crc ^= bytes[i];
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
      if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(end)) return false;
      if (!ihdr) {
        if (type !== "IHDR" || length !== 13) return false;
        const width = view.getUint32(start), height = view.getUint32(start + 4);
        if (expectedSize && (width !== expectedSize[0] || height !== expectedSize[1])) return false;
        bitDepth = bytes[start + 8]; colorType = bytes[start + 9];
        const allowedDepths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (width < 1 || width > 1600 || height < 1 || height > 1600 ||
            !allowedDepths[colorType]?.includes(bitDepth) || bytes[start + 10] !== 0 || bytes[start + 11] !== 0 || bytes[start + 12] > 1) return false;
        ihdr = true;
      } else if (type === "IHDR" || type === "acTL" || type === "fcTL" || type === "fdAT") return false;
      if (type === "PLTE") {
        const entries = length / 3;
        if (plte || idat || colorType === 0 || colorType === 4 || !Number.isInteger(entries) || entries < 1 || entries > 256 ||
            (colorType === 3 && entries > 2 ** bitDepth)) return false;
        plte = true;
      }
      if (type === "IDAT" && colorType === 3 && !plte) return false;
      if (type === "IDAT") idat = true;
      if (type === "IEND") { if (length !== 0 || !idat || end + 4 !== bytes.length) return false; iend = true; break; }
      offset = end + 4;
    }
    return ihdr && idat && iend;
  }
  function validateMaterial(material, maxPngBytes, expectedSize) {
    if (material.kind === "png") {
      if (!keys(material, ["kind", "data", "alt"]) || !boundedText(material.alt, 200) || !pngValid(material.data, maxPngBytes, expectedSize)) throw new Error("PNG 題圖格式無效。");
    } else if (material.kind === "table") {
      if (!keys(material, ["kind", "caption", "columns", "rows"]) || !boundedText(material.caption, 300) ||
          !Array.isArray(material.columns) || material.columns.length < 2 || material.columns.length > 8 || !material.columns.every(x => boundedText(x, 80)) ||
          !Array.isArray(material.rows) || material.rows.length < 1 || material.rows.length > 16 ||
          !material.rows.every(row => Array.isArray(row) && row.length === material.columns.length && row.every(x => boundedText(x, 240)))) throw new Error("題目表格格式無效。");
    } else throw new Error("題目媒體格式無效。");
  }
  function parse(raw, publicQuestions = [], previous = null, shard = false) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error("題包超過 256 KiB 或不是文字檔。");
    let pack;
    try { pack = JSON.parse(raw); } catch { throw new Error("JSON 格式無法讀取。"); }
    if (!keys(pack, ["schemaVersion", "packId", "revision", "questions", "explanations"]) || pack.schemaVersion !== (shard ? 2 : 1) || pack.packId !== "g4-s1-math-u1" || !Number.isSafeInteger(pack.revision) || pack.revision < 1) throw new Error("題包版本或欄位不支援。");
    if (!Array.isArray(pack.questions) || !object(pack.explanations)) throw new Error("題包必須包含題目與每題解說。");
    const seen = new Set(publicQuestions.map(q => q.id));
    for (const q of pack.questions) {
      if (!object(q) || typeof q.id !== "string" || !ID_RE.test(q.id) || seen.has(q.id)) throw new Error("題目 ID 不支援或重複。");
      seen.add(q.id);
      const fields = ["id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer"];
      if (q.type === "fill_in_blank") fields.push("blanks");
      if (q.type === "fill_in_blank" && q.subject === "social" && q.unit === 23 && Object.hasOwn(q, "acceptedAnswers")) fields.push("acceptedAnswers");
      if (q.type === "grouped_choice") fields.push("parts");
      if (q.type === "circuit_connect") fields.push("circuit");
      if (q.type === "choice_set") fields.push("answerSet");
      if (Object.hasOwn(q, "material")) fields.push("material");
      const subjectUnits = SUBJECT_UNITS[q.subject] || [];
      if (!keys(q, fields) || !subjectUnits.includes(q.unit) || !q.id.startsWith(`${q.subject}-g4s1-`) || (IDS.includes(q.id) && q.unit !== 15) || !["text", "subtopic", "source"].every(k => text(q[k])) || !Object.hasOwn(pack.explanations, q.id) || !text(pack.explanations[q.id])) throw new Error("題目範圍、文字或解說無效。");
      if (!Array.isArray(q.options)) throw new Error("選項格式無效。");
      if (Object.hasOwn(q, "material")) {
        if (!object(q.material) || (q.subject !== "science" && !((q.subject === "math" && (q.unit === 17 || finalMath(q)) || q.subject === "social" && [22, 23, 31, 32].includes(q.unit)) && q.material.kind === "png"))) throw new Error("題目媒體格式無效。");
        // subject/unit 身分已在上方驗證；僅四上社會原圖細字需要較大 PNG。
        validateMaterial(q.material, q.subject === "social" && [22, 23, 31, 32].includes(q.unit) ? 192 * 1024 : 32 * 1024,
          q.type === "circuit_connect" ? [90, 130] : undefined);
      }
      if (q.type === "choice_set") {
        if (!finalMath(q) || q.answer !== "" || q.options.length < 2 || q.options.length > 10 || !q.options.every(x => boundedText(x, 300)) ||
            !Array.isArray(q.answerSet) || q.answerSet.length < 1 || q.answerSet.length > q.options.length || new Set(q.answerSet).size !== q.answerSet.length ||
            !q.answerSet.every(value => typeof value === "string" && /^(?:[1-9]|10)$/.test(value) && Number(value) <= q.options.length)) throw new Error("完整集合選答格式無效。");
      } else if (q.type === "circuit_connect") {
        const ids = ["battery-positive", "battery-negative", "bulb-glass", "bulb-shell", "bulb-base"];
        if (q.subject !== "science" || q.unit !== 30 || q.options.length || q.answer !== "closed" || q.material?.kind !== "png" ||
            !keys(q.circuit, ["terminals"]) || !Array.isArray(q.circuit.terminals) || q.circuit.terminals.length !== 5) throw new Error("限定電路格式無效。");
        const nodes = q.circuit.terminals;
        for (const [index, node] of nodes.entries()) {
          if (!keys(node, ["id", "x", "y"]) || node.id !== ids[index] || !Number.isInteger(node.x) || !Number.isInteger(node.y) || node.x < 40 || node.x > 960 || node.y < 40 || node.y > 660 ||
              nodes.slice(0, index).some(other => Math.hypot(node.x - other.x, node.y - other.y) < 90)) throw new Error("電路接點格式或距離無效。");
        }
        if (nodes[0].x !== nodes[1].x || nodes[1].y - nodes[0].y < 120) throw new Error("電池接點位置無效。");
      } else if (q.type === "multiple_choice") {
        if (!({ math: [4], science: [3, 4], social: [2, 3, 4] }[q.subject] || []).includes(q.options.length) || !q.options.every(text) ||
            typeof q.answer !== "string" || !/^[1-4]$/.test(q.answer) || Number(q.answer) > q.options.length) throw new Error("選擇題選項數量或答案無效。");
      } else if (q.type === "true_false") {
        if ((!finalMath(q) && !["science", "social"].includes(q.subject)) || q.options.length || !["true", "false"].includes(q.answer)) throw new Error("是非題需空選項與 true/false 字串答案。");
      } else if (q.type === "grouped_choice") {
        const perPart = q.subject === "social" && [31, 32].includes(q.unit) && q.options.length === 0;
        if (!["science", "social"].includes(q.subject) || (!perPart && (q.options.length < 2 || q.options.length > (q.subject === "social" ? 5 : 4) || !q.options.every(x => boundedText(x, 300)))) ||
            !Array.isArray(q.parts) || q.parts.length < 2 || q.parts.length > 8 ||
            typeof q.answer !== "string" || q.answer.length !== q.parts.length) throw new Error("整組選答格式無效。");
        const partIds = new Set();
        for (const [index, part] of q.parts.entries()) {
          if (!keys(part, perPart ? ["id", "text", "options"] : ["id", "text"]) || typeof part.id !== "string" || !/^[A-Za-z0-9-]{1,32}$/.test(part.id) || partIds.has(part.id) || !boundedText(part.text, 600)) throw new Error("整組子題格式無效。");
          const options = perPart ? part.options : q.options;
          if (perPart && (!Array.isArray(options) || options.length < 2 || options.length > 4 || !options.every(x => boundedText(x, 300)))) throw new Error("整組子題選項無效。");
          if (!/^[1-5]$/.test(q.answer[index]) || Number(q.answer[index]) > options.length) throw new Error("整組子題答案無效。");
          partIds.add(part.id);
        }
      } else if (q.type === "fill_in_blank") {
        if (finalMath(q)) validateMathBlanks(q);
        else {
        const social = q.subject === "social" && [22, 23, 31, 32].includes(q.unit);
        const written = social && q.unit === 23 && q.blanks?.[0]?.input === "text";
        const select = social && !written;
        if ((!social && q.subject !== "math") || q.answer !== "" || !Array.isArray(q.blanks) || q.blanks.length < 1 || q.blanks.length > (social ? 13 : 9) ||
            (select ? q.options.length < 2 || q.options.length > 15 || !q.options.every(x => boundedText(x, 300)) : q.options.length)) throw new Error("填空題格式無效。");
        for (const [i, b] of q.blanks.entries()) {
          const blankFields = written && object(b) && Object.hasOwn(b, "aliases") ? ["answer", "input", "aliases"] : ["answer", "input"];
          if (!keys(b, blankFields) || typeof b.answer !== "string" || (written ? b.input !== "text" : select ? b.input !== "select" || !/^(?:[1-9]|1[0-5])$/.test(b.answer) || Number(b.answer) > q.options.length : !(b.input === "number" ? /^(0|[1-9][0-9]{0,7})$/.test(b.answer) : b.input === "comparison" && /^[<>=]$/.test(b.answer)))) throw new Error("填空答案或輸入方式無效。");
          if (written) {
            if (Object.hasOwn(b, "aliases") && (!Array.isArray(b.aliases) || b.aliases.length > 8)) throw new Error("文字別名格式無效。");
            const terms = [b.answer, ...(b.aliases || [])];
            if (!terms.every(term => typeof term === "string" && Array.from(term).length >= 1 && Array.from(term).length <= 20 && term.normalize("NFKC").trim()) ||
                new Set(terms.map(term => term.normalize("NFKC").trim())).size !== terms.length) throw new Error("文字答案或別名無效或重複。");
          }
          const marker = String(i + 1).replace(/[0-9]/g, digit => "０１２３４５６７８９"[Number(digit)]);
          if (!q.text.includes(`（${marker}）`)) throw new Error("填空題缺少對應的全形空格標記。");
        }
        if (Object.hasOwn(q, "acceptedAnswers")) {
          const vectors = q.acceptedAnswers;
          if (!select || !Array.isArray(vectors) || vectors.length < 1 || vectors.length > 8 ||
              !vectors.every(vector => Array.isArray(vector) && vector.length === q.blanks.length && vector.every(value => typeof value === "string" && /^(?:[1-9]|1[0-5])$/.test(value) && Number(value) <= q.options.length)) ||
              new Set(vectors.map(vector => JSON.stringify(vector))).size !== vectors.length || JSON.stringify(vectors[0]) !== JSON.stringify(q.blanks.map(blank => blank.answer))) throw new Error("完整答案向量格式無效。");
        }
        }
      } else throw new Error("此題型尚未支援。");
      const old = previous && previous.questions.find(p => p.id === q.id);
      if (old && semantic(old) !== semantic(q)) throw new Error("相同 ID 的作答內容或章節分類已改變，未替換原題包。");
    }
    const questionIds = pack.questions.map(q => q.id);
    if ((!shard && !IDS.every(id => questionIds.includes(id))) || !pack.questions.length || !keys(pack.explanations, questionIds)) throw new Error("題包必須保留首批六題，每題各有一份解說。");
    if (previous) {
      if (pack.revision < previous.revision) throw new Error("不能匯入較舊版本。");
      if (previous.questions.some(q => !questionIds.includes(q.id))) throw new Error("新版題包不能移除既有題目，原題包與進度保留。");
      const normalized = p => JSON.stringify([...p.questions].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        .map(q => [q.id, semantic(q), q.source, p.explanations[q.id]]));
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
  async function fetchRemote(endpoint, token, signal, path = "", limit = MAX_BYTES, allowMissing = false) {
    const auth = root.KidsAuth;
    if (auth) await auth.ready;
    if (!auth && !token) throw new Error("尚未設定家庭金鑰。請開啟下方家庭設定，儲存後會自動重試。");
    let response;
    try {
      response = await (auth ? auth.fetch : fetch)(`${(auth?.endpoint || endpoint).replace(/\/+$/, "")}/v1/packs/g4-s1-math-u1${path}`, {
        method: "GET", headers: auth ? {} : { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
      });
    } catch { throw new Error("無法連線取得題包，請檢查網路後重試。"); }
    if (response.status === 404 && allowMissing) return null;
    if (response.status === 401) throw new Error(auth ? "家庭連線已失效，請回首頁讓家長重新連接。" : "家庭金鑰不正確。請在家庭設定重新輸入。");
    if (response.status === 404) throw new Error("家庭題包尚未發布，請家長確認部署後重試。");
    if (!response.ok) throw new Error("題包服務異常，請稍後重試或請家長檢查服務。");
    if (Number(response.headers.get("Content-Length")) > limit) throw new Error("題包超過 256 KiB，未載入。");
    // 串流逐段限額：不先把無上限的 response.text() 全收進記憶體。
    if (!response.body) throw new Error("題包回應沒有內容，未載入。");
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let size = 0, raw = "";
    try {
      while (true) {
        let chunk;
        try { chunk = await reader.read(); }
        catch { throw new Error("讀取題包中斷，請檢查網路後重試。"); }
        const { done, value } = chunk;
        if (done) break;
        size += value.byteLength;
        if (size > limit) throw new Error("題包超過 256 KiB，未載入。");
        try { raw += decoder.decode(value, { stream: true }); }
        catch { throw new Error("題包文字不是有效 UTF-8，未載入。"); }
      }
      try { return raw + decoder.decode(); }
      catch { throw new Error("題包文字不是有效 UTF-8，未載入。"); }
    } finally { reader.cancel().catch(() => {}); }
  }
  root.StudyPrivatePack = { KEY, MAX_BYTES, IDS, UNITS, parse, save, fetchRemote, semantic };
})(globalThis);
