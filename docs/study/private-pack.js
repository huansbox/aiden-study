// 四上家庭題包；保留歷史 U1 key，內容與 child 進度分開保存。
(function(root) {
  "use strict";
  const KEY = "study:private-pack:g4-s1-math-u1";
  const MAX_BYTES = 128 * 1024;
  const IDS = ["tyk111-I-01", "tyk113-II-11a", "tyk113-II-11d", "tyk111-II-02", "tyk111-IV-01", "anh114-II-08"].map(id => `math-g4s1-${id}-v1`);
  const UNITS = [15, 16, 17, 18, 19, 20, 21];
  const ID_RE = /^(math|science)-g4s1-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-v[1-9][0-9]*$/;
  const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
  const text = x => typeof x === "string" && x.trim().length > 0;
  const boundedText = (x, limit) => text(x) && Array.from(x).length <= limit;
  function keys(value, required) {
    return object(value) && Object.keys(value).length === required.length && required.every(k => Object.hasOwn(value, k));
  }
  function semantic(q) {
    // 不自行判定文字改動是否仍是同一道題；只忽略 JSON 欄位順序。
    // unit 與 subtopic 也是進度／半批的索引，不可在同 ID 下搬動。
    return JSON.stringify([q.subject, q.unit, q.subtopic, q.type, q.text, q.options, q.answer,
      q.blanks ? q.blanks.map(b => [b.input, b.answer]) : null,
      q.parts ? q.parts.map(part => [part.id, part.text]) : null,
      q.material ? q.material.kind === "png" ? ["png", q.material.data, q.material.alt]
        : ["table", q.material.caption, q.material.columns, q.material.rows] : null]);
  }
  function pngBytes(data) {
    if (typeof data !== "string" || !/^data:image\/png;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error("PNG 格式無效。");
    const base64 = data.slice(22);
    if (!base64 || base64.length > Math.ceil(32768 / 3) * 4) throw new Error("PNG 超過 32 KiB。");
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
    if (bytes.length > 32768) throw new Error("PNG 超過 32 KiB。");
    return Uint8Array.from(bytes);
  }
  function pngValid(data) {
    const bytes = pngBytes(data);
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
  function validateMaterial(material) {
    if (material.kind === "png") {
      if (!keys(material, ["kind", "data", "alt"]) || !boundedText(material.alt, 200) || !pngValid(material.data)) throw new Error("PNG 題圖格式無效。");
    } else if (material.kind === "table") {
      if (!keys(material, ["kind", "caption", "columns", "rows"]) || !boundedText(material.caption, 300) ||
          !Array.isArray(material.columns) || material.columns.length < 2 || material.columns.length > 8 || !material.columns.every(x => boundedText(x, 80)) ||
          !Array.isArray(material.rows) || material.rows.length < 1 || material.rows.length > 16 ||
          !material.rows.every(row => Array.isArray(row) && row.length === material.columns.length && row.every(x => boundedText(x, 240)))) throw new Error("題目表格格式無效。");
    } else throw new Error("題目媒體格式無效。");
  }
  function parse(raw, publicQuestions = [], previous = null) {
    if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error("題包超過 128 KiB 或不是文字檔。");
    let pack;
    try { pack = JSON.parse(raw); } catch { throw new Error("JSON 格式無法讀取。"); }
    if (!keys(pack, ["schemaVersion", "packId", "revision", "questions", "explanations"]) || pack.schemaVersion !== 1 || pack.packId !== "g4-s1-math-u1" || !Number.isSafeInteger(pack.revision) || pack.revision < 1) throw new Error("題包版本或欄位不支援。");
    if (!Array.isArray(pack.questions) || !object(pack.explanations)) throw new Error("題包必須包含題目與每題解說。");
    const seen = new Set(publicQuestions.map(q => q.id));
    for (const q of pack.questions) {
      if (!object(q) || typeof q.id !== "string" || !ID_RE.test(q.id) || seen.has(q.id)) throw new Error("題目 ID 不支援或重複。");
      seen.add(q.id);
      const fields = ["id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer"];
      if (q.type === "fill_in_blank") fields.push("blanks");
      if (q.type === "grouped_choice") fields.push("parts");
      if (Object.hasOwn(q, "material")) fields.push("material");
      const subjectUnits = q.subject === "math" ? [15, 16, 17, 18, 19] : q.subject === "science" ? [20, 21] : [];
      if (!keys(q, fields) || !subjectUnits.includes(q.unit) || !q.id.startsWith(`${q.subject}-g4s1-`) || (IDS.includes(q.id) && q.unit !== 15) || !["text", "subtopic", "source"].every(k => text(q[k])) || !Object.hasOwn(pack.explanations, q.id) || !text(pack.explanations[q.id])) throw new Error("題目範圍、文字或解說無效。");
      if (!Array.isArray(q.options)) throw new Error("選項格式無效。");
      if (Object.hasOwn(q, "material")) {
        if (q.subject !== "science" || !object(q.material)) throw new Error("題目媒體格式無效。");
        validateMaterial(q.material);
      }
      if (q.type === "multiple_choice") {
        if (q.options.length !== 4 || !q.options.every(text) || !/^[1-4]$/.test(q.answer) || typeof q.answer !== "string") throw new Error("選擇題需四個選項與 1–4 字串答案。");
      } else if (q.type === "true_false") {
        if (q.subject !== "science" || q.options.length || !["true", "false"].includes(q.answer)) throw new Error("是非題需空選項與 true/false 字串答案。");
      } else if (q.type === "grouped_choice") {
        if (q.subject !== "science" || q.options.length < 2 || q.options.length > 4 || !q.options.every(x => boundedText(x, 300)) ||
            !Array.isArray(q.parts) || q.parts.length < 2 || q.parts.length > 8 ||
            typeof q.answer !== "string" || q.answer.length !== q.parts.length ||
            [...q.answer].some(answer => !/^[1-4]$/.test(answer) || Number(answer) > q.options.length)) throw new Error("整組選答格式無效。");
        const partIds = new Set();
        for (const part of q.parts) {
          if (!keys(part, ["id", "text"]) || typeof part.id !== "string" || !/^[A-Za-z0-9-]{1,32}$/.test(part.id) || partIds.has(part.id) || !boundedText(part.text, 600)) throw new Error("整組子題格式無效。");
          partIds.add(part.id);
        }
      } else if (q.type === "fill_in_blank") {
        if (q.subject !== "math" || q.options.length || q.answer !== "" || !Array.isArray(q.blanks) || q.blanks.length < 1 || q.blanks.length > 9) throw new Error("填空題格式無效。");
        for (const [i, b] of q.blanks.entries()) {
          if (!keys(b, ["answer", "input"]) || typeof b.answer !== "string" || !(b.input === "number" ? /^(0|[1-9][0-9]{0,7})$/.test(b.answer) : b.input === "comparison" && /^[<>=]$/.test(b.answer))) throw new Error("填空答案或輸入方式無效。");
          if (!q.text.includes(`（${"１２３４５６７８９"[i]}）`)) throw new Error("填空題缺少對應的全形空格標記。");
        }
      } else throw new Error("此題型尚未支援。");
      const old = previous && previous.questions.find(p => p.id === q.id);
      if (old && semantic(old) !== semantic(q)) throw new Error("相同 ID 的作答內容或章節分類已改變，未替換原題包。");
    }
    const questionIds = pack.questions.map(q => q.id);
    if (!IDS.every(id => questionIds.includes(id)) || !keys(pack.explanations, questionIds)) throw new Error("題包必須保留首批六題，每題各有一份解說。");
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
  async function fetchRemote(endpoint, token, signal) {
    const auth = root.KidsAuth;
    if (auth) await auth.ready;
    if (!auth && !token) throw new Error("尚未設定家庭金鑰。請開啟下方家庭設定，儲存後會自動重試。");
    let response;
    try {
      response = await (auth ? auth.fetch : fetch)(`${(auth?.endpoint || endpoint).replace(/\/+$/, "")}/v1/packs/g4-s1-math-u1`, {
        method: "GET", headers: auth ? {} : { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
      });
    } catch { throw new Error("無法連線取得題包，請檢查網路後重試。"); }
    if (response.status === 401) throw new Error(auth ? "家庭連線已失效，請回首頁讓家長重新連接。" : "家庭金鑰不正確。請在家庭設定重新輸入。");
    if (response.status === 404) throw new Error("家庭題包尚未發布，請家長確認部署後重試。");
    if (!response.ok) throw new Error("題包服務異常，請稍後重試或請家長檢查服務。");
    if (Number(response.headers.get("Content-Length")) > MAX_BYTES) throw new Error("題包超過 128 KiB，未載入。");
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
        if (size > MAX_BYTES) throw new Error("題包超過 128 KiB，未載入。");
        try { raw += decoder.decode(value, { stream: true }); }
        catch { throw new Error("題包文字不是有效 UTF-8，未載入。"); }
      }
      try { return raw + decoder.decode(); }
      catch { throw new Error("題包文字不是有效 UTF-8，未載入。"); }
    } finally { reader.cancel().catch(() => {}); }
  }
  root.StudyPrivatePack = { KEY, MAX_BYTES, IDS, UNITS, parse, save, fetchRemote };
})(globalThis);
