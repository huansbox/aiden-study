# CONTEXT — 詞彙表

**platform（全家學習平台）**：
aiden-study repo 重整後的整體——hub、registry、各學習 app 與進度同步服務的統稱。
_Avoid_: 網站、整站

**hub**：
平台的入口：每個孩子有自己的活動首頁；未指定孩子時顯示入口選擇。家長管理與孩子練習分開。
_Avoid_: 首頁、入口、portal

**registry**：
平台可提供的 app 目錄與已發布閱讀文章索引；文章與 app 分開列出。owner 指舊存檔歸屬，audience／order 指目錄預設的顯示對象／順序，status 指上下架狀態；各孩子實際看見的活動與排序由家庭設定決定。
_Avoid_: 目錄、清單、catalog

**app**：
平台下的一個學習單元（題庫、注音、長除法、spelling bee⋯），各自是 `docs/` 下的子資料夾、獨立頁面與獨立 localStorage key。
_Avoid_: 子專案、模組

**learning task（家庭學習任務）**：
有特定活動、場地或日期的學習素材包，例如旅行觀察卡或每週閱讀文章；可由 hub 的目前文章入口連到成品，不因此成為長期 app。
_Avoid_: app、開發文件

**child**：
進度歸屬的小孩身分，雲端進度 key 的第一維（`{child}:{app}`）。識別字串固定為：哥哥＝`aiden`、弟弟＝`bingpu`（取定不換，換＝進度搬家）。
_Avoid_: 帳號、user、account

**family token**：
全家共用的連接金鑰，供家長首次授權一個入口使用家庭資料；舊版入口過渡期間仍以它直接存取資料。它不區分家長與孩子兩種權限。
_Avoid_: 密碼、API key

**device connection（入口連線）**：
家長授權某個瀏覽器或主畫面入口持續使用家庭資料的狀態；不是硬體身分，同一台 iPad 的 Safari 與主畫面入口可能各有一份。連線有效時不必反覆輸入家庭金鑰，失效時由家長重新連接。

**family settings（家庭設定）**：
家長替每個孩子選擇的活動、順序、題庫學期、頭像、目前心智圖、常用網站與選填練習安排。

**home entry（首頁卡片）**：
孩子開啟一項活動的入口；可以是一個題庫科目、練習 app、目前心智圖或常用網站。同一活動只有一張卡，有當日任務時在卡內顯示。
_Avoid_: task、練習安排

**current mind map（目前心智圖）**：
已發布閱讀文章中日期最新的一篇，是心智圖入口的預設文章。孩子可另選過去文章，選舊篇不改變預設；家長控制心智圖入口是否顯示。

**learning website（常用網站）**：
家長自行管理名稱、網址與顯示對象的學習連結；外站作答與時間不自動算進平台累計。

**practice assignment（練習安排）**：
家長指定孩子練哪個內容、完成多少份量的線上任務，可固定在每週某天或安排於特定日期；不限制孩子選其他活動。
_Avoid_: learning task、家庭學習素材包

**task occurrence（當日任務）**：
一份練習安排落在特定日期的實際任務；當天進度與完成紀錄以它為單位，未完成不累積到隔天。

**practice activity（練習紀錄）**：
孩子新完成的作答、閱讀卡片與使用中的練習時間；與各 App 的熟練度、錯題和過關進度分開。

**sync client**：
接同步的 app 內嵌的共用同步腳本（`shared/sync-v<N>.js`，站內一律相對路徑引用——新舊 origin base path 不同）：開啟時 pull、進度變更後 push、離線靜默略過。平台基建，共用不複製（見 ADR-0004）。
_Avoid_: 同步模組、sync snippet

**wiring layer（接線層）**：
app 與平台基建之間那段「開機準備工作」的統稱——身分解析、child 存檔尋址、同步 client 建立、家長區健康燈、匯入編排等四 app 同款的接線碼；共用腳本＝`shared/wiring-v1.js`（ADR-0005）。與 sync client 的分界：sync client 管雲端協定，接線層管 app 這一側怎麼把它接起來。
_Avoid_: boilerplate、glue code、開機碼

**逃生門（escape hatch）**：
不依賴雲端的手動進度備援——文字框匯出／匯入 localStorage 存檔（沿用哥哥版與注音版既有慣例）。
_Avoid_: 備份功能
