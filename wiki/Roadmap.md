# 路線圖

> 快照日期：2026-09-18（局部更新作品入口與注音交付；既有數學方向仍取自 2026-09-15 基線，本次未重審）。本頁保存方向與歷史里程碑；目前作品狀態看 [README 自動總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)，執行條件回查 [Plan](Plan) 所連的 tracker，不在此另抄待辦。

## 方向

Aiden Study 的數學內容沿用「歷屆題庫 → iPad 練習」方向：把已核過來源、答案與概念範圍的歷屆題，小批加入既有 Study。每批內容、revision、後續擴題與未測範圍查[四上數學擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)，不在 Wiki 重複維護目前題數或完成狀態。保護現存進度與年級隔離；家長已放棄找回的三下歷史紀錄不列為恢復任務。

另有兩種支援路線，但只在實際需要時啟動：

- 「數學題型分析 → 改編紙本」用於需要短時間紙筆練習、手寫計算或特定弱點回看時；不預設每章都製作 PDF。
- 「數學技能互動練習」用於 Study 既有題型不足以承載的單一技能；不因有舊素材就先做新 app。

日常入口、注音與各次素材的交付有各自證據，不能沿用舊 Wiki 排出新的開發順序。網域歷史見[上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)，注音見[專用交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md)；後續工作只從已核准 issue 啟動。舊 repo 清理不是交付完成後的自動動作。

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
| 2026-09-17 | 注音 #15／#20 已結案，14 段親錄交付；家長免除逐項 iPad checklist，未測項目不補稱通過，見[注音交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md) |
| 2026-09-18 | [PR #92](https://github.com/huansbox/aiden-study/pull/92) 交付自動作品總覽與家長白板；[ADR-0008](https://github.com/huansbox/aiden-study/blob/master/docs-dev/adr/0008-generated-work-catalog.md) 取代人工索引，但不改 task／app／shared 分工 |

## 近期工作入口

目前可執行工作與依賴查 [GitHub issues](https://github.com/huansbox/aiden-study/issues?q=is%3Aissue%20is%3Aopen)；個別作品來源與狀態查自動總覽。本頁不把已完成的注音錄音重新排入「並行」工作。

四上 U1 的資料邊界、題型映射與進度策略見 [U1 整合方案](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)，實測與未測限制見[家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md)。正式段考範圍需另外查證；跨年度、跨版本題目依概念對齊，不依舊單元序號直接搬入。

## 後續方向

### 題庫內容

- 以孩子實際使用、學校進度及每批正式 review 決定後續擴題；U3 `angle-v1` 等方向的採納／實作狀態回查擴題路線圖，不以本頁推定已授權開工。
- 自然、社會同為康軒版，日後按需要沿用「來源查證 → 概念對齊 → 小批驗收」流程；本輪只規劃四上數學。
- 社會看圖題與其他既有 backlog 不為題數本身擴張。
- 正式考試範圍公布後，再回頭校準段考候選題；不把教學計畫推定寫成學校公告。

### 平台與 app

- 新 app 預設加在 `docs/<app>/` 並由 registry 登記，但能用既有 Study 完成時不另開 app。
- App 的 active／draft／parked／retired 狀態隨孩子需求調整。
- 孩子首頁可見活動與順序由家長後台的家庭設定管理；registry 是 App 目錄與預設值，不是家庭當前設定，見 [CONTEXT.md](https://github.com/huansbox/aiden-study/blob/master/CONTEXT.md)。

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
