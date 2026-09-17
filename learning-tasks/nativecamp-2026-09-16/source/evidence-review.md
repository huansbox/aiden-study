# 2026-09-16 Edon：來源核對與出題界線

課程：2026-09-16 19:30，Asia/Taipei，Edon。經已登入課程頁取得同堂回放及網站逐字稿；私人來源網址在 `private/source-metadata.json`，全文在 `private/website-transcript.txt`，不進 Git。

## 原錄音核對

- 原檔：`../assets/audio/2026-09-16-1930-lesson.webm`；25:28.993、11,427,964 bytes、Opus 48 kHz、雙聲道。
- SHA256：`9e6206e13d4975ce39ab2f0860fb0d054207c096e3e1b50fce6bb074bda976b6`。
- 全檔解碼通過。原封包有重疊 DTS，直接匯出 WAV 會報 non-monotonic DTS；查核工具對解碼輸出套用 `asetpts=N/SR/TB`，只正規化輸出時間戳，原始檔未改。取樣起點仍以原回放時間定位；ASR段落時間只是約略範圍，不拿來做精密裁切。
- 本機 faster-whisper 1.2.1／small.en／CPU int8，無 initial prompt，分聲道核對 8:55–9:45、11:58–14:23、16:47–17:37。音訊未上傳；詳細結果在 ignored 的 `private/local-channel-check.json`。
- 這些片段 channel 0 主要是老師提問／示範，channel 1 主要是孩子回答；不是全檔 speaker diarization，不推廣到其他堂課。未做人耳逐字驗聽或發音評分。

## 概念證據

| 範圍 | 網站與原音分聲道核對 | 本次決定 |
| --- | --- | --- |
| 8:55–9:45 short forms；教材p13 | 老師說明 contraction，接著示範 I am／I'm 及 He's eight years old；孩子跟讀。網站 9:09 的 `his` 不應直接當所有格教學或孩子錯誤；本機ASR在後一句能辨識 He's。另透過瀏覽器核對老師分享的教材p13（viewer15），右側Grammar in Use明列 I am→I'm、He is→He's。 | 用原創長句改短句確認 I'm／He's；不把課內跟讀算獨立掌握。 |
| 11:58–14:23 family roles | 老師問 uncle 是母親或父親的兄弟、aunt 是姊妹，之後帶 cousin。分類練習有老師直接給 uncle／son／daughter；孩子聲道有漏字與拉長片段。 | 用可見關係卡，分辨 uncle／aunt／cousin；不從ASR漏字斷言孩子不會。新姓名與關係都是虛構題材，沒有公開家庭實況。 |
| 16:47–17:37 opposites；教材p15 | 可確認 big／small、cold／hot 配對；網站與本機ASR均把另一組轉為 odd／young。另透過瀏覽器核對老師分享的教材p15（viewer17），Word Study／Learn Opposites清楚呈現 old（年長人物）→young（小孩）、cold→hot、small→big。 | 題目採教材已確認的 old／young，不採逐字稿的odd；這是教材核對結果，不宣稱已人耳確認原音old，更不能說孩子讀錯。 |
| 20:25以後動物、感受與朗讀 | 本堂有觸及，但不在本次分聲道抽樣範圍。 | 不湊第四個概念；不做 tortoise 自動發音評分。 |

## 題目與語音

公開題目是原創確認題，並非教材頁重製。[lesson-source.json](lesson-source.json) 保存逐題語音文字，產出的[正式題包](../../../docs/nativecamp/lessons/2026-09-16.json)不含私人來源。

新課共18題，60個新音檔中的36個屬於本堂。全用預製一般 TTS，不裁老師語音，以免老師原句情境／答案提示與新題不符。語速採 Microsoft Zira rate -2；和首堂 rate -1 的同文比較是較慢的設定，不宣稱與每位老師等速。檔案解碼與hash等證據見[音訊manifest](nativecamp-audio-manifest.json)；人耳自然度、iPad與孩子本堂實測須分開記錄，不由ASR或自動tests代替。
