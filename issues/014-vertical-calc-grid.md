> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

新題型 `vertical_calc` 直式逐格作答（家長定案：計算題要逐格填，不是只收最終答案）。UI 工時最大的一片。

- **長除法商餘**（`340÷8=( )…( )`）：移植 aiden-math `js/division.js` 逐格邏輯（127 行純函式、無 DOM 依賴）——aiden-study 是零依賴單一 html，**內聯改寫**不是 import。
- **小數加減直式**（`25−6.7`、`53.2+9.8`）：新寫——逐位填答＋小數點對位，grid 渲染框架與長除法共用。
- schema：`{op, operands, answer}`，格子由前端依 op＋operands 動態生成（同 aiden-math 做法，不存死格子）；長除法 answer＝`{quotient, remainder}`。
- 驗算框不檢核（家長定案）。
- 撈回 012 跳過清單中的直式題。

## Acceptance criteria

- [ ] schema 落地＋`data_helpers` 驗證（operands 與 answer 一致性：用 op 實算驗證 answer 正確，pytest）
- [ ] 長除法逐格：pad 上可逐格填商/乘積/餘數，邏輯與 aiden-math 行為一致 —— Playwright 實測
- [ ] 小數加減直式：逐位＋小數點對位，進退位格正確 —— Playwright 實測
- [ ] 012 跳過清單的直式題全數入庫，官方答案核對通過
- [ ] flag 機制對 vertical_calc 題型相容（formatAnswer／prefill）
- [ ] 自然科與既有數學題型回歸不破（pytest 全綠）

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`（共用 numpad 與答題回饋框架）

## 對應設計稿章節

- 「Scope 決議」大題三（直式逐格，家長選 B）
- 「資料 schema」：vertical_calc
- 「UI / 題型引擎」：直式 grid
