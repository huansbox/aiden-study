# Aiden Study - 三下題庫練習

國小三年級下學期題庫練習網站，目前包含自然、數學、社會、國語。從考卷 PDF 或人工整理資料建立零依賴的靜態互動練習網站。

**線上使用**: https://huansbox.github.io/aiden-study/

## 功能

- **科目切換** — 自然、數學、社會、國語。
- **期中／期末切換** — 目前自然有期中／期末，其餘科目以期末題庫為主。
- **全部練習** — 分批挑戰整個單元，答錯的題目會再次出現，全部答對才算通關。支援中途離開接續。
- **依概念練習** — 單元下可選 subtopic 單獨練習。
- **錯題練習** — 從累積的錯題庫出題，答對才能移除。
- **國語改錯字** — Step 1 先點出錯字，Step 2 用四選一選正確字。
- **題目回報** — 答題後可標記「題目有問題」，該題立即退出題池與統計（可從首頁還原）；可一鍵開 GitHub issue 回報待修。

所有練習紀錄存在瀏覽器 localStorage，不需登入。

## 題庫

共 1922 題：

- 自然：1099 題（unit 1-4）
- 數學：307 題（unit 5-9）
- 社會：452 題（unit 10-12）
- 國語：64 題（unit 13-14，改錯字）

自然、數學、社會多由考卷萃取與分類產生；國語目前由掃描考卷人工整理成 curated data。

## 開發

### 環境

- Python（uv 管理，`uv sync` 安裝相依；核心套件 pdfplumber）
- Claude Code CLI（AI 分類用 `claude -p`；只在重跑萃取/分類流程時需要）

### 資料處理 pipeline

```bash
# 1. PDF 萃取（--input 指定 PDF 檔或目錄）
uv run python scripts/extract.py --input pdfs_期末 --output data/raw_questions_期末.json

# 2. AI 分類（--semester mid|final|math|social 切換 taxonomy）
uv run python scripts/classify.py --semester final

# 3. 合併入最終題庫 docs/questions.json（冪等；包含國語 curated data）
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
