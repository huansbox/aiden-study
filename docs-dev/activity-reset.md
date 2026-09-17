# 指定孩子的累計重置

首頁時間、作答數、任務完成與徽章由共用 activity streams 計算，和各 App 的學習進度是兩套資料。只有家長明確指定範圍後才重置；本文件不授權例行清除。

## 累計世代

- Worker 的 `c:activity-generation:<child>` 為非負安全整數；不存在代表 `0`。
- 第 0 代沿用 `m:<child>:<app>:<device>`；第 N 代使用 `mN:<child>:<app>:<device>`。重置將該孩子的世代加一，原始資料留在舊區供回復查證，不再列入首頁。
- GET 回傳 `generation`；PUT 與背景 beacon 的 stream 也帶同值。未帶值視為第 0 代，過期或超前寫入回 `409` 與目前世代。
- 前端先取得目前世代才補送離線紀錄；舊快取、待送資料與仍開啟 App 的舊記憶體不會改標成新世代。待顯示的任務／徽章通知同步取消。已知世代不因延遲舊回應而倒退。
- KV 仍為最終一致，剛重置可能短暫看到舊世代；不同世代分開存放，因此延遲舊寫入不會污染新累計。

## 操作順序

1. 先部署支援世代的 Worker 與所有入口的共用前端，更新首頁 release hash 與子 App 資源版本。
2. 以現有 Wrangler 管理權限讀取並保存指定孩子目前世代、舊 stream key 清單；僅放在 ignored `.scratch/`，不將真實進度提交到 Git。
3. 再讀世代確認未被其他操作修改，寫入 `current + 1`。不要刪除世代、降版或重新使用舊世代。
4. 讀回世代與新世代 stream 清單，確認首頁累計歸零。若同時要重置某個 App，需另外處理其 `p:<child>:<app>`，不可順便清其他 App。
5. 請家長讓 iPad 連網，離開尚在進行的練習，回首頁後再進 App；Safari 與主畫面會各自取得重置。無須重新安裝圖示或連接家庭。

## 注音進度另行處理

既有 progress sync 採 revision 與 epoch。保存完整舊值後，寫入 `data: {schemaVersion: 1, cards: {}}`、`rev + 1`、新的 `writeId` 與 `updatedAt`，**保留原 epoch**，再讀回核對。直接刪 key 或改 epoch 會觸發舊裝置補回資料。尚在練習中的畫面需退出後重進，避免仍用舊記憶體繼續作答。

## 驗證

`tests/test_family.mjs` 與 `tests/test_family_client.mjs` 覆蓋跨孩子隔離、所有 App 累計歸零、連續重置、舊版 PUT／beacon 拒絕、獨立容器離線待送、取消批末成就、延遲 GET／PUT、新世代重新作答與去重。測試資料不使用正式孩子進度。
