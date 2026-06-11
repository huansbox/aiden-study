# Aiden Study - 三下題庫練習網站（自然＋數學）

## 專案目標

從考卷 PDF（`pdfs/` 期中自然、`pdfs_期末/` 期末自然、`pdfs_數學/` 期末數學）萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。現況：題庫 1245 題（自然 1099＝期中 601＋期末 498；數學 146）。自然期末 498 題＋數學全部 146 題附作答後說明（`explanations.json` 644 題）。

## 快速參考

- **▶ 待辦（家長閘門）**：數學說明擴充批 86 題驗收後 merge（branch `feat/math-explanations-2`；全錄已另送家長＋`docs-dev/review_數學說明_抽查.md` 含全 146 題）。
- **▶ 待辦（後續工作）**：①期中自然（unit 1/2）作答後說明（考後再議）②隱藏題救回 3 題（考後再議）③數學其餘 9 份無答案卷＝AI 補答案＋複審新流程（另議）。
- **數學說明擴充批 86 題已完成（2026-06-11，feat/math-explanations-2）**：沿用 batch_math 流程（9 寫手 sonnet→9 獨立審核→主迴圈裁決），72 pass／14 審核改寫（多為直式借位位值寫錯、超齡解法、列式結構誤導），0 答案疑點；批次檔＝`batch_math_06..14.json`，`explanations.json` 644 題、tests 109 passed。
- **期末複驗 5 題分歧已定奪（2026-06-11，家長逐題確認）**：改 3 題（大墩113選6 ④→①、大墩112選9 ②→④、東光113是非7 ○→✕）、維持 2 題；百葉箱題推翻原查證（家長翻課本實證「可測最高最低溫」為課本明文）。定奪全錄＝`docs-dev/review_期末_複驗_分歧.md`；三題作答後說明同步改寫（exp_results＋explanations.json）。
- **數學說明首批已 merge 上線（2026-06-11）**：60 題作答後說明（寫手→獨立審核→裁決，10 題審核改寫），`explanations.json` 558 題；抽查全錄＝`docs-dev/review_數學說明_抽查.md`。
- **數學擴充批次已 merge 上線（2026-06-11）**：桃子腳110＋安和111＋彰化中正111＋彰化田中111 四卷（tcool 有答案卷的全收齊），數學 60→146（+72 文字題＋14 看表題）。四卷版面與格式A 不合，走**人工策展＋官方答案＋PNG 逐題核對**（非 extract_math），剔除紀錄＝`skipped_questions.md`「數學擴充批次」節。110/111 卷的純長度題（公分/毫米）不在現行 taxonomy → none 排除；小數×長度混合題保留。
- **期末 AI 補答案第二輪複驗完成（2026-06-11，master）**：266 題盲審重答、98.1% 一致；5 分歧已查證寫成 `docs-dev/review_期末_複驗_分歧.md`（維持 3／建議改 2：大墩113雲題④→①、東光113 166/167題○→✕）。
- **數學補完批次已 merge 上線（2026-06-11）**：安和表格 5 題＋應用3 救回＋填充 chip／條列換行／表格圖全寬。
- **自然滲漏清理已上線（2026-06-11）**：44 題處置（修 42／移除 1／圖片排除 1／官方答案錯誤覆寫 1），紀錄＝`skipped_questions.md`「自然選擇題萃取滲漏清理」節。
- **期末作答後說明已上線（自然 unit 3/4，499 題）**：資料＝`docs/explanations.json`（id → 說明，前端 join）；批次結果＝`data/exp_results/`，重建跑 `uv run python scripts/build_explanations.py`；PRD＝`issues/prd-期末說明.md`；抽查全錄＝`docs-dev/review_期末說明_抽查.md`。期中題（unit 1/2）尚無說明。
- **數學期末題庫已完成上線（issues 008–015，8/8）**：設計稿＝[`docs-dev/exam-math-pipeline-design.md`](docs-dev/exam-math-pipeline-design.md)；各 issue 檔含驗收與完成紀錄。
  - 數學題型：選擇 13／填充 35（number/comparison/code/text 四種輸入）／直式逐格 6（小數加減＋長除法，移植 aiden-math）；看表題截圖嵌入（`docs/assets/math/`）。
  - 數學 pipeline：`extract_math.py`（萃取＋分數亂序偵測）→`reflow_math.py`（AI 重組＋PNG 人工核對閘門）→`classify.py --semester math`→curated（看表題人工檔）→`build_questions.py`。
