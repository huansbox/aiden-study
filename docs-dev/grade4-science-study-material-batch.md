# 四上自然圖文材料補題（#178）

本批從既有四卷 backlog 的 **33 個 `deferred_material` 作答格**整理出 **9 個已核准候選活動**，沒有新增考卷或校方答案。獨立核答、root 內容批准 v2、正式 rev16 候選建置與隔離 iPad 尺寸驗證已完成；候選全科 **260 活動**、自然 **168 活動／224 作答格**，仍待 [#178](https://github.com/huansbox/aiden-study/issues/178) 的最終發布 gate。候選不能計入已上線題數，現役基線仍為 rev15 全科 251 活動、自然 159 活動／191 作答格。

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

最新 [material selection](../data/study/g4-s1-science-exam1/material-selection-metadata.json) 狀態為 `reviewed_pending_release`；[material backlog](../data/study/g4-s1-science-exam1/material-backlog-metadata.json) 保留全四卷 353 筆來源記錄／355 作答格，其中 33 格本批已核准待發布、必要材料待補 0 格、歧義 18 格。#175 的 selection／backlog 維持發布當時快照，不覆寫其歷史計數。

## 基線、核准與建置

ignored 工作根為 `data/private/study/g4-s1-math-u1/science-material-batch/`。`rev15-baseline/` 從 canonical `rev15-release/private/rev15-candidate/` 精確複製完整 source、curated、explanations、mapping 及八份 shard，並逐檔凍結 SHA256；未以 legacy rev12 單包代替完整上一版來源。

| rev15 固定基線 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 391,746 | `cda959295214019913a509577c527e51b2260612d4433df328c07ac44354305a` |
| manifest | 22,598 | `073b911be60bfceb910bac6de144ff6b15b381894c4af43c9b56d53df0dca13e` |

兩份 fresh review 必須逐活動記錄決策，綁定其實際讀取的 candidate-input、answer-qa 與公開 inventory 三份 SHA256。`delivery/make_content_approval.py` 另需 root 的明確內容核准記錄及兩份 review 的精確 hash，才產生本批核准；不沿用上一批批准。`delivery/build_rev16.py` 只由該集合產生正式候選，逐值守衛舊 251 題、全部解說及舊 curated／mapping 列；候選原格只能來自上述 33 格，每格只歸一個活動。

初次內容批准因三份解說超過既有字數／句數限制而停止建置，保存為 `content-approval-v1.json` 與 `explanation-limit-checkpoint.json` 的 superseded checkpoint。只精簡這三份解說，題文、答案、材料與 ID 不變；新解說再經獨立覆核後，由 root 簽發 v2，沒有放寬既有守衛。永安 VII-1-3 另有第三人從原卷獨立核答的輔證，保存在私人 review 與本輪 root 記錄。

| rev16 已核准候選 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 543,409 | `c8e3200f75bc0768345b61cee6a32c6e2d49e3c7b653d02b25e33e2e5b263daf` |
| manifest | 23,414 | `6db58001ae845a241fbe17116a5a2922c5febe7e3b7d275b3e3245f1a5c75766` |
| unit 21 shard | 256,402 | `ac8598bdd856ee07fe377f8aa5d51103a1f5aecc6c58473d9504fe8a406aadf1` |

實際共八份 shard，僅 unit 21 改變；unit 20 與另外六份逐 byte 不變。舊 251 題、251 份解說與 251 筆 curated／mapping 全部逐值保留；仍為既有七個自然主題。公開數學分類維持 45 patterns／68 assignments，生成報表只同步候選全包 revision／活動數。

未核作者稿只可透過 `delivery/prepare_draft_qa.mjs` 生成另名 `delivery/draft-unreviewed-catalog/`，不能作發布來源。PNG 留在私人 shard，單張 32 KiB、各邊 1～1600 像素與 shard 256 KiB 守衛均沿用；不外置圖片、不擴 renderer 或 schema。單元按實際內容自然分包，不硬鎖八份或兩個變動單元。

## 隔離行為與視覺驗證

九活動的家長試玩在 **768×1024／1024×768** 共完成 **18 次全量檢查**：題文、選項、圖片載入、逐 cell 觀察表一致、每次一個小題、題組切換、圖片放大／關閉與頁面無橫向溢出。18 張實際截圖均經目視核對，圖像、名稱、文章與選項可讀。

完整閱讀採自然捲讀。抵達作答區後，五個題組在兩種 viewport 共 **48 次下一小題切換**的頁面 scrollY 均保持，不強迫返回文章；root 已目視代表圖並核准維持既有呈現。沒有因文章高於 viewport 而增設互動或改動 runtime。

五種題型／材料組合另外覆蓋孩子頁錯答 → reload 接續 → 答對 → 下一批；既有數學／自然進度哨兵保持。使用 loopback、fake identity 與合成進度，不讀寫正式孩子資料；這是桌面 Chromium 的 iPad 尺寸驗證，尚非實體 iPad Safari 驗收。

原始行為證據位於 ignored `delivery/e2e/draft-unreviewed/`，包括 `report.json`、`visual-inspection.json` 與逐活動截圖，維持未核稿身分。正式候選已逐值核對 **260 題與原稿相同、257 份解說相同**；另三份精簡解說通過 fresh review，並在兩種 viewport 共 **6 次揭答與解說檢查**確認完整可見，六張截圖均實際目視。targeted 證據在 `delivery/e2e/rev16/`。`delivery/final-e2e-equivalence.json` 綁定原行為證據、三份修訂核准、targeted 行為／目視檢查、未變 runtime，以及正式 source／manifest hash，不把原 draft 結果複製成已核內容。

## 發布與再製界線

正式發布仍須 root 最終批准、Git／CI／Pages 證據，以及新 immutable shards → 兩次相隔至少 60 秒的讀回 → manifest 一次前向寫入 → 兩次相隔至少 60 秒的讀回。結果不明時保留 intent，只讀回查證，不重送 manifest。legacy rev12 與現役 Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 保持；本頁本身不是新一輪遠端寫入授權。

本批完整再製資料預定保存於 canonical `data/private/study/g4-s1-math-u1/rev16-release/` 與 Dropbox 相對路徑 `mywork/aiden-study/science-material-2026-10-04/`。各副本逐檔核 hash，並各自重建完整 source、manifest 與全部實際 shard；不遞迴複製上一批 archive 鏈。跨裝置同步仍須接收端讀回確認。
