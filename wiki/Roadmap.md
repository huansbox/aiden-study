# 路線圖

> 快照日期：2026-09-15。長期方向在本頁；可直接執行的順序與 gate 見 [執行中計畫](Plan)。現況仍以 code、Git 歷史與 GitHub issues 為準。HITL（human in the loop）表示需要家長在真機操作或判定，不能只靠程式端完成。

## 方向

Aiden Study 的學習內容主軸改為「歷屆題庫 → iPad 練習」：把已核過來源、答案與概念範圍的歷屆題，小批加入既有 Study，讓孩子能在 iPad 作答、離開後再接續。[#55 四上數學 U1「一億以內的數」](https://github.com/huansbox/aiden-study/issues/55) 第一小批已交付，[#59](https://github.com/huansbox/aiden-study/issues/59) 已把正式題包擴為 U1～U5 共十四題 rev2；[#60](https://github.com/huansbox/aiden-study/issues/60) 已沿用相同 runtime，完成 fresh review、正式發布與 private archive，把題包擴為三十題 rev3，U1～U5 為 9／6／2／7／6。三十題未做真 iPad 實測；下一步為已採納但尚未實作的 U3 `angle-v1`，其餘未轉入題目與章節仍待做。程式保護舊三下題目與現存進度，四上練習有獨立邊界。家長已放棄找回的三下歷史紀錄不列為恢復任務。

另有兩種支援路線，但只在實際需要時啟動：

- 「數學題型分析 → 改編紙本」用於需要短時間紙筆練習、手寫計算或特定弱點回看時；不預設每章都製作 PDF。
- 「數學技能互動練習」用於 Study 既有題型不足以承載的單一技能；不因有舊素材就先做新 app。

目前優先定下每天使用的入口：首頁往返已發布，#35 scope-v2 真機跨頁與 Safari 隔離已通過並結案；#34 正式網域 HTTPS、轉向與網站端檢查完成，家長已確認兩個孩子圖示安裝，依本輪範圍結案。2026-09-15 家長確認尚未正式給孩子使用，本次不備份／還原／對帳舊進度；舊 repo 清理與錄音在本輪之後處理，擴題由 #60 另案進行，不改變網域 gate。

## 已完成里程碑

| 時間 | 里程碑 |
|---|---|
| 2026-06-上旬 | 自然期中／期末題庫上線，建立 PDF 萃取、AI 分類與靜態題庫流程 |
| 2026-06-11～14 | 數學、社會題庫上線；社會擴充至 452 題，三科作答說明共 1,257 題 |
| 2026-06-15～20 | 分批練習、錯題庫、進度匯出／匯入、獎勵圖池與國語手寫模式上線；題庫達 1,924 題 |
| 2026-07-11～17 | 注音程式、Cloudflare Worker 同步、hub／registry、app monorepo 整併與共用 wiring layer 上線 |
| 2026-09-12 | #53 完成四上數學候選卷研究與收集：8 份題目卷、6 份官方答案，共 14 個私用 PDF |
| 2026-09-12 | #54 完成四上 U1 第一份紙本短練習：10 題孩子卷與家長答案；私用衍生成品不進 Git |
| 2026-09-12 | #56／#57／#58 完成四上入口、六題 private pack、自動家庭取題、review 與正式發布；#55 保留家庭端 W4 |
| 2026-09-14 | #55 依 iPad 家長操作確認與驗收取捨結案；個人小專案停止細節逐項補驗，未測情境如實記錄 |
| 2026-09-15 | 五個 app 補齊回孩子首頁，哥哥／弟弟頁面名稱分開；測試與 Pages 發布通過 |
| 2026-09-15 | #59 完成 U1～U5 十四題 rev2 的 review、正式發布與結案 |
| 2026-09-15 | #60 完成 U1～U5 三十題 rev3 的 fresh review、正式發布與 canonical private archive；未做三十題真 iPad 實測 |

## 近期路線

| 順序 | 工作 | 依賴 | 完成訊號 |
|---|---|---|---|
| 已完成 | [#35 iPad 真機 spike](https://github.com/huansbox/aiden-study/issues/35) | 家長功能回報 | 跨頁與 Safari 隔離通過；原始報告未收集的範圍如實記錄 |
| 已完成 | [#34 掛網域與兩個孩子圖示](https://github.com/huansbox/aiden-study/issues/34) | 家長確認圖示安裝 | 正式網域與兩個圖示完成；本次不搬舊進度 |
| 後續 | U3 `angle-v1` 靜態標註角圖 | #60 三十題 rev3 已完成；逐圖重建與第二人 QA | 先核四個內容候選，驗證畫布後才另批實作；不新增 app 或互動量角器 |
| 並行 | [#20 注音 MVP 收尾](https://github.com/huansbox/aiden-study/issues/20) | 家長錄音與 iPad | 14 段正式錄音入庫並完成真機驗收 |

四上 U1 的具體資料邊界、題型映射與進度策略見 [`docs-dev/grade4-u1-study-integration-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)，後續擴題狀態見 [`docs-dev/grade4-math-expansion-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)。W1–W3 與 #58 自動取題發布已完成；W4 依 2026-09-14 家長確認與停止細節補驗的決定收尾，實測範圍與未測限制見 [家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md)。目前尚未取得桃子腳 115 康軒正式段考範圍；跨年度、跨版本題目一律依概念對齊，不依舊單元序號直接搬入。

## 後續方向

### 題庫內容

- 三十題 rev3 發布後，以孩子實際使用、學校進度及每批正式 review 決定後續擴題；下一步為已採納但尚未實作的 U3 `angle-v1`，其餘未轉入章節仍待分批處理。
- 自然、社會同為康軒版，日後按需要沿用「來源查證 → 概念對齊 → 小批驗收」流程；本輪只規劃四上數學。
- 社會看圖題與其他既有 backlog 不為題數本身擴張。
- 正式考試範圍公布後，再回頭校準段考候選題；不把教學計畫推定寫成學校公告。

### 平台與 app

- 新 app 預設加在 `docs/<app>/` 並由 registry 登記，但能用既有 Study 完成時不另開 app。
- App 的 active／draft／parked／retired 狀態隨孩子需求調整。
- 任一 child 的 active app 達 5 個以上時，再評估是否需要孩子自行排序；目前由家長改 registry 即可。

### 家庭學習任務與舊素材

- 紙本與一次性活動的分類、建立、索引與共用規則，以 `learning-tasks/README.md` 為準。
- 舊 `aiden-math` 的 app 已在 2026-07 匯入本 repo 的 `docs/math/`（含 nonogram）；舊 repo 的 [`worksheets/word-problems/`](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 未隨匯入進來，仍有題型分析 Markdown 與 4 份可列印 HTML。它們只是按需改編的來源指標；先確認價值與歸檔位置，再挑選搬入，不整包複製。
- 上述 worksheets 尚未保存到本 repo 前，不得因 #34 清理舊 `aiden-math` repo；也不得把未經查證的舊練習描述成孩子真實錯題。

## 非目標

- 不做登入帳號、密碼系統或多租戶後端；維持 family token＋child 維度。
- 不把網站遷到 Cloudflare Pages；託管留 GitHub Pages，自訂網域只負責穩定 origin。
- 不把各 app 的教學邏輯抽成大型共用 framework；只共用平台基建。
- 不加入手寫辨識、筆順驗證、Apple Pencil 壓力／傾斜或儲存筆跡。
- 不恢復題庫「快速練習」模式。
- 本輪不清空舊 repo；不把免除舊進度搬遷解讀為資料清除授權。
- 不承諾每章都有紙本 PDF，也不為尚未出現的題型先建互動練習。
- 期中自然 unit 1／2 說明與 3 題隱藏題維持 `not planned`，不因本次改方向而重開。

## 收斂原則

- 沒有硬 deadline；跟著學期與孩子實際需要走。
- 題庫先小批、先用既有題型、先驗證可接續，再擴題或擴章。
- 自訂網域上線依 [#34](https://github.com/huansbox/aiden-study/issues/34) 與最新家長決定執行；#35 真機確認保留，本次舊進度備份與對帳不適用。
- Roadmap 只放方向與里程碑；逐項狀態以 code、GitHub issues、Git 歷史與 [Plan](Plan) 為準。
