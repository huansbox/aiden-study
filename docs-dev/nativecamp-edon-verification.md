# Edon兩堂複習整合驗收

本次來源為2026-09-14及09-16的19:30 Edon課程；既有2026-09-15 19:30 Silvana識別已補入首堂README與catalog。原始來源網址、完整逐字稿與回放均留在各堂ignored路徑。

## 交付範圍

- 9/14：祖父母、短文主題，12題及24音檔。
- 9/16：親屬關係、縮寫、相反詞，18題及36音檔。
- 三課共用孩子／家長／Preview的catalog，預設最新課，舊課仍可查看與完成跨日題。
- 兩堂新TTS採Zira rate -2。舊課18題、35 TTS及私人老師片段不變；本次不新增私人KV內容或Worker路由。
- 原速／慢速／OpenAI Marin／Cedar比較共13檔。OpenAI正常Playground共6次生成、無重試；確切扣款未查得。Mac無可用連線，本輪未測。

## 實際驗證

2026-09-17（Asia/Taipei）：

- 全repo `node --test tests/*.mjs`：437通過；`uv run pytest`：184通過。
- 兩堂builder `--check`、題包／speech jobs／60音檔manifest及SHA256一致；原音全檔解碼與各3段分聲道ASR。ASR不當成人耳或發音評分。
- 本機8791：逐題檢查30題揭曉答案皆與題包一致；實際完成縮寫排列題，並核對錯誤選擇的正確示範。
- 題音Listen可播放；首次載入若被autoplay限制，可手動重聽。播放狀態不等於人耳自然度驗收。
- 桌面與390px窄版檢查關係卡、短文及Say句框，無橫向溢出；驗收後恢復原viewport。
- 孩子首頁預設9/16、三堂皆可選；家長切回9/15可讀原Try／Say完成紀錄，Preview連結跟隨所選課程。
- 8791未重啟、未清空資料；Preview未寫入學習紀錄，沒有替孩子補作答或更動家庭設定。

## Review修正

獨立唯讀review找出並修正兩個資料遺失情境：

1. bfcache返回舊課時，NativeCamp記憶體快照過期。現在讀取最新本機資料，回頁／其他分頁變更時更新畫面，保存前拒絕過期快照。
2. 較早頁面的延遲PUT回應覆蓋另一頁的新同步狀態。shared sync現在確認回應仍屬當次revision／epoch／writeId，並保留其他頁新作答的dirty。

兩情境均有可重現的回歸測試；最後獨立同步／Worker／platform／wiring複核97項通過，無新阻擋項目。沿用既有跨裝置衝突規則，未改成跨裝置逐題合併。shared script各入口快取版本已更新，首頁release hash已重建。

## 發布與尚未驗證

發布沿用master的GitHub Pages。合併commit、CI、Pages及正式資源hash核對結果記在本次PR的發布紀錄；以該紀錄確認上線，不用本機測試代替。兩堂正式入口見各task README。

尚未完成：新兩堂孩子使用回饋、iPad真機、全部音檔的人耳自然度評估、Mac語音比較。這些不冒充為已通過，也不推定慢版已改善學習成效。
