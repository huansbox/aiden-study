# 路線圖

> 快照日期：2026-09-12。長期方向在本頁；可直接執行的順序與 gate 見 [執行中計畫](Plan)。現況仍以 code、Git 歷史與 GitHub issues 為準。HITL（human in the loop）表示需要家長在真機操作或判定，不能只靠程式端完成。

## 方向

Aiden Study 的學習內容主軸改為「歷屆題庫 → iPad 練習」：把已核過來源、答案與概念範圍的歷屆題，小批加入既有 Study，讓孩子能在 iPad 作答、離開後再接續。下一個目標是 [#55 四上數學 U1「一億以內的數」](https://github.com/huansbox/aiden-study/issues/55)；舊三下題目與進度必須保留，四上練習須有清楚邊界，不混入舊練習。

另有兩種支援路線，但只在實際需要時啟動：

- 「數學題型分析 → 改編紙本」用於需要短時間紙筆練習、手寫計算或特定弱點回看時；不預設每章都製作 PDF。
- 「數學技能互動練習」用於 Study 既有題型不足以承載的單一技能；不因有舊素材就先做新 app。

平台維運仍有獨立的安全主線：#35 是自訂網域搬遷前的真 iPad stop-gate，#34 仍要求備份、同步健康與進度對帳完成後才能移除舊圖示或清理舊 repo。這些限制不阻擋在現行網址替 Study 加入新題庫內容。

## 已完成里程碑

| 時間 | 里程碑 |
|---|---|
| 2026-06-上旬 | 自然期中／期末題庫上線，建立 PDF 萃取、AI 分類與靜態題庫流程 |
| 2026-06-11～14 | 數學、社會題庫上線；社會擴充至 452 題，三科作答說明共 1,257 題 |
| 2026-06-15～20 | 分批練習、錯題庫、進度匯出／匯入、獎勵圖池與國語手寫模式上線；題庫達 1,924 題 |
| 2026-07-11～17 | 注音程式、Cloudflare Worker 同步、hub／registry、app monorepo 整併與共用 wiring layer 上線 |
| 2026-09-12 | #53 完成四上數學候選卷研究與收集：8 份題目卷、6 份官方答案，共 14 個私用 PDF |
| 2026-09-12 | #54 完成四上 U1 第一份紙本短練習：10 題孩子卷與家長答案；私用衍生成品不進 Git |

## 近期路線

| 順序 | 工作 | 依賴 | 完成訊號 |
|---|---|---|---|
| 1 | [#55 四上 U1](https://github.com/huansbox/aiden-study/issues/55) 第一小批歷屆題加入既有 Study | 方案已定案；#53 的已核來源；沿用 app 已有題型 | 六題題包與程式整合通過桌面驗證、獨立 review 與真 iPad 驗收 |
| 2 | 依孩子使用證據擴充 U1 題量或章節 | #55 完成；實際學習進度 | 先補同章缺口，再決定是否進下一章；不按章自動產紙本 |
| 3 | [#35 iPad 真機 spike](https://github.com/huansbox/aiden-study/issues/35) | 真 iPad | 單 origin 導航、網址參數與 localStorage 容器三項都有真機紀錄 |
| 4 | [#34 掛網域與搬遷](https://github.com/huansbox/aiden-study/issues/34) | #35 關閉、逐容器備份與同步健康 | 新網址與新圖示完成進度對帳後，才移除舊圖示或清理舊 repo |
| 並行 | [#20 注音 MVP 收尾](https://github.com/huansbox/aiden-study/issues/20) | 家長錄音與 iPad | 14 段正式錄音入庫並完成真機驗收 |

四上 U1 的具體資料邊界、題型映射、進度策略與驗收方案見 [`docs-dev/grade4-u1-study-integration-plan.md`](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)。方案已定案，但 W1–W4 尚未啟動。今年桃子腳 115 康軒正式段考範圍仍未知；跨年度、跨版本題目一律依概念對齊，不依舊單元序號直接搬入。

## 後續方向

### 題庫內容

- U1 小批驗證後，以孩子實際使用與學校進度決定擴題或進下一章。
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
- 不在 #34 的備份、同步健康與進度對帳完成前刪除舊主畫面圖示或清空舊 repo。
- 不承諾每章都有紙本 PDF，也不為尚未出現的題型先建互動練習。
- 期中自然 unit 1／2 說明與 3 題隱藏題維持 `not planned`，不因本次改方向而重開。

## 收斂原則

- 沒有硬 deadline；跟著學期與孩子實際需要走。
- 題庫先小批、先用既有題型、先驗證可接續，再擴題或擴章。
- 自訂網域搬遷是一次性高風險操作，必須照 [#34 權威 issue／checklist](https://github.com/huansbox/aiden-study/issues/34)，不拆 gate、不跳過對帳。
- Roadmap 只放方向與里程碑；逐項狀態以 code、GitHub issues、Git 歷史與 [Plan](Plan) 為準。
