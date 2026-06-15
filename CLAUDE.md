# Aiden Study - 三下題庫練習網站（自然＋數學＋社會）

## 專案目標

從考卷 PDF（`pdfs/` 期中自然、`pdfs_期末/` 期末自然、`pdfs_數學/` 期末數學、`pdfs_社會/` 期末社會有答案卷、`pdfs_社會_補答案/` 期末社會無答案卷）萃取題目、AI 分類、建立給小孩在 pad 上練習的靜態題庫網站。現況：題庫 1858 題（自然 1099＝期中 601＋期末 498；數學 307；社會 452）。自然期末 498＋數學全 307＋社會全 452 題附作答後說明（`explanations.json` 1257 題；社會已全覆蓋）。

## 快速參考

- **▶ 待辦（後續工作）**：①期中自然（unit 1/2）作答後說明（考後再議）②隱藏題救回 3 題（考後再議）③社會後續：**路 A 擴充批＋路 B 擴充說明 166＋無答案卷 AI 補答案批 226＋無答案卷批 226 題作答後說明皆已完成（社會 452 題說明全覆蓋，explanations 1257；見下方無答案卷說明條目）**；剩 社會看圖題策展（甲乙標章/此標章等，比照數學看表題截圖）、可再收更多無答案卷。④**分批練習 PRD #2**：sub-issue #3–#6 全部完成並關閉（2026-06-15，見下方分批條目）；父票 PRD #2 暫留，唯餘 1 項 cosmetic 債（resume 半批進度條歸零）待家長定奪是否修。
- **分批練習（碎片化）已完成上線（2026-06-15，PRD #2 / issue #3「016」，feat/batch-practice 已 merge＋push commit 797493a）**：「全部練習」從「整單元數十題一個 queue」改成「一次一批（上限 10）」。`challenge[key]` 存當前批 `{batch:[ids]}`（取代舊 `{queue}`；`getBatch` 視舊格式為 null＝無進行中批次，進度靠 `mastered` 保留不倒退）；新增純函式 `nextBatchSize(N,max=10)=ceil(N/ceil(N/max))`（平均拆無零頭，node 對照表驗證）、`Picker.nextBatch`（接續半批或現算新批）、`finishBatch`（**先判 isCleared→通關、否則 renderBatchBreak，順序不可反**）、`renderBatchBreak`（批間畫面）。進度條 full 模式分子/分母改看 `quiz.batchIds`。Playwright 實測：23→8/8/7、≤10 直接通關不出批間、重新挑戰仍分批、答錯重出、跳過縮批、錯題不分批、舊格式遷移不倒退。批間主鈕家長定案用**「再做 N 題」**（非「再來」，小孩好懂＋保留動態題數）。
- **進度備份/還原已完成上線（2026-06-15，feat/export-import-progress 已 merge＋push commit 0e84d58）**：純前端匯出/匯入 localStorage 存檔（**iPad 主畫面 App 的 localStorage 會被 iOS 約 7 天規則清掉，加主畫面也擋不住**）。首頁底部「進度備份/還原」摺疊區：匯出＝文字框＋複製（clipboard API＋execCommand fallback）＋下載；匯入＝貼 JSON→驗證（物件且含 mastered 或 challenge）→二次確認→`setItem`+reload。多 agent code review 唯一真 finding＝匯入驗證過嚴已修（接受 loader 能載入的形狀）。家長真實備份（gitignore，勿 commit）＝`aiden-study-進度備份-20260615.json`（含 31 題 mastered），另一份在 Dropbox。
- **PRD #2 sub-issue #4/#5/#6 已驗證關閉（2026-06-15，chore/batch-practice-followup 已 merge master，commit cce0816；未 push）**：全程 Playwright 對 live build 端到端實測——#4（017）subtopic 同走 startFull 自動分批（探索家鄉的地名 11 剩餘→批 6）、錯題模式不經 nextBatchSize（15 題一次出）、首頁「已答對 35/132」＋通關狀態不變、errorBank 累積一致（full 答錯加入/答對不移除）；#5（018）半批 reload 原樣接續同題（sameSet/sameOrder，不重切不補題）、離開→重抽新批、v3 長 queue 遷移（getBatch 視舊格式 null＋mastered 保留）、v2 無 mastered→backfillMastered 反推 102 不倒退；#6（019）跳過/回報縮分母、跳過清空＋回報清空皆走 finishBatch 批間判定（非舊 summary）。**review 小債清掉 2/3**：renderSummary 的「本輪結束」full dead code 已刪（collapse 成 通關）、批末 next-btn full 模式改「完成這批」。**唯餘 1 項 cosmetic 債**：resume 半批時批內進度條歸零（顯示「0/5」而非「3/8」；要修需在 challenge 存原始批大小，動存檔格式），待家長定奪是否值得。
- **社會無答案卷 AI 補答案批已完成（2026-06-14，11 卷，社會 226→452、題庫 1632→1858）**：tcool ≥110下期末「無官方答案卷」14 卷下載（草港112/吉林111 純掃描圖、民權112 圖多 共 3 卷整卷剔除）→ 276 萃取→去重淨增 240→**AI 補答案（比照數學批三）**。流程＝3 獨立盲解 agent **三方比對 230/240 一致**→主迴圈裁決 10 分歧（7 答 3 剔）→**classify 自填＝第 4 意見**揪一致票 2 隱性錯（布農族依月亮非太陽、琉璃珠排灣非阿美）→**主迴圈全 233 題事實覆審**再揪 2 全模型共錯（竹山自然環境非生產、鹹菜客家非閩南）＋剔 3 看圖/全對題→入庫 226 題全 `needs_review=True`。**cf_clearance 取法更新**＝Playwright 導 PDF URL 過 managed challenge 後 IWR 才放行（直接用首頁 cookie 對 PDF 端點仍 403）。`build_explanations.py` 社會改「漸進覆蓋」（`expected_explanation_ids`，新批題庫不擋說明驗證）＋3 測試，tests **116 passed**，Playwright 科目層 154/132/166＋新題判對。下載器＝`scripts/download_tcool_social_noans.ps1`；完整紀錄＝[`docs-dev/social-pipeline-status.md`](docs-dev/social-pipeline-status.md)＋`skipped_questions.md`「無答案卷 AI 補答案批」節。
- **社會無答案卷批 226 題作答後說明已完成（2026-06-15，feat/social-noans-explanations，explanations 1031→1257，社會 452 全覆蓋）**：沿用路 B 雙盲——12 sonnet 寫手分批（附主迴圈已核定典故事實 brief，含本批 AI 補答案的 4 處更正：布農族依月亮、琉璃珠排灣、竹山自然環境、鹹菜客家）→ 8 獨立盲審（不給 brief）→ 主迴圈裁決 **213 pass／13 fixed**。關鍵差異＝**這批答案是 AI 補的（無官方卷）**，brief 要寫手/審核遇可疑答案改 flag 不硬掰。13 改寫含：射日傳說聚焦布農族非泰雅、鹽埕不拆「埕」字、鹹菜刪「非閩南」絕對否定、新埔記錄開墾非生產、造橋刪 PDF 滲入錯誤河名「大甲溪」、元長鄉刪查無依據的「名叫元長的人」、高雄/民雄古地名打狗/打貓改寫（原寫反＋民雄誤寫蔴里蘭）、竹山客運站「復駛」邏輯反、馬公天后宮「無從確定」改點明、喜憨兒公益消費誤掛綠色消費、坪林刪「林溪」。**審核 2 處誤判主迴圈駁回**：三井 LaLaport 台中館確在**東區**（審核誤為北屯/梧棲，維持原稿）。批次檔＝`data/exp_results/batch_social_11..14.json`；tests **116 passed**、Playwright 社會 452/452 join 命中、改寫題顯示正確。`build_explanations.py`／前端皆不改。
- **社會擴充 166 題作答後說明已完成（路 B 擴充，2026-06-14，explanations 865→1031）**：社會 226 題（pilot 60＋擴充 166）全覆蓋。8 sonnet 寫手（附主迴圈已核定典故事實 brief）→6 獨立盲審→主迴圈裁決 **150 pass／16 fixed**（「全臺最古老媽祖廟」軟化、消費專線干擾號碼錯標移除、統一發票誤引選項改正、大甲藺草誤掛洪鴦改正、射日刪課本外推論）。批次檔＝`data/exp_results/batch_social_03..10.json`；抽查＝`docs-dev/review_社會說明_抽查.md`。
- **社會擴充批（路 A）已完成（2026-06-14，5 卷，社會 60→226、題庫 1466→1632）**：安和111/112、四維112、竹塘110、海佃110 端到端（21→101 是非＋39→125 選擇）。原規劃 8 卷，probe 後 **3 卷整卷剔除**：中正110（內容舊課綱，家長定案剔除）、和順112/113（題目卷本身 0 字純掃描圖）。**跨校無逐字重題**（normalize_text 去重＝0，交接文件「大量重題」預期不成立，不需新去重機制）。**本批難點＝選項標記格式分歧**（非視覺判讀）：`clean_social_raw.py` 新增 `recover_social_options`（裸`○`/`○數字`/`數字○`混用＋雙欄切碎統一補抽）；`extract.py` NON_TARGET 補「勾選題/排出順序/生活情境題」截斷（順帶修期中 2 題勾選滲漏，golden 同步更新）。**官方答案**＝`extract_social_answers.py` 逐卷專用 parser（5 卷格式全不同＋PUA U+F0CD→╳＋空括號=false），完整性 167/167，7 題雙欄跑版答案 render 視覺判讀補（MANUAL_OVERRIDE）。**竹塘題目卷/答案卷不同版本**（tr7/mc7 換題）：tr7 剔除、mc7 人工確認保留。crosscheck AI vs 官方 **161/166 一致**（5 分歧皆官方正確，內容竄改型是非題）。tests **113 passed**，Playwright 實測科目層/unit課本號/補抽選項題/作答判對全正確。完整紀錄＝[`docs-dev/social-pipeline-status.md`](docs-dev/social-pipeline-status.md)「✅ 路 A 已完成」節＋`skipped_questions.md`「社會擴充批（路 A）」節。
- **社會科 pilot 已完成（2026-06-14，桃子腳兩卷端到端，未 commit）**：第三個科目上線。桃子腳 110下＋112下 → 社會 60 題（21 是非＋39 選擇），unit **10/11/12＝課本第 4/5/6 單元**（消費與選擇／家鄉的地名／家鄉的故事，各 2 子主題）→ 題庫 1406→1466。**前一 session 幻覺已更正**：`social-tcool-blocked.md`（宣稱 tcool 換 nginx 擋下載、繞過全失敗）整段捏造，實測仍 Cloudflare、既有 Playwright→cf_clearance 流程照常可用、已下載 11 卷。新流程＝`extract.py`→`clean_social_raw.py`（社會頁尾噪音清理＋雙欄題號修正）→官方答案（桃112文字抽／桃110掃描圖象限放大親讀）→`classify.py --semester social`→`apply_answer_key`→`build_questions`（加 social 區塊）→`index.html` 加社會科目層（`unitNum()` 顯示課本號）。crosscheck AI vs 官方 59/60 一致，唯一分歧射日傳說官方 true 勝出。tests 111 passed。完整紀錄＝[`docs-dev/social-pipeline-status.md`](docs-dev/social-pipeline-status.md)。**已下載未處理＝其餘 9 卷在 `pdfs_社會/`**。
- **社會作答後說明已完成（2026-06-14，60 題，路 B）**：沿用 batch_math 雙盲流程（3 寫手 sonnet 分批寫＋附主迴圈已核定典故事實 → 3 獨立審核 agent 盲審 → 主迴圈裁決，**54 pass／6 fixed**：環保袋/地形氣候/即期品/拆包裝語序採審核改寫，琉璃珠泛稱與施世榜「大約十年」兩 flag 由主迴圈裁定）。`explanations.json` 805→**865** 全覆蓋。**程式改點**＝`build_explanations.py` 加 `social_ids()`（subject=social 納入 expected 集合驗證）＋社會抽查報告；**前端不改**（說明卡通用 `explanations[q.id]`，社會進檔即顯示）。tests **113 passed**（+`TestSocialIds`）。Playwright 實測社會 60 題 join 100% 命中。批次檔＝`data/exp_results/batch_social_0{0,1,2}.json`；抽查全錄＝`docs-dev/review_社會說明_抽查.md`。射日傳說桃110是非#18 官方 true 已正確寫成肯定句（被射傷太陽變月亮、要求布農族定期祭典、族人答應）。
- **數學批三 9 份無答案卷已完成（2026-06-12，feat/math-batch3）**：建德113／民權113／內湖113,112／社寮112,110／舊館111 七卷收錄（草港112、吉林111 純掃描圖整卷剔除）→ 數學 146→307、題庫 1406、`explanations.json` 805 全覆蓋。**AI 補答案＋複審新流程**＝主迴圈親算 166 題→每卷 2 個獨立盲解 agent→程式化比對 332 次一致 331/332（唯一分歧票選○計數放大原圖採 6）。**獨立驗證**（`scripts/verify_batch3.py`）：30 題機械重算、131 題主模型逐題親算全數正確；另發現並修正 build_questions 期中 id 去碰撞漏洞（5 組重複）＋2 張截圖 bug（社寮112票價表截斷、社寮110誤掛血型表）。看表/看圖 17 截圖＝`docs/assets/math/`。剔除全錄＝`skipped_questions.md`「數學批三」節。
- **數學說明擴充批 86 題已 merge 上線（2026-06-11）**：沿用 batch_math 流程（9 寫手 sonnet→9 獨立審核→主迴圈裁決），72 pass／14 審核改寫（多為直式借位位值寫錯、超齡解法、列式結構誤導），0 答案疑點；批次檔＝`batch_math_06..14.json`，`explanations.json` 644 題全覆蓋（自然期末 498＋數學 146）、tests 109 passed；抽查全錄＝`docs-dev/review_數學說明_抽查.md`。
- **期末複驗 5 題分歧已定奪（2026-06-11，家長逐題確認）**：改 3 題（大墩113選6 ④→①、大墩112選9 ②→④、東光113是非7 ○→✕）、維持 2 題；百葉箱題推翻原查證（家長翻課本實證「可測最高最低溫」為課本明文）。定奪全錄＝`docs-dev/review_期末_複驗_分歧.md`；三題作答後說明同步改寫（exp_results＋explanations.json）。
- **數學說明首批已 merge 上線（2026-06-11）**：60 題作答後說明（寫手→獨立審核→裁決，10 題審核改寫），`explanations.json` 558 題；抽查全錄＝`docs-dev/review_數學說明_抽查.md`。
- **數學擴充批次已 merge 上線（2026-06-11）**：桃子腳110＋安和111＋彰化中正111＋彰化田中111 四卷（tcool 有答案卷的全收齊），數學 60→146（+72 文字題＋14 看表題）。四卷版面與格式A 不合，走**人工策展＋官方答案＋PNG 逐題核對**（非 extract_math），剔除紀錄＝`skipped_questions.md`「數學擴充批次」節。110/111 卷的純長度題（公分/毫米）不在現行 taxonomy → none 排除；小數×長度混合題保留。
- **期末 AI 補答案第二輪複驗完成（2026-06-11，master）**：266 題盲審重答、98.1% 一致；5 分歧已查證寫成 `docs-dev/review_期末_複驗_分歧.md`（維持 3／建議改 2：大墩113雲題④→①、東光113 166/167題○→✕）。
- **數學補完批次已 merge 上線（2026-06-11）**：安和表格 5 題＋應用3 救回＋填充 chip／條列換行／表格圖全寬。
- **自然滲漏清理已上線（2026-06-11）**：44 題處置（修 42／移除 1／圖片排除 1／官方答案錯誤覆寫 1），紀錄＝`skipped_questions.md`「自然選擇題萃取滲漏清理」節。
- **期末作答後說明已上線（自然 unit 3/4，499 題）**：資料＝`docs/explanations.json`（id → 說明，前端 join）；批次結果＝`data/exp_results/`，重建跑 `uv run python scripts/build_explanations.py`；PRD＝`issues/prd-期末說明.md`；抽查全錄＝`docs-dev/review_期末說明_抽查.md`。期中題（unit 1/2）尚無說明。
- **數學期末題庫已完成上線（issues 008–015，8/8）**：設計稿＝[`docs-dev/exam-math-pipeline-design.md`](docs-dev/exam-math-pipeline-design.md)；各 issue 檔含驗收與完成紀錄。
  - 數學題型：選擇 13／填充 35（number/comparison/code/text 四種輸入）／直式逐格 6（小數加減＋長除法，移植 aiden-math）；看表題截圖嵌入（`docs/assets/math/`）。
  - 數學 pipeline：`extract_math.py`（萃取＋分數亂序偵測）→`reflow_math.py`（AI 重組＋PNG 人工核對閘門）→`classify.py --semester math`→curated（看表題人工檔）→`build_questions.py`。
