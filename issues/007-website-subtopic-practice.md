## Parent PRD

`issues/prd.md`（Solution、Implementation Decisions：subtopic × 模式）

## What to build

在期末單元卡片下，把 subtopic 變成可選的練習入口，讓小孩能針對「類似概念」集中練習（現有期中站只能按單元練）：

- 各期末單元（動物／天氣）下列出其 subtopic 作為練習入口。
- 「全部練習」「快速練習」可**作用於單一 subtopic**（限定該 subtopic 的題目）。
- subtopic 的「全部練習」**可接續**：challenge 佇列改用「單元」或「單元＋subtopic」的複合鍵儲存。
- 「錯題練習」維持**單元層級**（不細分到 subtopic）。

需在 pad 上手動驗證。

## Acceptance criteria

- [ ] 每個期末單元下顯示其 subtopic 入口
- [ ] 點某 subtopic 可做「全部練習」，只出該 subtopic 的題
- [ ] 點某 subtopic 可做「快速練習」，只從該 subtopic 智慧抽題
- [ ] subtopic 的「全部練習」可中途離開後接續
- [ ] 單元層級的「全部／快速／錯題」仍正常運作
- [ ] 期中既有進度與 localStorage 不受複合鍵改動破壞
- [ ] pad 上手動測試 subtopic 練習正常

## Blocked by

- Blocked by `issues/004-ai-classifier-subtopic.md`
- Blocked by `issues/006-website-semester-switch.md`

## User stories addressed

- User story 16
- User story 17
- User story 18
