# 路線圖

> 快照日期：2026-10-03（補上 2026-09-15 以來的家長後台、入口連線、四上自然、積木列車收藏與 Native Camp 里程碑）。本頁保存方向與歷史里程碑；目前作品狀態看 [README 自動總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)，執行條件回查 [Plan](Plan) 所連的 tracker，不在此另抄待辦。

## 方向

平台目前有四條各自演進的內容線，共用同一套入口、家庭設定與同步：

- **歷屆題庫 → iPad 練習**：把已核過來源、答案與概念範圍的歷屆題，小批加入既有 Study。四上數學與自然共用一個家庭私用題包；每批內容、revision 與未測範圍查[數學擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)與各批[自然整合紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-science-study-fourth-batch.md)，Wiki 不重複維護題數。
- **課後英語複習（Native Camp）**：每堂課依實際課堂內容做原創完整句題包與預製語音；只在家長提出日期時製作，Weekly Review 不自動產生。
- **每週閱讀心智圖**：依老師指定文章做 iPad 選詞心智圖，首頁卡片自動指向最新一篇。
- **每日目標與收藏**：家長設定每日份量，孩子完成後領拼裝包、拼積木列車；動機機制不指定單元、不做排名或連續天數懲罰。

另有兩種支援路線，只在實際需要時啟動：

- 「題型分析 → 改編紙本」用於需要短時間紙筆練習或特定弱點回看時；不預設每章都製作 PDF。
- 「單一技能互動練習」用於 Study 既有題型不足以承載的技能；不因有舊素材就先做新 app。

保護現存進度與年級隔離；家長已放棄找回的三下歷史紀錄不列為恢復任務。後續工作只從已核准 issue 啟動，舊 repo 與工作目錄的清理不是交付完成後的自動動作。

## 已完成里程碑

