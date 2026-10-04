# 四上自然第五批 Study 整合狀態（#162）

本批只核准明義110六上期末原卷1題，原卷為定性坡度／流水侵蝕比較，無校方答案；由作者與fresh reviewer獨立解題一致。明義109操縱變因題因原卷選項殘缺且作者初稿擅補字而排除。審查結論在精確ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/review/content-review.json`，SHA256 `313cf2bffd52eafb01d6ad594ba42a76f34e32c738ecc21cb9d3ef804a468021`；更正前五份作者輸入在同目錄`pre-fix-2026-10-04/`逐byte保存。公開來源身分與選題見[manifest](../learning-tasks/grade4-sem1-science-exam1/source/fifth-batch-manifest.json)、[selection](../data/study/g4-s1-science-exam1/fifth-batch-selection-metadata.json)。

rev12 canonical基線132題、229,503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，數學68／自然40／社會24。rev13工作樹候選133題、230,552 bytes、SHA256 `bda159291cc97d2cb98d65b6103abcf748cd065061faf30659c686f3535bf6d8`，數學68／自然41／社會24；原132題、解說、mapping逐值不變，只新增S1-P17。這是**待發布輸入**，沒有部署、寫正式KV或改孩子進度。桃子腳115正式考試範圍未取得；本題只按地表概念比對暫定核心，不能稱為嚴格控制變因或實測數據題。

可重建 gate 位於ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/rebuild_rev13.py`。它核對root核准的唯一exact ID、獨立審查原始SHA、pre-fix作者稿與當前單題稿逐值相同、原卷PDF、rev12基線與候選題包SHA。`--check`只驗證，`--promote`才寫本工作樹私人輸入與公開mapping／selection；兩個模式都不碰正式服務。production builder輸出與gate候選逐byte一致後，還需root的新catalog builder產生unit shards、進行整體review及隔離E2E，再決定Pages與正式KV發布。

主題入口將新細標籤`S1b 坡度與流水侵蝕比較`對應至「地表變化與保護」；Study兩個HTML入口更新helper查詢版本。必要比較條件完整的風力比較、地表操縱變因辨識及地表實測數據表判讀仍缺，見[缺口紀錄](../data/study/g4-s1-science-exam1/fifth-batch-gap-analysis.md)。
