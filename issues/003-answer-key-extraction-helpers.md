## Parent PRD

`issues/prd.md`（深模組「模組B 資料處理 helpers」、Implementation/Testing Decisions）

## What to build

把萃取範圍從 #1 的單一答案卷擴展到**全部 6 份有官方答案的期末考卷**（安和 110/111/112/113 下，桃子腳 110/112 下），並把分類流程中混在一起的資料處理邏輯抽成**可獨立測試的純函式 helpers**：

- **去重**：以正規化題目文字為鍵去重（目前內嵌在 `classify.py` 的 main 流程，抽出成 helper）。
- **答案合併**：有原始（官方）答案時用官方、無時用 AI 補（並標記需複查）的優先序邏輯。
- **驗證**：`unit`/`subtopic` 合法性檢查。

加 pytest（取自真實資料）。抽出去重邏輯後，期中既有分類流程需回歸驗證未受影響。

## Acceptance criteria

- [ ] 6 份答案卷皆萃取出是非＋選擇題與官方答案
- [ ] 去重、答案合併、驗證抽成純函式 helpers，可獨立 import 測試
- [ ] pytest：重複題目文字被去重
- [ ] pytest：有官方答案時不採用 AI 答案；無官方答案時採用 AI 答案且標記需複查
- [ ] pytest：非法 unit／subtopic 被擋下或歸 none
- [ ] 期中分類流程經回歸驗證未受影響
- [ ] 測試以 `uv run pytest` 執行通過

## Blocked by

- Blocked by `issues/002-parser-pure-module-tests.md`

## User stories addressed

- User story 3
- User story 8
- User story 29
