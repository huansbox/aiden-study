# 四上 U1 接入 Study：執行計畫

日期：2026-09-12。調查基底：`ae74bc491146c64b73c6cb914bd2d3b4ceeee272`，與當時主目錄本地 master HEAD 相同（含 #54 三個尚未 push 的 commits）。統籌已於同日採納本文件的方案基線，並建立主追蹤 [#55](https://github.com/huansbox/aiden-study/issues/55)。

> 即時狀態：W1 [#56](https://github.com/huansbox/aiden-study/issues/56) 與 W2 [#57](https://github.com/huansbox/aiden-study/issues/57) 已完成，題包契約、Study 共用程式、六題 private builder 與公開追溯 metadata 已交付；W3 clean-context 整合 review 已通過且無未解 finding。Public static data 仍為原 1,924 題；六題正式 pack 只在 ignored 本機路徑。W4 真 iPad／家長驗收 pending，#55 在取得該證據前保持 open；本狀態不宣稱 #35 或 #34 已完成。

## 1. 推薦結論與交付目標

在既有 `docs/study/` 增加「三下／四上」選擇，保留原有 1,924 題與進度。四上 U1 使用新的全域數字 unit `15`，畫面顯示課本第 1 單元。先選已審題中的 **P01、P02、P03、P04、P05、P07，共 6 題**，沿用選擇、數字填空及比較輸入；不為湊滿十題開發新題型。

統籌已採納的私用接入方式：家長把本地生成的 JSON 題包送到 iPad「檔案」，再由現有 Study 的家長入口匯入，每個裝置／容器首次匯入一次。題文、答案、解說只留私用來源與裝置本機；public 網站提供共用程式、既有公開題庫與不含題文的單元定義。不新增後端、題包雲端庫或登入服務。

「離開再回來接續」沿用現有半批儲存：已答對題不再出現，未完成批次按保存的剩餘題目順序接續；未送出的輸入重新填寫。第一批六題自然形成一批，不改既有批次大小規則。

完成標準：家長在孩子實際使用的 iPad 容器匯入一次；孩子選四上 U1、完成部分題、離開並重新開啟，能繼續同一批剩餘題並完成全單元；切回三下仍見原進度，兩個範圍的挑戰、錯題與重練互不影響。程式驗證通過與真 iPad 操作通過分開記錄。

## 2. 範圍與不做

- 主軸是「歷屆題庫 → iPad 練習」；數學題型分析服務於改編紙本，獨立數學技能互動練習按需安排。
- U1「一億以內的數」已由使用者指定，不等待正式段考範圍。沿用 `learning-tasks/grade4-sem1-math-exam1/source/curriculum-comparison.md` 的概念 mapping：115 康軒候選 U1–U4 與 M5a，M5b／C11 暫掛。跨年、跨版不能直接拿章號對照；本批只取 M1a／M1b。
- 不新增紙本題目或 PDF，不重新收卷，不重審全部 14 個原卷 PDF，不重開全 `aiden-math` 整合。舊 `aiden-math` app 已匯入本 repo 的 `docs/math/`（含 `nonogram/`）；舊 worksheets／word-problems 保留來源即可。
- 不移動舊題、不重編舊 ID、不搬移 storage key、不清除舊進度、不把四上加入三下混練。不建跨教材分類 framework、完整課程管理或多解集合判題引擎。
- 不進行 #34 網域遷移。`docs-dev/platform-ipad-spike-checklist.md` 表明 #35 是該遷移的真機門檻，並不阻擋現網址的內容開發；本計畫不能宣稱桌面操作通過就等於 #35 或本批真機通過。
- 規劃階段只新增本計畫與 #55；後續 W1–W3 已依工作包完成，未讀取孩子真實雲端進度或 family token。W4 仍由家長在孩子實際使用的 iPad／容器執行，不把 desktop 證據冒充真機結果。

## 3. 現有能力與實際缺口

以下定位以檔案與 code 名稱為準，方便後續變更後仍能搜尋。

| 面向 | 已存在的能力／程式證據 | 本次缺口與影響 |
| --- | --- | --- |
| 題庫 | `docs/study/questions.json`：science 1,099、math 307、social 452、chinese 66，共 1,924 題；全域 unit 最大 14 | 三下數學是 5–9；四上不可用 `unit: 1`，那是自然既有進度的鍵 |
| 入口 | `docs/study/index.html` 的 `SUBJECTS`、`UNIT_NUM`、`renderHome` | 科目與期中／期末固定；首頁硬寫「三下」。`state.semester` 實際表示期中／期末，不是上／下學期 |
| 批次／進度 | `State.getBatch/saveBatch`、`Picker.nextBatch`、`submitAnswer`、`balancedBatchSize` | 已存 `{batch: [ids]}`、答對即記 `mastered`；不必新增整個 session 儲存模型，但需覆蓋新 unit 與題包未載入情境 |
| 錯題／回報 | `filterModeErrorBank` 依 unit 與 mode 篩選；`questionIdsFor` 排除 flagged；`renderHome` 全部錯題使用當前可見 unit 清單 | `init` 會把不在 `questionMap` 的 `errorBank/flagged` 刪除；可選題包讓「未載入」不再等於「無效題」，必須停止以缺席判刪除 |
| 同步 | `docs/shared/wiring-v1.js`、`docs/shared/sync-v1.js`、`worker/worker.mjs` | 依 child/app 同步整包進度，並非逐題聯集。無題包的裝置也可能收到四上進度，須保留；題文不能進該整包 state |
| 備份／還原 | `buildBackupText`、`parseBackup`、`_exportProgress`、`wiring.commitImport`；`tests/test_backup_pure.mjs` | 備份原始進度 JSON、還原覆蓋選定 child；可保留新增選擇欄位和 unit 15，但不會自帶裝置另存的題包 |
| 題庫 build | `scripts/build_questions.py` 的固定來源、`MATH_UNITS`、`build_merged`、`to_final_schema` | 直接放 unit 15 會被數學 5–9 篩掉；重建亦不保留任意新增區塊。`unique_id` 碰撞後依順序加尾碼，不適合新題包 stable ID |
| 解說 build | `scripts/build_explanations.py` 的 `expected_explanation_ids`、`validate_entries`、`build_report` | math 要完整解說覆蓋；public 題庫一旦加四上就新增必填 ID。`main` 的數學抽查報告含完整題文／答案，不能讓私用新題流入預設輸出 |
| 題型 | `validate_blanks`、`validate_vertical_calc`；前端 `bindFillEvents`、`isBlankCorrect`、`vcAddSubLayout` | 數字鍵盤最多 8 字元；text 最多 10 字元且只做字串正規化，沒有集合等價；加減直式只填結果各位，不保存進退位筆跡 |
| 未信任文字 | `renderQuiz` 等處將題文、選項組進 `innerHTML` | 引入本機檔案後必須驗證 schema，對新輸入走安全文字 rendering；不能把「本機 JSON」當成可直接插入的 HTML |

另有 `docs/study/manifest.json` 的名稱仍為「三下練習」，應在入口調整工作包改成中性「課業練習」；不藉此變動 `start_url`、身分處理或容器架構。

## 4. 最小資料與相容方案

### 4.1 年級、學期、顯示單元

保留數字型 `q.unit` 與所有舊值。在 `index.html` 增加小型 `STUDY_TERMS` 定義：

- `g3-s2`：`grade: 3`、`term: 2`、label「三下」，subjects 指向現有 `SUBJECTS`，其中所有 unit 與 `mid/final` 原樣保留。
- `g4-s1`：`grade: 4`、`term: 1`、label「四上」，目前只有 math；U1 為 `{id: 15, num: 1, name: "第 1 單元：一億以內的數"}`，不替其他章節預分號。
- 四上只有一組單元，group key 可沿用 `final` 以相容既有操作，但隱藏期中／期末切換，畫面只呈現「四上數學」。它是內部篩選鍵，不表示 U1 屬於期末考範圍。
- 新增 `state.studyTerm`；缺省讀作 `g3-s2`。保留 `state.semester` 的原意與值，不做改名遷移。科目在切換後不可用時選該學期第一個有效科目，切換本身不重置任何進度。
- `UNIT_NUM` 與其他 unit 索引從兩個學期的定義建立；錯題範圍、重練與計數一律用當前選擇得到的 unit IDs。不要透過題號字首判斷年級。

這將「第幾單元」拆成儲存用的全域編號與孩子看到的課本編號，維持 `Number()`、嚴格數字比較、複合 challenge key 和舊 backfill 的既有契約。相較全面改成字串複合 unit key，改動面較小；代價是新增單元時要人工登記一個未用過的數字。用測試檢查全域唯一即可，不做號碼配置服務。

### 4.2 題目 stable ID 與來源追溯

新題固定使用 `math-g4s1-<original_id>-v1`，例如 `math-g4s1-tyk111-I-01-v1`。ID 寫入 curated metadata 後固定，不依排序、題包版本、顯示題號、目前學年度或 build 次數重算；碰撞直接報錯，不加 `-2` 迴避。新題沿用 `subject: "math"`、`unit: 15`，沒有需要把 grade/term 重複塞進每題進度的理由。

`v1` 指作答語意版本。同一 stable ID 的 `type`、`text`、`options`、`answer`，以及每格 `blanks.input`／`blanks.answer` 必須逐值完全相同，連空白差異也視為不同；revision 提高不能放寬這項比較。只有 `source`、`subtopic` 與 `explanations` 可以在較高 revision 更新。題目 wording、排版文字、數字、選項或判題語意只要改變上述欄位，就不能覆蓋同 ID；須由統籌決定另立語意版本 ID 或其他 version strategy，避免把舊 mastered 偷渡到不同題。不同包出現同 ID 時亦適用相同規則，不允許後匯入者靜默覆蓋。

公開 metadata 只列：app ID、practice ID、original ID、paper ID、題目／答案頁碼、concept、題型轉換、review 狀態。完整題文、答案及解說只在私用題包；不得從 metadata 或 ID 反推題文填補。

### 4.3 私用題包載入與公開邊界

最小包格式為 `schemaVersion`、固定 `packId: "g4-s1-math-u1"`、`revision`、`questions`、`explanations`。題目採現有 final question schema，解說採 `{questionId: text}`。包只接受已定義的 math／unit 15 與本批已支援的題型；不提供任意科目、HTML、圖片 URL 或程式碼載入。

生成器使用明確輸入／輸出路徑。私用 curated 輸入、解說、pack 與 QA 統一放在 `data/private/study/g4-s1-math-u1/`；repo `.gitignore` 已有精確的 `/data/private/study/g4-s1-math-u1/` 規則，builder 只允許 production 輸出到該 private root。公開且不含題文／答案的追溯 metadata 位於 `data/study/g4-s1-math-u1/mapping-metadata.json`；generic 生成器位於 `scripts/build_private_study_pack.py`，操作說明位於 `docs-dev/grade4-u1-private-pack-build.md`。W1／W2 已建立這些路徑，private files 仍不得由 Git 追蹤。

原 #54 的 `learning-tasks/grade4-math-first-practice/source/private/practice-content.json` 僅作只讀來源與追溯依據；數位版整理後的輸入和產物不回寫紙本 task。紙本 task 維持已完成，不新增 learning-task；app 程式、可重建資料與一次性活動各歸原有位置。生成器及不含私用內容的 metadata 可版本控制，curated 題文、答案、解說和題包本身不可。

前端家長入口使用檔案選擇器，讀取檔案後先做大小與 schema 驗證、唯一 ID、unit 隔離、答案與題型一致性、解說完整性，再一次寫入獨立 localStorage key，例如 `study:private-pack:g4-s1-math-u1`。小批文字題包使用 localStorage 足夠，暫不引入 IndexedDB。可設 128 KiB 明確上限；寫入失敗須告知「未保存」，保留前一有效包，不顯示匯入成功或承諾下次可接續。

題包 key 屬同裝置、同 origin／容器，供該容器內兩個孩子共用題目內容；進度仍各依 child 分開。題包不含孩子身分，不隨切換孩子重寫。boot 先讀並驗證本機包、合併公開題庫與解說，再建立 `questionMap`。重匯同包應冪等；只有 revision 提高、且同 ID 的 `type/text/options/answer/blanks` 逐值完全一致時，才替換舊包。未知 schema 或同 ID 語意欄位有任何差異時拒收，保留原包和進度。

實作須為匯入文字定義安全輸出路徑：純文字先 escape，再加入程式生成的換行與填空 chip；同樣涵蓋選項、解說與回報題目區。不能只驗 JSON 外形，或只擋 `<script>`。測試用合成特殊字串驗證，public fixtures 不抄私用題。

**不把題包加入 `state`、進度備份、同步 request、public `questions.json`、public `explanations.json`、`data/exp_results/batch_*.json` 或公開抽查報告。** 現有公開題庫不因本計畫被宣告已取得新來源的再授權；#54 已核准的私用邊界繼續適用。沒有公開上架權利不阻擋本地轉換與家長匯入。

實際使用與備份取捨：

1. 家長以自行選擇的私用傳檔方式把題包放到 iPad「檔案」，在孩子慣用的 Study 容器匯入一次。不能把不同 Safari／主畫面容器當成一定共用 localStorage。
2. 網站更新後，該容器保留題包就不必再匯入；清除網站資料、換裝置或容器後需要重匯。保留原始題包檔即為內容備份，不另造內容雲端備份。
3. 「匯出進度」仍只有進度；換機需「匯入題包」與「還原／同步進度」兩件事，家長介面應清楚交代。缺包時顯示「尚未匯入本機題包」，不能顯示進度歸零。
4. 儲存題包不等於完整離線 app。現有 boot 仍 fetch 公開題庫與其他資源，本計畫不新增 Service Worker；離線冷啟動不列交付承諾。已開頁斷網時作答能否保存，仍需單獨驗證。

### 4.4 進度與舊版本邊界

保持 `WIRING_CONFIG.appId = "study"`、schemaVersion `1`、`study:progress:<child>`、`study:sync:<child>`、legacy key／哥哥歸屬不變。新增選擇欄位與新數字 unit 不改變進度 shape；不為此 bump schema 或遷移全部資料。

必要修正是取消 `init` 以 `questionMap` 缺席刪除 `errorBank/flagged` 的行為；讀取和顯示可以排除當前不可用 ID，但持久資料保留。對 `shouldKeepModeError` 的整理亦要驗證不因題包缺席移除該題紀錄。`Storage.saveQuiet` 只是不立刻推雲，不能解決下次一般 save 將清理後整包上傳的問題。

`mastered`、`challenge`、`stats` 的未知題紀錄也保持原樣；缺包時不呼叫該單元的 `startQuiz`、reset 或 completion 計算來覆寫批次。重新載入題包後再用相同 ID 恢復顯示。匯入／同步先於題包或後於題包都要成立。

當前 sync 是整包 LWW／衝突選擇，不提供兩台同時練習的逐題合併；跨機需各自匯入包並沿用原同步規則。更新版 app 可以保留未載入包的紀錄；更新前已開著的舊版 app 仍可能執行舊清理。第一次寫入四上進度前，家長應把其他使用中的 Study 頁面重新載入到更新版；不承諾任何舊版常駐分頁都向前相容，也不在本批擴作同步協定改版。

## 5. 逐題接入判斷

已讀公開 mapping、獨立驗收與本地私用 JSON 的結構、輸入長度與表示形式。沿用已完成的官方答案核對成果；規劃階段沒有重新視讀原卷 PDF 或重做十題答案驗算，不能宣稱完成數位版內容驗收。

來源真相：`learning-tasks/grade4-math-first-practice/source/mapping-metadata.json`、`source/acceptance-review.md`；完整輸入是同 task 的 ignored `source/private/practice-content.json`。原卷來源、下載連結、概念 mapping 沿用前一 task 的 `source/manifest.json`、`source/supplemental-manifest.json`、`source/question-scope-review.json` 與 `source/supplemental-question-review.json`。下表不含題文與答案。

| Practice ID | 原題 ID；題／答頁 | 現有能力與數位轉換 | 建議 |
| --- | --- | --- | --- |
| U1-P01 | tyk111-I-01；1／1 | `multiple_choice`，保留完整四選項；紙本圈選改為按鈕，答案由核准選項轉成既有 1-based 字串 | 首批 |
| U1-P02 | tyk113-II-11a；2／2 | 一格 `number`；答案正規化成不含千分位的純數字，八位在現有 8 字元鍵盤內。保留阿拉伯數字要求 | 首批 |
| U1-P03 | tyk113-II-11d；2／2 | 一格 `number`；八位數可輸入，保留所有位值數量和阿拉伯數字要求 | 首批 |
| U1-P04 | tyk111-II-02；1／1 | 一格 `number`；保留「替換數字後增加多少」語意，不誤寫成交換位數 | 首批 |
| U1-P05 | tyk111-IV-01；2／2 | 一格 `comparison`；題幹保留兩側數量，用全形數字 chip 標記輸入位置，答案存 ASCII 比較符號 | 首批 |
| U1-P06 | tyk113-II-01；1／1 | 要列出全部可填數字。現有 text 只做全半形／空白正規化，不能判順序不同但等價的集合；多空也按位置比，不是集合 | 暫緩；不把答案塞 text 或 number，不為首批造多選／集合判題 |
| U1-P07 | anh114-II-08；2／2 | 一格 `number`；完整四項數列保留，本題只有一個缺項，不需多空新功能，也不依賴上一題情境 | 首批 |
| U1-P08 | tyk111-III-03；1／1 | `add_decimal` 實際可接受整數，但原題含「萬」表示；須先把表示轉換成明確數值，現有 grid 只顯示數字與結果位，未表達萬的混合單位或自行列式 | 需轉型後再收；首批暫不收，不宣稱原紙本直式要求已完整支援 |
| U1-P09 | tyk113-III-05；2／2 | `sub_decimal`／`vcAddSubLayout` 可算八位整數減法，約 9 欄、48 px 格與間距；只讓孩子逐位填答案，不讓孩子自行排直式與退位記號 | 需轉為「看既有直式填結果」才收；先暫緩，另驗 iPad 寬度與教學目的 |
| U1-P10 | anh114-II-16；2／2 | 可還原原填空目標為一格 `number`，題幹固定「多少萬顆」及比較方向；紙本新增列式要求無法由此自動驗收 | 次批候選；明載只驗最後數量，解說提供列式；不混稱為已驗算列式過程 |

現有多空格支援逐格 `number/comparison/code/text`、全格皆對才算對，題幹 chip 現限全形 1–9。它能支援順序明確的多項答案，不能自然支援 P06 的無序解集。數字鍵盤沒有負號、逗號或「萬」，不能把混合單位答案原樣送進 `number`；單元未來如需九位端點答案，須另做輸入限制變更，本批沒有因此放寬。

數位內容驗收需要逐項核對：顯示題文所需上下文、官方答案位置、mapping 的 adaptation、最終機器答案、孩子看到的解說。不可直接把私用 `answer` 說明字串放進 `blanks.answer`；部分含千分位、單位、解釋或等值表示，必須人工整理並驗算轉換。排序改變後仍能由 stable ID 追到 practice／original／PDF 頁碼。

## 6. 接續的精確行為與驗收例

`submitAnswer` 在按確認時更新 stats；full 模式答對加入 mastered、答錯排回 queue 尾端，並保存剩餘 batch。累計答錯達既有條件才入 errorBank，不改成答錯一次就入庫。`Picker.nextBatch` 讀 saved batch，剔除已 mastered、flagged 或不可用題，保存仍有效題的原順序。

本次承諾：在可持久儲存的同一容器，送出前面的作答後離開，回到首頁再按 U1 即接續剩餘題。若最後一題答對並送出，即使尚未看完回饋便離開，仍保留完成；最後一題答錯則依保存順序留待重試。

不承諾保存 `_fillValues`、直式 runtime、當前 feedback 畫面、卷面筆跡或 `quiz.answered`；這些現在僅在記憶體。恢復後 `quiz.batchIds` 是剩餘題，批次進度條／本輪統計可能重新以剩餘題為分母；整單元已答對數維持。錯題模式只保留錯題集合，重開會重新 shuffle，不承諾該模式逐題順序。

主要驗收例：用合成三下紀錄與六題四上包，先答對兩題、答錯一題後退出；重新載入後單元為已答對 2／6，剩餘 queue 與送出後保存的次序一致，已答對兩題不再抽出。完成其餘四題後為 6／6；切三下 unit 5–9 的 mastered、challenge、stats、errorBank、flagged 全部與測試前一致。未送出的數字重開為空是預期行為。

儲存遭封鎖／quota 不足時不可承諾可接續。既有 `wiring.safeSet` 會回 false；題包入口與本次進度保存路徑應呈現足以讓家長知道無法保存的結果，不用「完成」掩蓋寫入失敗。驗證不需真實孩子資料。

## 7. 建置與測試接縫

### 建置策略

保留 `build_questions.py` 的 public 預設流程，不把 unit 15 加到舊數學 5–9 的來源清單；它仍完整重建三下 307 題。新增一支小型私用題包生成器，重用 `data_helpers.validate_blanks`、既有文字清理與 `build_explanations.validate_entries/merge_entries`；新 curated 資料直接帶明確 stable ID，不走 `to_final_schema` 的自動尾碼機制。避免複製整份舊 builder。

新生成器只收這個已確認題包，從私用 curated 輸入生成 questions 與 explanations，使用新題 ID 集合要求完整覆蓋，驗證成功才寫私用輸出。缺題、重複、無解說、空解說、越界 unit、未支援題型或無效答案皆失敗，不靜默跳題變成一個看似成功的殘缺包。舊 public 解說流程保持自然期末／數學完整、社會漸進的規則。

### Meaningful testing seam

| 驗證層 | 測試資料與觀察結果 | 現有位置／建議新增範圍 |
| --- | --- | --- |
| Public build 回歸 | 固定既有題庫的 ID／unit／subject 與各科題數；加入私用生成流程前後完全一致；私用輸出路徑不得落在 docs 或 public report | `tests/test_build_questions.py`、`tests/test_build_explanations.py`；臨時目錄跑生成器，不在測試中覆寫正式產物 |
| 私用 build | 合成選擇、八位填空、比較題；穩定 ID 在重排、重建後不變，碰撞失敗；每題解說剛好一份；錯誤輸入不寫出 | 新 pack builder 測試，重用現有 validator；真題核對只在 ignored 本地報告 |
| 年級隔離 | 同時有舊 unit 1、5–9 與新 unit 15，切換後抽題與全部錯題只有當前範圍；重練 unit 15 不改舊進度 | 依現有 `<...-pure>` sentinel 測試慣例，將範圍解析、包驗證與半批挑選抽出最小純函式；不為測試重寫整個 app |
| 半批進度 | 用可控制順序的合成 queue，執行 save→重新 init→resume；測答對、錯題回隊、skip、最後一題答對後關頁仍完成，以及最後一題答錯後關頁仍待重試 | 新 Study 行為測試；測實際 State／Picker 邊界，不能只 assert 寫進去的 JSON 相等 |
| 題包缺席 | 有新舊進度但未載入包，boot、改科目、一般 save、export 後未知 ID 原樣存在；重新匯包恢復計數與批次 | 覆蓋 `init` 清理與 `Storage.saveQuiet` 後續 save；特別測 errorBank／flagged |
| 匯入安全與保存 | 壞 JSON、超限、同 ID 異題、未知 version、script-like 字串、quota 失敗皆不破壞原包或原進度；重匯相同包不歸零 | 純 validator＋storage failure fake；DOM 層確認字串只是文字、不觸發 HTML／網路 |
| 備份與同步 | 舊 backup 無 studyTerm 仍進三下；新舊進度 round-trip；兩個 child 隔離；同步 payload 只有進度，無題包內容；缺包裝置 adopt→一般 save 不遺失四上 ID | `tests/test_backup_pure.mjs`、`test_child_store.mjs`、`test_wiring_pure.mjs`、`test_wiring_effects.mjs`、`test_sync_contract.mjs`；使用 fake KV／storage，不連孩子帳戶 |
| 輸入／顯示 | 八位數可完整輸入與送出，比較符號可點、文字與 chip 不重疊，離開重入恢復正確剩餘題 | 桌面瀏覽器 viewport 預檢與下方真 iPad 清單，結果分列 |

保留既有 schemaVersion pin；新欄位的相容性用 round-trip／adopt 行為證明。沿用 `.github/workflows/test.yml` 的 `uv run pytest` 與 `node --test tests/*.mjs`；先跑上述受影響測試，整合完成再跑兩套完整 CI 指令。依 repo Python 規範用 uv；原卷 PDF 不在 worktree 的 extraction regression skip 如實記錄，不能算本批內容已驗收。

### 真 iPad 最終驗收

使用測試 child、本機合成進度與經私用轉換核對的題包，先完成 UI 流程；不讓工人讀取孩子 token 或雲端真實進度。家長在自己實際使用容器的最終確認由統籌安排。

- 「檔案」選取 JSON、匯入成功、重開後題包仍在；iPadOS 版本、Safari／主畫面容器與方向記錄清楚。
- 四上 U1 與三下選擇清楚；首批六題題文、八位輸入、比較按鈕、確認與離開按鈕可操作且不被鍵盤遮住。
- 作答中回 hub／切背景／關閉再重開，同容器已提交進度和半批成立；未提交輸入清空符合上述定義。
- 三下原測試紀錄未改；切另一 child 不讀到前一 child 的四上進度。
- 匯出進度不含題文；在另一測試容器先還原進度而未匯題包時出現缺包提示，匯入相同題包後進度恢復。
- 網路失敗、本機不能保存的提示可理解；不把斷網後頁面仍開著的結果寫成完整離線冷啟動驗收。

此清單驗收本次 Study 內容與接續，並不自動關閉 #35；#35 的跨容器與網域前提仍由原檢查表判定。

## 8. 可順序指派的工作包

推薦 **multi-session**：範圍本身不需大型 framework，但跨了 public／private 邊界、持久進度與真機操作；把功能和私用內容驗收拆開，讓每一步都有可復原的提交與明確結果。不是先建立一整批課程才試用。

| 工作包 | 輸入／依賴 | 可交付範圍與完成門檻 | 建議工人 model／思考強度 |
| --- | --- | --- | --- |
| W0 統籌定案（已完成） | 本計畫 | 已採納每裝置／容器首次匯入一次私用題包、六題首批、unit 15、現有半批接續與舊 key 不變，並建立主追蹤 #55 | 統籌，gpt-6-astra／high |
| W1 Study 入口、題包與進度相容（已完成） | W0；[#56](https://github.com/huansbox/aiden-study/issues/56) | 已交付 STUDY_TERMS、unit 15、studyTerm fallback、家長檔案匯入、獨立本機題包、安全文字顯示、缺包不刪進度與保存失敗處理；合成題包流程、半批接續及三下隔離已驗證 | gpt-6-astra／high；多處狀態交界需完整推理 |
| W2 六題私用轉換與 build（已完成） | W1 凍結包契約；[#57](https://github.com/huansbox/aiden-study/issues/57) | 已交付 private builder、public 追溯 metadata、精確 ignore 的 curated／六題 pack／解說／QA；六題獨立重算一致，public 內容無差異，重建冪等且 production 輸出受 private root 限制 | gpt-5.6-sol／high；需精確數值與來源核對 |
| W3 獨立整合審查與桌面驗證（已完成） | W1、W2 | Clean-context review 已通過，無未解 finding；完整 Node／pytest、六題語意、舊進度隔離、缺包再載入、payload 邊界、desktop 真 DOM 與原生 file chooser 均有證據 | gpt-6-astra／high |
| W4 真 iPad 與家長交付（pending） | W3 已通過；共用程式發布與 private 傳檔 | 在孩子實際使用的 iPad／容器完成首次匯入、部分作答後接續及三下隔離，記錄通過或具體阻擋；驗收後才決定下一批／下一章 | 統籌或操作工人 gpt-5.6-sol／medium，家長提供真機操作結果 |

W1 已用合成題包驗證答對、答錯回隊、關閉／重載接續與三下欄位不變；W3 再以正式六題 pack 驗證多題半批、最後一題答對／答錯立即重載及缺包恢復。這些 desktop 證據不取代 W4 真 iPad。

各工人使用獨立工作 branch／worktree，且未 reset 主目錄。W1 與 W2 已按凍結契約完成；W3 使用獨立上下文審查，採納的 finding 回到原工作包修正並通過相關複驗。現在只剩 W4 依表中 gate 等待家長真機操作。

後續完成第一輪孩子實測，才考慮 P10、經目標調整的 P08／P09 或下一章。P06 只有真實練習需求證明值得做集合判題時才重開。正式考試範圍到手後處理 M5b／C11，不回頭阻擋已確認 U1。

## 9. 統籌已採納決策與文件／tracker 驗證

統籌已在使用者授權的決策範圍內採納：**以「家長本機檔案匯入＋同容器 localStorage 保存私用題包」作為第一批送達方式，每裝置／容器首次匯入一次。** 此方案保留現有網址、既有進度與 #54 私用邊界，只新增小型前端載入功能。已接受的取捨是：進度備份不含題包，清除資料、換裝置或容器後須重匯，也不承諾完整離線啟動。不再以這項決策向家長提問；私用託管、後端或公開題文不在本次範圍。

統籌同時採納六題選擇、數字 unit 15、現有半批接續與舊 key 不變；schemaVersion 不變、未送出輸入不保存的技術細節沿用本計畫。app 私用資料以 `data/private/study/g4-s1-math-u1/` 為落點，原 #54 紙本 task 保持已完成且只讀追溯。W0–W3 已完成，沒有需要再問家長的待定方案；W4 只等待孩子實際 iPad／容器的操作證據。

實作與整合階段完成：W1／W2 acceptance 已由統籌接受；W3 clean-context review 對 public diff、六題語意、private 邊界、進度隔離、缺包恢復、desktop DOM 與原生 file chooser 均完成驗證，且無未解 finding。Public static data 維持 1,924 題，private pack 不進 Git。這些結果仍不代表 W4 真 iPad 或 #35／#34 已完成；#55 必須保持 open 到家長完成實際容器驗收。
