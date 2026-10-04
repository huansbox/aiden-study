# 四上自然第五批 Study 整合狀態（#162）

本批只核准明義110六上期末原卷1題，原卷為定性坡度／流水侵蝕比較，無校方答案；由作者與fresh reviewer獨立解題一致。明義109操縱變因題因原卷選項殘缺且作者初稿擅補字而排除。審查結論在精確ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/review/content-review.json`，SHA256 `313cf2bffd52eafb01d6ad594ba42a76f34e32c738ecc21cb9d3ef804a468021`；更正前五份作者輸入在同目錄`pre-fix-2026-10-04/`逐byte保存。公開來源身分與選題見[manifest](../learning-tasks/grade4-sem1-science-exam1/source/fifth-batch-manifest.json)、[selection](../data/study/g4-s1-science-exam1/fifth-batch-selection-metadata.json)。

rev12 canonical基線132題、229,503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，數學68／自然40／社會24。rev13完整來源快照133題、230,552 bytes、SHA256 `bda159291cc97d2cb98d65b6103abcf748cd065061faf30659c686f3535bf6d8`，數學68／自然41／社會24；原132題、解說、mapping逐值不變，只新增S1-P17。這是**完整 authoring snapshot**，不是新版孩子端實際下載的單包；rev13 manifest 已正式啟用，讀回見下節。桃子腳115正式考試範圍未取得；本題只按地表概念比對暫定核心，不能稱為嚴格控制變因或實測數據題。

可重建 gate 位於ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/rebuild_rev13.py`。它核對root核准的唯一exact ID、獨立審查原始SHA、pre-fix作者稿與當前單題稿逐值相同、原卷PDF、rev12基線與候選題包SHA。`--check`只驗證，`--promote`才寫本工作樹私人輸入與公開mapping／selection；兩個模式都不碰正式服務。production builder輸出與gate候選逐byte一致。重建 gate 固定依 reviewed source commit `8a0478a` 還原，公開 selection／pattern 的已發布狀態另存 release snapshot；不能把收尾狀態改動當成核題輸入，或修改凍結 candidates／manifest 來通過 gate。

