# Aiden Study — 全家學習平台

Aiden Study 是給家中兩個孩子在 iPad 上使用的靜態學習平台。根路徑是由 `registry`（驅動首頁內容的設定檔）控制的 hub（選人與 app 入口頁）：孩子先確認身分，再進入自己的學習 app；家長可從同一處查看完整 app 目錄與同步健康狀態。

- 現行正式網址：<https://huansbox.github.io/aiden-study/>
- 規劃中的固定網址：`https://kids.linshuhuan.com/`，尚待 [#35 iPad spike](https://github.com/huansbox/aiden-study/issues/35) 與 [#34 搬遷](https://github.com/huansbox/aiden-study/issues/34) 完成
- 託管：GitHub Pages，來源為 `master` branch 的 `docs/`
- 使用者：哥哥 `aiden`、弟弟 `bingpu`；不做登入帳號

## 現有 app

| App | 對象 | 現況 | 雲端同步 |
|---|---|---|---|
| 題庫練習（`study/`） | 哥哥 | 自然、數學、社會、國語，共 1,924 題 | 有 |
| 長除法練習（`math/`） | 哥哥 | 已搬入平台並上線 | 有 |
| 英文拼字（`spelling/`） | 哥哥 | 已搬入平台並上線 | 有 |
| 數織解謎（`math/nonogram/`） | 哥哥 | 已搬入平台並上線 | 無，僅本機 |
| 注音練習（`zhuyin/`） | 弟弟 | MVP（minimum viable product，最小可用版本）程式已上線；14 段親錄音檔與 iPad 驗收待完成 | 有 |

家長視圖另列外部或未上架項目：動物守護者為 active 外鏈、英文閱讀為 draft、隕石數學防衛隊為 parked。首頁顯示對象、順序與狀態一律以 [`docs/registry.json`](https://github.com/huansbox/aiden-study/blob/master/docs/registry.json) 為準。

## 系統組成

| 層 | 位置 | 職責 |
|---|---|---|
| Hub | `docs/index.html` | 選人、孩子首頁、家長視圖、`#restore=` 轉送 |
| Registry | `docs/registry.json` | app 上下架、對象、排序、路徑與同步設定 |
| 學習 app | `docs/study/`、`docs/zhuyin/`、`docs/math/`、`docs/spelling/` | 各自的學習流程與 child 維度存檔 |
| 平台共用層 | `docs/shared/sync-v1.js`、`docs/shared/wiring-v1.js` | 雲端同步協定、身分解析、存檔尋址、健康燈與匯入接線 |
| 共用資產 | `docs/shared/rewards.json`、`docs/shared/rewards/` | 題庫與注音共用的獎勵插畫 |
| 同步服務 | `worker/` | Cloudflare Worker＋KV（key-value 雲端儲存）；以 family token 驗證，key 為 `{child}:{app}` |
| 題庫 pipeline | `scripts/`、`data/` | PDF 萃取、AI 分類、人工策展、建置題庫與作答說明 |
| 驗證 | `tests/` | pytest、Node.js 純函式／契約／audit 測試 |

## 核心設計

- **靜態優先**：前端不需 build step；各 app 直接由 GitHub Pages 提供。唯一 server-side 元件是進度同步 Worker。
- **Registry 驅動**：新增、退役、上下架或調整孩子首頁順序，都先改 `docs/registry.json`，並由 audit 測試檢查。
- **進度跟 child 走**：study、zhuyin、math、spelling 的本機 key 都帶 child 維度，並同步到 Cloudflare KV；family token 只存裝置、Cloudflare secret 與 1Password，不進 Git。
- **平台基建共用、app 邏輯獨立**：同步協定與 wiring layer 共用；各 app 的教學流程維持簡單、各自演進。
- **站內連結使用相對路徑**：目前 GitHub project site 與未來自訂網域的 base path 不同，絕對路徑會在搬遷時失效。
- **iPad 儲存不能只信 localStorage**：Safari 與主畫面 App 是不同容器，且 iOS 可能清除長期未使用的資料；雲端同步是主要保護，文字匯出／匯入是逃生門。

## 目前階段

平台第 2/9 至 8/9 階段已完成：同步 Worker、四 app 同步、repo 重整、hub／registry、math／spelling 搬入，以及共用 wiring layer 都已上線。現在沒有只靠程式端即可完成的待辦，剩餘工作集中在：

1. [#35 iPad 真機 spike](https://github.com/huansbox/aiden-study/issues/35)：驗證 standalone 導航、網址參數與 localStorage 容器三個架構前提。
2. [#20 注音 MVP 收尾](https://github.com/huansbox/aiden-study/issues/20)：錄製 14 段音檔並完成 iPad checklist。
3. [#34 掛網域與搬遷](https://github.com/huansbox/aiden-study/issues/34)：通過 flip-gate 後才設定自訂網域、安裝新圖示、對帳進度與清理舊站。
4. [#11 iPad 備份還原驗收](https://github.com/huansbox/aiden-study/issues/11)：standalone 還原仍採手動貼上作為後備，剪貼簿橋樑暫緩。

## Wiki 導覽

| 頁面 | 內容 |
|---|---|
| [維運手冊](Maintenance) | 環境、測試、部署、registry／同步維護與故障排查 |
| [路線圖](Roadmap) | 已完成里程碑、近期收尾順序與長期方向 |
| [執行中計畫](Plan) | 目前 open issues、依賴關係與完成條件 |
| [技術債](Tech-Debt) | 依利息排序的已知成本、償還條件與接受限制 |

> Wiki 是導覽與日期快照。現況以程式碼、`docs/registry.json`、[GitHub issues](https://github.com/huansbox/aiden-study/issues) 與 [`CLAUDE.md`](https://github.com/huansbox/aiden-study/blob/master/CLAUDE.md) 為準；架構決策以 [`CONTEXT.md`](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md) 與 [ADR（Architecture Decision Record，架構決策紀錄）](https://github.com/huansbox/aiden-study/tree/master/docs-dev/adr) 為準。
