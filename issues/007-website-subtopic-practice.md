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

- [x] 每個期末單元下顯示其 subtopic 入口 — 動物{動物分類17/身體構造37/生存與適應47/觀察方法10}、天氣{風25/氣溫測量23/雨量降雨15/天氣預報48}
- [x] 點某 subtopic 可做「全部練習」，只出該 subtopic 的題 — Playwright 驗證：動物分類全部練習分母＝17（只該 subtopic）
- [x] 點某 subtopic 可做「快速練習」，只從該 subtopic 智慧抽題 — 氣溫測量快速＝抽 10 題
- [x] subtopic 的「全部練習」可中途離開後接續 — 複合鍵 `"3/動物分類"`，離開後首頁顯示「接續 1/17」
- [x] 單元層級的「全部／快速／錯題」仍正常運作 — 單元 key `"3"`（111題）與 subtopic key `"3/動物分類"` 並存獨立
- [x] 期中既有進度與 localStorage 不受複合鍵改動破壞 — challengeKeys `["1","2","3","3/動物分類"]`，期中鍵完好
- [x] pad 上手動測試 subtopic 練習正常 — Playwright 模擬驗證

## 實作備註

- challenge 改用複合鍵 `challengeKey(unit, subtopic)`：整單元＝`"3"`、subtopic＝`"3/動物分類"`；State challenge 方法改吃 key。
- `Picker.forFullPractice/forQuickPractice` 與 `startQuiz` 加 subtopic 參數；`questionIdsFor(unit, subtopic)` 過濾。
- subtopic 入口只在期末單元（`SEMESTERS.final.units[].subtopics`，canonical 順序）；期中卡片不變。
- 錯題練習維持單元層級（US20，未細分 subtopic）。

## Blocked by

- Blocked by `issues/004-ai-classifier-subtopic.md`
- Blocked by `issues/006-website-semester-switch.md`

## User stories addressed

- User story 16
- User story 17
- User story 18
