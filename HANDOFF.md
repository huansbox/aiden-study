# HANDOFF — 2026-07-17 #40-B 4 條 review 留裁決全數交付；平台收尾只剩 iPad 事項

## 目標
全家學習平台收尾（spec＝#26）。本 session＝消化上一份交接、逐條 grill 家長裁決 #40-B 的 4 條 review 留裁決＋#28 對帳，實作交付、merge、live 驗收，全程完成。

## 進度
- 已完成：
  - **#40-B 4 條留裁決全部實作並 merge（PR #50，2026-07-17，live 已部署）**：①補 wiring 效果層 node 測試（`tests/test_wiring_effects.mjs` 15 例，mock window 沙箱）②study/zhuyin 存檔層 try/catch 收斂到 wiring.safeGet/safeSet ③markImportedFallback 定錨寫失敗誠實回報（reason `anchor-failed`＋當前 child 匯入 reload 前 alert）④zhuyin 重置寫失敗不 reload、明示訊息（新增 `#reset-status`）。wiring 變更已 bump `?v=20260717b`。
  - **live 帶 token 驗收已過**（test-aiden；本地 Playwright 驗 study 作答存檔＋zhuyin 重置正常/失敗兩路徑）。node 220＋pytest 140 全過，/code-review low 0 findings。
  - **#28 家長真實備份檔對帳＝家長裁決放棄**（檔不在此 Mac Dropbox、匯入機制已 live 驗過、舊資料過時）。
  - 落檔全部完成：CLAUDE.md #40-B 條目改標已裁決＋修正「#40-B live 驗收其實已過」的陳舊記載、#28 待辦劃掉；處置記 PR #49＋#50 留言。
- 進行中：無。
- 下一步：平台工作只剩需要 iPad 的 HITL，全部擱置中（見「如何接續」）。無 code 待辦。

## 對話中已對齊、尚未落檔的決策
- 無未落檔決策。唯一值得標記的**範圍邊界**（已寫進 CLAUDE.md）：裁決③只修了「sync-v1 沒載到」的 markImportedFallback 路徑；**sync client 存在時 `sync.markImported()` 也可能靜默寫失敗（同款 quota 縫隙）沒動**——那要改 sync-v1.js 的 API、review 也沒點名，屬另案。日後若要徹底一致才處理。

## 注意事項
- **本次沒碰 1Password**：Playwright MCP 瀏覽器 profile 仍帶著家用 token（`kids_sync_token` 存在 huansbox.github.io localStorage）——下次 live 驗收可直接用；profile 被清才需回 1Password 拿。
- **vm 沙箱測試的物件不能用 `assert.deepEqual`**：`test_wiring_effects.mjs` 在 `node:vm` realm 跑 wiring-v1.js，回傳物件的 prototype 與測試 realm 不同，deepEqual 會誤判「same structure but not reference-equal」——一律逐欄位 `assert.equal`。
- wiring-v1.js 再改要同步 bump 四個 app 的 `?v=` tag（現 `20260717b`；混版快取坑，CLAUDE.md 陷阱節同款）。
- 本機打 worker 一定 CORS 失敗（ALLOWED_ORIGINS 只有 live origin）＝預期，要驗同步對 live 測。

## Suggested skills
- 平台已無 code 待辦，本檔接班多半只是消化（讀完刪）。若家長要動 iPad 事項再依當時需求選 skill。

## 如何接續
任一台機器：`git checkout master && git pull` → 讀本檔 → 刪除消化。
**剩餘全為需 iPad 的 HITL（依鏈）**：#35 iPad spike 已回報 → #30/#31 遺留的家長 iPad 主畫面圖示 smoke（開站變「選人→首頁→點題庫」）→ 圖示網址 `?k=` 填家用 token（#44）→ zhuyin #20 recorder.html 錄 14 段音檔入庫（缺檔歸零）＋iPad checklist → study #11 standalone 還原（剪貼簿橋樑，deferred）。這些都要家長本人操作 iPad，AI 端無可推進。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
