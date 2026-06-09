## Parent PRD

`issues/prd.md`

## What to build

端到端 tracer bullet：取一份**有官方答案卷**的期末考卷（安和國小 113下，已驗證可解析），跑通「萃取 → 最小分類 → 併入題庫 → 網站可練」整條脊椎，證明 pipeline 與網站能容納期末資料。

範圍刻意最小化，未知數先壓低：
- **萃取**：直接對安和 113下**答案卷**（＝期中「格式A 內嵌答案」，題目＋官方答案同頁）跑現有 `extract.py`，取是非＋選擇題。
- **NON_TARGET 最小新增**：把期末出現的非目標大題標題（填一填、配合題、根據題意回答問題）加入截斷規則。已確認桃子腳/安和版面為「單選題大題在前、根據題意大題在後」，加入「根據題意」是用來界定單選題大題結尾、不會截斷選擇題（見 PRD Further Notes）。
- **最小分類（釘死，避免與 #4 重做）**：用臨時期末 SYSTEM_PROMPT 跑分類，`unit` 值域只取 `3`(動物)/`4`(天氣)/`none`，**subtopic 一律填 `none`**（正式 subtopic 留給 #4，不在此重跑 AI）。
- **題庫單檔（釘死）**：期末題目以整數 `unit` 3/4 直接 append 進現有 `docs/questions.json`，schema 同期中。
- **網站最小 stub**：讓 unit 3/4 的題目在網站上「練得到」即可（沿用現有單元層級練習機制；不做正式期中/期末切換，正式切換留給 #6）。

US30（排除舊課綱）不需程式邏輯，靠 `pdfs_期末/` 只放現行課綱（110下~113下）的手動選卷保證；驗證方式＝確認輸入卷皆為現行課綱。

## Acceptance criteria

- [ ] 對安和 113下答案卷萃取出是非＋選擇題，題目文字與官方答案正確（抽樣核對數題）
- [ ] 「根據題意回答問題／填一填／配合題」大題內容未被當成是非/選擇題誤抽
- [ ] 萃取結果寫入期末 raw 中間檔
- [ ] 最小分類產出 `unit`∈{3,4,none}、`subtopic` 全為 `none` 的題目
- [ ] 期末題目併入 `docs/questions.json`（unit 為整數 3/4，schema 與期中一致）
- [ ] 開啟網站能練到 unit 3 與 unit 4 的題目（是非點 O/X、選擇點選項）
- [ ] 期中既有題目與練習不受影響

## Blocked by

None - can start immediately

## User stories addressed

- User story 1
- User story 2
- User story 3
- User story 12
- User story 13
- User story 22
- User story 23
- User story 24
- User story 26
- User story 30
