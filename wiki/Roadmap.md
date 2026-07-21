# 路線圖

> 快照日期：2026-07-21。長期方向在本頁；可直接執行的順序與 gate 見 [執行中計畫](Plan)。HITL（human in the loop）表示需要家長在真機操作或判定，不能只靠程式端完成。

## 方向

Aiden Study 已從單一三年級題庫，轉成家中兩個孩子共用的學習平台。近期目標不是再加功能，而是把現有平台安全地帶過 iPad 真機驗證、注音內容收尾與自訂網域搬遷；搬遷完成後，再依學期需要新增或退役 app。

## 已完成里程碑

| 時間 | 里程碑 |
|---|---|
| 2026-06-上旬 | 自然期中／期末題庫上線，建立 PDF 萃取、AI 分類與靜態題庫流程 |
| 2026-06-11～14 | 數學、社會題庫上線；社會擴充至 452 題，三科作答說明共 1,257 題 |
| 2026-06-15～17 | 分批練習、錯題庫、進度匯出／匯入、備忘錄捷徑與完整獎勵圖池上線 |
| 2026-06-20 | 國語改錯字選擇／手寫模式上線；題庫達 1,924 題 |
| 2026-07-10 | 國語手寫第二輪 review 收斂；既有 Wiki 建立 |
| 2026-07-11 | 注音 MVP 1/5～5/5 程式完成；Cloudflare Worker＋KV 同步服務上線 |
| 2026-07-12 | Study、zhuyin 接入 child 維度存檔與同步；題庫搬到 `docs/study/` |
| 2026-07-14 | Registry 驅動的 hub／家長視圖上線；同步 epoch 換代復原機制上線 |
| 2026-07-15 | Math、nonogram、spelling 搬入 monorepo；math／spelling 接同步；家用 token 重鑄並存入 1Password |
| 2026-07-17 | 四 app 共用 `wiring-v1.js` 上線；effect-layer 測試、safe storage 與誠實錯誤回報完成 |

## 目前位置

平台 [#26](https://github.com/huansbox/aiden-study/issues/26) 的工程階段 2/9～8/9 已完成：

- Worker、同步協定、epoch 復原與四 app 雲端同步已部署。
- Hub、registry、家長同步健康視圖已部署。
- Study、zhuyin、math、spelling、nonogram 已收進同一 repo。
- 同步接線已由四份複製碼收斂為共用 wiring layer。
- 全套基準為 Node.js 220 tests、pytest 140 tests。

剩餘不是一般 code backlog，而是需要家長與 iPad 的 stop-gate、內容錄製及搬遷操作。

## 近期路線

| 順序 | 工作 | 依賴 | 完成訊號 |
|---|---|---|---|
| 1 | [#35 iPad 真機 spike](https://github.com/huansbox/aiden-study/issues/35) | 無 | 同 origin 導航、`?child=/?k=`、localStorage 容器三項均有真機紀錄；任一失敗就回頭改架構 |
| 2 | 舊主畫面圖示 smoke＋四 app 同步健康確認 | #35 可並場做 | 舊圖示能經 hub 進 app；各裝置／容器看得到正確 child 與健康狀態 |
| 3 | [#20 注音 MVP 收尾](https://github.com/huansbox/aiden-study/issues/20) | 家長錄音與 iPad | 14/14 `.m4a` 入庫、缺檔警告歸零、兩活動與音效自檢通過 |
| 4 | [#34 掛網域與搬遷](https://github.com/huansbox/aiden-study/issues/34) | #35 關閉、四 app 同步健康、每裝置／容器備援匯出 | `kids.linshuhuan.com` 上線、301／資產／同步驗收通過、進度對帳後才刪舊圖示 |
| 5 | [#11 standalone 還原驗收](https://github.com/huansbox/aiden-study/issues/11) | iPad；不阻擋平台主鏈 | Safari 與 standalone 備份／還原路徑有記錄；必要時再做剪貼簿橋樑 |

#35 與 #20 可在同一次 iPad 工作時段處理，但 #20 不是 #34 的硬相依。#34 是平台 [#26](https://github.com/huansbox/aiden-study/issues/26) 的最後一個主里程碑。

## 搬遷後方向

### 題庫內容

- 期中自然 unit 1／2 作答後說明，考試需要時再做。
- 隱藏題救回 3 題，考後再議。
- 社會看圖題策展；前置工作是取回不在 Git 的原始 PDF。
- 視需求再收更多社會無答案卷，不為題數本身擴張。

### 平台與 app

- 新 app 預設加在 `docs/<app>/`，並在 registry 登記；不要再為每個小工具開新 repo。
- App 的 active／draft／parked／retired 狀態隨孩子需求調整。
- 獎勵圖鑑維持 backlog；現有隨機揭曉先繼續使用。
- 任一 child 的 active app 達 5 個以上時，再評估是否需要孩子自行排序；目前由家長改 registry 即可。
- 99timestable、99-meteor 等舊項目等弟弟實際需要時再評估，不為「搬齊」而搬。

## 非目標

- 不做登入帳號、密碼系統或多租戶後端；維持 family token＋child 維度。
- 不把網站遷到 Cloudflare Pages；託管留 GitHub Pages，自訂網域只負責穩定 origin。
- 不把各 app 的教學邏輯抽成大型共用 framework；只共用平台基建。
- 不加入手寫辨識、筆順驗證、Apple Pencil 壓力／傾斜或儲存筆跡。
- 不恢復題庫「快速練習」模式。
- 不在搬遷進度對帳完成前刪除舊主畫面圖示或清空舊 repo。

## 收斂原則

- 沒有硬 deadline；跟著學期與孩子實際需要走。
- 自訂網域搬遷是一次性高風險操作，必須照 #34 checklist，不拆 gate、不跳過對帳。
- Roadmap 只放方向與里程碑；逐項狀態以 GitHub issues 和 [Plan](Plan) 為準。
