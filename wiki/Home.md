# Aiden Study — 全家學習平台

Aiden Study 是給家中兩個孩子使用的學習平台，也保存紙本、旅行活動、課後英語複習與閱讀素材。孩子從自己的首頁進入家長選定的活動；家長後台分開提供家庭設定、每日目標、進度同步狀態與作品白板。Wiki 是給家長與維護者看的導覽，不另維護作品狀態清單。

- 正式網址：<https://kids.linshuhuan.com/>；舊 GitHub Pages 網址 301 轉向並保留 path／child
- 孩子入口：[煦誠學習](https://kids.linshuhuan.com/?child=aiden)／[秉樸學習](https://kids.linshuhuan.com/?child=bingpu)；[家長後台](https://kids.linshuhuan.com/parent/)
- 託管：GitHub Pages，來源為 `master` branch 的 `docs/`；同源 `/api/*` 由 Cloudflare Worker 處理
- 使用者：哥哥 `aiden`、弟弟 `bingpu`；不做登入帳號，家長以家庭金鑰替入口連線一次

## 找作品與現況

| 想找什麼 | 唯一維護來源／入口 |
|---|---|
| 做過哪些 App、任務與主線外作品 | [README 自動作品總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)／[家長作品白板](https://kids.linshuhuan.com/parent/) |
| 任務的狀態、日期、用法與歸檔規則 | [家庭學習任務庫](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/README.md)；任務索引由 `catalog.json` 產生 |
| 可沿用的做法、SOP 與工具 | [共用資源入口](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/README.md) |
| Native Camp 私人錄音、逐字稿與工作副本的歸檔位置 | Wiki [Native Camp 資料保存與恢復](Native-Camp-Storage)（只維護在 Wiki，repo 不放副本） |
| 開發中的下一步與 blocker | [GitHub issues](https://github.com/huansbox/aiden-study/issues)；Wiki [Plan](Plan) 只負責導覽 |
| 接續某個子專案前要過的關卡 | [子專案接續開發](https://github.com/huansbox/aiden-study/blob/master/docs-dev/development-readiness.md) |

App 登錄維護在 [`docs/registry.json`](https://github.com/huansbox/aiden-study/blob/master/docs/registry.json)，task 登錄維護在 [`learning-tasks/catalog.json`](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/catalog.json)，README 與白板由它們產生。App 上下架、作品工作狀態與孩子實際可見活動是不同概念；孩子首頁內容與順序由家長後台的家庭設定決定，見 [CONTEXT.md](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。

## 系統組成

| 層 | 位置 | 職責 |
|---|---|---|
| 孩子首頁 | `docs/index.html`、`docs/shared/home.js`、`task-home.js`、`home-update.js`、`docs/home-release.json` | 選人、活動卡與當日任務、我的成果入口、首頁程式版本自動更新、`#restore=` 轉送 |
| 家長後台 | `docs/parent/` | 入口連線、每個孩子的活動與排序、題庫學期、練習安排、每日目標與拼裝包、進度同步時間、作品白板、Study／火車／Native Camp 不計分試玩 |
| 作品登錄與白板 | `docs/registry.json`、`learning-tasks/catalog.json`、`scripts/build-work-catalog.mjs` | App／task 登錄一次，產生 README 索引與唯讀白板；不取代家庭設定 |
| 學習 app | `docs/study/`、`docs/math/`（含 `nonogram/`）、`docs/spelling/`、`docs/zhuyin/`、`docs/nativecamp/` | 各自的學習流程與存檔；完整位置與可用版本見自動總覽 |
| 閱讀心智圖 | `docs/mind-map.html`、`docs/*-mind-map/`、registry 的 `mindMaps` 索引 | 每週閱讀文章的 iPad 選詞心智圖；首頁卡片預設開最新一篇 |
| 平台共用層 | `docs/shared/sync-v1.js`、`wiring-v1.js`、`device-auth.js`、`family-core.js`、`family-client.js`、`collection-core.js`、`collection-client.js`、`brick-*.js` | 進度同步協定、child 身分與存檔尋址、Cookie 入口連線、家庭設定與累計、每日目標與積木列車收藏、拼裝工作台 |
| 共用資產 | `docs/shared/rewards/`、`docs/shared/bricks/`、`docs/assets/` | 獎勵插畫、五款列車預先渲染的積木素材、頭像與字型 |
| 同步服務 | `worker/`（`entry.mjs` 匯出 `worker.mjs`、`session.mjs`、`family.mjs`、`collection.mjs`） | Cloudflare Worker：KV 存進度、家庭設定、累計串流、私用題包與入口 session；SQLite Durable Object 存每個孩子的收藏 |
| 題庫 pipeline | `scripts/`、`data/`、ignored `data/private/study/` | 公開題庫的 PDF 萃取、AI 分類、人工策展與建置；四上家庭私用題包的重建與驗證 |
| 家庭學習任務庫 | `learning-tasks/` | 場館、旅行、閱讀、Native Camp 每堂課等一次性活動的可重建成品、索引與重用經驗 |
| 驗證 | `tests/`、`.github/workflows/` | pytest、Node.js 純函式／接線／Worker／audit 測試；`test`、`work-catalog`、`publish-wiki` 三條 workflow |

## 核心設計

- **靜態優先**：前端不需 build step，各 app 直接由 GitHub Pages 提供；積木列車素材在開發時預先渲染成 PNG，正式頁不載入 WebGL。唯一 server-side 元件是 Cloudflare Worker。
- **登錄與家庭設定分開**：App 目錄及 task 狀態各有單一登錄；家長後台控制孩子實際可見活動與排序。作品白板只讀，不是設定頁。
- **進度跟 child 走**：study、zhuyin、math、spelling、nativecamp 的本機 key 都帶 child 維度，並同步到 Cloudflare KV。family token 只存 Cloudflare secret 與 1Password，不進 Git。
- **入口連線一次、之後靠 Cookie**：家長在每個入口輸入一次家庭金鑰，換成 HttpOnly 的 180 天 session Cookie；網址不再帶金鑰。Safari 與主畫面圖示是不同容器，各自連線一次。
- **私用內容不進公開 Git**：四上數學／自然的家庭題包、Native Camp 老師原音與逐字稿、原始考卷 PDF 都留在 ignored 路徑、KV 或私人歸檔；repo 只放可重建的來源說明與公開 metadata。
- **練習不中斷**：任務完成、徽章、拼裝包與成就提示只在回合／批次結束畫面出現，作答中不彈慶祝；規則見 [AGENTS.md](https://github.com/huansbox/aiden-study/blob/master/AGENTS.md#練習不中斷)。
- **平台基建共用、app 邏輯獨立**：同步協定、wiring、家庭層與收藏共用；各 app 的教學流程維持簡單、各自演進。
- **家庭學習任務有獨立入口**：一次性活動的分類、建立、索引與共用規則以 `learning-tasks/README.md` 為準。
- **站內連結使用相對路徑**：GitHub project site 與正式自訂網域的 base path 不同，絕對路徑會在搬遷時失效。
- **iPad 儲存不能只信 localStorage**：Safari 與主畫面 App 是不同容器，iOS 可能清除長期未使用的資料；雲端同步是主要保護，文字匯出／匯入是逃生門。

## 交付與歷史證據

- 家長後台、新版孩子首頁、首頁卡片與常用網站於 2026-09-15～16 上線；Cookie 入口連線與首頁程式自動更新於 2026-09-16 發布。見[改版說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/family-uiux-v2.md)、[入口連線說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/device-connection.md)與[首頁自動更新](https://github.com/huansbox/aiden-study/blob/master/docs-dev/home-update.md)。
- 注音於 2026-09-17 完成本輪交付，14 段正式親錄已齊備；#15／#20 已結案。家長免除逐項 iPad checklist，不等於未執行的檢查全部通過。見[注音專用交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md)。
- Native Camp 課後複習：2026-09-18 起每堂課用原創完整句題包＋OpenAI 預製語音，Weekly Review 自 2026-09-26 起改為家長要求才製作；最新交付為 2026-10-02 Denny（#142）。私人資料已於 2026-09-30、10-03 歸檔，位置與恢復順序見 Wiki [Native Camp 資料保存與恢復](Native-Camp-Storage)。
- 四上數學私用題包於 2026-09-19 擴為 57 題 rev4 並附家長試玩；四上自然自 2026-09-23 起四批接入同一題包，2026-09-27 發布 rev8 共 97 題。來源、未測限制與容量界線見[擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)、[私用題包重建](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-private-pack-build.md)與[自然第四批紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-science-study-fourth-batch.md)。
- 每日目標與積木列車收藏於 2026-09-23 上線（E500、EMU3000、R200），2026-09-30 加入 700T 與 N700S；見[每日目標與拼裝收藏](https://github.com/huansbox/aiden-study/blob/master/docs-dev/daily-brick-collection.md)。
- 網域與圖示的歷史驗收見[正式網域上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)。舊紀錄的資料搬遷取捨不授權清除現有資料。

以上為有日期的交付入口，不是即時工作狀態；找目前版本與進度回到上方自動總覽及 tracker。多數交付只做過桌面 Chromium 尺寸模擬，未做實體 iPad 驗收；各文件如實標明，不應補寫成通過。

## Wiki 導覽

| 頁面 | 內容 |
|---|---|
| [維運手冊](Maintenance) | 環境、測試、部署、registry／同步／Worker 維護與故障排查 |
| [Native Camp 資料保存與恢復](Native-Camp-Storage) | 私人錄音與工作副本的歸檔位置、恢復順序；只在 Wiki 維護 |
| [路線圖](Roadmap) | 已完成里程碑、方向與非目標 |
| [執行中計畫](Plan) | 目前 open issues、已交付基線與候選下一步 |
| [技術債](Tech-Debt) | 依利息排序的已知成本、償還條件與接受限制 |

> Wiki 是導覽與日期快照。現況以程式碼、App／task 登錄、Git 歷史與 [GitHub issues](https://github.com/huansbox/aiden-study/issues) 為準；架構決策見 [ADR（Architecture Decision Record，架構決策紀錄）](https://github.com/huansbox/aiden-study/tree/master/docs-dev/adr)，平台詞彙與登錄欄位語意見 [`CONTEXT.md`](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。除 Native-Camp-Storage 外，各頁原始檔在 repo `wiki/`，由 CI 發布。
