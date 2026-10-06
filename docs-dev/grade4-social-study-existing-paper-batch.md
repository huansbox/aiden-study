# 四上社會現有三卷完整擴量（#191）

追蹤：[Issue #191](https://github.com/huansbox/aiden-study/issues/191)。本批已於2026-10-06 16:04（臺灣時間）正式發布rev19，**新增43活動／66格**；現役全科352活動（數學68／自然217／社會67），社會101格。**本機／Dropbox雙副本尚待建立**；#191保持OPEN，追蹤4格整組hold及72格後續範圍。

既有三卷的可用U1題目包含行政圖、路線圖、氣候圖、閱讀及完整配合題組；只收少量文字題會漏掉原卷的作答能力。本批逐頁盤點所有177原作答位置，保留同概念不同問法，所有可靠U1原位置完整收錄；101格已發布（原35＋本批66），76格保留後續，沒有宣稱177格全部發布。115康軒U1仍是教材暫定範圍，正式校方範圍未取得；三卷出版社仍unknown。

| 原卷 | 全部原格 | rev18已發布 | 本批新上線 | 整組保留 | 後續範圍 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 112 | 58 | 10 | 14 | 0 | 34 |
| 113 | 60 | 25 | 4 | 4 | 27 |
| 114 | 59 | 0 | 48 | 0 | 11 |
| 合計 | 177 | 35 | 66 | 4 | 72 |

每個實際計分小格只計一次；詞庫選項、母題指示及空白作答表不另計。題組小格不同於活動數；66格按完整題組接入43活動，不為湊數拆掉共用材料。113 VIII四格保持整組題答版本衝突，不代改月份或裁末題。其餘72格留U2以後或其他範圍。

來源對照採逐語意、條件與原選項核查，同校同年答卷不能按題號盲套。本批既有N009／N023只更正來源聲明，保留原題、答案、原圖、解說、IDs及進度；新N036沒有對版完整標答，由兩次獨立解題核定。114全卷未取得官方答卷，來源聲明如實記錄。原rev11／rev12歷史selection與封存產物不改寫。

社會原生三選一與既有二／四選一並列，不增加干擾項。8組原圖保留原比例、完整必要標示與閱讀條件；圖說維持中立。為保留路線圖括號細字，僅social unit22 PNG上限192KiB，其他科仍32KiB；尺寸1600px、每shard256KiB、unit4MiB、操作16MiB、manifest512KiB及cache16MiB限制不變。未開table、JPEG或外部媒體。Worker與前端使用同一validator；已核實際新版Worker100%及Pages精確query資產bytes。

完整source由production Python builder與JS catalog builder重建，舊309題及解說逐值保持；全部14shards中social unit22為6片，共1153557bytes。原legacy rev12及舊immutable shards保持；沒有孩子session／進度讀寫。

| 正式重建檔 | bytes | SHA256 |
| --- | ---: | --- |
| 完整source | 1699562 | `8e341c7afc7ab45c65671da67e81ed63062ebcf0b4d690522f92e4b834a9a6c3` |
| manifest | 32257 | `72560b9a2e932d6155dc2ff8bd449b4893178c11cc346a693a9a1f7aaa741107` |

已完成來源／答案／實圖、scoped PNG code、最終整合及操作稿的獨立review與root逐階段核准。本機Node826項、Python279項（1項skip）、目錄與數學題型報告及Worker bundle檢查通過；數學45個patterns／68個assignments保持，自然217活動／281格不變。正式QA完成43活動×2 viewport、66格、家長preview隔離、8組實圖、完整作答及多shard缺片／重試／reload／舊ID進度守衛。沒有正式孩子測試。

| 實際發布證據 | 身分／結果 |
| --- | --- |
| 內容PR／merge（M1） | [#192](https://github.com/huansbox/aiden-study/pull/192)；`16164e530b6b8c07b148fd5172dda97da6d88fc2` |
| merge CI | [run 37431899529](https://github.com/huansbox/aiden-study/actions/runs/37431899529)，Node／Python success |
| Worker先部署 | 精確PR head `0004ca82678e5f72e0ffd8d046b963431a349860`；version `19deb315-74c9-47c6-a667-26eba035b1bc`，100%；merge後53個runtime Git blobs完全相同 |
| 實際Pages | [run 37431926179](https://github.com/huansbox/aiden-study/actions/runs/37431926179)，success，head `06a5fd8f2a81ad333e2dd1c5d6fbbea21b59adf1`；該後代只更新生成catalog的兩筆日期，53個runtime保持；20個HTML／實際引用URL bytes與該head及受審merge均相同 |
| 內容寫入／讀回 | 六個new immutable shards各PUT一次並立即GET，等待後完整GET；最後manifest一次前向切換並兩次GET。傳播前後收據間隔分別123.359秒／106.937秒，60筆內容讀回bytes／SHA一致；legacy不變 |
| 完整私人發布收據SHA | `fe3e7fc2c47266311f0c2f49a2c8a61251844d5c57a3820076e1a8d6d10c2f40` |

公開僅含[43活動selection](../data/study/g4-s1-math-u1/social-existing-paper-selection-metadata.json)、[177格inventory](../data/study/g4-s1-math-u1/social-existing-paper-inventory-metadata.json)、[76格backlog](../data/study/g4-s1-math-u1/social-existing-paper-backlog-metadata.json)及[目前來源更正](../data/study/g4-s1-math-u1/social-provenance-corrections-metadata.json)；原題、選項、答案、解說、PNG及私人QA保留ignored資料。

下一批完整基線的canonical封存入口為ignored `data/private/study/g4-s1-math-u1/rev19-release/private/social-existing-paper-batch/rev19-candidate/`：curated／explanations／mapping在此，完整source／manifest／14shards在其`catalog/`，完整rev18前版在同一封存批次的`baseline/`。**雙副本目前尚待建立**，建立前完整工作資料仍在ignored `data/private/study/g4-s1-math-u1/social-existing-paper-batch/rev19-candidate/`；正式讀回與root核准在同批`ops/`。復原應從各副本自身production snapshot、完整authoring與baseline獨立重建，不執行依賴原WT的舊phasehelper。完成後須依Issue最新checkpoint核plan、逐檔SHA與兩副本各自重建收據，不能因有預定入口就宣稱備份或另一裝置同步完成。長期規則以[Wiki正本](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)為準；歷史見[社會首批](grade4-social-study-first-batch.md)與[第二批](grade4-social-study-second-batch.md)。
