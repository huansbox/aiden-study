## Parent PRD

`issues/prd.md`（深模組「模組A 題目解析器」、Testing Decisions）

## What to build

把 #1 spike 期間直接改動的萃取邏輯硬化成**可測的純函式深模組**：介面為「PDF 文字 → 結構化題目」，封裝雙欄偵測、section 切分、格式A/B 偵測、是非/選擇答案正規化、題目切分、選項抽取、has_image 判斷，以及 #1 新增的 NON_TARGET 截斷（填一填/配合題/根據題意）。

加上 pytest，fixture 取自 `pdfs_期末/` 真實考卷的代表性文字片段。測試只驗證外部行為（輸入→輸出），不綁內部實作。

重構不得破壞期中既有的萃取入口（`extract.py` main 流程對期中 PDF 的結果需維持一致）。

## Acceptance criteria

- [x] 萃取核心抽成純函式（文字進、題目清單出），可獨立 import 測試 — `extract.parse_questions_from_text(text, source)`；`process_pdf` 退化為「讀檔＋logging」薄殼委派之
- [x] pytest 涵蓋：雙欄排版不切斷題目 — `TestTwoColumnDetection`
- [x] pytest 涵蓋：格式A（答案卷，括號含答案）同時抽出題目文字與答案 — `TestFormatAAnswerKey`
- [x] pytest 涵蓋：格式B（題目卷，空括號）只抽題目、答案留空 — `TestFormatBQuestionPaper`
- [x] pytest 涵蓋：是非題 O/X 及變體正規化為 true/false — `TestNormalizeTfAnswer`
- [x] pytest 涵蓋：選擇題 ①-④／數字／全形 正規化為 "1"-"4" — `TestNormalizeMcAnswer`
- [x] pytest 涵蓋：選項正確切分；含圖片題被標記 — `TestExtractOptions`、`TestHasImage`
- [x] pytest 涵蓋：NON_TARGET（含「根據題意」）正確界定目標大題邊界，不誤抽非目標題 — `TestNonTargetTruncation`
- [x] 期中 PDF 萃取結果經回歸驗證未改變 — `tests/test_regression.py`（golden＝`data/raw_questions.json`，期中 PDF 不在時自動 skip）
- [x] 測試以 `uv run pytest` 執行通過 — 28 passed

## 實作備註

- **同時修掉 001 的殘留污染**：在 `is_true_two_column` 加上「配合題/填一填答案欄（（X）(n) 型）」偵測，安和答案卷第 2 頁改判為雙欄，MC#9/#10 選項不再混入頁面右欄的配合題標籤；期中萃取結果逐字未變（已驗證）。MC#8 仍殘留頁尾「N 頁」字樣（較小，未追）。已重跑期末 pipeline，`docs/questions.json` 期末 MC 選項已乾淨。
- **golden master 更新**：補 NON_TARGET「根據題意」後，桃子腳112 期中萃取移除了原本誤抽的「根據題意」子題、並清掉 MC#15 選項④的污染（且 has_image true→false 修正）。這兩處變動皆為有意修正、且都不在部署的 `docs/questions.json` 內（期中題庫未受影響）；`data/raw_questions.json` golden 已更新反映之。
- 新增 dev 依賴 pytest；`pyproject.toml` 設 `pythonpath=["scripts"]`、`testpaths=["tests"]`。

## Blocked by

- Blocked by `issues/001-end-to-end-skeleton.md`

## User stories addressed

- User story 7
- User story 27
