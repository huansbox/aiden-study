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

- [ ] blanks schema 落地（`blanks: [{input, answer}]`），`data_helpers` 驗證函式擴充並有 pytest（含多空格、缺欄位、空 answer 等案例）
- [ ] 桃子腳 112下 填填看 number 空格題萃取＋官方答案多空格抽取正確（對 PDF 核對）
- [ ] classify 數學 config 輸出每格 `input` 型態標註
- [ ] 含未支援 input 型態的題被 build 過濾並記錄清單（013 解禁依據）
- [ ] numpad UI：數字＋小數點＋退格，pad 上可逐格作答；多空格全對才算對；答錯標出錯格並顯示正解 —— Playwright 實測
- [ ] flag 回報對 fill_in_blank 題型顯示正常（不出現「選項 undefined」），prefill URL 內容正確
- [ ] 自然科回歸不破（pytest 全綠＋抽查網站行為）

## Blocked by

- Blocked by `issues/009-math-mc-tracer.md`

## 對應設計稿章節

- 「Scope 決議」大題二（填填看）
- 「輸入摩擦原則」：number → 數字鍵盤
- 「資料 schema」：fill_in_blank
- 「尚待決定」：多空格答錯回饋粒度 —— 本片釘死
