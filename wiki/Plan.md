# 執行中計畫

> 快照日期：2026-10-03。Native Camp 十月課程與收整（#142／#144）、Study 容量（#145）已交付；數學文字題補充與 housekeeping 見 [#148](https://github.com/huansbox/aiden-study/issues/148) 最新交接。本頁提供工作入口、已確認的界線與文件中已寫明的候選方向，不手抄即時作品狀態；開工前以當時的程式、Git 歷史與 tracker 核對。

## 找目前的工作

| 想確認什麼 | 查哪裡 |
|---|---|
| 作品有哪些、位置、可用版本與工作狀態 | [README 自動作品總覽](https://github.com/huansbox/aiden-study/blob/master/README.md#作品總覽)／[家長作品白板](https://kids.linshuhuan.com/parent/) |
| 這次正在做什麼、阻礙與驗收條件 | [Open issues](https://github.com/huansbox/aiden-study/issues?q=is%3Aissue%20is%3Aopen)；進入個別 issue／PR 讀最新狀態，不從舊 Wiki 推定待辦 |
| 接續子專案前的四關檢查 | [子專案接續開發](https://github.com/huansbox/aiden-study/blob/master/docs-dev/development-readiness.md)：找得到、知道改哪裡、接得上、收得回來 |
| 素材任務的登錄與歸檔 | [任務庫規則](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/README.md)與 [catalog](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/catalog.json) |
| 可以沿用的 SOP、模板與工具 | [shared 索引](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/README.md) |
| Native Camp 私人資料與已收起的工作副本 | Wiki [Native Camp 資料保存與恢復](Native-Camp-Storage) |

根目錄 [`HANDOFF.md`](https://github.com/huansbox/aiden-study/blob/master/HANDOFF.md) 停在 2026-09-19 的 Study 數學交付，之後的工作都以各 issue 的結案留言為交接；兩者不一致時以 issue 為準。

## 已交付基線與驗收界線

- **注音**：#15／#20 於 2026-09-17 結案，親錄 14 段已交付。依[注音專用交接](https://github.com/huansbox/aiden-study/blob/master/docs-dev/zhuyin-handoff.md)，不再要求補錄音或重做家長已免除的逐項 iPad checklist；擴圈不是已授權待辦。
- **家長後台與入口**：家庭設定、首頁卡片、進度同步時間、Cookie 入口連線與首頁自動更新（#61～#63）於 2026-09-16 前上線。iPad 真機重新加入乾淨網址圖示由家長自行操作，桌面驗證不代表 iPad Cookie 保存已驗收。
- **四上數學**：#101 的 rev4 與不寫入孩子進度的家長試玩（#103／#106）為既有基線；2026-10-03 的 [#148 文字題補充](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-text-batch.md)沿用既有選答、數字與比較符號操作。現行題數、來源與未測範圍查[擴題路線圖](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-expansion-plan.md)與[概念／出題方法覆蓋報告](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-math-pattern-counts.md)，不把原卷所有未收題都視為需新互動功能。
- **四上自然**：#115 收卷與概念對照、#117／#119／#129／#134 四批轉題、#122 題組一次一小題、#124 七個練習主題皆已結案；同一題包於 2026-09-27 發布 rev8，共 97 題（數學 57／自然 40）。**校方正式考試範圍尚未取得、實體 iPad 尚未驗收**；第四批無官方答案，採作者與獨立 reviewer 各自解題一致後收錄。
- **每日目標與積木列車收藏**：#110～#113 於 2026-09-23 交付 E500、EMU3000、R200，#127 於 2026-09-30 加入 700T、N700S。自動化使用 Chromium Pad 尺寸與 touch 事件，不等於實體 iPad 或孩子手感驗收；單包 15～30 秒是設計目標，未以真人實測宣稱達標。
- **Native Camp**：2026-09-08～09-30 各堂與 2026-10-02 Denny 的課後複習已發布（最近為 #140、#142）；Weekly Review 自 #125 起改為家長要求才製作。家長於 #142 決定不追做找不到紀錄的 10/1，也不改做 10/3。完成交付不等於孩子已掌握；未做真實孩子難度／耗時、iPad 或逐檔人耳實測。
- **閱讀心智圖**：〈愛的分享〉（#137）於 2026-09-29 上線，沿用前篇老師未修正的五枝短詞做法。
- **整理與歸檔**：#95 建立開工／收尾關卡；#138、#144 把 Native Camp 私人資料與已完成工作副本歸檔到 Dropbox，只驗證本機檔案一致，未宣稱雲端同步完成。

## 容量調整

**家庭題包容量**：#145 已將 builder、Worker 與瀏覽器提高至 256 KiB；決策與發布證據見 [Study 私用題包容量](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)。後續擴題仍另依題型缺口規劃。

## 候選方向（未授權，需另開 issue）

下列是各交付文件已寫明的下一步線索，不是已核准待辦；沒有家長要求就不開工。

1. **四上自然缺口**：前提清楚的風力比較、地表控制變因實驗等題型仍缺；取得校方正式範圍後再校準。
2. **四上數學下一批**：#148 已處理一批現有介面可保真的歷屆題；其餘依最新覆蓋報告與原卷要求挑選，不把「只驗最終數字」當成列式、集合或繪圖題的完整驗收。`angle-v1` 角圖呈現保留為選項，尚未授權。
3. **Native Camp 新課**：家長提出日期後，依每堂 SOP 製作；Weekly Review 與排程維持停用。
4. **每週閱讀心智圖**：家長提供新文章與老師回饋後，依 shared SOP 製作並更新 `mindMaps` 索引。
5. **實體 iPad 回饋**：自然題組、積木拼裝、Native Camp 語音都只有桌面模擬證據；孩子實際使用後的回饋另開調整票。

## 被動觀察與不啟動事項

- 舊 `aiden-math` 的 [worksheets/word-problems](https://github.com/huansbox/aiden-math/tree/main/worksheets/word-problems) 是未隨 App 匯入的來源指標；按需查證、確認用途再處理，不整包搬入，不標成孩子真實錯題。保全值得留下的內容前，不清空舊 repo。
- 主線外作品「怎麼和 AI 一起做出探險卡」仍在 `codex/ai-collaboration-showcase` 分支，網站已發布；正式整合前不把 branch-only 成果當成主線檔案。
- 四上社會擴充、一般化 CMS、任意 pack API、browser 寫題庫及新登入帳號不因本次文件整理而啟動。期中自然 unit 1／2 說明與 3 題隱藏題維持 `not planned`。
- 已放棄找回的三下歷史紀錄、家長已免除的 iPad checklist、已停用的 Weekly 排程，都不重新列為待辦。

## 開工與收尾

1. 從最新 `origin/master` 建隔離 worktree／branch，不在上一個 task 的舊分支接新功能；共用範圍（registry、catalog、`docs/shared/`、`worker/`、生成索引）指定一個整合者。
2. 依 tracker 的已核准範圍工作；既有驗收紀錄是歷史證據，未測項目不補寫成通過，也不自行重開已免除的 gate。
3. 新 App 登錄於 `docs/registry.json`，新素材任務從開始就放入 `learning-tasks/<task>/` 並登錄於 `catalog.json`；改登錄後跑生成器，不手改 README 清單或白板。
4. 完成的實作以 PR、CI 與正式資源讀回作為證據，回寫 issue；Wiki 只更新導覽或歷史里程碑，不把已結案項目排成進行中工作。
5. `untracked`／`ignored` 不等於垃圾：私人題包、回放音檔、request journal、進度備份保留原處。成果已合併也不自動授權刪除 branch、工作目錄、舊圖示或 repo；清理是另一個需明確要求的任務，先歸檔並逐檔核對。
