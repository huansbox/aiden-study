# 四上自然第六批 Study 候選（#169）

本批截至 2026-10-04 凍結 4 個完整活動候選，**尚未發布**。現役 rev13 仍有 133 活動（數學 68／自然 41／社會 24）；第六批新增上線 0。若內容複核與發布均通過，rev14 預期 137 活動（數學 68／自然 45／社會 24），自然 unit 20 從 16 增至 20、unit 21 維持 25。公開逐題來源與狀態見[候選清單](../data/study/g4-s1-science-exam1/sixth-batch-candidates.json)，題卷／答案身分與 SHA256 見[來源 manifest](../learning-tasks/grade4-sem1-science-exam1/source/sixth-batch-manifest.json)，缺口與排除見[缺口紀錄](../data/study/g4-s1-science-exam1/sixth-batch-gap-analysis.md)。長期私人題包制度以 [Wiki Study-Private-Pack](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本。

新增來源是深美 114 六上期末南一官方題卷 5 頁與校方解答 5 頁，以及永安 113 三下期末出版社未證實題卷 2 頁，沒有取得永安官方解答。前批已收 9 份題卷 23 頁、答案 2 份 5 頁；本批新增 2 份題卷 7 頁、答案 1 份 5 頁，累計題卷 11 份 30 頁、校方答案 3 份 10 頁。桃子腳 115 四上正式考試範圍尚未取得，因此只按相同概念跨年級對照，原年級、學期、出版社和考次不改寫。

深美同頁配合題兩小題各自保留完整三地條件表及原三選項，分成 S1-P20、P21 兩個三選一 `multiple_choice` 活動。數位表格只把原空白首欄表頭標示為「項目」，不改資料值。永安四、勾選題 1(1)(2) 分成 S1-P22、P23 兩個 `true_false` 活動，每題都帶相同的原卷測風計三格圖及必要共用指示；原圖直接由 PDF 裁出，PNG 32,220 bytes，沒有重畫。四題都已通過作者獨立解題與 fresh reviewer 的原卷、稿件、圖像及候選包內容複核，狀態為 `reviewed_pending_release`。永安兩題只補測風計風力強弱判讀，不能稱為風蝕條件因果比較。

私人原件、作者稿、完整圖及 QA 均在 ignored `data/private/study/g4-s1-math-u1/science-sixth-batch/`。其中 `author/build-rev14-candidate.py` 可從 rev13 完整來源與凍結稿重建 `rev14-candidate/`，已經 production Python builder 及 Node catalog gate 產生完整候選 source 與 8 個 shard。候選 `catalog/source.json` SHA256 為 `6b8674d318403bc35a73bc8449fc432596aa7efaf6f771d2a3f2845b22fff5d3`、`catalog/manifest.json` SHA256 為 `e5826ae159f4a02287744d4335d09bee85fd4befa56bebcc61ae4bab1bc7f8fb`；`build-report.json` 逐值驗證舊 133 題與解說均保持不變。內容審查通過不代表已正式發布、啟用 manifest 或寫入 KV。

深美同卷另有操縱變因題，官方解答標「NO／本題送分」，未採用。深美條件表沒有侵蝕後測量值，A/B 還同時改變坡度與降雨量；不能當成單一操縱變因實驗或實測結果表。原指定缺口中的地表操縱變因與實測數據表仍待補；測風計圖像題沒有填平風蝕因果題。自然三選一僅在本批 runtime 增加最小支援，不延伸其他題型或科目。
