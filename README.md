# Aiden Study 全家學習平台

給家中兩個小孩使用的靜態學習平台。根目錄是 registry 驅動的 hub，站內 app 共用 child 身分、Cloudflare Worker 進度同步與獎勵素材；題庫資料處理 pipeline 仍保留在同一個 monorepo。

線上入口：<https://huansbox.github.io/aiden-study/>

目前學習內容主軸是把已核歷屆題小批加入 iPad 題庫。[#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) 已完成共用程式、首批六題 private pack 與 desktop 整合驗證，保留舊三下題目與進度；真 iPad／家長驗收仍待完成。執行狀態見 [`wiki/Plan.md`](wiki/Plan.md)，詳細整合方案見 [`docs-dev/grade4-u1-study-integration-plan.md`](docs-dev/grade4-u1-study-integration-plan.md)。

## 現況

| App | 路徑 | 對象 | 進度 |
| --- | --- | --- | --- |
| 題庫練習 | `docs/study/` | 哥哥 | LocalStorage + Worker 同步 |
| 長除法練習 | `docs/math/` | 哥哥 | LocalStorage + Worker 同步 |
| 英文拼字 | `docs/spelling/` | 哥哥 | LocalStorage + Worker 同步 |
| 數織解謎 | `docs/math/nonogram/` | 哥哥 | 僅 LocalStorage |
| 注音練習 | `docs/zhuyin/` | 弟弟 | 程式已上線並接同步；14 段正式錄音與 iPad #20 驗收待完成 |

`docs/registry.json` 是 hub 的 app 清單真相源；app 上下架、對象與排序都從這裡調整。同步中的四個 app 共用 `docs/shared/sync-v1.js` 與 `docs/shared/wiring-v1.js`，後端位於 `worker/`。

自訂網域 `kids.linshuhuan.com` 的搬遷是 issue #34，必須先完成 issue #35 的 iPad 單容器真機 spike。測試頁與未勾選的真機步驟見 [`docs-dev/platform-ipad-spike-checklist.md`](docs-dev/platform-ipad-spike-checklist.md)。這項 gate 限制換網域、換圖示與清理舊站，不阻擋現行網址新增題庫內容。

## 專案結構

```text
docs/                 GitHub Pages 部署根目錄
  index.html          選人、child 首頁與家長視圖 hub
  registry.json       hub app registry
  study/              1,924 題公開題庫 app；私用題包由家長本機匯入
  math/               長除法與 nonogram
  spelling/           英文拼字 app
  zhuyin/             注音 app 與錄音工具
  shared/             同步、接線與獎勵共用資源
worker/               Cloudflare Worker 同步 API
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

localhost 不在 Worker 的 CORS 白名單，所以 app 的同步請求在本機失敗是預期行為；同步端到端驗證要使用 live GitHub Pages origin 與拋棄式測試 child。

## 題庫 pipeline

題庫 app 的 public static data 目前共 1,924 題：自然 1,099、數學 307、社會 452、國語 66。四上數學 U1 首批六題不加入 public data，而是從 ignored 路徑 `data/private/study/g4-s1-math-u1/` 建置並由家長匯入；重建與驗證方式見 [`docs-dev/grade4-u1-private-pack-build.md`](docs-dev/grade4-u1-private-pack-build.md)。詳細公開題庫來源、人工策展規則與踩坑記錄見 [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)。

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
