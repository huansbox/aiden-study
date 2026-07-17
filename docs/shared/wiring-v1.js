// 平台接線層 wiring-v1（票 #40-B；ADR-0005／0006）：四 app 同款的開機接線集中於此。
// 分界：sync-v1.js 管雲端協定與 sync client；本檔管 app 這一側怎麼把它接起來——
// 身分解析與守衛、child 存檔尋址、sync client 建立、家長區健康燈、匯入編排、pageshow 重驗。
// 檔名帶版本（同 sync-v1 慣例）：不相容改版開新檔 wiring-v2.js，不原地改壞舊 app。
//
// 載入失敗語意（ADR-0006）：
// - 本檔沒載到 → app 端偵測 window.KidsWiringV1 缺席、一律拒開站（「載入不完整，請重新整理」），
//   不做任何存檔讀寫——沉默降級正是 #40-A bug（跨 child 寫入、定錨遺失）的溫床。
// - sync-v1.js 沒載到（本檔有載到）→ 維持原語意：網址指名 child 拒開站（identityUnresolvable）；
//   legacy 無參數網址可練不持久＋定錨後備（markImportedFallback）。這套語意單一副本住在這裡。

// <wiring-pure>
// ══════ 接線層純函式（node 測試由此 sentinel 抽取，不得引用外部全域）══════

// 小孩名單：真相源是 registry.json 的 children（hub 用）；這裡是 app 用的靜態副本——
// app 開機不多抓一個檔、不多背一種故障模式。兩份由 tests/test_registry_audit.mjs 釘住一致，
// 加小孩＝改 registry＋這裡共兩處，改漏測試會叫。
const CHILD_INFO = {
  aiden: { label: "哥哥", emoji: "👦" },
  bingpu: { label: "弟弟", emoji: "🧒" },
};
const KNOWN_CHILDREN = Object.keys(CHILD_INFO);

function childInfoOf(child) {
  return CHILD_INFO[child] || { label: child, emoji: "🙂" };
}

// child 維度 key 尋址 factory：本機 key 前綴＝registry app id（同雲端 key 的 app 段）。
// 遷移採「複製、不搬移」：新 key 已有資料／舊 blob 不存在／child 非舊存檔歸屬 → 不動作。
// 舊 key 原樣保留：revert 時舊程式讀舊 key 一切如常。
function makeChildStore(cfg) {
  const appId = cfg.appId;
  const legacyChild = cfg.legacyChild;
  const legacyKey = cfg.legacyKey || null; // null＝無播種路徑（math：#33 拍板從零）
  function progressKey(child) { return `${appId}:progress:${child}`; }
  function syncMetaKey(child) { return `${appId}:sync:${child}`; }
  function planLegacySeed(child, legacyRaw, childRaw) {
    if (!legacyKey) return null;
    if (childRaw !== null && childRaw !== undefined) return null;
    if (typeof legacyRaw !== "string" || legacyRaw === "") return null;
    if (child !== legacyChild) return null;
    return { key: progressKey(child), value: legacyRaw };
  }
  // 匯入寫入計畫：只寫目標 child 的新格式 key（不繞 legacy migration guard、不碰其他 child）
  function planImportWrite(child, obj) {
    return { key: progressKey(child), value: JSON.stringify(obj) };
  }
  return { appId, legacyChild, legacyKey, progressKey, syncMetaKey, planLegacySeed, planImportWrite };
}

