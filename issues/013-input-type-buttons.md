> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

fill_in_blank 的其餘三種輸入型態（輸入摩擦最小化原則）：

- `comparison` → `>` `<` `=` 三按鈕（固定三選）
- `code` → 代號按鈕列（schema 帶 `choices`，如 `["甲","乙","丙","丁"]`，按題目自帶代號集合渲染）
- `text` → 自由輸入（極少數，如「圓心」「半」；比對需處理全半形與前後空白）

並解禁 011 在 build 端過濾的「含這些型態空格」的題，全部入庫上線。

## Acceptance criteria

- [x] 三種輸入元件可用：comparison ＞＜＝三按鈕、code 按 choices 渲染（甲乙丙丁）、text 鍵盤輸入 —— Playwright 實測（單值型按下自動跳下一空格）
- [x] `code` 型空格 schema 含 `choices`（classify 新增 blank_choices 回傳＋驗證）；`data_helpers.validate_blanks` 擴充 comparison 值域＋pytest
- [x] `text` 比對：全半形正規化、去前後空白（`normalize_for_compare` pytest＋JS 同邏輯 Playwright 實測「 圓心　」判對）
- [x] 011 的過濾清單全數解禁入庫（桃Q7 code 丁/丙、桃Q9 text 圓心、安Q1 text 半），對 PDF 核對通過；**加碼救回** 桃Q5 比較題（＞＜＝印在字裡，extract 新增獨立符號抽取，4 格 >,>,<,> 對 PDF 核對）
- [x] 混合型態多空格：輸入面板依「作用中空格」型態切換（桃Q7 兩 code 格逐格作答驗證）、全對才算對機制不變
- [x] `uv run pytest` 全綠（87 passed）

## 完成紀錄（2026-06-11）

- 題庫 1142 題（數學 41），未支援過濾清單清空
- 安word3（複合答案「丙班快 20 秒鐘」）仍在延後清單——它需要的不是輸入元件而是複合答案 schema，先不救（量只有 1 題，未來擴卷再看這型多不多）
- 桃Q5 分類信心 62（前兩格小數比大小、後兩格時間比較的混搭題，AI 歸 5/小數比大小）——可接受的歸類裁量

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`

## 對應設計稿章節

- 「輸入摩擦原則」：comparison / code / text
- 「資料 schema」：code 型需帶 choices
