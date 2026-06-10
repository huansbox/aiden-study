> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

純 pipeline 擴充片（UI 零新工作，沿用 011 的 fill_in_blank 引擎）：把以下三類題抽進題庫——

- **計算題的反推題**（`( )×5=120`、`( )÷8=56`）→ 單格 number
- **計算題的時間計算**（`3時50分−2時35分=( )時( )分`）→ 兩格 number
- **應用題大題**（只檢核最終答案，列式不檢核；時間答案兩格、其餘單格 number）

注意：計算題大題裡的直式題（小數加減、除法商餘）**不在本片**——那是 014 的 `vertical_calc`；extract 需把直式題與反推/時間題區分開（直式題本片先跳過進清單，014 撈回）。

若 011 實作中發現這部分抽取極輕，可併回 011 一起完成（本片關閉並記錄）。

## Acceptance criteria

- [ ] 桃子腳 112下（含安和，若已併入）反推題/時間計算/應用題萃取＋官方答案正確（對 PDF 核對）
- [ ] 直式題未混入（進跳過清單待 014）
- [ ] 網站可練到應用題與反推/時間題 —— Playwright 抽測
- [ ] `uv run pytest` 全綠

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`

## 對應設計稿章節

- 「Scope 決議」大題三（反推/時間部分）、大題六（應用題）
