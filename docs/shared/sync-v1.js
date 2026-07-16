// 家庭進度同步 sync client v1（平台共用腳本，ADR-0004：各 app <script src> 引入、零 build）。
// spec＝issue #26「進度同步」節；server 半邊＝worker/worker.mjs（票 #27）；首個接入＝study（票 #28）。
// 協定不相容時開新檔 sync-v2.js，不原地改壞舊 app。
//
// client 必守不變量（兩端契約的前提）：
// - writeId＝每次新寫入以 crypto.randomUUID() 新產；僅重送同一筆未確認寫入時重用；每 key 同時至多一筆未決寫入
// - dirty 只能在「讀到 PUT 200」或「adopt 遠端」後清——sendBeacon 讀不到 response，故 beacon 後永不清 dirty
// - 手動匯入／還原＝寫入後同步持久化 anchorPending＋dirty（markImported），下一次成功 GET 完成定錨
//   （syncedRev＝當下遠端 rev）→ 同輪 push；標記持久化使 busy 併發／reload／定錨 GET 失敗都不丟定錨
// - push／reseed 的 PUT 一律以「本輪 GET 到的 remote.rev」為 base rev
// - syncedEpoch＝上次同步到的雲端世代章（票 #37）：每次 adopt／push 成功後隨 rev 一起更新，
//   否則換代判定會在下一輪重複觸發（無限重推）
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
    epoch: typeof body.epoch === "string" ? body.epoch : null, // 世代章（票 #37）；舊 worker 無此欄
  };
}

