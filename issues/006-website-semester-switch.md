## Parent PRD

`issues/prd.md`（Solution、Implementation Decisions：網站與狀態儲存）

## DECISION（HITL，開工前需家長確認）

- **合併後站名**：＿＿＿＿＿（現為「三下自然期中題庫」，需改為涵蓋期中＋期末的名稱；期中區塊標籤保留）

## What to build

把現有單一 HTML 網站從「只有期中、扁平單元」改造為「期中／期末雙範圍」，取代 #1 的最小 stub：

- 最上層新增**期中／期末切換**：期中顯示 unit 1–2、期末顯示 unit 3–4。
- 站名改為涵蓋兩者（見上方 DECISION）；期中內容**改名保留、不移除**。
- 期末單元沿用現有**三種模式**（全部／快速／錯題）於**單元層級**運作（subtopic 練習留給 #7）。
- **localStorage 不破壞期中進度**：因 unit 3/4 全域唯一，challenge 與 errorBank 直接新增 3/4，期中既有進度不需遷移。

需在 pad 上手動驗證切換與三種模式。

## Acceptance criteria

- [ ] 站名已依 DECISION 更新；期中區塊保留
- [ ] 最上層可切換期中／期末，各自顯示對應單元
- [ ] 期末 unit 3/4 可做「全部練習」（答對移出/答錯排隊尾/可接續/通關可重置）
- [ ] 期末 unit 3/4 可做「快速練習」（智慧抽 10 題，常錯/練少優先）
- [ ] 期末 unit 3/4 有「錯題練習」（答對移除/答錯留隊尾）
- [ ] 加入期末後，期中既有 localStorage 進度未被清除或破壞
- [ ] pad 上手動測試切換與三模式皆正常

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
