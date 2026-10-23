# 四上社會 U2 既有三卷接續（#232）

追蹤：[Issue #232](https://github.com/huansbox/aiden-study/issues/232)。本批為尚未發布的 rev20 候選：新增 **13 完整活動／27 原作答格**，全科365活動（數學68／自然217／社會80），社會累計128格。現役仍為 rev19 全科352活動，不能將候選數當成已發布數。

本批先逐格覆核既有76格backlog，依115康軒第一學期課程計畫的U2「家鄉的傳統住屋與器物」判斷；正式校方考試範圍未取得。只採既有原卷，不自行補題，不因同概念重複而刪題。112收1活動／1格；113收12活動／26格；114原11格均屬其他範圍，本批0活動。餘49格為44格後續範圍、1格開放題及4格整組hold。三卷合計177格＝rev19已發布101＋本批核准候選27＋保留49。

112閱讀活動只取第二小題，保留完整閱讀材料、原大題指示、附註、來源與原三選項；另兩小題留後續。113詞庫13格以一個活動接入，保留完整材料、全部15項詞庫與原順序。紙本代號改為每格點選完整詞庫，沒有新增一次性使用限制，也沒有將13格拆成13個活動。另一個配合題保留3個原小題與共用選項，整組答齊才提交。兩張必要原PNG與母題來源完整保留；原PNG仍限social22／23，192KiB、1600px及每片256KiB限制保持。

112使用同版官方核答。113整份答卷為另一版本；即使部分題文與選項相同，本批12活動均誠實標示 `independently_solved_twice_with_semantic_official_comparison`，保留正整數answerPage。答案先由未讀校答的獨立解題建立，再由獨立source-first審查核對，不從候選答案反製oracle。原已發布來源聲明與原題不改寫。

獨立內容審查已核全部13活動／27格、詞庫、圖與解說。兩項finding修正為補回112原大題指示，以及113全批統一來源狀態；production gate另要求將詞庫解說的冗餘9字引言移除，以符合既有140字上限。root逐項差量核准，原作者凍結稿不覆寫。公開runtime已完成獨立code review，未見實質缺陷。

真包E2E以來源先行的獨立oracle驗收，兩種iPad viewport（768×1024、1024×768）各通過13活動／27格的孩子端完整作答與家長preview錯後答對；檢查原圖放大與捲動、觸控尺寸、無橫向溢出及無瀏覽器錯誤。孩子端實際完成7＋6兩批，preview只發GET，假KV的進度與活動digest前後相同；快速切換U1／自然／U2仍收斂正確。補充流程驗證詞庫題少一格不能提交、錯答後重新載入保留結果並可重練、三片shard中一片回503時不開部分題庫且恢復後可練、IndexedDB快取及10＋3批次。另以完整家庭腳本與獨立假KV驗證：7題批次第一題即達任務門檻，獎勵仍到批末才顯示，舊U1進度保留。私人報告與截圖保存在本批`qa/`及`author-114/qa-independent/recovery/`；合成資料測試不充作真包驗收。

最終gates：Node 1129／1129通過、Python 281通過／1項既有skip、工作目錄catalog `--check`與數學pattern report `--check`通過。公開投影檢查10個變更檔，對照新增題文、選項與解說的40段較長私用字串，沒有逐字命中；Git追蹤清單沒有`data/private/`。

## 私用來源與重建

本批ignored根為 `data/private/study/g4-s1-math-u1/social-u2-existing-paper-batch/`。`source-archive/`保存本批所需原卷與課程證據；`author-112-113/`、`author-114/`保存凍結作者稿與逐格盤點；`review/`保留獨立審查、核答oracle及root核准。原題、選項、答案、解說、PNG及私人QA不進Git。

`baseline/`是已實際讀回核對的rev19完整來源，使用其`catalog/source.json`為前版；不能改用legacy或只有增量的檔案。`delivery/prepare_review_packet.py`投影已核准差量，`delivery/build_rev20.py`呼叫production Python與JS builders生成`rev20-candidate/`的curated／explanations／mapping及完整`catalog/`。所有既有review packet版本bytes保持，任何內容下一版必須另存並重新綁定審查。

| 完整候選 | SHA256 |
| --- | --- |
| source | `9a01912be42a9cf6df41dfc2d0510166fcfdffae6e4422b8e3e80053e1868af0` |
| manifest | `6eee4e5b3b29921c28caf4a0414bb845a96f74ed13193b068d921a5aaf9b0179` |
| 內容審查packet v4 | `1b2b7a50fd9bebe470fb24d8fcf82a8a091f911d31b30cee33e86e57b7028eb3` |

重建守衛逐值確認舊352題、全部舊解說、curated與mapping不變；舊14份immutable shards全部保持。新增unit23為3片、623489bytes；完整manifest為17片。指紋與逐檔bytes保留於ignored `delivery/candidate-fingerprint.json`。

公開投影為[13活動selection](../data/study/g4-s1-math-u1/social-unit-two-selection-metadata.json)、[177格inventory](../data/study/g4-s1-math-u1/social-unit-two-inventory-metadata.json)及[49格backlog](../data/study/g4-s1-math-u1/social-unit-two-backlog-metadata.json)。歷史rev19三份metadata保持；目前mapping以rev20候選接續。公開只保留定位、分類、數量、來源狀態與指紋。

## 發布界線

本輪交付到E2E與可審PR；正式尚未部署，最新交接見[#232](https://github.com/huansbox/aiden-study/issues/232)。沒有讀寫正式孩子session或進度；真包驗收只使用綁定127.0.0.1的隔離fakeKV／Miniflare DO、假憑證與假家庭設定。現役Worker已由其他工作更新，本分支不得用歷史Worker覆蓋它；發布由root依最新主線、完整CI、Pages實際引用資產與現役Worker相容性另行確認。Dropbox同機副本與跨裝置讀回的完成狀態依Issue交接，不以此文件推定另一裝置已同步。
