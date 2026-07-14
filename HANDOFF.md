# HANDOFF — 2026-07-14 平台 6/9（#31 hub）完成收工，未做／待裁決留給下次

## 目標
全家學習平台 9 票鏈（spec＝#26）。本 session 完成：worker 部署（#37 徹底了結）＋ #31 hub＋registry（PR #45 merge、live 已部署驗證）。細節都已落檔：專案 CLAUDE.md 的 #31 條目＋PR #45 描述，此檔不重複。

## 進度
- 已完成：#37 部署生效（version `0b31ae0d`）；#31 全部驗收（node 185＋pytest 140＋Playwright 本地五關＋live 煙霧）；CLAUDE.md／CONTEXT.md 已同步更新。
- 進行中：無（乾淨收工，master 全 push）。
- 下一步：處理下方待裁決清單 → 開 #32（7/9 math／spelling 搬入＋spelling 進度收割，**HITL 票**，需家長配合）。

## 對話中已對齊、尚未落檔（或等家長裁決）的事項
1. **#44 token 換回仍未做**（唯一家長閘門，見 CLAUDE.md ⚠️ 條目）：`cd worker && npx wrangler secret put TOKEN`，貼 1Password 的 family token。本 session 結束時尚未執行。
2. **registry 內容假設等家長過目**（`docs/registry.json` 一行可改）：math／spelling＝active 外鏈上哥哥首頁（點了會跳出 webclip 到 Safari）、animal-fight＝僅家長目錄、aiden-english＝draft、99-meteor＝parked owner=bingpu；99timestable／world-cup 未列（不在 GitHub／下落不明；animal-fight 頁標題顯示含世界盃小遊戲，可能已併入）。
3. **#40-B 兩條平台化裁決項**（issue #40 B 節，票面明載等家長定向）：①他 child 匯入回報不反映推雲結果的文案 ②接線平台化（pageshow 重驗、健康燈 status-model、child-store key factory、`identityUnresolvable` 兩 app 逐字複製的去重）。建議 #33 前定案。
4. **review 未採的 2 條 PLAUSIBLE**（判不值得動，若家長不同意再開）：選人點擊走整頁導航（可改站內重繪省一次 reload，但改返回鍵語意）；家長區 registry／status 兩個 fetch 未並行。
5. **行為變更提醒**：既有 iPad 圖示開站從「自動跳題庫」變「選人→首頁→點題庫」（spec 設計如此）；#30 遺留的 iPad 實機 smoke 現在多一步選人流程。
6. **健康燈 live 帶真資料的驗收**＝等 #44 換回＋裝置開始同步後順手看一眼（渲染路徑已 stub 全驗，live 目前 `/v1/status` 回空＝正確顯示「從未同步」）。

## 注意事項
- 同步／測試陷阱全在專案 CLAUDE.md「同步／測試開發陷阱」節（localhost 打 worker 必 CORS 失敗＝預期等），別重踩。
- 驗 hub 健康燈成功渲染要用 fetch stub 副本（複製 docs 到 scratchpad、在 `<body>` 後插 stub script override `/v1/status`），live 無 token 打不通。

## Suggested skills
- 接手先 `/handoff`（消化並刪本檔）。
- #32 開工前先讀 issue #32 票面；實作屬既拆票，直接逐票做，不需 grill；PR merge 前 `/code-review`（規模中→medium）。

## 如何接續
任一台機器：checkout master、pull、打 `/handoff` 消化本檔。第一個動作＝確認 #44 是否已換 token（`/v1/status` 用家用 token 打通即換過），然後依待裁決清單 1–3 向家長要裁決，再開 #32。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
