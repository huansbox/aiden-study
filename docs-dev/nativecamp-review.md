# Native Camp Review

2026-09-22 Try it 更新：8 堂單課與 09-20 週包追加 Build／Change／Fix，尚未開始的概念使用新版，已作答原版及 Say it 保留。當前版本、132 題／264 段新增音訊與驗收見 [Try it 改版紀錄](nativecamp-try-variety.md)；下方帶日期的題量與發布資訊是當時版本。

交付追蹤：[完成收起與每週新題 #77](https://github.com/huansbox/aiden-study/issues/77)、[練習與Weekly流程 #78](https://github.com/huansbox/aiden-study/issues/78)、[OpenAI語音 #79](https://github.com/huansbox/aiden-study/issues/79)、[Michael／Khalid與首週題包 #80](https://github.com/huansbox/aiden-study/issues/80)。本頁前半說明2026-09-18新機制，由[PR #81](https://github.com/huansbox/aiden-study/pull/81)交付；合併與CI狀態以PR為準，Pages版本與正式資源核對記於主issue的結案證據。下方2026-09-17發布紀錄僅代表歷史版本。

下一堂製作從[課後複習 SOP](../learning-tasks/nativecamp-review-pilot/lesson-sop.md)、[設計模板](../learning-tasks/nativecamp-review-pilot/templates/lesson-brief.md)與[首堂範例](../learning-tasks/nativecamp-review-pilot/lesson-example-2026-09-15.md)開始。現已接入共用課程清單；新課仍須完成來源、題包、音訊與三入口驗收，不能只新增JSON就宣稱上線。

## 課程與Weekly Review入口

| 課程／週包（Asia/Taipei） | 老師／類型 | 內容來源與題量 |
| --- | --- | --- |
| 2026-09-14～09-20；09-20開放 | Weekly Review | [首週新題](../learning-tasks/nativecamp-weekly-2026-09-14/)；14個候選概念、84題、168個一般TTS工作；各模式實際選4個概念 |
| 2026-09-17 19:30 | Khalid | [文具用途、合計、正在計數、同齡句](../learning-tasks/nativecamp-2026-09-17/)；4概念、24題、48個一般TTS工作 |
| 2026-09-16 19:30 | Edon | [親屬關係、縮寫、相反詞](../learning-tasks/nativecamp-2026-09-16/)；18題、36個一般TTS工作 |
| 2026-09-15 19:30 | Silvana | [首堂](../learning-tasks/nativecamp-review-pilot/)；18題、35個一般TTS工作與1段既有私人老師提問；原ID、題意與紀錄保留 |
| 2026-09-14 19:30 | Edon | [祖父母、短文主題](../learning-tasks/nativecamp-2026-09-14/)；12題、24個一般TTS工作 |
| 2026-09-13 19:30 | Michael | [季節活動、故事天氣、活動地點、列表](../learning-tasks/nativecamp-2026-09-13/)；4概念、24題、48個一般TTS工作 |

孩子、Preview與家長摘要共用 `lessons/catalog.json`；`?lesson=<id>` 可指定課程或週包，仍保留 `child`。孩子首頁優先未開始／未完成課與已開放週包；尚未開放的週包顯示開放日，完成項目勾選、淡化並折疊進Finished。Try／Say分開完成，兩者均完成後整課收起；直接連結也不能繞過完成或開放限制。家長能查看全部題包，切課不重建其他設定表單，Preview不寫入紀錄。

畫面沿用 `family-link` 關係卡、`word-card` 短句卡與數量圖示。公開題目為原創變體，不使用孩子私人資料或完整課本頁。新兩堂依網站、教材與已取得錄音核對：Michael回放完整下載；Khalid只取得track 1、3，track 2以網站逐字稿／教材核對，不能宣稱三段錄音齊備。來源、抽查及不確定界線見各堂文件；私人網址、錄音、教材畫面與逐字稿保存在ignored路徑。

本次將五堂一般TTS與首週包統一改為OpenAI預製MP3，speed 1.0，無慢速／135 wpm指示。固定音色為09-13 Marin、09-14 Cedar、09-15 Marin、09-16 Cedar、09-17 Marin、首週包Cedar；同課問題與答案同聲，插入更早課不重排既定音色。[舊語音比較](../learning-tasks/nativecamp-2026-09-16/source/tts-comparison.md)保留作歷史證據，Windows Zira參數不再是本次重建設定。

## 使用方式與範圍

`docs/nativecamp/` 是平台 app；家長在家庭後台開啟 Native Camp Review 後，孩子可從自己的首頁進入。畫面、操作、回饋與本功能的家長摘要皆為簡單英文，使用 Lucide 圖示。既有其他活動的語言保持原設定。

每堂依已教過的重要內容選概念，不設2–3個上限，也不為湊數加題。每個概念保留3題Try it與3題Say it作為可用變體，不要求一次全部做完。新課及週題以完整句排列／變換為主；排列通常1個、最多2個合理混淆字，必要字卡都要用，混淆字可留未選。所有符合題意的自然排列與重複字卡等價順序都應接受，不加入未教語法當陷阱。需要直接看書寫的列表標點另用完整句選擇題；既有三堂已發布題型與題意保留。

Try一輪依每個概念首次表現做2–3題；Say每回一個概念2–3題。新兩堂各4概念，所以Try為8–12題；週包各模式選4概念，84題是候選題庫而非一次必做份量。家長可預覽全部變體。

先獨立回答，再核對答案。內容提示標為 With help；重聽問題不算提示。Say it 的 Got it／With help／Not yet 評的是揭曉前表現。提示與揭曉狀態持久保存，重新整理不會把受助回答變成獨立成功。自主答對不能抵掉口說。

Say it保留明確完整句要求、適量句首及合理替代答案。句首依題目目標設計，例如 `I …`、`They are …`、`There …`，不先給要判斷的答案詞。孩子端與Preview都放在作答區、Show answer上方，揭曉後保留一份供對照。這些是預設視覺引導，不是輸入欄位或額外協助；家長再提供關鍵答案字詞仍記With help。列表口說只要求自然完整句列舉，不評書寫逗號位置，也不念出comma。

## 完成、續作與每週新題

每個概念前兩題都首次獨立成功時，本回合可收尾；任一題錯誤或受助，則本次補第3題。第三題仍不會就提供示範後收尾，不無限加題。取消隔天回原課補第3題及輪用原題；未完成續作只出尚未做過的題目，完成後不能從孩子端重作。

日期使用Asia/Taipei，週期為週一至週日。首包 `weekly-2026-09-14` 於2026-09-20開放，含當週四堂全部12個主要概念及09-13的2個較早候選；每模式選3個本週與1個較早概念。依首次錯誤／受助與後續週題的未熟結果優先選取，也保留成功範例。開始時一起保存各模式的選題、順序與來源概念；重整、跨日續作或之後結果改變，不重抽已開始的包。

週題使用重新設計的情境與問題，每包有經審核的來源題庫及預製語音，不在孩子頁呼叫LLM。完成的週包同樣收進Finished，尚不熟的結果供未來週包選題；Done只表示完成份量，不等於永久掌握，也不宣稱一週是最佳記憶間隔。

家長摘要從相同的課／週包進度計算自主首次獨立答對、受助答對、錯誤與口說三種評級，並顯示後續需加強的概念。訂正不覆寫首次結果，未顯示題不進分母。舊 `initial`／`reviews` 歷史保留，後來reviews成功不抹去首次需加強的依據；舊schemaVersion 1進度採相容讀取，不清空家庭資料或把未完成誤判為完成。

孩子端完成頁只顯示所選模式的概念狀態，詳細統計集中於家長後台。正常答對／答錯、提示、示範與訂正回饋保留。成果由 `family.record()` 即時記錄，結束頁就緒後才呼叫 `family.finishRound()` 合併顯示任務／徽章獎勵；暫停、回饋、離開或切背景不等於回合完成。

## 家長題目預覽

家長後台的 `Preview questions` 開啟 `docs/nativecamp/preview.html`，可選課／週包、Try it／Say it、概念與題目，查看全部題庫，包括已完成、未排到及尚未開放週包的變體。題圖與選項／字卡共用 `question-view.js`，可操作選擇、排列與撤回、核對、揭曉及播放聲音；預覽不受孩子已完成後禁止重作的限制。

預覽控制器只保存當頁的操作狀態，不啟動孩子的同步或活動累計。它不修改首次表現、複習日期、答題數或練習分鐘。關閉或重開後不保留預覽答案；回到後台仍保留原 child。老師聲音仍透過既有家庭授權讀取。這是後台入口的用途區分，沒有新增另一層家長帳號權限。

## 資料與聲音

- `docs/nativecamp/lessons/catalog.json`與各lesson JSON：公開原創題目、答案、聲音引用；週包另有weekly設定及每概念的sourceConcept。
- `learning-tasks/nativecamp-<id>/source/lesson-source.json`：新課與週包的可編輯真相源；共用 `build_lesson.py` 產生公開題包與 `speech-jobs.json`，不改音檔。
- `docs/nativecamp/audio/`：OpenAI Speech API預製的一般英文MP3，使用 `gpt-4o-mini-tts-2025-12-15`、固定音色及speed 1.0；孩子重播不呼叫API。
- `learning-tasks/shared/nativecamp/build_openai_audio.py`：讀取審核後的原創speech jobs製作／檢查音訊；只傳合成題文，不傳老師或孩子錄音。API key僅於製作環境安全注入，不進Git、前端或日誌。
- 各task的 `source/nativecamp-audio-manifest.json`：文字、model、voice、設定、輸入指紋、hash、音長、bytes、解碼與非靜音結果；保留可得請求／usage與驗證界線，未知費用不當成免費。
- `learning-tasks/nativecamp-review-pilot/source/`：9/15既有題文與私人片段來源。舊Windows builder只作歷史參考，不用它覆寫新版MP3或其他課程。
- `learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json`：本機私人老師片段包，排除 Git。

老師原音為一段完整連續提問，未逐字拼接。來源是已下載錄音的老師聲道，切點經短段本機 ASR 核對；ASR 不等於人工聽辨或發音認證。老師片段透過家庭授權的 `GET /v1/nativecamp-audio/<id>` 讀取，沒有放在 public docs；答案聲音只在揭曉後開放播放。

private 音訊的 KV key 是 `c:nativecamp:audio:<id>`，JSON value 為 `{contentType:"audio/mpeg",base64:"..."}`。它與 progress key 分離；進度不含錄音、登入網址或逐字稿。正式音訊供應需由管理端另行提供私人包，產生包不等於已部署。

一般TTS依文字、model、voice與設定建立輸入指紋；重跑時輸入未變且檔案驗證正確就跳過，不再付費生成。失敗可續跑，半檔不算完成；manifest的complete只代表製作工作齊備，不代表發布、人耳自然度或iPad驗收。每檔需完整解碼／非靜音，另做關鍵字與播放抽查；ASR與人耳結果分開記錄。

孩子練習與家長預覽每次進入題目時自動播放問題一次；選字、排列與同步狀態更新不重播。Try it 答對先播放沿用題庫／注音的短鼓勵音，再念完整答案；答錯以柔和提示音接答案示範，自願訂正仍不改第一次紀錄。播放完成不自動前進，保留 Continue。

Say it 在 Show answer 後自動念示範答案；家長選 Got it 才播鼓勵音效，沿用評級後前進，下一題聲音排在鼓勵之後，最後一題只播鼓勵。其他評級不播答對音效。音訊由共用 `audio.js` 管理，重用同一個語音播放器；換題、離頁或進入背景會取消舊語音／音效及私人音檔載入。背景頁面完成載入也不自動發聲。

瀏覽器可能阻擋尚未互動頁面的有聲自動播放。頁面保留 Listen／重試，首次操作啟用聲音；失敗不阻擋作答，也不算提示。返回可見頁面不擅自重播。桌面測試不代表所有 iPad Safari 的播放政策均已驗證。

## 本機重建與隔離驗證

需 `uv`、`ffmpeg`、`ffprobe`；新增一般語音需由本機環境或1Password CLI安全提供OpenAI API key，不依賴Windows音色。缺key時先完成內容／工具驗證並明示語音阻擋，不用Windows檔冒充OpenAI產物。完整製作與恢復方式見[共用工具](../learning-tasks/shared/nativecamp/README.md)。

```powershell
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-13 --check
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-17 --check
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson weekly-2026-09-14 --check

# 純檢查既有音檔，不需key；真正生成時才移除--check並安全注入憑證。
uv run --python 3.13 learning-tasks/shared/nativecamp/build_openai_audio.py --lesson weekly-2026-09-14 --voice cedar --jobs learning-tasks/nativecamp-weekly-2026-09-14/source/speech-jobs.json --manifest learning-tasks/nativecamp-weekly-2026-09-14/source/nativecamp-audio-manifest.json --check

node --test tests/test_nativecamp_*.mjs
uv run --offline pytest tests/test_nativecamp_builder.py tests/test_nativecamp_openai_audio.py

$env:NATIVE_CAMP_AUDIO_PACK = (Resolve-Path 'learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json').Path
node tests/helpers/serve-family.mjs 8789
```

上列原音包設定只適用本機已有該私人檔案時。開啟 `http://127.0.0.1:8789/test/start`，在隔離家長後台開啟Native Camp Review，再開孩子首頁。本機只使用test-token與記憶體KV，不讀寫正式家庭設定或進度；未設定 `NATIVE_CAMP_AUDIO_PACK` 時不讀取私人錄音，停止伺服器後測試KV不保留。選用未占用測試port，不重啟既有8791預覽或清除其紀錄。正式站只核對發布資源與不計分預覽，不替孩子作答。

## 同步與完成界線

沿用 `sync-v1` 與 `wiring-v1` 的child存檔／同步協定。外部進度先驗證再採用，不把壞payload當空進度；相容讀取舊紀錄並保留歷史，過期頁面不能蓋掉較新的存檔。既有遠端整包採用的衝突語意不變，同時在多裝置修改仍有LWW取捨，本次沒有跨裝置逐題合併。

正式發布、iPad 真機與人工驗聽必須另記實際結果；不能以 Node 測試、桌面瀏覽器或音訊轉錄代替。

## 2026-09-18 新版整合驗收（#77–80）

- 全套 Node 460項通過，Python 209項通過、1項跳過（無本機私人素材的既有選用檢查）；三份新題包重建比對、首頁發布版本與差異檢查通過。
- 專項與 clean-context 整合 review 已完成。修正短HTTP回應被誤認完整音檔、僅刪除／重排jobs後manifest未同步、反義詞漏收自然正確語序，以及新catalog導致舊家長測試fixture漏攔截題包；相關回歸檢查通過，無未解決 finding。
- 五堂與首週包共359個OpenAI MP3，1583.328秒；全檔解碼、非靜音、hash與輸入指紋通過。60個不同音檔做本機ASR抽查，其中2個疑漏尾句各重製一次後完整辨識。共361次實際請求，實際費用未知；不帶key重跑零API、manifest不变。詳見[音訊QA彙總](../learning-tasks/nativecamp-weekly-2026-09-14/source/openai-audio-qa.md)。
- 隔離8793服務使用test-token與記憶體KV，沒有改正式家庭設定／進度或原8791。Chrome實際完成Michael Try 9題：8獨立、1首次錯誤；訂正不覆寫錯誤，有錯概念補第三題，其餘兩題成功收尾。中途分頁操作逾時後以新分頁接續，已作答內容保留。
- Say完成9題：7 Got it、1 With help、1 Not yet；標為受助後Got it停用，第三題未熟也正常收尾。整堂完成後折疊至Finished，重新載入相同直連不再提供作答；家長摘要正確顯示首次計數及Actions in seasons需加強。
- 孩子頁沒有家長摘要入口；Preview保留全部題目與不寫入紀錄的操作。Khalid問題與答案可播放，桌面及390×844窄版作答區清楚、無水平溢出（窄版內容寬375px）；恢復原視窗尺寸。首週包在開放前顯示09-20，開放日、固定選題與後續弱項由日期控制測試驗證。
- 尚未進行iPad真機、全檔人耳自然度或新版孩子難度／耗時驗收。瀏覽器Playing與ASR不等同人工驗聽；本次正式發布證據另列於後續發布紀錄。

## 歷史驗收與發布紀錄

以下保留2026-09-17當時版本的驗收與發布事實，**不代表目前新版規則**。其中隔天補第3題、Review ready／later、舊題輪替與Windows語音已由上方#77–80的新機制取代；舊測試數量及Pages／Worker版本也不代表本次驗收或發布結果。

歷史追蹤：[主規格 #64](https://github.com/huansbox/aiden-study/issues/64)、[自主練習 #65](https://github.com/huansbox/aiden-study/issues/65)、[口說與音訊 #66](https://github.com/huansbox/aiden-study/issues/66)、[平台整合 #67](https://github.com/huansbox/aiden-study/issues/67)、[介面精簡與家長預覽 #69](https://github.com/huansbox/aiden-study/issues/69)、[自動播放與音效 #70](https://github.com/huansbox/aiden-study/issues/70)、[口說句型提示 #72](https://github.com/huansbox/aiden-study/issues/72)均已結案；原分支 `codex/nativecamp-audio-review` 由PR #68合併並發布。

## 歷史：2026-09-17 分支驗收

- 全套 Node 測試372項、pytest 184項通過。Node 含日期邊界、獨立 localStorage／Cookie 的兩裝置、離線重開重連、孩子隔離、壞資料拒絕與私人音訊授權；這些是隔離測試，不代表已測兩台實體 iPad。
- 隔離瀏覽器從家長開啟活動、孩子首頁進入；Try it 實際做8題，涵蓋提示、錯誤、訂正與字卡排列。訂正後原錯誤仍保留；同步不清除已選字卡。三概念分別記為2／1／0、2／0／1、2／0／0（獨立／協助／錯誤），未出第3題不計數。
- Say it 實際測試 too many 一回合，With help、Got it、Not yet 各1；第3題結束即收尾，可離開或另選概念。Try it 為 Done，Say it 整堂仍 In progress；兩者皆保留9月18日的應複習概念。
- 提示與揭曉後重新整理，狀態仍保留；受助口說不能再選 Got it。預製 TTS、揭曉後答案聲音與授權老師片段皆進入 Listening，播放完顯示可重聽；返回頁面後老師聲音仍可重新取得。這是播放功能驗證，未做人工音質判定。
- 家長後台從隔離 Worker 取得相同首次紀錄與口說三評級；沒有將口說與自主合成總分。
- 桌面與820×1180的瀏覽器版面檢查通過；這是平板尺寸模擬，不是 Safari 或 iPad 真機驗收。
- clean-context code／integration review 找到並修正：離頁撤銷音檔後重播快取失效、外部進度接受矛盾完成／提示狀態。補回歸測試，複查無未解決 finding。另把計數用的樹木圖示改為單棵，避免每個圖示含兩棵造成誤判。
- 最後整合修正「See my progress」直接開摘要，並更新新 app／家長入口的 shared script 版本，避免混用舊快取；首頁資源版本亦已重建。瀏覽器未記錄 console error／warning。

上述分支驗收時交付工作分支與本機隔離預覽，當時尚未正式發布或載入正式老師片段。後續發布結果以文末與 PR #68 的發布紀錄為準；人耳音質與孩子難度／完成時間仍待家庭實測。

## 歷史：2026-09-17 介面精簡與預覽驗收（#69）

- 全套 Node 測試383項通過，包含兩模式各自的完成頁、家長預覽入口、全部18題切換與作答、音訊失敗重試／離頁釋放，以及預覽不啟動學習紀錄寫入。
- 使用本機現有已完成紀錄檢查新版首頁與 Try it／Say it 概念進度；Done 及隔天複習狀態保留。孩子端沒有家長摘要入口。
- 家長預覽實際操作選擇、排列／撤回、揭曉、TTS 與授權老師原音；操作後返回後台，首次作答、口說評級及活動累計與操作前一致。未清除測試紀錄或重啟本機伺服器。
- fresh code review 找到快速重試可能重複掛載預覽、導致一次點擊播放兩份聲音；已加入載入序號隔離過期回應及回歸測試。獨立複查成功／失敗交錯情境後，沒有未解決 finding。
- 桌面畫面與預覽版面檢查通過，瀏覽器未記錄 console error／warning。這次沒有新增 iPad 真機或人工音質驗收；Python 來源未改，本機不重複 pytest，PR CI 仍執行兩套檢查。

## 歷史：2026-09-17 自動播放與音效驗收（#70）

- 全套 Node 測試398項通過；涵蓋音效先於答案、Got it 接下一題、播放取消、晚回原音釋放、瀏覽器阻擋後可重試、隱藏後才完成載入／存檔，以及首次紀錄不變。
- 瀏覽器預覽實測：初次自動播放被阻擋時仍可操作，點選題目後成功進入 Playing；答對／答錯自動播放答案，Say it 揭曉自動播放示範，老師原音可隨題目自動播放。保留手動重聽，沒有自動跳題。播放序列的確切先後另由可控制音訊事件的測試驗證，不以畫面狀態宣稱人耳驗聽。
- 預覽操作前後，家長摘要的首次作答、口說評級與活動累計一致。原有兩模式 Done 及隔日複習狀態保留，未清除紀錄或重啟8791服務。
- 獨立唯讀 review 完成，沒有未解決 finding；額外重現延遲 unlock 失敗不會中斷新播放。整合時補上背景慢速 boot 的播放門檻及回歸測試。
- 本輪未修改 Python、題庫或既有音檔；iPad 真機、人工音質驗收與正式部署維持未完成界線。

## 歷史：2026-09-17 口說句型提示驗收（#72）

- 全套 Node 測試398項通過，獨立唯讀 code review 無未解決 finding。沿用既有呈現測試，不為純字級變更新增單元測試。
- 與修改前版本比對，題包只有九題 Say it 的 instruction 改變；Try it、答案、可接受答案與其餘欄位相同。透過 uv 檢查 Python 的 build_lesson 輸出與題包一致，35份語音工作文字及35個既有 MP3 逐項相同，未重新產生音檔。
- 家長預覽實際切換三種句型提示。桌面題目與提示皆33.6px，390px窄版皆27.2px，均為深色 #223b37；窄版無水平溢出，提示為靜態文字。孩子端與預覽共用同一組樣式，瀏覽器未記錄 console error／warning。
- 驗收只操作不計分預覽，未清除學習紀錄或重啟8791；音訊、進度及複習流程均未修改。窄版為桌面瀏覽器尺寸模擬，尚未做 iPad 真機驗收或正式部署。

### 作答區位置調整

- 依後續確認，三種句型統一移到作答區，取代孩子端 Say your answer first／預覽 Say an answer, then reveal the example；題目區不再重複提示。揭曉前位於 Show answer 上方，揭曉後仍保留一份提示。
- 既有 Node 398項通過；獨立唯讀 review 另以記憶體 mount 驗證孩子端三概念及預覽九題的揭曉前後共24種呈現，無 finding。瀏覽器確認三種提示、桌面及390px窄版，字級／深色維持，無水平溢出；只操作不計分預覽。

## 歷史：2026-09-17 正式發布整合

2026-09-17 使用者授權正式部署。整合主線的注音錄音／聲調提示與回合獎勵規則；Native Camp 仍即時記錄成果，Try it 最後 Continue 或 Say it 單概念結束頁才透過 finishRound 顯示英文獎勵。單題回饋、離開或切背景不算完成；背景存檔完成時延後至可見的結束頁。同步更新各 App 的共用資源版本，避免家長開啟 Native Camp 後，舊 family-core 快取拒收新設定。

發布順序為新版 Worker、私人音訊 KV、PR 合併與 GitHub Pages。沿用既有 Worker、KV、家庭授權與 API route；只新增 `c:nativecamp:audio:2026-09-15-hats-question`，不變更孩子進度或自動調整家長的活動設定。原音為43061 bytes、SHA256 `ae47f7a4e99ae39f25c6df3a32d977cdf48336bff5bc3b3d517f102cb9625c18`；部署從 ignored 原音包取該 id 的內層物件作為 value。

整合後本機 Node 409項、pytest 184項通過，Worker dry-run 成功。正式 Worker version、Pages commit 與外部驗證結果記於 PR #68 的發布紀錄，不能以 dry-run 或本機結果代表上線成功。正式使用時由家長後台開啟 Native Camp Review；部署不會重設或補造家庭設定。

### 2026-09-17 正式發布結果

- [PR #68](https://github.com/huansbox/aiden-study/pull/68) 已合併，正式程式 commit `6b8f585772c25822c02111196d49cf4664a52b4d`；[Pages](https://github.com/huansbox/aiden-study/actions/runs/35204662470) 與 [master Node／Python CI](https://github.com/huansbox/aiden-study/actions/runs/35204662998) 成功。整合版經獨立唯讀 review，無發布阻擋項目。
- Worker version `32032b2d-2007-43fa-bccf-584b33d8e006`。只新增前述單一原音 KV key，正式回讀43061 bytes與SHA256一致；TOKEN、既有KV資料及routes未改。
- 正式站54個HTML／JS／CSS／JSON／TTS資源皆HTTPS 200，內容與發布來源相符；未登入的原音GET回401。Chrome沿用家庭連線，正式預覽的老師題成功進入Playing，三種句型提示皆可見。這是播放功能驗證，不是人工音質判定。
- 家長後台已顯示Native Camp開關、預覽入口與獨立摘要。發布時煦誠的活動尚未勾選，孩子入口依設定提示由家長開啟；本次未修改首頁活動、安排或作答紀錄。正式[預覽](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden)與[家長後台](https://kids.linshuhuan.com/parent/?child=aiden)可使用。
- iPad真機、孩子難度／完成時間與人工驗聽仍待家庭實測。
