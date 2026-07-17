// 接線層純函式測試（票 #40-B）：docs/shared/wiring-v1.js 的 <wiring-pure> 區塊。
// 四 app 的 key 尋址、健康燈 HTML 判讀、匯入回報文案的單一真相源測試——
// per-app 測試只 pin 各 app 的 <wiring-config> 設定值，不再重測這些函式。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../docs/shared/wiring-v1.js", import.meta.url), "utf8");
const blk = src.match(/\/\/ <wiring-pure>([\s\S]*?)\/\/ <\/wiring-pure>/);
if (!blk) throw new Error("docs/shared/wiring-v1.js 找不到 <wiring-pure> 區塊");
const {
  CHILD_INFO, KNOWN_CHILDREN, childInfoOf, makeChildStore, formatSyncTime, syncStatusClass,
  escapeHtml, syncStatusInnerHtml, importedFeedbackText, childPickerInnerHtml,
} = new Function(blk[1] +
  "\nreturn { CHILD_INFO, KNOWN_CHILDREN, childInfoOf, makeChildStore, formatSyncTime, syncStatusClass, escapeHtml, syncStatusInnerHtml, importedFeedbackText, childPickerInnerHtml };")();

// ── 小孩名單 ──

test("CHILD_INFO：兩個小孩、label/emoji 齊全；未知 child 回 fallback", () => {
  assert.deepEqual(KNOWN_CHILDREN, ["aiden", "bingpu"]);
  assert.equal(CHILD_INFO.aiden.label, "哥哥");
  assert.equal(CHILD_INFO.bingpu.label, "弟弟");
  for (const c of KNOWN_CHILDREN) {
    assert.ok(CHILD_INFO[c].label && CHILD_INFO[c].emoji, `${c} 缺 label/emoji`);
  }
  assert.deepEqual(childInfoOf("test-x"), { label: "test-x", emoji: "🙂" });
});

// ── key 尋址 factory ──

const STUDY = makeChildStore({ appId: "study", legacyChild: "aiden", legacyKey: "aiden_study_v2" });
const ZHUYIN = makeChildStore({ appId: "zhuyin", legacyChild: "bingpu", legacyKey: "aiden_zhuyin_v1" });
const MATH = makeChildStore({ appId: "math", legacyChild: "aiden", legacyKey: null });
const SPELLING = makeChildStore({ appId: "spelling", legacyChild: "aiden", legacyKey: "spelling_bee_progress_v4" });

test("key 格式：四 app 的 progress／meta key 一字不差（重接線不得默默改 key＝進度看似消失）", () => {
  assert.equal(STUDY.progressKey("aiden"), "study:progress:aiden");
  assert.equal(STUDY.syncMetaKey("aiden"), "study:sync:aiden");
  assert.equal(ZHUYIN.progressKey("bingpu"), "zhuyin:progress:bingpu");
  assert.equal(ZHUYIN.syncMetaKey("bingpu"), "zhuyin:sync:bingpu");
  assert.equal(MATH.progressKey("aiden"), "math:progress:aiden");
  assert.equal(MATH.syncMetaKey("aiden"), "math:sync:aiden");
  assert.equal(SPELLING.progressKey("aiden"), "spelling:progress:aiden");
  assert.equal(SPELLING.syncMetaKey("aiden"), "spelling:sync:aiden");
});

test("key 隔離：progress≠meta、child 間不同、不撞各 app 舊 key", () => {
  for (const s of [STUDY, ZHUYIN, MATH, SPELLING]) {
    assert.notEqual(s.progressKey("aiden"), s.syncMetaKey("aiden"));
    assert.notEqual(s.progressKey("aiden"), s.progressKey("bingpu"));
    if (s.legacyKey) assert.notEqual(s.progressKey(s.legacyChild), s.legacyKey);
  }
});

test("planLegacySeed：歸屬 child＋新 key 空＋舊 blob 在 → 複製到新 key（值原樣）", () => {
  const legacy = '{"mastered":{"3":["a"]}}';
  assert.deepEqual(STUDY.planLegacySeed("aiden", legacy, null), { key: "study:progress:aiden", value: legacy });
  assert.deepEqual(ZHUYIN.planLegacySeed("bingpu", legacy, null), { key: "zhuyin:progress:bingpu", value: legacy });
});

test("planLegacySeed：新 key 已有資料／舊 blob 不存在／child 非歸屬者／無 legacyKey → 不動作", () => {
  const legacy = '{"mastered":{}}';
  assert.equal(STUDY.planLegacySeed("aiden", legacy, '{"x":1}'), null, "新 key 已有資料不得覆蓋");
  assert.equal(STUDY.planLegacySeed("aiden", legacy, ""), null, "新 key 存過空字串也算存在，不覆蓋");
  assert.equal(STUDY.planLegacySeed("aiden", null, null), null, "無舊 blob");
  assert.equal(STUDY.planLegacySeed("aiden", "", null), null, "舊 blob 空字串視同不存在");
  assert.equal(STUDY.planLegacySeed("bingpu", legacy, null), null, "study 舊存檔歸 aiden，不播種給弟弟");
  assert.equal(ZHUYIN.planLegacySeed("aiden", legacy, null), null, "zhuyin 舊存檔歸 bingpu，不播種給哥哥");
  assert.equal(STUDY.planLegacySeed("test-a", legacy, null), null);
  assert.equal(MATH.planLegacySeed("aiden", legacy, null), null, "math 無播種路徑（#33 從零）");
});

test("planImportWrite：只寫目標 child 的新格式 key，值＝JSON 序列化", () => {
  const obj = { mastered: { "3": ["x"] } };
  const plan = STUDY.planImportWrite("bingpu", obj);
  assert.equal(plan.key, "study:progress:bingpu");
  assert.deepEqual(JSON.parse(plan.value), obj);
});

