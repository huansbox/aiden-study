# HANDOFF

- Status: idle
- Task/issue: https://github.com/huansbox/aiden-study/issues/55（四上數學 U1：歷屆題庫接入 iPad 練習）
- Branch: master
- Updated: 2026-09-12

## Progress

本輪完成必要文件、詳細執行方案與主 tracker 的收尾。學習內容主軸已更新為「歷屆題庫 → iPad 練習」；[#55](https://github.com/huansbox/aiden-study/issues/55) 是後續實作的 canonical parent issue，[`docs-dev/grade4-u1-study-integration-plan.md`](docs-dev/grade4-u1-study-integration-plan.md) 保存資料邊界、題型映射、進度契約、測試 seam 與 W1–W4 順序。方案已定案，不需再向家長確認六題、`unit 15`、私用題包匯入或半批接續等決策。

#53 與 #54 都已關閉，作為 #55 的來源：前者保存四上段考候選卷研究與 8 份題目卷＋6 份官方答案的私用索引；後者保存 U1 十題紙本短練習、答案與驗收，其中 P01／P02／P03／P04／P05／P07 六題進入數位版首批。正式段考範圍仍未知，跨年度／版本繼續依概念對齊。

主 issue 已使用核准 canonical body 建立；GitHub readback 在只正規化 CRLF 與單一尾端 newline 後，與本地 body 完全一致。W1–W4 尚未啟動，沒有修改 app、建立六題數位題包、執行 app 測試、push 或發布網站／Wiki，也尚未完成真 iPad 驗收。

## Next step

1. 依既有授權的 issue workflow，把 #55 的 W1「Study 入口、題包與進度相容」具體化為一張可單獨交付的實作票；不要先建立整批 child issues。
2. W1 完成並凍結私用題包契約後，再依序安排 W2 六題 private build、W3 獨立整合審查與 desktop 驗證、W4 真 iPad／家長交付。
3. 共用程式發布與私用題包傳送分開處理；真 iPad 通過後，才依孩子實際使用決定補 U1 或進下一章。

平台維運維持另一條線：#35 仍是 #34 自訂網域搬遷的真 iPad stop-gate；#34 的逐容器備份、同步健康與進度對帳完成前，不移除舊圖示或清理舊 repo。這不阻擋現行網址執行 #55。

## Validation

- #55 建立前已查無同標題 issue；建立後 readback 的標題與 canonical body exact compare 通過，統籌亦已獨立複核通過。
- 本輪七個 Markdown 的 `git diff --check`、相對連結與 Wiki 部署 URL 對應本地檔案檢查通過；變更範圍不含 code、data 或 PDF。
- 未執行 app 測試，因本輪只有文件與 tracker 收尾；不引用舊測試數字冒充本次驗證。

## Blockers

不需再詢問家長方案決策。W1–W4 與最終真 iPad 驗收尚未完成，屬 #55 的後續工作，不是本輪文件／tracker 收尾的 blocker。
