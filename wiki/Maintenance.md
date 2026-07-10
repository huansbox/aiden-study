# 維運手冊

## 執行環境

- 跨平台開發（macOS / Windows）。Windows 預設 codepage 是 cp950，Python/Node 含中文或 emoji 時需指定 utf-8 編碼——所有 Python 腳本已內建。
- Python 一律透過 **uv** 執行（`uv run …`），不直接呼叫 `python`/`python3`——裸呼叫命中的版本因機器而異；`uv sync` 安裝相依。
- 前端零依賴：`docs/index.html` 直接開就能跑，無 build step。
- AI 分類需要 Claude Code CLI（`claude -p`）——只在重跑萃取/分類 pipeline 時需要，日常維護不用。

## 排程 / 自動化

無 CI、無排程。日常指令：

| 目的 | 指令 |
|---|---|
| 跑 Python 測試 | `uv run pytest` |
| 跑前端純函式測試 | `node tests/test_chinese_mode_pure.mjs`（另有 backup / breaks / reward_pick 三支） |
| 本機起網站 | `uv run python -m http.server 8765 -d docs` |
| 重建題庫 | `uv run python scripts/build_questions.py`（冪等，五來源合併） |
| 重建說明 | `uv run python scripts/build_explanations.py` |
| 驗證國語 curated 題 | `uv run python scripts/validate_chinese_curated.py` |

新批考卷的完整 pipeline（extract → classify → build）與重跑指令見 [README](https://github.com/huansbox/aiden-study/blob/master/README.md) 開發段與 [docs-dev/期末-實作經驗筆記.md](https://github.com/huansbox/aiden-study/blob/master/docs-dev/期末-實作經驗筆記.md)。

## 部署更新

push 到 master 即部署：GitHub Pages 以 master branch `/docs` 目錄為 source，無需其他動作。上線驗證直接開 <https://huansbox.github.io/aiden-study/>（Pages build 需等一兩分鐘）。

## 日常 / 週期 SOP

- **家長進度備份**：首頁底部「進度備份/還原」或「備份到備忘錄」；還原捷徑配方見 [docs-dev/notes-restore-shortcut-recipe.md](https://github.com/huansbox/aiden-study/blob/master/docs-dev/notes-restore-shortcut-recipe.md)。建議偶爾備份一份（對抗 iOS 約 7 天清除）。
- **獎勵插畫補圖**：設計圖片 session 只寫 `docs/assets/rewards/*.webp`＋`docs/rewards.json`，主 session 跑審計（無孤兒 key / 缺檔 / 重複）後 commit/push。流程見 CLAUDE.md「獎勵插畫」條目。
- **題目回報處理**：小孩按「題目有問題」後，家長可從首頁「已回報題目」還原或開 GitHub issue 修題。

## 已知地雷（Gotchas）

動手前先讀對應追蹤檔（多在 [CLAUDE.md](https://github.com/huansbox/aiden-study/blob/master/CLAUDE.md) 快速參考）。

**系統面**

- **原始考卷 PDF 不在 git**（`pdfs_*` 全 gitignore）——只存在當初下載的機器。要截圖（如社會標章題）須先把 PDF 複製回來或重抓 tcool。出處：CLAUDE.md 待辦③。
- **tcool.cc 有 Cloudflare**：下載考卷要先用 Playwright 導 PDF URL 過 managed challenge 拿 `cf_clearance`（直接用首頁 cookie 對 PDF 端點仍 403）。出處：CLAUDE.md 社會無答案卷條目、[docs-dev/exam-paper-sourcing.md](https://github.com/huansbox/aiden-study/blob/master/docs-dev/exam-paper-sourcing.md)。
- **iPad 主畫面 App（standalone）與 Safari 是兩個分開的 localStorage 容器**，深連結一律開 Safari——「從備忘錄還原」在 standalone 收不到，已知限制、家長定案暫緩（後備＝手動複製內文貼進匯入框）。出處：CLAUDE.md PRD #7 條目。
- **備忘錄分享面板常預設「附加到既有筆記」**：一則筆記會累積多段備份，解析一律取最後一段（`lastBackupBlockStart`），附加不壞資料。
- **app 載入時會 async 寫回 localStorage**（errorBank 舊條目清理等）——自動化測試若在 init 未靜定時 `localStorage.clear()`，舊 state 會被寫回造成殘留假象；先等頁面靜定再清。

**決策面**

- 國語手寫模式的 mode 維度儲存格式（choice/handwriting 隔離、舊 flat 資料視為 choice）見 CLAUDE.md「localStorage 結構」節——改儲存相關程式前必讀。
- 課綱界線：自然 108下/109下 屬舊課綱需排除，110下 起才收。

## 故障排查

| 症狀 | 先看哪裡 |
|---|---|
| 網站題目載不出來 | DevTools console；`docs/questions.json` 是否合法 JSON（rebuild：`build_questions.py`） |
| 作答後說明消失 | `docs/explanations.json`（rebuild：`build_explanations.py`；缺 id 時該題不顯示、不影響作答） |
| 獎勵圖不出現 | `docs/rewards.json` 的 key 必須是題庫 subtopic 字串（孤兒 key 會永遠 fallback 通用池）；缺圖時靜默不顯示是設計內行為 |
| 小孩進度消失 | iOS 約 7 天清除；用備忘錄備份還原（見上方 SOP） |
| 測試紅燈 | `uv run pytest` 與 node 測試分開跑，定位是 pipeline 還是前端純函式 |