新版catalog由production Python builder的`--catalog-dir`及Node converter各自產出後逐byte相同，保存在ignored `science-fifth-batch/rev13-python-catalog/`與`rev13-catalog/`。manifest含133題、8個unit shard，12,175 bytes、SHA256 `2d4d4d93b4044f524314a3da88bfa358643666a2634e3192a84247463dc0e6a1`；shard原文合計210,168 bytes。以相同builder從canonical rev12題包產生的manifest含132題、8 shard，SHA256 `6bebb138a24ea0893b58f7528d7409e410c85eecec156fa38ff5774e5cfbb0ed`。rev13數學unit15～19、自然unit21及社會unit22的7個hash與rev12逐一相同；只有自然unit20從15題變16題，且每份新shard檔的bytes與SHA均核對。[PR #165](https://github.com/huansbox/aiden-study/pull/165) 已合併為 `1fafe28aedae36e58dc4819b191b95b011f03187`；exact head `8a0478a` 的 [CI run 37173751418](https://github.com/huansbox/aiden-study/actions/runs/37173751418) 通過。獨立 integration review 的 SHA256 為 `79090b0b8c92e5841db3a9544290f2d0d55ec275f3ae53fa7ebea0ccc75c9bae`；真 rev13 配合合成進度的 loopback Chromium 驗證已涵蓋新增題、家長試玩與進度保留。正式 Pages 與 manifest 啟用已完成，隔離 E2E 與正式讀回分別記錄，不互相替代。

主題入口將新細標籤`S1b 坡度與流水侵蝕比較`對應至「地表變化與保護」；Study兩個HTML入口更新helper查詢版本。必要比較條件完整的風力比較、地表操縱變因辨識及地表實測數據表判讀仍缺，見[缺口紀錄](../data/study/g4-s1-science-exam1/fifth-batch-gap-analysis.md)。

## 正式發布與讀回

本批接續 [#160 分包交付](study-private-catalog.md)，只更新自然 unit 20 的 immutable shard，再前向更新 manifest；原 legacy rev12 單包與其他七份 shard 保留。現役 Worker 沿用 `3061c491-ff8e-44c0-9fe7-e2a8a601261b`。[Pages run 37174100118](https://github.com/huansbox/aiden-study/actions/runs/37174100118) 成功後，六個實際引用 URL 的 bytes 均與合併版本一致；其中 `science-topics.js?v=20261004-science-fifth-batch` 為 3126 bytes。

| 正式內容 | 數量／bytes | SHA256 |
| --- | --- | --- |
| rev13 manifest | 133 活動／12175 bytes | `2d4d4d93b4044f524314a3da88bfa358643666a2634e3192a84247463dc0e6a1` |
| 自然 unit 20 shard | 16 活動／12492 bytes | `76dabee7b4496acb30bc45091bc44674d85d4d7ac877595f75e47266538bbab0` |
| 保留的 legacy rev12 | 132 活動／229503 bytes | `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f` |

8 份 shards 已於 `2026-10-04T03:27:33.843Z`、`2026-10-04T03:28:55.785Z` 兩次逐份讀回一致，相隔 81.942 秒；除 unit 20 外的七份 hash 與 rev12 完全相同。manifest 啟用後兩次管理端讀回完成於 `2026-10-04T03:29:44.790Z`、`2026-10-04T03:30:49.285Z`，相隔 64.495 秒；manifest 與 legacy 兩次均符合上表，rev13 發布完成。第二輪單獨 catalog 讀回時間為 `2026-10-04T03:30:46.445Z`。

## 封存與下批重建

canonical 封存位於 `data/private/study/g4-s1-math-u1/rev13-release/`，共 416 檔（415 份 payload 加 archive manifest），payload 合計 275217033 bytes；archive manifest SHA256 為 `74bbca1388c6cf604ba56e6a03e266208f90977521c9c577cf8c7ec1b976c7a5`。這是整份封存的清單指紋，與正式題庫 `catalog/manifest.json` 的指紋不同。

統籌已獨立逐檔核對，並從 `source-code.zip` 與私人輸入還原，依 reviewed source commit `8a0478a6565dde8f0c5817d44a621ec094afaca6` 重跑 gate，仍產出同一份 133 活動來源快照（230552 bytes、SHA256 `bda159291cc97d2cb98d65b6103abcf748cd065061faf30659c686f3535bf6d8`）。核題 code／frozen source 與後續公開發布狀態分開保存；下批新增內容使用 archive 的 `catalog/source.json` 作 `--previous` 完整基線，依 `RESTORE.md` 還原，不拿 legacy rev12 當最新內容。

Dropbox 內相對路徑為 `mywork/aiden-study/study-shards-science5-2026-10-04/rev13-release/`。2026-10-04 已補齊 Windows 長路徑造成的 20 個缺檔，原有 396 檔保持不變；統籌另以唯讀 dry-run 重新核對 canonical 與本機 Dropbox 副本，檔案集合及每檔 hash 全部相同、missing 0。兩處均為 416 檔、含 manifest 共 275318241 bytes，archive manifest 指紋符合上文。這只確認本機 Dropbox 副本完整，尚未在接收端驗證跨裝置同步。

Windows 複製或還原須使用支援 extended-length paths 的工具，不能以複製程序結束代替逐檔 hash 核對；參照補充驗證目錄的 `LONG-PATH-RESTORE.md`。修復與還原證據由統籌另存 canonical `data/private/study/g4-s1-math-u1/rev13-release-verification/`，以及 Dropbox 相對 `mywork/aiden-study/study-shards-science5-2026-10-04/release-verification/`；這些是 frozen archive 外的補充資料，不更動封存清單或核題輸入。
