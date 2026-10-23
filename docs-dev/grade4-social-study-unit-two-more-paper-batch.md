# 四上社會 U2 跨校追加（#235）

追蹤：[Issue #235](https://github.com/huansbox/aiden-study/issues/235)。本批已於2026-10-23正式發布 rev21，新增 **54 完整活動／103 原作答格**。現役共419活動（數學68／自然217／社會134），社會231格；U2為67活動／130格。原 rev20 的365活動與17片 immutable shards 保留為發布前基線，舊活動與解說逐值保持。

來源為深美111／112／113與建德113／114共5份題卷、16頁，逐格盤點384個原作答位置。依115康軒課程概念，107格列明確U2候選；正式校方範圍仍未取得。兩個完整活動共4格因原題缺少唯一判答條件而保留待核，另2格範圍 boundary不收；不自行補條件、改選項或裁掉同組一格。其餘未選位置保持來源對帳：90格屬本批範圍外的較早U1、184格屬後續U3／U4、1格為開放題。全卷384格＝本批已發布103＋完整活動hold4＋boundary2＋其他275。

| 來源 | 新增已發布活動 | 原作答格 |
| --- | ---: | ---: |
| 建德113 | 11 | 28 |
| 建德114 | 12 | 26 |
| 深美111 | 9 | 16 |
| 深美112 | 6 | 17 |
| 深美113 | 16 | 16 |
| 合計 | 54 | 103 |

作者與來源先行的獨立解題分開凍結。深美最終核答採純PNG盲解及後續補核；較早曾讀PDF text layer的oracle只留診斷，不作最終獨立證據。沒有取得同版校方答案的活動使用`independently_solved_twice_no_official_answer`，answerPage為null。完整題文、條件、原選項順序、閱讀、圖、解說、作者稿、oracle與QA均留ignored，不進公開repo。

本批比較新活動彼此及舊365題的完整題意、全部條件、選項、parts、完整材料與原圖。另忽略不影響題意的題號、章節列舉、空白與排版標點做完整結構比對；沒有核定完全同題。56組文字相似候選逐組核對後，均為同文章不同獨立問題，或故事人物、人數、必要條件、圖標記、選項／輸入方式不同。共享閱讀、同概念或相近圖形不作為刪題依據。

## 輸入與活動界線

原無詞庫的有限國字短詞保持文字填答，只接受核定的標準詞與明確同義詞／形式後綴；採trim＋NFKC後的完整字串比較，不使用substring、fuzzy或模型評分。標準詞與alias有authoring上限，孩子輸入長度獨立設定，不按標準答案字數裁切。此接點僅限social23，既有其他學科行為保持。

七格圖代號配合保留完整活動、原圖與全部格位；依核定加入傳統左右視角的說明。未指定順序的兩空接受兩個完整合法答案向量，不能逐格各自OR而誤收重複代號。整組填齊才提交。孩子端與家長preview共用純判分接點，aliases與完整等價向量納入immutability檢查。

共用統計仍由`family.record()`即時保存，獎勵只在批末`family.finishRound()`顯示。暫停、看回饋與切背景不當成回合完成。真包驗證確認家長preview只讀，不記錄孩子練習或活動。

## 私用重建與發布指紋

ignored根為`data/private/study/g4-s1-math-u1/social-u2-more-paper-batch/`。`baseline/`唯讀保留完整rev20的三份authoring、source、manifest及17片shards；`source-archive/`與`inventory/`保存五卷完整來源及逐格盤點，作者與review原稿各自凍結。不能直接執行上一批綁舊目錄／revision／固定活動數的build或發布helper。

`integration/build-authoring-v2.py`依root核准selection追加三份完整authoring，使用production Python `build_pack()`產生完整source；舊365題、解說、curated與mapping逐值保持。`integration/assemble-rev21-candidate-v3.mjs`只對新delta呼叫現有production `buildCatalog()`產生7片，保留舊17份descriptor及其bytes，組成24片manifest；全部逐片通過production `verifyShard`與`parse`，完整source另通過`compatible(full,baseline)`，新版manifest通過前版相容與單元／選取預算檢查。沒有放寬aggregate首批六題守衛。

| 已發布內容 | SHA256 |
| --- | --- |
| 完整source | `855ba59376a8684f8fb5a09175caabb05c36178a1b3fd282724afd1a9f03a2f2` |
| 完整manifest | `00a3a888cd6f441712ff73f9e712aea1d5625a5301be73715b797ef7102e10c9` |
| selection v2 | `893fe98a7a39490406585ba54d4f4d287957aae8c06e91867e0351b992afb077` |

manifest為39656bytes，U2合計2091464bytes；每片仍限256KiB，單unit仍限4MiB。review投影只剝base64，改指向凍結PNG的path／SHA／bytes。必要原圖依裁切manifest保留來源區域；內容審查後重新擴大一張位置圖的來源上緣，使代號與指線完整，沒有縮放或重畫；共用材料另明示原文圖號與原圖標記的對應，原文及答案不改。真包E2E使用從獨立oracle逐格locator及root核定投影的expected，不從candidate.answer產生預期；只用本機隔離fakeKV／假家庭與假憑證，不讀正式孩子資料。Chromium iPad viewport驗證不等於實體Safari操作。

公開metadata只提供來源身分、定位、分類、數量、核答狀態與指紋；五卷新inventory與backlog另存，不覆歷史rev19／rev20批次紀錄。runtime、內容與真包審查完成後，已依Worker、Pages、新shards、manifest前向切換順序正式發布，讀回結果見下文。

公開對帳入口：[五卷來源](../data/study/g4-s1-math-u1/social-unit-two-more-paper-source-manifest.json)、[54活動selection](../data/study/g4-s1-math-u1/social-unit-two-more-paper-selection-metadata.json)、[384格inventory](../data/study/g4-s1-math-u1/social-unit-two-more-paper-inventory-metadata.json)、[281格保留位置](../data/study/g4-s1-math-u1/social-unit-two-more-paper-backlog-metadata.json)。完整mapping已接續正式rev21，四份metadata的publicationStatus為published；兩個完整活動共4格source ambiguity hold與另2格scope boundary仍保留。

內容複審已確認原四項finding修正；最後三筆來源敘述另如實記錄位置圖上緣附帶原卷第二題的部分作答指示一行。這次只改curated adaptation與mapping sourceAdaptation，候選v3的全部question、圖片、解說、source、manifest與expected皆與v2逐byte相同。現行三份完整authoring在`integration/authoring-v4/`，候選根為`integration/rev21-candidate-v3/`；所有舊作者稿、crop、候選、投影與收據保持。

## 已完成的候選驗證

獨立內容審查覆蓋54活動／103格，四項finding修正與最後三筆metadata更正皆已複審通過。獨立runtime code review及tests-only補強複審通過，產品code保持原受審版本；新增斷言實際檢查最近非canonical完整向量的逐格回饋，而非只檢查整題對錯。

真包E2E在Chromium的768×1024與1024×768兩種viewport，各完整走54活動／103格的孩子端與家長preview。實際驗證兩張必要PNG、7個材料活動、兩端共28次材料render、核定文字alias、完整等價向量、錯後答對／重練、少格不能提交、最近合法向量回饋、批末才顯示獎勵與舊U1 sentinel保持。家長preview只發GET，未寫孩子進度或活動；冷／熱cache、新舊分片失敗恢復、立即reload及延遲假寫入後背景reload均通過。保留40張截圖，root已核其指紋並目視確認。

完整UI執行使用凍結v2；最後v3只更正三筆authoring來源敘述，production source、manifest及24片與v2逐byte相同，以production parse／cache相容及精確bytes等同性銜接最終候選，沒有宣稱另跑一輪v3 UI。真包expected綁獨立oracle及root核定，沒有從candidate答案製造預期。只使用本機假家庭／fakeKV／Miniflare，未存取正式服務、憑證或孩子資料；Chromium viewport模擬不等於實體iPad Safari或注音IME驗收。

全repo gates已通過：Node **1136／1136**；Python **321通過、1項既有skip**；work catalog與math pattern report的`--check`通過，數學仍為68活動。公開diff／新檔已作中立欄位核對與私用payload掃描，沒有題文、選項、parts、解說或PNG payload命中；Git追蹤清單沒有`data/private/`。具體指紋與收據保存在本批`ops/`，正式CI與發布讀回另依#235。

## 正式發布與保存界線

| 發布證據 | 實際結果 |
| --- | --- |
| 程式與公開metadata | [PR #236](https://github.com/huansbox/aiden-study/pull/236) squash merge `b63df0a27ee570ff54a4096bc1e7001c0dedc1be`；[merge CI](https://github.com/huansbox/aiden-study/actions/runs/39946257854) success |
| Worker | 先部署相容新版，正式現役100% version `b5befc5f-6d37-4658-9075-7b1d9446be46`，deployment `26969abe-c153-43b9-b2cb-35c3a97498d8` |
| Pages | [run 39946290383](https://github.com/huansbox/aiden-study/actions/runs/39946290383) success；runtime ref為上述merge，23個必要資產與25個實際引用均逐byte符合Git blob |
| 私用題庫 | 7片新immutable shards與rev21 manifest各單次PUT，immediate及至少60秒後讀回全通過；完整24片、manifest與legacy共26個固定key最終逐份符合核准指紋 |
| 不變內容 | 舊17片shards只GET且bytes保持；legacy rev12只GET，SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`保持；未存取正式孩子session、進度或活動資料 |

最終讀回於2026-10-23 12:26:06 UTC完成，revision 21、419活動、24片shards及Worker 100%均通過。正式manifest為39656 bytes，SHA256 `00a3a888cd6f441712ff73f9e712aea1d5625a5301be73715b797ef7102e10c9`；完整source SHA256 `855ba59376a8684f8fb5a09175caabb05c36178a1b3fd282724afd1a9f03a2f2`。本批ignored `release-prep/rev21-v4/final-verification.json`收據SHA256為`80737b04c902b48a3876cedf8735d13855bf9849c6f360d0d840e20387d7029e`。

目前重建入口仍為本批`integration/authoring-v4/`與`integration/rev21-candidate-v3/`；名稱保留凍結時的候選路徑，內容已依上述指紋發布。本機與Dropbox新正式封存尚待建立，完成情況依[#235最新交接](https://github.com/huansbox/aiden-study/issues/235)，不把預定路徑當成已驗備份。兩種Chromium iPad viewport的E2E不等於實體Safari或注音IME驗收。