- **期末題庫擴充已完成（issues 001–007，7/7）**：現況真相源＝[`HANDOFF.md`](HANDOFF.md)；**維護/擴充前先讀經驗筆記** [`docs-dev/期末-實作經驗筆記.md`](docs-dev/期末-實作經驗筆記.md)（pipeline、踩過的坑、重跑指令）。[`issues/prd.md`](issues/prd.md)＋`issues/001`～`007` 為歷史決策紀錄（已封存，不再更新）。
- **考卷來源與取得流程**（期末擴充、tcool.cc 抓取、Cloudflare 繞過、課綱篩選界線）：[`docs-dev/exam-paper-sourcing.md`](docs-dev/exam-paper-sourcing.md)
  - 重點：三年級自然 **110下** 起才是現行 108 課綱，108下/109下 屬舊課綱需排除。
- **期末題庫 pipeline 與網站設計稿**（2026-06-09 grill-me 對齊）：[`docs-dev/exam-final-pipeline-design.md`](docs-dev/exam-final-pipeline-design.md)
  - 重點：期末＝第3單元動物／第4單元天氣；兩層 unit→subtopic（以桃子腳範圍為基準）、UI 可選 subtopic 練；答案卷＝格式A 可直接 extract，民權無答案卷由 AI 補。

## 目錄結構

