# 兩個孩子的主畫面入口與正式網域

更新：2026-09-15。追蹤：[#34](https://github.com/huansbox/aiden-study/issues/34)、[#35](https://github.com/huansbox/aiden-study/issues/35)。

## 本次範圍與家長決定

依序完成各 app 回孩子首頁、iPad 主畫面檢查、`kids.linshuhuan.com` 上線，以及哥哥／弟弟兩個正式捷徑。

家長明確表示目前尚未正式給孩子使用，**本次不需要備份、收割、還原或對帳舊進度**。此決定取代 #34／#26 及先前文件對這次搬遷的舊資料前置要求；不是清除現有本機或雲端資料的授權。程式仍保留正常存檔、child 隔離與同步功能。舊 repo 清理、題庫擴充與注音錄音在本輪之後處理。

## 已完成：各 app 回到孩子首頁

- Release：`5a1e8f68d3dfacc1e405de36eb1a174327eeaf1b`，已發布到現行 GitHub Pages。
- Study、長除法、英文拼字、注音將既有身分徽章改成「回哥哥／弟弟首頁」連結；數織補上相同用途的連結。返回時保留 `child`，不把 family token 放入返回連結。
- 哥哥與弟弟首頁的頁面名稱分別為「哥哥學習」「弟弟學習」。初版只加 Apple meta；經 #35 真機複驗後，首頁與五個 app 已共用 `platform.webmanifest` 的全站 scope，省略 `start_url`／`id` 保留孩子網址與身分。
- 本機 Node 267 tests、pytest 167 tests 通過。此為本輪實際結果；[CI](https://github.com/huansbox/aiden-study/actions/runs/34910543706) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/34910542411) 均 success。
- 桌面瀏覽器以 1024 × 768 檢查五個 app 的首頁往返；分別使用 `/aiden-study/` 與 `/` 根路徑，返回網址與 child 正確，五個畫面的連結均可操作。這是桌面預檢，不是 iPad 主畫面結果。另已確認現行線上首頁、五 app HTML 與共享 wiring 共七個檔案均回應 HTTP 200，內容與本次發布相符。

## 正式網域切換紀錄

- #35 已結案：v2 同源跨頁沒有網址列、讀到同一標記；Safari 改存 `Safari測試` 後，家長回主畫面讀到原 `spike-…`，儲存隔離通過。詳見 [真機紀錄](platform-ipad-spike-checklist.md)。平台採用共同 scope 的 release 為 `cbdfcea`；Node 285 pass、桌面十條往返通過。
- 2026-09-15 15:16（Asia/Taipei），`docs/CNAME` 與 audit 已合併發布；CNAME commit 為 `7cd19f8`，驗收文件 commit 為 `e827287`。GitHub Pages API 已讀回 `cname=kids.linshuhuan.com`，來源維持 `master:/docs`。
- 確認 GitHub 已綁定網域後，才儲存 Cloudflare `kids` CNAME → `huansbox.github.io`，DNS only、TTL 自動。管理頁顯示記錄已建立，公共解析器 1.1.1.1 亦讀到相同 CNAME（TTL 300）。其他 DNS 記錄未修改；沒有新增 token 或擴權。
- [CI](https://github.com/huansbox/aiden-study/actions/runs/34940848632) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/34940847794) success；CI Node 286 pass、pytest 183 pass／1 skipped；CNAME audit 本機 1 pass。
- 15:18 HTTPS 憑證已 approved，HTTPS 首頁回應 200；已啟用 `https_enforced=true` 並讀回確認。GitHub 負責憑證更新，Cloudflare 保持 DNS only。

## 正式網址驗證結果

- 哥哥／弟弟首頁與五個 app，共七條舊 GitHub Pages URL 均 server-side 301 到正式網域，保留 path 與 child query。HTTP 入口亦 301 到相同網址的 HTTPS。
- 28 個主要 HTML、manifest、JavaScript、CSS、公開題庫／說明／registry／注音內容、數織題庫與模組及一張獎勵圖，均 HTTP 200，內容與 `e827287` Git blob 完全相符。公開題庫仍為 1,924 題。比對基準使用 Git 的 LF 原文，避免 Windows 工作目錄 CRLF 造成假差異。
- 新 HTTPS origin 的瀏覽器實際走完哥哥四個 app 與弟弟注音的首頁往返，child 正確；首頁標題分別為「哥哥學習」「弟弟學習」。題庫顯示學科與題數、長除法顯示題目、拼字顯示單字卡、數織開出第一題，均正常。
- 注音首頁與返回連結正常，但按「開始練習」顯示尚未錄好音檔，這是既有 #20 的 14 段錄音待辦，不列為網域故障，也不宣稱注音內容已可練習。
- 四上 private pack 在乾淨瀏覽器顯示「尚未設定家庭金鑰」，符合預期；未使用真實 token、未讀寫孩子雲端進度，不將此輪標成真實授權的同步閉環驗收。

切換後 Worker 的題包 GET 與測試 child 進度 PUT 預檢（僅送 OPTIONS，不送 PUT）均回應 204，允許 `https://kids.linshuhuan.com`、Content-Type／Authorization 與 GET／PUT 等方法。實際授權資料路徑留待家庭正常使用；本輪不新增金鑰讀取或進度寫入。

## 兩個正式入口（已上線，家長已確認圖示安裝）

| 圖示名稱 | 網址 |
| --- | --- |
| 哥哥學習 | `https://kids.linshuhuan.com/?child=aiden` |
| 弟弟學習 | `https://kids.linshuhuan.com/?child=bingpu` |

兩個圖示各自指向孩子首頁。若新主畫面環境提示未設定家庭金鑰，由家長在該環境完成既有設定；不假設 Safari 的設定會跟著圖示帶入。

安裝：在 iPad Safari 分別開啟上方網址，按「分享」→「加入主畫面」，名稱分別保留「哥哥學習」「弟弟學習」。2026-09-15 家長回報「兩個 iPad 圖示已安裝」，本輪 #34 完成並結案；不要求再逐項補測。這項回報只證明安裝完成，不新增真實授權同步或逐題練習的驗收宣稱。舊圖示或 repo 沒有刪除。

DNS 設定使用 `kids` 的 CNAME 指向 `huansbox.github.io`，先採 DNS only，GitHub Pages 供應 HTTPS 憑證；根據 [GitHub 自訂子網域說明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。
