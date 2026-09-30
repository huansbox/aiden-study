# 2026-09-19 Zibuyile：來源與查核範圍

本堂網站逐字稿指出教材書本第 102–103 頁（檔案頁約 104 起），主要是水果、pit／seeds、把雙方數量合併與完整問答，最後有標點用途。網站回放分三軌，第二與第三軌高度重疊，不能算成兩次獨立教學或孩子兩次練習。

本文件根據已存在的 [download-verification.json](download-verification.json) 與 ignored `source/private/source-channel-asr.json` 整理，不重新下載、不上傳課堂錄音、不公開完整逐字稿。原音核對與公開合成語音的驗證分開。

## 原回放

| track | 私有本機相對路徑 | bytes | 實測秒數 | 完整解碼 |
| --- | --- | ---: | ---: | --- |
| 1 | `../assets/audio/2026-09-19-zibuyile-track-1.webm` | 8,029,001 | 1146.419 | passed |
| 2 | `../assets/audio/2026-09-19-zibuyile-track-2.webm` | 1,602,667 | 225.241 | passed |
| 3 | `../assets/audio/2026-09-19-zibuyile-track-3.webm` | 1,604,001 | 225.465 | passed |

- track 1 SHA256：`44871dea7858664a5607318b470ed1c6541f1599c41d95cd07e9cad007cae24e`
- track 2 SHA256：`9899570da7309d13c869dc4c24dfb4c52c57dce8014dbcd386d89f7a21cfb264`
- track 3 SHA256：`c79a70c747ea31d48a73e80bf9d0ebdb8b44cbd58f59d876dfcbcdff7c95e0e5`

所有檔案均為 Opus、2 聲道、48,000 Hz，完整解碼檢查使用 `asetpts=N/SR/TB` 正規化輸出時間軸，原檔不改。SHA256／解碼通過僅確認檔案可回查與完整解碼，不能證明每句話或所有 speaker 都已辨識。原檔存於 ignored 的 assets/audio。

## 本機抽樣

共 7 個時間窗，取樣窗長合計 580 秒，每窗分別辨識兩個聲道；本數字包含重疊來源，不等於獨立教學或孩子作答時間。模型為 small.en，`initialPrompt: null`、`audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`。全部 sample 的 sourceSha256 與對應 track 一致，兩聲道均有非零 RMS；不把任一聲道永久指定為老師或孩子。

| track | 來源偏移 | 窗長（秒） | 抽樣聲道 |
| --- | --- | ---: | --- |
| 1 | 08:40–10:00 | 80 | channel 0、channel 1 |
| 1 | 15:15–16:20 | 65 | channel 0、channel 1 |
| 1 | 17:40–18:45 | 65 | channel 0、channel 1 |
| 2 | 00:25–01:55 | 90 | channel 0、channel 1 |
| 2 | 02:00–03:35 | 95 | channel 0、channel 1 |
| 3 | 00:25–01:55 | 90 | channel 0、channel 1 |
| 3 | 02:00–03:35 | 95 | channel 0、channel 1 |

- track 1 08:40–10:00 可辨認 pit／seeds、tomato、cucumber、avocado 及 has 的教學。mango／peach 的對應仍依網站 10:28–11:21 線索，不宣稱在此窗逐字核對。
- track 1 15:15–16:20 包含雙方各有數量、合計與加法；17:40–18:45 直接包含 I have、you have、How many、plus／equals 及 We have 等完整句框架。
- track 2 和 3 的 00:25–01:55，在相近偏移可辨認高度重疊的水果數量與同一教學順序；02:00–03:35 也出現相同標點教學。原檔 bytes／SHA256 不同，只能說內容高度重疊，沒有把三軌長度相加當成不重複課長，也未宣稱兩檔位元完全相同。
- 低音量聲道局部辨識漏字或把水果詞辨成其他詞，不能推定孩子沒有說、說錯或不會。也不能把網站標成學生的教材播放段當作孩子自主輸出。

## 採用界線

開場家庭姓名、實際年級／喜好與其他私人對話不納入。水果名稱不另拆單字配對，加法不另拆純算術概念。track 2／3 約 02:00–03:35 的句點／問號／驚嘆號教學列入來源記錄，但不硬改成說出標點名稱的口說組，避免低難度與六題重複。

概念與網站／ASR 時間對應見 [lesson-brief.md](lesson-brief.md)。公開題文全為原創，只沿用受支持的能力與句型；不用私人生活資料，也不逐字再現教材故事或歌曲。沒有宣稱全課人耳驗聽、逐字核對、所有說話者分離或孩子能力／發音評分。

正式 TTS 的 manifest、音文一致、無提示 ASR、獨立 review、桌面／窄版與發布核對，均由本批整合結果另記；本來源證據不代表這些項目已完成。