```
pdfs/              27 份原始期中考卷 PDF（108-113 學年度，北市/新北/台中）
pdfs_期末/          期末考卷 PDF（tcool.cc 抓取，三下自然康軒，現行課綱 110下~113下）
pdfs_數學/          數學期末考卷 PDF（桃子腳112/110下、安和113/111下、中正111下、田中111下）
scripts/           Python 資料處理 pipeline
  extract.py       自然 PDF → raw（純函式 parse_questions_from_text + --input/--output）
  extract_math.py  數學答案卷 → raw（獨立模組：雙欄切分、括號答案、分數亂序偵測）
  reflow_math.py   分數亂序題 AI 重組（artifact 人工核對後 --apply 併回 raw）
  classify.py      claude -p 批次分類（可切換 taxonomy：--semester mid|final|math|social）
  clean_social_raw.py 社會 raw 後處理（頁尾噪音清理＋雙欄切壞題號修正；extract 後 classify 前）
  download_tcool_social.ps1 / sweep_tcool_social.ps1  社會卷下載器／清單掃描器
  data_helpers.py  去重/答案合併/驗證純函式（深模組B）
  build_questions.py classified → docs/questions.json 四來源合併（冪等、id 去碰撞、subject 欄位）
  build_explanations.py data/exp_results/ → docs/explanations.json 合併驗證
  fix_classified.py 期中分類修正腳本
data/              中間資料
  raw_questions.json        期中萃取（659 題）
  classified_questions.json 期中分類（645 題）
  raw_questions_期末.json    期末萃取（第一批）
  classified_questions_期末.json 期末分類（unit 3/4 + subtopic）
  *_期末_新增.json           第二批擴充（raw / classified / official_answers）
  raw_questions_數學.json    數學萃取（含 reflow 撈回題）
  *_數學_新增.json           數學擴充批（4 卷人工策展 raw / classified）
  classified_questions_數學.json 數學分類（unit 5–9 + subtopic，含擴充批合併）
  curated_questions_數學.json / table_crops_數學.json  看表題人工檔／截圖座標
  skipped_questions_數學.json / reflowed_questions_數學.json  分數亂序跳過清單／重組 artifact
  raw_questions_社會.json / classified_questions_社會.json  社會萃取／分類（unit 10–12）
  official_answers_社會.json  社會官方答案（桃112文字抽＋桃110視覺判讀）
  tcool_grade3_sci_kanghsuan.json / _math_ / _social_kanghsuan.json  考卷清單（tcool.cc 爬取）
docs/              GitHub Pages 部署目錄
  index.html       練習網站（單一 HTML，內嵌 CSS/JS，科目層 自然/數學/社會）
  questions.json   最終題庫（自然 1–4＋數學 5–9＋社會 10–12，全題帶 subject）
  explanations.json 作答後說明（自然期末498＋數學307＋社會452＝1257 題，id → 說明）
tests/             pytest（parser / 數學 parser / data_helpers / classify config / build / 期中回歸）
docs-dev/          內部開發文件（不部署）→ 見「快速參考」
skipped_questions.md  跳過題目清單（供手動確認）
```

