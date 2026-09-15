# 執行中計畫

> 快照日期：2026-09-15。現況來源是目前 code、Git 歷史與 [open issues](https://github.com/huansbox/aiden-study/issues)；本頁只整理已確認方向、執行順序與 gate。HITL（human in the loop）表示需要家長在真機操作或判定。

## 結論

[#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) 依 2026-09-14 家長確認結案。#56／#57／#58 已完成並關閉，六題、共用程式、自動讀取、review 與發布均完成；家長在 iPad 橫向確認自動取題、接續、未送出輸入清空、child 隔離與基本控制，另確認切背景返回及八位數編輯。家長決定個人小專案不再逐項驗證細節，本輪驗收紀錄與文件收斂完成。

[#59 四上數學 U1～U5 擴題](https://github.com/huansbox/aiden-study/issues/59) 已完成 review、正式發布並結案。[#60](https://github.com/huansbox/aiden-study/issues/60) 已沿用相同 runtime，完成 fresh review、正式發布與 canonical private archive，把家庭題包擴為三十題 rev3，U1～U5 分布為 9／6／2／7／6。這三十題未做真 iPad 實測；下一步為已採納但尚未實作的 U3 `angle-v1`，其餘未轉入題目與章節仍待做。詳細狀態見 [四上數學擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)。

實測結果與已接受的未測範圍以 [家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md) 為單一來源；未知環境與未測情境不補寫成通過，也不再排入人工驗收。三下歷史進度／錯題已由家長確認不再追回，歷史資料對帳列不適用；保護現存資料與 synthetic data 年級隔離的要求仍保留。

2026-09-15 的當前工作改為首頁往返 → #35 → 正式網域 → 兩個孩子的主畫面圖示。首頁往返已發布；家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度。#35 scope-v2 真機跨頁與 Safari 儲存隔離已通過並結案；正式網域、強制 HTTPS、301、app 往返與資產、Worker CORS 檢查完成，家長已確認兩個主畫面圖示安裝，#34 依本輪範圍結案；詳見 [正式網域上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)。

詳細實作方案見 [`docs-dev/grade4-u1-study-integration-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)；本頁不重複資料 schema、題型映射與測試清單。

## 即時狀態

- W1 [#56 Study 四上入口、私用題包載入與進度相容](https://github.com/huansbox/aiden-study/issues/56) 已完成：題包契約、三下／四上入口、安全匯入、缺包保留進度、半批接續與三下隔離均已交付。
- W2 [#57 四上 U1：六題私用題包與可重建來源](https://github.com/huansbox/aiden-study/issues/57) 已完成：六題 private pack、builder、公開追溯 metadata、精確 ignore 與操作說明均已交付；public static data 維持 1,924 題。
- W3 clean-context 整合 review 已通過，無未解 finding；完整自動測試、六題獨立重算、desktop 真 DOM 與原生 browser file chooser 均有 manual path 歷史證據。
- #58 已關閉：沿用 family token 與 Cloudflare Worker／KV，固定唯讀取得 `g4-s1-math-u1`，內容用獨立 KV key 且不碰 `p:` 進度；手動 import 保留備援。唯一 P2 已修正並複驗，無未解 finding。2026-09-14 家長已完成家庭設定並確認自動取得；這是功能層面的回報，未新增真機 HTTP／hash 證據。W4 依家長實測與停止細節補驗的決定收尾。

## 已確認基線

- #53 已關閉：已收集 8 份題目卷與 6 份學校官方答案，共 14 個 PDF；原卷為私用 ignored 檔案，不隨 Git clone 取得。
- #54 已關閉：U1 紙本短練習已有 10 題孩子卷與家長答案，並維持完成、只讀的紙本成品；本輪六題數位 pack 由 #57 另在 private 邊界建立，不回寫該紙本 task。
- 今年是桃子腳 115 學年度、四上數學康軒版；目前尚未取得正式段考範圍。既有研究見 [`learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md`](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md)。
- 跨年度或出版社版本只依題目實際概念對齊，不把舊章節序號直接當成今年範圍。
- #11 已於 2026-07-21 關閉，不再列為 open 工作。

## 工作項目

| Issue | 性質 | 現況 | 下一個動作 |
|---|---|---|---|
| [#55 四上數學 U1：歷屆題庫接入 iPad 練習](https://github.com/huansbox/aiden-study/issues/55) | 學習內容＋app＋HITL | Closed；已發布，依家長確認與驗收取捨結案 | 後續按實際使用問題修正，不再補驗細節 |
| [#59 四上數學 U1～U5 擴題](https://github.com/huansbox/aiden-study/issues/59) | 學習內容＋app 相容 | Closed；十四題 rev2 已 review、發布並結案 | 無；正式基線由 #60 向前擴充，不改寫既有十四題 |
| [#60 四上數學 rev3 擴題](https://github.com/huansbox/aiden-study/issues/60) | 學習內容 | 完成；三十題 rev3 已發布，fresh review、KV readback 與 private archive 通過 | 補齊 tracker closure evidence；後續轉入 U3 `angle-v1` 另批工作 |
| [#58 Study 四上 U1：家庭權限自動讀取私用題包](https://github.com/huansbox/aiden-study/issues/58) | 單一修正實作 | Closed；code／review、Worker／pack／Pages 發布完成 | 無；家庭端後續結果由 #55 追蹤 |
| [#56 Study 四上入口、私用題包載入與進度相容](https://github.com/huansbox/aiden-study/issues/56) | W1 app 實作 | Completed；acceptance 已由獨立 review 與 W3 接受 | 無；後續真機結果由 #55 追蹤 |
| [#57 四上 U1：六題私用題包與可重建來源](https://github.com/huansbox/aiden-study/issues/57) | W2 private build | Completed；六題與 public/private 邊界已由 W3 接受 | 無；ignored 本機路徑留 source／QA，正式 pack 已部署到獨立 KV |
| [#35 平台 1/9：iPad spike](https://github.com/huansbox/aiden-study/issues/35) | HITL stop-gate | Closed | 已依家長功能回報與既有參數證據結案，不追加細節補驗 |
| [#34 平台 9/9：掛網域＋搬遷](https://github.com/huansbox/aiden-study/issues/34) | HITL 搬遷 | Closed；正式網域與兩個主畫面圖示完成 | 後續按實際使用處理；本次不搬舊進度，未測項目不補稱通過 |
| [#20 注音 MVP 5/5 收尾](https://github.com/huansbox/aiden-study/issues/20) | 內容＋HITL | 程式已 merge；正式錄音與 iPad checklist 待完成 | 錄音、audit、真機走完兩活動 |
| [#26 全家學習平台 PRD](https://github.com/huansbox/aiden-study/issues/26) | Umbrella | Open | #34 完成後做整體 close audit |
| [#15 注音學習 app PRD](https://github.com/huansbox/aiden-study/issues/15) | Umbrella | Open | #20 驗收完成後關閉 |

#55 的 W1／W2 已通過原 W3 獨立整合驗收；#58 自動讀取修正也已發布並通過 review，無未解 finding。結案時程式與 #58 reviewed code 無差異，沿用既有 review；家庭端以實際回報及已記錄的驗收取捨完成，不宣稱未測項目通過。

## 執行順序

### A. U1 第一小批進入既有 Study

1. 保留 #57 已完成的六題正式 pack、stable ID、來源映射與 ignored private 邊界，不改題文、答案、解說或題量。
2. 依 #58 建立固定家庭唯讀內容路徑：管理端從 ignored 已驗證 pack 寫入獨立 content KV；Study 以既有 family token 自動讀取，瀏覽器不能任意寫雲端題庫。
3. 自動取得只在 production validator 通過後採用；timeout、錯包、stale revision 或服務失敗保留 cache／state，作答中不打斷批次，手動 import 留作備援。
4. Worker.fetch、production Study harness、public／sync 回歸、完整 Node／Python、desktop CUA、獨立 review、Worker 與正式 KV pack 發布已完成；本輪 Actions／Pages 的精確結果以 #58 結案證據與 #55 發布 comment 為準。

### B. iPad 驗收收斂（已完成）

2026-09-14 的 [家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md) 已記錄可用的主要操作、三下歷史資料不適用，以及家長接受未測細節的決定。不再要求逐一補記環境或製造故障情境；後續依實際使用問題處理。#35／#34 的另案搬遷條件不因本次結案自動通過。

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

1. [#35 真機驗收](https://github.com/huansbox/aiden-study/issues/35) 已結案：v1 FAIL 歷史保留，v2 跨頁與 Safari 隔離由家長確認，未收集的原始報告如實記錄。
2. [#34 權威 issue](https://github.com/huansbox/aiden-study/issues/34) 的舊資料備份／還原／對帳要求已由 2026-09-15 家長決定取消，原因是尚未正式給孩子使用。依上線紀錄完成 DNS、HTTPS、轉向與 app／同步檢查，不清除現有資料。
3. 新網域就緒後設定「哥哥學習」「弟弟學習」兩個圖示，完成必要家庭設定；舊站整理另排後續。
4. 清理舊 math／spelling repo 前，先確認未匯入但仍需保留的來源已安全保存，尤其是上述 `worksheets/word-problems/`。

## 完成條件

四上 U1 第一階段完成需要同時具備：

- 第一小批題目在既有 Study 中有獨立四上 U1 入口，且全數落在已支援題型。
- 正常 UX 透過 family token 從固定家庭唯讀 Worker／KV 路徑自動取得六題；題文不進 public Git／Pages，內容 key 不碰 `p:` 進度，手動 import 只作備援。
- 題目可追回已核歷屆來源與概念；今年範圍未知的限制沒有被改寫成確定結論。
- 舊三下題目與現存作答、錯題、mastered 進度受到保護；已放棄的歷史備份不需找回，不能因此免除現存／合成資料的年級隔離驗證。
- iPad 部分作答、離開、重返後可接續，且不混到三下練習。
- 相關自動測試與獨立 review 已通過；家庭端驗收依 2026-09-14 家長確認與取捨完成。實測與未測分開記錄，不以歷史結果冒充本次重跑。

本輪完成條件為 #35 真機確認、正式網址與 app／同步檢查、兩個主畫面入口。舊進度搬遷不適用，舊 repo 清理不在本輪執行。

## 暫不排入

- 自動替 U2 以後每章建立紙本 PDF。
- 為尚未遇到的題型先新增互動 app 或大型共用 framework。
- 四上自然、社會題庫擴充。
- 一般化 CMS、任意 pack API、browser 題庫寫入或新登入帳號。
- 搬遷前的舊圖示移除、舊 repo 清空。
- 期中自然 unit 1／2 說明與 3 題隱藏題已決定 `not planned`，本輪不重開。
- 只為增加題數而擴張社會看圖題或其他既有 backlog。
