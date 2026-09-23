# 四上自然第二批練習選題

[#119](https://github.com/huansbox/aiden-study/issues/119) 新增 **12 個完整 activity、29 個原卷作答位置**，已完成內容覆核、Study／家長試玩畫面驗證與 revision 6 正式發布。家庭題包共 **89 題**（數學 57、自然首批 20、自然第二批 12），107,492 bytes，SHA256 `380360FA823F5083B564652C5FB1CE1E0E305BB4922DDCDBFFAD25EA1DE6A922`。**正式家庭 KV 的立即、83.6 秒後及獨立原始讀回均逐 byte 符合核准題包；實體 iPad 尚未驗收。**

[第二批選題 metadata](second-batch-selection-metadata.json) 逐 activity 記來源 ID、原印題號、頁碼、scope、概念、方法、圖表與共同材料。永安 113 連線題 4 格、魚圖 3 格，桃子腳 113 第15題 6 格，桃子腳 114 動物表 8 格，各自只算 **1 個 activity**；不能把格數當成獨立練習題數。

本批 S1 新增 1 題，S2 新增 11 題；題型為是非 5、四選一 3、整組選答 4。整組選答的 4／3／6／8 個作答位置各算一個 activity。與首批合計，正式自然題包共有 32 題：S1 11、S2 21；是非 22、四選一 6、整組選答 4。S2c 保育與環境概念從首批 0 增為 6，但不能據此推論教材概念已全面覆蓋。

桃子腳 115 四上使用康軒版；「地表的靜與動」「水生生物與環境」仍是依[課程比較](../../../learning-tasks/grade4-sem1-science-exam1/source/curriculum-comparison.md)採用的暫定核心，正式第一次定期評量範圍尚未公告。本批沒有納入待確認的地震報告、陸域棲地細目或後續的月亮／光影；水生植物成組圖等仍未轉為完整活動。永安 113 的地震報告雖有數值表，也不因本批需要表格練習而改列核心；表格判讀採桃子腳 114 範圍內完整動物表。

正式題文、選項、答案、原圖、表格內容、解說和 QA 只留在 ignored 私人資料。題包已通過 production builder／parser、舊 77 題與解說及 mapping 逐值比對、公開題庫 1,924 題不變、三種 viewport 的隔離家庭畫面與試玩不寫進度檢查；這些是本機驗證，不能代替實體 iPad 操作。

公開程式於 merge commit `06e182f5b69d8e560ca0b2c6d576c51029ba88d9` 合併，Worker version `3aaf2099-0ccc-4e2b-9201-90d119b6c946` 維持 100% 流量，Pages 資產與 Git 逐 byte 讀回一致。正式 KV 發布與獨立讀回摘要見 canonical ignored `data/private/study/g4-s1-math-u1/rev6-release/release-audit/kv-release-20260923/release-summary.json`、`release-audit/root-independent-readback/metadata.json`；重建、驗證及剩餘缺口見[第二批整合紀錄](../../../docs-dev/grade4-science-study-second-batch.md)。私人題包的 schemaVersion 1、packId `g4-s1-math-u1`、128 KiB 上限、stable IDs、家庭授權及每批最多 10 個 activity 均維持原約定。
