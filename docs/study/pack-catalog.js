// 私用目錄與單元快取；不讀寫孩子進度。preview 只使用網路與記憶體。
(function(root) {
  "use strict";
  const P = root.StudyPrivatePack;
  const MAX_UNIT_BYTES = 4 * 1024 * 1024, MAX_SELECTION_BYTES = 16 * 1024 * 1024;
  const MAX_CACHE_BYTES = 16 * 1024 * 1024;
  const MAX_MANIFEST_BYTES = 512 * 1024;
  const HASH = /^[a-f0-9]{64}$/;
  const units = { math: [15,16,17,18,19], science: [20,21], social: [22] };
  const exact = (x, fields) => x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).length === fields.length && fields.every(k => Object.hasOwn(x,k));
  const encode = x => new TextEncoder().encode(x);
  const hash = async raw => [...new Uint8Array(await root.crypto.subtle.digest("SHA-256", encode(raw)))].map(x => x.toString(16).padStart(2,"0")).join("");
  function parseManifest(raw, previous = null) {
    if (typeof raw !== "string" || encode(raw).length > MAX_MANIFEST_BYTES) throw Error("題庫目錄超過限制。");
    let m; try { m = JSON.parse(raw); } catch { throw Error("題庫目錄 JSON 無效。"); }
    if (!exact(m,["schemaVersion","packId","revision","shards"]) || m.schemaVersion !== 2 || m.packId !== "g4-s1-math-u1" || !Number.isSafeInteger(m.revision) || m.revision < 1 || !Array.isArray(m.shards) || !m.shards.length || m.shards.length > 1024) throw Error("題庫目錄格式不支援。");
    const ids = new Set(), hashes = new Set();
    for (const s of m.shards) {
      if (!exact(s,["hash","bytes","subject","unit","ids","subtopics"]) || !HASH.test(s.hash) || hashes.has(s.hash) || !Number.isInteger(s.bytes) || s.bytes < 1 || s.bytes > P.MAX_BYTES || !units[s.subject]?.includes(s.unit) || !Array.isArray(s.ids) || !s.ids.length || s.ids.length > 4096) throw Error("題庫分包目錄無效。");
      if (!Array.isArray(s.subtopics) || s.subtopics.length !== s.ids.length || s.subtopics.some(t => typeof t !== "string" || !t.trim() || t.length > 300)) throw Error("目錄主題無效。");
      hashes.add(s.hash);
      for (const id of s.ids) {
        if (typeof id !== "string" || !new RegExp(`^${s.subject}-g4s1-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-v[1-9][0-9]*$`).test(id) || ids.has(id)) throw Error("題庫目錄題號重複或無效。");
        ids.add(id);
      }
    }
    if (previous) {
      if (m.revision < previous.revision) throw Error("不能載入較舊題庫目錄。");
      const membership = new Map(m.shards.flatMap(s => s.ids.map((id,i) => [id, `${s.subject}:${s.unit}:${s.subtopics[i]}`])));
      if (previous.shards.some(s => s.ids.some((id,i) => membership.get(id) !== `${s.subject}:${s.unit}:${s.subtopics[i]}`))) throw Error("題庫目錄不能移除或搬動既有題號。");
      const canonical = x => JSON.stringify([...x.shards].sort((a,b) => a.hash.localeCompare(b.hash)).map(s => [s.hash,s.bytes,s.subject,s.unit,s.ids,s.subtopics]));
      if (m.revision === previous.revision && canonical(m) !== canonical(previous)) throw Error("目錄更新必須提高版本。");
    }
    return m;
  }
  const descriptors = (m,unit) => m.shards.filter(s => s.unit === unit);
  const metadata = m => m.shards.flatMap(s => s.ids.map((id,i) => ({id,unit:s.unit,subject:s.subject,subtopic:s.subtopics[i]})));
  const count = (m,unit) => descriptors(m,unit).reduce((n,s) => n+s.ids.length,0);
  async function verifyShard(raw, descriptor, publicQuestions = []) {
    if (encode(raw).length !== descriptor.bytes || await hash(raw) !== descriptor.hash) throw Error("分包內容與目錄指紋不符。");
    const pack = P.parse(raw, publicQuestions, null, true);
    const ids = new Set(descriptor.ids);
    if (pack.questions.length !== ids.size || pack.questions.some(q => !ids.has(q.id) || q.unit !== descriptor.unit || q.subject !== descriptor.subject || q.subtopic !== descriptor.subtopics[descriptor.ids.indexOf(q.id)])) throw Error("分包範圍與目錄不符。");
    return pack;
  }
  function compatible(next, previous) {
    if (!previous) return;
    const byId = new Map(next.questions.map(q => [q.id,q]));
    for (const q of previous.questions) {
      if (!byId.has(q.id) || P.semantic(q) !== P.semantic(byId.get(q.id))) throw Error("相同題號內容改變或缺少既有題目，保留本機題庫。");
    }
  }
  function combine(parts, revision) {
    return { schemaVersion: 2, packId: "g4-s1-math-u1", revision, questions: parts.flatMap(p => p.questions), explanations: Object.assign({}, ...parts.map(p => p.explanations)) };
  }
  function merge(active, unitPack) {
    const unit = unitPack.questions[0].unit;
    const previous = active && { questions: active.questions.filter(q => q.unit === unit) };
    compatible(unitPack, previous);
    return combine([...(active ? [{ questions: active.questions.filter(q => q.unit !== unit), explanations: Object.fromEntries(active.questions.filter(q => q.unit !== unit).map(q => [q.id,active.explanations[q.id]])) }] : []), unitPack], Math.max(active?.revision || 0,unitPack.revision));
  }
  async function catalog(endpoint, token, signal) {
    const raw = await P.fetchRemote(endpoint,token,signal,"/catalog",MAX_MANIFEST_BYTES,true);
    if (raw === null) return { legacy: await P.fetchRemote(endpoint,token,signal) };
    // Older test servers and staged deployments may still return the legacy envelope.
    let envelope; try { envelope=JSON.parse(raw); } catch { throw Error(encode(raw).length > P.MAX_BYTES ? "題包超過 256 KiB。" : "題包 JSON 無效。"); }
    if (envelope.schemaVersion === 1) return { legacy: raw };
    return { manifest: parseManifest(raw) };
  }
  function checkBudget(manifest, selectedUnits) {
    let total=0;
    for(const unit of new Set(selectedUnits)) {
      const bytes=descriptors(manifest,unit).reduce((n,s)=>n+s.bytes,0);
      if(bytes>MAX_UNIT_BYTES) throw Error("單元題目超過 4 MiB，請家長拆分練習範圍。");
      total+=bytes;
    }
    if(total>MAX_SELECTION_BYTES) throw Error("本次題目超過 16 MiB，請分單元練習。");
    return total;
  }
  async function loadUnit(manifest, unit, endpoint, token, signal, publicQuestions = []) {
    checkBudget(manifest,[unit]);
    const selected = descriptors(manifest,unit);
    if (!selected.length) throw Error("此單元尚未發布。");
    const parts = [], shards = [];
    for (const s of selected) {
      const raw = await P.fetchRemote(endpoint,token,signal,`/shards/${s.hash}`);
      parts.push(await verifyShard(raw,s,publicQuestions));
      shards.push(raw);
    }
    return { ...combine(parts,manifest.revision), shards };
  }
  function openDB() {
    return new Promise((resolve,reject) => {
      if (!root.indexedDB) { reject(Error("本機題庫儲存無法使用。")); return; }
      const req = root.indexedDB.open("study-private-catalog",1);
      req.onupgradeneeded = () => req.result.createObjectStore("content");
      req.onerror = () => reject(Error("本機題庫儲存無法使用。"));
      req.onblocked = () => reject(Error("本機題庫儲存被其他分頁占用。"));
      req.onsuccess = () => resolve(req.result);
    });
  }
  // IndexedDB 的 readwrite transaction 序列化分頁間的版本核對與寫入。
  async function transaction(write, action) {
    const db = await openDB();
    return new Promise((resolve,reject) => {
      const tx = db.transaction("content",write ? "readwrite" : "readonly"), store = tx.objectStore("content");
      let value, failure;
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onabort = tx.onerror = () => { db.close(); reject(failure || Error("題庫未保存，原本內容與進度保留。")); };
      const get = (key, cb) => { const r=store.get(key); r.onsuccess=() => { try { cb(r.result); } catch(e) { failure=e; tx.abort(); } }; };
      action(store,get,v => { value=v; });
    });
  }
  const conflict = fn => { try { return fn(); } catch(e) { e.code="conflict"; throw e; } };
  const cache = {
    manifest: () => transaction(false,(_,get,done) => get("manifest",raw => done(raw ? parseManifest(raw) : null))),
    saveManifest: manifest => transaction(true,(store,get) => get("manifest",raw => {
      const previous = raw ? parseManifest(raw) : null;
      conflict(() => parseManifest(JSON.stringify(manifest),previous));
      store.put(JSON.stringify(manifest),"manifest");
    })),
    unit: unit => transaction(false,(_,get,done) => get(`unit:${unit}`,done)),
    saveUnit: (manifest, unitPack, invalidSnapshot = null) => transaction(true,(store,get) => get("manifest",raw => {
      const current = raw ? parseManifest(raw) : null;
      conflict(() => parseManifest(JSON.stringify(manifest),current));
      const unit = unitPack.questions[0].unit;
      get(`unit:${unit}`,previous => {
        if (previous) conflict(() => {
          if (invalidSnapshot && JSON.stringify(previous) === JSON.stringify(invalidSnapshot)) return;
          compatible(unitPack,previous.pack);
          if (previous.pack.revision > unitPack.revision) throw Error("不能載入較舊單元。");
        });
        const snapshot={manifest,pack:unitPack};
        let bytes=encode(JSON.stringify(snapshot)).length;
        const cursor=store.openCursor();
        cursor.onsuccess=() => {
          const row=cursor.result;
          if(row) {
            if(row.key !== `unit:${unit}` && row.key !== "manifest") bytes+=encode(JSON.stringify(row.value)).length;
            if(bytes>MAX_CACHE_BYTES) { store.transaction.abort(); return; }
            row.continue();
          } else {
            if(bytes>MAX_CACHE_BYTES) { store.transaction.abort(); return; }
            store.put(snapshot,`unit:${unit}`);
            store.put(JSON.stringify(manifest),"manifest");
          }
        };
      });
    })),
  };
  // 每次讀回原始 bytes 並核對 SHA-256，不信任可被竄改的 aggregate projection。
  async function validateCached(snapshot, unit, publicQuestions = []) {
    if (!snapshot) return null;
    const m = parseManifest(JSON.stringify(snapshot.manifest));
    const p = snapshot.pack, selected = descriptors(m,unit);
    if (p.revision !== m.revision || !Array.isArray(p.shards) || p.shards.length !== selected.length) throw Error("本機單元快取不完整。");
    const parts=[];
    for(let i=0;i<selected.length;i++) parts.push(await verifyShard(p.shards[i],selected[i],publicQuestions));
    const verified={...combine(parts,m.revision),shards:p.shards};
    if (JSON.stringify(p) !== JSON.stringify(verified)) throw Error("本機單元快取指紋不符。");
    return verified;
  }
  root.StudyPackCatalog = { MAX_MANIFEST_BYTES, MAX_CACHE_BYTES, MAX_UNIT_BYTES, MAX_SELECTION_BYTES, checkBudget, parseManifest, hash, descriptors, metadata, count, verifyShard, compatible, combine, merge, catalog, loadUnit, cache, validateCached };
})(globalThis);
