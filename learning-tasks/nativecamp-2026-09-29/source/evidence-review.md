# 2026-09-29：原回放來源與查核範圍

本頁記錄原檔身分、完整解碼及本機 ASR 的實際範圍。詳細轉錄、私人頁面與原音只保存在 ignored 路徑；本頁僅摘要教學內容，不記錄孩子掌握度或家庭實情。

## 原始回放

以下資料來自 [download-verification.json](download-verification.json)。原檔均為 Opus、2 聲道、48,000 Hz，全部完整解碼通過；以 `asetpts=N/SR/TB` 正規化解碼輸出的時間軸，未修改原始 bytes。各 track 時間獨立從零起算，不將斷線前後視為無缺口的連續錄音。

| track | 私有相對路徑 | bytes | 實測秒數 | 完整解碼 |
| --- | --- | ---: | ---: | --- |
| 1 | `../assets/audio/2026-09-29-track-1.webm` | 10,824,255 | 1523.501 | passed |

- track 1 SHA256：`35c8bd6257cbdffe8a295abfea6a9b569c26db228e0863994130784aea564ccc`

原檔在 `assets/audio/`；完整 ffprobe 與解碼結果在 `source/private/source-qa-track-<track>-technical.json`。下載成功與解碼通過只確認檔案身分及可讀性，不能證明逐字稿與說話者標示正確。

## 雙聲道 ASR 抽查

已完成 5 個時間窗，設定長度累加 703 秒（重疊區間未去重）。每窗各辨識兩聲道，來源 hash 均與上列原檔相符；兩聲道皆有非零 RMS。詳細結果在 `source/private/source-channel-asr.json`，樣本在 `assets/audio/samples/`。

工具為已快取的 faster-whisper 1.2.1／small.en、CPU int8，`local_files_only=True`、無 initial prompt，沒有上傳音檔或下載模型。報告分別記錄 `audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`、`pronunciationAssessment: false`。channel 0／1 只表示聲道，不自動等於老師／學生。

| track | 原始時間窗 | 秒數 | 查核到的教學內容及採用界線 |
| --- | --- | ---: | --- |
| 1 | 04:10–06:40 | 150 | 依圖片說明 clapping、legs crossed、facing each other，以及 school／playground 位置；出現要求完整句與示範句。 |
| 1 | 07:35–09:00 | 85 | 用書本分送及教室清潔描述協助，包含 help 與 by mopping 的表達。 |
| 1 | 09:20–10:58 | 98 | 以 and 連接兩個協助動作，含完整句示範與跟讀指令；公開素材改用虛構角色，不保存家庭實情。 |
| 1 | 14:25–17:50 | 205 | 以 bow、please、thank you 說明 polite；其後以學校管理角色說明 principal。 |
| 1 | 20:40–23:25 | 165 | 以讓座及等待情境比較 polite／patient，另有 clean up、lifeguard／crossing guard 的場所與行為對應；不由重述或受提示片段推定獨立掌握。 |

## 證據限制

- ASR 仍有單字誤辨、漏字、長時間合併成一句，以及部分輸出時間戳超出樣本末端的情況；查核範圍仍以上表實際取樣窗為限，不按模型時間戳延長。聲道強弱、網站 speaker 標籤或老師稱讚都不能單獨證明孩子獨立答對；不宣稱每個辨識詞都有精確人工時間戳。
- 只由題目、示範、跟讀與更正等可觀察片段界定教學範圍；未核對的片段、提示程度、發音、掌握度及課本頁面均不自行補推。
- 錄音中的一般化陳述不是科學或語文正確性的保證；新題須另確認情境、答案及例外，且使用原創角色與材料。
- 本頁不代表人耳全檔驗聽、TTS 音文核對、獨立題文審查、瀏覽器／iPad 或孩子實測已完成；這些驗證分別留存。
