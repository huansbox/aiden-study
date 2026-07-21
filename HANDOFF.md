# HANDOFF — 2026-07-21：PR #51 已部署；平台只剩 iPad HITL

## 本 session 目標

使用者今天沒有 iPad，也無法錄音。本 session 已完成所有能在 Mac 上安全收尾的工作：部署 #35 真機 spike 工具、建立自動 gate、清理已過時的 #11。沒有未完成的 code diff。

## 已完成

- **PR #51 已合併**：<https://github.com/huansbox/aiden-study/pull/51>
  - 功能 merge commit：`d8f59ab799b2e726e420c36b3d7838aea9320514`
  - 新增 `.github/workflows/test.yml`，在 push `master`、PR 與手動觸發時分別跑 Python／Node.js tests。
  - 新增 #35 的 spike 主頁、同源目標頁、11 個 Node.js tests 與真機 checklist。
  - 更新 `README.md`、`CLAUDE.md`，對齊目前平台架構與測試方式。
- **合併後 gate 全綠**：
  - test：<https://github.com/huansbox/aiden-study/actions/runs/29806424855>
  - Pages：<https://github.com/huansbox/aiden-study/actions/runs/29806424158>
  - GitHub Pages latest build 指向 `d8f59ab`，狀態 `built`。
- **兩個 live spike 頁已驗證**：皆回 HTTP 200，且內容含預期 sentinel 與共用 storage key `kids:platform-spike:v1`。
  - 主頁：<https://huansbox.github.io/aiden-study/platform-ipad-spike.html>
  - 同源目標頁：<https://huansbox.github.io/aiden-study/platform-ipad-spike-target.html>
- **Issue #35 已留下部署紀錄，維持 open**：<https://github.com/huansbox/aiden-study/issues/35#issuecomment-5030762186>
  - 僅代表工具已部署；三項 iPad HITL 結果全部仍未勾選。
- **Issue #11 已以 `not planned` 關閉**：<https://github.com/huansbox/aiden-study/issues/11#issuecomment-5030764325>
  - iPad 備份與 Safari 捷徑還原先前已通過。
  - standalone 捷徑無法回到同一 Web Clip，是 Safari／Web Clip 不同 LocalStorage 容器與 iOS 開啟 `https` 行為造成的結構性限制。
  - 跨裝置與抗清除由 child-scoped LocalStorage＋Cloudflare Worker/KV 同步承接。
  - #34 負責搬遷時更新「Aiden還原」網址、recipe，以及 restore → push → 其他裝置 pull 驗證。
  - 手動複製備忘錄內容再由 app 匯入，繼續保留為 standalone 後備。

## Repo 快照

- branch：`master`
- 功能基準：`d8f59ab`，已與 `origin/master` 對齊；本 HANDOFF 的純文件 commit 會接在其後。
- 自動測試基準：`uv run pytest` 為 140 passed、1 skipped；`node --test "tests/*.mjs"` 為 231 passed。
- 部署 origin：<https://huansbox.github.io/aiden-study/>
- 同步 API：`aiden-kids-sync.huansbox.workers.dev`
- 本 session 未碰 family token、1Password、Cloudflare secret 或真實小孩資料。

## 真正待辦

### 1. #35 iPad 單容器 spike

真相源：`docs-dev/platform-ipad-spike-checklist.md`

取得 iPad 後才執行，逐項驗證：

1. 同 origin 導覽是否留在 standalone Web Clip。
2. 主畫面圖示原始 URL 的 `?child=`／`?k=` 是否可由 JavaScript 讀到。
3. 同一 Web Clip 是否跨頁共享 LocalStorage，且與 Safari 容器隔離。

只可使用 checklist 內的假身分 `child=test-spike` 與假 token `test-spike-token`。桌面瀏覽器、模擬器或自動 tests 都不能代替 iPad 結果。

- 三項 PASS：把裝置資訊、安全報告與必要截圖附到 #35，勾完 checklist 後關閉 #35。
- 任一 FAIL：保留畫面與安全報告，停止 #34，先用 `/grill-me` 重新對齊架構，不加 workaround 硬過。

### 2. #34 自訂網域搬遷

`kids.linshuhuan.com` 搬遷仍 **blocked by #35 真機通過**。#35 未關閉前不要開始 flip。

#34 應包含：自訂網域與 Pages/Worker 設定、兩個 child 圖示、family token URL、更新「Aiden還原」捷徑與 recipe，以及 restore → push → 其他裝置 pull 的 live 驗證。

### 3. 其他仍需家長／iPad 的項目

- 舊 iPad 主畫面圖示 smoke：確認開站流程為「選人 → 首頁 → 點題庫」，且仍留在 standalone。
- 放正式 child 圖示時，從 1Password 取 family token 填入 `?k=`；不得寫進 repo、issue、log 或截圖。
- 注音錄音：有 iPad 且環境可錄音時，再用 `docs/zhuyin/recorder.html` 錄製 14 段音檔並跑對應 checklist。

**#11 已關閉，不再把 standalone 自動還原、URL/hash 長度校準或 7 天觀察列為待辦。**

## 下個 session 起手式

```bash
git switch master
git pull --ff-only origin master
git status -sb
```

接著讀：

1. `CLAUDE.md` 開頭的平台狀態。
2. `docs-dev/platform-ipad-spike-checklist.md`。
3. GitHub issue #35 最新留言與狀態。

若當天仍沒有 iPad／無法錄音，不要把 #35 或 #34 當成可由桌面驗收的工作；平台鏈應維持暫停，改由使用者指定另一個不依賴真機的 backlog。

## 常用驗證

```bash
uv run pytest
node --test "tests/*.mjs"
```

注意：localhost 呼叫 Worker 會因 `ALLOWED_ORIGINS` 而 CORS 失敗，屬預期行為。同步 live 驗收需從允許的正式 origin 執行。

---

本檔是一次性交接；下個 session 讀完並把資訊吸收到當次工作脈絡後刪除。
