# HANDOFF — 2026-07-12 平台票 3/9（study 接入同步）已 merge，live 驗收未跑即中斷

## 目標

全家學習平台（spec＝issue #26）。#28 程式面已交付（PR #38 merge、票已自動關閉），剩 live 驗收與後續票。

## 進度

- 已完成：**#28 全部程式面**——共用 sync client、child 維度存檔、備份面 child-aware、家長區健康燈；code review（medium）14 CONFIRMED 全修；node 154＋pytest 140 綠；本地 Playwright（route 攔截模擬 worker 協定）閉環全過。細節見 CLAUDE.md #28 狀態行與 PR #38 描述。Pages 已部署、live 檔案確認為 review 後版本。
- 進行中：**live 驗收未跑**——家長正要開 1Password 取 family token 時改為交班。
- 下一步：取得 token 後對 live 舊 origin 用 `test-` child 跑驗收：練一題→雲端 rev 前進、清 storage 重開→自動還原、匯入選 child 寫對 key、拔 token→家長區顯異常（非離線）。

## 對話中已對齊、尚未落檔的決策

- **#28 票已被 PR「Closes」自動關閉，但驗收清單有兩項未完成**：①live Playwright 閉環（需 token）②家長真實備份檔 seed 對帳（`aiden-study-進度備份-20260615.json` 不在這台 Mac，本機＋Dropbox 都找過；已用等形狀合成 blob＋真實題目 id 驗過計數一致）。live 驗收若炸要 reopen #28。
- **2 條 PLAUSIBLE review findings 留家長裁決**（PR #38 描述有提但未展開，具體內容只在對話）：①seed 複製遇 quota 失敗、之後 app 又寫入 child key 時 legacy 被靜默遮蔽（機率極低、`aiden_study_v2` 完好可手動救；要修＝seed 後 read-back 驗證）②三處 localStorage JSON parse 樣板可收斂成 `readJsonKey` helper（純整潔）。前一 session 建議：都不修。
- **token 隱私選項已向家長提出、未回覆**：token 貼進對話會留在 session 記錄；替代方案＝家長自己在裝置上操作、agent 出人工驗收清單。接手時先問要走哪條。
- 協定 liveness 缺口（他機搶先 reseed→落後裝置永久 retry）已開 **follow-up #37**，屬 #27 既有行為、不算 #28 回歸。

## 注意事項

- **Playwright 攔不到 `sendBeacon`**（走瀏覽器網路棧、繞過 route 攔截）——本地測試時 beacon 會打到真 production worker（假 token 得 401、無害）；驗 beacon 相關行為靠「dirty 不清＋下次開站補推」的可觀察結果與 contract test，別浪費時間試著 mock 它。
- 本地整條閉環的測法＝Playwright `context.route` 攔 `https://aiden-kids-sync.huansbox.workers.dev/**`、用內存 mock 實作 rev/writeId 協定（含 `/__mock__/state|seed|reset` 控制端點）；MCP 的 `browser_run_code_unsafe` 沙箱**沒有 `URL` 全域**（改字串解析）、**全域不跨呼叫**（狀態要靠 mock 端點讀回）。
- 對 production 測試一律 `test-` 前綴 child id（status 端點自動忽略）；真 child key 別碰。KV 裡既有 `test-a:study` 為 #27 驗收殘留，無害。
- wrangler 憑證、workers.dev 傳播延遲、zsh 陣列 1-based 等前朝注意事項仍有效（見 git log 裡上一份 handoff：`403cbc7`）。

## Suggested skills

- live 驗收＝直接 Playwright 操作，不需 skill；驗完更新 CLAUDE.md #28 狀態行（拿掉「待辦：live 驗收」字樣）。
- 下一張票 #29（zhuyin 接入）照票實作即可（接入面直接用 sync-v1.js 的 `bootIdentity`／`HEALTH_TEXT`／`attachLifecycle`，勿複製 study 接線）；PR merge 前 `/code-review`（medium）。

## 如何接續

1. 任一台機器 `git pull` master（一切已推送，無未合分支）。
2. 先問家長：live 驗收走「token 貼對話」還是「家長自操作＋人工清單」；token 在家長 1Password。
3. 驗收過→更新 CLAUDE.md 待辦字樣；炸→reopen #28 修。之後開工 #29：`gh issue view 29` → 開 `feat/platform-zhuyin-sync` 分支 → 基線 `uv run pytest`＋逐一 `node --test tests/*.mjs` 全綠再動工。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
