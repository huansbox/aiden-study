# 四上數學擴題路線圖

更新：2026-09-19。現況：[#59](https://github.com/huansbox/aiden-study/issues/59) 與 [#60](https://github.com/huansbox/aiden-study/issues/60) 已完成；[#101](https://github.com/huansbox/aiden-study/issues/101) 已完成 fresh review、正式發布與 canonical private archive，把家庭題包擴為五十七題 rev4，U1～U5 分布為 18／12／5／12／10。後續先依[概念／出題方法覆蓋報告](grade4-math-pattern-counts.md)核現有歷屆來源能補哪些零題或單題模式；`angle-v1` 保留為需要圖形呈現時的能力選項，不預設為下一批。原規劃基底：`88b14d55041af31a5163d0f6c2790709cd0e9514`。

## 結論與現況

四上數學接續採「歷屆題庫依概念對齊 → 小批轉成 iPad 練習」。已發布並結案的 [#59](https://github.com/huansbox/aiden-study/issues/59) 完成第一個跨章批次：新增 8 個 U1～U5 數位 activity，將同一家庭 pack 從 rev1 六題追加成 rev2 十四題，原六題保持不變。

#59 的八題正式 curation 與 fresh content review 已 PASS、零 finding：逐題解題與官方答案、machine answers、解說一致，完整上下文、選項、空格、單位與原作答目標保留；原六題 curated／explanations 與 baseline 相同。十四題 rev2 正式 pack build 為 10,277 bytes、SHA256 `5EBBD603224F9436929236ABC824043F323DA4B0DF7CC3448ABA1A9939BBBFDE`。程式作者回報 Node 277 pass、pytest 183 pass／1 個既有 missing-PDF skip，以及跨章、升版、半批、503 與草稿保留 CUA 通過。Review 採納的未知 ID reset P2 已由 `812d9069c268fbe4372a634d750b18479d5126c1` 修正；fresh code reviewer 對該 exact commit 複驗 PASS、零剩餘 finding，獨立 Node 59／59 與 production harness 12 個 lifecycle cases 全部通過，涵蓋三種實際 handler 的 batch／legacy／兩者並存、多個未知 ID 相對順序、save／reinit／finish／upgrade、完整 pack 半批與 subtopic。正式 Worker、Pages 與十四題 rev2 KV pack 均已發布，管理端 readback 與正式 build 完全一致。

今年已確認為桃子腳 115 學年度四上數學康軒版；目前尚未取得第一次定期評量的正式數學單元／頁碼範圍。U1～U4 與 U5 的公里認識、量感、換算、比較只是在校方教學進度下的優先準備範圍；M5b 公里／公尺二階單位加減仍在考試週邊界，不假稱學校已公告會考。

## 真相源與計數口徑

- 課程與跨年／跨版 mapping：[課程比較](../learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md)。舊章號只用來定位，放行與否看題目實際概念。
- B 五卷候選真相源：[question-scope-review.json](../learning-tasks/grade4-sem1-math-exam1/source/question-scope-review.json)。B 以作答欄位為「標記作答單位」，相依欄位可能屬同一數位 activity。
- C 三卷候選真相源：[supplemental-question-review.json](../learning-tasks/grade4-sem1-math-exam1/source/supplemental-question-review.json)。C 以 review item 計數，不能與 B 相加成原題數。
- 已納入 app 的公開集合與 provenance 真相源：[mapping-metadata.json](../data/study/g4-s1-math-u1/mapping-metadata.json)。正式題文、答案、解說、pack 與 QA 留在 ignored `data/private/study/g4-s1-math-u1/`。
- 現行題包契約與操作基線：[pack contract](grade4-u1-pack-contract.md)、[private build guide](grade4-u1-private-pack-build.md)、[Study integration plan](grade4-u1-study-integration-plan.md)。本頁只記擴題決策，不複製完整舊 contract。

數量必須分開報告：

| 口徑 | 現況 | 能代表什麼 |
| --- | ---: | --- |
| B 標記作答單位 | 216＝原六題 6＋#59 來源單位 9＋#60 來源單位 13＋#101 來源單位 24＋未選 164 | 原卷中已做 scope mapping 的作答欄位；相依多空可能合為一個 activity，不是 216 道可直接上線題 |
| C review items | 126＝#59 來源 item 1＋#60 來源 items 4＋#101 來源 items 7＋未選 114 | 另一種核題單位；不能與 B 相加 |
| 數位 activity | #101 rev4 共 57＝#60 rev3 30＋新增 27 | Study 題包中的 activity 數；五十七題 rev4 已正式發布 |

B 的 `core_provisional` 180 與 C 的 `core_provisional` 60 只表示概念落在暫定前五單元範圍，不表示答案已逐題驗算，也不表示可用現有 app 保真呈現。

## #59 首批：已完成

本批新增分布為 U1／U2／U3／U4／U5＝1／2／2／1／2；加上既有 U1 六題後，全包十四題的各章題數為 7／2／2／1／2。精確 practice ID、app ID、來源 ID、unit 與 adaptation 已由 [#59](https://github.com/huansbox/aiden-study/issues/59) 凍結並寫回公開 [mapping-metadata.json](../data/study/g4-s1-math-u1/mapping-metadata.json)，不在本頁維護第三份 ID 清單。

七個 B activity 對應九個 B 作答單位：其中 U2 的整十／整百規律題把 `tyk113-II-03a`／`03b`／`03c` 三格完整保留成一個三空 activity；另有一個 C activity 對應一個 review item。兩種來源口徑繼續分開。

八個 activity 只使用現有 contract 能保真表達的四選一、整數 `number`、`comparison` 與同型、順序明確的多空；不裁掉圖、直式過程、無序集合或等價表示後仍聲稱題意等效。正式轉寫、獨立重算、官方答案比對、機器答案、孩子解說、fresh content review、fresh code review 與正式發布均已完成。

## 擴題 contract

- 沿用 `packId: g4-s1-math-u1`、`study:private-pack:g4-s1-math-u1`、`c:study:g4-s1-math-u1`、`GET /v1/packs/g4-s1-math-u1`、family token 與既有 private root；pack 與 progress `schemaVersion` 都維持 1。
- U1～U5 使用全域 unit 15～19；原六題的 stable ID、作答語意、unit、subject、subtopic 與進度不變。rev1 六題仍可讀，rev2 以 append-only 加入 8 題。
- 新增或更新 normalized content 必須升 revision；同 revision 比較完整實際 ID 集合，不只比較舊六題。既有 ID 不得搬 unit／subject，內容不能降版或以舊 pack 覆蓋作 rollback。
- Public mapping row 保留既有 11 欄並新增數字 `unit`；原六題補 15，新題使用 15～19。頂層 `sourceTask`／`sourceMapping` 保留原值作為六題 legacy provenance 入口，不暗示新題來自原紙本 task。
- Builder 以核准 mapping 的完整集合驗證 curated、questions 與 explanations 精確覆蓋；`curated.question.unit` 必須與 mapping 一致。正式內容與 QA 保持 ignored；public metadata 不含題文、選項、答案、blanks 或解說。
- `multiple_choice` 仍為四選一；`fill_in_blank` 可有 1～9 個順序明確且同為 `number` 或同為 `comparison` 的空格。number 仍限 0 或 1～8 位無前導零非負整數，comparison 仍限 ASCII `<`、`>`、`=`。本批不新增 mixed input token／shape。128 KiB pack 上限與每次練習批次最多 10 題不變，不另設任意總題數上限。
- Study 以 active pack ID membership 判斷 private 題，不再以 `unit === 15` 推定。已知 private unit 缺章時保留未知進度並阻擋開始／reset；不能因 active pack 存在就把六題舊包誤認為 U2～U5 可用。
- 舊 cache 在同章只載入部分題、持久 batch 仍有未知 ID 時，只練已載入題並依原相對順序把未知 ID 保留在可見 queue 後；save／clear／reset 只更新已載入的目標題，擴包後未知項可接續，legacy queue 仍沿用既有不保證順序語意，不新增 state 欄位。
- 新 pack 只在首頁安全時點採用，作答中延後；舊 saved batch 先完成，新題進下一批。以 #59 升版為例，U1 的 2／6 變 2／7、6／6 變 6／7；已答對的舊題不重練，新增題與原未答對題正常待練。#59 新增的全新章顯示 0／2、0／2、0／1、0／2 且可開始，不誤顯示為通關。
- 題包不進 state、backup、sync payload 或 public 題庫／解說／QA report；public static 題庫仍固定 1,924 題的 ID／unit／subject 指紋。

## 後續來源與能力路線

| 115 康軒章節 | Study unit | 候選現況 | 下一批重點 |
| --- | ---: | --- | --- |
| U1 一億以內的數 | 15 | 五十七題 rev4 中有 18 個 activity；公開覆蓋報告辨識 13 種主要模式 | 先核現有歷屆來源能否補位值變化、數列等零題／單題模式；集合、直式不硬改 |
| U2 整數乘法 | 16 | 五十七題 rev4 中有 12 個 activity；公開覆蓋報告辨識 8 種主要模式 | 先核現有歷屆來源能否補估算、因數反推等孤立模式；自行列直式、三位乘數等方法另核 |
| U3 角度 | 17 | 五十七題 rev4 中有 5 個 activity、5 種主要模式；不能據此推論角圖、量角器或作圖能力完整 | 現有文字可保真題先核；需要圖形呈現時再評估 optional `angle-v1`，不是預設下一批 |
| U4 整數除法 | 18 | 五十七題 rev4 中有 12 個 activity；公開覆蓋報告辨識 8 種主要模式 | 先核商位數、餘數情境等零題／單題模式；長除法過程與要求列式的題另批 |
| U5 公里 | 19 | 五十七題 rev4 中有 10 個 activity；公開覆蓋報告辨識 5 種主要模式 | 先核單位換算與量感的零題／單題模式；M5b 等正式範圍或實際教學進度 |
| U6 三角形 | 後續凍結 | B 後續 25、C 後續 1 | 需要圖形、分類集合、全等對應與作圖能力 |
| U7 二位小數 | 後續凍結 | C 後續 6、作答格式待核 1 | 定義小數輸入、單位與等價表示 |
| U8 整數四則 | 後續凍結 | C 後續 5 | 先決定只驗結果或驗併式／括號步驟 |
| U9 分數 | 後續凍結 | C 後續 21 | 補分數／帶分數、等價判定與數線／圓圖表示 |
| U10 統計圖 | 後續凍結 | C 後續 12 | 補受限圖表載入；報讀與繪圖作答分開處理 |

B／C 的完整未選 ID、status、頁碼與 dependency／retain_context 一律回到兩份 scope JSON 查詢，不複製到本頁。各批依孩子課程進度與 app 能力選最小可保真集合；來源量多不代表答案、圖片或互動缺口已解決。

`angle-v1` 是未來需要角圖時的 optional 能力，不是 rev4 後的預設下一批：若採用，只在既有 fixed private pack 內，以固定 SVG DOM 白名單與 `textContent` 呈現靜態標註角圖，搭配既有 unit 17 `number` 填答；禁止 raw SVG／HTML／任意 URL，不新增 app、圖檔服務、作圖或互動量角器。每張圖仍須依原卷逐圖重建並由第二人 QA；目前畫布是否足夠尚未驗證，也沒有已完成的圖題。實際下一批先依覆蓋報告回查現有歷屆來源，只有現有格式不能保真承載時才排能力工作。

## 驗證與發布順序

#59 沿用現有 production `Worker.fetch`＋fake KV、Study production harness、private builder repo 外 synthetic seam、public fingerprint、backup／child／sync tests 與 isolated desktop CUA，不新增 test seam。作者測試、fresh content review 與 fresh code review 已有上述通過結果；missing-PDF skip 如實記錄，不算本批內容驗收。

#59 已依新版 Worker → 能同時讀 rev1／rev2 的新版 Pages → 十四題 rev2 expanded KV 順序完成發布，並以 verifier 與管理端 readback 核對 count、bytes、revision、SHA256。後續 revision 沿用相同原則：log 不印真題、答案、解說、family token 或孩子進度；失敗停在當階段並保留舊有效內容與進度，內容問題只以前向 revision 修正。

後續 [#60](https://github.com/huansbox/aiden-study/issues/60) 依 #59 已發布的十四題 rev2 baseline 完成 rev3 本機轉寫／核題／curation／build 與 fresh review；獨立原卷核對新十六題 16／16 通過，完整 curation 與舊十四題逐值不變，三十題 pack projection 與 production 重建的 bytes／hash 一致，validator 通過。作者測試為 Python 57、Node 28＋13，reviewer 另跑內容相關 Python 43 passed。Ignored final review JSON 為 1,873 bytes、SHA256 `B04504D8CD20FFEF054F9999622FDBEDEE255616FCA0354A47DBC6F4D8AA3AF6`；source review JSON 為 13,543 bytes、SHA256 `286AD547FD87F6AE4398BBD73A71C78A0498FF9A2B1CA79B8F84072208054E28`，只記稽核指紋、不公開 QA 內容。

Metadata release `ddfa40b90f78f4f36104a23c4d81ccb23d547903` 已 ordinary push；CI run 34915239869 與 Pages run 34915238188 均 success。這次 release 未修改 `docs/`，因此當時 legacy Pages API 的 content commit 仍為上一個實際網站內容 commit `15f82e03a106e8bdbf125ca02e75cb0c4a1a0ad1`，不冒充為 `ddfa40b`。Live index 為 SHA256 `C216CF2B4E0A946FCF8C3711C5E2F9999368CB316067FA08E14818DFB3576C7C`，private-pack loader 為 SHA256 `EF307383893DCA6E6B627639E06215A08A31C97186DB7430175FA81AFA3BB954`，均與本機檔逐 byte 相同。

三十題 rev3 build 為 20,975 bytes、SHA256 `38DFC04DB66DBDAFAA98239FAF936342F52E679FA4D0B6E84BC527A3F12AC695`。發布前建立的 rev2 binary backup 與正式 baseline 完全一致；一次 KV put 後的 immediate 與超過 60 秒 readback 都精確回傳三十題、rev3、20,975 bytes 與相同 SHA256。#60 相對 #59 未修改 runtime 或重新部署 Worker；現役 deployment `27be392d-e7d2-4cb2-9bfe-3ad44824b68e`、version `8f8a4143-bf0c-4e66-922d-99b2871ac3dd` 保持不變，只向前擴充內容。Canonical main 的四份 rev2 baseline 已先與來源逐 byte 核對，再保存 rev3 四檔、原名 QA／candidate source 與兩份 fresh review JSON；既有 rev1 baseline、W3 與 #59 review 稽核指紋不變。Private archive gates 全部通過，未公開題文或 QA 內容。

家長已接受個人小專案不再逐項補驗 #55 的細節，本計畫不重開完整真 iPad checklist。#59 的自動測試、review、isolated Worker 驗證、desktop CUA 與正式發布已有上述證據；#60 已完成 fresh review、正式 KV readback 與 private archive，但三十題未做真 iPad 實測，真機後續依實際使用問題處理。

[#101](https://github.com/huansbox/aiden-study/issues/101) 新增 27 個已核歷屆題 activity，沒有 AI 生成題；完整 pack 為五十七題 rev4，U1～U5 分布 18／12／5／12／10。兩題缺官方答案的來源明確保留 `answerPage: null`，由作者與 fresh reviewer 各自獨立解題並一致，狀態為 `independently_solved_twice_no_official_answer`；`core_provisional` 仍只表示範圍，不當答案認證。Fresh review 對 27／27 新題與 57／57 正式投影均通過，原三十題的題文、答案與解說逐值不變；完整 Python 263 passed／1 個既有 missing-PDF skip，Node 566 passed，PR [#102](https://github.com/huansbox/aiden-study/pull/102) 與 master CI run 35420767059 均通過。

五十七題 rev4 build 為 40,358 bytes、SHA256 `72D77B98221ABA497B8C50F78BAD89DFC79BCB0AC6D7A5FE39B1AAEBF59CF1A6`。發布前管理端 backup 精確回讀三十題 rev3、20,975 bytes、SHA256 `38DFC04DB66DBDAFAA98239FAF936342F52E679FA4D0B6E84BC527A3F12AC695`；唯一一次 KV put 後的 immediate 與超過 60 秒 readback 都精確回傳五十七題 rev4 及相同 bytes／SHA256。這次只前向更新 `c:study:g4-s1-math-u1`，未修改 runtime、未重新部署 Worker；現役 100% version `abf2edcc-b5bc-4abc-ae36-b09d98cbf7d5` 保持不變。Canonical private root 已先保存 rev3 exact baseline，再保存 rev4 正式檔、A／B delta、fresh review、taxonomy 稽核與 release readback；沒有把題文、答案或 QA 放進 Git。

## 明確不做

- 不宣稱正式考試範圍已公布，不把 `core_provisional`、答案卷身分或候選頁面可讀性寫成已驗答案。
- 不把目前五十七題或本批辨識的 39 種主要模式當成其餘四上數學已完成；未轉入題目、圖形／直式等能力與 U6～U10 仍依上方路線分批處理。
- 不自動建立 PDF、每章 worksheet、通用 CMS、任意圖片／HTML 通道或完整互動數學技能 app。
- 不把暫未支援的圖形、集合、直式、小數、分數與複合題永久排除。
- 不收自然、社會，不搬舊 `aiden-math` worksheets，不做 #34／#35 網域與容器搬遷。
- 不讀取家庭 token 或孩子真實雲端進度；真題與 QA 只在 ignored 本地授權核對，不公開輸出。
