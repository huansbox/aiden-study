# Native Camp Review

追蹤：[主規格 #64](https://github.com/huansbox/aiden-study/issues/64)、[自主練習 #65](https://github.com/huansbox/aiden-study/issues/65)、[口說與音訊 #66](https://github.com/huansbox/aiden-study/issues/66)、[平台整合 #67](https://github.com/huansbox/aiden-study/issues/67)、[介面精簡與家長預覽 #69](https://github.com/huansbox/aiden-study/issues/69)。工作分支：`codex/nativecamp-audio-review`。

## 使用方式與範圍

`docs/nativecamp/` 是平台 app；家長在家庭後台開啟 Native Camp Review 後，孩子可從自己的首頁進入。畫面、操作、回饋與本功能的家長摘要皆為簡單英文，使用 Lucide 圖示。既有其他活動的語言保持原設定。

首堂 `2026-09-15` 題組含 is/are、odd/even、too many 三個概念，各有三題 Try it 及三題 Say it，共 18 個原創變體。它們是可用題目，不是要求一次全部完成的份量。Try it 依表現約6–9題；Say it 每回一概念，通常2–3題，完成後自行決定是否繼續。

先獨立回答，再核對答案。內容提示標為 With help；重聽問題不算提示。Say it 的 Got it／With help／Not yet 評的是揭曉前表現。提示與揭曉狀態持久保存，重新整理不會把受助回答變成獨立成功。自主答對不能抵掉口說。

## 跨次複習與結果

每個概念的前兩題都首次獨立成功時，第3題最早隔天再出。任一題錯誤或受助，則本次補第3題；即使補題成功，也保留下一次確認。第三題仍不會則提供示範後收尾，不無限加題。

日期沿用 Asia/Taipei。同日重新開啟不提前消耗隔天題目。跨日只剩一題就只問一題；後續確認未獨立成功，留到再下一天。Try it 與 Say it 分開記錄。Done 表示該模式全部概念已完成本次練習量，不等於永久掌握；Review later 不撤銷 Done。

家長摘要從相同的課堂進度計算自主首次獨立答對、受助答對、錯誤及口說三種評級；訂正不覆寫首次結果，未顯示題不進分母。題組首次紀錄與後續複習另存，不能以反覆按鈕灌高首次答對率。

孩子端的完成入口只顯示所選模式的概念狀態；詳細統計集中於家長後台。首頁不再重複宣傳標語或操作段落，實際作答仍保留必要指示與口說評級。沒有新增整份重作，完成後沿用原有跨日確認。

## 家長題目預覽

家長後台的 `Preview questions` 開啟 `docs/nativecamp/preview.html`，可選 Try it／Say it、概念與題目，查看首堂全部18題，包括已做完及尚未排到的變體。題圖與選項／字卡呈現共用 `question-view.js`；可操作選項、排列撤回、核對答案、揭曉與播放聲音。

預覽控制器只保存當頁的操作狀態，不啟動孩子的同步或活動累計。它不修改首次表現、複習日期、答題數或練習分鐘。關閉或重開後不保留預覽答案；回到後台仍保留原 child。老師聲音仍透過既有家庭授權讀取。這是後台入口的用途區分，沒有新增另一層家長帳號權限。

## 資料與聲音

- `docs/nativecamp/lessons/2026-09-15.json`：公開原創題目、答案與聲音引用。
- `docs/nativecamp/audio/`：本機 Microsoft Zira Desktop 產生的固定英文 TTS MP3；練習時不呼叫 TTS 服務。
- `learning-tasks/nativecamp-review-pilot/source/build_nativecamp.py`：題目、TTS 工作及原音片段的重建來源。
- `learning-tasks/nativecamp-review-pilot/source/nativecamp-audio-manifest.json`：音檔文字、來源時間、格式、大小、校驗值與驗證界線。
- `learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json`：本機私人老師片段包，排除 Git。

老師原音為一段完整連續提問，未逐字拼接。來源是已下載錄音的老師聲道，切點經短段本機 ASR 核對；ASR 不等於人工聽辨或發音認證。老師片段透過家庭授權的 `GET /v1/nativecamp-audio/<id>` 讀取，沒有放在 public docs；答案聲音只在揭曉後開放播放。

private 音訊的 KV key 是 `c:nativecamp:audio:<id>`，JSON value 為 `{contentType:"audio/mpeg",base64:"..."}`。它與 progress key 分離；進度不含錄音、登入網址或逐字稿。正式音訊供應需由管理端另行提供私人包，產生包不等於已部署。

## 本機重建與隔離驗證

需 Windows 的 Microsoft Zira Desktop 英文音色、`uv`、`ffmpeg`、`ffprobe`；包含老師片段時需已驗證的私人原錄音。

```powershell
uv run --script learning-tasks/nativecamp-review-pilot/source/build_nativecamp.py --teacher

$env:NATIVE_CAMP_AUDIO_PACK = (Resolve-Path 'learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json').Path
node tests/helpers/serve-family.mjs 8789
```

開啟 `http://127.0.0.1:8789/test/start`，在隔離家長後台開啟 Native Camp Review，再開孩子首頁。本機只使用 `test-token` 與記憶體 KV；不讀寫正式家庭設定或進度。未設定 `NATIVE_CAMP_AUDIO_PACK` 時，隔離伺服器不讀取私人錄音。伺服器停止後，隔離 KV 內的測試紀錄不保留。

## 同步與完成界線

沿用 `sync-v1` 與 `wiring-v1` 的 child 存檔／同步協定。新 app 的外部進度先驗證，再採用；不把壞 payload 當空進度。既有遠端整包採用的衝突語意不變，同時在多裝置改進度仍有既有 LWW 取捨，不能宣稱跨裝置無損合併。

正式發布、iPad 真機與人工驗聽必須另記實際結果；不能以 Node 測試、桌面瀏覽器或音訊轉錄代替。

## 2026-09-17 分支驗收

- 全套 Node 測試372項、pytest 184項通過。Node 含日期邊界、獨立 localStorage／Cookie 的兩裝置、離線重開重連、孩子隔離、壞資料拒絕與私人音訊授權；這些是隔離測試，不代表已測兩台實體 iPad。
- 隔離瀏覽器從家長開啟活動、孩子首頁進入；Try it 實際做8題，涵蓋提示、錯誤、訂正與字卡排列。訂正後原錯誤仍保留；同步不清除已選字卡。三概念分別記為2／1／0、2／0／1、2／0／0（獨立／協助／錯誤），未出第3題不計數。
- Say it 實際測試 too many 一回合，With help、Got it、Not yet 各1；第3題結束即收尾，可離開或另選概念。Try it 為 Done，Say it 整堂仍 In progress；兩者皆保留9月18日的應複習概念。
- 提示與揭曉後重新整理，狀態仍保留；受助口說不能再選 Got it。預製 TTS、揭曉後答案聲音與授權老師片段皆進入 Listening，播放完顯示可重聽；返回頁面後老師聲音仍可重新取得。這是播放功能驗證，未做人工音質判定。
- 家長後台從隔離 Worker 取得相同首次紀錄與口說三評級；沒有將口說與自主合成總分。
- 桌面與820×1180的瀏覽器版面檢查通過；這是平板尺寸模擬，不是 Safari 或 iPad 真機驗收。
- clean-context code／integration review 找到並修正：離頁撤銷音檔後重播快取失效、外部進度接受矛盾完成／提示狀態。補回歸測試，複查無未解決 finding。另把計數用的樹木圖示改為單棵，避免每個圖示含兩棵造成誤判。
- 最後整合修正「See my progress」直接開摘要，並更新新 app／家長入口的 shared script 版本，避免混用舊快取；首頁資源版本亦已重建。瀏覽器未記錄 console error／warning。

目前交付工作分支與本機隔離預覽。尚未正式發布；正式 Worker 尚未載入老師片段。老師原音、人耳音質與孩子難度／完成時間仍待家庭實測。

## 2026-09-17 介面精簡與預覽驗收（#69）

- 全套 Node 測試383項通過，包含兩模式各自的完成頁、家長預覽入口、全部18題切換與作答、音訊失敗重試／離頁釋放，以及預覽不啟動學習紀錄寫入。
- 使用本機現有已完成紀錄檢查新版首頁與 Try it／Say it 概念進度；Done 及隔天複習狀態保留。孩子端沒有家長摘要入口。
- 家長預覽實際操作選擇、排列／撤回、揭曉、TTS 與授權老師原音；操作後返回後台，首次作答、口說評級及活動累計與操作前一致。未清除測試紀錄或重啟本機伺服器。
- fresh code review 找到快速重試可能重複掛載預覽、導致一次點擊播放兩份聲音；已加入載入序號隔離過期回應及回歸測試。獨立複查成功／失敗交錯情境後，沒有未解決 finding。
- 桌面畫面與預覽版面檢查通過，瀏覽器未記錄 console error／warning。這次沒有新增 iPad 真機或人工音質驗收；Python 來源未改，本機不重複 pytest，PR CI 仍執行兩套檢查。
