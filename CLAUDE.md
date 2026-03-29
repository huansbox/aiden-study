# Aiden Study - 三下自然期中題庫練習網站

## 專案目標

從 `docs/` 底下 27 份國小三下期中自然考卷 PDF，萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。

## 技術決策

- 資料處理：Python（pdfplumber 萃取、claude -p 批次分類）
- 網站：單一 `index.html`（內嵌 CSS/JS），零依賴，可本機開啟或部署 GitHub Pages
- 資料格式：JSON（Python 產出 → 網站讀取），`questions.json` 放 `site/` 同目錄，fetch 用 `./questions.json`
- 儲存：localStorage 記錄答題紀錄
- 編碼：所有 Python 腳本開頭設定 `sys.stdout.reconfigure(encoding='utf-8')`，subprocess 呼叫加 `encoding='utf-8'`

## 分類規則

- **第 1 單元：田園樂**
  - 蔬菜從哪裡來：題目核心是蔬菜的產地、種類辨識、哪些部位可食用
  - 影響蔬菜生長的因素：題目核心是光、水、土壤、氣候對生長的影響
  - 蔬菜生長的變化過程：題目核心是發芽、開花、結果等生命週期順序
- **第 2 單元：溫度變化對物質的影響**
  - 影響物質變化的因素：題目核心是「什麼條件造成物質狀態或外觀改變」（不限溫度）
  - 溫度對水的變化：題目核心是冰、水、水蒸氣三態，含融化/結冰/蒸發/凝結
  - 溫度對其他物質的影響：題目核心是非水物質（奶油、巧克力、鐵…）受溫度改變
- **衝突規則**：若題目同時符合兩個單元，優先歸屬「題目直接詢問的核心概念」所屬單元
- **不屬於以上** → 不納入題庫

## 題目篩選規則

- 只收錄：無圖片的是非題 + 選擇題
- `has_image` 雙重判斷：(a) 題目文字含「圖」相關關鍵詞 OR (b) 題目區域有非全頁面尺寸的圖片物件
- 答案直接從 PDF 文字解析，正規化為 `true/false`（是非題）和 `1/2/3/4`（選擇題）
- 解析不到答案的題目列入 skipped
- 跳過的題目記錄在 `skipped_questions.md`（PDF 名 / 題型 / 題號 / 跳過原因 / 判斷依據）

## 網站 UX 規格

### 練習流程
- 首頁選擇單元 → 進入練習
- 一次一題，依序出現，不允許跳題
- 題目上方顯示「第 N 題 / 共 M 題」+ 小圓點進度條（綠=答對、紅=答錯、灰=未答）
- 點選答案後即時顯示對錯顏色，出現「下一題」按鈕（不自動跳轉）
- 答題後 disable 所有選項按鈕，防連點

### 摘要頁（全部答完後）
- 答對幾題 / 共幾題（大字顯示）
- 「再練一次」按鈕（重新洗牌同單元題目）
- 「練習錯題」按鈕（有錯題時才顯示）
- 「回選單」按鈕

### 觸控標準
- 題目文字 `font-size: 1.25rem`（20px），選項文字 `1.125rem`（18px）
- 每個選項 `min-height: 56px`
- 選項間距 `gap: 12px`
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`

### localStorage 資料結構
```json
{
  "records": [
    {
      "questionId": "source_section_number",
      "unit": 1,
      "correct": true,
      "answeredAt": 1711234567890
    }
  ]
}
```
key: `aiden_study_records`，只存原始記錄不做 aggregate，前端動態計算。

## 任務清單與驗證條件

每步完成驗證後自動推進下一步，不需人工確認。

### 步驟 1：PDF 萃取 + 題目解析

- **產出**：`scripts/extract.py` → `data/raw_questions.json`
- **做法**：每份 PDF 全頁合併後再 parse（不逐頁處理），解決跨頁問題。維護 `SECTION_PATTERNS` 字典窮舉各校題型標記變體，未匹配的 log 出來。
- **驗證**：
  - 27 份 PDF 全部處理，無例外中斷
  - 每題結構完整：`source`（PDF 檔名）、`section`（題型）、`number`（題號）、`text`（題目含選項文字）、`options`（選項列表，是非題為空）、`answer`（正規化後的正確答案）、`has_image`（布林）
  - `answer` 欄位非空比例 > 95%，空的列入 skipped
  - 選擇題必須有 2-4 個選項，不符的標記為解析疑問
  - 抽查 5-6 份 PDF（每縣市至少 1 份 + 最舊最新各 1 份），比對原文確認解析正確
- **狀態**：待開始

### 步驟 2：標記跳過題目

- **產出**：`skipped_questions.md`
- **驗證**：
  - 所有 `has_image=true` 的題目已列入
  - 所有非「是非/選擇」題型已列入
  - 答案解析失敗的題目已列入
  - 格式正確：PDF 名 / 題型 / 題號 / 跳過原因
  - 跳過數 + 保留數 = 總題數
- **狀態**：待開始

### 步驟 3：AI 分類 + 審定

- **產出**：`data/classified_questions.json`（每題增加 `unit`、`subtopic`、`confidence`、`classify_reason` 欄位）
- **流程**：
  1. 分類前 dedup（相同題目文字只分類一次，結果複製到所有來源）
  2. `scripts/classify.py` 批次呼叫 `claude -p`（每批 10-15 題），要求回傳 JSON array 含 `unit`、`subtopic`、`confidence`（0-100）、`classify_reason`
  3. `subtopic` 值做 enum 驗證（只能是六個指定值之一），非法值該題重試
  4. 每批輸出驗證 item 數量 = 輸入數量，不符整批重試（最多 3 次）
- **審定（分層抽樣）**：
  - confidence < 70：全部審定
  - confidence 70-89：抽 30%
  - confidence >= 90：抽 5%
  - 通過條件：高風險層（<70）錯誤率 < 20%，整體錯誤率 < 3%
  - 未通過則調整 prompt 重跑
- **狀態**：待開始

### 步驟 4：產出最終題庫

- **產出**：`site/questions.json`（僅含 unit 1 和 unit 2 且 confidence >= 70 的題目）
- **驗證**：
  - `unit=none` 和 `confidence < 70` 的題目已排除
  - confidence 不足的題目記入 `skipped_questions.md`（原因：分類信心不足）
  - JSON schema 正確，網站可直接讀取
  - 題目總數 > 0 且兩個單元都有題目
  - 輸出重複題目數量統計
- **狀態**：待開始

### 步驟 5：建立練習網站

- **產出**：`site/index.html`
- **驗證**：
  - 瀏覽器開啟無 console error
  - 可選擇單元 → 顯示題目 → 點選答案 → 即時顯示對錯
  - 題目切換後上一題選中狀態完全清除
  - 所有題目答完後顯示摘要頁（答對數 / 總題數 / 再練一次 / 錯題複習 / 回選單）
  - localStorage 資料結構符合定義
  - fetch 失敗時顯示錯誤訊息，不能白畫面
  - 觸控標準符合 UX 規格
- **狀態**：待開始

## 開發流程

- branch: `feat/quiz-site`
- 每完成一個任務：commit + 驗證 + 更新此文件狀態 → 自動推進下一步
- 驗證未通過則修正後重新驗證，不推進
