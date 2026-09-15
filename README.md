# Aiden Study 全家學習平台

給家中兩個小孩使用的靜態學習平台。根目錄是 registry 驅動的 hub，站內 app 共用 child 身分、Cloudflare Worker 進度同步與獎勵素材；題庫資料處理 pipeline 仍保留在同一個 monorepo。

線上入口：<https://kids.linshuhuan.com/>（[哥哥學習](https://kids.linshuhuan.com/?child=aiden)／[弟弟學習](https://kids.linshuhuan.com/?child=bingpu)）

目前學習內容主軸是把已核歷屆題小批加入 iPad 題庫。[#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) 已完成最初六題 private pack、家庭權限自動讀取、獨立 review 與正式發布；[#59](https://github.com/huansbox/aiden-study/issues/59) 再把正式題包擴為 U1～U5 共十四題 rev2 並已結案。[#60](https://github.com/huansbox/aiden-study/issues/60) 已沿用相同 runtime，完成 fresh review、正式發布與 private archive，把題包擴為三十題 rev3，U1～U5 分布為 9／6／2／7／6；正常流程不要求家長傳檔。2026-09-14 的 iPad 操作確認只涵蓋先前 #55 六題流程，不代表三十題已完成真機實測；下一步依已採納的 U3 `angle-v1` 能力路線另批處理，其餘未轉入題目與章節仍待做。程式保護三下題目與現存進度；已放棄的三下歷史紀錄不再追回。詳見 [家庭端驗收紀錄](docs-dev/grade4-u1-ipad-acceptance.md)、[擴題路線圖](docs-dev/grade4-math-expansion-plan.md)、[執行狀態](wiki/Plan.md) 與 [整合方案](docs-dev/grade4-u1-study-integration-plan.md)。

## 現況

| App | 路徑 | 對象 | 進度 |
| --- | --- | --- | --- |
| 題庫練習 | `docs/study/` | 哥哥 | LocalStorage + Worker 同步 |
| 長除法練習 | `docs/math/` | 哥哥 | LocalStorage + Worker 同步 |
| 英文拼字 | `docs/spelling/` | 哥哥 | LocalStorage + Worker 同步 |
| 數織解謎 | `docs/math/nonogram/` | 哥哥 | 僅 LocalStorage |
| 注音練習 | `docs/zhuyin/` | 弟弟 | 程式已上線並接同步；14 段正式錄音與 iPad #20 驗收待完成 |

`docs/registry.json` 定義平台可用 App。本分支新增獨立 `/parent/` 家長後台，實際顯示對象、排序、題庫學期、頭像與練習安排可從後台調整。孩子首頁、累計與永久積木徽章已完成本地版本，尚未正式發布；規則與驗證見 [UI/UX 改版說明](docs-dev/family-uiux-v2.md)。既有進度同步仍共用 `docs/shared/sync-v1.js` 與 `docs/shared/wiring-v1.js`，新增家庭設定／累計使用 `family-*`，後端都位於 `worker/`。

五個 app 已提供回哥哥／弟弟首頁的連結，兩個首頁的頁面名稱分別為「哥哥學習」「弟弟學習」。自訂網域 `kids.linshuhuan.com` 已啟用 HTTPS，舊 GitHub Pages 網址會自動轉向。#35 主畫面跨頁與 Safari 儲存隔離已驗收結案；#34 網站端檢查完成，家長已確認兩個 iPad 主畫面圖示安裝，依本輪範圍結案。注音內容仍待 #20 錄音。2026-09-15 家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；詳見 [正式網域上線紀錄](docs-dev/platform-domain-rollout.md)。

## 專案結構

```text
docs/                 GitHub Pages 部署根目錄
  index.html          child 首頁；未指定孩子時選擇入口
  parent/             家長設定、練習安排與維護入口
  registry.json       hub app registry
  study/              1,924 題公開題庫 app；家庭權限自動讀取私用題包，手動匯入保留為備援
  math/               長除法與 nonogram
  spelling/           英文拼字 app
  zhuyin/             注音 app 與錄音工具
  shared/             同步、接線與獎勵共用資源
worker/               Cloudflare Worker 同步 API 與固定家庭唯讀題包端點
scripts/              Python 題庫萃取、分類與建置 pipeline
data/                 題庫中間資料與人工策展資料
tests/                pytest 與 Node.js test runner 測試
docs-dev/             ADR、設計稿與人工驗收文件
learning-tasks/       一次性家庭學習任務、可重建成品與重用經驗
wiki/                 GitHub Wiki 的版本控制真相源
```

### 家庭學習任務與素材

紙本練習、場館、旅行與其他一次性學習活動的索引、歸檔規則及共用素材入口見 [`learning-tasks/README.md`](learning-tasks/README.md)。其中四上 U1 第一份紙本短練習已完成，但只在實際需要時製作後續紙本，不按章自動產生 PDF。

## 開發環境

- Python 3.13，由 [uv](https://docs.astral.sh/uv/) 管理。
- Node.js 24 以上，用內建的 test runner；目前沒有 npm 相依。
- `claude` CLI 只在重跑 AI 分類 pipeline 時需要，一般開發與測試不需要。

```bash
uv sync --locked
```

## 測試

本機與 GitHub Actions 使用同一組兩道 gate：

```bash
uv run pytest
node --test "tests/*.mjs"
```

測試數量會隨功能與資料更新；執行工作時以當次命令的實際輸出為準，不把舊快照數字當成目前結果。注音正式錄音完成前，相關 audit 仍可能列出缺少的 `.m4a`。

## 本機啟動

```bash
uv run python -m http.server 8765 -d docs
```

- Hub：<http://localhost:8765/>
- 題庫：<http://localhost:8765/study/?child=aiden>
- iPad spike：<http://localhost:8765/platform-ipad-spike.html?child=test-spike&k=test-spike-token>

localhost 不在正式 Worker 的 CORS 白名單，一般靜態伺服器上的同步失敗是預期行為。完整本機驗證可用 `node tests/helpers/serve-family.mjs`，開啟輸出的 `/test/start`；該工具使用隔離 test-token、記憶體 KV 與合成題目，不動正式資料。`/test/controls` 可暫停／恢復隔離雲端。

## 題庫 pipeline

題庫 app 的 public static data 目前共 1,924 題：自然 1,099、數學 307、社會 452、國語 66。四上數學 U1～U5 三十題 rev3 不加入 public data；ignored 路徑 `data/private/study/g4-s1-math-u1/` 保存可重建 source／QA，已驗證的正式 pack 則部署在獨立 Cloudflare KV，由 Study 以 family token 自動唯讀取得。內容不進 progress KV 或同步 payload，既有本機手動匯入保留為備援。重建與驗證方式見 [`docs-dev/grade4-u1-private-pack-build.md`](docs-dev/grade4-u1-private-pack-build.md)，後續擴題狀態見 [`docs-dev/grade4-math-expansion-plan.md`](docs-dev/grade4-math-expansion-plan.md)。詳細公開題庫來源、人工策展規則與踩坑記錄見 [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)。

```bash
# PDF 萃取範例
uv run python scripts/extract.py --input pdfs_期末 --output data/raw_questions_期末.json

# AI 分類；依資料切換 mid|final|math|social
uv run python scripts/classify.py --semester final

# 冪等合併成部署題庫 docs/study/questions.json
uv run python scripts/build_questions.py
```

## 維護入口

- [`CLAUDE.md`](CLAUDE.md)：專案架構背景與歷史技術快照；當前狀態仍回查 code、Git 歷史與 issues。
- [`AGENTS.md`](AGENTS.md)：Codex 的 repo 導覽與家庭學習任務路由規則。
- [`CONTEXT.md`](CONTEXT.md)：平台詞彙與 registry 欄位語意；不存工作計畫。
- [`learning-tasks/README.md`](learning-tasks/README.md)：家庭學習任務索引、分類邊界與歸檔規格。
- [`docs-dev/adr/`](docs-dev/adr/)：架構決策紀錄。
- [`wiki/Home.md`](wiki/Home.md)：給人的穩定導覽；長期方向見 [`wiki/Roadmap.md`](wiki/Roadmap.md)，執行順序見 [`wiki/Plan.md`](wiki/Plan.md)，當前交接見 [`HANDOFF.md`](HANDOFF.md)。現況仍以 code、Git 歷史與 GitHub issues 為準。

family token 是 secret，只能放在 Cloudflare Worker secret、家長的密碼管理器與裝置網址，不得寫進 repo、issue、測試 fixture 或 log。
