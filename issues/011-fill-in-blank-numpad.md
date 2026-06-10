> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

新題型 `fill_in_blank` 端到端：blanks schema → extract 填填看大題 → classify 標空格 input 型態 → 答案卷多空格抽取 → build → numpad UI 作答。本片只做 **`input: "number"`** 的空格（數字鍵盤：數字＋小數點＋退格），其他輸入型態（comparison/code/text）留給 013。

範圍與釘死決策：

- **多空格題**：每格獨立輸入、**全對才算對**（計分與 errorBank 以「題」為單位，同現行）。
- **答錯回饋粒度（釘死預設，可後改）**：標出哪格錯、顯示各格正確答案——對小孩友善優先。
- **未支援 input 型態的題先過濾**：本片 pipeline 可能抽到含 comparison/code/text 空格的題，build 端過濾「含任一未支援型態空格」的題不入庫，013 落地後解禁——避免網站出現按不了的題。
- **flag 機制相容**：`formatAnswer()`（index.html）目前只認 MC/TF，需擴充支援 blanks 題型；GitHub issue prefill 的選項列印同樣要處理 `q.options` 不存在的情況。
- pipeline 範圍：填填看大題的 number 空格題。計算題反推/時間題與應用題的抽取留給 012（同引擎、純 pipeline 擴充）。

## Acceptance criteria

- [x] blanks schema 落地（`blanks: [{input, answer}]`），`data_helpers.validate_blanks` 擴充並有 pytest（多空格、缺欄位、空 answer、number 數值形式、code 需 choices 等 6 案例）
- [x] 桃子腳 112下 填填看 number 空格題萃取＋官方答案多空格抽取正確（Q1=800,5／Q2=8,3／Q3=4,0／Q4=10.2／Q8=6／Q10=108，對 PDF 核對）；安和填充題順帶完成（Q2,4,5,6,7；「0.1 或十分之一」取 0.1）
- [x] classify 數學 config 輸出每格 `input` 型態標註（blank_inputs 長度與值域驗證；15 題全標對）
- [x] 含未支援 input 型態的題被 build 過濾並記錄 `data/filtered_unsupported_數學.json`（3 題：桃Q7 code、桃Q9 text、安Q1 text）
- [x] numpad UI：數字＋小數點＋退格，逐格作答（點格選取）；多空格全對才算對；答錯標紅錯格＋旁顯正解；number 採數值等價比對（200.0=200）—— Playwright 實測
- [x] flag 回報對 fill_in_blank 正常（prefill body 無 undefined、現存答案格式「（1）166」）
- [x] 自然科回歸不破（pytest 77 passed＋網站抽查是非題作答）

## 完成紀錄（2026-06-11）

- 填充題 parser 與 MC 同模組（extract_math.py）：答案括號判別＝「內容前後有空白 或 含『或』」（兩卷實測可分離 (1) 子題標記與 (請填小數) 提示）；題界殘渣歸屬＝前題奇數殘渣補前題、否則歸新題（桃Q6 的 4/10 跨題界 case）
- 延後分流：fraction → reflow（桃fill Q6 已撈回）；table → 015；no_blanks（桃Q5 比較題）→ 013
- reflow_math.py 擴充支援填充題（重建全文保留答案括號 → 重用 extract_blanks）
- 012 範圍預告：安和卷無獨立計算/應用大題結構差異——其反推（填充Q7）/時間（Q5,Q6）已隨填充題入庫；012 處理桃子腳計算題大題與兩卷應用題
- 測試方法教訓（記錄）：Playwright 測試中 `localStorage.clear()` 後必須 reload 再操作，否則頁面記憶體舊 state 會在下次 save 復活（010 的「已通關」異常即此因，非 app bug）

## Blocked by

- Blocked by `issues/009-math-mc-tracer.md`

## 對應設計稿章節

- 「Scope 決議」大題二（填填看）
- 「輸入摩擦原則」：number → 數字鍵盤
- 「資料 schema」：fill_in_blank
- 「尚待決定」：多空格答錯回饋粒度 —— 本片釘死
