# Aiden Study - 三下自然練習

國小三年級下學期自然科期中考題庫練習網站。從 27 份考卷 PDF 萃取題目，AI 分類後建成互動練習網站。

**線上使用**: https://huansbox.github.io/aiden-study/

## 功能

- **全部練習** — 挑戰整個單元，答錯的題目會再次出現，全部答對才算通關。支援中途離開接續。
- **快速練習** — 隨機 10 題，優先出錯誤率高和練習次數少的題目。
- **錯題練習** — 從累積的錯題庫出題，答對才能移除。

所有練習紀錄存在瀏覽器 localStorage，不需登入。

## 題庫來源

27 份 108-113 學年度國小三下期中自然考卷（北市/新北/台中），共 602 題：
- 第 1 單元：田園樂（324 題）
- 第 2 單元：溫度變化對物質的影響（278 題）

## 開發

### 環境

- Python 3.10+（需安裝 pdfplumber）
- Claude Code CLI（分類用）

### 資料處理 pipeline

```bash
# 1. PDF 萃取
python scripts/extract.py

# 2. AI 分類（需 claude -p）
python scripts/classify.py

# 3. 修正（視需要）
python scripts/fix_classified.py
```

### 本機測試

```bash
cd docs
python -m http.server 8765
# 開啟 http://localhost:8765
```
