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

- [ ] SYSTEM_PROMPT／合法 subtopic 改為注入式 config，期中/期末各一份
- [ ] 期末題目分類出正確的 unit(3/4) 與 8 個 subtopic 之一
- [ ] 範圍外題目標 `none` 並排除於練習
- [ ] `docs/questions.json` 中期末題目帶有正式 subtopic（取代 #1 的全 none）
- [ ] pytest：期末 config 下非法 subtopic 被擋
- [ ] 期中分類以同一套程式＋期中 config 重跑結果一致
- [ ] 抽樣核對分類正確率（信心低者進複查）

## Blocked by

- Blocked by `issues/003-answer-key-extraction-helpers.md`

## User stories addressed

- User story 5
- User story 6
- User story 28
- User story 29
