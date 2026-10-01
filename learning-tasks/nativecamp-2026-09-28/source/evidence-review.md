# 2026-09-28：原回放來源與查核範圍

本頁記錄原檔身分、完整解碼及本機 ASR 的實際範圍。詳細轉錄、私人頁面與原音只保存在 ignored 路徑；本頁僅摘要教學內容，不記錄孩子掌握度或家庭實情。

## 原始回放

以下資料來自 [download-verification.json](download-verification.json)。原檔均為 Opus、2 聲道、48,000 Hz，全部完整解碼通過；以 `asetpts=N/SR/TB` 正規化解碼輸出的時間軸，未修改原始 bytes。各 track 時間獨立從零起算，不將斷線前後視為無缺口的連續錄音。

| track | 私有相對路徑 | bytes | 實測秒數 | 完整解碼 |
| --- | --- | ---: | ---: | --- |
| 1 | `../assets/audio/2026-09-28-track-1.webm` | 7,752,399 | 1064.543 | passed |
| 2 | `../assets/audio/2026-09-28-track-2.webm` | 15,128 | 1.760 | passed |
| 3 | `../assets/audio/2026-09-28-track-3.webm` | 3,036,819 | 417.075 | passed |

- track 1 SHA256：`840dabd70dba58d88aef7e3d55bf3e8fce334c2e33c72123bd820c9a9cb9433b`
- track 2 SHA256：`9073f18b43273c0d916411abe404226b3bdb598aad3b8daec09fce4503a0b1fe`
- track 3 SHA256：`96a3fd525b29d8b5d293e0a2e93940fd8abfedbbacea3289af53547d3062e5ba`

原檔在 `assets/audio/`；完整 ffprobe 與解碼結果在 `source/private/source-qa-track-<track>-technical.json`。下載成功與解碼通過只確認檔案身分及可讀性，不能證明逐字稿與說話者標示正確。

## 雙聲道 ASR 抽查

已完成 6 個時間窗，設定長度累加 829 秒（重疊區間未去重）。每窗各辨識兩聲道，來源 hash 均與上列原檔相符；兩聲道皆有非零 RMS。詳細結果在 `source/private/source-channel-asr.json`，樣本在 `assets/audio/samples/`。

工具為已快取的 faster-whisper 1.2.1／small.en、CPU int8，`local_files_only=True`、無 initial prompt，沒有上傳音檔或下載模型。報告分別記錄 `audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`、`pronunciationAssessment: false`。channel 0／1 只表示聲道，不自動等於老師／學生。

| track | 原始時間窗 | 秒數 | 查核到的教學內容及採用界線 |
| --- | --- | ---: | --- |
| 1 | 02:45–03:37 | 52 | 兩聲道均有 Discover 2 的書本層級線索，接著確認 Unit 1、Get ready、page 6；完整書名仍須與課程頁面核對。 |
| 1 | 09:10–12:10 | 180 | mammal 舉例、bird／egg 對比、amphibian 的 land／water，以及 scales 與動物例子。只採教學範圍，不把課上的概括當成無例外的科學定律。 |
| 1 | 12:10–13:50 | 100 | 以 gills 說明 fish use to breathe；接著用 wings 說明功能。分聲道結果補出混音未清楚辨識的 fly，不推論所有鳥都能飛。 |
| 1 | 13:42–17:44 | 242 | skin／fur 的比較、cat／dog 的 fur 例子，以及尾段 humans 的動物分類問題；不由局部轉錄判斷孩子是否答對。 |
| 3 | 02:20–05:40 | 200 | 區分 skin／scales／fur／feathers 等身體覆蓋物與 mammal／amphibian 等類別；其後更正『只有魚有鰓』，舉幼年蛙及其他水生動物。 |
| 3 | 06:00–06:55 | 55 | 以 amphibians 串接 land／water，之後是收尾對話。公開題目可使用已限定的蛙情境，不把簡化說法擴成所有生命階段皆相同。 |

## 補足網站缺少的前段線索

網站提供的逐字稿僅對應 track 3，不能據此省略 track 1。本次另將 track 1 全段解碼成 mono，以同一個無 prompt 本機模型完成 205 段混音 ASR；解碼音長 1064.5935 秒，報告位於 `source/private/source-qa-track-1-full-mixed-asr.json`。這是全段混音辨識，加上上述關鍵區間分聲道抽查，不是全課逐字人工核對。

混音前段補出的內容包括：02:40–03:37 換書、Discover 2／Unit 1／page 6 線索；03:32–06:17 動物圖片、gazelle 與可見特徵、喜好及理由；06:31–07:14 陸地與海洋最大動物的對比；07:27 後跳過影片並切到下一頁。書本層級及頁碼另由分聲道窗核對，完整書名仍以課程頁面為準。寒暄、實際家庭資訊與個人喜好不納入公開題文。

track 2 僅 1.760 秒，保留原檔與技術驗證，沒有將它當作足以判讀教學內容的樣本。各軌間缺口不補寫，也不拿缺漏或 ASR 漏字推論孩子不會。

track 3 約 04:59–05:39 的轉錄包含主動更正：先前『只有魚有鰓』的概括不正確。公開練習應保留鰓與呼吸的功能關係，避免重複錯誤概括；同樣不從課上簡化說法推導『所有哺乳類不生蛋』、『所有鳥都能飛』或把覆蓋物當分類名稱。

## 證據限制

- ASR 仍有單字誤辨、漏字、長時間合併成一句，以及部分輸出時間戳超出樣本末端的情況；查核範圍仍以上表實際取樣窗為限，不按模型時間戳延長。聲道強弱、網站 speaker 標籤或老師稱讚都不能單獨證明孩子獨立答對；不宣稱每個辨識詞都有精確人工時間戳。
- 只由題目、示範、跟讀與更正等可觀察片段界定教學範圍；未核對的片段、提示程度、發音、掌握度及課本頁面均不自行補推。
- 錄音中的一般化陳述不是科學或語文正確性的保證；新題須另確認情境、答案及例外，且使用原創角色與材料。
- 本頁不代表人耳全檔驗聽、TTS 音文核對、獨立題文審查、瀏覽器／iPad 或孩子實測已完成；這些驗證分別留存。
