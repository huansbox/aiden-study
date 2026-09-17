# Aiden Study 全家學習平台

給家中兩個小孩使用的靜態學習平台。根目錄是 registry 驅動的 hub，站內 app 共用 child 身分、Cloudflare Worker 進度同步與獎勵素材；題庫資料處理 pipeline 仍保留在同一個 monorepo。

線上入口：<https://kids.linshuhuan.com/>（[煦誠學習](https://kids.linshuhuan.com/?child=aiden)／[秉樸學習](https://kids.linshuhuan.com/?child=bingpu)／[家長後台](https://kids.linshuhuan.com/parent/)）

## 作品總覽

從這裡找 App、一次性任務與主線外作品。這是一份查找入口：App 登記與上下架以 [registry](docs/registry.json) 為準；任務狀態、日期與歸檔規則以 [任務索引](learning-tasks/README.md) 為準；製作中的最新進度回查該工作的 issue／PR，不從本頁推定。

### App

包含 registry 中的站內與外部 App，不只列孩子目前看得見的活動。以下是作品／來源入口，不表示每個 App 都已啟用；孩子實際可見內容由家長設定決定。

| App | 來源或外部入口 | 進度保存方式 |
| --- | --- | --- |
| 題庫練習 | [docs/study/](docs/study/) | LocalStorage + Worker 同步 |
| 長除法練習 | [docs/math/](docs/math/) | LocalStorage + Worker 同步 |
| 英文拼字 | [docs/spelling/](docs/spelling/) | LocalStorage + Worker 同步 |
| Native Camp Review | [docs/nativecamp/](docs/nativecamp/) | 自主題、口說與跨日複習；LocalStorage + Worker 同步 |
| 數織解謎 | [docs/math/nonogram/](docs/math/nonogram/) | 原有過關進度僅 LocalStorage；新累計另行同步 |
| 注音練習 | [docs/zhuyin/](docs/zhuyin/)；[現況與交接](docs-dev/zhuyin-handoff.md) | LocalStorage + Worker 同步 |
| 動物守護者 | [animal-fight](https://huansbox.github.io/animal-fight/) | 外部 App，未接平台同步 |
| 英文閱讀 | [aiden-english](https://huansbox.github.io/aiden-english/) | 外部 App，未接平台同步 |
| 隕石數學防衛隊 | [99-meteor](https://huansbox.github.io/99-meteor/) | 外部 App，未接平台同步 |

### 學習任務與共用經驗

每份作品在下表只列一次；有網頁版本仍可屬於一次性任務。詳細狀態、活動日期與對象只在 [任務索引](learning-tasks/README.md#任務索引) 維護，成品與再製方式見各任務 README。

| 任務 | 找得到什麼 |
| --- | --- |
| [Native Camp 回放複習試作](learning-tasks/nativecamp-review-pilot/) | 單堂分析、紙本練習與 Review App 的可重建來源；[互動版使用與驗收](docs-dev/nativecamp-review.md)；[下堂製作SOP／模板](learning-tasks/nativecamp-review-pilot/lesson-sop.md) |
| [新竹動物園小小探險](learning-tasks/hsinchu-zoo-adventure/) | 十張動物園／火車探險卡、可列印 PDF、設計經驗 |
| [閱讀心智圖選詞引導](learning-tasks/reading-mind-map/) | 〈初夏雜記〉互動頁、老師回饋、舊來源位置說明 |
| [悠閒午後閱讀心智圖](learning-tasks/leisure-afternoon/) | 新篇互動頁、可編輯來源、產生部署檔的方法 |
| [四上第一次段考數學候選卷](learning-tasks/grade4-sem1-math-exam1/) | 原卷來源、範圍核對與來源映射；原卷僅本機保存 |
| [四上數學第一份短練習](learning-tasks/grade4-math-first-practice/) | 孩子卷／家長卷的再製方式；私用 PDF 僅本機保存 |

可跨任務沿用的內容從 [shared 索引](learning-tasks/shared/README.md) 找；例如 [兒童閱讀心智圖](learning-tasks/shared/reading-mind-maps.md)。這些是經驗或資源，不另外計為一份學習作品。

### 主線外作品入口

下列作品的來源仍有獨立工作分支，不能只搜尋目前 checkout 判定是否存在。最新工作狀態以連結中的 PR／分支為準；合併後將來源入口改成本 repo 的相對連結，不另複製一份作品。查核基準為 2026-09-17，後續整合狀態須回查 Git。

| 作品 | 來源與追蹤 | 已有成果入口 |
| --- | --- | --- |
| 怎麼和 AI 一起做出探險卡 | [協作故事任務來源](https://github.com/huansbox/aiden-study/tree/codex/ai-collaboration-showcase/learning-tasks/ai-collaboration-showcase) | [Cloudflare Pages 故事網站](https://ai-zoo-cards-story.pages.dev/)；網站已發布不代表來源已合併 |

App 已上線與「這次新增題目已完成」是不同狀態。跨裝置同時開發時，先查遠端與對應工作紀錄；無法取得另一台電腦未提交的內容時明示未知，不以本機舊版本推定，也不自行搬動或合併其工作。

目前家長後台提供家庭設定與練習管理，尚未呈現這份跨 App／任務的完整總覽。這是展示入口缺口，不代表動物園等任務未歸檔；第一階段整理範圍與查核見 [#71](https://github.com/huansbox/aiden-study/issues/71)。

## 平台現況

`docs/registry.json` 定義平台可用 App。獨立 `/parent/` 家長後台已於 2026-09-15 正式發布，實際顯示對象、排序、題庫學期、頭像與練習安排可從後台調整。新版孩子首頁、累計與永久積木徽章已上線，預設 LEGO 頭像，指定的扁平版保留供替換；規則與驗證見 [UI/UX 改版說明](docs-dev/family-uiux-v2.md)。既有進度同步仍共用 `docs/shared/sync-v1.js` 與 `docs/shared/wiring-v1.js`，新增家庭設定／累計使用 `family-*`，後端都位於 `worker/`。

2026-09-16「家長首次連接、記住入口」已正式發布。此版將家庭金鑰換成 HttpOnly Cookie、保留帶金鑰舊圖示的自動轉移，並新增首頁前景更新及失敗提示。`kids.linshuhuan.com` 已啟用 Cloudflare proxy，僅 `/api/*` 交由 Worker，其餘頁面仍由 GitHub Pages 提供；步驟與驗證見 [入口連線說明](docs-dev/device-connection.md)。

五個 app 已提供回孩子首頁的連結，兩個首頁的頁面名稱分別為「煦誠學習」「秉樸學習」，沿用原本的 child 網址。自訂網域 `kids.linshuhuan.com` 已啟用 HTTPS，舊 GitHub Pages 網址會自動轉向。#35 主畫面跨頁與 Safari 儲存隔離已驗收結案；#34 網站端檢查完成，家長已確認兩個 iPad 主畫面圖示安裝，依本輪範圍結案。注音 14 段正式親錄已補齊並獲家長接受，沿用已免除逐項 iPad checklist 的決定；見 [收尾紀錄](docs-dev/zhuyin-mvp-ipad-checklist.md)。2026-09-15 家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；詳見 [正式網域上線紀錄](docs-dev/platform-domain-rollout.md)。

## 專案結構

```text
docs/                 GitHub Pages 部署根目錄
  index.html          child 首頁；未指定孩子時選擇入口
  parent/             家長設定、練習安排與維護入口
  registry.json       hub app registry
  study/              1,924 題公開題庫 app；家庭權限自動讀取私用題包，手動匯入保留為備援
  math/               長除法與 nonogram
  spelling/           英文拼字 app
  nativecamp/          全英文課後複習；首次表現、口說與跨日確認
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

測試數量會隨功能與資料更新；執行工作時以當次命令的實際輸出為準，不把舊快照數字當成目前結果。注音正式親錄已齊備；缺少 `.m4a` 現在會使測試失敗，避免發布後再出現缺音。

## 本機啟動

```bash
uv run python -m http.server 8765 -d docs
```

- Hub：<http://localhost:8765/>
- 題庫：<http://localhost:8765/study/?child=aiden>
- iPad spike：<http://localhost:8765/platform-ipad-spike.html?child=test-spike&k=test-spike-token>

localhost 不在正式 Worker 的 CORS 白名單，一般靜態伺服器上的同步失敗是預期行為。完整本機驗證可用 `node tests/helpers/serve-family.mjs`，開啟輸出的 `/test/start`；該工具使用隔離 test-token、記憶體 KV 與合成題目，不動正式資料。`/test/controls` 可暫停／恢復隔離雲端。

## 題庫 pipeline

紙本練習只在孩子實際需要時製作，沿用 [四上第一份短練習](learning-tasks/grade4-math-first-practice/) 的來源與再製方式，不按章自動產生 PDF。

目前學習內容主軸是把已核歷屆題小批加入 iPad 題庫。[#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) 已完成最初六題 private pack、家庭權限自動讀取、獨立 review 與正式發布；[#59](https://github.com/huansbox/aiden-study/issues/59) 再把正式題包擴為 U1～U5 共十四題 rev2 並已結案。[#60](https://github.com/huansbox/aiden-study/issues/60) 已沿用相同 runtime，完成 fresh review、正式發布與 private archive，把題包擴為三十題 rev3，U1～U5 分布為 9／6／2／7／6；正常流程不要求家長傳檔。2026-09-14 的 iPad 操作確認只涵蓋先前 #55 六題流程，不代表三十題已完成真機實測；下一步依已採納的 U3 `angle-v1` 能力路線另批處理，其餘未轉入題目與章節仍待做。程式保護三下題目與現存進度；已放棄的三下歷史紀錄不再追回。詳見 [家庭端驗收紀錄](docs-dev/grade4-u1-ipad-acceptance.md)、[擴題路線圖](docs-dev/grade4-math-expansion-plan.md)、[執行狀態](wiki/Plan.md) 與 [整合方案](docs-dev/grade4-u1-study-integration-plan.md)。

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