- **期末題庫擴充已完成（issues 001–007，7/7）**：現況真相源＝[`HANDOFF.md`](HANDOFF.md)；**維護/擴充前先讀經驗筆記** [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)（pipeline、踩過的坑、重跑指令）。[`issues/prd.md`](issues/prd.md)＋`issues/001`～`007` 為歷史決策紀錄（已封存，不再更新）。
- **考卷來源與取得流程**（期末擴充、tcool.cc 抓取、Cloudflare 繞過、課綱篩選界線）：[`docs-dev/exam-paper-sourcing.md`](docs-dev/exam-paper-sourcing.md)
  - 重點：三年級自然 **110下** 起才是現行 108 課綱，108下/109下 屬舊課綱需排除。
- **期末題庫 pipeline 與網站設計稿**（2026-06-09 grill-me 對齊）：[`docs-dev/exam-final-pipeline-design.md`](docs-dev/exam-final-pipeline-design.md)
  - 重點：期末＝第3單元動物／第4單元天氣；兩層 unit→subtopic（以桃子腳範圍為基準）、UI 可選 subtopic 練；答案卷＝格式A 可直接 extract，民權無答案卷由 AI 補。

## 目錄結構

```
pdfs/              27 份原始期中考卷 PDF（108-113 學年度，北市/新北/台中）
pdfs_期末/          期末考卷 PDF（tcool.cc 抓取，三下自然康軒，現行課綱 110下~113下）
pdfs_數學/          數學期末考卷 PDF（桃子腳112/110下、安和113/111下、中正111下、田中111下）
scripts/           Python 資料處理 pipeline
  extract.py       自然 PDF → raw（純函式 parse_questions_from_text + --input/--output）
  extract_math.py  數學答案卷 → raw（獨立模組：雙欄切分、括號答案、分數亂序偵測）
  reflow_math.py   分數亂序題 AI 重組（artifact 人工核對後 --apply 併回 raw）
  classify.py      claude -p 批次分類（可切換 taxonomy：--semester mid|final|math）
  data_helpers.py  去重/答案合併/驗證純函式（深模組B）
  build_questions.py classified → docs/questions.json 三來源合併（冪等、id 去碰撞、subject 欄位）
  build_explanations.py data/exp_results/ → docs/explanations.json 合併驗證
  fix_classified.py 期中分類修正腳本
data/              中間資料
  raw_questions.json        期中萃取（659 題）
  classified_questions.json 期中分類（645 題）
  raw_questions_期末.json    期末萃取（第一批）
  classified_questions_期末.json 期末分類（unit 3/4 + subtopic）
  *_期末_新增.json           第二批擴充（raw / classified / official_answers）
  raw_questions_數學.json    數學萃取（含 reflow 撈回題）
  *_數學_新增.json           數學擴充批（4 卷人工策展 raw / classified）
  classified_questions_數學.json 數學分類（unit 5–9 + subtopic，含擴充批合併）
  curated_questions_數學.json / table_crops_數學.json  看表題人工檔／截圖座標
  skipped_questions_數學.json / reflowed_questions_數學.json  分數亂序跳過清單／重組 artifact
  tcool_grade3_sci_kanghsuan.json / tcool_grade3_math_kanghsuan.json  考卷清單（tcool.cc 爬取）
docs/              GitHub Pages 部署目錄
  index.html       練習網站（單一 HTML，內嵌 CSS/JS，科目層 自然/數學）
  questions.json   最終題庫（自然 unit 1–4＋數學 unit 5–9，全題帶 subject）
  explanations.json 作答後說明（自然期末 499 題，id → 說明）
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

### 作答後說明
- 自然期末題（unit 3/4）答題 feedback 畫面顯示說明卡（1–3 句、小三用語）；`explanations.json` 缺 id 時不顯示，不影響作答流程

### 填充題空格 chip＋條列換行（家長提案：（２）標記乍看像答案、子題擠成一段）
- 題幹（Ｎ）全形標記渲染成 chip（虛線小格），與下方作答格同步 highlight、可點選、輸入時即時回填顯示值；答題後同步綠/紅。資料格式不變（仍存（１）），純前端 renderer 處理；半形 (1) 是原卷子題編號不轉換
- 條列換行（只套填充題）：「；」後／≥2 個半形 (N) 子題前／≥2 個甲乙丙丁列舉前／「答：」「最大：」「最小：」標籤前。選擇題不套——其 (N) 命中多為萃取欄位滲漏雜訊

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
