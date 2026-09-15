# HANDOFF

- Status: in_progress
- Task/issue: #34 正式網域與兩個孩子入口；前置 #35 iPad 主畫面檢查
- Branch: codex/ipad-scope-spike（CNAME 候選另留 codex/child-home-domain）
- Updated: 2026-09-15

## Progress

家長要求依序完成首頁往返、主畫面檢查、正式網域與兩個捷徑，做到 e2e。家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；不清除現有資料。後續以實際使用為準，不再拆成細碎的按鈕驗收。

`5a1e8f68d3dfacc1e405de36eb1a174327eeaf1b` 已發布：五個 app 補齊回孩子首頁，保留 child；兩個 hub 頁面名稱分別為「哥哥學習」「弟弟學習」，補上主畫面 Web App meta。Node 267、pytest 167 pass；CI 與 Pages success。桌面 1024 × 768 已走完五 app 在 `/aiden-study/` 與 `/` 下的往返，並檢查連結版面。

結果、家長取捨、網域設定與未完成事項集中在 [正式網域上線紀錄](docs-dev/platform-domain-rollout.md)。#55 四上 U1 已於 2026-09-14 結案，原證據見 [家庭端驗收紀錄](docs-dev/grade4-u1-ipad-acceptance.md)，不重開。#59 已把正式題包擴為 U1～U5 共十四題 rev2 並結案；#60 已沿用相同 runtime，完成 fresh review、正式發布與 private archive，把題包擴為三十題 rev3，U1～U5 為 9／6／2／7／6。這三十題未做真 iPad 實測；下一步為 U3 `angle-v1`，其餘未轉入題目與章節仍待做，詳見 [四上數學擴題路線圖](docs-dev/grade4-math-expansion-plan.md)。

## Next step

2026-09-15 #35 v1 真機 FAIL：主畫面原頁有標記，目標頁出現「完成」與網址列、未讀到標記；家長回原頁確認標記仍在。兩頁 child／k 參數可見保留。正式網域停止切換，Safari 隔離尚未測。

scope-v2 候選只改測試頁：明定 manifest scope、省略 start_url 以保留 query，修正 standalone 旗標的過度判讀與回寫錯誤提示。完整 Node 283 pass；桌面往返已讀回同一標記與回寫時間。由 Safari 重新加入「平台測試 2」後先複驗跨頁，通過才比較 Safari；詳見 [#35 真機紀錄](docs-dev/platform-ipad-spike-checklist.md)。hub 與正式 app 尚未套用候選設定。

Cloudflare 的 `linshuhuan.com` zone 已確認 active，Chrome 已沿用既有 Google 登入進入正確帳戶；Wrangler OAuth 不含 DNS 權限，後續從已登入的 DNS 管理頁執行。不要讀出 family token、擴權、重設 token 或操作孩子真實進度。GitHub Pages 目前 `cname=null`。

工作分支已備妥 `docs/CNAME` 與通過的 `tests/test_pages_domain.mjs`，尚未合併發布；Cloudflare 新增記錄表單亦已填妥但未儲存。#35 通過後，合併 CNAME、儲存 DNS，完成 HTTPS 與 live e2e，再建立兩個正式入口。舊 repo 清理與錄音在本輪之後處理；#60 擴題已完成，後續依擴題路線圖另批處理，不改變本輪網域 gate。
