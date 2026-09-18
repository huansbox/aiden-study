# 執行中計畫

> 快照日期：2026-09-18。本頁提供工作入口與已確認的界線，不手抄即時作品狀態或 issue 清單；開工前以當時的程式、Git 歷史與 tracker 核對。

## 找目前的工作

| 想確認什麼 | 查哪裡 |
|---|---|
| 作品有哪些、位置、可用版本與工作狀態 | [README 自動作品總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)／[家長作品白板](https://kids.linshuhuan.com/parent/) |
| 這次正在做什麼、阻礙與驗收條件 | [Open issues](https://github.com/huansbox/aiden-study/issues?q=is%3Aissue%20is%3Aopen)；進入個別 issue／PR 讀最新狀態，不從舊 Wiki 推定待辦 |
| 素材任務的登錄與歸檔 | [任務庫規則](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/README.md)與 [catalog](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/catalog.json) |
| 可以沿用的 SOP、模板與工具 | [shared 索引](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/README.md) |

本次入口與過期狀態修正由 [#93](https://github.com/huansbox/aiden-study/issues/93) 追蹤，是否完成及發布證據回查該票；不在本頁另記一份執行進度。

## 已交付基線與驗收界線

- 注音 #15／#20 已於 2026-09-17 結案，親錄 14 段已交付。依[注音專用交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md)，不再要求補錄音或重做家長已免除的逐項 iPad checklist；隔離試玩、擴圈不是已授權待辦。
- Native Camp 的 9/13、9/17 課程與首週包於 2026-09-18 完成 [#80 交付](https://github.com/huansbox/aiden-study/issues/80)。來源不足、人耳全檔驗聽、iPad 真機及新版孩子難度／耗時的限制仍以交付紀錄為準；完成交付不等於孩子已掌握。
- 四上數學的來源研究、題包基線、擴題方向與未測範圍，分別查[擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)、[U1 整合方案](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-study-integration-plan.md)及[家庭端驗收紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-ipad-acceptance.md)。Wiki 不另外維護題數、revision 或下一批的完成狀態。
- 網域與圖示的驗收取捨見[正式網域上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)；入口連線現行機制見[入口連線說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/device-connection.md)。歷史免除資料搬遷，不等於允許清除現有資料。

## 被動觀察與後續方向

- Native Camp 每週流程與故障處置查[每週自動化 SOP](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/nativecamp/weekly-automation.md)及 [#85](https://github.com/huansbox/aiden-study/issues/85) 的交付證據。設定完成、一次排程實際成功與孩子實測是不同證據，不能互相代替。
- 數學擴充按來源概念、學校進度與已確認規劃分批進行；正式段考範圍的查證界線見[課綱比較](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md)。不由 Wiki 推定今年範圍，也不自動替每章建立紙本 PDF 或新 App。
- 舊 `aiden-math` 的 [worksheets/word-problems](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 是未隨 App 匯入的來源指標；按需查證、確認用途與授權再處理，不整包搬入，不標成孩子真實錯題。保全值得留下的內容前，不清空舊 repo。
- 四上自然／社會擴充、一般化 CMS、任意 pack API、browser 寫題庫及新登入帳號不因本次文件整理而啟動。期中自然 unit 1／2 說明與 3 題隱藏題維持既有 `not planned` 決定。

## 開工與收尾

1. 依 tracker 的已核准範圍工作；既有驗收紀錄是歷史證據，未測項目不補寫成通過，也不自行重開已免除的 gate。
2. 新 App 登錄於 `docs/registry.json`，新素材任務從開始就放入 `learning-tasks/<task>/` 並登錄於 `catalog.json`；規則與重建指令以任務庫為準。
3. 當前狀態只更新對應登錄，README 索引與白板用既有生成器重建；各任務 README 留用法、可重建來源與有日期的交付證據。
4. 完成的實作回寫 issue／PR 證據；Wiki 只更新導覽或歷史里程碑，不再把已結案項目排成進行中工作。
5. 私人原檔、私用成品與操作備份不為補索引而公開；成果已合併，也不自動授權刪除 branch、工作目錄、舊圖示或 repo。
