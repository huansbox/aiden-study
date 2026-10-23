# 四上社會 U1 跨校追加（#240）

追蹤：[Issue #240](https://github.com/huansbox/aiden-study/issues/240)。本批為 **46 個完整活動／84 個原作答格**的rev22未發布候選。作者與來源核答、內容修正的獨立複審及runtime審查已通過；最終候選projection review、真包E2E、PR／CI與正式發布依issue最新checkpoint核對。正式環境維持rev21的419活動（數學68／自然217／社會134）、社會231格與24片shards，不以候選檔案存在冒充發布完成。

精確來源是[前批backlog](../data/study/g4-s1-math-u1/social-unit-two-more-paper-backlog-metadata.json)中`disposition=earlier_u1_outside_batch`的90格。三卷原PDF共8頁，本次位置落在6頁；來源身分、原格定位與既有歷史投影保持。其他開放題、2格scope boundary、U2與舊題答版本衝突不混入此90格。

| 來源 | 本次完整活動 | 本次原作答格 | 整組保留原格 |
| --- | ---: | ---: | ---: |
| 深美112 | 2 | 11 | 4 |
| 建德113 | 20 | 36 | 0 |
| 建德114 | 24 | 37 | 2 |
| 合計 | 46 | 84 | 6 |

深美112的一組4格，原材料未提供足以唯一判讀的條件；不能靠選項只能用一次的額外假設補題，故完整活動保留。建德114的一組2格要求自行設計圖例，存在多種合理圖樣；不新增候選圖例或唯一答案，整組保留。90格＝84候選＋6保留，每格都能定位到完整活動的單題、part或blank，或明確的整組hold。

## 活動與分類

U1沿用三個練習主題，依完整活動的主要概念分類；題組不拆格湊活動數。同概念不同問法持續收錄，只對完全相同的完整題目去重，不抽代表、不設題量上限。

| 練習主題 | 新活動 | 新原格 |
| --- | ---: | ---: |
| 地圖與位置 | 18 | 34 |
| 地形與生活 | 10 | 20 |
| 氣候與水資源 | 18 | 30 |
| 合計 | 46 | 84 |

表內原格隨完整活動的主要主題計數；原90格盤點的逐格concept axes是另一種口徑，跨概念活動不拆分。候選完成後，全科為465活動（數學68／自然217／社會180），社會315格；U1為113活動／185格，U2仍為67活動／130格。既有419活動的題文、答案、解說、IDs、原subtopics、三下內容與孩子進度契約保持；U2四主題與自然七主題不變。

建德113的配合題保留10個原選項、順序與7空，沿用既有`fill_in_blank:select`到social unit22。每空都能選完整詞庫，同一選項可重用，填齊整個活動才送出。unit22未開放文字填答、alias或完整等價答案向量；unit23原有文字與向量契約保持。Python curated／mapping／question驗證與JS parser同步，Worker直接使用同一JS parser；孩子與preview沿用既有select呈現和純判分。

作者稿與source-only獨立解題分開凍結，原稿不就地更改。來源補核所需修正另存版本並經root核定。未取得同版校方答案的活動使用`independently_solved_twice_no_official_answer`、answerPage為null；政府primary資料的事實補核不冒稱同版校方答案。原卷、題文、選項、答案、解說、PNG、作者稿、oracle與QA僅留ignored private。

共用統計仍由`family.record()`即時保存，獎勵在批末`family.finishRound()`才顯示。暫停、看回饋與切背景不當成回合完成。家長preview只讀，不保存孩子練習或活動。

## 私用重建

ignored根為`data/private/study/g4-s1-math-u1/su1-90/`。先從正式rev21唯讀封存明確copy三份完整authoring、source、manifest與24片shards至`integration/baseline/`，逐檔核SHA；當前production `build_pack()`重建baseline與原source逐byte相同。原正式封存不寫cache或pyc；Python使用既有環境並加`-B`。

`integration/prepare-inputs.py`核作者freeze與baseline指紋，將精確90格整理成不含答案的activity／part／blank定位表。`integration/build-authoring.py`只接受root已核定的selection及內容批准，把另存的白名單amendment套在整合copy，承接三份完整authoring並產生rev22 source；舊419份curated／mapping／解說逐值比對。

`integration/assemble-candidate.mjs`對新增delta呼叫production `buildCatalog()`，只新增2片unit22 shards，保留原24份descriptor及原bytes，共26片。全部逐片通過production `verifyShard`與`parse`；完整source通過前版相容及逐值比對，manifest、單unit與所選units依既有預算驗證，不重切舊shards。獨立expected的84格與候選逐格相符，expected由source-only oracle、補充核答及locator產生。

完整候選根為`integration/rev22-candidate-v1/`，三份完整authoring在此；source／manifest／26片shards在其`catalog/`，可讀內容投影與3張原PNG在`review-projection/`。根目錄`candidate-receipt.json`列出逐shard指紋、全部production gates與runtime fingerprints。

| 候選內容 | bytes | SHA256 |
| --- | ---: | --- |
| 完整source | 4141512 | `1a9d70fb9e4c300b620f8e0889c481a48793af9bc6bc1d98c4417341c1c6c2e4` |
| rev22 manifest | 43192 | `aa56845a26b1ccc835b4386c454939fccdf74e7a8e9566c975124fd804cae59d` |
| root核定selection v2 | — | `63c3b5d7dfc1a52423e0f8654928e6e2c18d8f77858d1b5e06930039a3a8b678` |
| 獨立expected | — | `99516d3a39238878045f106e65c6905f7b3f18de329f0b192eb55fcd2c970d4e` |

U1全部shards合計1484381bytes、U2合計2091464bytes，全26片合計4073245bytes；各unit與單次所選units均在既有護欄內。`delivery/release-archive-helper.py`只準備離線key計畫與archive／重建驗證，不操作正式服務。archive的production runtime從指定Git ref取精確LF blobs，每份copy都須從自身內容在外部短TEMP重建相同source／manifest／全部shards；正式雙副本與發布證據由root收尾後另記。

必要原圖共3張，供7個新活動使用。PNG上限沿用social unit22的192KiB及雙邊1600px；每shard256KiB、單unit4MiB、單次所選units16MiB等護欄保持。原圖資訊與放大可讀性仍由獨立內容審查與真包畫面驗證，容量合格本身不代表內容核定。

公開投影只列來源身分、定位、分類、數量、核答狀態與指紋：[三卷來源](../data/study/g4-s1-math-u1/social-unit-one-more-paper-source-manifest.json)、[46活動selection](../data/study/g4-s1-math-u1/social-unit-one-more-paper-selection-metadata.json)、[90格inventory](../data/study/g4-s1-math-u1/social-unit-one-more-paper-inventory-metadata.json)、[6格整組保留](../data/study/g4-s1-math-u1/social-unit-one-more-paper-backlog-metadata.json)。歷史rev19／20／21投影不覆寫。

## 來源對帳與驗證界線

前批五卷384格的歷史發布仍為103格。本候選另處理90格：84格進候選、6格整組保留；候選後仍保留197格＝後續U3／U4的184格＋前批原題歧義4格＋scope boundary2格＋既有開放題1格＋本次整組hold6格。這是新的current reconciliation，不將前批歷史backlog281格改寫成197格。較早桃子腳三卷的49格保留另外對帳，不能混成同一來源集合。

最小runtime的合成回歸已通過：完整10選項／7空、可重用詞庫、少空不能送、逐格判分、錯答重練、進度重載、U2舊進度、lazyload與批末獎勵。unit23既有文字alias／完整向量仍通過，unit22的text／alias／vector負例被拒絕；Worker與preview共用相同契約。全repo Node **1149／1149**、Python **332通過／1項既有skip**，work catalog、math pattern report及diff檢查通過；數學保持68活動。90格新metadata對帳與完整舊419項mapping指紋檢查通過，公開投影掃描未含完整私用題文、選項payload、解說或PNG，Git未追蹤private檔案。最終候選的獨立projection審查與真包E2E另依issue checkpoint，尚未將它們宣稱完成。

真包E2E使用source-only oracle、補充核答與locator投影而成的獨立expected，不從candidate.answer製造預期。只允許loopback fake家庭／KV／DO及合成進度，不讀正式孩子session、token、Cookie或進度。Chromium的768×1024及1024×768 iPad viewport不等於實體Safari驗收。正式Worker／Pages部署、新immutable shards及manifest前向切換與讀回由root統籌；本候選尚未執行正式發布。
