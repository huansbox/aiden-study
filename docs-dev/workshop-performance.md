# 拼裝工坊的載入與隔離量測

追蹤 [#214](https://github.com/huansbox/aiden-study/issues/214)。本文件記錄可重現的素材工作量與隔離量測入口；實體 iPad 的觸控、長期使用及孩子自主理解仍由 [#201](https://github.com/huansbox/aiden-study/issues/201) 追蹤。

## 已定位的等待

- `train-workshop.js` 原本會在進場時等待整台所有 PNG 與遮擋變體。尚未取得的未來包若慢或失敗，也會讓當前包停在「準備中」。E500、CT273、藍皮工坊皆走這個入口。
- `brick-workshop.js` 的一般工坊原本已按當前包載入；它的已拼部件仍會預載該部件所有遮擋變體。已拼部件只需要當前實際遮擋版本。EMU3000、R200、700T、N700S、EMU900 走這個入口，不能把它們也寫成原本有全車進場門檻。
- 選車／收藏室原本把八台完整縮圖拆成 300 個部件，並額外預載所有遮擋變體，合計 545 張。每張圖片回呼會重新建立整頁 DOM；同一批圖片完成時造成重複工作。
- `collection.placePart()` 本來就在本機 outbox 保存後回傳，沒有等待網路。永久完成、慶祝、上架仍以伺服器的 `completedAt` 為準。

## 本輪修正

- 圖形工坊只等待固定鐵軌、目前已拼部件的實際圖片、本包任意順序操作需要的遮擋變體；藍皮特寫另載當下操作圖。下一包第一次開啟時才等待它自己的必要圖片；失敗保留重試。未來包不擋當前包。
- 一般工坊的已拼部件只等待當前可見遮擋版本，本包仍備齊任意放置順序所需變體。
- 完成作品、選車卡、確認大圖、收藏室與圖鑑改用每台一張 `preview.webp`；半成品維持原部件與位置。縮圖由既有 full-mask 部件按原座標確定性合成，沒有另畫或改造型。
- 同批圖片回呼合併到下一個 animation frame 更新；模型分件索引快取。圖形工坊的點按接合動畫由 520 ms 改為 220 ms，拖曳由 240 ms 改為 180 ms，期間保留可見的零件移動。
- 新車採卡片 → 大圖確認 → 伺服器選定。確認頁先載大圖，再開放確認；列出所需包數、零件盒包數、目前可拼包數。送出前返回不寫入；送出後若回應遺失，顯示車名與「正在等連線確認選車」，重試同一命令，確認結果前不能假取消或改選。成功後進入工坊，伺服器明確拒絕後才可返回換車。完工與上架後可直接選下一台，沒有餘包也可先選車等待。

## 素材工作量

執行 `node scripts/measure-workshop-art.mjs` 讀取 checked-in 素材，與實際網速、HTTP 快取及瀏覽器解碼時間無關。

| 範圍 | 修正前 | 修正後 |
| --- | --- | --- |
| 八車選擇／收藏室的預載圖片 | 545 張，24,724,099 bytes | 8 張，327,962 bytes |
| E500 工坊開始的必要圖片 | 全車 71 張，3,416,469 bytes | 固定軌道＋第一車體包 9 張，443,717 bytes |
| CT273 工坊開始的必要圖片 | 全車 68 張，2,473,536 bytes | 固定軌道＋第一車體包 8 張，496,624 bytes |
| 藍皮工坊開始的必要圖片 | 全車 71 張，3,820,273 bytes，另含特寫圖 | 固定軌道＋第一車體包 10 張，501,755 bytes |

表格只計會阻擋操作的圖片或明確預載。工坊章節小圖、下一包預覽可能另外發出不阻擋當前包的請求，不能把表格當成完整 network waterfall。

縮圖重建與一致性檢查：

```sh
node scripts/build-brick-previews.mjs
node scripts/build-brick-previews.mjs --check
node scripts/measure-workshop-art.mjs
```

## 本機瀏覽器量測入口

在隔離 worktree 啟動 `node tests/helpers/serve-family.mjs 8817`。伺服器僅使用 synthetic 資料、`test-token`、Miniflare KV／SQLite；測試 route 不進正式 Worker。此入口會重設該本機 origin 的 synthetic Aiden 收藏快取與 outbox，不能改成正式網域執行。

- 修正前 E500：`/test/workshop-fixture?model=e500&version=1&packs=14&futureFrom=5&futureDelay=10000&baseline=1`
- 修正後 E500：`/test/workshop-fixture?model=e500&version=2&packs=13&futureFrom=5&futureDelay=10000`
- 一般工坊：`/test/workshop-fixture?model=emu3000&version=2&packs=11&futureFrom=5&futureFail=1`
- 留最後一片：加上 `stage=finish`；直接選車：加上 `stage=picker`；零件盒空：選車情境加上 `packs=0`。

`baseline=1` 只替換工坊兩個 JavaScript 為基線 `3405178924bea0e3f6905a5e06d2512050ca5b18`，其餘核心、CSS 與測試基礎設施仍使用本次工作目錄；不是完整歷史部署復刻。回應採 `no-store`，不同測試入口不共用 HTTP 快取。

頁面 `#workshop-timing` 顯示啟動至第一個可操作零件的毫秒數，以及已完成部件圖片請求數。E500 新版第一件為 `.part-button[data-part="p2-1"]`，接合按鈕為 `button[data-e500-action="place"]`；一般工坊為 `.brick-part[data-part="p2-1"]`，點選後接合按鈕為 `button[data-action="target"]`。

`futureFrom` 指來源素材包號，例如 `5` 對應 `p5-*`，不是 v2 孩子看到的包序。延遲／失敗只影響符合條件的零件 PNG。家長試拼頁與真正孩子資料、API 完全隔離；新試拼也從已備鐵軌開始。

## 隔離瀏覽器實測

2026-10-19 統籌使用提供的 CUA browser 工具操作本機 synthetic fixture，並讀取 `#workshop-timing`：

- 基線 E500，`futureFrom=5&futureDelay=10000`：停在載圖畫面，未來包延遲時無法操作當前包；已截圖保存於該次驗收附件。
- 新版同樣延遲條件：111 ms 出現可操作零件，實際完成第一個車體包。沒有延遲的另一輪為 174 ms。
- 新版完整 13 包、39 組 E500 已實際操作完成，包含試推、伺服器完成、上架；零餘包仍能選下一台，依序檢查 EMU3000 確認、返回、CT273 確認。
- 從原卡自選加碼，連續三批各 2 題共得 3 包；用這三包選 EMU3000，拼好第一包三組、第二包一組。維護頁先下載備份並讀回，再退回 3 包（1 包完整、1 包部分、1 包已配未拼），grant 總數仍為 3。
- 藍皮 v2 從 15／33 到 16／33，先接框再嵌窗扇，開窗至 100；重新載入仍為 16 組。
- CT273 v2 在 36／39 時連桿使三輪同步到 90°；試拆後第一輪 105°、另兩輪 90°；CUA 實際拖動大輪後第一輪 194°、另兩輪仍為 90°。
- 390px、768px 視窗的實際 geometry 檢查沒有橫向溢出；新版流程的瀏覽器 warning／error 為空。

毫秒起點是測試頁 `#hub` 建立後、正式腳本載入前的 `performance.now()`，終點是第一個可操作零件出現；它不是 HTTP navigation start，也不是實體 iPad 的數據。這是有限條件下的單次測量，含本機網路與桌面瀏覽器效應，不能解讀成所有裝置必定低於指定毫秒，或家長先前延遲已被完整重現。

## 驗證界線

本輪 CUA 拖曳是實際瀏覽器 pointer 操作，未確認 `pointerType` 為 `touch`；沒有宣稱 touch input 或實體 iPad 觸控已驗收。歷史 `scripts/verify-collection-e2e.mjs` 的 selector、選車與 ID／包數假設不相容目前版本，本輪未執行；現行入口與 Node／SQLite 證據見 [每日目標與拼裝收藏的驗證說明](daily-brick-collection.md#可重現驗證)。

Node UI harness 覆蓋 v1 續拼、v2 第一包與完整 E500／CT273／藍皮組裝、當前素材失敗與重試、未來素材不成為門檻、完成前不得上架、確認取消與零餘包換車；preview adapter 的八款車逐包與最後一片皆有隔離測試。這些測試不是實體 iPad 驗收，也不能單獨宣稱已重現家長先前看到的延遲。
