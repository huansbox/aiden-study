> 類型：AFK（subtopic 清單產出後貼給家長過目一眼，不擋合併）

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

009 刻意延後的兩個未知，在此收口（與 011 並行，不在關鍵路徑上）：

1. **分數排版重組 spike**：解 PDF 文字層把分數拆散亂序的問題。先試 **AI 重組**（classify 階段讓 claude 看亂序原文重建題幹），以渲染 PNG 親讀逐題核對重組正確率；錯誤率高再換**視覺轉寫**（render → 主模型親讀轉寫，比照自然科圖片答案卷經驗：整頁縮圖不可靠、象限放大才準）。策略定案後把 009 跳過清單的題撈回題庫。
2. **正式 taxonomy**：查證康軒三下數學單元 5–9 正式名稱（課本目錄／考卷範圍標頭），subtopic 以桃子腳卷範圍為基準設計，寫進 `classify.py` 的數學 config 與 CLAUDE.md 分類規則章節；UI subtopic 練習入口（`renderSubtopics` 是 config 驅動，units 加 `subtopics` 陣列即自動渲染）。
3. 安和 113下 若在 009 被判定結構差異大而挪入，本片補齊其選擇題。

classify 重跑紀律（釘死）：第一批全官方答案、無人工複審紀錄需保護，**可接受全量重跑**（不必走自然科 `merge_classified.py` 的「不可覆蓋已複審」模式）；等未來擴卷帶入 AI 補答案＋複審後，必須切到 `_新增`＋merge 模式。

## Acceptance criteria

- [ ] 分數重組策略定案並記入設計稿（AI 重組 vs 視覺轉寫，附實測正確率）
- [ ] 009 跳過清單的分數題全部撈回題庫，題幹逐題對 PDF 渲染圖核對無誤
- [ ] 單元 5–9 正式名稱查證完成，taxonomy（unit＋subtopic）寫入 classify 數學 config 與 CLAUDE.md
- [ ] 既有數學題全量重新分類，subtopic 不再是 `none`；subtopic 清單貼給家長過目（不擋合併）
- [ ] 網站數學單元可按 subtopic 練習
- [ ] 安和 113下（若 009 挪入）選擇題併入，官方答案核對通過
- [ ] `uv run pytest` 全綠

## Blocked by

- Blocked by `issues/009-math-mc-tracer.md`

## 對應設計稿章節

- 「Pipeline」第 1 步已知坑（分數排版）
- 「Pipeline」第 2 步 taxonomy
- 「尚待決定」：分數重組策略、單元 5–9 正式名稱
