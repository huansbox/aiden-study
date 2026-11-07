# 家長備考速查 PDF

由 [#255](https://github.com/huansbox/aiden-study/issues/255) 追蹤，沿用本 task，不新增孩子 App。

主要成品是數學12頁、自然8頁 PDF，以「觀念／技術＋玩具版考題」兩欄逐項列出。數學56列、自然38列，涵蓋原37項核心；U8保留已接受試閱的14列、兩頁。每列保留一項獨立觀念或技術，含原題簡化與依核心能力抽取的短題；逐題類型及改寫差異記於私人證據。網頁只提供開啟與下載，沒有答案、陪讀步驟或互動勾選，也不連家庭 API。

## 來源與產物

- `content.json`：保留既有37項完整原創內容與考法來源，作核心涵蓋依據；不直接發布為舊互動頁。
- `toy-reference.json`：現行 PDF 的唯一可編輯內容來源，含獨立列、原創短題與向量圖。以 `legacyIds` 連回37項核心；已移除舊三欄摘要 `quick-reference.json`，不維護雙正本。
- `build-pdf.py`：單一 ReportLab 產生器；正文12.2pt，各單元起新頁，依內容自動分頁，每列完整留在同頁。檢查37項涵蓋、字型字元、圖形／標籤邊界及頁底邊界。U8第7列明確換頁，以保留接受的試閱分組。
- `verify-pdf.py`：核對 PDF 的全文、圖中文字、頁數、字型嵌入、逐列 hash、37項涵蓋與網站副本。
- `../../output/pdf/`：兩份 PDF 原稿與 `manifest.json`。manifest 記錄來源 hash、PDF hash、字型、新列 ID／hash／頁碼及37項核心到新列的多對多映射；是內部重建／涵蓋對照，不放進 PDF 或家長網頁。
- `template.html`、`guide.css`、`build.mjs`：產生 `docs/parent/exam2-guide/` 的簡潔入口，並逐位元複製 PDF。不要手改兩份產物。

## 重建

在 repo 根目錄，沿用專案 `.venv`：

```powershell
uv pip install --python .venv/Scripts/python.exe -r learning-tasks/grade4-sem1-exam2/source/parent-guide/requirements.txt
.venv/Scripts/python.exe learning-tasks/grade4-sem1-exam2/source/parent-guide/build-pdf.py
node learning-tasks/grade4-sem1-exam2/source/parent-guide/build.mjs
node learning-tasks/grade4-sem1-exam2/source/parent-guide/build.mjs --check
.venv/Scripts/python.exe learning-tasks/grade4-sem1-exam2/source/parent-guide/verify-pdf.py
```

預設使用 Windows 的 Microsoft JhengHei Regular／Bold，PDF 內嵌所用字元。其他機器以 `--font`、`--bold-font` 指定可嵌入的正體中文 TrueType 字型（或 `PARENT_GUIDE_FONT`、`PARENT_GUIDE_BOLD_FONT`）。相同字型與套件可重建相同 PDF；換字型需重新產生、渲染及視讀。`--output <dir>` 可在另一目錄重建比對。`--check` 不需 Python／字型，會核對正規化換行後的來源 hash、PDF hash 及網站副本。

內容或排版修改後，用 Poppler `pdftoppm -png` 渲染全部頁並實際視讀，另外執行上述文字／涵蓋核對。向量圖使用左上角原點；文字 `y` 為 baseline，`anchor` 為 `start`／`middle`／`end`，座標單位為 pt。支援 line、rect、circle、polygon、text，文字至少9.5pt；圖以實際尺寸繪製，不暗中縮小。變更角度、刻度或電路接點後，需由內容作者核對實際渲染結果。數學減號使用 ASCII `-`，避免預設字型缺字。

網頁無 JavaScript；開啟與下載連結帶同一個 PDF SHA 短版 query，避免同檔名舊快取；下載檔名固定。本機可執行 `.venv/Scripts/python.exe -m http.server 8765 --bind 127.0.0.1 --directory docs`，由 `/parent/exam2-guide/` 核對開啟／下載。

改登錄後依任務庫規則執行 catalog build／check，不能手改生成清單。既有舊互動頁的 localStorage 不再讀寫；不刪除使用者資料。

## 內容依據與界線

沿用 [上次數學分類報告](../../../../docs-dev/grade4-math-pattern-counts.md) 的「單元→概念→推理／作答方法」。考法來自已核對原卷，不以活動數推估考試頻率；舊卷考期與單元順序不直接當作本輪範圍。範圍依115康軒暫定數學U6-U10、自然U3-U4，校方正式公告仍未取得。

保留三角板／直尺量畫、統計圖、數線、直式、列式、電路自由畫圖與自行舉例。等腰底角相等、等腰直角45°、正三角形60°是本次核心；一般三角形內角和180°屬後續延伸，未列入本次核心。亮度比較保留同規格電池／燈泡及適用材料條件，不採有爭議的強迫排序。缺損題、條件衝突及本輪範圍外題不作依據。

逐項原卷證據、原件 SHA 與前次獨立審查在 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-parent-guide-2026-11-07/`；完整37項證據在 `v2/evidence-ledger.json`。本版逐列來源、私用答案、涵蓋核對在 `concepts-examples-release/math/`、`science/`；整合視讀頁與驗證在 `concepts-examples-release/integration/`。U8原試閱在 `u8-toy-preview/`。凍結的 `freeze-v1/`、`v2/` 與舊三欄版 `pdf-revision/` 不覆寫。公開 PDF 與玩具題原稿不含原卷題文、原圖、答案或私人路徑；圖形皆為原創重畫。
