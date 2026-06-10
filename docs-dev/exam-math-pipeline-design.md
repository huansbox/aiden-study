# 數學期末題庫 pipeline 與題型設計稿（2026-06-10 逐大題對齊）

> 內部開發文件，不部署。家長已逐大題確認 scope（本文件「scope 決議」一節），實作前先讀。
> 分支：`feat/math`。基準卷：桃子腳 112下期末（`pdfs_數學/`）。

## 為什麼（rationale）

- 自然科題庫（1101 題）驗證了「考卷萃取 → AI 分類 → pad 練習」模式有效，數學是第二科。
- 架構定案＝**併入 aiden-study 當第二科**（自然／數學切換），不放 aiden-math、不另起新站。理由：「一題一題練＋分類」是 aiden-study 的形狀；aiden-math 是教概念的互動 widget（長除法逐格、數織），形狀不同，但其**填格輸入已在 pad 驗證可行**，逐格邏輯可移植。
- 勘查結論（桃子腳 112下全卷）：期末範圍＝單元 5～9（分數/小數/圓/時間/除法/看表），**幾何畫圖極少**，約 27/33 答題格可純文字化——數學期末可行性比預期高。

## 卷源

- 清單：`data/tcool_grade3_math_kanghsuan.json`（62 筆，掃描器 `scripts/sweep_tcool_math.ps1`，沿用自然版邏輯僅改 subject）。
- 期末 ≥110下（現行課綱）共 15 份；**有答案卷**：桃子腳 112/110下、安和 113/111下、彰化中正/田中 111下。
- 已下載：`pdfs_數學/` 桃子腳112下＋安和113下（題目＋答案共 4 檔）。
- **數學桃子腳答案卷文字可直抽**（答案印在括號內：`（ 1 ）`、`( 0.8 )`、`( 圓心 )`）——與自然科桃子腳掃描圖答案卷完全不同，官方答案免費、不必 AI 補。
- 課綱分界同自然：**110下起才是現行 108 課綱**，108下/109下 排除。
- Cloudflare 繞過流程同自然（Playwright 取 cf_clearance → PowerShell 下載），cookie 暫存 `data/_cf_cookie.json`（已 gitignore）。

## Scope 決議（家長逐大題確認，2026-06-10 定案）

以桃子腳 112下卷的六個大題為基準：

| 大題 | 決議 | 處理方式 |
|---|---|---|
| 一、選擇題 | ✅ 收 | 沿用 `multiple_choice`，零改動 |
| 二、填填看 | ✅ 收 | 新題型 `fill_in_blank`；多空格每格獨立輸入、**全對才算對** |
| 三、計算題 | ✅ 收（**逐格填答**，非只收答案） | 小數加減直式＝逐位填＋小數點對位；除法商餘＝移植 aiden-math 長除法逐格；反推題與時間計算題本來就只有答案格；驗算框不檢核 |
| 四、畫畫看 | ❌ 不收 | 圓規作圖，紙本才有意義，pad 無法檢核 |
| 五、看表填填看 | ✅ **全收** | 複雜表（功課表/票價表/時刻表）**從 PDF 截圖嵌入**，第一版就建截圖裁切流程；簡單表（時制互換）文字重現 |
| 六、應用題 | ✅ 收（只檢核最終答案） | 列式不檢核——同一題多種合法列式，無法可靠自動判 |

### 輸入摩擦原則（家長明確要求）

每個空格標註**輸入型態**，UI 依型態給最低摩擦的輸入元件：

- `number` → 數字鍵盤（含小數點；aiden-math numpad 概念）
- `comparison` → `>` `<` `=` 三按鈕
- `code` → 代號按鈕（甲乙丙丁／題目自帶代號集合）
- `text` → 自由輸入（極少數，如「圓心」「半」）

## 資料 schema（草案）

既有題沿用 `{id, unit, subtopic, type, text, options, answer, source}`，新增：

```jsonc
// 全題庫：加 subject 欄位（舊自然題 build 時補 "science"；數學 "math"，unit 直接用課本單元號 5–9）
{
  "subject": "math",
  "unit": 7,
  "type": "fill_in_blank",
  "text": "35.8 的十分位數字是（１），十位數字是（２）。",   // 全形數字圈號＝空格佔位
  "blanks": [
    { "input": "number", "answer": "8" },
    { "input": "number", "answer": "3" }
  ],
  "image": "assets/math/<id>.png"   // 看表題才有；截圖存 docs/assets/math/
}

// 直式逐格（計算題）
{
  "type": "vertical_calc",
  "op": "add_decimal | sub_decimal | long_division",
  "operands": [25, 6.7],            // 格子由前端依 op+operands 動態生成（同 aiden-math division.js 做法）
  "answer": "18.3"                  // long_division 用 {"quotient": 42, "remainder": 4}
}
```

