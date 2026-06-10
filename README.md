# Aiden Study - 三下自然練習

國小三年級下學期自然科題庫練習網站（期中＋期末）。從考卷 PDF 萃取題目、AI 分類，建成零依賴的靜態互動練習網站。

**線上使用**: https://huansbox.github.io/aiden-study/

## 功能

- **期中／期末切換** — 期中＝第 1、2 單元；期末＝第 3、4 單元
- **全部練習** — 挑戰整個單元，答錯的題目會再次出現，全部答對才算通關。支援中途離開接續。
- **快速練習** — 智慧抽 10 題，優先出錯誤率高和練習次數少的題目。
- **依概念練習** — 期末單元下可選 subtopic（如「動物分類」「天氣預報」）單獨練，全部/快速皆可。
- **錯題練習** — 從累積的錯題庫出題，答對才能移除。
- **題目回報** — 答題後可標記「題目有問題」，該題立即退出題池與統計（可從首頁還原）；可一鍵開 GitHub issue 回報待修。

所有練習紀錄存在瀏覽器 localStorage，不需登入。

## 題庫

共 1101 題（期中 602＋期末 499），來源為 108–113 學年度多縣市國小三下自然（康軒）考卷：

- 第 1 單元：田園樂（324 題）
- 第 2 單元：溫度變化對物質的影響（278 題）
- 第 3 單元：動物（250 題）
- 第 4 單元：天氣（249 題）

期末僅收現行 108 課綱（110 下起）的考卷；無官方答案卷的題目由 AI 補答案並經盲審複查。

## 開發

### 環境

- Python（uv 管理，`uv sync` 安裝相依；核心套件 pdfplumber）
- Claude Code CLI（AI 分類用 `claude -p`）

### 資料處理 pipeline

```bash
# 1. PDF 萃取（--input 指定 PDF 檔或目錄）
uv run python scripts/extract.py --input pdfs_期末 --output data/raw_questions_期末.json

# 2. AI 分類（--semester mid|final 切換學期 taxonomy）
uv run python scripts/classify.py --semester final

# 3. 合併入最終題庫 docs/questions.json（冪等）
uv run python scripts/build_questions.py

# 測試
uv run pytest
```

### 本機測試

```bash
uv run python -m http.server 8765 -d docs
# 開啟 http://localhost:8765
```

維護與擴充前先讀 [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)（pipeline 細節、踩過的坑、重跑指令）；交接現況見 [`HANDOFF.md`](HANDOFF.md)。
