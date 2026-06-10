# Aiden Study - 三下自然期中題庫練習網站

## 專案目標

從 `pdfs/` 底下 27 份國小三下期中自然考卷 PDF，萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。

## 快速參考

- **▶ 期末題庫擴充已完成（issues 001–007，7/7）**：交接看 [`HANDOFF.md`](HANDOFF.md)；**維護/擴充前先讀經驗筆記** [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)（pipeline、踩過的坑、重跑指令）。真相源＝[`issues/prd.md`](issues/prd.md)＋ `issues/001`～`007`。
- **考卷來源與取得流程**（期末擴充、tcool.cc 抓取、Cloudflare 繞過、課綱篩選界線）：[`docs-dev/exam-paper-sourcing.md`](docs-dev/exam-paper-sourcing.md)
  - 重點：三年級自然 **110下** 起才是現行 108 課綱，108下/109下 屬舊課綱需排除。
- **期末題庫 pipeline 與網站設計稿**（2026-06-09 grill-me 對齊）：[`docs-dev/exam-final-pipeline-design.md`](docs-dev/exam-final-pipeline-design.md)
  - 重點：期末＝第3單元動物／第4單元天氣；兩層 unit→subtopic（以桃子腳範圍為基準）、UI 可選 subtopic 練；答案卷＝格式A 可直接 extract，民權無答案卷由 AI 補。

## 目錄結構

```
pdfs/              27 份原始期中考卷 PDF（108-113 學年度，北市/新北/台中）
pdfs_期末/          期末考卷 PDF（tcool.cc 抓取，三下自然康軒，現行課綱 110下~113下）
scripts/           Python 資料處理 pipeline
  extract.py       PDF → raw（純函式 parse_questions_from_text + --input/--output）
  classify.py      claude -p 批次分類（可切換學期 taxonomy：--semester mid|final）
  data_helpers.py  去重/答案合併/驗證純函式（深模組B）
  build_questions.py classified → docs/questions.json 合併（冪等、id 去碰撞）
  fix_classified.py 期中分類修正腳本
data/              中間資料
  raw_questions.json        期中萃取（659 題）
  classified_questions.json 期中分類（645 題）
  raw_questions_期末.json    期末萃取（安和×4＝118 題）
  classified_questions_期末.json 期末分類（unit 3/4 + subtopic）
  tcool_grade3_sci_kanghsuan.json  期末考卷清單（tcool.cc 爬取，26 筆）
docs/              GitHub Pages 部署目錄
  index.html       練習網站（單一 HTML，內嵌 CSS/JS）
  questions.json   最終題庫（期中＋期末合併，unit 1–4）
tests/             pytest（parser / data_helpers / classify config / 期中回歸）
docs-dev/          內部開發文件（不部署）→ 見「快速參考」
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

### 題目回報（flag）
- 答題 feedback 畫面（答對/答錯皆有）低調按鈕「題目有問題」→ inline 確認後 flag
- flag 效果：清除該題全部 stats、移出 errorBank 與 mastered（先前答對視為可能猜對）、從本輪 queue 抽掉；三種模式題池與通關分母（`questionIdsFor`）全部排除
- 首頁底部「已回報題目（N）」（N=0 隱藏）：單題還原/全部還原；「回報到 GitHub」開 prefill issue URL（零後端，pad 瀏覽器需登入 GitHub；URL 過長自動降格為精簡格式）

### localStorage 結構（key: aiden_study_v2）
- `challenge`: 每單元的 queue 狀態（null=未開始, []=已通關, [ids]=進行中）
- `errorBank`: 錯題庫（去重，只在錯題模式答對時移除）
- `stats`: 每題統計（practiced/correct，所有模式共用）
- `flagged`: 已回報題目（`[{questionId, unit, flaggedAt}]`，排除於所有題池與分母，可還原）

## 分類規則

期中（unit 1–2）／期末（unit 3–4）為 `classify.py` 的兩組可切換 config（`--semester`）。

- **第 1 單元：田園樂** — 蔬菜種類/部位/生長因素/生長過程
- **第 2 單元：溫度變化對物質的影響** — 物質變化因素/水三態/其他物質受溫度改變
- **第 3 單元：動物** — 動物分類/身體構造/生存與適應/觀察方法
- **第 4 單元：天氣** — 風/氣溫測量/雨量降雨/天氣預報（以桃子腳國小範圍為基準）
- 衝突規則：優先歸屬題目直接詢問的核心概念所屬單元；範圍外標 `none` 排除

## 部署

- URL: https://huansbox.github.io/aiden-study/
- GitHub Pages source: master branch `/docs`
