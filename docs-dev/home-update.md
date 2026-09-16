# 首頁程式自動更新

針對 Safari 與已安裝主畫面停留不同版本的問題（#63）。家庭設定／學習進度同步仍沿用原機制；本功能另檢查首頁程式發布版本。

## 使用行為

僅孩子首頁載入更新器。開啟、回到前景、返回快取、網路恢復及前景每 30 秒檢查，短時間重複事件合併。登入尚未確認、登入表單開啟、頁面在背景或已離開時不更新；練習頁與家長後台不載入更新器，因此不會中斷作答或清掉未儲存表單。

偵測新版後，先確認首頁 HTML 的版本與發布資訊一致，再以帶 `_release` 的同站網址重新載入，保留孩子與 hash。新版 HTML 引用同版本的 JS/CSS，避免重用瀏覽器裡的舊資源。Cookie、家庭設定與學習 LocalStorage 不清除；sessionStorage 只記錄更新嘗試，避免同一版本快速反覆重載。

發布途中檔案不一致、離線、逾時或回應不合法時保留現有首頁，下次再檢查。同一版本重載未成功至少五分鐘後才重試；sessionStorage 不可用時以網址阻止同版本迴圈。沒有加入 Service Worker 或離線下載。

## 每次發布

修改首頁或相依資源後，執行 `node scripts/build-home-release.mjs`，把產生的 `docs/index.html` 與 `docs/home-release.json` 一起提交。`node scripts/build-home-release.mjs --check` 已透過 `tests/test_home_update.mjs` 納入既有 Node CI，漏更新版本會失敗。

版本 SHA-256 涵蓋首頁 HTML、首頁直接引用的 shared JS/CSS、registry 與平台 manifest；先移除產生的版本字串再計算，正規化 LF/CRLF，跨 Windows／Linux 可重現。首頁直接引用的 JS/CSS URL 皆使用同一版本；平台 manifest 位址維持不變，不改既有兩個圖示的設定。registry 依版本網址讀取。

`home-release.json` 以 no-store 與每次查詢參數讀取；新首頁先以 cache: reload 預讀確認並更新 HTTP cache，再導覽至相同版本網址。參考 [Fetch cache 行為](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)。Worker、Cloudflare route、家庭金鑰與 KV 均未變更。

## 第一次換到有更新器的版本

發布無法遠端替換已經執行中的舊 JavaScript。完全不含更新器的舊首頁，第一次需要真正重新導覽或從多工畫面完整關閉再開啟；既有 HTTP 快取到期前仍可能沿用舊 HTML。這是首次換版限制，不能宣稱舊頁面會自行學會更新。載入本版更新器後，之後發布才由上述流程接手。

不要用清除整站資料或重建孩子身分處理版本問題。若已重新載入仍不同，應區分「程式版本」「家庭連線」「家庭設定」三項查證，而不是把它們都當作資料同步失敗。

## 驗證方式

`tests/test_home_update.mjs` 執行真正更新器，驗證前景更新、沒有新版、壞回應、背景晚回應、登入輸入、重載迴圈、部署前綴與 child/hash 保留；並執行真正 device-auth.js 重現帶金鑰圖示的連線競速，確認 Cookie 讀回前不重載。

瀏覽器使用 `node tests/helpers/serve-family.mjs <port>`：在 `/test/controls` 選發布 A、開啟孩子首頁，再切發布 B。測試 HTML、JS、CSS 都有獨立 A/B 標記與不同版本網址，並給十分鐘快取；確認舊頁面自動取得 B 的三種資源，原登入、孩子、已存設定與家長未存草稿保持。這是隔離 test-token／記憶體 KV 驗證，不代表實際 iPad 已更新。

本次本地結果：Node 336 項、pytest 184 項通過。Chrome 隔離首頁 A → B 自動更新，三種資源標記皆為 B，child/hash 與登入保留；已存文章名稱、另一分頁的家長未存草稿保持。另在數學答對一題後切換發布，練習頁仍停在原題／答案，回首頁後累計一題保留。

獨立 review 修正登入競速：舊圖示的 k 會先從網址移除，更新器須等待 Cookie 讀回確認後才離開保存 legacy key 的頁面。真實 device-auth.js 時序回歸已驗證；複核無剩餘 finding。版面與 UI 未改動，未要求補做逐項 iPad 真機驗收。
