# 家長備考速查 PDF

由 [#255](https://github.com/huansbox/aiden-study/issues/255) 追蹤，沿用本 task，不新增孩子 App。

主要成品是數學2頁、自然1頁 PDF。每列一概念群，只保留「範圍／要會什麼／考卷怎麼考」；網頁提供開啟與下載入口。沒有問孩子的台詞、答案、陪讀步驟或互動勾選，也不連家庭 API。

## 來源與產物

- `content.json`：保留既有37項完整原創內容與考法來源，作濃縮依據；不直接發布為舊互動頁。
- `quick-reference.json`：PDF 可編輯摘要與分頁；沿用原項目 ID，數學23項、自然14項。
- `build-pdf.py`：單一 ReportLab 產生器；PDF 每列完整排在同一頁，檢查字型字元與頁底邊界。
- `../../output/pdf/`：兩份 PDF 原稿與 `manifest.json`。manifest 記錄來源 hash、PDF hash、字型及37項 ID 對應頁碼；是內部重建／涵蓋對照，不放進 PDF 或家長網頁。
- `template.html`、`guide.css`、`build.mjs`：產生 `docs/parent/exam2-guide/` 的簡潔入口，並逐位元複製 PDF。不要手改兩份產物。

## 重建

在 repo 根目錄，沿用專案 `.venv`：

```powershell
uv pip install --python .venv/Scripts/python.exe -r learning-tasks/grade4-sem1-exam2/source/parent-guide/requirements.txt
.venv/Scripts/python.exe learning-tasks/grade4-sem1-exam2/source/parent-guide/build-pdf.py
node learning-tasks/grade4-sem1-exam2/source/parent-guide/build.mjs
node learning-tasks/grade4-sem1-exam2/source/parent-guide/build.mjs --check
```

預設使用 Windows 的 Microsoft JhengHei Regular／Bold，PDF 內嵌所用字元。其他機器以 `--font`、`--bold-font` 指定可嵌入的正體中文 TrueType 字型（或 `PARENT_GUIDE_FONT`、`PARENT_GUIDE_BOLD_FONT`）。相同字型與套件可重建相同 PDF；換字型需重新產生、渲染及視讀。`--output <dir>` 可在另一目錄重建比對。`--check` 不需 Python／字型，會核對正規化換行後的來源 hash、PDF hash 及網站副本。

內容或排版修改後，用 Poppler `pdftoppm -png` 渲染全部頁並實際視讀，另外用 pypdf 核對文字、頁數與中文字型嵌入。網頁無 JavaScript；本機可執行 `.venv/Scripts/python.exe -m http.server 8765 --bind 127.0.0.1 --directory docs`，由 `/parent/exam2-guide/` 核對開啟／下載。

改登錄後依任務庫規則執行 catalog build／check，不能手改生成清單。既有舊互動頁的 localStorage 不再讀寫；不刪除使用者資料。

## 內容依據與界線

沿用 [上次數學分類報告](../../../../docs-dev/grade4-math-pattern-counts.md) 的「單元→概念→推理／作答方法」。考法來自已核對原卷，不以活動數推估考試頻率；舊卷考期與單元順序不直接當作本輪範圍。範圍依115康軒暫定數學U6-U10、自然U3-U4，校方正式公告仍未取得。

保留三角板／直尺量畫、統計圖、數線、直式、列式、電路自由畫圖與自行舉例。等腰底角相等、等腰直角45°、正三角形60°是本次核心；一般三角形內角和180°屬後續延伸，未列入本次核心。亮度比較保留同規格電池／燈泡及適用材料條件，不採有爭議的強迫排序。缺損題、條件衝突及本輪範圍外題不作依據。

逐項原卷證據、原件 SHA 與前次獨立審查在 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-parent-guide-2026-11-07/`；最新完整37項證據在 `v2/evidence-ledger.json`。PDF 改版的逐項來源對照、視讀頁及驗證在 `pdf-revision/`。凍結的 `freeze-v1/`、`v2/` 不覆寫。公開 PDF 僅含原創摘要，不複製原卷題文、圖片或答案。
