# 兩個孩子的主畫面入口與正式網域

更新：2026-09-15。追蹤：[#34](https://github.com/huansbox/aiden-study/issues/34)、[#35](https://github.com/huansbox/aiden-study/issues/35)。

## 本次範圍與家長決定

依序完成各 app 回孩子首頁、iPad 主畫面檢查、`kids.linshuhuan.com` 上線，以及哥哥／弟弟兩個正式捷徑。

家長明確表示目前尚未正式給孩子使用，**本次不需要備份、收割、還原或對帳舊進度**。此決定取代 #34／#26 及先前文件對這次搬遷的舊資料前置要求；不是清除現有本機或雲端資料的授權。程式仍保留正常存檔、child 隔離與同步功能。舊 repo 清理、題庫擴充與注音錄音在本輪之後處理。

## 已完成：各 app 回到孩子首頁

- Release：`5a1e8f68d3dfacc1e405de36eb1a174327eeaf1b`，已發布到現行 GitHub Pages。
- Study、長除法、英文拼字、注音將既有身分徽章改成「回哥哥／弟弟首頁」連結；數織補上相同用途的連結。返回時保留 `child`，不把 family token 放入返回連結。
- 哥哥與弟弟首頁的頁面名稱分別為「哥哥學習」「弟弟學習」；hub 保持不掛 manifest，加入主畫面 Web App 所需的 Apple meta。
- 本機 Node 267 tests、pytest 167 tests 通過。此為本輪實際結果；[CI](https://github.com/huansbox/aiden-study/actions/runs/34910543706) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/34910542411) 均 success。
- 桌面瀏覽器以 1024 × 768 檢查五個 app 的首頁往返；分別使用 `/aiden-study/` 與 `/` 根路徑，返回網址與 child 正確，五個畫面的連結均可操作。這是桌面預檢，不是 iPad 主畫面結果。另已確認現行線上首頁、五 app HTML 與共享 wiring 共七個檔案均回應 HTTP 200，內容與本次發布相符。

## 尚未完成：iPad 與網域

1. #35 主畫面跨頁、網址參數與儲存隔離：已送出一輪合併操作請求，等待家長回報；原始檢查表見 [platform-ipad-spike-checklist.md](platform-ipad-spike-checklist.md)。
2. Cloudflare：`linshuhuan.com` zone 為 active；已沿用 Chrome 既有 Google 登入進入正確帳戶。Wrangler OAuth 不含 DNS 權限，後續使用已登入的 DNS 管理頁，不擴大 OAuth 權限或新增 token。新增 DNS 表單已填妥 `kids` → `huansbox.github.io`、DNS only、TTL 自動，尚未儲存。
3. 正式網域候選檔：`docs/CNAME` 與 `tests/test_pages_domain.mjs` 已準備並通過單項 audit，只保留在 `codex/child-home-domain` 工作分支；不合併到發布用 master，等待 #35 結果。
4. GitHub Pages：目前 `cname = null`，仍使用 `https://huansbox.github.io/aiden-study/`。#35 通過且 DNS 管理登入就緒前，不提交 CNAME 到發布分支、不改 DNS。
5. 正式上線後檢查 HTTPS、舊網址轉向保留 path／child、各 app 資產及同步服務的允許來源，再建立兩個主畫面圖示。尚未完成的 live 檢查不記成通過。

## 正式入口規劃（尚未上線）

| 圖示名稱 | 預定網址 |
| --- | --- |
| 哥哥學習 | `https://kids.linshuhuan.com/?child=aiden` |
| 弟弟學習 | `https://kids.linshuhuan.com/?child=bingpu` |

兩個圖示各自指向孩子首頁。若新主畫面環境提示未設定家庭金鑰，由家長在該環境完成既有設定；不假設 Safari 的設定會跟著圖示帶入。

DNS 設定將使用 `kids` 的 CNAME 指向 `huansbox.github.io`，先採 DNS only，GitHub Pages 供應 HTTPS 憑證；根據 [GitHub 自訂子網域說明](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。
