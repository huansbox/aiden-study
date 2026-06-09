# 考卷來源與取得流程（tcool.cc）

> 內部開發文件，**不屬於 GitHub Pages 部署內容**（故放 `docs-dev/` 而非 `docs/`）。
> 用途：記錄期末考卷的資料來源、抓取流程、課綱篩選界線，讓後續 session 能延續蒐集。

## 為什麼（rationale）

專案原本只有 27 份「三下自然**期中**」PDF（`pdfs/`）。為擴充到**期末**題庫，需穩定的考卷來源。
[tcool.cc](https://www.tcool.cc/)（中小學題庫網）彙整全台各校歷屆段考卷，且**自家託管 PDF**、可用 API 精準篩選（年級／科目／學期／段考／出版社／縣市），比逐校 Google Drive 翻找可靠。

## 核心機制

tcool.cc 分兩層，取得難度不同：

| 層 | 端點 | 防護 | 取得方式 |
|---|---|---|---|
| 查清單（HTML） | `POST /`（form-encoded） | 無（瀏覽器 UA 即可） | `Invoke-WebRequest` 直接打 |
| 下 PDF | `/d/q/<id>.pdf`（題目卷）<br>`/d/a/<id>.pdf`（答案卷） | **Cloudflare managed challenge** | 需真實瀏覽器過挑戰 |

### 查清單

- form 欄位：`grade`(1–12)、`subject`(國語/數學/自然/社會/英語/健康)、`semester`(1 上 / 2 下)、`period`(留空=全部；1 期中1、2 期中2、3 期末-三段考制、4 期末-兩段考制)、`publisher`(康軒/南一/翰林/何嘉仁)、`city`(正體「臺北市/新北市」)、`p`(頁碼)。
- 選單可選值：`POST /api-exam.php` body `{"action":"filter_options","grade":N}`。
- 結果在 `<div id="results-container">`，每筆 `.result` 含 `.school/.city/.grade-subject/.year-period/.publisher`，與題目卷／答案卷的 `<a href>`。
- **分頁坑**：每頁固定 10 筆且有分頁，只抓 `p=1` 會漏掉舊年度與部分學校（本專案就一度漏掉新北興南國小 108下）。需 `p=1,2,3…` 翻到底；**超過最後一頁時伺服器回傳「最後一頁的同一份」**，故以「本頁 PDF id 簽章 == 上一頁」當停止條件，並用 id 去重。

### 下 PDF（繞過 Cloudflare）

PDF 端點對非瀏覽器一律回 403 + 「請稍候…」JS 挑戰頁。流程：

1. Playwright 開真實瀏覽器，導到**任一 PDF URL**（首頁不會觸發挑戰，PDF 端點才會）。
2. 等 managed challenge 自動解（約數秒），`cf_clearance` cookie 即種下。
3. 用 `page.context().cookies()` 取出 `cf_clearance` 與 `PHPSESSID`、以及瀏覽器 UA。
4. **同一台機器（同 IP）＋完全相同的 UA**，把 cookie 帶進 PowerShell `Invoke-WebRequest -Headers @{Cookie="cf_clearance=...; PHPSESSID=..."}` 抓二進位 PDF。

關鍵理解：
- `cf_clearance` **只綁 IP + UA，不綁 TLS 指紋**，所以能從瀏覽器交接給 .NET HTTP client。UA 的 Chrome 版本號要一字不差。
- cookie 約 **30 分鐘**過期，過期重跑步驟 1–3。
- Playwright `browser_run_code_unsafe` 的 VM **無 `require` 也無動態 `import`**，無法在瀏覽器行程內寫檔，必須把 cookie 交接回 PowerShell 下載。

## 課綱篩選界線（重要）

**三年級自然從 110 學年度下學期（考卷標籤「110下」）起才是現行 108 課綱**：

- 108 課綱「逐年向上」實施 — 108 學年度只從各階段一年級起跑，三年級首次套用是 110 學年度；又國小自然本就從三年級才開課，故三下自然 108 課綱首發即 110下。
- 換算考卷年度（標籤＝學年度）：**110下／111下／112下／113下 ＝ 現行 108 課綱（✓ 符合現行康軒課本）**；**108下／109下 ＝ 舊課綱（九年一貫），單元不一致，排除**。

收任何三年級自然卷時，年度 < 110下 一律排除，避免混入與現行課本對不上的題目。

## 目前蒐集狀態

- **完整清單 JSON**：`data/tcool_grade3_sci_kanghsuan.json`（三下·自然·康軒·臺北＋新北，26 筆含期中＋期末，已翻完所有分頁）。
- **已下載**：`pdfs_期末/`，16 檔（10 題目卷＋6 答案卷），全部現行 108 課綱（110下～113下）。檔名 `縣市_學校_學年期末2_自然康軒_題目|答案.pdf`。
  - 臺北市 民權國小：110/111/112/113 下 — **僅題目卷、無答案卷**（站上未提供）
  - 新北市 安和國小：110/111/112/113 下 — 題目＋答案
  - 新北市 桃子腳國小：110/112 下 — 題目＋答案
- **刻意未下載**：安和 108下、興南 108下（期末，舊課綱）。
- **尚未抓**：同條件的**期中考**（清單裡 9 份，現行課綱）；其他出版社／縣市。

## 待決定 / TODO

- [ ] 期末是否要接入既有 pipeline（`scripts/extract.py` → 分類 → 併入 `docs/questions.json`），或另建期末題庫頁。
- [ ] `pdfs_期末/` 與 `data/` 目前**未加入 .gitignore**，與先前「PDF 不進 repo」決策（commit 8dac85c）不一致 — 需決定是否比照 `pdfs/` 排除。
- [ ] 期末課本單元分類規則（現行 CLAUDE.md 的兩個單元是期中範圍，期末單元待補）。
