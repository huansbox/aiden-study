# Aiden Study - 三下自然期中題庫練習網站

## 專案目標

從 `pdfs/` 底下 27 份國小三下期中自然考卷 PDF，萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。

## 目錄結構

```
pdfs/              27 份原始考卷 PDF（108-113 學年度，北市/新北/台中）
scripts/           Python 資料處理 pipeline
  extract.py       PDF → data/raw_questions.json
  classify.py      claude -p 批次分類 + 答案補充
  fix_classified.py 分類修正腳本
data/              中間資料
  raw_questions.json        萃取後的原始題目（660 題）
  classified_questions.json 分類後的完整題目（645 題）
docs/              GitHub Pages 部署目錄
  index.html       練習網站（單一 HTML，內嵌 CSS/JS）
  questions.json   最終題庫（602 題）
skipped_questions.md  跳過題目清單（供手動確認）
```

## 技術決策

- 資料處理：Python（pdfplumber 萃取、claude -p 批次分類）
- 網站：單一 `index.html`，零依賴，部署於 GitHub Pages
- 資料格式：JSON（scripts 產出 → 網站讀取）
- 儲存：localStorage v2（challenge queue + errorBank + stats）
- 編碼：所有 Python 腳本需設定 utf-8（Windows cp950 環境）

## 練習網站功能

### 三種模式
- **全部練習**：queue 制，答對移出/答錯移到隊尾，可接續，通關後可重置
- **快速練習**：智慧選 10 題（錯誤率高 + 練習次數少優先），不可接續
- **錯題練習**：答對從錯題庫移除，答錯留在庫中排到隊尾

### localStorage 結構（key: aiden_study_v2）
- `challenge`: 每單元的 queue 狀態（null=未開始, []=已通關, [ids]=進行中）
- `errorBank`: 錯題庫（去重，只在錯題模式答對時移除）
- `stats`: 每題統計（practiced/correct，所有模式共用）

## 分類規則

- **第 1 單元：田園樂** — 蔬菜種類/部位/生長因素/生長過程
- **第 2 單元：溫度變化對物質的影響** — 物質變化因素/水三態/其他物質受溫度改變
- 衝突規則：優先歸屬題目直接詢問的核心概念所屬單元

## 部署

- URL: https://huansbox.github.io/aiden-study/
- GitHub Pages source: master branch `/docs`
