# Aiden Study 全家學習平台

給家中兩個小孩使用的靜態學習平台。根目錄是 registry 驅動的 hub，站內 app 共用 child 身分、Cloudflare Worker 進度同步與獎勵素材；題庫資料處理 pipeline 仍保留在同一個 monorepo。

線上入口：<https://huansbox.github.io/aiden-study/>

## 現況

| App | 路徑 | 對象 | 進度 |
| --- | --- | --- | --- |
| 題庫練習 | `docs/study/` | 哥哥 | LocalStorage + Worker 同步 |
| 長除法練習 | `docs/math/` | 哥哥 | LocalStorage + Worker 同步 |
| 英文拼字 | `docs/spelling/` | 哥哥 | LocalStorage + Worker 同步 |
| 數織解謎 | `docs/math/nonogram/` | 哥哥 | 僅 LocalStorage |
| 注音練習 | `docs/zhuyin/` | 弟弟 | 程式已上線並接同步；14 段正式錄音與 iPad #20 驗收待完成 |

`docs/registry.json` 是 hub 的 app 清單真相源；app 上下架、對象與排序都從這裡調整。同步中的四個 app 共用 `docs/shared/sync-v1.js` 與 `docs/shared/wiring-v1.js`，後端位於 `worker/`。

自訂網域 `kids.linshuhuan.com` 的搬遷是 issue #34，必須先完成 issue #35 的 iPad 單容器真機 spike。測試頁與未勾選的真機步驟見 [`docs-dev/platform-ipad-spike-checklist.md`](docs-dev/platform-ipad-spike-checklist.md)。

## 專案結構

```text
docs/                 GitHub Pages 部署根目錄
  index.html          選人、child 首頁與家長視圖 hub
  registry.json       hub app registry
  study/              1924 題題庫 app
  math/               長除法與 nonogram
  spelling/           英文拼字 app
  zhuyin/             注音 app 與錄音工具
  shared/             同步、接線與獎勵共用資源
worker/               Cloudflare Worker 同步 API
scripts/              Python 題庫萃取、分類與建置 pipeline
data/                 題庫中間資料與人工策展資料
tests/                pytest 與 Node.js test runner 測試
docs-dev/             ADR、設計稿與人工驗收文件
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

目前預期結果是 pytest 140 passed、1 skipped；Node.js 231 passed。注音測試會列出 14 個缺少的 `.m4a`，在正式錄音完成前是預期警告，不會讓測試失敗。

## 本機啟動

```bash
uv run python -m http.server 8765 -d docs
```

- Hub：<http://localhost:8765/>
- 題庫：<http://localhost:8765/study/?child=aiden>
- iPad spike：<http://localhost:8765/platform-ipad-spike.html?child=test-spike&k=test-spike-token>

localhost 不在 Worker 的 CORS 白名單，所以 app 的同步請求在本機失敗是預期行為；同步端到端驗證要使用 live GitHub Pages origin 與拋棄式測試 child。

## 題庫 pipeline

題庫 app 目前共 1924 題：自然 1099、數學 307、社會 452、國語 66。詳細來源、人工策展規則與踩坑記錄見 [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)。

```bash
# PDF 萃取範例
uv run python scripts/extract.py --input pdfs_期末 --output data/raw_questions_期末.json

# AI 分類；依資料切換 mid|final|math|social
uv run python scripts/classify.py --semester final

# 冪等合併成部署題庫 docs/study/questions.json
uv run python scripts/build_questions.py
```

## 維護入口

- [`CLAUDE.md`](CLAUDE.md)：專案架構、技術決策與當前待辦的 AI 記憶快照。
- [`CONTEXT.md`](CONTEXT.md)：平台詞彙與 registry 欄位語意。
- [`docs-dev/adr/`](docs-dev/adr/)：架構決策紀錄。
- [`wiki/Home.md`](wiki/Home.md)：給人的穩定維護說明。

family token 是 secret，只能放在 Cloudflare Worker secret、家長的密碼管理器與裝置網址，不得寫進 repo、issue、測試 fixture 或 log。
