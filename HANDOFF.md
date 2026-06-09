# HANDOFF — 三下自然「期末」題庫擴充

> 給下一個 session 的交接。**真相源＝`issues/prd.md`（PRD）＋ `issues/001`～`007`（工作項）**；本檔只負責定位「目標／現況／下一步」，細節一律看 PRD 與 issue。
> 交接時間：2026-06-09。

## 一句話現況

需求已完整對齊（grill-me 六輪 + PRD + agent review），拆成 7 個 issue。**001–004 已完成（4/7）**。下一步＝`issues/005`（民權×4＋桃子腳112 的 AI 補答案＋複查清單）與 `issues/006`（網站期中/期末切換，**開工前需家長定站名**）。

- 001＝tracer（安和113下→網站可練）。
- 002＝parser 抽純函式＋pytest，修第2頁雙欄污染。
- 003＝安和×4 答案卷（118題）＋`data_helpers`（去重/答案合併/驗證）純函式＋pytest。
- 004＝classify.py 重構為可切換學期 config（`SEMESTERS` mid/final，模組C）＋正式 subtopic；期末 118 題分到 8 個 subtopic（none=0）；`classify_final_min.py` 已刪除，改用 `classify.py --semester final`。questions.json＝720題，pytest 49 passed。
- **桃子腳答案卷不可用**（與原計畫衝突）：112下 答案以紅字標選項、110下 純圖片 → 家長決策：112下走民權式 AI 補答案（併 #5）、110下放棄。詳見 issue 003 與記憶 `taozijiao-answer-keys-unusable`。

## 專案目標

既有網站只涵蓋三下自然「**期中**」（第1單元田園樂、第2單元溫度變化）。本次擴充「**期末**」（第3單元動物、第4單元天氣），沿用 `PDF 萃取 → AI 分類 → 靜態網站` pipeline，合併進同一個網站，並比期中多做：能按 subtopic（類似概念）集中練習。完整需求見 `issues/prd.md`。

## 已對齊的關鍵決策（摘要，詳見 PRD / 設計稿）

- 部署：合併成一站，期中改名保留，最上層加期中/期末切換。
- 單元：第3動物、第4天氣，`unit` 欄位＝整數 3/4（接續期中 1/2，全域唯一）。
- 分類：兩層 unit→subtopic，**以桃子腳國小範圍為基準**，範圍外標 `none` 排除。
- subtopic：動物{動物分類/身體構造/生存與適應/觀察方法}、天氣{風/氣溫測量/雨量降雨/天氣預報}。
- 題型：先做是非＋選擇；填一填/配合題 out of scope。
- 答案：官方答案卷為主（安和4＋桃子腳2），民權4 份無答案卷 → AI 補＋標記複查。
- 測試：只測 Parser 與資料處理 helpers（Python 純函式），JS 不測。

## 現有素材與位置

- 來源 PDF：`pdfs_期末/`（10 份現行課綱期末，民權4/安和4/桃子腳2；其中安和4＋桃子腳2 含官方答案卷）。
- 考卷清單 JSON：`data/tcool_grade3_sci_kanghsuan.json`。
- 設計稿：`docs-dev/exam-final-pipeline-design.md`（pipeline 與網站設計）、`docs-dev/exam-paper-sourcing.md`（考卷怎麼抓、課綱界線）。
- 現有 pipeline：`scripts/extract.py`、`scripts/classify.py`；網站：`docs/index.html`、題庫 `docs/questions.json`。

## 進度（0/7 已實作）

| Issue | 標題 | 類型 | Blocked by | 狀態 |
|---|---|---|---|---|
| 001 | 端到端骨架（tracer） | AFK | — | ☑ 完成 |
| 002 | Parser 抽純函式 + pytest | AFK | 001 | ☑ 完成 |
| 003 | 6 份答案卷萃取 + helpers + pytest | AFK | 002 | ☑ 完成（桃子腳改走 #5/排除）|
| 004 | AI 分類器可切換 taxonomy + subtopic | AFK | 003 | ☑ 完成 |
| 005 | 民權 AI 補答案 + 複查標記 | AFK | 004 | ☐ |
| 006 | 網站期中/期末切換 + 站名 + 三模式 | **HITL** | 001 | ☐ |
| 007 | 網站 subtopic 練習 | AFK | 004, 006 | ☐ |

```
001 ─┬─ 002 ── 003 ── 004 ─┬─ 005
     │                      └─ 007
     └─ 006 ─────────────────┘
```

資料線（002→003→004→005）與網站線（006）在 001 後可平行；007 收口需 004＋006。

## 下一步

1. **建議起手＝`issues/001`**（端到端骨架，最低風險、可立即驗證萃取品質）。
2. 平行可推：**`issues/006`**，但**開工前需家長先定「站名」**（issue 006 內有 DECISION 欄位）。

## 已知事實與坑（避免重踩）

- **答案卷＝期中「格式A 內嵌答案」**：與題目卷同版面但括號已填答案、題目全文俱在 → 有答案卷的學校直接對**答案卷**跑 `extract.py` 一次取得題目＋官方答案，不必另寫對齊。
- **桃子腳 NON_TARGET**：版面為「一、單選題（target）→ 二、根據題意回答問題（non-target）→ 三、閱讀短文」。把「根據題意」加進 `NON_TARGET_SECTION` 是用來界定單選題大題結尾、**不會截斷選擇題**；不加反而會吃進後面填空題文字。
- **課綱界線**：三年級自然 110下 起才是現行 108 課綱；108下/109下 屬舊課綱，已排除、勿納入。
- **subtopic 早已是資料欄位**，期中站只是 UI 沒用到 → 「再細分」主要是 UI 工作。
- **Parser 未硬化窗口**：001 會直接小改 `extract.py`（補 NON_TARGET）但要到 002 才有測試；001→002 之間改動需最小化、勿動期中萃取邏輯。
- 若要再抓 tcool.cc 的 PDF（補期中或其他卷）：PDF 端點被 Cloudflare 擋，流程見 `docs-dev/exam-paper-sourcing.md`（Playwright 取 cf_clearance 交接 PowerShell）。

## 尚待決定（低風險，已給預設）

- 合併後**站名**（issue 006 DECISION，家長定）。
- 民權 AI 答案**複查清單形式**（issue 005 預設沿用 `skipped_questions.md` 風格，可後改）。

## Git 狀態

- gitignore 已釐清：`pdfs/`、`pdfs_期末/` 皆已 ignore（PDF 不進 repo）；`data/*.json`（期中 raw/classified）本就被追蹤 → 期末版同樣 commit，符合既有慣例。無需改 gitignore。
- 001 在 branch `feat/期末-001-skeleton` 實作。實作後續 issue 依慣例開 branch（`feat/期末-xxx`）。
