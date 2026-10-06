# 四上社會現有三卷完整擴量（#191）

追蹤：[Issue #191](https://github.com/huansbox/aiden-study/issues/191)。本批內容與實圖已經root核定，**尚未發布，publishedDelta為0**；正式基線仍rev18全科309活動、社會24活動／35格。

既有三卷的可用U1題目包含行政圖、路線圖、氣候圖、閱讀及完整配合題組；只收少量文字題會漏掉原卷的作答能力。本批逐頁盤點所有177原作答位置，保留同概念不同問法，新增候選43完整活動／66格；rev19候選全科352（數學68／自然217／社會67），社會101格。115康軒U1仍是教材暫定範圍，正式校方範圍未取得；三卷出版社仍unknown。

| 原卷 | 全部原格 | 既有已發布 | 本批核定新格 | 整組保留 | 後續範圍 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 112 | 58 | 10 | 14 | 0 | 34 |
| 113 | 60 | 25 | 4 | 4 | 27 |
| 114 | 59 | 0 | 48 | 0 | 11 |
| 合計 | 177 | 35 | 66 | 4 | 72 |

每個實際計分小格只計一次；詞庫選項、母題指示及空白作答表不另計。題組小格不同於活動數；66格按完整題組接入43活動，不為湊數拆掉共用材料。113 VIII四格保持整組題答版本衝突，不代改月份或裁末題。其餘72格留U2以後或其他範圍。

來源對照採逐語意、條件與原選項核查，同校同年答卷不能按題號盲套。本批既有N009／N023只更正來源聲明，保留原題、答案、原圖、解說、IDs及進度；新N036沒有對版完整標答，由兩次獨立解題核定。114全卷未取得官方答卷，來源聲明如實記錄。原rev11／rev12歷史selection與封存產物不改寫。

社會原生三選一與既有二／四選一並列，不增加干擾項。8組原圖保留原比例、完整必要標示與閱讀條件；圖說維持中立。為保留路線圖括號細字，僅social unit22 PNG上限192KiB，其他科仍32KiB；尺寸1600px、每shard256KiB、unit4MiB、操作16MiB、manifest512KiB及cache16MiB限制不變。未開table、JPEG或外部媒體。Worker與前端使用同一validator；正式操作仍須核實際runtime版本，不能沿舊版本聲明。

完整候選由production Python builder與JS catalog builder重建，舊309題及解說逐值保持；全部14shards中social unit22為6片，共1153557bytes。原legacy rev12及舊immutable shards保持；合併、發布與備份由root另核實際證據。

| 候選檔 | bytes | SHA256 |
| --- | ---: | --- |
| 完整source | 1699562 | `8e341c7afc7ab45c65671da67e81ed63062ebcf0b4d690522f92e4b834a9a6c3` |
| manifest | 32257 | `72560b9a2e932d6155dc2ff8bd449b4893178c11cc346a693a9a1f7aaa741107` |

已完成來源／答案／實圖及scoped PNG code的獨立review與root content gate。本機Node826項、Python279項（1項skip）、目錄與數學題型報告檢查及Worker bundle建置通過；數學45個patterns／68個assignments保持。最終整合review、全部43活動雙方向actual candidate QA、actual merge CI、Pages精確bytes、操作批准與讀回仍是後續交付門檻。候選不是正式發布收據，沒有正式孩子測試或進度操作。

公開僅含[43活動selection](../data/study/g4-s1-math-u1/social-existing-paper-selection-metadata.json)、[177格inventory](../data/study/g4-s1-math-u1/social-existing-paper-inventory-metadata.json)、[76格backlog](../data/study/g4-s1-math-u1/social-existing-paper-backlog-metadata.json)及[目前來源更正](../data/study/g4-s1-math-u1/social-provenance-corrections-metadata.json)；原題、選項、答案、解說、PNG及私人QA保留ignored資料。

目前完整authoring／source／manifest／14shards位於ignored `data/private/study/g4-s1-math-u1/social-existing-paper-batch/rev19-candidate/`，基線在同批`baseline/`。這是工作候選入口，尚未宣稱新封存已完成；實際恢復與雙副本收據回查Issue最新checkpoint。長期規則以[Wiki正本](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)為準；歷史見[社會首批](grade4-social-study-first-batch.md)與[第二批](grade4-social-study-second-batch.md)。
