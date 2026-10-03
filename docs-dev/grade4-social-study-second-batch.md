# 四上社會第二批：地形、氣候與圖表（#157）

本批接續 [#154 首批](grade4-social-study-first-batch.md)，追蹤 [#157](https://github.com/huansbox/aiden-study/issues/157)。正式範圍尚未公告，仍依 115 康軒 U1「家鄉的自然環境」按概念收題，不以舊卷單元號判定。原卷、校方答案與年度對照沿用[收卷任務](../learning-tasks/grade4-sem1-social-exam1/README.md)；舊卷出版社未證實時維持 unknown。

## 範圍與基線

本批已上線的活動為 112 II-01 選圖配對、113 III-01～05 地形剖面配對、113 III-06 地形氣候與生活配對、113 VI-01 地形高度曲線、113 VI-02 月雨量比較。三組配對各算一個完整 activity，另兩題看圖選擇，共 5 個完整活動、16 個子作答；社會累計 24 活動。配對沿用一次一小題，圖表保留必要標示且可放大。

113 VIII 的氣候表與行程題先保留整組：作者與 reviewer 發現末題在題目卷及答案卷的出發月份不同，官方標答對應答案卷的另一個題版；按題目卷資料，四個行程都無法完全符合條件。這是題答版本不一致，不能直接將官方標答套在題目卷。112 混合填空方位與多選項池行政區題、114 未取得官方答案的卷，本批不處理。保留原件與原因，不以刪掉條件或猜答案湊數。

基線是已發布 revision 11，共 127 個活動（數學 68／自然 40／社會 19），200737 bytes，SHA256 `4afbc74258f47d41489cd109d9119240d44844c4b0f73eb414831dff73b9784b`。容量維持 256 KiB，剩餘 61407 bytes。固定 packId／內容 key、既有題文／解說／mapping／stable ID 及孩子進度保持不變；數學 68 題／45 題型不受新社會題影響。

已發布 revision 12 為 132 個活動（數學 68／自然 40／社會 24）、229503 bytes，SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，剩餘 32641 bytes。既有 127 個活動、curated、解說與 mapping 逐值守衛通過。正式內容已經兩階段讀回核對，證據見下文及 Issue checkpoint。

## 核對與交付

作者先解題再查官方答案，獨立 reviewer 另讀原卷整頁自行解題後核對。原卷 PDF 指紋、選題集合、作者稿、審查與候選包都綁定本批核准；私人資料只存 ignored `data/private/study/g4-s1-math-u1/social-second-batch/` 與任務 `source/papers/`／`source/private/`。

Python builder、瀏覽器與 Worker 共用 parser 需同步接入本批實際格式；原有自然與數學格式界線保留。真包 E2E 使用隔離 test-child／fake KV，檢查圖表清晰、一步一小題、答案／重試／重載、家長試玩不寫孩子資料與獎勵只在批末出現。不把 Chromium 尺寸模擬寫成實體 iPad Safari 驗收。

本批若修改 parser，按 runtime-changing 順序：PR 與 CI 核准 → 核對現役 Worker 與 rev11 → 新 Worker → 合併及等待 Pages → HTML 和精確資產 URL bytes 核對 → 一次前向寫入核准 rev12 → 立即與超過 60 秒讀回。寫入前不可將候選標成已發布；不得讀寫正式家庭 session 或孩子 `p:` 資料。

正式發布、容量、驗證與收尾證據完成後追加於本文件，最新 checkpoint 記於 #157。可重建原件與私人證據核實保存後，才封存本批工作區。長期契約以 Wiki [Study 私用題包](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本。

## 發布前核准

五個活動均由作者與獨立 reviewer 自行解題後核對校方答案。真包目視發現初版的圖片說明提前描述正確圖形，已改為中性的圖號、座標軸與單位；舊候選和審查撤回，重新凍結、覆核及 E2E，最後核准的是上述 `2e2c94e7…` 指紋。Root 的 `approval.json` 綁定精確五個 ID、作者六檔、凍結 manifest、內容 review JSON／MD、校卷 manifest 及四份實際題／答 PDF，不能直接沿用舊審查。

本機 Node 782／Python 277 通過（1 項既有缺 PDF skip）。新版真包 13 個 E2E 情境通過，含五種題型的直橫尺寸、第五選項實際點選、重試／重載／批末記錄、家長試玩隔離與 rev11→rev12 半批及掌握度保留。題目、送出與結束畫面分別記尺寸；較大看圖單題及部分家長試玩頁需要垂直捲動，沒有水平溢位。七項負向 gate 拒絕錯誤 ID、過期 review 指紋、未核准 review、PDF／manifest 篡改、答案頁越界及舊題變更。測試 server／browser 已關閉，獨立審查未留未修正的 material finding。

## 正式發布與保存

2026-10-04 完成 [PR #158](https://github.com/huansbox/aiden-study/pull/158)，已審查來源 `fe5ccb31a15e3f693f879475cbb3d24c5fe8396a` 合併為 `bf35ae6faf750938c768f791ce8b4d3668b823dc`。目錄自動更新另產生 `29899dba268614549eb15e3d0736c5d860704c6b`，只變更 work-catalog。Pages run `37152552447`、主線 test `37152534717` 與 catalog `37152534674` 成功；8 個入口／精確引用資產／目錄 URL 的 bytes 與 Pages commit 相符，沒有提前請求尚未發布的新 cache query。

Worker 使用 Wrangler 4.132.0 從上述來源更新為 `f060feb7-ac64-4598-8e97-779c6d521d90`、100%。寫入前管理端再讀回 rev11 基線，對固定 `c:study:g4-s1-math-u1` 一次前向寫入核准 rev12；2026-10-03T20:45:33.555Z 與 2026-10-03T20:47:05.817Z（UTC）兩次讀回相隔 92.262 秒，均為 132 活動／229503 bytes／SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`。最後 Worker 仍為同版本。沒有使用正式家庭 session 或讀寫孩子 `p:` 資料。

公開 selection 已升為 published，數學報表 snapshot 已更新，原 45 patterns／68 assignments 逐值保留。社會三個粗主題累計為地圖與位置 12、地形與生活 5、氣候與水資源 7 活動；共 3 組配對、11 題選擇與 10 題是非。新配對組合共 14 小題，另兩題圖表選擇；不把 16 個作答格寫成 16 個新活動。

恢復來源預定保存在 canonical ignored `data/private/study/g4-s1-math-u1/rev12-release/`，包含 active 三檔、作者稿／裁圖、核准／審查、測試／發布讀回、5 份校卷／答卷及課程依據。根 `manifest.json` 逐檔核 bytes／SHA256，`private/RESTORE.md` 說明新 worktree 恢復。Dropbox 本機副本相對路徑 `mywork/aiden-study/social-second-batch-2026-10-04/rev12-release/`，本機根 `C:/Users/linshuhuan/Dropbox` 已於 2026-10-04 查核；不代表接收端已同步。是否已完成實際複製與工作區封存，以 #157 結案 checkpoint 為準。

下一批仍需先釐清 113 氣候行程題的題答版本，再評估 112 方位／行政區題及 114 未取得官方答案的圖表題；正式段考範圍仍待學校公告。本批完成不等於全部社會考卷已收齊。
