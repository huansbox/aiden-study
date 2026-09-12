# 執行中計畫

> 快照日期：2026-09-12。現況來源是目前 code、Git 歷史與 [open issues](https://github.com/huansbox/aiden-study/issues)；本頁只整理已確認方向、執行順序與 gate。HITL（human in the loop）表示需要家長在真機操作或判定。

## 結論

目前執行目標仍是 [#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55)。第一批六題的 Study 共用程式與 private pack 已完成；最新 [#58 家庭權限自動讀取私用題包](https://github.com/huansbox/aiden-study/issues/58) 也已完成 code、獨立 review、Worker 與正式 KV pack 發布。孩子可從原 Study 入口自動取得六題，正常流程不要求家長傳檔；舊三下題目與進度保留。下一個家庭 gate 是孩子實際 iPad／容器 W4，不擴充功能或題量。

平台搬遷仍受 #35 與 #34 約束，但那是換網域、換圖示與清理舊站的 gate，不阻擋在現行網址新增題庫內容。注音收尾可在適合的家長／iPad 時段並行。

詳細實作方案見 [`docs-dev/grade4-u1-study-integration-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)；本頁不重複資料 schema、題型映射與測試清單。

## 即時狀態

- W1 [#56 Study 四上入口、私用題包載入與進度相容](https://github.com/huansbox/aiden-study/issues/56) 已完成：題包契約、三下／四上入口、安全匯入、缺包保留進度、半批接續與三下隔離均已交付。
- W2 [#57 四上 U1：六題私用題包與可重建來源](https://github.com/huansbox/aiden-study/issues/57) 已完成：六題 private pack、builder、公開追溯 metadata、精確 ignore 與操作說明均已交付；public static data 維持 1,924 題。
- W3 clean-context 整合 review 已通過，無未解 finding；完整自動測試、六題獨立重算、desktop 真 DOM 與原生 browser file chooser 均有 manual path 歷史證據。
- #58 code／review 與 Cloudflare 發布已完成：沿用 family token 與 Cloudflare Worker／KV，固定唯讀取得 `g4-s1-math-u1`，內容用獨立 KV key 且不碰 `p:` 進度；手動 import 保留備援。唯一 P2 已修正並複驗，無未解 finding。Production authenticated GET 與孩子實際 iPad 是否已設定 token 尚待 W4 確認。

## 已確認基線

- #53 已關閉：已收集 8 份題目卷與 6 份學校官方答案，共 14 個 PDF；原卷為私用 ignored 檔案，不隨 Git clone 取得。
- #54 已關閉：U1 紙本短練習已有 10 題孩子卷與家長答案，並維持完成、只讀的紙本成品；本輪六題數位 pack 由 #57 另在 private 邊界建立，不回寫該紙本 task。
- 今年是桃子腳 115 學年度、四上數學康軒版；正式段考範圍仍未知。既有研究見 [`learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md`](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md)。
- 跨年度或出版社版本只依題目實際概念對齊，不把舊章節序號直接當成今年範圍。
- #11 已於 2026-07-21 關閉，不再列為 open 工作。

## 工作項目

| Issue | 性質 | 現況 | 下一個動作 |
|---|---|---|---|
| [#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) | 學習內容＋app＋HITL | Open；共用程式、六題與 auto release 完成 | 家長完成 W4 真 iPad 完整清單，記錄結果後才關閉 |
| [#58 Study 四上 U1：家庭權限自動讀取私用題包](https://github.com/huansbox/aiden-study/issues/58) | 單一修正實作 | Code／review、Worker 與正式 KV pack 發布完成 | 精確 Actions／Pages 與結案結果以 #58 及 #55 發布 comment 為準 |
| [#56 Study 四上入口、私用題包載入與進度相容](https://github.com/huansbox/aiden-study/issues/56) | W1 app 實作 | Completed；acceptance 已由獨立 review 與 W3 接受 | 無；後續真機結果由 #55 追蹤 |
| [#57 四上 U1：六題私用題包與可重建來源](https://github.com/huansbox/aiden-study/issues/57) | W2 private build | Completed；六題與 public/private 邊界已由 W3 接受 | 無；ignored 本機路徑留 source／QA，正式 pack 已部署到獨立 KV |
| [#35 平台 1/9：iPad spike](https://github.com/huansbox/aiden-study/issues/35) | HITL stop-gate | Open | 在真 iPad 驗證單 origin 導航、網址參數與 localStorage 容器三個架構前提 |
| [#34 平台 9/9：掛網域＋搬遷](https://github.com/huansbox/aiden-study/issues/34) | HITL 搬遷 | Blocked by #35 | #35 關閉後，逐容器完成備份、同步健康與進度對帳；對帳前不移除舊圖示、不清舊 repo |
| [#20 注音 MVP 5/5 收尾](https://github.com/huansbox/aiden-study/issues/20) | 內容＋HITL | 程式已 merge；正式錄音與 iPad checklist 待完成 | 錄音、audit、真機走完兩活動 |
| [#26 全家學習平台 PRD](https://github.com/huansbox/aiden-study/issues/26) | Umbrella | Open | #34 完成後做整體 close audit |
| [#15 注音學習 app PRD](https://github.com/huansbox/aiden-study/issues/15) | Umbrella | Open | #20 驗收完成後關閉 |

#55 是本輪主追蹤 issue。W1／W2 已完成並通過原 W3 獨立整合驗收；#56／#57 保持 closed，不重開。#58 是對原「每容器首次傳檔」決策的單一修正實作票；code 與 clean-context review、Worker 與正式 KV pack 發布已完成，唯一 P2 已修正並複驗，無未解 finding。#58 完成不會自動關閉 #55；production authenticated GET 與真 iPad 完整清單仍須 W4 證據，不能以 desktop 結果取代。

## 執行順序

### A. U1 第一小批進入既有 Study

1. 保留 #57 已完成的六題正式 pack、stable ID、來源映射與 ignored private 邊界，不改題文、答案、解說或題量。
2. 依 #58 建立固定家庭唯讀內容路徑：管理端從 ignored 已驗證 pack 寫入獨立 content KV；Study 以既有 family token 自動讀取，瀏覽器不能任意寫雲端題庫。
3. 自動取得只在 production validator 通過後採用；timeout、錯包、stale revision 或服務失敗保留 cache／state，作答中不打斷批次，手動 import 留作備援。
4. Worker.fetch、production Study harness、public／sync 回歸、完整 Node／Python、desktop CUA、獨立 review、Worker 與正式 KV pack 發布已完成；本輪 Actions／Pages 的精確結果以 #58 結案證據與 #55 發布 comment 為準。

### B. iPad 接續驗收

1. 以哥哥既有 Study 身分進入；先核對該容器是否已有 family token，沒有時只做一次既有家庭設定，不能假設已設定。
2. 從原 Study 入口或選擇四上後確認六題自動載入，正常流程不傳檔、不選 JSON；服務失敗時確認有效 cache 與明確家長提示，必要時才測手動 import 備援。
3. 完成部分題目後離開，從相同入口重新進入並接回同一批；確認舊三下題目與另一 child 的作答、錯題及 mastered 沒有被污染。
4. 記錄裝置、容器、token 設定狀態、載入與接續結果；第一批完整通過後才擴題。這份證據不取代 #35 的跨容器／網域 gate。

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
- 正常 UX 透過 family token 從固定家庭唯讀 Worker／KV 路徑自動取得六題；題文不進 public Git／Pages，內容 key 不碰 `p:` 進度，手動 import 只作備援。
- 題目可追回已核歷屆來源與概念；今年範圍未知的限制沒有被改寫成確定結論。
- 舊三下題目、作答、錯題與 mastered 進度保持不變。
- iPad 部分作答、離開、重返後可接續，且不混到三下練習。
- 相關自動測試與人工驗收依詳細方案完成；測試結果以該次實際輸出為準，不沿用舊快照數字冒充本次驗證。

平台搬遷完成條件維持不變：#35 與 #34 有真機證據，備份、同步健康與進度對帳完成後，才移除舊圖示或清理舊 repo。

## 暫不排入

- 自動替 U2 以後每章建立紙本 PDF。
- 為尚未遇到的題型先新增互動 app 或大型共用 framework。
- 四上自然、社會題庫擴充。
- 一般化 CMS、任意 pack API、browser 題庫寫入或新登入帳號。
- 搬遷前的舊圖示移除、舊 repo 清空。
- 期中自然 unit 1／2 說明與 3 題隱藏題已決定 `not planned`，本輪不重開。
- 只為增加題數而擴張社會看圖題或其他既有 backlog。