// ── 時間與 CSS class ──

test("formatSyncTime：空值回 null；已知時刻格式 YYYY-MM-DD HH:MM（本地時區建構故不受 TZ 影響）", () => {
  assert.equal(formatSyncTime(null), null);
  assert.equal(formatSyncTime(0), null);
  const ts = new Date(2026, 6, 17, 8, 5).getTime();
  assert.equal(formatSyncTime(ts), "2026-07-17 08:05");
});

test("syncStatusClass：ok→sync-ok、retry→空（中性）、其餘→sync-bad", () => {
  assert.equal(syncStatusClass("ok"), "sync-ok");
  assert.equal(syncStatusClass("retry"), "");
  for (const s of ["offline", "no-token", "auth-error", "data-error", "schema-block"]) {
    assert.equal(syncStatusClass(s), "sync-bad");
  }
});

// ── 健康燈 HTML 判讀 ──

const HEALTH_TEXT = {
  ok: "同步正常",
  offline: "離線或連不上同步服務",
  "no-token": "尚未設定同步金鑰（不是離線，請在下方輸入）",
};
const baseV = {
  scriptLoaded: true,
  info: { label: "哥哥", emoji: "👦" },
  meta: {},
  token: "tok",
  healthText: HEALTH_TEXT,
  btnClass: "parent-btn",
  msgClass: "",
};

test("健康燈：腳本未載入 → 明講、仍帶 id=sync-status（refresh 錨點）", () => {
  const h = syncStatusInnerHtml({ ...baseV, scriptLoaded: false, healthText: null });
  assert.match(h, /同步腳本未載入/);
  assert.match(h, /id="sync-status"/);
});

test("健康燈：無 token → no-token 文案標紅、輸入框 placeholder 引導貼金鑰", () => {
  const h = syncStatusInnerHtml({ ...baseV, token: null });
  assert.match(h, /class="sync-bad"[^>]*>尚未設定同步金鑰/);
  assert.match(h, /placeholder="貼上家庭同步金鑰"/);
});

test("健康燈：health=ok → 綠燈文案；placeholder 提示已設定金鑰", () => {
  const h = syncStatusInnerHtml({ ...baseV, meta: { health: "ok", lastSyncAt: new Date(2026, 6, 17, 8, 5).getTime() } });
  assert.match(h, /class="sync-ok">同步正常/);
  assert.match(h, /上次成功同步：2026-07-17 08:05/);
  assert.match(h, /placeholder="已設定金鑰（貼新的可覆蓋）"/);
});

test("健康燈：未知 health 字串 → 同步狀態異常（不謊報成還沒同步過）；無 health → 還沒同步過", () => {
  assert.match(syncStatusInnerHtml({ ...baseV, meta: { health: "weird-future" } }), /同步狀態異常/);
  assert.match(syncStatusInnerHtml({ ...baseV, meta: {} }), /還沒同步過/);
});

test("健康燈：reseedAt 或 regenAt（雲端曾遺失的兩種視角）都要出警告行", () => {
  const ts = new Date(2026, 6, 1, 9, 0).getTime();
  assert.match(syncStatusInnerHtml({ ...baseV, meta: { reseedAt: ts } }), /⚠️ 雲端進度曾遺失，已於 2026-07-01 09:00 重新上傳/);
  assert.match(syncStatusInnerHtml({ ...baseV, meta: { regenAt: ts } }), /⚠️ 雲端進度曾遺失/);
  assert.doesNotMatch(syncStatusInnerHtml({ ...baseV, meta: {} }), /曾遺失/);
});

test("健康燈：btnClass 進兩顆按鈕；msgClass 空字串時 span 不帶 class 屬性", () => {
  const h = syncStatusInnerHtml({ ...baseV, btnClass: "st-btn", msgClass: "backup-msg" });
  assert.equal((h.match(/class="st-btn"/g) || []).length, 2);
  assert.match(h, /<span id="sync-msg" class="backup-msg">/);
  const h2 = syncStatusInnerHtml(baseV);
  assert.match(h2, /<span id="sync-msg">/);
});

test("健康燈：child label 經 escape（不可信字串不得直插 HTML）", () => {
  const h = syncStatusInnerHtml({ ...baseV, info: { label: '<img src=x>', emoji: "🙂" } });
  assert.doesNotMatch(h, /<img src=x>/);
  assert.match(h, /&lt;img src=x&gt;/);
});

// ── 匯入回報文案（#40-B 行為變更）──

test("importedFeedbackText：成功明說雲端已更新；失敗明說只在本機＋補傳條件", () => {
  const ok = importedFeedbackText("弟弟", true);
  assert.match(ok, /已還原到 弟弟 的進度/);
  assert.match(ok, /雲端也更新了/);
  const fail = importedFeedbackText("弟弟", false);
  assert.match(fail, /已寫入這台裝置/);
  assert.match(fail, /雲端上傳沒成功/);
  assert.match(fail, /弟弟 下次在這台裝置開啟這個 app 時會自動補傳/);
});

// ── child 選擇器 ──

test("childPicker：列出兩個小孩、當前 child 預選；test- 驗收 id 不在名單時補列", () => {
  const h = childPickerInnerHtml("bingpu", "pick");
  assert.match(h, /value="aiden"/);
  assert.match(h, /value="bingpu" checked/);
  assert.equal((h.match(/name="pick"/g) || []).length, 2);
  const h2 = childPickerInnerHtml("test-a", "pick");
  assert.match(h2, /value="test-a" checked/);
  assert.equal((h2.match(/name="pick"/g) || []).length, 3);
});

test("escapeHtml：<>&\" 全轉義", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});
