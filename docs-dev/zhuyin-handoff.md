# 注音 App：現況與交接

更新：2026-09-17。狀態：本輪已完成，依使用者要求收工；目前沒有待接續實作的注音工作。

這是注音的維護入口。當前工作以 GitHub issue／PR 追蹤；本頁集中已交付功能、已定案原則及證據索引，不另維護一份待辦清單。全 repo 的本次交接見 [HANDOFF](../HANDOFF.md)。

## 已交付範圍

- 最小可用 MVP：ㄅ、ㄇ、ㄚ三個符號；ㄅㄚ／ㄇㄚ四聲；爸爸、媽媽、馬的真實詞連結。包含聽音辨認、首次示範、聽音組字、批末獎勵及家長維護區。
- 正式音檔 14/14 已採用使用者接受的 MacBook Pro 親錄版本，並完成發布；TTS 候選未採用。不是仍在等錄音，也不代表完整 v1 PRD 的全部功能都已完成。
- 聲符與韻符上下排列；ˊ、ˇ、ˋ 放大並調整位置。示範依實際音檔播放，依序凸顯聲符、韻符、聲調；一聲留白，以整組符號凸顯。重播與換題會取消舊播放，錯誤選項試聽不洩漏正解。
- 作答即時存檔，任務完成、徽章與成就提示留到整批結束；回到下一批時收掉上一批提示。平台共通規範見 [AGENTS.md](../AGENTS.md#練習不中斷)。
- 原有學習進度支援本機保存與雲端同步；首頁累計另有重置世代，避免舊快取、離線補送與延遲回應把重置前的數字加回來。

## 追蹤與發布證據

| 工作 | 狀態與來源 |
| --- | --- |
| MVP 規劃 | [#15](https://github.com/huansbox/aiden-study/issues/15) 已結案；子票 #16–#20 全數結案。閱讀 issue 頂端的目前狀態，早期 PRD 與 comments 是歷史決策。 |
| 親錄音檔與 MVP 收尾 | [#20](https://github.com/huansbox/aiden-study/issues/20)、[收尾與發布紀錄](zhuyin-mvp-ipad-checklist.md)、[音檔來源與接受紀錄](zhuyin-parent-audio/README.md)；實作 `87b76aa`。 |
| 直排與批末獎勵 | [commit 72f1603](https://github.com/huansbox/aiden-study/commit/72f16039c02f2159c8217c44d276196a20850172)，已合併並部署。 |
| 聲調放大與播放凸顯 | [commit b368a13](https://github.com/huansbox/aiden-study/commit/b368a13d622d42519f81c3c091bec0c0bf38a73e)，已合併並部署；使用者回覆「ok 了」。 |
| 累計重置保護 | [PR #74](https://github.com/huansbox/aiden-study/pull/74)，主線 `5a2f71c`；[操作說明](activity-reset.md)。 |

聲調版 [CI](https://github.com/huansbox/aiden-study/actions/runs/35201079064) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35201078803) 成功。重置版 [CI](https://github.com/huansbox/aiden-study/actions/runs/35207192800) 成功；後續文件更新接續發布，含本次程式的 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35207500217) 成功，正式 11 個相關資源與已合併版本相符。同步 Worker version 為 `abf2edcc-b5bc-4abc-ae36-b09d98cbf7d5`。

## 今天的進度重置

已按使用者指定範圍完成注音學習進度與首頁累計重置，並核對雲端讀回、正式頁面的未學狀態、時間／題數／任務及成就歸零。這是一次已完成的管理操作，不是之後可以例行清除資料的授權。

含個別資料的備份、讀回與操作證據只保留在操作機的 `.scratch/`，不提交到 Git 或公開 tracker。跨機接手不依賴這些私有檔案；一般維護先讀 [重置機制](activity-reset.md)，需要再次重置時取得使用者明確指定範圍並讀取當時的新值，不能沿用今天的備份重放。

## 接手前保留的決定

- 繼續使用已接受的親錄；不要因歷史 PRD／comments 的待辦文字，重新要求錄音或改回 TTS。
- 使用者已免除逐項 iPad checklist。未執行項目不得冒充通過，也不重新作為收尾門檻。
- 家長維護模式 `?parent=1` 會停用共用累計掛載，但仍使用真實 App 學習存檔及同步，**不是隔離試玩模式**。開發驗證使用 `tests/helpers/serve-family.mjs` 的本機測試服務、測試憑證與記憶體 KV，不在正式孩子資料上作答。
- 獨立「家長試玩」曾提出建議，目前尚未實作，也未確認實作範圍。擴充其餘注音符號、親子評分、更多學習圈同樣屬未啟動的方向，不是本輪漏做的驗收項。
- 首頁安排由獨立家長後台控制；Safari 與 iPad 主畫面入口各自取得設定與同步。已安裝圖示不需因今天的更新重裝。

## 程式與驗證入口

| 位置 | 用途 |
| --- | --- |
| [docs/zhuyin/index.html](../docs/zhuyin/index.html) | 畫面、出題、播放凸顯、學習存檔與批末流程 |
| [音檔目錄](../docs/zhuyin/assets/audio/) | 正式親錄資產；來源與重建方法見上方親錄交付文件 |
| [sync-v1.js](../docs/shared/sync-v1.js)／[wiring-v1.js](../docs/shared/wiring-v1.js) | App 原有進度同步與孩子身分接線 |
| [family-client.js](../docs/shared/family-client.js)／[worker/family.mjs](../worker/family.mjs) | 首頁累計、任務與重置世代 |
| [test_zhuyin_voice.mjs](../tests/test_zhuyin_voice.mjs) | 播放順序、取消、失敗恢復與凸顯時機 |
| [test_family_client.mjs](../tests/test_family_client.mjs)／[test_family.mjs](../tests/test_family.mjs) | 批末獎勵、重置、離線／延遲回傳與跨孩子隔離 |

本日最後一輪程式驗證為 Node 415 項通過，pytest 183 項通過、1 項略過（工作目錄沒有原卷檔案）。聲調在隔離本機瀏覽器驗證；重置在正式桌面瀏覽器核對，只查看資料，沒有重新作答製造學習成果。上述不等同於 iPad 真機全項驗收，測試數量也不是永久固定值。

## 下次從哪裡開始

目前沒有已承諾、尚未完成的注音工作。下次收到實際使用問題或要擴充內容時，先讀本頁及 #15 的已確認 MVP 範圍；有新需求再使用 `/grill-me` 對齊並另開 issue。不要重開已完成的 MVP，或把上述建議當成已授權待辦。
