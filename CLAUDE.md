# Aiden Study - 三下自然題庫練習網站

## 專案目標

從 `pdfs/`（27 份期中）與 `pdfs_期末/`（tcool.cc 抓取）的國小三下自然考卷 PDF，萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。現況：期中＋期末共 1101 題已上線。

## 快速參考

- **▶ 進行中：數學期末題庫（feat/math 分支）**：設計稿＝[`docs-dev/exam-math-pipeline-design.md`](docs-dev/exam-math-pipeline-design.md)（scope 已逐大題對齊定案）；工作項＝`issues/008`～`015`（8 片 vertical slices，依賴順序見設計稿「實作順序」）。卷源 `pdfs_數學/`（桃子腳112下＋安和113下），清單 `data/tcool_grade3_math_kanghsuan.json`。
- **期末題庫擴充已完成（issues 001–007，7/7）**：現況真相源＝[`HANDOFF.md`](HANDOFF.md)；**維護/擴充前先讀經驗筆記** [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)（pipeline、踩過的坑、重跑指令）。[`issues/prd.md`](issues/prd.md)＋`issues/001`～`007` 為歷史決策紀錄（已封存，不再更新）。
- **考卷來源與取得流程**（期末擴充、tcool.cc 抓取、Cloudflare 繞過、課綱篩選界線）：[`docs-dev/exam-paper-sourcing.md`](docs-dev/exam-paper-sourcing.md)
  - 重點：三年級自然 **110下** 起才是現行 108 課綱，108下/109下 屬舊課綱需排除。
- **期末題庫 pipeline 與網站設計稿**（2026-06-09 grill-me 對齊）：[`docs-dev/exam-final-pipeline-design.md`](docs-dev/exam-final-pipeline-design.md)
  - 重點：期末＝第3單元動物／第4單元天氣；兩層 unit→subtopic（以桃子腳範圍為基準）、UI 可選 subtopic 練；答案卷＝格式A 可直接 extract，民權無答案卷由 AI 補。

## 目錄結構

```
pdfs/              27 份原始期中考卷 PDF（108-113 學年度，北市/新北/台中）
pdfs_期末/          期末考卷 PDF（tcool.cc 抓取，三下自然康軒，現行課綱 110下~113下）
pdfs_數學/          數學期末考卷 PDF（桃子腳112下＋安和113下，題目＋答案卷）
scripts/           Python 資料處理 pipeline
  extract.py       自然 PDF → raw（純函式 parse_questions_from_text + --input/--output）
  extract_math.py  數學答案卷 → raw（獨立模組：雙欄切分、括號答案、分數亂序偵測）
  reflow_math.py   分數亂序題 AI 重組（artifact 人工核對後 --apply 併回 raw）
  classify.py      claude -p 批次分類（可切換 taxonomy：--semester mid|final|math）
  data_helpers.py  去重/答案合併/驗證純函式（深模組B）
  build_questions.py classified → docs/questions.json 三來源合併（冪等、id 去碰撞、subject 欄位）
  fix_classified.py 期中分類修正腳本
data/              中間資料
  raw_questions.json        期中萃取（659 題）
  classified_questions.json 期中分類（645 題）
  raw_questions_期末.json    期末萃取（第一批）
  classified_questions_期末.json 期末分類（unit 3/4 + subtopic）
  *_期末_新增.json           第二批擴充（raw / classified / official_answers）
  raw_questions_數學.json    數學萃取（含 reflow 撈回題）
  classified_questions_數學.json 數學分類（unit 5–9 + subtopic）
  skipped_questions_數學.json / reflowed_questions_數學.json  分數亂序跳過清單／重組 artifact
  tcool_grade3_sci_kanghsuan.json / tcool_grade3_math_kanghsuan.json  考卷清單（tcool.cc 爬取）
docs/              GitHub Pages 部署目錄
  index.html       練習網站（單一 HTML，內嵌 CSS/JS，科目層 自然/數學）
  questions.json   最終題庫（自然 unit 1–4＋數學 unit 5–9，全題帶 subject）
tests/             pytest（parser / 數學 parser / data_helpers / classify config / build / 期中回歸）
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

自然期中（unit 1–2）／自然期末（unit 3–4）／數學期末（unit 5–9）為 `classify.py` 的三組可切換 config（`--semester mid|final|math`）。unit 全域唯一。

- **第 1 單元：田園樂** — 蔬菜種類/部位/生長因素/生長過程
- **第 2 單元：溫度變化對物質的影響** — 物質變化因素/水三態/其他物質受溫度改變
- **第 3 單元：動物** — 動物分類/身體構造/生存與適應/觀察方法
- **第 4 單元：天氣** — 風/氣溫測量/雨量降雨/天氣預報（以桃子腳國小範圍為基準）
- **第 5 單元：小數** — 小數的認識/小數比大小/小數加減
- **第 6 單元：圓** — 圓的構造/圓規與畫圓/圓的大小比較
- **第 7 單元：乘法與除法** — 乘除互逆/乘除計算/乘除應用
- **第 8 單元：時間** — 時刻與時間單位/時制互換/時間計算
- **第 9 單元：統計表** — 報讀表格（單一子主題，UI 不另列概念入口）
- 數學單元名稱依均一「類康軒版」＋搜尋交叉查證（與兩卷卷面吻合；非課本目錄原件，家長可抽查課本）
- 衝突規則：優先歸屬題目直接詢問的核心概念所屬單元；範圍外標 `none` 排除

## 部署

- URL: https://huansbox.github.io/aiden-study/
- GitHub Pages source: master branch `/docs`
