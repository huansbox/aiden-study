> **狀態：已完成**（2026-06-09 merge 部署）。歷史工作項紀錄，不再更新；現況見 `HANDOFF.md`。

## Parent PRD

`issues/prd.md`（深模組「模組B 資料處理 helpers」、Implementation/Testing Decisions）

## What to build

把萃取範圍從 #1 的單一答案卷擴展到**全部 6 份有官方答案的期末考卷**（安和 110/111/112/113 下，桃子腳 110/112 下），並把分類流程中混在一起的資料處理邏輯抽成**可獨立測試的純函式 helpers**：

- **去重**：以正規化題目文字為鍵去重（目前內嵌在 `classify.py` 的 main 流程，抽出成 helper）。
- **答案合併**：有原始（官方）答案時用官方、無時用 AI 補（並標記需複查）的優先序邏輯。
- **驗證**：`unit`/`subtopic` 合法性檢查。

加 pytest（取自真實資料）。抽出去重邏輯後，期中既有分類流程需回歸驗證未受影響。

## 桃子腳答案卷處理（家長決策，與原計畫衝突）

實測：桃子腳兩份「答案卷」**無法**像安和直接抽官方答案——112下＝答案以紅字標在選項文字上（非填括號）、110下＝純掃描圖片無文字層。**家長決策（2026-06-09）**：
- 桃子腳 112下 → 走民權式 **AI 補答案＋標複查**，併入 issue 005（單選題文字可乾淨萃取）。
- 桃子腳 110下 → 放棄（圖片，不做 OCR）。
- 桃子腳仍是 subtopic 分類 taxonomy 的基準（不受影響）。

故本 issue 的「官方答案卷」實為**安和×4**；桃子腳移至 #5/排除。

## Acceptance criteria

- [x] 安和×4 答案卷皆萃取出是非＋選擇題與官方答案 — 118 題（62 是非＋56 選擇），答案 100%，跨年 0 重複（桃子腳見上方決策）
- [x] 去重、答案合併、驗證抽成純函式 helpers，可獨立 import 測試 — `scripts/data_helpers.py`（`normalize_text`/`dedupe_by_text`/`merge_answer`/`validate_unit_subtopic`）
- [x] pytest：重複題目文字被去重 — `TestDedupe`
- [x] pytest：有官方答案時不採用 AI 答案；無官方答案時採用 AI 答案且標記需複查 — `TestMergeAnswer`（回傳 `(answer, needs_review)`）
- [x] pytest：非法 unit／subtopic 被擋下或歸 none — `TestValidateUnitSubtopic`
- [x] 期中分類流程經回歸驗證未受影響 — `classify.py` 改用 helpers，去重 helper==inline 逐字一致；`test_midterm_dedupe_count_stable`（645 unique）
- [x] 測試以 `uv run pytest` 執行通過 — 43 passed

## 實作備註

- `classify.py`、`classify_final_min.py` 皆改用 `data_helpers`；classify_final_min 加入去重（安和×4 跨年）與 `needs_review` 欄位（安和全有官方答案 → 全 False）。
- `extract.py --input` 改為可接多檔（nargs="+"）。
- `build_questions.py` 加 id 去碰撞：安和110下 MC 題號有重複（PDF 本身 1..18,18,19,20），撞號題 id 加 `-2` 後綴，避免網站 questionMap 丟題。期中既有 6 個重複 id 屬 out-of-scope 未動。
- 期末已併入 `docs/questions.json`：720 題（1:324 2:278 3:58 4:60）。subtopic 仍全 none，正式 subtopic 由 #4 重跑覆蓋。

## Blocked by

- Blocked by `issues/002-parser-pure-module-tests.md`

## User stories addressed

- User story 3
- User story 8
- User story 29
