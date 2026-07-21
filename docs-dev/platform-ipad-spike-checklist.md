# iPad 單容器架構 spike 真機檢查表（issue #35）

> 狀態：測試頁、自動測試與桌面預檢已可先完成；以下 iPad 結果尚未驗證，不得用桌面結果代替。
>
> 目的：在搬到 `kids.linshuhuan.com` 前，確認單一主畫面 Web Clip 可以承載 hub 與同源 app，且網址身分參數與儲存容器行為符合架構前提。

## 測試網址與安全規則

- Live：<https://huansbox.github.io/aiden-study/platform-ipad-spike.html?child=test-spike&k=test-spike-token>
- 測試頁：`docs/platform-ipad-spike.html`
- 同源目標頁：`docs/platform-ipad-spike-target.html`
- 只使用上方假的 `test-spike-token`，不可貼真實 family token。
- 兩頁都刻意不掛 manifest；本測試要驗證主畫面圖示原始 URL 的 query，不讓 `start_url` 介入。
- 頁面只顯示 token 是否存在與字元數，不顯示或保存原文。

## 自動與桌面預檢（不算 iPad 驗收）

- [x] `node --test tests/test_platform_ipad_spike.mjs` 通過（11 tests；含 inline runtime 跨頁回寫模擬）
- [ ] 桌面瀏覽器開啟測試網址，顯示 `child = test-spike`
- [ ] 桌面瀏覽器顯示 token「參數存在」，且看不到原文
- [ ] 建立標記後前往目標頁，目標頁讀到同一標記並回寫時間
- [ ] 回主測試頁後，報告內可看到目標頁回寫時間
- [ ] 桌面預檢報告顯示 `standalone: false`；這是預期結果，不代表 iPad 失敗

## iPad 前置

1. 用 iPad Safari 開啟上方 Live URL。
2. 分享 →「加入主畫面」，名稱設為「平台 Spike」。
3. 關閉原 Safari 分頁，從主畫面的「平台 Spike」圖示開啟。
4. 記錄測試環境：
   - 日期：`____-__-__`
   - iPad 型號：`________________`
   - iPadOS：`________________`
   - Safari：`________________`

## 前提 1：同源導覽留在 standalone

- [ ] 從主畫面圖示開啟後，主頁顯示 `Standalone = 是`
- [ ] 點「前往同源目標頁」後，頁面沒有跳出 Safari，也沒有出現 Safari 網址列
- [ ] 目標頁顯示 `Standalone = 是（仍在 Web Clip）`
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

- [ ] 目標頁讀到完全相同的標記
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
