# HANDOFF

- Status: idle
- Task/issue: #34 正式網域與兩個孩子入口（完成）；前置 #35 已結案
- Branch: master
- Updated: 2026-09-15

## Progress

本輪網站端工作已進入 master：五 app 回孩子首頁、共同 manifest scope、正式 kids.linshuhuan.com、DNS only CNAME、強制 HTTPS 與舊網址 301。發布與上線紀錄為 `e827287`、`91d155e`。家長已確認 iPad 跨頁無網址列、可讀到同一標記，且 Safari 改存不影響主畫面標記；本次收尾再確認「兩個 iPad 圖示已安裝」，#34 依已確認範圍結案。證據與未測界線見 [上線紀錄](docs-dev/platform-domain-rollout.md) 及 [真機紀錄](docs-dev/platform-ipad-spike-checklist.md)。

本次不備份／還原／對帳舊進度，不清除現有資料或舊 repo。沒有使用真實家庭 token、讀寫孩子雲端進度。未追蹤的 `.scratch/font-source/` 是其他工作素材，未加入本次提交；本輪沒有仍需攜帶的暫存草稿。

## Next step

接續既有 #20 注音錄音待辦：目前 14 段正式音檔缺漏，弟弟注音按開始仍顯示沒有可練習的卡。從該票及既有錄音工具接續；不要重開已完成的 #34／#35，也不追加細碎安裝驗收。其他已知後續以 tracker 與四上數學擴題路線圖為準，本次未掃描新待辦。

## Validation

- 發布 CI（`e827287`）：Node 286 pass；pytest 183 pass、1 skipped。`91d155e` 的 test／Pages／publish-wiki 均 success。
- 新 HTTPS origin：兩孩子首頁與五 app 往返正確；七條舊 URL 301 保留 path／child；28 個主要資源 200 且與 Git 發布原文相符。
- Worker 題包 GET 與測試 child 進度 PUT 的 OPTIONS 均 204，允許正式 origin 與必要 headers；未測真實授權同步閉環。
- 家長合併功能回報完成 #35，並確認兩個正式圖示已安裝；裝置版本、v2 原始模式報告及回寫時間未另收集，不補稱已測。
- 本次收尾重跑 `node --test tests/test_pages_domain.mjs`：1 pass；文件 diff 自查與 `git diff --check` 通過。僅更新紀錄，未重跑整套本機測試。

## Blockers

None
