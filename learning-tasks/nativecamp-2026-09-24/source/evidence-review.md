# 2026-09-24 Mia：來源與查核範圍

本頁只記原始回放的取得、完整解碼與局部雙聲道 ASR 證據。教材／課程線索：野餐計畫、需求、人與動作、故事交易與偏好；概念依 lesson brief 的 track 2 時間回查。概念選擇與題文判準見 [lesson-brief.md](lesson-brief.md)，公開原創題文見 [lesson-source.json](lesson-source.json)。

## 原始回放

兩段回放皆已下載並完整解碼。track 1 是介紹與教材設定；track 2 是主要教學。兩段各自從 00:00 計時，不把 track 1 長度加到 track 2 的時間上。track 2 以檔案測得的 1268.505 秒（21:08.505）為準。

下列資料取自 [download-verification.json](download-verification.json)。所有列出的原檔均已下載；每檔記錄為 Opus、2 聲道、48,000 Hz，完整解碼為 passed。解碼檢查使用 `asetpts=N/SR/TB` 正規化輸出的時間軸，不修改原始檔案。這是下載紀錄的核對，本頁整理沒有重新下載或重新解碼。

| track | 私有本機相對路徑 | bytes | 實測秒數 | 完整解碼 |
| --- | --- | ---: | ---: | --- |
| 1 | `../assets/audio/2026-09-24-track-1.webm` | 1,670,194 | 237.902 | `passed` |
| 2 | `../assets/audio/2026-09-24-track-2.webm` | 9,100,989 | 1268.505 | `passed` |

- track 1 SHA256：`ff346a58a0ae5e6354f710591f3b3b07385cb85fff11614cae7f15ad0ffe9f9f`
- track 2 SHA256：`23fe81fde28bd6725b19c6eaace6878d5a9255fd7d56818038af5ab404738072`

原檔位於 ignored 的 `assets/audio/`，不隨 Git 提供。SHA256 用於比對來源身分與檔案一致性；解碼通過只能確認檔案可完整解碼，不能證明逐字稿、說話者或內容都已核對。

## 雙聲道 ASR 抽查

本機 `small.en` 報告保存於 ignored 的 `source/private/source-channel-asr.json`，共 8 個時間窗、合計 367 秒（06:07），每個時間窗各有 channel 0 與 channel 1 的辨識片段。所有 sample 的 `sourceSha256` 均與上列對應 track 的下載紀錄一致；兩聲道皆有非零 RMS，但聲音強弱不等於說話者身分。

報告標示 `audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`、`initialPrompt: null`。這是本機分聲道局部 ASR，沒有使用預設逐字稿提示；不把 channel 0／1 固定標成老師／學生，也不把分聲道等同已完成身分分離。

下表摘要只說明教學主題與採用界線，不公開私人逐字轉錄。時間為各 track 的原始偏移。

| track | 抽查區間 | 長度 | 抽查內容與範圍 |
| --- | --- | --- | --- |
| 1 | 03:15–03:50 | 35 秒 | 第一段末尾的教材與標題設定；用於確認兩段接續的課程脈絡，不當作主要教學全文。 |
| 2 | 00:58–01:43 | 45 秒 | 第二段的食物／飲料與 eat／drink，可辨識 juice 等例子。 |
| 2 | 07:20–08:02 | 42 秒 | need／want 清單，含 juice；不能單獨據此確定 juice 永遠屬於需要或想要。 |
| 2 | 09:25–10:10 | 45 秒 | 野餐需求與清單討論，包含 water、need／want；與前段清單共同回查。 |
| 2 | 11:25–12:20 | 55 秒 | person／place／thing、action、noun／verb 與職業例子，是詞性教學的局部抽查。 |
| 2 | 14:00–14:45 | 45 秒 | 故事對話中的 my／your 與 want；只記語法關係，不公開私人偏好或長篇原文。 |
| 2 | 17:30–18:05 | 35 秒 | prefer 與 lemon candy 的偏好教學。 |
| 2 | 18:55–20:00 | 65 秒 | 調查後以 want／need 說明人物需求的段落；來源中的個人回答不公開。 |

## 與公開內容的映射

| 概念 ID | 網站線索與本機抽樣 | 採用界線 |
| --- | --- | --- |
| eat-and-drink | track 2 網站 00:07–01:40、02:05–03:25；ASR 00:58–01:43 | 以新食物／飲料情境練完整句；原文朗讀不等於獨立口說。 |
| picnic-plan | track 2 網站 03:58–08:30、08:42–10:54；ASR 07:20–08:02、09:25–10:10 | 採題卡 must bring／nice to have 的明示計畫，不以來源中前後不同的 juice 分類作答案依據。 |
| report-wishes | track 2 網站 18:37–20:32；ASR 18:55–20:00 | 採虛構角色原話與第三人稱轉述，不公開家庭實際需求。 |
| people-and-actions | track 2 網站 11:25–13:27；ASR 11:25–12:20 | 局部原音支持人與動作的區分；題目改練完整句與詞尾，不對有歧義的 home 用法做名詞判分。 |
| my-and-your | track 2 網站 14:02–17:11；ASR 14:00–14:45 | 保留說話者、聽者與所有者關係，另寫物品與交易情境。 |
| prefer-more | track 2 網站 17:29–18:02；ASR 17:30–18:05 | 局部原音支持 prefer 表達喜好；題卡給定虛構偏好。 |

juice 在來源清單與後續接受的分類不一致，維持 lesson brief 的情境判準，不宣稱飲料種類能永久決定 need／want。Nick runs home 中的 home 表示方向，本包不將它設為名詞正解；詞性概念改為明確的人與動作句。不上升為「汽水不好所以只能 want」等額外價值判斷。

## 證據限制

- 網站逐字稿、教材播放與 ASR 都可能有漏字、誤字或 speaker 誤標；以上只支持所列範圍內的課程內容，不支持孩子獨立掌握、發音品質、固定錯誤或提示程度的評分。
- 未抽樣區段仍以 lesson brief 明示的網站線索為依據；沒有宣稱全課逐字核對、全課人耳驗聽或所有說話者都已辨識。
- 原錄音、私人網址、詳細逐字稿及家庭資訊不進公開文件；原創題目不能被當成課堂的逐字引述。
- 正式 TTS 的 manifest、解碼、音文一致與 ASR，以及獨立內容 review、桌面／窄版、iPad、孩子實測與發布，均是另外的驗證。本頁的原音證據不代表這些項目已完成或通過。
