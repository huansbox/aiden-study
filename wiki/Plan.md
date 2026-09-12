# 執行中計畫

> 快照日期：2026-09-12。現況來源是目前 code、Git 歷史與 [open issues](https://github.com/huansbox/aiden-study/issues)；本頁只整理已確認方向、執行順序與 gate。HITL（human in the loop）表示需要家長在真機操作或判定。

## 結論

下一個規劃目標是把第一批四上數學 U1「一億以內的數」歷屆題加入既有 Study，讓孩子在 iPad 練習，離開再回來仍能接續。先用 app 已有題型做小批驗證；舊三下題目與進度保留，四上練習不混入舊流程。

平台搬遷仍受 #35 與 #34 約束，但那是換網域、換圖示與清理舊站的 gate，不阻擋在現行網址新增題庫內容。注音收尾可在適合的家長／iPad 時段並行。

詳細實作方案預留在 [`docs-dev/grade4-u1-study-integration-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)；本頁不重複資料 schema、題型映射與測試清單。

## 已確認基線

- #53 已關閉：已收集 8 份題目卷與 6 份學校官方答案，共 14 個 PDF；原卷為私用 ignored 檔案，不隨 Git clone 取得。
- #54 已關閉：U1 紙本短練習已有 10 題孩子卷與家長答案；它是完成的按需紙本成品，尚未加入 iPad Study。
- 今年是桃子腳 115 學年度、四上數學康軒版；正式段考範圍仍未知。既有研究見 [`learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md`](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md)。
- 跨年度或出版社版本只依題目實際概念對齊，不把舊章節序號直接當成今年範圍。
- #11 已於 2026-07-21 關閉，不再列為 open 工作。

## Open issues

| Issue | 性質 | 現況 | 下一個動作 |
|---|---|---|---|
| [#35 平台 1/9：iPad spike](https://github.com/huansbox/aiden-study/issues/35) | HITL stop-gate | Open | 在真 iPad 驗證單 origin 導航、網址參數與 localStorage 容器三個架構前提 |
| [#34 平台 9/9：掛網域＋搬遷](https://github.com/huansbox/aiden-study/issues/34) | HITL 搬遷 | Blocked by #35 | #35 關閉後，逐容器完成備份、同步健康與進度對帳；對帳前不移除舊圖示、不清舊 repo |
| [#20 注音 MVP 5/5 收尾](https://github.com/huansbox/aiden-study/issues/20) | 內容＋HITL | 程式已 merge；正式錄音與 iPad checklist 待完成 | 錄音、audit、真機走完兩活動 |
| [#26 全家學習平台 PRD](https://github.com/huansbox/aiden-study/issues/26) | Umbrella | Open | #34 完成後做整體 close audit |
| [#15 注音學習 app PRD](https://github.com/huansbox/aiden-study/issues/15) | Umbrella | Open | #20 驗收完成後關閉 |

四上 U1 Study 整合目前沒有另開 remote issue；若後續由已授權的 tracker workflow 建立，以該 issue 與實際 code 狀態更新本表。

## 執行順序

### A. U1 第一小批進入既有 Study

1. 從 #53 已核為 U1／M1a／M1b 的歷屆題選一小批，保留來源、原題與改編映射；使用私用題文時維持既有授權與 `.gitignore` 邊界。
2. 只採 Study 已支援的題型；遇到需要新互動模型的題先保留，不為第一批擴充 app 題型。
3. 在資料與選單中明確區分四上 U1 與舊三下內容；現有題目、作答紀錄、錯題與 mastered 進度不得被重編或覆蓋。
4. 依詳細方案完成資料建置、契約測試與回歸驗證，再進入 iPad 驗收。

### B. iPad 接續驗收

1. 以哥哥既有 Study 身分進入四上 U1，完成部分題目後離開。
2. 從相同入口重新進入，確認能接回同一批進度，而不是重開或掉回三下題組。
3. 確認舊三下題目仍可進入，既有作答、錯題與 mastered 數沒有被四上資料污染。
4. 記錄孩子實際理解、題型摩擦與單次適合題量；第一批通過後才擴題。

### C. 擴充決策

- U1 題量不足：先從同一批已核來源補題，沿用相同概念與題型規則。
- 孩子需要紙筆計算或特定弱點回看：沿用 #54 的「題型分析 → 改編紙本」做一份有明確目的的短練習，不自動為每章產 PDF。
- Study 題型真的無法表達重要技能：再評估「數學技能互動練習」；先定義單一學習目標，不把舊 worksheets 整包做成 app。
- U1 已穩定且學校進度前進：按概念研究下一章，不假設段考一定涵蓋 U1–U5。
- 自然、社會同為康軒版，但等實際需求再啟動；本輪不混入四上數學工作。

### D. 舊 `aiden-math` 素材保全

2026-07 的匯入 commit `4eb27f4` 只把舊 `aiden-math` app 匯入本 repo 的 `docs/math/`（含 nonogram），明文排除 `worksheets/`。來源 repo 的 [`worksheets/word-problems/`](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 目前有題型分析 Markdown 與 4 份可列印 HTML，尚未進本 repo。

- 把該路徑視為來源指標，不在本輪整包搬入或另建 learning task。
- 真正需要其中一份題型或版型時，先核對內容、授權邊界與用途，再放入符合 `learning-tasks/README.md` 的位置。
- 沒有作答紀錄可證明的內容，不標成孩子真實錯題。
- 在值得保留的 worksheets 尚未保存前，#34 不得清空舊 `aiden-math` repo。

### E. 平台 stop-gate 與搬遷

1. [#35 權威 issue／checklist](https://github.com/huansbox/aiden-study/issues/35) 必須在真 iPad 驗證 standalone 導航、`?child=/?k=` 與 localStorage 容器三項前提；任一失敗就停止 #34。
2. [#34 權威 issue／checklist](https://github.com/huansbox/aiden-study/issues/34) 開始前，逐裝置、逐容器完成 Study、zhuyin、math、spelling 的同步健康檢查與文字備份；DNS、301、同步與真機步驟均以該 issue 為準，本頁摘要不能取代它。
3. 新網域與新圖示完成後，逐 child、逐 app 對帳進度；通過後才刪舊圖示。
4. 清理舊 math／spelling repo 前，先確認未匯入但仍需保留的來源已安全保存，尤其是上述 `worksheets/word-problems/`。

## 完成條件

四上 U1 第一階段完成需要同時具備：

- 第一小批題目在既有 Study 中有獨立四上 U1 入口，且全數落在已支援題型。
- 題目可追回已核歷屆來源與概念；今年範圍未知的限制沒有被改寫成確定結論。
- 舊三下題目、作答、錯題與 mastered 進度保持不變。
- iPad 部分作答、離開、重返後可接續，且不混到三下練習。
- 相關自動測試與人工驗收依詳細方案完成；測試結果以該次實際輸出為準，不沿用舊快照數字冒充本次驗證。

平台搬遷完成條件維持不變：#35 與 #34 有真機證據，備份、同步健康與進度對帳完成後，才移除舊圖示或清理舊 repo。

## 暫不排入

- 自動替 U2 以後每章建立紙本 PDF。
- 為尚未遇到的題型先新增互動 app 或大型共用 framework。
- 四上自然、社會題庫擴充。
- 搬遷前的舊圖示移除、舊 repo 清空。
- 期中自然 unit 1／2 說明與 3 題隱藏題已決定 `not planned`，本輪不重開。
- 只為增加題數而擴張社會看圖題或其他既有 backlog。