## 技術決策

- 資料處理：Python（pdfplumber 萃取、claude -p 批次分類）
- 網站：單一 `index.html`，零依賴，部署於 GitHub Pages
- 資料格式：JSON（scripts 產出 → 網站讀取）
- 儲存：localStorage v2（challenge queue + errorBank + stats）
- 編碼：所有 Python 腳本需設定 utf-8（Windows cp950 環境）

## 練習網站功能

### 兩種模式
- **全部練習**：分批制（一次一批、上限 10；2026-06-15 起，見快速參考「分批練習」）。本批內答對移出/答錯移到批尾重出，全批答對→批間畫面「再做 N 題／離開」；整單元全 mastered→「通關！」。可接續半批，通關後可重置。
- **錯題練習**：答對從錯題庫移除，答錯留在庫中排到隊尾（**不分批**，一次出全部錯題）
- 快速練習（智慧選 10 題）已整個移除（2026-06-11 家長定案）：選題邏輯與另兩模式重疊、不累積通關進度、版面按鈕過多眼花；stats 仍照常記錄（目前只寫不讀），勿因「沒人讀」順手刪掉記錄端

### 作答後說明
- 自然期末題（unit 3/4）答題 feedback 畫面顯示說明卡（1–3 句、小三用語）；`explanations.json` 缺 id 時不顯示，不影響作答流程

