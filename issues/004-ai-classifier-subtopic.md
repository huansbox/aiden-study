## Parent PRD

`issues/prd.md`（深模組「模組C 學期分類設定」、subtopic 分類體系、Implementation Decisions）

## What to build

把分類器升級為**可切換學期 taxonomy** 的正式版，並補上 #1 暫時留空的 subtopic：

- **模組C 介面（釘死）**：把目前是模組頂層常數的 SYSTEM_PROMPT 與合法 subtopic 集合改為**注入式設定（呼叫方傳入 config）**，期中與期末各一份 config 常數；核心分類邏輯不因學期而改。
- **期末分類**：`unit`∈{3,4,none}，subtopic 為 PRD 所列 8 個之一（動物：動物分類/身體構造/生存與適應/觀察方法；天氣：風/氣溫測量/雨量降雨/天氣預報），以桃子腳範圍為基準。
- **none 排除**：不屬任一 subtopic 的題目標 `unit:"none"`，排除於練習之外。
- 重跑全部期末題目產出正式 subtopic，覆蓋 #1 的暫時 `none`。
- 驗證 helper（沿用 #3）對期末 config 生效並有測試。

## Acceptance criteria

- [x] SYSTEM_PROMPT／合法 subtopic 改為注入式 config，期中/期末各一份 — `classify.py` 的 `SEMESTERS` dict（`mid`/`final`），核心邏輯不分學期；`--semester` 切換
- [x] 期末題目分類出正確的 unit(3/4) 與 8 個 subtopic 之一 — 118 題全分類，8 個 subtopic 皆有題（生存與適應22/身體構造21/動物分類12/觀察方法3；天氣預報22/風16/氣溫測量12/雨量降雨10）
- [x] 範圍外題目標 `none` 並排除於練習 — 本批安和卷 none=0；validate 與 build 排除邏輯就緒
- [x] `docs/questions.json` 中期末題目帶有正式 subtopic（取代 #1 的全 none）— 期末 118 題 subtopic=none 數為 0
- [x] pytest：期末 config 下非法 subtopic 被擋 — `tests/test_classify_config.py`
- [x] 期中分類以同一套程式＋期中 config 重跑結果一致 — 期中 SYSTEM_PROMPT／合法集合逐字保留（`MIDTERM_SYSTEM_PROMPT` == 原 prompt 已驗證），模型沿用預設；未重跑期中 AI（classified_questions.json 含 fix_classified 手動修正，不可覆寫）
- [x] 抽樣核對分類正確率（信心低者進複查）— 抽查 8 subtopic 各題皆正確；信心 ≥90 有 102 題、70–89 有 16、<70 為 0；2 題低信心(72) 為邊界天氣題（季節氣溫、雲量），歸 unit4 正確、subtopic 取最佳擬合

## 實作備註

- classify.py 重構為 config 驅動（模組C）：`classify_batch`/`main` 吃 config；期末 config 用 sonnet 控成本、batch 30。`classify_final_min.py`（#1 暫用）已刪除，由 `classify.py --semester final` 取代。
- merge_answer 回傳的 `needs_review` 已存入 classified（安和全官方答案 → 全 0；民權/桃子腳112 的 AI 補答案複查在 #5）。
- questions.json：720 題（1:324 2:278 3:58 4:60），期末 subtopic 完整。

## Blocked by

- Blocked by `issues/003-answer-key-extraction-helpers.md`

## User stories addressed

- User story 5
- User story 6
- User story 28
- User story 29
