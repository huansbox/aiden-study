# HANDOFF — 2026-07-11 全家學習平台：規劃全部完成，實作尚未開工

## 目標

aiden-study 重整為全家學習平台 monorepo（hub 入口＋registry＋kids.linshuhuan.com＋CF Worker 進度同步）。真相源：**spec＝issue #26**、拆票＝**native sub-issues #27–#35**（9 張，線性 blocked-by 鏈）、決策＝`docs-dev/adr/0001–0004`、詞彙＝`CONTEXT.md`。

## 進度

- 已完成：grill 對齊→ADR 落檔→spec 發佈→3-reviewer doc-review（12 findings 全採納）→拆票→拆票批次 3-reviewer doc-review（11 組 findings 全採納）→9 票發佈、依賴邊接好。**零程式碼——實作完全未開工。**
- 進行中：無（乾淨交接點）。
- 下一步：兩張無依賴票可並行開工——**#35**（iPad spike，家長一個下午，架構前提 stop-gate）與 **#27**（Worker＋KV，實作票）。

## 對話中已對齊、尚未落檔的決策

（幾乎全部已落檔；僅餘工作方式類）

- 家長偏好：review findings **一次一條**白話確認，不整包呈報；小事可由 agent 代拍板但要註明。
- 票號≠順序：平台 1/9＝#35（首輪建票 zsh 陣列錯位補建所致），其餘 2/9–9/9＝#27–#34 依序。

## 注意事項

- 本機（此 Mac）**未裝 wrangler、無 CF 憑證**——#27 部署段需家長 `wrangler login` 一次（票內已標 HITL）。
- spelling-bee-trainer repo **已是 archived 狀態**（2026-03-17）——#32/#34 票內已寫對應處置，別被「未動舊 repo」驗收弄糊塗。
- 注音音檔目錄仍空（家長閘門 #20 未過）——#29 已授權 Playwright stub 音檔驗法，不要把錄音拉進依賴。
- 站內引用**一律相對路徑**（新舊 origin base path 不同）——spec 鐵律，flip 日斷線的頭號雷。
- 兩個「順手項」未辦：aiden-baseball 只在本機未 push GitHub；world-cup 專案下落不明（可能在 Windows 機）。

## Suggested skills

- 逐票實作照票面驗收走，spec/票已齊備**不需再 grill**（除非發現票與現實不符——票尾有明文：停下回報回對齊）。
- 每票 PR merge 前 `/code-review`（effort 隨規模；#30 機械搬移用 low）。
- 實作中改動 CLAUDE.md 指標行即可，勿重寫歷史段落。

## 如何接續

1. 任一台機器：`git pull` master（規劃全在 master，無 feature branch）。
2. 讀 issue #26＋要做的那張票（建議從 #27 開，開 `feat/platform-sync-worker` 之類分支）；#35 提醒家長排時間。
3. 先跑 `uv run pytest`＋既有 node 測試確認基線綠，再動工。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
