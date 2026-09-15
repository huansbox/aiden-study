# iPad 單容器架構 spike 真機檢查表（issue #35）

> 狀態：2026-09-15 scope-v2 真機跨頁與標記讀取通過；Safari 儲存隔離待家長最後一次比對。#34 尚未切換網域。
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

v2 需由 Safari 重新加入主畫面，命名「平台測試 2」，保留舊圖示以保留原觀察。先複驗建立標記 → 目標頁 → 返回，通過才接著比較 Safari。#34、DNS、CNAME 與正式圖示仍不放行；以下真機 checklist 留待 v2 填寫。

## scope-v2 真機複驗與平台採用

家長依「Safari 重新加入平台測試 2 → 建立標記 → 前往同源目標頁」步驟，明確回報：**「沒有網址列，而且讀得到同一串標記」**。因此本次同源跨頁與標記讀取通過。尚未另取得 v2 的完整參數／回寫報告，不將其記成新增證據；Safari 隔離仍待比對。

最後一次比對已送出：在 Safari 開同一 v2 URL，手動把標記設為 `Safari測試` 並儲存，回主畫面「平台測試 2」重新讀取，確認原 `spike-…` 不被覆寫。比對完成前不關閉 #35、不切換 #34。

平台採用相同 scope：首頁與五個 app 共用 `platform.webmanifest`，全部相對路徑指回站根；省略 `start_url`／`id` 保留孩子網址，省略固定名稱以沿用各頁標題。原有獨立 app manifest 檔仍保留，現行頁面不再引用。完整 Node 285 pass，桌面已走完兩種部署前綴下的五 app 首頁往返（共十條流程），網址、孩子、標題與 manifest 解析位置正確；不當作正式主畫面圖示的真機驗收。

## 自動與桌面預檢（不算 iPad 驗收）

- [x] `node --test tests/test_platform_ipad_spike.mjs` 通過（14 tests；含真機失敗模式、回寫失敗與 manifest scope 回歸）；本輪完整 Node suite 283 pass
- [x] 桌面瀏覽器開啟測試網址，顯示 `child = test-spike`
- [x] 桌面瀏覽器顯示 token「參數存在」，且看不到原文
- [x] 建立標記後前往目標頁，目標頁讀到同一標記並回寫時間
- [x] 回主測試頁後，報告內可看到目標頁回寫時間
- [x] 桌面預檢報告顯示 `standalone: false`；這是預期結果，不代表 iPad 失敗

v1 桌面實測：1024 × 768、現行 GitHub Pages。跨頁前後標記均為 `spike-20260914235656-e2spx`，目標頁回寫時間 `2026-09-14T23:57:12.054Z`，主頁可讀回；`standalone: false`。v2 本機瀏覽器也已走完同一流程，標記 `scope-v2-desktop`、回寫 `2026-09-15T06:48:31.543Z` 可讀回。均未使用真實家庭金鑰或孩子進度。

## iPad 前置

1. 用 iPad Safari 開啟上方 Live URL。
2. 分享 →「加入主畫面」，名稱設為「平台測試 2」。保留舊測試圖示；不以重新整理舊圖示代替安裝。
3. 關閉原 Safari 分頁，從主畫面的「平台測試 2」圖示開啟。
4. 記錄測試環境：
   - 日期：`____-__-__`
   - iPad 型號：`________________`
   - iPadOS：`________________`
   - Safari：`________________`

## 前提 1：同源導覽留在 standalone

- [ ] 從主畫面圖示開啟後，主頁顯示 `Standalone = 是`
- [x] 點「前往同源目標頁」後，頁面沒有跳出 Safari，也沒有出現 Safari 網址列
- [ ] 目標頁系統模式已記錄，且依實際畫面確認沒有瀏覽器工具列；不只看 Standalone 值
- [ ] 點「回主測試頁」後仍留在同一 Web Clip

結果：`[ ] PASS  [ ] FAIL`

備註／截圖：`________________________________________________`

## 前提 2：圖示 URL 參數可由 JavaScript 讀取

- [ ] 主頁顯示 `child = test-spike`
- [ ] 主頁顯示 token「參數存在（16 字元，原文已隱藏）」
- [ ] 目標頁仍顯示相同 child 與 token 字元數
- [ ] 頁面與複製出的安全報告都沒有出現 `test-spike-token` 原文

結果：`[ ] PASS  [ ] FAIL`

備註／截圖：`________________________________________________`

## 前提 3：LocalStorage 容器邊界

### 3A. 同一 Web Clip 跨頁共享

1. 在 Web Clip 主頁按「建立／覆蓋標記」，記下標記：`________________`
2. 前往同源目標頁，再回主頁。

- [x] 目標頁讀到完全相同的標記
- [ ] 主頁顯示目標頁回寫時間

### 3B. Web Clip 與 Safari 隔離

1. 保留 Web Clip 內的標記。
2. 另從 Safari 直接開啟同一個 Live URL，不要從 Web Clip 跳出。
3. 觀察 Safari 頁面的「目前標記」。

- [ ] Safari 一開始看不到 Web Clip 內建立的標記
- [ ] Safari 建立另一個標記後，Web Clip 重新讀取仍保持原標記

結果：`[ ] PASS  [ ] FAIL`

備註／截圖：`________________________________________________`

## 結論與停線規則

- [ ] 前提 1 PASS
- [ ] 前提 2 PASS
- [ ] 前提 3 PASS
- [ ] 安全報告、裝置資訊與必要截圖已附到 issue #35

最終結論：`[ ] 三項成立，可關閉 #35  [ ] 任一失敗，停止 #34 並重新對齊架構`

失敗時不要用 workaround 強行通過。保留畫面、複製安全報告，在 issue #35 記錄實際行為後再進行 `/grill-me`。
