# PRD：期末題目作答後說明（explanations）

> 2026-06-11 與家長 grill-me 對齊後定稿。執行分支 `feat/explanations`（worktree，自 master 切出）。

## Problem Statement

小孩在 pad 上練習三下自然期末題（unit 3 動物／unit 4 天氣，共 499 題）時，答完只看得到「答對了！／答錯了，正確答案是 X」。答錯時不知道為什麼錯、答對時也可能只是猜對，沒有任何解釋可以幫助理解與記憶，練習效果打折。

## Solution

每一題期末題目配一段 1–3 句、國小三年級聽得懂的簡短說明（不追求科學上 100% 嚴謹），作答後無論對錯都直接顯示在 feedback 文字下方的淺色卡片裡。說明由 AI 寫手生成、另一個 AI 審核者把關（可直接給修正版）、最後由主導 AI 裁決定稿；全部 499 題的說明另出一份抽查報告給家長驗收，驗收通過前不上線（不 merge master）。

## User Stories

1. As a 國小三年級學生, I want 答錯後看到一段用我聽得懂的話解釋為什麼, so that 我下次遇到同樣的題目不會再錯
2. As a 國小三年級學生, I want 答對後也看到簡短說明, so that 就算我是猜對的也能學到正確的理由
3. As a 國小三年級學生, I want 說明直接出現在答題結果下方不用點開, so that 我不會因為懶得點而跳過
4. As a 國小三年級學生, I want 是非題答「錯」的題目說明告訴我正確的說法是什麼, so that 我不只知道題目錯、還知道對的是什麼
5. As a 家長, I want 一份列出全部 499 題說明的抽查報告, so that 我可以在上線前抽查內容有沒有寫錯或不適合小孩
6. As a 家長, I want 說明用生活例子、避免課本外的深奧術語, so that 小孩自己讀就能懂、不需要我在旁邊翻譯
7. As a 家長, I want 每段說明都經過獨立的 AI 審核者檢查事實與用語, so that 我不用逐題自己驗證正確性
8. As a 維護者, I want 說明存在獨立的 JSON 檔（id → 文字）而不動既有 build pipeline, so that 與進行中的 feat/math 分支零衝突、數學那邊重 build 也不會洗掉說明
9. As a 維護者, I want 前端找不到某題 id 的說明時靜默不顯示, so that 期中題（暫無說明）與未來新增題目都向後相容
10. As a 維護者, I want 驗證/合併邏輯是有 pytest 保護的純函式, so that 未來擴充（期中、數學）重跑時有回歸保護
11. As a 維護者, I want 完成後 commit + push `feat/explanations` 但不 merge master, so that GitHub Pages 上線時點由家長驗收後決定

## Implementation Decisions

- **資料存放**：新檔 `docs/explanations.json`，格式為扁平物件 `{ "<question_id>": "<說明文字>", ... }`。不修改 `questions.json` 與 `build_questions.py`（與 feat/math 分支零衝突）。
- **前端**：`index.html` 啟動時與 `questions.json` 一同 fetch `explanations.json`（fetch 失敗或 404 視為空物件）；答題 feedback 畫面在 hint 文字下方以淺色卡片顯示 `explanations[questionId]`，查無 id 則不渲染任何元素。答對答錯顯示同一段。
- **生成編排**（Workflow，一次性）：
  - 499 題切成每批 10 題（50 批）。
  - 寫手 agent（sonnet）：每批產出 10 段說明，規格＝1–3 句、小三用語、生活例子、不用課本外術語、是非題答案為「錯」時必須講出正確說法。
  - 審核 agent（預設模型）：逐題檢查事實正確性、用語適齡、句數限制；通過則保留原文，不通過則直接給修正版並附理由。
  - 主迴圈最終裁決：審核者改寫過的條目由主導 AI 抽驗裁決後定稿。
  - 寫手與審核永遠是不同 context（角色分離）。
- **驗證/合併模組**：`scripts/build_explanations.py`，純函式深模組——輸入批次片段，驗證（id 與 499 題期末題集合完全一致、無重複、無空字串、句數/長度約束）後合併輸出 `docs/explanations.json`。比照 `build_questions.py` 的純函式＋CLI 風格，utf-8 編碼。
- **抽查報告**：`docs-dev/review_期末說明_抽查.md`，全 499 題列出（題目／正確答案／說明／審核狀態：原稿通過或審核修正），供家長驗收。
- **Git**：小步 commit 到 `feat/explanations`，push 到 GitHub，不 merge master；merge 與上線由家長驗收後決定。

## Testing Decisions

- 好的測試只驗證外部行為：給定批次片段輸入 → 驗證函式的接受/拒絕行為與合併輸出，不測內部實作細節。
- 測試對象：僅 `scripts/build_explanations.py` 的純函式（覆蓋檢查、重複 id、空值、長度約束、正常合併）。
- 先例：`tests/test_build_questions.py`、`tests/test_data_helpers.py` 的 pytest 純函式測試風格，以 `uv run pytest` 執行。
- 前端不寫 JS 測試（零依賴單檔網站無測試基礎設施），以 Playwright 實際走一輪答題流程驗證：期末題答對/答錯都顯示說明、期中題不顯示、explanations.json 缺失時網站正常運作。

## Out of Scope

- 期中題（unit 1–2）與數學題的說明（未來可沿用同一機制與同一 JSON 檔擴充）。
- 答對/答錯分開的兩版說明、逐選項解釋。
- 收合式 UI、語音朗讀等呈現變化。
- merge master 與正式上線（家長驗收後另行決定）。
- build pipeline（`build_questions.py`）的任何修改。

## Further Notes

- feat/math 分支同時有另一個 session 在作業，本功能全程在 worktree `feat/explanations` 進行，僅新增檔案＋修改 `index.html`，預期合併衝突僅 `index.html` 且可控。
- `docs/` 無 service worker，新增 explanations.json 不需處理快取清單。
- Windows cp950 環境：所有 Python 讀寫一律指定 utf-8。
