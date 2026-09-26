# 2026-09-23 Bianca：來源與查核範圍

本頁只記原始回放的取得、完整解碼與局部雙聲道 ASR 證據。教材／課程線索：Oxford Discover 1，第 116–122 頁。概念選擇與題文判準見 [lesson-brief.md](lesson-brief.md)，公開原創題文見 [lesson-source.json](lesson-source.json)。

## 原始回放

本課是一段完整回放；以下時間均從 track 1 起點計。

下列資料取自 [download-verification.json](download-verification.json)。所有列出的原檔均已下載；每檔記錄為 Opus、2 聲道、48,000 Hz，完整解碼為 passed。解碼檢查使用 `asetpts=N/SR/TB` 正規化輸出的時間軸，不修改原始檔案。這是下載紀錄的核對，本頁整理沒有重新下載或重新解碼。

| track | 私有本機相對路徑 | bytes | 實測秒數 | 完整解碼 |
| --- | --- | ---: | ---: | --- |
| 1 | `../assets/audio/2026-09-23-track-1.webm` | 11,078,294 | 1542.812 | `passed` |

- track 1 SHA256：`790cfdebdc751a1c03ac04a906ee6e989c59172e2b559b4711778941a69917b0`

原檔位於 ignored 的 `assets/audio/`，不隨 Git 提供。SHA256 用於比對來源身分與檔案一致性；解碼通過只能確認檔案可完整解碼，不能證明逐字稿、說話者或內容都已核對。

## 雙聲道 ASR 抽查

本機 `small.en` 報告保存於 ignored 的 `source/private/source-channel-asr.json`，共 6 個時間窗、合計 285 秒（04:45），每個時間窗各有 channel 0 與 channel 1 的辨識片段。所有 sample 的 `sourceSha256` 均與上列對應 track 的下載紀錄一致；兩聲道皆有非零 RMS，但聲音強弱不等於說話者身分。

報告標示 `audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`、`initialPrompt: null`。這是本機分聲道局部 ASR，沒有使用預設逐字稿提示；不把 channel 0／1 固定標成老師／學生，也不把分聲道等同已完成身分分離。

下表摘要只說明教學主題與採用界線，不公開私人逐字轉錄。時間為各 track 的原始偏移。

| track | 抽查區間 | 長度 | 抽查內容與範圍 |
| --- | --- | --- | --- |
| 1 | 06:15–06:55 | 40 秒 | 標題、heading 與 games 線索；支持由標題推知主題的教學範圍。 |
| 1 | 08:25–09:20 | 55 秒 | food、need／want 與特定任務脈絡；不能據此將所有物品永久分成必需／想要。 |
| 1 | 10:20–11:05 | 45 秒 | job、money、farmer、food 與 need／want，涵蓋職業及需求的交界段。 |
| 1 | 11:15–12:00 | 45 秒 | doctor、police、teacher 等職業；支持以人物與作用設計完整句。 |
| 1 | 14:50–15:30 | 40 秒 | job、money、food、water 與需求的綜合討論。 |
| 1 | 22:15–23:15 | 60 秒 | What、Does、have、want 問答，支持兩個問句概念的局部來源。 |

## 與公開內容的映射

| 概念 ID | 網站線索與本機抽樣 | 採用界線 |
| --- | --- | --- |
| job-actions | 網站 02:21–05:47、08:13–16:12；ASR 10:20–11:05、11:15–12:00、14:50–15:30 | 以農夫、醫生、警察、老師的作用另寫題目，不沿用寬鬆口頭分類。 |
| topic-clues | 網站 05:47–08:01；ASR 06:15–06:55 | 局部辨識到 title／heading 與主題線索；新標題及圖像文字均為原創。 |
| need-or-want | 網站 08:13–10:58；ASR 08:25–09:20、10:20–11:05 | 題目以當下任務與能否等待為條件，不把物品名稱本身當作充分判準。 |
| does-have-want | 網站 17:30–19:52、22:03–24:04；ASR 22:15–23:15 | 局部原音支持 Does…have／want；保留問句原形與回答句詞尾的差別。 |
| what-does-want | 網站 17:30–19:52、22:03–24:04；ASR 22:15–23:15 | 局部原音支持 What…want 的問答範圍；不把轉錄句視為孩子獨立表現。 |

不因口頭分類寬鬆而將 farmer 定義為 service job；不沿用來源中不自然的 sneakers 單複數表達。need／want 依每題明示情境判斷。juice 清單與詞性用法的歧義屬於 9/24 另一堂課，未移植到本堂來源紀錄。

## 證據限制

- 網站逐字稿、教材播放與 ASR 都可能有漏字、誤字或 speaker 誤標；以上只支持所列範圍內的課程內容，不支持孩子獨立掌握、發音品質、固定錯誤或提示程度的評分。
- 未抽樣區段仍以 lesson brief 明示的網站線索為依據；沒有宣稱全課逐字核對、全課人耳驗聽或所有說話者都已辨識。
- 原錄音、私人網址、詳細逐字稿及家庭資訊不進公開文件；原創題目不能被當成課堂的逐字引述。
- 正式 TTS 的 manifest、解碼、音文一致與 ASR，以及獨立內容 review、桌面／窄版、iPad、孩子實測與發布，均是另外的驗證。本頁的原音證據不代表這些項目已完成或通過。
