// 家庭進度同步 sync client v1（平台共用腳本，ADR-0004：各 app <script src> 引入、零 build）。
// spec＝issue #26「進度同步」節；server 半邊＝worker/worker.mjs（票 #27）；首個接入＝study（票 #28）。
// 協定不相容時開新檔 sync-v2.js，不原地改壞舊 app。
//
// client 必守不變量（兩端契約的前提）：
// - writeId＝每次新寫入以 crypto.randomUUID() 新產；僅重送同一筆未確認寫入時重用；每 key 同時至多一筆未決寫入
// - dirty 只能在「讀到 PUT 200」或「adopt 遠端」後清——sendBeacon 讀不到 response，故 beacon 後永不清 dirty
// - 手動匯入／還原＝匯入當下先 GET 定錨（syncedRev＝當下遠端 rev）再標 dirty，同輪立即 push
// - push／reseed 的 PUT 一律以「本輪 GET 到的 remote.rev」為 base rev
//
// 衝突（遠端 rev 領先且本地有新變更）＝整包取遠端、棄本地增量（LWW by rev）——
// 進度資料非單調（錯題答對移除、flag、重置），合併會使已刪資料復活。
// 例外：遠端領先的那筆寫入是自己的（writeId 命中 local.lastWriteId）＝beacon 已送達——
// 遠端即自己較早的快照，疊上去 push 零損失。
// 404／壞 payload／HTTP 錯誤絕不可視為空而 push。

// <sync-pure>
// ══════ 同步協定純函式（去時鐘；node 測試由此 sentinel 抽取，不得引用外部全域）══════

// 把一次 GET 的原始結果分類成 remote 物件（client 與契約測試共用同一份真相源）。
// 輸入皆為普通值：threw＝fetch 拋出（真離線）、status＝HTTP 狀態、jsonOk＝回應 JSON 可解析、body＝解析結果。
// 403 不歸 auth：本協定 auth 失敗只發 401；403 只會來自 Cloudflare 邊緣層（WAF 等），
// 誤歸 auth 會讓家長白忙重輸 token。
function classifyRemote({ threw, status, jsonOk, body }) {
  if (threw) return { kind: "network" };
  if (status === 401) return { kind: "auth" };
  if (status !== 200) return { kind: "http" };
  if (!jsonOk || !body || typeof body !== "object") return { kind: "bad-payload" };
  if (!Number.isInteger(body.rev)) return { kind: "bad-payload" };
  return {
    kind: "ok",
    rev: body.rev,
    data: body.data ?? null,
    schemaVersion: body.data?.schemaVersion,
    writeId: body.writeId,
  };
}

// local:  { syncedRev, dirty, schemaVersion, lastWriteId? }
// remote: classifyRemote 的輸出
// 回傳 action.type：
//   none            無事可做
//   push            以本輪 remote.rev 為 base 上傳本地（含初次播種 rev 0、own-write 疊推）
//   reseed          雲端被清空（rev 0＋data null 但 syncedRev>0）→ 以 rev 0 重新播種；
//                   非靜默：client 應記錄健康事件（雲端資料曾遺失）
//   adopt           取遠端覆蓋本地（本地無新變更）
//   conflict-adopt  衝突：取遠端、棄本地增量
//   offline         真離線，靜默略過
//   auth-error      無 token／token 錯（健康燈顯示，非離線）
//   data-error      HTTP 錯誤或回應不可解析（絕不視為空）
//   schema-block    遠端 schemaVersion 比 app 新：拒讀拒 push 保本地
//   retry           遠端 rev 落後於已同步 rev（KV 最終一致的舊讀），本輪不動作
function decideSync(local, remote) {
  if (remote.kind === "network") return { type: "offline" };
  if (remote.kind === "auth") return { type: "auth-error" };
  if (remote.kind === "http" || remote.kind === "bad-payload") return { type: "data-error" };

  if (Number.isFinite(remote.schemaVersion) && remote.schemaVersion > local.schemaVersion) {
    return { type: "schema-block" };
  }

  if (remote.rev === 0 && remote.data === null && local.syncedRev > 0) {
    return { type: "reseed" };
  }

  if (remote.rev === local.syncedRev) {
    return local.dirty ? { type: "push" } : { type: "none" };
  }
  if (remote.rev > local.syncedRev) {
    if (!local.dirty) return { type: "adopt" };
    if (remote.writeId && remote.writeId === local.lastWriteId) return { type: "push" };
    return { type: "conflict-adopt" };
  }
  return { type: "retry" };
}
// </sync-pure>

