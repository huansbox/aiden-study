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

- [x] 分數重組策略定案並記入設計稿：**AI 重組＋人工 PNG 核對閘門（閘門必要）**。實測：首輪 prompt 2/2 對；同 prompt 重跑 1/2（單次重組有不確定性）；prompt 強化「殘渣數字必須用掉」後 2/2 對。流程工具化為 `scripts/reflow_math.py`（artifact → 人工核對 → --apply）
- [x] 009 跳過清單的分數題（桃Q3、安Q8）全部撈回題庫，題幹逐題對 PDF 渲染圖核對無誤（桃Q3 ④=「8 個 0.1 是 1/8」、安Q8 ④=「9 個 0.1 和 9/10 一樣大」；分數採斜線表記）
- [x] 單元 5–9 正式名稱查證完成（5 小數/6 圓/7 乘法與除法/8 時間/9 統計表；均一類康軒版＋搜尋交叉佐證＋卷面吻合），taxonomy（unit＋13 subtopic）寫入 classify 數學 config 與 CLAUDE.md
- [x] 既有數學題全量重新分類（13 題，信心全 ≥90），subtopic 不再是 `none`；subtopic 清單貼給家長過目（見下，**待家長過目，不擋合併**）
- [x] 網站數學單元可按 subtopic 練習 —— Playwright 實測（「8/時制互換」通關流程完整）
- [x] 安和 113下已於 009 順收，本項無事可做
- [x] `uv run pytest` 全綠（61 passed）

## 給家長過目的 subtopic 清單（不擋合併，有意見再調）

- 第 5 單元 小數：小數的認識／小數比大小／小數加減
- 第 6 單元 圓：圓的構造／圓規與畫圓／圓的大小比較
- 第 7 單元 乘法與除法：乘除互逆／乘除計算／乘除應用
- 第 8 單元 時間：時刻與時間單位／時制互換／時間計算
- 第 9 單元 統計表：報讀表格（單一子主題，UI 不另列）
- 另請確認：分數顯示用斜線「1/8」可否，或要改「八分之一」式

## 完成紀錄（2026-06-11）

- 單元名稱依據非課本目錄原件（均一類康軒版），家長可拿課本抽查
- 測試中曾觀察到一次無法重現的 localStorage 異常（unit 6 只答對 1 題卻全 mastered）：發生在「測試中途換 questions.json＋合成種子存檔」的 harness 情境，乾淨重放（答題→重載→狀態正確）無法重現，且答錯會 requeue、邏輯上湊不出該狀態；記錄備查，若再現再深查

## Blocked by

- Blocked by `issues/009-math-mc-tracer.md`

## 對應設計稿章節

- 「Pipeline」第 1 步已知坑（分數排版）
- 「Pipeline」第 2 步 taxonomy
- 「尚待決定」：分數重組策略、單元 5–9 正式名稱
