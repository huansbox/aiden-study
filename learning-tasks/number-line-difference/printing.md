# 紙本使用與重建

這份紙本接在固定六題的 Pad 教學後。先做過渡卷，再用獨立卷練習把相同畫法帶回紙上；兩卷不沿用 Pad 的數值組合，也不互抄數值組合。

## 列印與使用

三份都是黑白 A4，建議以原始大小、單面列印。

| 成品 | 頁數與內容 | 用法 |
| --- | --- | --- |
| [過渡卷](output/pdf/number-line-transition.pdf) | 3 頁，6 題；初階 2＋中階 3＋進階 1 | 先沿著預畫弧線作答，再逐題自行補圖、段名與算式。 |
| [獨立卷](output/pdf/number-line-independent.pdf) | 3 頁，6 題；初階 2＋中階 3＋進階 1 | 只提供題幹與端點數線，孩子自己畫弧線、標長度、列式。 |
| [家長解答](output/pdf/number-line-parent-answers.pdf) | 8 頁，紙本全部 12 題 | 與孩子卷分開；中階含左右兩路，進階列出全部五條最短合法減法路線。 |

每個算式的數字上方或旁邊，都要寫出它代表的段名。例如 `甲丁 24 - 乙丁 15 = 甲乙 9`。過渡卷逐步減少預填的段名，獨立卷由孩子自行寫。孩子算出新長度後，要把段名與數字標回原圖，下一步才用得到。

核答先看段名，再看數字：長、短兩段必須共用一個端點，而且短段包含在長段內。數值相同的另一段不能代替；數線沒有單位，也不必按比例，不能量圖猜答案。家長圖以實線表示題目已知、虛線表示算出的新段、粗線表示題目要求的段，黑白列印也能分辨。

## 唯一題目來源

[source/problems.json](source/problems.json) 保存固定 18 題：`sets.pad`、`sets.transition`、`sets.independent` 各六題。Pad 的 ID 固定為 `p1` 至 `p6`；紙本題目不參與 Pad 的一次性獎勵判定。

每題包含顯示端點、已知線段、目標線段、答案與逐步解法。內部段名一律使用由左至右的英文端點 ID；`points[].label` 決定實際顯示甲乙丙丁或 ABCD。初階仍使用四點的 AC／BD／AD 結構，分別求左側 AB 或右側 CD，延續原題畫法。

`routes` 列出所有最短合法減法路線，進階包含互不相依步驟的換序，共五條。獨立測試從三個依序排列的端點建立「整段、左段、右段」關係，以 BFS 證明最少需要 1／2／3 次相減，也檢查合法相加與相減混用不會更快；不用數值巧合當作線段推導。

## 重建

在 repo 根目錄執行：

```powershell
uv run learning-tasks/number-line-difference/source/build_paper.py
uv run learning-tasks/number-line-difference/source/build_paper.py --check
node --test tests/test_number_line_problems.mjs
```

產生器以 PEP 723 宣告 Python 3.13 與 ReportLab，沿用 `uv` 執行，不修改 repo 根目錄的 dependencies。三份 PDF 產生在本 task 的 `output/pdf/`；固定的 PDF metadata 可讓 `--check` 比對來源與產物，該選項不改檔。

預設使用 Windows 內建 Microsoft JhengHei 的 `C:/Windows/Fonts/msjh.ttc` 與 `msjhbd.ttc`，PDF 已嵌入字型，列印端不需另裝。其他製作機可用 `--font` 與 `--bold-font` 指定支援正體中文的 TrueType 字型；換字型後應重建並重新檢查排版。

網頁產生器會把三份 PDF 複製到 `docs/number-line-difference/print/`，供 Pad 的列印連結使用。來源仍以本 task 為準，不另改網頁產物。

## 紙本驗證

改過題目或排版後，先跑數學測試、重建與 `--check`，再用 Poppler 的 `pdftoppm` 將三份 PDF 的全部 14 頁 render 成 PNG，逐頁確認：

- 弧線端點、段名與數字一致，標籤不互壓。
- 過渡卷每個數字有段名欄，獨立卷保留自行畫圖、列式的空間。
- 中階兩路及進階五路的每一步都能對回圖上的同一段。
- 黑白、A4、頁碼、中文字型與邊界正常，沒有裁字或缺字。

私人來源照片不隨 Git 公開。這次逐頁渲染證據放在 Dropbox 相對路徑 `mywork/aiden-study/number-line-difference/qa/paper/`；本機 Dropbox 根目錄與查核日期依 Issue #243，不把同機副本宣稱為已跨機同步。
