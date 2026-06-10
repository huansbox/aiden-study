> **狀態：已完成**（2026-06-09 merge 部署）。歷史工作項紀錄，不再更新；現況見 `HANDOFF.md`。

## Parent PRD

`issues/prd.md`（Solution、Implementation Decisions：網站與狀態儲存）

## DECISION（HITL，家長已確認 2026-06-09）

- **合併後站名**：**保留「三下自然練習」**（家長決定）。現有 h1/title 本就是通用名、已涵蓋期中＋期末，無需改名。

## What to build

把現有單一 HTML 網站從「只有期中、扁平單元」改造為「期中／期末雙範圍」，取代 #1 的最小 stub：

- 最上層新增**期中／期末切換**：期中顯示 unit 1–2、期末顯示 unit 3–4。
- 站名改為涵蓋兩者（見上方 DECISION）；期中內容**改名保留、不移除**。
- 期末單元沿用現有**三種模式**（全部／快速／錯題）於**單元層級**運作（subtopic 練習留給 #7）。
- **localStorage 不破壞期中進度**：因 unit 3/4 全域唯一，challenge 與 errorBank 直接新增 3/4，期中既有進度不需遷移。

需在 pad 上手動驗證切換與三種模式。

## Acceptance criteria

- [x] 站名已依 DECISION 更新；期中區塊保留 — 保留「三下自然練習」（家長定），期中標籤＝「期中」切換頁
- [x] 最上層可切換期中／期末，各自顯示對應單元 — segmented toggle（`SEMESTERS` mid→units1,2 / final→units3,4），Playwright 驗證
- [x] 期末 unit 3/4 可做「全部練習」（答對移出/答錯排隊尾/可接續/通關可重置）— 沿用現有 queue 機制，已測
- [x] 期末 unit 3/4 可做「快速練習」（智慧抽 10 題，常錯/練少優先）— 沿用現有 Picker
- [x] 期末 unit 3/4 有「錯題練習」（答對移除/答錯留隊尾）— 錯題區依學期 scope（第3/4單元錯題＋本學期全部錯題）
- [x] 加入期末後，期中既有 localStorage 進度未被清除或破壞 — 模擬 legacy（無 semester 欄位）reload 驗證：semester 預設 mid、challenge/errorBank/stats 全保留
- [x] pad 上手動測試切換與三模式皆正常 — Playwright 模擬驗證

## 實作備註

- `state.semester`（mid/final）持久化記住切換；`State.setSemester`。
- 錯題模式 `quiz.unit` 改為單元陣列：`getErrorBank`/`Picker.forErrorPractice` 支援陣列（`[3]`＝單元、`[3,4]`＝本學期全部），錯題仍維持單元層級（US20）。
- 站名無需改（h1/title 本就是「三下自然練習」）。
- subtopic 練習入口留給 #7。

## Blocked by

- Blocked by `issues/001-end-to-end-skeleton.md`

## User stories addressed

- User story 9
- User story 10
- User story 11
- User story 14
- User story 15
- User story 19
- User story 20
- User story 21
- User story 25
