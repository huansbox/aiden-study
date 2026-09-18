# Aiden Study — 全家學習平台

Aiden Study 是給家中兩個孩子使用的學習平台，也保存紙本、旅行活動與課後素材。孩子從 hub 進入家長選定的活動；家長後台分開提供作品白板與家庭設定。Wiki 是給家長與維護者看的導覽，不另維護作品狀態清單。

- 現行正式網址：<https://kids.linshuhuan.com/>；舊 GitHub Pages 網址 301 轉向並保留 path／child
- 孩子入口：[哥哥學習](https://kids.linshuhuan.com/?child=aiden)／[弟弟學習](https://kids.linshuhuan.com/?child=bingpu)；家長已於 2026-09-15 確認兩個 iPad 主畫面圖示安裝
- 託管：GitHub Pages，來源為 `master` branch 的 `docs/`
- 使用者：哥哥 `aiden`、弟弟 `bingpu`；不做登入帳號

## 找作品與現況

| 想找什麼 | 唯一維護來源／入口 |
|---|---|
| 做過哪些 App、任務與主線外作品 | [README 自動作品總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)／[家長作品白板](https://kids.linshuhuan.com/parent/) |
| 任務的狀態、日期、用法與歸檔規則 | [家庭學習任務庫](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/README.md)；任務索引由 `catalog.json` 產生 |
| 可沿用的做法、SOP 與工具 | [共用資源入口](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/README.md) |
| 開發中的下一步與 blocker | [GitHub issues](https://github.com/huansbox/aiden-study/issues)；Wiki [Plan](Plan) 只負責導覽 |

App 登錄維護在 [`docs/registry.json`](https://github.com/huansbox/aiden-study/blob/master/docs/registry.json)，task 登錄維護在 [`learning-tasks/catalog.json`](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/catalog.json)，README 與白板由它們產生。App 上下架、作品工作狀態與孩子實際可見活動是不同概念；孩子首頁內容與順序由家長後台的家庭設定決定，見 [CONTEXT.md](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。

## 系統組成

| 層 | 位置 | 職責 |
|---|---|---|
| Hub | `docs/index.html` | 選人、孩子首頁、家長視圖、`#restore=` 轉送 |
| 作品登錄與白板 | `docs/registry.json`、`learning-tasks/catalog.json`、`docs/parent/` | App／task 登錄一次，產生 README 索引與唯讀作品白板；不取代家庭設定 |
| 學習 app | `docs/<app>/`；完整位置見自動總覽 | 各自的學習流程與存檔；實際同步能力依各 App 登錄與實作 |
| 平台共用層 | `docs/shared/sync-v1.js`、`docs/shared/wiring-v1.js` | 雲端同步協定、身分解析、存檔尋址、健康燈與匯入接線 |
| 共用資產 | `docs/shared/rewards.json`、`docs/shared/rewards/` | 題庫與注音共用的獎勵插畫 |
| 同步服務 | `worker/` | Cloudflare Worker＋KV（key-value 雲端儲存）；以 family token 驗證，key 為 `{child}:{app}` |
| 題庫 pipeline | `scripts/`、`data/` | PDF 萃取、AI 分類、人工策展、建置題庫與作答說明 |
| 家庭學習任務庫 | `learning-tasks/` | 場館、旅行等一次性活動的可重建成品、索引與重用經驗 |
| 驗證 | `tests/` | pytest、Node.js 純函式／契約／audit 測試 |

## 核心設計

- **靜態優先**：前端不需 build step；各 app 直接由 GitHub Pages 提供。唯一 server-side 元件是進度同步 Worker。
- **登錄與家庭設定分開**：App 目錄及 task 狀態各有單一登錄；家長後台控制孩子實際可見活動與排序。作品白板只讀，不是設定頁。
- **進度跟 child 走**：study、zhuyin、math、spelling 的本機 key 都帶 child 維度，並同步到 Cloudflare KV；family token 只存裝置、Cloudflare secret 與 1Password，不進 Git。
- **平台基建共用、app 邏輯獨立**：同步協定與 wiring layer 共用；各 app 的教學流程維持簡單、各自演進。
- **家庭學習任務有獨立入口**：一次性活動的分類、建立、索引與共用規則以 `learning-tasks/README.md` 為準。
- **站內連結使用相對路徑**：GitHub project site 與正式自訂網域的 base path 不同，絕對路徑會在搬遷時失效。
- **iPad 儲存不能只信 localStorage**：Safari 與主畫面 App 是不同容器，且 iOS 可能清除長期未使用的資料；雲端同步是主要保護，文字匯出／匯入是逃生門。

## 交付與歷史證據

- 注音於 2026-09-17 完成本輪交付，14 段正式親錄已齊備；#15／#20 已結案。家長免除逐項 iPad checklist，不等於未執行的檢查全部通過，也不應重新列為收尾門檻。後續維護與已定案範圍見[注音專用交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md)。
- 數學的來源、交付與未測限制見[擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)及[家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md)，不在 Wiki 複製每批題數與完成狀態。
- 網域與圖示的歷史驗收見[正式網域上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)；後續入口連線機制見[入口連線說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/device-connection.md)。舊紀錄的資料搬遷取捨不授權清除現有資料。

以上為有日期的交付入口，不是即時工作狀態；找目前版本與進度回到上方自動總覽及 tracker。舊站／branch 清理需另外確認保留範圍，不因已發布就自動刪除來源。

## Wiki 導覽

| 頁面 | 內容 |
|---|---|
| [維運手冊](Maintenance) | 環境、測試、部署、registry／同步維護與故障排查 |
| [路線圖](Roadmap) | 已完成里程碑、近期收尾順序與長期方向 |
| [執行中計畫](Plan) | 目前 open issues、依賴關係與完成條件 |
| [技術債](Tech-Debt) | 依利息排序的已知成本、償還條件與接受限制 |

> Wiki 是導覽與日期快照。現況以程式碼、App／task 登錄、Git 歷史與 [GitHub issues](https://github.com/huansbox/aiden-study/issues) 為準；架構決策見 [ADR（Architecture Decision Record，架構決策紀錄）](https://github.com/huansbox/aiden-study/tree/master/docs-dev/adr)，平台詞彙與登錄欄位語意見 [`CONTEXT.md`](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。
