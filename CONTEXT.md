# CONTEXT — 詞彙表

**platform（全家學習平台）**：
aiden-study repo 重整後的整體——hub、registry、各學習 app 與進度同步服務的統稱。
_Avoid_: 網站、整站

**hub**：
網站根路徑的入口頁：小孩從這裡選人、進各 app；家長從這裡看全目錄。
_Avoid_: 首頁、入口、portal

**registry**：
驅動 hub 的 app 目錄資料檔（`docs/registry.json`）——每個學習 app 一筆。app 的增減、上下架、首頁順序只改這份資料。欄位語意：owner＝該 app 舊存檔／預設進度歸屬的 child（enum：aiden|bingpu）；audience＝首頁顯示對象（可複選，空＝僅家長目錄）；order＝每 child 的首頁排序（數字小在前）；status＝active|draft|parked|retired；category＝學科|興趣。
_Avoid_: 目錄、清單、catalog

**app**：
平台下的一個學習單元（題庫、注音、長除法、spelling bee⋯），各自是 `docs/` 下的子資料夾、獨立頁面與獨立 localStorage key。
_Avoid_: 子專案、模組

**child**：
進度歸屬的小孩身分，雲端進度 key 的第一維（`{child}:{app}`）。識別字串固定為：哥哥＝`aiden`、弟弟＝`bingpu`（取定不換，換＝進度搬家）。
_Avoid_: 帳號、user、account

**family token**：
藏在圖示網址參數的家庭密鑰，同步服務以它驗身，取代登入帳號（見 ADR-0003）。
_Avoid_: 密碼、API key

**sync client**：
接同步的 app 內嵌的共用同步腳本（`shared/sync-v<N>.js`，站內一律相對路徑引用——新舊 origin base path 不同）：開啟時 pull、進度變更後 push、離線靜默略過。平台基建，共用不複製（見 ADR-0004）。
_Avoid_: 同步模組、sync snippet

**逃生門（escape hatch）**：
不依賴雲端的手動進度備援——文字框匯出／匯入 localStorage 存檔（沿用哥哥版與注音版既有慣例）。
_Avoid_: 備份功能
