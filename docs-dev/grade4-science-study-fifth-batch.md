# 四上自然第五批 Study 整合狀態（#162）

本批只核准明義110六上期末原卷1題，原卷為定性坡度／流水侵蝕比較，無校方答案；由作者與fresh reviewer獨立解題一致。明義109操縱變因題因原卷選項殘缺且作者初稿擅補字而排除。審查結論在精確ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/review/content-review.json`，SHA256 `313cf2bffd52eafb01d6ad594ba42a76f34e32c738ecc21cb9d3ef804a468021`；更正前五份作者輸入在同目錄`pre-fix-2026-10-04/`逐byte保存。公開來源身分與選題見[manifest](../learning-tasks/grade4-sem1-science-exam1/source/fifth-batch-manifest.json)、[selection](../data/study/g4-s1-science-exam1/fifth-batch-selection-metadata.json)。

rev12 canonical基線132題、229,503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，數學68／自然40／社會24。rev13工作樹候選133題、230,552 bytes、SHA256 `bda159291cc97d2cb98d65b6103abcf748cd065061faf30659c686f3535bf6d8`，數學68／自然41／社會24；原132題、解說、mapping逐值不變，只新增S1-P17。這是**待發布輸入**，沒有部署、寫正式KV或改孩子進度。桃子腳115正式考試範圍未取得；本題只按地表概念比對暫定核心，不能稱為嚴格控制變因或實測數據題。

可重建 gate 位於ignored `data/private/study/g4-s1-math-u1/science-fifth-batch/rebuild_rev13.py`。它核對root核准的唯一exact ID、獨立審查原始SHA、pre-fix作者稿與當前單題稿逐值相同、原卷PDF、rev12基線與候選題包SHA。`--check`只驗證，`--promote`才寫本工作樹私人輸入與公開mapping／selection；兩個模式都不碰正式服務。production builder輸出與gate候選逐byte一致。

新版catalog由production Python builder的`--catalog-dir`及Node converter各自產出後逐byte相同，保存在ignored `science-fifth-batch/rev13-python-catalog/`與`rev13-catalog/`。manifest含133題、8個unit shard，12,175 bytes、SHA256 `2d4d4d93b4044f524314a3da88bfa358643666a2634e3192a84247463dc0e6a1`；shard原文合計210,168 bytes。以相同builder從canonical rev12題包產生的manifest含132題、8 shard，SHA256 `6bebb138a24ea0893b58f7528d7409e410c85eecec156fa38ff5774e5cfbb0ed`。rev13數學unit15～19、自然unit21及社會unit22的7個hash與rev12逐一相同；只有自然unit20從15題變16題，且每份新shard檔的bytes與SHA均核對。後續仍需root整體review及隔離E2E，再決定Pages與正式KV發布。

主題入口將新細標籤`S1b 坡度與流水侵蝕比較`對應至「地表變化與保護」；Study兩個HTML入口更新helper查詢版本。必要比較條件完整的風力比較、地表操縱變因辨識及地表實測數據表判讀仍缺，見[缺口紀錄](../data/study/g4-s1-science-exam1/fifth-batch-gap-analysis.md)。