### 填充題空格 chip＋條列換行（家長提案：（２）標記乍看像答案、子題擠成一段）
- 題幹（Ｎ）全形標記渲染成 chip（虛線小格），與下方作答格同步 highlight、可點選、輸入時即時回填顯示值；答題後同步綠/紅。資料格式不變（仍存（１）），純前端 renderer 處理；半形 (1) 是原卷子題編號不轉換
- 條列換行（只套填充題）：「；」後／≥2 個半形 (N) 子題前／≥2 個甲乙丙丁列舉前／「答：」「最大：」「最小：」標籤前。選擇題不套——其 (N) 命中多為萃取欄位滲漏雜訊

### 跳過題目（只在全部模式）
- 答題畫面作答前低調按鈕「先跳過這題」→ 移出本批 queue、本批分母（`batchIds`）減 1，不動 stats／errorBank／mastered
- 跳過≠答對：進度條「已答對」以 mastered 計；本批做完未通關 → 批間畫面（被跳題之後別批會再出現），整單元全 mastered 才「通關！」（分批後不再走舊「本輪結束」summary）

### 題目回報（flag）
- 答題 feedback 畫面（答對/答錯皆有）低調按鈕「題目有問題」→ inline 確認後 flag
- flag 效果：清除該題全部 stats、移出 errorBank 與 mastered（先前答對視為可能猜對）、從本批 queue 抽掉並使本批分母（`batchIds`）減 1（本批因此清空→走批間判定）；兩種模式題池與通關分母（`questionIdsFor`）全部排除
- 首頁底部「已回報題目（N）」（N=0 隱藏）：單題還原/全部還原；「回報到 GitHub」開 prefill issue URL（零後端，pad 瀏覽器需登入 GitHub；URL 過長自動降格為精簡格式）

