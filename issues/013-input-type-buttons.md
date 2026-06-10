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

- [ ] 三種輸入元件在 pad 上可用：comparison 三按鈕、code 按 choices 渲染、text 鍵盤輸入 —— Playwright 實測
- [ ] `code` 型空格 schema 含 `choices`，classify 輸出正確的代號集合；`data_helpers` 驗證擴充＋pytest
- [ ] `text` 比對：全半形正規化、去前後空白（pytest 案例）
- [ ] 011 的過濾清單全數解禁入庫，逐題對 PDF 核對答案
- [ ] 混合型態的多空格題（如「最大：( code ) 最小：( code )」）逐格給對應元件、全對才算對
- [ ] `uv run pytest` 全綠

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`

## 對應設計稿章節

- 「輸入摩擦原則」：comparison / code / text
- 「資料 schema」：code 型需帶 choices
