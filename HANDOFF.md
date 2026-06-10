# HANDOFF — 三下自然「期末」題庫擴充

> 給下一個 session 的交接：定位「現況／下一步／別重踩的坑」。細節真相源：
> [`issues/prd.md`](issues/prd.md)（PRD）＋ `issues/001`～`007`（原始工作項，**皆已完成**）；
> pipeline 與踩坑：[`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)；
> 考卷來源與蒐集狀態：[`docs-dev/exam-paper-sourcing.md`](docs-dev/exam-paper-sourcing.md)；
> 設計稿：[`docs-dev/exam-final-pipeline-design.md`](docs-dev/exam-final-pipeline-design.md)。

## 現況（2026-06-10）

期末題庫已上線，做過三批擴充：
- **第一批（issues 001–007，臺北＋新北）**：建立 `PDF→萃取→分類→網站` pipeline，期中/期末切換＋subtopic 練習。已完成並 merge 到 master。
- **第二批 Stage 1（其他縣市官方答案卷）**：全台掃描找新卷，併入 100 題官方答案（三民111、四維112、廣興111、廣興112）。已 merge 到 master。
- **第二批 Stage 2（7 份無官方答案卷）**：大墩113/112、文心112/111、路上111、永安113、東光113 → 萃取 178 題、AI 判答、**單票盲審 review B**（148 題、95.3% 一致、7 分歧人工定奪）→ +160 題入庫。路上111 意外是格式A 內嵌答案（16 題官方答案）。在 branch `feat/final-stage2-ai-answers`。

**題庫現況**：`docs/questions.json` 共 1101 題（期中 602＝unit1 324＋unit2 278；期末 499＝unit3 250＋unit4 249）。`uv run pytest` 49 passed。部署＝push master → GitHub Pages 自動從 `/docs` 上線。

**複查清單**：`review_期末_ai答案.md` 共 266 題 AI 補答案待家長核對（review A＋B 已盲審過一輪，分歧已定奪；清單供最終人工抽查）。

## 單票盲審做法（review B 已工具化）

1. `uv run python scripts/build_review_blind.py`（從 `classified_questions_期末_新增.json` 產 `data/_review_blind.json` 盲版，只含會進題庫的 needs_review 題）
2. 平行開 N 個 agent，各盲答一段 index 範圍（agent 自己 Read 盲版檔，args 只給範圍）
3. 比對盲答 vs classified 記錄，只列分歧；**先查主題庫先例**（同概念題的既有答案）再定奪，課綱外爭議可 websearch（如百葉箱題）
4. 定奪結果寫回 `_新增` 檔再 merge

## 暫緩項（次要，可不做）

- **海佃110**：選擇有官方答案、是非空白；但 header「對的畫○錯的打✕」被底線打散＋「選出正確的號碼」不在 SECTION_PATTERNS＋後段配合題無 NON_TARGET 邊界 → 需動通用 regex（影響期中 regression），產出低。
- **三民111 是非**：答案卷雙欄打散，是非 12 題只抽到 6（#2,3,5,9,10,12），抽到的對齊正確；補齊需改善雙欄處理。
- **整卷掃描圖片無法處理**：草港112、內安111/112（連題幹都抽不到，已跳過）。

## 別重踩的坑（仍適用）

- **答案卷＝格式A 內嵌答案**：題目卷與答案卷同版面、答案在前置括號（如安和、三民）→ 直接對**答案卷**跑 `extract.py` 一次取得題目＋官方答案。
- **掃描圖片答案卷**（chars≈0 或紅字標選項）：用 `render_pdf.py`＋`crop_pdf.py` 切 2×2 象限放大親讀官方答案 →`official_answers_*.json`→`apply_answer_key.py` 注入。**整頁縮圖 OCR / sonnet agent 不可靠**，務必象限放大由主模型親讀，並用 `crosscheck_official_ai.py` 與 AI 判答交叉比對。
- **PUA 選項標記**：某些題目卷的 ①②③④ 是私用區碼位 U+F06A–E，已在 `extract.py` 的 `normalize_pua()` 修掉。遇「選擇題抽到但 opts=0」先疑此。
- **改 `extract.py` 的 SECTION_PATTERNS / NON_TARGET 會動到期中** → 改完務必 `uv run pytest`（`tests/test_regression.py` 比對期中 golden）。
- **課綱界線**：三年級自然 110下 起才是現行 108 課綱；108下/109下 屬舊課綱，排除勿納。
- **claude -p 批次逾時**：期末用 sonnet、batch 15、timeout 300s；若見 `classify_reason=="分類失敗"` 的 none 是逾時造成，需重跑。
- **再抓 tcool.cc PDF**：PDF 端點被 Cloudflare 擋，流程見 `docs-dev/exam-paper-sourcing.md`（`sweep_tcool.ps1` 查清單；Playwright 取 cf_clearance 交接 `download_tcool.ps1` 下載）。

## 已對齊的題庫結構（參考）

- `unit`＝整數 1–4（期中 1 田園樂／2 溫度變化；期末 3 動物／4 天氣），全域唯一。
- 兩層 unit→subtopic：動物{動物分類/身體構造/生存與適應/觀察方法}、天氣{風/氣溫測量/雨量降雨/天氣預報}，以桃子腳國小範圍為基準，範圍外標 `none` 排除。
- 題型：只做是非＋選擇；填一填/配合題/題組 out of scope。
- 答案：官方優先（needs_review=False）；無官方則 AI 補＋標 needs_review 進複查清單。
- 哪些是 AI 補：classified 的 `needs_review`；`docs/questions.json` 不帶此欄，只能靠 `source` 區分。
