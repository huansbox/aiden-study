> **狀態：已完成**（2026-06-09 merge 部署）。歷史工作項紀錄，不再更新；現況見 `HANDOFF.md`。

## Parent PRD

`issues/prd.md`（Implementation Decisions：答案合併規則；Further Notes：複查清單）

## What to build

處理**無官方答案卷**的民權國小 4 份期末考卷（臺北市唯一來源）：題目卷括號為空，只有題目文字，答案由 AI 補並標記供人工複查。

- 萃取民權題目卷（格式B，空括號），只取題目文字、答案留空。
- 走 #4 分類器：偵測「無原始答案」→ 由 AI 補答案，並把這些題標記為「需複查」。
- **複查清單形式（預設，釘死，可後改）**：把 AI 補答案的題目輸出成 `skipped_questions.md` 同風格的期末複查清單檔，供家長逐題核對。
- 民權題目分類出正確 unit(3/4) 與 subtopic，併入 `docs/questions.json`。

## Acceptance criteria

- [x] 民權 4 份題目卷萃取出是非＋選擇題（答案留空）— 114 題（格式B 空括號）；另含桃子腳112（家長決策，走同一 AI 補答案流程）15 題
- [x] 無官方答案的題由 AI 補答案 — `classify.py --semester final` 對無答案題以 AI 補（merge_answer）
- [x] AI 補答案的題被標記為需複查 — `needs_review=True`（共 115 題，進題庫者 106 題）
- [x] 產出期末複查清單檔（skipped 風格），列出所有 AI 補答案題 — `review_期末_ai答案.md`（106 題，按來源分表，含題目/選項/AI答案/信心）
- [x] 民權題目帶正確 unit/subtopic 併入 `docs/questions.json` — 期末 222 題（安和116 官方＋民權92＋桃子腳14 AI）
- [x] 網站能練到民權題目 — Playwright 實測 unit4 民權選擇題作答正常

## 實作備註

- 全期末來源（安和×4 答案卷＋民權×4＋桃子腳112 題目卷）統一進 `raw_questions_期末.json`（247 題），`classify.py --semester final` 一次分類：官方答案沿用、無答案 AI 補並標 needs_review。
- **穩健性修正**：233 題分 8 批（每批30）時偶發 2 批逾時→53 題誤標 none。改 batch 30→15、timeout 180→300s 重跑，0 逾時。
- **空選項題過濾**：民權113 #2/#11/#12、桃子腳112 #10 為圖片型空選項 MC（選項文字空白），filter 從「len<2」改為「有效（非空）選項<2」排除之（期中逐字不受影響，已驗證）。
- 7 題範圍外標 none 排除（季節推測、皮膚感覺器官等；含 1 題安和113陰天因頁首污染誤判）。
- 最終題庫 824 題（1:324 2:278 3:111 4:111）；pytest 49 passed。

## Blocked by

- Blocked by `issues/004-ai-classifier-subtopic.md`

## User stories addressed

- User story 4