| 時間 | 里程碑 |
|---|---|
| 2026-06-上旬 | 自然期中／期末題庫上線，建立 PDF 萃取、AI 分類與靜態題庫流程 |
| 2026-06-11～14 | 數學、社會題庫上線；社會擴充至 452 題，三科作答說明共 1,257 題 |
| 2026-06-15～20 | 分批練習、錯題庫、進度匯出／匯入、獎勵圖池與國語手寫模式上線；公開題庫達 1,924 題 |
| 2026-07-11～17 | 注音程式、Cloudflare Worker 同步、hub／registry、app monorepo 整併與共用 wiring layer 上線 |
| 2026-07-21 | Python／Node.js CI workflow 上線 |
| 2026-08-14 | 新竹動物園探險卡交付，[ADR-0007](https://github.com/huansbox/aiden-study/blob/master/docs-dev/adr/0007-learning-task-library.md) 建立 `learning-tasks/` 任務庫 |
| 2026-09-12 | #53～#58：四上數學候選卷收集、U1 紙本短練習、四上入口與六題家庭私用題包發布 |
| 2026-09-14～15 | #55 依家長操作確認結案；#59 rev2 十四題、#60 rev3 三十題發布；#34／#35 自訂網域 `kids.linshuhuan.com` 與 iPad 主畫面圖示完成 |
| 2026-09-15～16 | 家長後台 `/parent/`、新版孩子首頁、累計與徽章上線；#61 首頁卡片與常用網站、#62 進度同步時間、#63 首頁程式自動更新；家庭金鑰改為 HttpOnly Cookie 入口連線 |
| 2026-09-17 | 注音 #15／#20 結案，14 段親錄交付；累計重置世代機制（PR #74） |
| 2026-09-18 | Native Camp Review 新機制：完成收起、每週新題、OpenAI 預製語音與多堂課接入（#77～#80、#82／#84／#85）；[PR #92](https://github.com/huansbox/aiden-study/pull/92) 自動作品總覽與家長白板（[ADR-0008](https://github.com/huansbox/aiden-study/blob/master/docs-dev/adr/0008-generated-work-catalog.md)）；#95 開工／收尾關卡 |
| 2026-09-19 | #101 四上數學 rev4 五十七題與覆蓋報告；#103／#106 不寫入孩子進度的家長試玩 |
| 2026-09-22 | #108 Native Camp Try it 改為 Build／Change／Fix 三種變化 |
| 2026-09-23 | #110～#113 每日目標、兩段拼裝包與臺灣火車 E500／EMU3000／R200 收藏；收藏改用 SQLite Durable Object；#121 家長火車試拼頁 |
| 2026-09-23 | #115 四上自然歷屆卷收集與跨版本概念對照；#117 首批 20 題（rev5）、#119 第二批圖表題組（rev6，89 題）；#122 題組一次一小題 |
| 2026-09-26～27 | #124 自然七個練習主題；#129 第三批（rev7，94 題）、#134 第四批（rev8，97 題）；#125 Native Camp 新五堂並將 Weekly Review 改為手動；#130 再補五堂 |
| 2026-09-29 | #137 閱讀心智圖〈愛的分享〉 |
| 2026-09-30 | #127 台灣高鐵 700T 與日本新幹線 N700S 加入收藏，共五款列車；#138 Native Camp 私人資料歸檔與 Wiki 保存／恢復頁 |
| 2026-10-01～03 | #140 Native Camp 9/28～9/30 三堂（動物內容分步設計）、#142 10/2 Denny；#144 收整十月工作副本 |

各列只記發布事實。多數交付未做實體 iPad 驗收，限制記在對應 issue 與 `docs-dev/` 紀錄。

## 後續方向

### 題庫內容

- **先處理家庭題包容量**：單一題包上限 128 KiB，rev8 只剩 824 bytes。在決定拆包、精簡圖像或調整契約之前，數學與自然都無法再加題。
- 自然：容量解決後再補風力比較、地表控制變因實驗等缺口；校方公布正式範圍後回頭校準，不把教學計畫推定寫成學校公告。
- 數學：以[概念／出題方法覆蓋報告](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-pattern-counts.md)決定後續擴題，先核現有歷屆來源能否補零題或單題模式；U3 `angle-v1` 角圖呈現留作選項，不推定已授權。
- 社會同為康軒版，日後按需要沿用「來源查證 → 概念對齊 → 小批驗收」流程；本輪未規劃。既有 backlog（社會看圖題等）不為題數本身擴張。

### 英語與閱讀

- Native Camp 依孩子使用回饋另開調整票，不覆寫首次作答紀錄；新課、週包與任何付費製音都等家長明確要求。
- 閱讀心智圖每週依家長提供的文章與老師回饋製作；共通做法收在 [shared SOP](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/reading-mind-maps.md)。

### 平台與 app

- 新 app 預設加在 `docs/<app>/` 並由 registry 登記，但能用既有 Study 完成時不另開 app。
- 孩子首頁可見活動與順序由家長後台的家庭設定管理；registry 是 App 目錄與預設值，見 [CONTEXT.md](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。
- 收藏：五款列車收齊後額外拼裝包繼續保留；再加車型時先部署能接受新 ID 的 Worker，再發布前端。
- 兩支 iPad 都改用乾淨網址圖示並確認連線後，再評估退役帶金鑰的舊 API 與轉移碼（見 [Tech-Debt](Tech-Debt)）。

### 家庭學習任務與舊素材

- 紙本與一次性活動的分類、建立、索引與共用規則，以 `learning-tasks/README.md` 為準。
- 舊 `aiden-math` 的 [`worksheets/word-problems/`](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 未隨匯入進來，只是按需改編的來源指標；先確認價值與歸檔位置再挑選搬入，保存之前不清理舊 repo，也不把未經查證的舊練習描述成孩子真實錯題。
- 主線外的 AI 協作故事網站維持分支來源登錄；是否整合另行決定。

## 非目標

- 不做登入帳號、密碼系統或多租戶後端；維持 family token＋child 維度，家長與孩子共用家庭存取權限。
- 不把網站遷到 Cloudflare Pages；託管留 GitHub Pages，Cloudflare 只代理 `/api/*`。
- 不把各 app 的教學邏輯抽成大型共用 framework；只共用平台基建。
- 不加入手寫辨識、筆順驗證、Apple Pencil 壓力／傾斜或儲存筆跡。
- 不恢復題庫「快速練習」模式。
- 不自動恢復 Native Camp Weekly Review 排程，不在孩子頁即時呼叫 LLM 或語音 API。
- 不把私人題包、老師原音、逐字稿或原始考卷放進公開 Git。
- 收藏不做兄弟排名、連續天數清零或按時間給獎勵；正式頁不載入 WebGL。
- 不清空舊 repo；不把免除舊進度搬遷解讀為資料清除授權。
- 不承諾每章都有紙本 PDF，也不為尚未出現的題型先建互動練習。
- 期中自然 unit 1／2 說明與 3 題隱藏題維持 `not planned`。

## 收斂原則

- 沒有硬 deadline；跟著學期與孩子實際需要走。
- 題庫先小批、先用既有題型、先驗證可接續，再擴題或擴章。
- 付費或不可逆的動作（製音、KV 前向寫入、累計重置、清理工作副本）都要有家長當次的明確要求與可核對的收據。
- 未做的實體 iPad 驗收如實記錄；家長已免除的檢查不重開，也不補寫成通過。
- Roadmap 只放方向與里程碑；逐項狀態以 code、GitHub issues、Git 歷史與 [Plan](Plan) 為準。
