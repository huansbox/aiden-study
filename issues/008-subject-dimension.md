> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

科目維度的 walking skeleton：題庫 schema 加 `subject` 欄位、網站首頁加科目層（自然／數學切換，數學暫為空狀態），自然科一切照舊。這片不產出任何數學題，目的是讓後續每片都有「上線可練」的容器。

釘死的決策：

- **數學 unit 直接用課本單元號 5–9**，與自然 1–4 不重疊 → localStorage **留在 v2**：challenge（`"3"`/`"3/動物分類"` 式鍵）、errorBank、stats、flagged 全部不動，subject 只是 UI 分組層。`State.init` 的 default-fill 模式加 `state.subject` 欄位（記住目前科目）。
- `build_questions.py` 現況是雙來源（保留 unit 1–2、從 classified_期末 重建 3–4），本片改成**三來源**（保留 1–4、預留重建 5–9）＋全題補 subject（舊題回填 `"science"`）。這是結構重構，不是「加個欄位」等級的小改。
- `SEMESTERS`（mid/final → units）結構重構成「科目 → 學期分組」，渲染邏輯 config 驅動不變。

已知未來債（備註即可，本次不解）：「unit 全域唯一」靠 5–9 不撞 1–4 成立，僅限三下範圍；未來若加三上（兩科都從 unit 1 起編）就撞號，屆時 localStorage 鍵需帶 subject 前綴。

## Acceptance criteria

- [x] `docs/questions.json` 全題含 `subject` 欄位（既有 1101 題回填 `science`），id/unit/題數與重構前完全一致（diff 驗證：+1101 行全為 subject，0 刪除）
- [x] `build_questions.py` 三來源結構：自然 unit 1–4 保留、數學 unit 5–9 重建入口預留（空輸入時產出 0 題不報錯；`tests/test_build_questions.py` 5 案例）
- [x] 首頁出現科目層：自然（現有四單元入口照常）／數學（空狀態「題庫準備中」，無學期切換、無壞入口）
- [x] 自然科全功能回歸：三種練習模式、subtopic 練習、flag 回報/還原、錯題庫、stats —— Playwright 實測通過（2026-06-11）
- [x] 既有 localStorage 進度（challenge/errorBank/stats/flagged）升級後完整保留（植入無 subject 的 v2 存檔驗證）
- [x] `uv run pytest` 全綠（54 passed）

## 完成紀錄（2026-06-11）

- commits：`297e75c`（build 三來源＋subject 回填）、`10da6a7`（科目層 UI）
- 附帶決策：站名改科目中性「三下練習」（title/manifest/apple-title）；首頁 h1 依科目動態顯示「三下自然練習／三下數學練習」
- 數學單元名稱暫為「第 N 單元」佔位（無題不渲染），正式名稱待 010

## Blocked by

None - can start immediately

## 對應設計稿章節

- 「資料 schema」：subject 欄位
- 「UI / 題型引擎」：科目層
- 「尚待決定」：localStorage v2 vs v3 —— 本片釘死為 v2