function formatSyncTime(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 健康狀態文案在 sync-v1（HEALTH_TEXT，平台詞彙）；接線層只決定 CSS class 與 HTML
function syncStatusClass(status) {
  if (status === "ok") return "sync-ok";
  if (status === "retry") return "";
  return "sync-bad";
}

// 避免把不可信文字直接塞 innerHTML → XSS（child id 經 normalizeChildId 白名單，但一律 escape 不挑）
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 家長區健康燈 HTML（純字串組裝；值由效果層餵）。兩種 refresh 錨點都認 id="sync-status"。
// v＝{ scriptLoaded, info, meta, token, healthText, btnClass, msgClass }
function syncStatusInnerHtml(v) {
  if (!v.scriptLoaded) {
    return `<div class="sync-status" id="sync-status">同步腳本未載入（shared/sync-v1.js），目前僅本機記錄。</div>`;
  }
  const m = v.meta && typeof v.meta === "object" ? v.meta : {};
  let statusLine;
  if (!v.token) {
    statusLine = `<span class="sync-bad">${v.healthText["no-token"]}</span>`;
  } else if (typeof m.health === "string" && v.healthText[m.health]) {
    statusLine = `<span class="${syncStatusClass(m.health)}">${v.healthText[m.health]}</span>`;
  } else if (m.health) {
    statusLine = `<span class="sync-bad">同步狀態異常</span>`; // 未知狀態別謊報成「還沒同步過」
  } else {
    statusLine = "還沒同步過";
  }
  // reseedAt＝本機發現雲端空了而重新播種；regenAt＝雲端已被他機重新播種、本機補回（票 #37）。
  // 同一個「雲端曾遺失」事件的兩種視角，家長都該看到
  const lostAt = m.reseedAt || m.regenAt;
  const reseed = lostAt
    ? `<div class="sync-bad">⚠️ 雲端進度曾遺失，已於 ${formatSyncTime(lostAt)} 重新上傳</div>` : "";
  const msgCls = v.msgClass ? ` class="${v.msgClass}"` : "";
  return `
    <div class="sync-status" id="sync-status">
      <div>雲端同步（${v.info.emoji} ${escapeHtml(v.info.label)}）：${statusLine}</div>
      <div>上次成功同步：${formatSyncTime(m.lastSyncAt) || "還沒同步過"}</div>
      ${reseed}
      <div class="sync-token-row">
        <input type="password" id="sync-token-input" placeholder="${v.token ? "已設定金鑰（貼新的可覆蓋）" : "貼上家庭同步金鑰"}">
        <button class="${v.btnClass}" onclick="window._saveSyncToken()">儲存金鑰</button>
        <button class="${v.btnClass}" onclick="window._syncNow()">立即同步</button>
        <span id="sync-msg"${msgCls}></span>
      </div>
    </div>`;
}

// 匯入到「非當前 child」的回報文案（#40-B 行為變更）：反映推雲結果，不謊報完成。
// reason 分流（code review 揪出兩個「通用失敗文案說了假話」的分支）：
// - adopted＝PUT 撞 409 後二次判定改採雲端（雲端比備份新，LWW 本該它贏）——此時備份已被
//   雲端版本蓋掉、dirty 已清，「還在本機」「會自動補傳」兩句都不成立，須明講備份沒有被使用
// - schema-block＝雲端資料版本較新、同步暫停——資料確實在本機＋定錨仍在，但補傳要等 app 更新
// - 其餘（offline／auth／no-token／data-error）＝資料在本機＋定錨已持久化，
//   該 child 下次在「這台裝置」開啟本 app 的 boot 輪補推
function importedFeedbackText(childLabel, pushed, reason) {
  if (pushed) return `已還原到 ${childLabel} 的進度，雲端也更新了`;
  if (reason === "adopted") return `雲端上已有 ${childLabel} 更新的進度，已改用雲端版本——這份備份沒有被使用`;
  if (reason === "schema-block") return `已寫入這台裝置，但雲端資料版本較新、同步暫停中——更新 app 後會自動補傳`;
  return `已寫入這台裝置，但雲端上傳沒成功（沒網路或金鑰問題）——${childLabel} 下次在這台裝置開啟這個 app 時會自動補傳`;
}

// 匯入／還原的 child 選擇（家長選；預設當前 child）。currentChild 不在名單（如 test- 驗收 id）時補列
function childPickerInnerHtml(currentChild, name) {
  const options = KNOWN_CHILDREN.includes(currentChild) ? KNOWN_CHILDREN : [...KNOWN_CHILDREN, currentChild];
  const rows = options.map((ch) => {
    const info = childInfoOf(ch);
    return `<label><input type="radio" name="${name}" value="${escapeHtml(ch)}" ${ch === currentChild ? "checked" : ""}>${info.emoji} ${escapeHtml(info.label)}</label>`;
  }).join("");
  return `<div class="child-pick">還原到誰的進度？${rows}</div>`;
}
// </wiring-pure>

// ══════ 效果層：createWiring（每 app 開機呼叫一次，config 見各 app 的 <wiring-config>）══════
// cfg：appId、schemaVersion、legacyChild、legacyKey?（null＝無播種）、
//      btnClass?（健康燈按鈕 CSS class，預設 parent-btn）、msgClass?（回饋 span 的 class）
function createWiring(cfg) {
  const KidsSync = window.KidsSyncV1 || null; // sync-v1.js 沒載到＝僅無同步（守衛見 identityUnresolvable）
  const store = makeChildStore(cfg);
  const btnClass = cfg.btnClass || "parent-btn";
  const msgClass = cfg.msgClass || "";

  // localStorage 全域在「完全封鎖 Cookie」類設定下連取值都會拋 SecurityError——頂層拋出會殺掉
  // 整個 script，包一層讓 app 退回「可練不持久」；讀寫一律走 safeGet／safeSet
  const safeStorage = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  // 身分解析：圖示網址帶死參數 ?child=（無參數＝legacyChild，per-app 歸屬——ADR-0004）；
  // ?k= 首開寫入本機、之後 getToken 走「網址 > 本機」fallback（組合邏輯在 sync-v1 bootIdentity）
  const identity = KidsSync ? KidsSync.bootIdentity(location.search, safeStorage) : null;
  const currentChild = (identity && identity.child) || store.legacyChild;
  let sync = null; // sync client（initSync 建立；無 KidsSync 時保持 null）

  // 網址指名了 child，但解析它的能力（bootIdentity）在 sync-v1.js 裡、而腳本沒載到——
  // 此時 currentChild 會靜默退回 legacyChild，等於把這個小孩的進度寫進另一個小孩的存檔。
  // 猜身分比不讓他練危險得多（那個狀態下同步本來就是死的），app 應拒絕開站（#40-A）。
  // 沒指名 child 的舊單人網址不受影響：照舊退回 legacyChild、可練不持久。
  function identityUnresolvable() {
    if (KidsSync) return false;
    try { return !!new URLSearchParams(location.search).get("child"); } catch (e) { return false; }
  }

  function safeGet(k) { try { return safeStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { safeStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function readSyncMeta(child) {
    try { return JSON.parse(safeGet(store.syncMetaKey(child))); } catch (e) { return null; }
  }
  // KidsSync 未載入時的定錨後備：直接落 anchorPending＋dirty（merge 既有 meta）。
  // 播種與匯入只發生一次，錯過定錨就永遠補不回——雲端被他機 rev 佔住時，下次 boot 會 adopt
  // 舊資料蓋掉剛播種/匯入的進度；先落標記，下次腳本載入的 boot 輪即完成定錨＋push
  function markImportedFallback(child) {
    const m = readSyncMeta(child);
    safeSet(store.syncMetaKey(child), JSON.stringify(
      { ...(m && typeof m === "object" ? m : {}), dirty: true, anchorPending: true, pendingWriteId: null }));
  }

  function getToken() { return identity ? identity.getToken() : null; }
  function childInfo(child) { return childInfoOf(child); }

  function makeSyncClient(child, hooks = {}) {
    if (!KidsSync) return null;
    const key = store.progressKey(child);
    return KidsSync.createSyncClient({
      child,
      app: store.appId,
      schemaVersion: cfg.schemaVersion,
      getToken,
      // 直讀直寫 localStorage、不走 app 的存檔函式：adopt 覆蓋本機不得反過來標 dirty
      loadData: () => { try { return JSON.parse(safeGet(key)); } catch (e) { return null; } },
      saveData: (d) => { safeSet(key, JSON.stringify(d)); },
      loadMeta: () => readSyncMeta(child),
      saveMeta: (m) => { safeSet(store.syncMetaKey(child), JSON.stringify(m)); },
      onAdopt: hooks.onAdopt,
      onHealth: hooks.onHealth,
    });
  }

  // 當前 child 的 sync client＋lifecycle 掛載（pagehide＋visibilitychange 成對，掛法在 sync-v1）。
  // init 失敗重試會再進來：guard 使 lifecycle 監聽不重複掛
  function initSync(hooks = {}) {
    if (sync || !KidsSync) return sync;
    sync = makeSyncClient(currentChild, {
      onAdopt: hooks.onAdopt,
      onHealth: hooks.onHealth || (() => refreshSyncStatus()),
    });
    if (sync) sync.attachLifecycle(window, document);
    return sync;
  }

  // child 維度播種：複製不搬移（legacy key 原樣保留、只播給 legacyChild）。回傳是否播了
  function seedLegacy() {
    if (!store.legacyKey) return false;
    const plan = store.planLegacySeed(currentChild, safeGet(store.legacyKey), safeGet(store.progressKey(currentChild)));
    return !!(plan && safeSet(plan.key, plan.value));
  }

  // 手動覆蓋類寫入（播種／匯入／重置／示範資料）的統一定錨：漏一處＝該寫入日後被 boot adopt 蓋掉。
  // pushNow＝立即推一輪（覆蓋當下就要見效）；播種路徑傳 false（boot 輪接手）
  function anchorLocalWrite(pushNow) {
    if (sync) {
      sync.markImported();
      if (pushNow) sync.syncNow().catch(() => {});
    } else {
      markImportedFallback(currentChild);
    }
  }

  function syncStatusHtml() {
    if (!KidsSync) return syncStatusInnerHtml({ scriptLoaded: false }); // 靜態文案，不用白算 meta/token
    return syncStatusInnerHtml({
      scriptLoaded: true,
      info: childInfo(currentChild),
      meta: readSyncMeta(currentChild),
      token: getToken(),
      healthText: KidsSync.HEALTH_TEXT,
      btnClass,
      msgClass,
    });
  }
  // 健康燈唯一重繪入口（背景同步輪、家長區開合、adopt 重繪全走這裡）：
  // 家長輸入金鑰到一半時跳過——別把打到一半的金鑰洗掉。
  // 錨點兩式：頁上已有 #sync-status（study 內嵌於備份區）→ 原地換；否則寫進 #sync-block 容器
  function refreshSyncStatus() {
    const input = document.getElementById("sync-token-input");
    if (input && (document.activeElement === input || input.value)) return;
    const cur = document.getElementById("sync-status");
    if (cur) { cur.outerHTML = syncStatusHtml(); return; }
    const block = document.getElementById("sync-block");
    if (block) block.innerHTML = syncStatusHtml();
  }
  // 健康燈按鈕的全域 handler（共用 HTML 以 onclick 引用，故掛 window；每 app 一份 wiring、不互撞）
  window._saveSyncToken = () => {
    const input = document.getElementById("sync-token-input");
    const msg = document.getElementById("sync-msg");
    const v = ((input && input.value) || "").trim();
    if (!v || !identity) {
      if (msg) msg.textContent = "請先貼上金鑰";
      return;
    }
    identity.setToken(v); // 本 session 立即生效（蓋過網址殘留的舊 ?k=）＋持久化
    if (input) { input.value = ""; input.blur(); } // 清空＋失焦，健康燈輪到時才刷得動
    refreshSyncStatus(); // 先重繪，回饋才寫得進新節點（反過來會在同 tick 被重繪銷毀、從未上畫）
    const saved = document.getElementById("sync-msg");
    if (saved) saved.textContent = "金鑰已儲存";
    if (sync) sync.syncNow().catch(() => {}); // 剛設好金鑰 → 立刻試一輪，健康燈即時更新
  };
  window._syncNow = async () => {
    if (!sync) return;
    try { await sync.syncNow(); } catch (e) {}
    refreshSyncStatus();
  };

  function renderChildBadge() {
    const el = document.getElementById("child-badge");
    if (!el) return;
    const info = childInfo(currentChild);
    el.textContent = `${info.emoji} ${info.label}`;
    el.classList.remove("hidden"); // 兩種藏法都解（class 與 hidden 屬性）
    el.hidden = false;
  }

  function childPickerHtml(name) { return childPickerInnerHtml(currentChild, name); }
  function pickedChild(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return (el && el.value) || currentChild;
  }

  // 匯入／重置共用落地：直寫目標 child 的新格式 key → 定錨標記 → 上雲。
  // 目標＝當前 child：只同步地寫 key＋markImported 就立刻 reload——不 await 網路輪，
  // 否則等待窗內頁面仍可操作、任何 app 存檔會用舊 state 蓋掉剛匯入的資料；
  // 定錨＋push 由 reload 後的 boot 輪完成（anchorPending 已持久化，離線也不丟）。
  // 目標＝其他 child：本頁存檔不受影響，await 推完、回報帶推雲結果（#40-B 行為變更）。
  // 回傳恆為物件 { status: "write-failed" | "reloading" | "done", pushed?, reason? }
  // （不混用裸字串：呼叫端一律 r.status 判斷，寫錯分支不會靜默不進）
  async function commitImport(child, obj, opts = {}) {
    const plan = store.planImportWrite(child, obj);
    if (!safeSet(plan.key, plan.value)) {
      return { status: "write-failed" }; // quota／私密模式：進度沒動，讓呼叫端回報
    }
    if (child === currentChild) {
      if (sync) sync.markImported();
      else markImportedFallback(child); // 腳本沒載到也不能丟定錨，否則日後 boot adopt 蓋掉匯入
      if (opts.reloadTo) location.replace(opts.reloadTo);
      else location.reload();
      return { status: "reloading" }; // reload 前的殘影期不再做事
    }
    const c = makeSyncClient(child);
    if (!c) { markImportedFallback(child); return { status: "done", pushed: false, reason: null }; } // 下次開站補推
    let r = null;
    try { r = await c.importedLocal(); } catch (e) {}
    // pushed 判準：本輪真的走了 push 且 PUT 被收下。
    // reason 供回報文案分流（importedFeedbackText）：
    // - adopted＝PUT 撞 409 且二次判定採雲端（雲端比備份新，LWW 該它贏）——備份已被蓋掉、不會補傳
    // - schema-block＝雲端版本較新暫停同步——資料在本機、更新 app 後補傳
    const pushed = !!(r && r.action === "push" && !r.putRejected && (c.meta().health === "ok"));
    let reason = null;
    if (!pushed && r) {
      if (r.secondAction === "adopt" || r.secondAction === "conflict-adopt") reason = "adopted";
      else if (r.action === "schema-block") reason = "schema-block";
    }
    return { status: "done", pushed, reason };
  }
  // r＝commitImport 的回傳物件（status "done" 時呼叫）
  function importedFeedback(child, r) {
    return importedFeedbackText(childInfo(child).label, r.pushed, r.reason);
  }

  // bfcache 復原：重讀身分（點錯圖示／hub 切人殘留頁），不一致即 reload；一致則拉一次雲端
  function attachPageshowGuard() {
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      const id = KidsSync ? KidsSync.identityFromSearch(location.search) : { child: null };
      if ((id.child || store.legacyChild) !== currentChild) { location.reload(); return; }
      if (sync) sync.syncNow().catch(() => {});
    });
  }

  // 回傳面只放 app 實際呼叫的成員（多曝露一個＝多一條沒人測的公開契約）；
  // KidsSync／identity／readSyncMeta／markImportedFallback／makeSyncClient 等留在閉包內部
  return {
    currentChild,
    store,
    identityUnresolvable,
    safeGet,
    safeSet,
    childInfo,
    initSync,
    seedLegacy,
    anchorLocalWrite,
    syncStatusHtml,
    refreshSyncStatus,
    renderChildBadge,
    childPickerHtml,
    pickedChild,
    commitImport,
    importedFeedback,
    attachPageshowGuard,
  };
}

if (typeof window !== "undefined") {
  window.KidsWiringV1 = {
    CHILD_INFO,
    KNOWN_CHILDREN,
    makeChildStore,
    formatSyncTime,
    syncStatusClass,
    escapeHtml,
    syncStatusInnerHtml,
    importedFeedbackText,
    childPickerInnerHtml,
    createWiring,
  };
}
