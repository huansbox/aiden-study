# HANDOFF — 2026-07-12 平台鏈推進到 5/9；卡在兩個只有家長能做的實體驗證

## 目標

全家學習平台（spec＝issue #26，9 張 sub-issue）。本 session 完成 live 驗收（#28＋#29）、#40-A、#30。
下一張是 **#31（6/9 hub＋registry＋家長視圖）**，已解鎖但**建議先讓家長清掉下面兩個閘門**。

## 進度

- 已完成：#27／#28／#29／#30 全部關票。本 session 交付＝**#28＋#29 live 驗收 8/8 通過**（PR 無）、**PR #41**（#40-A study 鏡射四修＋跨 child 寫入 bug）、**PR #42**（#30 repo 重整）。實作細節、review findings 處置、驗收結果全記在 PR 描述、issue 留言與 CLAUDE.md，**不在此重複**。
- 進行中：無未合分支、無半成品、工作區乾淨。
- 下一步：**先確認下面兩個家長閘門**，再開 #31。

## 對話中已對齊、尚未落檔的決策

### ⚠️ Worker 的 TOKEN 目前是拋棄式的，必須換回家用 token（最重要）

live 驗收需要 family token（在家長 1Password）。家長選了「鑄一把拋棄式 token 給 agent 用，驗完換回」的走法，所以本 session 用 `openssl rand -hex 16` 鑄了一把、`npx wrangler secret put TOKEN` 裝上去了。**那把拋棄式 token 現在還裝在 live worker 上。**

家長要跑：`cd worker && npx wrangler secret put TOKEN`，貼 1Password 的 family token。

目前**沒有任何裝置在用同步**（`/v1/status` 回空、真實小孩的雲端 key 一把都不存在），所以這段期間沒中斷任何東西。但 **#31 的家長視圖健康燈要讀 Worker `/v1/status`，需要真 token 才驗得起來**。

（worker 是單一把 `env.TOKEN` 字串比對，沒有多把／可撤銷 token 的機制——`worker/worker.mjs:67`。）

### ⚠️ #30 待家長 iPad 實機 smoke

既有 iPad 主畫面圖示的 start_url 指向舊的「根」，現在會先經過跳轉頁再被換到 `/study/`。
推論是安全的（`/study/` 仍在安裝時 scope `/aiden-study/` 內 → 不掉出 standalone；同 origin → localStorage 容器不變），**但沒有實機驗證過**。

家長點一下圖示，確認：①仍是全螢幕 app、沒跳出 Safari ②進度還在。
真出問題＝revert PR #42 的 merge commit 即回舊結構，**資料完全沒動過**。

### 已裁決、已落檔（僅列指標，不重複內容）

- #28 兩條 PLAUSIBLE findings → **都不修**，理由寫在 issue #28 留言。
- #40-A 已交付；**#40-B（接線平台化）仍未動**，且本 session 又新增一項重複（`identityUnresolvable` 在兩個 app 逐字複製），已補進 #40 留言。**#31 是收它的正確時機**。
- #28 的「家長真實備份檔對帳」仍未跑（`aiden-study-進度備份-20260615.json` 不在這台 Mac）。

## 注意事項

- **localhost 打 worker 一定會 CORS 失敗**——worker 的 `ALLOWED_ORIGINS` 只有 `huansbox.github.io` 與 `kids.linshuhuan.com`。本機測試看到同步 CORS error **是預期的、不是 bug**（反而證明 sync client 有在運作）。要驗同步就對 live origin 測。
- **`build_explanations.py` 會順手改動 3 個 `docs-dev/review_*_抽查.md`**——那是既有的陳舊產物（報告產於題庫文字清理之前，rebuild 才追上），**不是你改壞的**。本 session 刻意 `git checkout --` 還原掉，維持 diff 乾淨。下次跑到一樣會看到，別緊張。
- **驗證「腳本載入失敗」的手法**（本 session 用來抓出跨 child 寫入 bug）：把 `docs/` 複製一份到 scratchpad，**故意不複製 `shared/`**，起 server → `sync-v1.js` 404 → `KidsSync` undefined。這條路很有用，因為那個 bug 只在這個狀態下現形。
- **驗證「封鎖 Cookie」的手法**：複製 `docs/study/index.html`，在 app script **之前**插入一段把 `window.localStorage` 的 getter 換成拋 SecurityError 的 shim。必須插在 app script 前，用 Playwright 的 `browser_evaluate` 事後覆寫是來不及的。
- `node --test` 的統計行是 `ℹ pass N` **不是** `# pass N`，寫聚合腳本時別抓錯。
- 全量測試：`for f in tests/*.mjs; do node --test "$f"; done`（node 160）＋`uv run pytest`（140 passed＋1 skipped）。

## Suggested skills

- 開 #31：`gh issue view 31` → 開 `feat/platform-hub-registry` 分支 → 基線測試全綠再動工 → PR merge 前 `/code-review`（規模不小，建議 medium）。
- #31 票面明寫「若實作中發現本票與現實不符 → 停下回報，不硬做完」。**#30 就踩到一次**（票把共用的 `rewards.json` 當成 study 的），所以這條不是形式主義，是真的會發生。

## 如何接續

1. 任一台機器 `git pull` master（一切已推送，無未合分支）。
2. **先問家長那兩個閘門**：①TOKEN 換回去了嗎 ②iPad 圖示 smoke 過了嗎。
3. 兩個都清掉 → 開 #31。iPad 若炸 → revert PR #42 的 merge commit 並回報。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