- `code` 型空格需帶 `choices`（如 `["甲","乙","丙","丁"]`）；`comparison` 固定三選。
- 反推題（`( )×5=120`）、時間計算（`3時50分−2時35分=( )時( )分`）歸 `fill_in_blank`，不是 `vertical_calc`。
- 應用題＝單格（或時間兩格）`fill_in_blank`。

## Pipeline（沿用自然科架構）

1. **extract**：數學卷版面與自然不同（大題結構、答題格樣式），預估要寫數學版 parser（先試現有 `parse_questions_from_text`，不合再分家）。
   - **已知坑：分數排版**。PDF 文字層把分數拆成分子/分母分離的行（「2 個 4/10 合起來」抽出來變「2 個 合起來是( ) …10…4」亂序）。處理策略待定（見「尚待決定」）。
2. **classify**：`claude -p` 批次，taxonomy＝單元 5–9 ＋ subtopic，**以桃子腳範圍為基準**（同自然慣例）。順便標每格 `input` 型態與題型歸屬（fill_in_blank vs vertical_calc）。
3. **answer key**：桃子腳/安和答案卷文字可抽 → 寫括號內答案的抽取規則，沿用 `apply_answer_key.py` 流程（官方答案 needs_review=False）。
4. **截圖**：看表題用 `crop_pdf.py` 擴充——人工框選每題表格座標 → 輸出 `docs/assets/math/<id>.png`。
5. **build**：`build_questions.py` 併入 `docs/questions.json`（加 subject 欄位，舊題補 science）。

## UI / 題型引擎（docs/index.html）

- 首頁加**科目層**（自然／數學），三種練習模式、錯題、flag、stats 機制全沿用（`questionIdsFor` 與 localStorage 加 subject 維度）。
- 新答題元件：
  - numpad（數字＋小數點＋退格）
  - comparison / code 按鈕列
  - 直式 grid（移植 aiden-math `js/division.js` 長除法逐格邏輯＋新寫小數加減直式；aiden-study 零依賴單一 html，邏輯要內聯改寫不是 import）
- 多空格題：全對才算對（計分與 errorBank 以「題」為單位，同現行）。

## 實作順序

已拆為 issues/008–015（2026-06-11，經 agent 依 vertical-slice 原則 review 後定稿，8 片）：

1. `issues/008-subject-dimension.md` — subject 維度＋科目層 UI（自然不破）
2. `issues/009-math-mc-tracer.md` — 選擇題 tracer（只桃子腳、分數亂序題先跳過、subtopic 暫 none）
3. `issues/010-fraction-reflow-taxonomy.md` — 分數重組 spike＋正式 taxonomy（與 011 並行，spike 移出關鍵路徑）
4. `issues/011-fill-in-blank-numpad.md` — fill_in_blank＋numpad（number 空格）
5. `issues/012-calc-word-problems-pipeline.md` — 反推/時間/應用題 pipeline 擴充
6. `issues/013-input-type-buttons.md` — comparison/code/text 按鈕
7. `issues/014-vertical-calc-grid.md` — 直式逐格（aiden-math 移植＋小數直式新寫）
8. `issues/015-table-image-questions.md` — 看表截圖（HITL）

011 之後 012/013/014/15 可並行。「擴其餘 13 份卷」刻意不列——多數無答案卷，會帶出 AI 補答案＋複審新流程，第一批上線後再議。

## 尚待決定

- [ ] 康軒三下數學單元 5–9 **正式名稱**（從課本目錄或考卷範圍標頭確認，桃子腳卷只寫「單元5～單元9」）
- [ ] 分數排版亂序的重組策略：AI 重組（classify 時讓 claude 看亂序原文重建題幹）vs 視覺轉寫（render PNG 親讀）——先試 AI 重組，錯誤率高再換
- [ ] 多空格題答錯時的回饋粒度（只說「答錯」vs 標出哪格錯）
- [ ] localStorage 是否升 v3（加 subject 維度）或在 v2 內擴 key
- [ ] 安和卷大題結構與桃子腳的差異盤點（已下載未逐頁勘查）
