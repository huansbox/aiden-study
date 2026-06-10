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

- [x] schema 落地（`{op, operands, answer}`，long_division answer=`{quotient, remainder}`）＋`data_helpers.validate_vertical_calc`（op 實算驗證 answer，pytest 10 案例）；extract 端 `parse_vertical_calc` 也先驗算（被除數=除數×商+餘 等），不符進 parse_error 清單
- [x] 長除法逐格：商/乘積/減與落位逐格填，邏輯與 aiden-math 一致（含前導零商位，340÷8 商顯示 042；每回合 商→乘積→減/落位 順序；填錯紅閃重試）—— Playwright 實測 14 格全填自動結算
- [x] 小數加減直式：逐位由右至左＋小數點對位（小數點為固定格），借位案例 25.0−6.7=18.3、進位案例 53.2+9.8=63.0 格陣正確 —— Playwright 實測
- [x] 012 跳過清單的直式題全數入庫（桃(1)(2)(6)＋安(1)(2)(5) 共 6 題），官方答案經驗算核對
- [x] flag 機制對 vertical_calc 相容（formatAnswer：加減「18.3」／除法「商 42、餘數 4」；prefill 無 undefined）
- [x] 自然科與既有數學題型回歸不破（pytest 89 passed）

## 完成紀錄（2026-06-11）

- **對錯判定釘死**：直式採逐格即時驗證（錯了紅閃、重按直到對）——「答對」＝全程零失誤；有失誤則完成後計為答錯（進 errorBank、queue 重排），feedback 顯示「填錯過 N 次」。與 aiden-math 引導式體驗一致，又保住 aiden-study 的 queue/錯題語義
- 驗算框/圈選（正確，錯誤）不檢核（家長定案），extract 直接丟棄
- 題庫 1148 題（數學 47）；安和應用 Q3（複合答案）為僅存非表格延後題

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`（共用 numpad 與答題回饋框架）

## 對應設計稿章節

- 「Scope 決議」大題三（直式逐格，家長選 B）
- 「資料 schema」：vertical_calc
- 「UI / 題型引擎」：直式 grid
