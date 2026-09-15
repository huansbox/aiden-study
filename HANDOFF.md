# HANDOFF

- Status: in_progress
- Task/issue: #34 正式網域與兩個孩子入口；前置 #35 iPad 主畫面檢查
- Branch: codex/launch-family-domain
- Updated: 2026-09-15

## Progress

家長要求依序完成首頁往返、主畫面檢查、正式網域與兩個捷徑，做到 e2e。家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；不清除現有資料。後續以實際使用為準，不再拆成細碎的按鈕驗收。

`5a1e8f68d3dfacc1e405de36eb1a174327eeaf1b` 已發布：五個 app 補齊回孩子首頁，保留 child；兩個 hub 頁面名稱分別為「哥哥學習」「弟弟學習」，補上主畫面 Web App meta。Node 267、pytest 167 pass；CI 與 Pages success。桌面 1024 × 768 已走完五 app 在 `/aiden-study/` 與 `/` 下的往返，並檢查連結版面。

結果、家長取捨、網域設定與未完成事項集中在 [正式網域上線紀錄](docs-dev/platform-domain-rollout.md)。#55 四上 U1 已於 2026-09-14 結案，原證據見 [家庭端驗收紀錄](docs-dev/grade4-u1-ipad-acceptance.md)，不重開。#59 已把正式題包擴為 U1～U5 共十四題 rev2 並結案；#60 已沿用相同 runtime，完成 fresh review、正式發布與 private archive，把題包擴為三十題 rev3，U1～U5 為 9／6／2／7／6。這三十題未做真 iPad 實測；下一步為 U3 `angle-v1`，其餘未轉入題目與章節仍待做，詳見 [四上數學擴題路線圖](docs-dev/grade4-math-expansion-plan.md)。

## Next step

#35 已於 2026-09-15 結案。v1 跨頁 FAIL 歷史保留；v2 家長確認跨頁沒有網址列、讀到同一標記，Safari 改存後主畫面 App 仍保留原 `spike-…`。型號／系統版本、v2 原始模式報告及回寫時間未收集，不追加細碎補驗。

`e827287` 已發布 CNAME 與驗收紀錄，GitHub Pages 綁定 `kids.linshuhuan.com`；Cloudflare 已儲存 DNS only CNAME，公共 DNS 解析正確。CI 與 Pages success。HTTPS 憑證已 approved，強制 HTTPS 已啟用。七條舊址 301 保留 path／child；28 個資源 200 且符合發布內容；兩孩子首頁與五 app 往返、Worker OPTIONS 通過。CI Node 286 pass，pytest 183 pass／1 skipped。

不要讀出 family token 或操作孩子真實進度。本次不做舊進度備份／還原／對帳，不清理舊圖示或舊 repo。正式哥哥／弟弟圖示尚待家長在 iPad Safari 加入主畫面，#34 保持 OPEN；未執行的使用者操作不可記為完成。正式網址為 https://kids.linshuhuan.com/?child=aiden 與 https://kids.linshuhuan.com/?child=bingpu。注音按開始仍顯示缺錄音，屬既有 #20 待辦；未聲稱注音內容或真實授權同步閉環已驗收。#60 三十題 rev3 的後續擴題依既有路線圖另批處理。
