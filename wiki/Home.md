# Aiden Study — 專案 Wiki

給國小三年級孩子在 iPad 上練習的靜態題庫網站（自然＋數學＋社會＋國語，共 1924 題），由考卷 PDF 萃取與人工策展建成；單人（家長）維護。線上網址：<https://huansbox.github.io/aiden-study/>。

## 頂層約束

- **零依賴單一 HTML**：整個網站是一支 `docs/index.html`（內嵌 CSS/JS），無框架、無 build step、無後端；資料靠靜態 JSON。
- **GitHub Pages 靜態部署**：master branch 的 `/docs` 目錄即部署內容，push 即上線。
- **單人維護導向**：優先簡單方案，不為假設性需求設計（規範見 [CLAUDE.md](https://github.com/huansbox/aiden-study/blob/master/CLAUDE.md)）。
- **iPad localStorage 約 7 天清除**：iOS 對主畫面 App 的儲存有清除規則，所有進度功能都要有備份/還原對策。
- **課綱界線**：三年級自然 110 學年度下學期起才是現行 108 課綱，更舊的考卷一律排除。

## 系統組成

| 層 | 位置 | 職責 |
|---|---|---|
| 資料 pipeline | `scripts/`（Python） | PDF 萃取（pdfplumber）→ AI 分類（`claude -p`）→ 合併建庫 |
| 中間資料 | `data/` | raw / classified / curated / 官方答案等中繼 JSON |
| 部署目錄 | `docs/` | `index.html`（網站本體）＋ `questions.json`（題庫）＋ `explanations.json`（作答後說明）＋ `rewards.json`＋`assets/`（獎勵插畫、看表題截圖） |
| 測試 | `tests/` | pytest（pipeline 純函式）＋ node --test（前端純函式 sentinel 區塊） |
| 內部文件 | `docs-dev/` | 設計稿、實作經驗筆記、審查紀錄（不部署） |

## 專案階段

- 已完成：自然期中/期末、數學、社會、國語改錯字（選擇＋手寫兩模式）題庫全數上線；分批練習、錯題庫、作答後說明、獎勵插畫、進度備份（備忘錄捷徑）皆已上線。
- 進行中：iPad 真機驗收（小孩實際使用手寫模式）；下一個大件為注音符號學習 app PRD（[issue #15](https://github.com/huansbox/aiden-study/issues/15)）。

## Wiki 頁面導覽

| 頁面 | 內容 |
|---|---|
| [Maintenance](Maintenance) | 維運手冊 — 環境、日常指令、部署、地雷、故障排查 |
| [Roadmap](Roadmap) | 路線圖 — 里程碑、方向、非目標 |
| [Plan](Plan) | 執行中計畫快照 |
| [Tech Debt](Tech-Debt) | 技術債 — 利息排序 + 償還紀錄 |

> **文件分工**：wiki 是導覽與快照；策略 / 規格 / 待辦的 source of truth
> 在 repo 內（CLAUDE.md、issues/、docs-dev/）。兩者衝突時以 repo 為準。
