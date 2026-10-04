# 四上自然第六批 Study 發布（#169）

本批 4 個完整活動已隨 rev14 正式發布。現役題庫共 137 活動（數學 68／自然 45／社會 24）；自然 unit 20 從 16 增至 20、unit 21 維持 25，原 rev13 的 133 題與解說逐值不變。公開逐題來源與狀態見[選題清單](../data/study/g4-s1-science-exam1/sixth-batch-candidates.json)，題卷／答案身分與 SHA256 見[來源 manifest](../learning-tasks/grade4-sem1-science-exam1/source/sixth-batch-manifest.json)，缺口與排除見[缺口紀錄](../data/study/g4-s1-science-exam1/sixth-batch-gap-analysis.md)。長期私人題包制度以 [Wiki Study-Private-Pack](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本。

新增來源是深美 114 六上期末南一官方題卷 5 頁與校方解答 5 頁，以及永安 113 三下期末出版社未證實題卷 2 頁，沒有取得永安官方解答。前批已收 9 份題卷 23 頁、答案 2 份 5 頁；本批新增 2 份題卷 7 頁、答案 1 份 5 頁，累計題卷 11 份 30 頁、校方答案 3 份 10 頁。桃子腳 115 四上正式考試範圍尚未取得，因此只按相同概念跨年級對照，原年級、學期、出版社和考次不改寫。

深美同頁配合題兩小題各自保留完整三地條件表及原三選項，分成 S1-P20、P21 兩個三選一 `multiple_choice` 活動。數位表格只把原空白首欄表頭標示為「項目」，不改資料值。永安四、勾選題 1(1)(2) 分成 S1-P22、P23 兩個 `true_false` 活動，每題都帶相同的原卷測風計三格圖及必要共用指示；原圖直接由 PDF 裁出，PNG 32,220 bytes，沒有重畫。四題都已通過作者獨立解題與 fresh reviewer 的原卷、稿件、圖像及候選包內容複核，狀態為 `published`，`coverageApplied` 均為 true。永安兩題補上本批指定的測風計風力強弱判讀；風蝕條件因果比較屬未涵蓋的延伸題型，不計成這批未完成的第三個主要缺口。

私人原件、作者稿、完整圖及 QA 均在 ignored `data/private/study/g4-s1-math-u1/science-sixth-batch/`。其中 `author/build-rev14-candidate.py` 可從 rev13 完整來源與凍結稿重建 `rev14-candidate/`，已經 production Python builder 及 Node catalog gate 產生完整 source 與 8 個 shard。完整 `catalog/source.json` 為 321,838 bytes、SHA256 `6b8674d318403bc35a73bc8449fc432596aa7efaf6f771d2a3f2845b22fff5d3`；`build-report.json` 逐值驗證舊 133 題與解說均保持不變。

## 正式發布與讀回

[PR #173](https://github.com/huansbox/aiden-study/pull/173) 已合併為 `79bc6351beddc23c221082d86470927e5425549f`。[CI run 37177970439](https://github.com/huansbox/aiden-study/actions/runs/37177970439) 對來源 head `6166d0c` 通過，[Pages run 37178067992](https://github.com/huansbox/aiden-study/actions/runs/37178067992) 通過；Worker 版本 `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 已為 100%。新自然 unit 20 shard 先寫入，再啟用 rev14 manifest。正式讀回證據保存在 ignored `science-sixth-batch/delivery/readback/`，兩階段均核對指紋與題數，legacy rev12 單包保持不變。

| 正式內容 | 數量／bytes | SHA256 |
| --- | --- | --- |
| rev14 manifest | 137 活動／12,611 bytes | `e5826ae159f4a02287744d4335d09bee85fd4befa56bebcc61ae4bab1bc7f8fb` |
| 自然 unit 20 shard | 20 活動／102,590 bytes | `cbd0dd9112253cbb9bc0fc95b4727f7a5224d914491a40fbb74908db4a77ba32` |

新 shard 第一次讀回為 `2026-10-04T04:55:40.475951+00:00`，傳播後為 `2026-10-04T04:57:15.146002+00:00`，相隔 94.669757 秒。rev14 manifest 第一次讀回為 `2026-10-04T04:57:45.250253+00:00`，傳播後為 `2026-10-04T04:59:07.695777+00:00`，相隔 82.445245 秒；兩次均為 rev14／137 活動。新舊其他七份 shard 的內容維持不變。

可恢復封存規劃放在 canonical `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev14-release/`，其中完整來源預定為 `private/rev14-candidate/catalog/source.json`；Dropbox 相對路徑預定 `mywork/aiden-study/science6-2026-10-04/`。封存與 Dropbox 副本尚待建立、逐檔驗證，不能從本次正式讀回推定已完成。

深美同卷另有操縱變因題，官方解答標「NO／本題送分」，未採用。深美條件表沒有侵蝕後測量值，A/B 還同時改變坡度與降雨量；不能當成單一操縱變因實驗或實測結果表。地表操縱變因與實測數據表仍是後續兩個主要缺口。自然三選一僅在本批 runtime 增加最小支援，不延伸其他題型或科目。
