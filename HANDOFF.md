# HANDOFF

- Status: planning ready for integration
- Task/issue: 四上 U1 歷屆題整合進既有 Study（尚未建立 remote issue）
- Branch: codex/docs-grade4-u1-study-direction
- Updated: 2026-09-12

## Progress

本輪可重用來源已就緒：#53 已關閉，完成四上第一次段考數學的跨版本研究，並收集 8 份題目卷與 6 份學校官方答案，共 14 個私用 PDF；#54 已關閉，完成 U1「一億以內的數」10 題紙本短練習與家長答案。原卷、私用題文、PDF 與 preview 都維持各自的局部 `.gitignore` 邊界。正式段考範圍仍未知，跨年度／版本必須依概念而非章節序號對齊。

本次已把文件方向更新為「歷屆題庫 → iPad 練習」主軸。下一個規劃目標是孩子在既有 Study 完成第一批四上 U1 題，離開再回來可接續；舊三下題目與進度必須保留，不能混入四上練習。第一批先用 app 已支援題型，小批通過後才擴題或擴章。詳細方案預留在 [`docs-dev/grade4-u1-study-integration-plan.md`](docs-dev/grade4-u1-study-integration-plan.md)。

舊 `aiden-math` 的 app 已由 commit `4eb27f4` 匯入本 repo 的 `docs/math/`（含 nonogram）；該 commit 明文排除 `worksheets/`。來源 repo 的 [`worksheets/word-problems/`](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 尚有題型分析 Markdown 與 4 份可列印 HTML，未進本 repo。本輪不整包搬入、不另建 learning task，也不把它們描述成孩子真實錯題；需要時才核對並挑選保存。在此之前，#34 不得清空舊 `aiden-math` repo。

## Next step

1. 整合並確認 `docs-dev/grade4-u1-study-integration-plan.md` 的資料邊界、題型映射、進度隔離與驗收方案。
2. 依確認後的方案從 #53 已核 U1 題目挑第一小批，加入既有 Study；不改動舊三下題目 ID 與既有進度語意。
3. 跑相關自動驗證後，在 iPad 做「部分作答 → 離開 → 重返接續」與三下進度不受影響的人工驗收。
4. 依孩子實際使用再決定補 U1、進下一章、做按需紙本或建立單一技能互動練習。

平台維運另線保留：#35 仍是 #34 的真 iPad stop-gate；#34 的逐容器備份、同步健康與進度對帳未完成前，不移除舊圖示、不清理舊 repo。這些限制不阻擋現行網址新增題庫內容。#20／#15／#26 仍 open；#11 已 closed。

## Validation

- 以 GitHub read-only 查證：#11、#53、#54 closed；#35、#34、#26、#20、#15 open。
- 查核 import commit `4eb27f4` 與 `aiden-math` 的 `worksheets/word-problems/` 現況，確認 worksheets 未匯入且目前包含 1 份題型分析 Markdown、4 份可列印 HTML，另有該舊目錄的說明檔。
- 本次只更新規劃與交接文件，沒有修改 app、題目資料或私用 PDF；未執行 app 測試，也不引用舊測試數字作為本次結果。

## Blockers

None。詳細方案由並行規劃工作補入後，即可由統籌進行整合與後續實作分流。