// local:  { syncedRev, dirty, schemaVersion, lastWriteId?, syncedEpoch?, dataNull? }
//         dataNull＝本機進度資料已亡佚（loadData 回 null；progress 與 meta 是兩把獨立
//         localStorage key，局部遺失時 meta 尚存而進度已無）——換代守門用
// remote: classifyRemote 的輸出
// 回傳 action.type：
//   none            無事可做
//   push            以本輪 remote.rev 為 base 上傳本地（含初次播種 rev 0、own-write 疊推、換代重播種）
//   reseed          雲端被清空（rev 0＋data null 但 syncedRev>0）→ 以 rev 0 重新播種；
//                   非靜默：client 應記錄健康事件（雲端資料曾遺失）
//   adopt           取遠端覆蓋本地（本地無新變更）
//   conflict-adopt  衝突：取遠端、棄本地增量
//   offline         真離線，靜默略過
//   auth-error      無 token／token 錯（健康燈顯示，非離線）
//   data-error      HTTP 錯誤或回應不可解析（絕不視為空）
//   schema-block    遠端 schemaVersion 比 app 新：拒讀拒 push 保本地
//   retry           遠端 rev 落後於已同步 rev（KV 最終一致的舊讀），本輪不動作
// action.regen＝true 時另表「雲端已換代」（見下），client 應記健康事件；行為＝push，
// 唯本機進度已亡佚且遠端有資料時改走 adopt（PR #43 裁決 2026-07-16）。
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

  // 換代（票 #37）：雲端 KV 遺失後由他機搶先重新播種 → rev 從 1 重數。本機 syncedRev 遠大於它，
  // 卻不滿足 reseed 條件（data 非 null）→ 舊版一律落到 retry，永遠不 push 不 adopt＝同步實質死亡。
  // epoch 是把「舊讀」與「換代」分開的唯一訊號：舊讀回同一枚章，換代必換一枚。
  // 判定＝以本地重新播種（push）：跨代 rev 不可比，故不走 adopt／conflict 的 rev 比較；
  // 且本機資料是「上一代雲端內容＋本機增量」的最完整殘存，推上去等於把遺失的雲端補回來。
  // 收斂：本機 push 後記下新章，不再觸發；他機 epoch 相符、rev 落後 → 循常規 adopt 收斂。
  // 兩端皆須為新協定才會觸發（舊 worker 不回 epoch／舊 client 不記 epoch → 行為與改動前一致）。
  if (local.syncedEpoch && remote.epoch && remote.epoch !== local.syncedEpoch) {
    // 守門（PR #43 裁決 2026-07-16）：換代 push 的前提是「本機＝最完整殘存」。本機進度已亡佚
    // （dataNull）時前提不成立——照 push 會拿空資料覆蓋他機剛播種的雲端，且他機下輪 adopt
    // 會把損失擴散回去。遠端有資料 → 改走 adopt 取回；遠端也空 → 無可取，照舊 push。
    if (local.dataNull && remote.data !== null) return { type: "adopt", regen: true };
    return { type: "push", regen: true };
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

// 健康狀態 → 家長區文案（平台詞彙表，各 app 共用；app 只包 HTML/CSS）。
// 「不是離線」字樣是錯誤分流的核心：無 token／金鑰錯／服務異常時家長不該白等網路。
const HEALTH_TEXT = {
  ok: "同步正常",
  offline: "離線或連不上同步服務",
  "no-token": "尚未設定同步金鑰（不是離線，請在下方輸入）",
  "auth-error": "同步金鑰不對，請重新輸入（不是離線）",
  "data-error": "同步服務回應異常（不是離線）",
  "schema-block": "雲端資料版本較新：已暫停同步保護本機，請先更新 app",
  retry: "雲端讀取暫時落後，稍後會自動重試",
};

// child id 與雲端 key 段共用同一格式（worker KEY_RE，tests/test_child_store.mjs 釘住兩邊一字不差）
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

// 開機身分組合（各 app 同一套：解析 → ?k= 首開寫入本機 → 讀取 fallback）。
// setToken＝家長貼新金鑰：本 session 立即生效（蓋過網址上殘留的舊 ?k=），並持久化。
function bootIdentity(search, storage) {
  const parsed = identityFromSearch(search);
  let sessionToken = parsed.token;
  if (sessionToken && storage) {
    try { storage.setItem(TOKEN_STORAGE_KEY, sessionToken); } catch {}
  }
  return {
    child: parsed.child,
    getToken() {
      let stored = null;
      if (storage) { try { stored = storage.getItem(TOKEN_STORAGE_KEY); } catch {} }
      return resolveToken(sessionToken, stored);
    },
    setToken(v) {
      if (!v) return;
      sessionToken = v;
      if (storage) { try { storage.setItem(TOKEN_STORAGE_KEY, v); } catch {} }
    },
  };
}

// opts：
//   endpoint?      同步服務 base URL（預設 production Worker）
//   child, app     雲端 key＝{child}:{app}
//   schemaVersion  app 的資料 schema 版本（與 remote.data.schemaVersion 比對；資料本體自帶，client 不注入）
//   getToken()     () => token|null
//   loadData()     () => 本機現行進度（要 push 的 payload）
//   saveData(d)    adopt 時覆蓋本機（不得觸發 markDirty）
//   loadMeta() / saveMeta(m)  sync meta 持久化（syncedRev/syncedEpoch/dirty/anchorPending/
//                             lastWriteId/pendingWriteId/健康狀態）
//   onAdopt(d)?    adopt／conflict-adopt 後通知 app 重載狀態
//   onHealth(status)?  健康狀態更新通知（HEALTH_TEXT 的 key 字串；家長區刷新）
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
      syncedEpoch: typeof m.syncedEpoch === "string" ? m.syncedEpoch : null,
      dirty: !!m.dirty,
      anchorPending: !!m.anchorPending,
      lastWriteId: typeof m.lastWriteId === "string" ? m.lastWriteId : undefined,
      pendingWriteId: typeof m.pendingWriteId === "string" ? m.pendingWriteId : null,
      lastSyncAt: m.lastSyncAt ?? null,
      reseedAt: m.reseedAt ?? null,
      regenAt: m.regenAt ?? null,
      health: typeof m.health === "string" ? m.health : null,
    };
  }
  function patchMeta(patch) {
    const m = { ...meta(), ...patch };
    try { saveMeta(m); } catch {}
    return m;
  }
  function setHealth(status) {
    patchMeta({ health: status });
    try { onHealth(status); } catch {}
  }

  function keyUrl(token) {
    return `${endpoint}/v1/progress/${child}/${app}?k=${encodeURIComponent(token)}`;
  }

  async function fetchWithTimeout(u, init) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetchImpl(u, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
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
    patchMeta({
      syncedRev: remote.rev,
      syncedEpoch: remote.epoch, // 記下當代章：下輪才分得出「舊讀」與「換代」
      dirty: false,
      pendingWriteId: null,
      lastSyncAt: now(),
    });
    setHealth("ok");
    try { onAdopt(remote.data); } catch {}
  }

  // 一輪同步：GET → classify → decideSync → 依 action 行動。
  // 手動匯入／還原＝markImported() 先「同步地」持久化 anchorPending＋dirty，本輪（或下一次成功 GET 的
  // 任何一輪，含 reload 後 boot）才完成定錨：syncedRev＝當下遠端 rev → decideSync 走 push、以 LWW
  // 最新寫入身分勝出。持久化標記讓 busy 併發、reload 殺佇列、定錨 GET 失敗三種路徑都不會弄丟定錨。
  async function syncRound() {
    const token = getToken();
    if (!token) {
      setHealth("no-token"); // 無 token＝設定問題，非離線（家長區顯示異常）
      return { action: "no-token", putRejected: false };
    }
    const remote = await getRemote(token);
    let m = meta();
    if (m.anchorPending && remote.kind === "ok") {
      // 定錨連當代章一起對齊：否則匯入遇上換代的雲端會多記一次換代事件（行為同為 push，僅噪音）
      m = patchMeta({
        syncedRev: remote.rev,
        syncedEpoch: remote.epoch,
        dirty: true,
        pendingWriteId: null,
        anchorPending: false,
      });
    }
    // 換代守門的輸入：本機進度是否已亡佚（四 app 的 loadData 在進度 key 遺失時皆回 null）
    let dataNull = false;
    try { dataNull = loadData() == null; } catch {}
    const local = {
      syncedRev: m.syncedRev,
      syncedEpoch: m.syncedEpoch,
      dirty: m.dirty,
      schemaVersion,
      lastWriteId: m.lastWriteId,
      dataNull,
    };
    const action = decideSync(local, remote);
    const out = { action: action.type, putRejected: false };

    if (action.type === "offline" || action.type === "auth-error" || action.type === "data-error" ||
        action.type === "schema-block" || action.type === "retry") {
      setHealth(action.type);
      return out;
    }
    if (action.type === "none") {
      // 連當代章一起記：否則「已同步且無變更」的裝置永遠拿不到章（none 不經 adopt／push），
      // 換代規則對它從不觸發＝#37 的卡死在這台原封不動（改動前就已同步的裝置正是此形）
      patchMeta({ syncedEpoch: remote.epoch, lastSyncAt: now() });
      setHealth("ok");
      return out;
    }
    // 換代健康事件在 adopt 分支之前記：亡佚機的換代走 adopt（守門），家長區同樣要看得到
    if (action.regen) patchMeta({ regenAt: now() }); // 同一事件的他機視角：雲端曾遺失並被重新播種
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
        // 記下這次寫進哪一代（初次播種／reseed 由 worker 當場鑄章，client 只能從 response 得知）。
        // 換代 push 後若不更新此值，下一輪會再次判為換代 → 無限重推
        syncedEpoch: typeof res.body.epoch === "string" ? res.body.epoch : null,
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
        {
          syncedRev: m2.syncedRev,
          syncedEpoch: m2.syncedEpoch,
          dirty: m2.dirty,
          schemaVersion,
          lastWriteId: m2.lastWriteId,
        },
        again,
      );
      out.secondAction = second.type;
      if (second.type === "adopt" || second.type === "conflict-adopt") {
        adoptRemote(again);
      } else {
        // 罕見（如自己的 beacon 剛搶先落地→push）：不在本輪重推，dirty 已持久化、下一輪收斂；
        // 二次 GET 若是錯誤類，健康燈用準確標籤，其餘歸 retry
        const errorish = ["offline", "auth-error", "data-error", "schema-block"];
        setHealth(errorish.includes(second.type) ? second.type : "retry");
      }
      return out;
    }
    if (res.status === 401) {
      setHealth("auth-error");
      return out;
    }
    setHealth("data-error");
    return out;
  }

  // 同時只跑一輪；重疊觸發合併成「跑完再補一輪」（定錨等持久狀態在 meta，補跑輪不丟資訊）
  async function syncNow() {
    if (roundActive) {
      roundQueued = true;
      return { action: "busy", putRejected: false };
    }
    roundActive = true;
    try {
      return await syncRound();
    } finally {
      roundActive = false;
      if (roundQueued) {
        roundQueued = false;
        setTimeout(() => { syncNow().catch(() => {}); }, 0);
      }
    }
  }

  // 手動匯入／還原完成後呼叫：同步地持久化定錨標記＋dirty（不打網路、不受 busy/reload 影響）
  function markImported() {
    patchMeta({ dirty: true, anchorPending: true, pendingWriteId: null });
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
    patchMeta({ lastWriteId: writeId, pendingWriteId: writeId });
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

  // 協定生命週期監聽（iOS 按 Home 後 JS 凍結，不能只靠 debounce；pagehide 單掛在 iOS 不可靠，
  // 必須成對掛 visibilitychange——這對組合是平台知識，app 只呼叫一次別自己拼）
  function attachLifecycle(win, doc) {
    win.addEventListener("pagehide", () => { flushBeacon(); });
    doc.addEventListener("visibilitychange", () => {
      if (doc.visibilityState === "hidden") flushBeacon();
    });
  }

  return {
    boot: syncNow,           // 開啟時 pull（adopt 直寫本機存檔，app 之後再讀）
    syncNow,
    markImported,            // 匯入落地後同步呼叫；接著 syncNow()（或 reload 後 boot）完成定錨＋push
    importedLocal: () => { markImported(); return syncNow(); },
    markDirty,
    flushBeacon,
    attachLifecycle,
    meta,
  };
}
// </sync-client>

if (typeof window !== "undefined") {
  window.KidsSyncV1 = {
    classifyRemote,
    decideSync,
    createSyncClient,
    bootIdentity,
    normalizeChildId,
    identityFromSearch,
    resolveToken,
    HEALTH_TEXT,
    DEFAULT_ENDPOINT,
    TOKEN_STORAGE_KEY,
  };
}
