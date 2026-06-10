> **狀態：已完成**（2026-06-09 merge 部署）。歷史工作項紀錄，不再更新；現況見 `HANDOFF.md`。

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

- [x] 對安和 113下答案卷萃取出是非＋選擇題，題目文字與官方答案正確（抽樣核對數題）— 25 題（15 是非＋10 選擇），答案 100% 正確
- [x] 「根據題意回答問題／填一填／配合題」大題內容未被當成是非/選擇題誤抽 — 補 `填一填`/`根據題意` 到 `NON_TARGET_SECTION`，截斷生效
- [x] 萃取結果寫入期末 raw 中間檔 — `data/raw_questions_期末.json`
- [x] 最小分類產出 `unit`∈{3,4,none}、`subtopic` 全為 `none` 的題目 — `scripts/classify_final_min.py` → `data/classified_questions_期末.json`（3:13, 4:12, none:0）
- [x] 期末題目併入 `docs/questions.json`（unit 為整數 3/4，schema 與期中一致）— `scripts/build_questions.py`，合併後 627 題
- [x] 開啟網站能練到 unit 3 與 unit 4 的題目（是非點 O/X、選擇點選項）— Playwright 實測通過
- [x] 期中既有題目與練習不受影響 — 期中 602 題逐筆比對 HEAD 完全相同；localStorage 進度保留

## 實作產出 / 002 待硬化（已知殘留）

- 新增 `scripts/classify_final_min.py`（001 tracer 專用，#4 會以可切換 taxonomy 正式版取代）、`scripts/build_questions.py`（classified→docs/questions.json 合併，冪等）。
- `extract.py` 改動：補 NON_TARGET（`填一填`/`根據題意`）、`main()` 加 `--input`/`--output`（不動期中萃取邏輯）。
- **殘留污染（#2 硬化目標）**：安和答案卷第 2 頁被判定為「非雙欄」（右欄＝配合題答案，題號 pattern 不足 3 個），改用整頁萃取→左右欄逐行交錯，導致 MC#8/9/10 尾端混入頁碼與配合題標籤（如 MC#9 選項顯示「1B.風力 東風」）。答案正確、不影響作答，但選項文字髒。#2 寫 pytest 時以此為案例修 `is_true_two_column` 對「配合題答案式右欄」的偵測。
- **既有期中資料**：merge 時偵測到 6 個重複 id（北市內湖112、新北安和109），屬期中資料品質問題，PRD 明列期中內容調整 out of scope，未動。

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
