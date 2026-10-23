# 四上社會 U1 跨校追加（#240）

追蹤：[Issue #240](https://github.com/huansbox/aiden-study/issues/240)。本批 **46 個完整活動／84 個原作答格**已於2026-10-24正式發布rev22；另6格維持整組hold。現役全科465活動（數學68／自然217／社會180）、社會315格，共26片shards。來源核答、內容修正與最終projection、runtime及公開投影的獨立審查、隔離真包E2E、merge CI、Worker／Pages／KV正式讀回與兩份封存各自重建均已核對；正式考試範圍仍未取得。

精確來源是[前批backlog](../data/study/g4-s1-math-u1/social-unit-two-more-paper-backlog-metadata.json)中`disposition=earlier_u1_outside_batch`的90格。三卷原PDF共8頁，本次位置落在6頁；來源身分、原格定位與既有歷史投影保持。其他開放題、2格scope boundary、U2與舊題答版本衝突不混入此90格。

| 來源 | 本次完整活動 | 本次原作答格 | 整組保留原格 |
| --- | ---: | ---: | ---: |
| 深美112 | 2 | 11 | 4 |
| 建德113 | 20 | 36 | 0 |
| 建德114 | 24 | 37 | 2 |
| 合計 | 46 | 84 | 6 |

深美112的一組4格，原材料未提供足以唯一判讀的條件；不能靠選項只能用一次的額外假設補題，故完整活動保留。建德114的一組2格要求自行設計圖例，存在多種合理圖樣；不新增候選圖例或唯一答案，整組保留。90格＝84已發布＋6保留，每格都能定位到完整活動的單題、part或blank，或明確的整組hold。

## 活動與分類

U1沿用三個練習主題，依完整活動的主要概念分類；題組不拆格湊活動數。同概念不同問法持續收錄，只對完全相同的完整題目去重，不抽代表、不設題量上限。

| 練習主題 | 新活動 | 新原格 | 發布後U1活動 |
| --- | ---: | ---: | ---: |
| 地圖與位置 | 18 | 34 | 51 |
| 地形與生活 | 10 | 20 | 29 |
| 氣候與水資源 | 18 | 30 | 33 |
| 合計 | 46 | 84 | 113 |

表內原格隨完整活動的主要主題計數；原90格盤點的逐格concept axes是另一種口徑，跨概念活動不拆分。正式發布後，全科為465活動（數學68／自然217／社會180），社會315格；U1為113活動／185格，U2仍為67活動／130格。既有419活動的題文、答案、解說、IDs、原subtopics、三下內容與孩子進度契約保持；U2四主題與自然七主題不變。

建德113的配合題保留10個原選項、順序與7空，沿用既有`fill_in_blank:select`到social unit22。每空都能選完整詞庫，同一選項可重用，填齊整個活動才送出。unit22未開放文字填答、alias或完整等價答案向量；unit23原有文字與向量契約保持。Python curated／mapping／question驗證與JS parser同步，Worker直接使用同一JS parser；孩子與preview沿用既有select呈現和純判分。

作者稿與source-only獨立解題分開凍結，原稿不就地更改。來源補核所需修正另存版本並經root核定。未取得同版校方答案的活動使用`independently_solved_twice_no_official_answer`、answerPage為null；政府primary資料的事實補核不冒稱同版校方答案。原卷、題文、選項、答案、解說、PNG、作者稿、oracle與QA僅留ignored private。

共用統計仍由`family.record()`即時保存，獎勵在批末`family.finishRound()`才顯示。暫停、看回饋與切背景不當成回合完成。家長preview只讀，不保存孩子練習或活動。

## 私用重建

ignored根為`data/private/study/g4-s1-math-u1/su1-90/`。先從正式rev21唯讀封存明確copy三份完整authoring、source、manifest與24片shards至`integration/baseline/`，逐檔核SHA；當前production `build_pack()`重建baseline與原source逐byte相同。原正式封存不寫cache或pyc；Python使用既有環境並加`-B`。

`integration/prepare-inputs.py`核作者freeze與baseline指紋，將精確90格整理成不含答案的activity／part／blank定位表。`integration/build-authoring.py`只接受root已核定的selection及內容批准，把另存的白名單amendment套在整合copy，承接三份完整authoring並產生rev22 source；舊419份curated／mapping／解說逐值比對。

`integration/assemble-candidate.mjs`對新增delta呼叫production `buildCatalog()`，只新增2片unit22 shards，保留原24份descriptor及原bytes，共26片。全部逐片通過production `verifyShard`與`parse`；完整source通過前版相容及逐值比對，manifest、單unit與所選units依既有預算驗證，不重切舊shards。獨立expected的84格與候選逐格相符，expected由source-only oracle、補充核答及locator產生。

已發布內容的完整工作根仍名為`integration/rev22-candidate-v1/`，三份完整authoring在此；source／manifest／26片shards在其`catalog/`，可讀內容投影與3張原PNG在`review-projection/`。根目錄`candidate-receipt.json`列出逐shard指紋、全部production gates與runtime fingerprints。

| 已發布內容／核定輸入 | bytes | SHA256 |
| --- | ---: | --- |
| 完整source | 4141512 | `1a9d70fb9e4c300b620f8e0889c481a48793af9bc6bc1d98c4417341c1c6c2e4` |
| rev22 manifest | 43192 | `aa56845a26b1ccc835b4386c454939fccdf74e7a8e9566c975124fd804cae59d` |
| root核定selection v2 | — | `63c3b5d7dfc1a52423e0f8654928e6e2c18d8f77858d1b5e06930039a3a8b678` |
| 獨立expected | — | `99516d3a39238878045f106e65c6905f7b3f18de329f0b192eb55fcd2c970d4e` |

U1全部shards合計1484381bytes、U2合計2091464bytes，全26片合計4073245bytes；各unit與單次所選units均在既有護欄內。`delivery/release-archive-helper.py`只準備離線key計畫與archive／重建驗證，不操作正式服務。archive的production runtime從指定Git ref取精確LF blobs，每份copy都須從自身內容在外部短TEMP重建相同source／manifest／全部shards；正式雙副本與發布證據見下方收據。

必要原圖共3張，供7個新活動使用。PNG上限沿用social unit22的192KiB及雙邊1600px；每shard256KiB、單unit4MiB、單次所選units16MiB等護欄保持。原圖資訊與放大可讀性仍由獨立內容審查與真包畫面驗證，容量合格本身不代表內容核定。

公開投影只列來源身分、定位、分類、數量、核答狀態與指紋：[三卷來源](../data/study/g4-s1-math-u1/social-unit-one-more-paper-source-manifest.json)、[46活動selection](../data/study/g4-s1-math-u1/social-unit-one-more-paper-selection-metadata.json)、[90格inventory](../data/study/g4-s1-math-u1/social-unit-one-more-paper-inventory-metadata.json)、[6格整組保留](../data/study/g4-s1-math-u1/social-unit-one-more-paper-backlog-metadata.json)。歷史rev19／20／21投影不覆寫。

## 來源對帳與驗證界線

前批五卷384格的歷史發布仍為103格。rev22另處理90格：84格已發布、6格整組保留；發布後仍保留197格＝後續U3／U4的184格＋前批原題歧義4格＋scope boundary2格＋既有開放題1格＋本次整組hold6格。這是新的current reconciliation，不將前批歷史backlog281格改寫成197格。較早桃子腳三卷的49格保留另外對帳，不能混成同一來源集合。

最小runtime的合成回歸已通過：完整10選項／7空、可重用詞庫、少空不能送、逐格判分、錯答重練、進度重載、U2舊進度、lazyload與批末獎勵。unit23既有文字alias／完整向量仍通過，unit22的text／alias／vector負例被拒絕；Worker與preview共用相同契約。全repo Node **1149／1149**、Python **332通過／1項既有skip**，work catalog、math pattern report及diff檢查通過；數學保持68活動。90格新metadata對帳與完整舊419項mapping指紋檢查通過，公開投影掃描未含完整私用題文、選項payload、解說或PNG，Git未追蹤private檔案。最終projection與公開delta獨立審查及真包E2E已通過，封存收據入口見下方；以上測試數量是PR #241發布基線的結果，不冒充後續文件commit的CI結果。

真包E2E使用source-only oracle、補充核答與locator投影而成的獨立expected，不從candidate.answer製造預期。只允許loopback fake家庭／KV／DO及合成進度，不讀正式孩子session、token、Cookie或進度。Chromium的768×1024及1024×768 iPad viewport不等於實體Safari驗收。正式Worker／Pages部署、新immutable shards及manifest前向切換與讀回已由root完成，結果如下。實體iPad Safari、觸控硬體與IME未驗；原始harness失敗收據與修正說明保留，最終PASS來自完整成功階段加另存的定向補驗，不改寫原失敗證據。

## 正式發布收據

[PR #241](https://github.com/huansbox/aiden-study/pull/241)以`3b25fc084b262e6f6cb76d5d77874ad2bcadce30` squash合併；merge tree與已審查、E2E凍結head `ab2c89c629880059f0107024f3b43824a8c5c47a`完全相同。[merge test CI](https://github.com/huansbox/aiden-study/actions/runs/40007224495)及[catalog CI](https://github.com/huansbox/aiden-study/actions/runs/40007224403)成功。完整正式核對於2026-10-24 03:02:48（Asia/Taipei）完成，總收據`ops/content-release-v1/final-verification-v1.json` SHA256為`758cea4c045185797df91bf52bcc9aa46129e570160bf2f3c2a0a23997f20585`。

- Worker先部署已審bundle，version `e4fff72c-8403-478b-ab78-acba0323eb03`、deployment `255df190-be8d-4636-bb13-9f0401c698e1`，流量100%。bundle為92001 bytes、SHA256 `7c3f2920cea93faa7f15892ac28177c8b204098ede61a12102888dff29eb133c`；merge重新建置與凍結head相同。
- [Pages run](https://github.com/huansbox/aiden-study/actions/runs/40007266014)成功。實際19個不同assets、28個HTTP URLs與24個引用的raw bytes逐一等於merge Git；不是只看workflow成功。
- 兩片新immutable shards各僅一次PUT，均完成即時及至少60秒後讀回，再對manifest執行單次前向PUT至rev22；manifest即時及112.759秒後讀回皆與核定43192 bytes／SHA相同。最後固定28個內容keys（26片＋manifest＋legacy）完整核對；舊24片未寫入，逐byte保持。
- legacy rev12為229503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，未寫入。正式操作只限固定內容keys，沒有讀寫孩子session、token、Cookie或進度。

正式細項收據皆位於本批ignored根，並已收入雙副本核心封存；完整總收據內的proofs列出各項指紋：

| 證據 | 相對本批根路徑 | SHA256 |
| --- | --- | --- |
| merge／Worker bundle同一內容 | `ops/merge-runtime-proof-v1.json` | `efb7832391b237cc6967037838fa93672ab1b8a4d2497a6a0910227991a1cd32` |
| Worker正式部署 | `ops/worker-release-v1/receipt.json` | `6abf25030ecce529da6447d34ecac1030bdb31d9ab322cecda1c55a61f32f4ee` |
| Pages實際bytes／refs | `ops/pages-runtime-v1/receipt.json` | `dcbb26419deb7f426eb3da62e4c3f3831c545f6d89baa6e9a5d358bfaf7f8ea1` |
| 新shards先完成兩階段 | `ops/content-release-v1/shards-two-stage.json` | `81c0b23c95c2e626eba4179d23ab72d5dfb6e42168ec081cbabd377ab215fc07` |
| 全26片與legacy最後讀回 | `ops/content-release-v1/all-shards-and-legacy-final.json` | `49f63b42541db89971a5877d9898f1db73af8f0d916151b1be62d72ce4e56d1d` |
| 真包E2E final report | `qa/final-e2e-report-v1.json` | `0309cebde6858316a9e814c8daa0c1d8bf488e155cc66b94c745632b74d8d0c6` |
| QA凍結封印 | `qa/final-e2e-seal-v1.json` | `13df5253dae8f3dadb475cb60926625556192e2c79547024ea55005503895eb5` |

Anthropic獨立runtime／公開delta與最終內容複審無未解finding；內容先前修正另存版本，原作者稿、原審查與來源核答證據均保留：

| 審查 | 相對本批根路徑 | SHA256 |
| --- | --- | --- |
| runtime code review | `code-review/final-receipt.json` | `624cf93a463650c81d2b4a6903fb8835c5109dddc4d698719133b5d14362037f` |
| 公開metadata／文件delta review | `code-review/delta-public-v1/receipt.json` | `e2fa942ed7bf7147e483f0aa64f819607676c3f568cd7be4e33c136ab95ae042` |
| 內容審查封印 | `review/content-review-seal-v1.json` | `7b95aded99128b031e6cb4c14b6cc200ef8576ce68a6cb8dc05d036e2ffd87a2` |
| 來源補核複審封印 | `review/supplemental-review-seal-v1.json` | `15d6f966fd0b1a83622128340de9351feb0e93cee15ed7b7e15afbfec30bfb5d` |
| 修正內容delta複審 | `review/delta-f2-v1/freeze.json` | `87a28060d03754614a539dd61080959ad2a5c010f2f5ee4bf68fd23c43459cf5` |
| 最終46活動projection複審 | `review/final-projection-v1/freeze.json` | `9ba5ef3f2be596ff2ab931da460e434b211f7c26c151b10f801d61b4df6781c6` |

真包E2E在768×1024及1024×768兩個Chromium iPad viewport，各自完整驗46活動／84格孩子正答，preview每個原格獨立wrong→correct。包含完整詞庫／整批送出、錯題重練與reload、舊U1／U2進度、批末reward、三張圖2×放大／pan、preview GET-only與storage不變、cold／hot cache及快速切科。缺一片新shard時維持完整舊67活動／新0、rev22未ready，恢復retry後取得113活動。249張截圖保留，15張由agent目視核對；0外流、0pageerror，隔離server已停止。

## 可重建雙副本與接續入口

兩份核心封存已各自從自身內容複製到fresh外部TEMP，以production Python／JS builders重建出完全相同的完整source、manifest及26片shards。每份828個payload檔、203539472 bytes；`ARCHIVE-INVENTORY.json` SHA256均為`1bb5fe999a98a380284bc94eea82d64ecb6909e6d7bded51033d425a4823daa1`。核心runtime固定merge `3b25fc084b262e6f6cb76d5d77874ad2bcadce30`，核心payload已凍結。

| 副本 | 核心入口 | 各自重建收據SHA256 |
| --- | --- | --- |
| canonical，本機huan-win-01 | `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev22-release/` | `75abf4e6da97eefafecf1abfed051a46c95a70b1520b8733158b8e3426c2e06e` |
| Dropbox，相對同步根 | `mywork/aiden-study/social-u1-rev22-release-2026-10-24/` | `d459923c15e0f4a0cedfd7ca1cc31f6a5b017f328579559354cc49e70c68eb69` |

huan-win-01於2026-10-24從Dropbox設定核對實際根為`C:/Users/linshuhuan/Dropbox`。這是同機雙副本讀回與各自重建，**沒有完成跨裝置同步驗證**。總覽收據在兩份核心凍結後建立，另存canonical `data/private/study/g4-s1-math-u1/rev22-release-verification/core-archives-v1.json`與Dropbox相對根`mywork/aiden-study/social-u1-rev22-release-2026-10-24-verification/core-archives-v1.json`，兩份SHA256同為`10a2397c89e27d3b5915611901d6f1e75022773dd58d9b602e5ae27d3637b553`；活動工作根另留`root/core-archives-v1.json`，核心內沒有此晚期總覽收據。

每份核心的`private/su1-90/integration/rev22-candidate-v1/`含完整curated、explanations與mapping；其`catalog/`含完整source、manifest與26片shards。沿用其完整來源作下一批基線，不能只拿新增delta。根目錄`RESTORE.md`及`VERIFY.py`是離線核對／自身重建入口；不直接執行舊task helper。

使用既有專案Python環境，所有Python以`-B`執行，環境與TEMP放封存之外，並讓PATH使用既有Node 24.19。對每份副本分別執行：

`uv run --project D:/mywork/aiden-study --no-sync python -B <副本根>/VERIFY.py verify-archive --archive <副本根> --receipt <副本根>-verification/<新的收據檔名>.json --temp-root <外部TEMP目錄>`

收據必須另存新檔；不可向核心寫cache、pyc或後續文件。兩個各自的`-verification/` sibling保存own-rebuild收據，最終文件Git精確blobs與late proof也由root另存在這兩處，核心不因收尾文件merge而改寫。這份文件只記已完成的核心封存；後續文件PR的審查、merge、Pages／白板讀回與late proof完成狀態，仍以#240最新checkpoint為準。