### 進度備份/還原（家長用；2026-06-15）
- 首頁底部「進度備份/還原」摺疊區：純前端匯出/匯入整份 localStorage 存檔。**為何**＝iPad 主畫面 App 的 localStorage 會被 iOS 約 7 天規則清掉、加主畫面也擋不住。
- 匯出＝`window._exportProgress`（讀 `localStorage` 那份，文字框＋複製＋下載 `aiden-study-進度備份-YYYYMMDD.json`）；匯入＝`window._showImport`/`_importProgress`（貼 JSON→驗證物件且含 `mastered` 或 `challenge`→二次確認→`setItem`+reload）。
- 還原管道與 loader 一致：匯入舊版（無 mastered）備份也能靠 `backfillMastered` 重建

### localStorage 結構（key: aiden_study_v2）
- `challenge`: 每單元/subtopic 的**當前批**狀態（`{batch:[ids]}`=進行中半批, null=無進行中批次；2026-06-15 改自舊 `{queue}`。`getBatch` 把舊 `{queue}` 視為 null；通關與否一律由 `mastered` 推導，不存 cleared 標記）
- `errorBank`: 錯題庫（去重，只在錯題模式答對時移除）
- `stats`: 每題統計（practiced/correct；快速練習移除後只寫不讀，保留供未來功能）
- `flagged`: 已回報題目（`[{questionId, unit, flaggedAt}]`，排除於所有題池與分母，可還原）

