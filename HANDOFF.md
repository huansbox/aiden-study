# HANDOFF

- Status: completed
- Task/issue: #62 — 家長操作收尾：同步狀態、每週心智圖流程與舊 tracker 整理
- Branch: master（整合 codex/parent-operations）
- Updated: 2026-09-16

## Progress

#62 已整合並發布，實作 commit `1d6cd0306f1f4e7e82dfe8c80f1b6620c6884bf9`。家長後台新增目前孩子的 App 雲端進度接收時間、無紀錄、本機／外站限制與重新查詢；連線失效、服務失敗、舊資料明示。查詢保留未存輸入，慢回應不覆蓋新結果。詳見 [操作與正式發布證據](docs-dev/family-uiux-v2.md#2026-09-16-家長操作收尾驗證62)。Worker 未變更。

每週新文章依 [心智圖流程](learning-tasks/shared/reading-mind-maps.md#每週交付素材) 處理：家長提供全文或清晰照片，老師要求有的話附上；製作、檢查、依授權發布後替換目前入口。不新增孩子可見歷史列表、CMS 或排程。

#26 的九個子票 #27–#35 全完成，父票已結案；#15 加上現況，原始 PRD 保留。#15／#20 仍開啟追蹤正式注音音檔。

MacBook Pro 的「補齊注音第一圈音檔」已交付 [隔離候選包](https://github.com/huansbox/aiden-study/tree/codex/zhuyin-audio-candidates/docs-dev/zhuyin-audio-candidates)，分支 `codex/zhuyin-audio-candidates`，內容 commit `833318c`、文案收尾 `caea285`。含 14 段機器候選、集中試聽、可重建來源與嚴格音檔審計；仍留在獨立分支，未合併或部署。候選可播不等於發音獲採用，既有全親錄及先前否決 TTS 的決定仍有效。

## Next step

1. 注音 #20：沿用 [正式錄音工具](https://kids.linshuhuan.com/zhuyin/recorder.html)，集中交付 14 段親錄原檔；收到後整理格式、驗音、入庫並確認實際發聲。正式目錄仍缺 14/14，不能因候選通過技術審計而關票。
2. 收到本週新文章時按固定流程製作；目前煦誠首頁仍為〈悠閒午後〉，未虛構下一篇。

## Decisions and validation

- 不搬舊三年級進度、不清除既有資料；已免除的細碎真機 checklist 不再列 blocker，未做項目不記成通過。#34／#35／#61 不重開。
- 本輪 Node 328、pytest 184 全通過；隔離瀏覽器確認孩子分離、空紀錄、本機／外站、未存欄位保留、503 舊資料與恢復；390×844 手機與 1112×834 iPad 橫向尺寸無溢出。
- 獨立 review 修復 401 區塊內登入後切孩子可能留下錯誤表單；真實 auth／Worker 整合回歸驗證有／無草稿分支與正確寫入對象，複核無剩餘 finding。另修正測試以實際更新事件等待，避免固定 event-loop 次數造成不穩定。
- [CI](https://github.com/huansbox/aiden-study/actions/runs/35066797107)、[Pages](https://github.com/huansbox/aiden-study/actions/runs/35066796344) success；正式站 9 個資源與 release 相同，Chrome 後台可讀真實進度 metadata。未寫正式家庭設定／進度。
- #15／#26 body 已讀回逐字核對，歷史原文保留。MBP 音檔與應用程式測試是隔離候選驗證，不冒充正式音檔或 iPad 真機完成。

## Blockers

#62 無阻擋項；注音 #20 仍待可採用的親錄音檔，屬獨立後續工作。
