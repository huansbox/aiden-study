> 類型：AFK

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

數學 pipeline 第一條 tracer bullet：**只用桃子腳 112下**（基準卷，題目＋答案卷文字皆可直抽），把「萃取 → 最小分類 → 官方答案注入 → 併入題庫 → 網站可練」整條脊椎打通。題型只收選擇題（沿用 `multiple_choice`，UI 零改動——已核對 `submitAnswer` 是字串比對，數學選擇題直接相容）。

範圍刻意最小化，未知數先壓低（比照自然科 001 模式）：

- **math parser 走獨立模組**（如 `extract_math.py` 或獨立 config），**禁止改動自然科共用 regex**（`NON_TARGET_SECTION`/`SECTION_PATTERNS`——經驗筆記明示動了會波及期中 golden）。
- **分數排版亂序題標記跳過**：PDF 文字層會把分數拆成分子/分母亂序（如「2 個 4/10」變「2 個 …10…4」）。本片**不解這題**，凡偵測到亂序疑慮的題進跳過清單（沿用 `skipped_questions.md` 機制）供確認，重組 spike 留給 010。
- **最小分類（釘死）**：`unit` 值域只取 5–9 或 `none`（從考卷大題/評量範圍標頭可推），**subtopic 一律 `none`**——正式 taxonomy 與單元名稱查證留給 010，不在此重跑 AI。
- **官方答案**：寫答案卷括號內答案（`（ 1 ）`式）的抽取規則，注入後 needs_review=False。
- 安和 113下 **條件式順收**：勘查其大題結構，與桃子腳差異小就一起跑；差異大則整卷挪到 010，不讓未盤查的卷綁死 tracer。

## Acceptance criteria

- [ ] 桃子腳 112下 選擇題（5 題）萃取題幹＋選項正確，官方答案 100% 對 PDF 核對
- [ ] 分數亂序疑慮題全部進跳過清單，無一混入題庫（題庫內題目逐題目視核對）
- [ ] math parser 為獨立模組，自然科 `extract.py` 共用 regex 零改動；期中/期末既有 pytest 全綠
- [ ] math parser 有自己的 pytest fixture（桃子腳卷文字樣本 → 預期題目結構）
- [ ] 分類產出 `unit`∈{5..9, none}、`subtopic` 全 `none`，併入 `docs/questions.json`（subject=`math`）
- [ ] 網站數學科目下可實際練到這批選擇題 —— Playwright 實測
- [ ] 安和 113下：勘查結論寫入本 issue（順收或挪 010），若順收則上述條款同樣適用

## Blocked by

- Blocked by `issues/008-subject-dimension.md`

## 對應設計稿章節

- 「Scope 決議」大題一（選擇題）
- 「Pipeline」第 1–3、5 步
- 「卷源」：桃子腳答案卷文字可直抽
