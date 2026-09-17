# 2026-09-14 Edon：來源核對與出題界線

課程：2026-09-14 19:30，Asia/Taipei，Edon。經已登入課程頁取得同堂回放與網站逐字稿；私人網址在 `private/source-metadata.json`，全文在 `private/website-transcript.txt`。不公開孩子姓名、住址線索、家人資料或完整課文。

## 原錄音核對

- 原檔：`../assets/audio/2026-09-14-1930-lesson.webm`；25:30.044、11,825,535 bytes、Opus 48 kHz、雙聲道。
- SHA256：`fbfa899e15fdbe44f84ce91bba3bcf8564915033b0d3caafd3a66be6bb08d8e5`。
- 全檔解碼通過；工具以 `asetpts=N/SR/TB` 正規化解碼輸出時間戳，原始檔未修改。此方式處理同平台錄音可能出現的DTS重疊，不保證ASR段落時間精準到可直接裁切。
- 本機 faster-whisper 1.2.1／small.en／CPU int8，無 initial prompt，分聲道核對 5:04–6:59、10:38–12:31、16:25–17:29。音訊未上傳；詳細結果在ignored的 `private/local-channel-check.json`。
- 抽樣中channel 0主要是老師，channel 1主要是孩子；仍有低音量回答被合成過長段落、漏字或轉错詞。ASR不是人耳驗聽、全檔speaker diarization或發音評分。

## 概念證據

| 範圍 | 網站／分聲道核對 | 本次決定 |
| --- | --- | --- |
| 5:20–5:37 數人數 | 孩子聲道有完整 I can see…／I see… 回答；網站標示six people、three kids、three adults。ASR最後一詞有歧異，不因此判孩子說錯。 | 不再多加counting概念；首堂9/15已練數量，本次保留小份量。 |
| 10:41–12:30 family words | 先示範字詞再請孩子讀；老師明確解釋grandparents是母親／父親的父母。看圖辨識中有老師直接提供brother／grandfather等詞；兩側聲道交叉核對可看出不是每個答案都獨立說出。 | 用關係卡確認grandmother／grandfather／grandparents，不從老師修正句推斷孩子有固定錯誤。 |
| 16:45–17:20 short text topic | 網站有讀house、toys短文。老師先給house示範，孩子跟讀；toys問答也有老師句首提示。原音分聲道片段用來確認提問／示範先後，不把完成句視為未提示回答。 | 用全新兩句短文做主題確認，Say要求It is about…完整句；明示是短文理解，不宣稱已測出獨立看圖預測能力。 |
| 9:43以後朋友描述、19:29以後課文朗讀 | 包含私人名字、開放描述和整段閱讀，沒有在本次全部逐字核實。 | 不拿私人事實出記憶題，不複製教材段落，不把朗讀流暢度當理解或評音證據。 |

## 新題取捨

本堂只選2概念、共12題；題目與虛構人物資料由本次原創。`family-link` 卡清楚顯示關係，`word-card` 提供兩句短文，無須再打開教材；問音會讀必要情境，孩子可以讀或聽。逐題內容與語音文字在 [lesson-source.json](lesson-source.json)。

24個預製一般 TTS音檔採Zira rate -2，完全不放原錄音或複製老師聲音；不把老師的原題和新題情境硬湊。解碼／hash／RMS證據在[音訊manifest](nativecamp-audio-manifest.json)。人耳自然度、iPad、孩子本堂作答時間與難度仍需另記，不能拿生成成功代替。