// <sync-client>
// ══════ sync client（效果全由 opts 注入，node 測試連同 <sync-pure> 抽取後可跑真迴圈）══════
const DEFAULT_ENDPOINT = "https://aiden-kids-sync.huansbox.workers.dev";
const TOKEN_STORAGE_KEY = "kids_sync_token";

// child id 與雲端 key 段共用同一格式（worker KEY_RE）；不合法回 null
function normalizeChildId(raw) {
  return typeof raw === "string" && /^[a-z0-9-]{1,32}$/.test(raw) ? raw : null;
}

// 圖示網址參數 → { child, token }（?child=aiden&k=<family token>；缺項為 null）
function identityFromSearch(search) {
  let child = null;
  let token = null;
  try {
    const p = new URLSearchParams(search || "");
    child = normalizeChildId(p.get("child"));
    token = p.get("k") || null;
  } catch {}
  return { child, token };
}

// token 讀取 fallback：網址參數 > 本機儲存 > 無
function resolveToken(urlToken, storedToken) {
  return urlToken || storedToken || null;
}

// opts：
//   endpoint?      同步服務 base URL（預設 production Worker）
//   child, app     雲端 key＝{child}:{app}
//   schemaVersion  app 的資料 schema 版本（與 remote.data.schemaVersion 比對；資料本體自帶，client 不注入）
//   getToken()     () => token|null
//   loadData()     () => 本機現行進度（要 push 的 payload）
//   saveData(d)    adopt 時覆蓋本機（不得觸發 markDirty）
//   loadMeta() / saveMeta(m)  sync meta 持久化（syncedRev/dirty/lastWriteId/pendingWriteId/健康狀態）
//   onAdopt(d)?    adopt／conflict-adopt 後通知 app 重載狀態
//   onHealth(h)?   健康狀態更新通知（家長區刷新）
//   fetchImpl? / beaconImpl? / uuid? / now? / debounceMs? / timeoutMs?  可注入（測試／調校）
function createSyncClient(opts) {
  const endpoint = String(opts.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
  const { child, app, schemaVersion, getToken, loadData, saveData, loadMeta, saveMeta } = opts;
  const onAdopt = opts.onAdopt || (() => {});
  const onHealth = opts.onHealth || (() => {});
  const fetchImpl = opts.fetchImpl || ((...a) => fetch(...a));
  const uuid = opts.uuid || (() => crypto.randomUUID());
  const now = opts.now || (() => Date.now());
  const debounceMs = opts.debounceMs ?? 3000;
  const timeoutMs = opts.timeoutMs ?? 5000;

  let dirtySeq = 0; // in-memory：PUT 在途期間有無新變更（有則 200 後不清 dirty）
  let debounceTimer = null;
  let roundActive = false;
  let roundQueued = false;

  function meta() {
    let m = null;
    try { m = loadMeta(); } catch {}
    m = m && typeof m === "object" ? m : {};
    return {
      syncedRev: Number.isInteger(m.syncedRev) ? m.syncedRev : 0,
      dirty: !!m.dirty,
      lastWriteId: typeof m.lastWriteId === "string" ? m.lastWriteId : undefined,
      pendingWriteId: typeof m.pendingWriteId === "string" ? m.pendingWriteId : null,
      lastSyncAt: m.lastSyncAt ?? null,
      lastBeaconAt: m.lastBeaconAt ?? null,
      reseedAt: m.reseedAt ?? null,
      health: m.health ?? null,
    };
  }
  function patchMeta(patch) {
    const m = { ...meta(), ...patch };
    try { saveMeta(m); } catch {}
    return m;
  }
  function setHealth(status) {
    const h = { status, at: now() };
    patchMeta({ health: h });
    try { onHealth(h); } catch {}
    return h;
  }

  function keyUrl(token) {
    return `${endpoint}/v1/progress/${child}/${app}?k=${encodeURIComponent(token)}`;
  }

  async function fetchWithTimeout(u, init) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      return await fetchImpl(u, ctrl ? { ...init, signal: ctrl.signal } : init);
    } finally {
      if (t) clearTimeout(t);
    }
  }

  async function getRemote(token) {
    try {
      const res = await fetchWithTimeout(keyUrl(token), { method: "GET" });
      let jsonOk = true;
      let body;
      try { body = await res.json(); } catch { jsonOk = false; }
      return classifyRemote({ threw: false, status: res.status, jsonOk, body });
    } catch {
      return classifyRemote({ threw: true });
    }
  }

  async function putRemote(token, body) {
    try {
      const res = await fetchWithTimeout(keyUrl(token), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let parsed = null;
      try { parsed = await res.json(); } catch {}
      return { threw: false, status: res.status, body: parsed };
    } catch {
      return { threw: true };
    }
  }

  function adoptRemote(remote) {
    try { saveData(remote.data); } catch {}
    patchMeta({ syncedRev: remote.rev, dirty: false, pendingWriteId: null, lastSyncAt: now() });
    setHealth("ok");
    try { onAdopt(remote.data); } catch {}
  }

  // 一輪同步：GET → classify → decideSync → 依 action 行動。
  // anchorImport=true＝手動匯入／還原後的那一輪：GET 定錨（syncedRev＝當下遠端 rev）再標 dirty，同輪 push。
  async function syncRound(anchorImport) {
    const token = getToken();
    if (!token) {
      setHealth("no-token"); // 無 token＝設定問題，非離線（家長區顯示異常）
      return { action: "no-token", putRejected: false };
    }
    const remote = await getRemote(token);
    let m = meta();
    if (anchorImport) {
      m = remote.kind === "ok"
        ? patchMeta({ syncedRev: remote.rev, dirty: true, pendingWriteId: null })
        : patchMeta({ dirty: true, pendingWriteId: null }); // 定錨失敗：dirty 已持久化，之後照常收斂
    }
    const local = { syncedRev: m.syncedRev, dirty: m.dirty, schemaVersion, lastWriteId: m.lastWriteId };
    const action = decideSync(local, remote);
    const out = { action: action.type, putRejected: false };

    if (action.type === "offline" || action.type === "auth-error" || action.type === "data-error" ||
        action.type === "schema-block" || action.type === "retry") {
      setHealth(action.type === "offline" ? "offline"
        : action.type === "auth-error" ? "auth"
        : action.type === "retry" ? "retry"
        : action.type);
      return out;
    }
    if (action.type === "none") {
      patchMeta({ lastSyncAt: now() });
      setHealth("ok");
      return out;
    }
    if (action.type === "adopt" || action.type === "conflict-adopt") {
      adoptRemote(remote);
      return out;
    }

    // push／reseed
    if (action.type === "reseed") patchMeta({ reseedAt: now() }); // 雲端資料曾遺失：記健康事件，不全靜默
    const writeId = m.pendingWriteId || uuid(); // 僅重送同一筆未確認寫入時重用
    const seqAtStart = dirtySeq;
    patchMeta({ lastWriteId: writeId, pendingWriteId: writeId }); // 先落地：response 遺失時下輪重用同 writeId（冪等）
    const payload = loadData();
    const res = await putRemote(token, { rev: remote.rev, data: payload, writeId });

    if (res.threw) {
      setHealth("offline"); // pendingWriteId 保留：這筆可能已落地，重送必須同 writeId
      return out;
    }
    if (res.status === 200 && res.body && Number.isInteger(res.body.rev)) {
      patchMeta({
        syncedRev: res.body.rev,
        pendingWriteId: null,
        dirty: dirtySeq !== seqAtStart, // PUT 在途期間又有新變更 → 留 dirty 給下一輪
        lastSyncAt: now(),
      });
      setHealth("ok");
      return out;
    }
    if (res.status === 409) {
      out.putRejected = true;
      patchMeta({ pendingWriteId: null }); // 被拒的寫入已死，不得再重用其 writeId
      const again = await getRemote(token);
      const m2 = meta();
      const second = decideSync(
        { syncedRev: m2.syncedRev, dirty: m2.dirty, schemaVersion, lastWriteId: m2.lastWriteId },
        again,
      );
      out.secondAction = second.type;
      if (second.type === "adopt" || second.type === "conflict-adopt") {
        adoptRemote(again);
      } else {
        setHealth("retry"); // 罕見（如自己的 beacon 剛搶先落地）：dirty 已持久化，下一輪收斂
      }
      return out;
    }
    if (res.status === 401) {
      setHealth("auth");
      return out;
    }
    setHealth("data-error");
    return out;
  }

  // 同時只跑一輪；重疊觸發合併成「跑完再補一輪」
  async function syncNow(anchorImport) {
    if (roundActive) {
      roundQueued = true;
      return { action: "busy", putRejected: false };
    }
    roundActive = true;
    try {
      return await syncRound(!!anchorImport);
    } finally {
      roundActive = false;
      if (roundQueued) {
        roundQueued = false;
        setTimeout(() => { syncNow().catch(() => {}); }, 0);
      }
    }
  }

  // 本機有新變更：標 dirty、作廢未決寫入（新變更＝新寫入）、debounce 後推（debounceMs 0＝不排程，測試用）
  function markDirty() {
    dirtySeq++;
    patchMeta({ dirty: true, pendingWriteId: null });
    if (debounceMs <= 0) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      syncNow().catch(() => {});
    }, debounceMs);
  }

  // pagehide／切背景的立即 flush：sendBeacon（拿不到 response → 永不清 dirty）。
  // payload 用 text/plain 避開 CORS preflight（sendBeacon 無法 preflight；worker 不看 Content-Type）。
  // base rev 用 syncedRev（頁面垂死、無從 GET）：過期會 409 落空，dirty 持久化由下次開站補推。
  function flushBeacon() {
    const m = meta();
    if (!m.dirty) return false;
    const token = getToken();
    if (!token) return false;
    const writeId = m.pendingWriteId || uuid();
    const body = JSON.stringify({ rev: m.syncedRev, data: loadData(), writeId });
    patchMeta({ lastWriteId: writeId, pendingWriteId: writeId, lastBeaconAt: now() });
    const u = keyUrl(token);
    let sent = false;
    try {
      if (opts.beaconImpl) sent = opts.beaconImpl(u, body);
      else if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        sent = navigator.sendBeacon(u, new Blob([body], { type: "text/plain" }));
      }
    } catch {}
    if (!sent) {
      try { fetchImpl(u, { method: "POST", body, keepalive: true }).catch(() => {}); } catch {}
    }
    return true;
  }

  return {
    boot: () => syncNow(false),          // 開啟時 pull（adopt 直寫本機存檔，app 之後再讀）
    syncNow: () => syncNow(false),
    importedLocal: () => syncNow(true),  // 手動匯入／還原完成後呼叫：定錨＋立即 push
    markDirty,
    flushBeacon,
    meta,
  };
}
// </sync-client>

if (typeof window !== "undefined") {
  window.KidsSyncV1 = {
    classifyRemote,
    decideSync,
    createSyncClient,
    normalizeChildId,
    identityFromSearch,
    resolveToken,
    DEFAULT_ENDPOINT,
    TOKEN_STORAGE_KEY,
  };
}
