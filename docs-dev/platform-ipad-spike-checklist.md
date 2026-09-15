# iPad 單容器架構 spike 真機檢查表（issue #35）

> 狀態：2026-09-15 scope-v2 真機功能驗收通過，包含跨頁標記讀取與 Safari 儲存隔離；#35 可結案，#34 可進行網域切換。
>
> 目的：在搬到 `kids.linshuhuan.com` 前，確認單一主畫面 Web Clip 可以承載 hub 與同源 app，且網址身分參數與儲存容器行為符合架構前提。

## 測試網址與安全規則

- Live v2：<https://huansbox.github.io/aiden-study/platform-ipad-spike.html?child=test-spike&k=test-spike-token&v=2>
- 測試頁：`docs/platform-ipad-spike.html`
- 同源目標頁：`docs/platform-ipad-spike-target.html`
- 只使用上方假的 `test-spike-token`，不可貼真實 family token。
- v1 不掛 manifest；v2 改掛同一份 `platform-ipad-spike.webmanifest`，明定 `scope: "./"`、`display: "standalone"`，省略 `start_url`／`id`，沿用安裝頁原網址與 query。真機跨頁通過後，hub 與五個 app 採用同等設定的 `platform.webmanifest`。
- 頁面只顯示 token 是否存在與字元數，不顯示或保存原文。

## 2026-09-15 v1 真機結果與重新評估

環境：iPad、橫向、由主畫面圖示啟動；型號與 iPadOS／Safari 版本未知。證據為對話附件「截圖 2026-09-15 下午2.35.56.jpeg」「截圖 2026-09-15 下午2.38.44.jpeg」，以及家長按「完成」回原頁後確認「目前標記」仍是一串 `spike-…`。未要求或保存真實家庭金鑰。

| 項目 | 結果與證據 |
| --- | --- |
| 主畫面啟動、child／k 參數 | 可見成功：原頁沒有瀏覽器工具列，兩頁均有 `child=test-spike` 與 16 字元 token 提示；未另取得完整安全報告 |
| 同 origin 導覽留在原 Web Clip | FAIL：目標頁出現「完成」、網址列與 Safari 控制項 |
| 同一 Web Clip 跨頁共享標記 | FAIL：原頁已有標記，目標頁未讀到且未回寫；回原頁標記仍在 |
| Safari 與 Web Clip 隔離 | 未測；先處理跨頁問題 |

原頁 `navigator.standalone=true` 但 `display-mode=browser`；目標頁只用模式旗標就宣稱「仍在 Web Clip」的判讀不可靠。v2 顯示原始模式與儲存結果，無標記或回寫失敗明示未通過；有標記仍須核對無瀏覽器工具列，不自動判定真機 PASS。

重新評估的最小候選：保持原本兩個孩子入口、同源頁面、網址身分與標準 `<a>` 導覽，只在測試頁明定 navigation scope，不加 click 攔截、iframe 或搬運儲存資料的 workaround。`scope` 的用途見 [Apple WWDC23](https://developer.apple.com/videos/play/wwdc2023/10120/)；省略 `start_url` 沿用 document URL，依 [W3C 規格](https://www.w3.org/TR/appmanifest/#start_url-member) 與 [WebKit parser](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/applicationmanifest/ApplicationManifestParser.cpp)。這些來源支持候選設定，不代表已證明該 iPad 的根因或修復成功。

當時的複驗安排為由 Safari 重新加入主畫面「平台測試 2」，先比對跨頁，再比較 Safari。此階段的停止切換要求已由下方 v2 功能驗收結果解除；v1 FAIL 歷史保留。

## scope-v2 真機複驗與平台採用

家長依「Safari 重新加入平台測試 2 → 建立標記 → 前往同源目標頁」步驟，明確回報：**「沒有網址列，而且讀得到同一串標記」**。因此本次同源跨頁與標記讀取通過。尚未另取得 v2 的完整參數／回寫報告，不將其記成新增證據。

最後一次比對：在 Safari 開同一 v2 URL，手動把標記設為 `Safari測試` 並儲存，回主畫面「平台測試 2」重新讀取。家長明確回報 **「原本的 `spike-…`」**，因此 Safari 寫入未覆寫主畫面 App 的標記，儲存隔離通過。依家長個人專案不再逐項補測細節的決定，合併功能回報與既有參數證據完成 #35；不再追加環境欄位或原始報告收集。

平台採用相同 scope：首頁與五個 app 共用 `platform.webmanifest`，全部相對路徑指回站根；省略 `start_url`／`id` 保留孩子網址，省略固定名稱以沿用各頁標題。原有獨立 app manifest 檔仍保留，現行頁面不再引用。完整 Node 285 pass，桌面已走完兩種部署前綴下的五 app 首頁往返（共十條流程），網址、孩子、標題與 manifest 解析位置正確；不當作正式主畫面圖示的真機驗收。

## 自動與桌面預檢（不算 iPad 驗收）

- [x] `node --test tests/test_platform_ipad_spike.mjs` 通過（14 tests；含真機失敗模式、回寫失敗與 manifest scope 回歸）；本輪完整 Node suite 283 pass
- [x] 桌面瀏覽器開啟測試網址，顯示 `child = test-spike`
- [x] 桌面瀏覽器顯示 token「參數存在」，且看不到原文
- [x] 建立標記後前往目標頁，目標頁讀到同一標記並回寫時間
- [x] 回主測試頁後，報告內可看到目標頁回寫時間
- [x] 桌面預檢報告顯示 `standalone: false`；這是預期結果，不代表 iPad 失敗

v1 桌面實測：1024 × 768、現行 GitHub Pages。跨頁前後標記均為 `spike-20260914235656-e2spx`，目標頁回寫時間 `2026-09-14T23:57:12.054Z`，主頁可讀回；`standalone: false`。v2 本機瀏覽器也已走完同一流程，標記 `scope-v2-desktop`、回寫 `2026-09-15T06:48:31.543Z` 可讀回。均未使用真實家庭金鑰或孩子進度。

## 合併驗收結論

| 架構前提 | 驗收證據與範圍 |
| --- | --- |
| 同源導覽留在主畫面 App | v2 家長確認目標頁「沒有網址列」 |
| 安裝網址參數可讀 | v1 兩張真機截圖均顯示 child 與測試 token 長度；v2 未另收完整參數報告。manifest 省略 start_url／id 的網址保留行為另有自動檢查 |
| 同一主畫面 App 跨頁讀取 | v2 家長確認「讀得到同一串標記」 |
| Safari 與主畫面 App 儲存隔離 | Safari 改存 `Safari測試` 後，家長回主畫面重新讀取仍是原 `spike-…` |

**結論：依家長合併功能回報完成 #35，解除 #34 網域切換前置條件。** iPad 橫向；型號、系統版本、v2 原始模式報告與真機回寫時間未收集，不補稱已實測。後續正式網址 HTTPS 已上線，家長於同日確認哥哥／弟弟兩個 iPad 圖示已安裝；詳見 [上線紀錄](platform-domain-rollout.md)。

若後續實際使用再出現彈出瀏覽器或讀不到資料，依該次具體現象處理；不將本次已接受的未收集細節列為待家長補驗。