## 分類規則

自然期中（unit 1–2）／自然期末（unit 3–4）／數學期末（unit 5–9）／社會期末（unit 10–12）為 `classify.py` 的四組可切換 config（`--semester mid|final|math|social`）。unit 全域唯一。社會內部 10/11/12＝課本第 4/5/6 單元（避開自然 unit 4；`index.html` 以 `unitNum()` 顯示課本號）。

- **第 1 單元：田園樂** — 蔬菜種類/部位/生長因素/生長過程
- **第 2 單元：溫度變化對物質的影響** — 物質變化因素/水三態/其他物質受溫度改變
- **第 3 單元：動物** — 動物分類/身體構造/生存與適應/觀察方法
- **第 4 單元：天氣** — 風/氣溫測量/雨量降雨/天氣預報（以桃子腳國小範圍為基準）
- **第 5 單元：小數** — 小數的認識/小數比大小/小數加減
- **第 6 單元：圓** — 圓的構造/圓規與畫圓/圓的大小比較
- **第 7 單元：乘法與除法** — 乘除互逆/乘除計算/乘除應用
- **第 8 單元：時間** — 時刻與時間單位/時制互換/時間計算
- **第 9 單元：統計表** — 報讀表格（單一子主題，UI 不另列概念入口）
- **社會 unit 10（課本第 4 單元）消費與選擇** — 聰明消費/綠色消費
- **社會 unit 11（課本第 5 單元）家鄉的地名** — 地名的由來/探索家鄉的地名
- **社會 unit 12（課本第 6 單元）家鄉的故事** — 家鄉的人物與發展/傳說與文化保存
- 數學/社會單元名稱依均一「類康軒版」＋搜尋交叉查證（與卷面吻合；非課本目錄原件，家長可抽查課本）
- 衝突規則：優先歸屬題目直接詢問的核心概念所屬單元；範圍外標 `none` 排除

## 部署

- URL: https://huansbox.github.io/aiden-study/
- GitHub Pages source: master branch `/docs`
