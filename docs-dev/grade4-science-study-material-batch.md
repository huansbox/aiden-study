# 四上自然圖文材料補題（#178）

本批從既有四卷 backlog 的 **33 個 `deferred_material` 作答格**整理出 **9 個完整活動**，已於 **2026-10-04 正式發布**，沒有新增考卷或校方答案。現役 rev16 全科 **260 活動**（數學68／自然168／社會24）、自然 **224 作答格**。獨立核答、root 內容批准 v2、正式建置、iPad 尺寸隔離驗證及 root 最終發布核准均完成；新增 shard 與 manifest 的兩階段正式讀回詳見 [#178](https://github.com/huansbox/aiden-study/issues/178)。

## 題組與來源

| 來源 | 活動 | 原卷作答格 | 呈現 |
| --- | ---: | ---: | --- |
| 桃子腳 113 第 5、6、16 題 | 3 | 18 | 兩組原圖分類、完整短文與四個核心小題 |
| 桃子腳 114 第 8、14 題 | 2 | 11 | 一組原圖分類、原照片與完整短文及三個核心小題 |
| 永安 113 VII-1 | 4 | 4 | 四個選擇活動，各保留四位同學的共同觀察紀錄表 |
| 合計 | 9 | 33 | 5 個 `grouped_choice`、4 個 `multiple_choice` |

分類題維持原共同圖像與選項池，一個題組算一個活動，介面每次只呈現一個小題。兩份植物分類題的物種、原圖與順序有差異，保留同概念的不同問法；不僅依 appId 判斷重複。永安觀察題的原件沒有動物圖，不補造圖像。

兩篇閱讀保留完整共同文章及原署名／資料來源，但只收原 backlog 中的核心小題：桃子腳 113 第 16 題收第 1～4 格，共 4／5 格；桃子腳 114 第 14 題收第 1～3 格，共 3／5 格。未收的三格仍為 `scope_needs_confirmation`，不宣稱納入完整原大題的所有小題。桃子腳 114 的閱讀題含地表與水域概念，活動歸既有水域保護主題，selection 逐格保留原來源概念。

其餘 **18 格歧義、97 格 future、23 格範圍待確認**不在本批處理範圍。正式考試範圍仍未取得；本批不宣稱補齊地表操縱變因與實測結果表的缺口。

作者凍結的公開 metadata 見 [桃子腳 113 inventory](../data/study/g4-s1-science-exam1/material-tyk113-inventory.json) 與 [桃子腳 114／永安 inventory](../data/study/g4-s1-science-exam1/material-tyk114-yap-inventory.json)；[桃子腳作者 notes](../data/study/g4-s1-science-exam1/material-tyk113-notes.md) 與 [另一作者 notes](../data/study/g4-s1-science-exam1/material-tyk114-yap-notes.md) 也保留作者交付時點快照，其中 pending／未 review 字樣不作現況判斷。最新決策與發布以本批 selection 為準。公開 metadata 不含題文、選項、答案、解說或原圖。

最新 [material selection](../data/study/g4-s1-science-exam1/material-selection-metadata.json) 狀態為 `published`；[material backlog](../data/study/g4-s1-science-exam1/material-backlog-metadata.json) 保留全四卷 353 筆來源記錄／355 作答格，其中 33 格本批已發布、必要材料待補 0 格、歧義 18 格。#175 的 selection／backlog 維持發布當時快照，不覆寫其歷史計數。

## 基線、核准與建置

ignored 工作根為 `data/private/study/g4-s1-math-u1/science-material-batch/`。`rev15-baseline/` 從 canonical `rev15-release/private/rev15-candidate/` 精確複製完整 source、curated、explanations、mapping 及八份 shard，並逐檔凍結 SHA256；未以 legacy rev12 單包代替完整上一版來源。

| rev15 固定基線 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 391,746 | `cda959295214019913a509577c527e51b2260612d4433df328c07ac44354305a` |
| manifest | 22,598 | `073b911be60bfceb910bac6de144ff6b15b381894c4af43c9b56d53df0dca13e` |

兩份 fresh review 必須逐活動記錄決策，綁定其實際讀取的 candidate-input、answer-qa 與公開 inventory 三份 SHA256。`delivery/make_content_approval.py` 另需 root 的明確內容核准記錄及兩份 review 的精確 hash，才產生本批核准；不沿用上一批批准。`delivery/build_rev16.py` 只由該集合產生正式候選，逐值守衛舊 251 題、全部解說及舊 curated／mapping 列；候選原格只能來自上述 33 格，每格只歸一個活動。

初次內容批准因三份解說超過既有字數／句數限制而停止建置，保存為 `content-approval-v1.json` 與 `explanation-limit-checkpoint.json` 的 superseded checkpoint。只精簡這三份解說，題文、答案、材料與 ID 不變；新解說再經獨立覆核後，由 root 簽發 v2，沒有放寬既有守衛。永安 VII-1-3 另有第三人從原卷獨立核答的輔證，保存在私人 review 與本輪 root 記錄。

| rev16 正式來源與分包 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 543,409 | `c8e3200f75bc0768345b61cee6a32c6e2d49e3c7b653d02b25e33e2e5b263daf` |
| manifest | 23,414 | `6db58001ae845a241fbe17116a5a2922c5febe7e3b7d275b3e3245f1a5c75766` |
| unit 21 shard | 256,402 | `ac8598bdd856ee07fe377f8aa5d51103a1f5aecc6c58473d9504fe8a406aadf1` |

實際共八份 shard，僅 unit 21 改變；unit 20 與另外六份逐 byte 不變。舊 251 題、251 份解說與 251 筆 curated／mapping 全部逐值保留；仍為既有七個自然主題。公開數學分類維持 45 patterns／68 assignments，生成報表只同步全包 revision／活動數。

未核作者稿只可透過 `delivery/prepare_draft_qa.mjs` 生成另名 `delivery/draft-unreviewed-catalog/`，不能作發布來源。PNG 留在私人 shard，單張 32 KiB、各邊 1～1600 像素與 shard 256 KiB 守衛均沿用；不外置圖片、不擴 renderer 或 schema。單元按實際內容自然分包，不硬鎖八份或兩個變動單元。

## 隔離行為與視覺驗證

九活動的家長試玩在 **768×1024／1024×768** 共完成 **18 次全量檢查**：題文、選項、圖片載入、逐 cell 觀察表一致、每次一個小題、題組切換、圖片放大／關閉與頁面無橫向溢出。18 張實際截圖均經目視核對，圖像、名稱、文章與選項可讀。

完整閱讀採自然捲讀。抵達作答區後，五個題組在兩種 viewport 共 **48 次下一小題切換**的頁面 scrollY 均保持，不強迫返回文章；root 已目視代表圖並核准維持既有呈現。沒有因文章高於 viewport 而增設互動或改動 runtime。

五種題型／材料組合另外覆蓋孩子頁錯答 → reload 接續 → 答對 → 下一批；既有數學／自然進度哨兵保持。使用 loopback、fake identity 與合成進度，不讀寫正式孩子資料；這是桌面 Chromium 的 iPad 尺寸驗證，尚非實體 iPad Safari 驗收。

原始行為證據位於 ignored `delivery/e2e/draft-unreviewed/`，包括 `report.json`、`visual-inspection.json` 與逐活動截圖，維持未核稿身分。正式候選已逐值核對 **260 題與原稿相同、257 份解說相同**；另三份精簡解說通過 fresh review，並在兩種 viewport 共 **6 次揭答與解說檢查**確認完整可見，六張截圖均實際目視。targeted 證據在 `delivery/e2e/rev16/`。`delivery/final-e2e-equivalence.json` 綁定原行為證據、三份修訂核准、targeted 行為／目視檢查、未變 runtime，以及正式 source／manifest hash，不把原 draft 結果複製成已核內容。

合併 [PR #181](https://github.com/huansbox/aiden-study/pull/181) 時，主線已包含 [#180](https://github.com/huansbox/aiden-study/pull/180) 新增的注音家長試玩入口。原 PR head `3e955388256fbd173d24d7d3855cec27bdebb227` 與實際 merge `23f1cd42d3dd802a3f2d3d03de81d9380446deab` 有13檔差異，其中 Study 僅 Preview HTML／CSS新增入口；題目內容與孩子 runtime 完全未變。以實際 merge 的成功 [CI](https://github.com/huansbox/aiden-study/actions/runs/37206258519)／[Pages](https://github.com/huansbox/aiden-study/actions/runs/37206274179) 為發布證據，19個精確公開 URL 逐 byte 對照 merge Git blob。合併版另外完成兩 viewport 共 **6 次植物圖／完整閱讀代表檢查、24 次位置不變的小題切換、6 次修訂解說揭示與2次新入口無溢出檢查**，14張截圖實際目視。補證在 `delivery/e2e/rev16/merged-runtime/` 與 `delivery/merged-runtime-proof.json`，經新的獨立 integration addendum review；原報告不覆寫，孩子行為證據依不變的完整引用資源沿用。

## 發布與再製界線

正式發布依 root 最終批准完成：新 immutable shard → 兩次讀回（收據時間間隔76.351282秒，工具計時73.375575秒）→ manifest 一次前向寫入 → 兩次讀回（收據時間間隔85.167787秒，工具計時73.180169秒）。最終 manifest 讀回時間為 **2026-10-04 13:56:49 UTC**；`ops/readback/manifest-propagated.json` SHA256為 `c4fb8219bde6e2bbbab7fe29bfd4fa195c6cb4fa4651e38eb620d82fb6c7924b`。Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 維持100%；legacy rev12／132活動／229503 bytes，SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f` 不變，孩子進度沒有改寫。本頁不是後續遠端寫入授權。

本批完整再製資料預定保存於 canonical `data/private/study/g4-s1-math-u1/rev16-release/` 與 Dropbox 相對路徑 `mywork/aiden-study/science-material-2026-10-04/`；本機 Dropbox 根目錄已於2026-10-04由設定核對為 `C:/Users/linshuhuan/Dropbox`。發布與備份批准分開：final docs 合併後，由 root 簽發 archive approval，才執行兩份副本複製、逐檔核 hash，以及各自從完整 authoring 重建 source／manifest／全部實際 shard。目前本頁只記備份目標與程序，完成狀態依 #178 的封存收據，不宣稱已執行。

恢復時先讀副本 `manifest.json` 與 `private/ops/RESTORE.md`，核對逐檔 SHA256，並以 `archive_rev16.py restore-check --commit <final-docs-merge-SHA> --archive-dir <副本根目錄>` 唯讀重建查核。通過後，下一批 `--previous` 使用副本的 `private/rev16-candidate/catalog/source.json`；不能使用 legacy rev12 或只有新題的 delta。原 draft 與 merged QA 保留各自身分與完整依據，不遞迴複製上一批 archive 鏈。收據只能證明本機 Dropbox 讀回；跨裝置同步仍須接收端另行核對。
