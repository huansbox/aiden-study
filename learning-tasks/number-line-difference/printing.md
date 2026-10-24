# 紙本使用與重建

這份紙本接在固定五題的 Pad 教學後。先做過渡卷，再用獨立卷練習把相同畫法帶回紙上；兩卷不沿用 Pad 的數值組合，也不互抄數值組合。

## 列印與使用

三份都是黑白 A4，建議以原始大小、單面列印。

| 成品 | 頁數與內容 | 用法 |
| --- | --- | --- |
| [過渡卷](output/pdf/number-line-transition.pdf) | 4 頁，5 題；初階 2＋中階 3 | 中階先填「為了求＿＿，要先求＿＿」；逐題減少預畫弧線、目標線與預填段名，讓孩子自己接手。 |
| [獨立卷](output/pdf/number-line-independent.pdf) | 4 頁，5 題；初階 2＋中階 3 | 只提供題幹與端點數線，孩子自行規劃、畫弧線、選每一步目標、標長度與列式。 |
| [家長解答](output/pdf/number-line-parent-answers.pdf) | 6 頁，紙本全部 10 題 | 與孩子卷分開；每道中階含左右兩路，說明為了求目標，為何要先算中間段。 |

兩份孩子卷的初階兩題同頁，中階每題各用一頁，保留畫線與書寫空間。圖採上下分側的淺弧線：先畫已知段與長度，再選這一步要算的段，畫粗橫線與下框；找出共端點的長段、短段後，自己計算，將結果填回下框，再補成後續可用的弧線。未知長度的下框保留空白，不在框內再印「□」。

算式一律由目標開始：`甲乙 9 = 甲丁 24 - 乙丁 15`。每個數字上方或旁邊都寫出段名，不能只填三個數字。過渡卷上排是段名、下排是數字，依「目標段 = 長段 - 短段」填寫；第 1 題預填三個段名，第 2 題留一個段名自行寫，第 3 題只預填第一步目標，第 4 題起段名自行寫。預畫已知弧線由三條、兩條、一條退到零條；第 1 至 4 題先畫好第一步目標粗線與下框，第 5 題由孩子自行選路與補圖。

過渡卷每道中階先填「為了求＿＿，要先求＿＿」，把最後目的與第一步連起來。第 3 題從左側想、第 4 題從右側想、第 5 題自選；不把兩步的全部段名與數字預填。家長可指著最後要用的長段問「已知這整段，還缺哪一段，才能扣出目標？」例如求乙丙時，已知甲丙，但還缺甲乙，所以先求甲乙。獨立卷不預填思考句、算式或中間解法，讓孩子自行規劃。

核答先看段名，再看數字：長、短兩段必須共用一個端點，而且短段包含在長段內。數值相同的另一段不能代替；數線沒有單位，也不按比例，不能量圖猜答案。家長圖以實線弧表示題目已知、虛線弧表示算出的新段、粗橫線與下框表示題目要求的段，黑白列印也能分辨。完整圖標出左右兩條合法路線會用到的段名與數字。

## 唯一題目來源

[source/problems.json](source/problems.json) 保存固定 15 題：`sets.pad`、`sets.transition`、`sets.independent` 各五題。Pad 的 ID 固定為 `p1` 至 `p5`；紙本題目不參與 Pad 的一次性獎勵判定。

每題包含顯示端點、已知線段、目標線段、答案與逐步解法。內部段名一律使用由左至右的英文端點 ID；`points[].label` 決定實際顯示甲乙丙丁或 ABCD。初階仍使用四點的 AC／BD／AD 結構，分別求左側 AB 或右側 CD，延續原題畫法。

`routes` 列出所有最短合法減法路線；初階一次、中階兩次相減，中階保留左右兩路。獨立測試從三個依序排列的端點建立「整段、左段、右段」關係，以 BFS 證明最少需要 1／2 次相減，也檢查合法相加與相減混用不會更快；不用數值巧合當作線段推導。紙本測試另外由已知段重建端點座標，獨立核對全部 10 題答案與每一步數值。

## 重建

在 repo 根目錄執行：

```powershell
uv run learning-tasks/number-line-difference/source/build_paper.py
uv run learning-tasks/number-line-difference/source/build_paper.py --check
node --test tests/test_number_line_problems.mjs
uv run pytest tests/test_number_line_paper.py -q
```

產生器以 PEP 723 宣告 Python 3.13 與 ReportLab，沿用 `uv` 執行，不修改 repo 根目錄的 dependencies。三份 PDF 產生在本 task 的 `output/pdf/`；固定的 PDF metadata 可讓 `--check` 比對來源與產物，該選項不改檔。

預設使用 Windows 內建 Microsoft JhengHei 的 `C:/Windows/Fonts/msjh.ttc` 與 `msjhbd.ttc`，PDF 已嵌入字型，列印端不需另裝。其他製作機可用 `--font` 與 `--bold-font` 指定支援正體中文的 TrueType 字型；換字型後應重建並重新檢查排版。

網頁產生器會把三份 PDF 複製到 `docs/number-line-difference/print/`，供 Pad 的列印連結使用。來源仍以本 task 為準，不另改網頁產物。

## 紙本驗證

改過題目或排版後，先跑數學測試、重建與 `--check`，再用 Poppler 的 `pdftoppm` 將三份 PDF 的全部 14 頁 render 成 PNG，逐頁確認：

- 上下弧線端點、段名與數字一致，標籤、端點文字、粗目標橫線與下框不互壓。
- 過渡卷每個數字有段名欄，獨立卷保留自行畫圖、列式的空間。
- 中階兩路的每一步都能對回圖上的同一段；思考空格能自行書寫，家長解答有每路先求中間段的原因。
- 黑白、A4、頁碼、中文字型與邊界正常，沒有裁字或缺字。

私人來源照片不隨 Git 公開。五題與中間段理由改版的逐頁渲染證據見 [#247](https://github.com/huansbox/aiden-study/issues/247)，證據放在 Dropbox 相對路徑 `mywork/aiden-study/number-line-difference/five-step-why/qa/paper/`，穩定 PDF 副本放在同層的 `output/`；本機於 2026-10-24 查核 Dropbox 根目錄為 `C:/Users/linshuhuan/Dropbox`，只確認本機副本，不宣稱已跨機同步。直接操作數線改版仍見 [#245](https://github.com/huansbox/aiden-study/issues/245)，首次紙本交付保留在 [#243](https://github.com/huansbox/aiden-study/issues/243)。
