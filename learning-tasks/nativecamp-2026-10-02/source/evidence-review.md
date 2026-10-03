# 2026-10-02：原回放來源與查核範圍

本頁記錄原檔身分、完整解碼及本機 ASR 的實際範圍。私人課程頁、網站逐字稿與原錄音只保存在 ignored 路徑；本頁只摘要教學範圍，不記錄家庭實情或判定孩子掌握度。

## 原始回放

課程頁顯示一段回放，播放器長度 25:29。實際下載結果見 [download-verification.json](download-verification.json)：

| track | 私有相對路徑 | bytes | 實測秒數 | 格式 | 完整解碼 |
| --- | --- | ---: | ---: | --- | --- |
| 1 | `../assets/audio/2026-10-02-1930-lesson.webm` | 5,476,527 | 1,529.280 | Opus、2 聲道、48,000 Hz | passed |

SHA256：`95eecc3a20b6c3bbe20023a8424aca335816035827e5e2a496ce3936498a2510`

完整解碼以 `asetpts=N/SR/TB` 正規化輸出時間軸，沒有修改原始 bytes；ffprobe 與解碼結果在 `source/private/source-asr-track-1-technical.json`。上述結果只確認檔案身分、長度及可讀性，不代表逐字稿或說話者標籤正確。

網站逐字稿和課堂教材線索指向 Oxford Discover 1 Unit 14、pages 136–140；私人來源摘要另存 `source/private/web-source-notes.md`。本輪沒有逐頁擷取課本圖像，題目情境應自行提供可見事實，不能要求孩子記得未呈現的教材插圖。

## 雙聲道抽查

本機完成 8 個不重疊時間窗，共 388 秒，每窗分別辨識兩聲道；共 776 聲道秒。樣本在 `assets/audio/samples/`，完整 ASR 在 `source/private/source-asr-channels.json`。所有樣本的來源 hash 均符合上列原檔，兩聲道皆有非零 RMS 且內容並非完全相同。

工具為 faster-whisper 1.2.1／small.en、CPU int8、4 threads，`local_files_only=True`、無 initial prompt。沒有上傳錄音或下載模型；依賴套件首次執行時由工具安裝。報告明示 `audioUploaded: false`、`humanListening: false`、`speakerDiarization: false`、`pronunciationAssessment: false`。

| 原始時間窗 | 秒數 | 查核到的教學內容 | 採用界線 |
| --- | ---: | --- | --- |
| 03:08–03:33 | 25 | department store／orchard 的示範與重複。 | 有先示範的脈絡，不能把後續重複當成獨立詞彙掌握；學生聲道對 orchard 的 ASR 不可靠。 |
| 08:50–10:28 | 98 | city／country 的差異問答；老師明示 building is／buildings are，以及多數 people 搭配 are。 | 支持練單複數與完整描述句；不能把教材的城市／鄉村例子推廣為所有地方都如此。 |
| 13:00–13:42 | 42 | 比較兩個故事角色的寵物與喜愛顏色。 | 老師逐項問答並確認；可用原創角色和資訊卡練比較，不能聲稱未經提示獨立完成整段比較。 |
| 14:43–15:49 | 66 | 角色住在 city／country，以及 small apartment／big house；老師明示 lives。 | 對學生聲道的 lives／lived 辨識有歧義，不能把 ASR 字尾當成可確定錯誤。 |
| 16:07–16:35 | 28 | 問答對比 noisy／quiet 的居住環境。 | 用題內可見情境界定答案，不靠 city 必定 noisy、country 必定 quiet 的刻板規則。 |
| 19:25–19:53 | 28 | 教材故事播放中，角色到 cornfield 吃 corn、到 orchard 吃 apples。 | 是教材朗讀，不是孩子回答；本取樣沒有涵蓋完整 too plain 句，不宣稱該句已由此窗核對。 |
| 21:28–22:17 | 49 | 教材故事播放中的危險事件、逃跑與 safe／too dangerous for me 的描述。 | 是故事角色觀點及情境，不是地區安全事實；也不是孩子獨立口說的證據。 |
| 23:28–24:20 | 52 | 喜好問答及老師示範 I like／I don't like 的正反對比。 | 家庭喜好不放入題目或公開紀錄；新題用虛構角色或題內指定的偏好。 |

## 聲道、提示與不確定性

- 此檔的對話抽樣中，channel 0 多為老師問句、說明與確認，channel 1 多為回答；這是依內容作的局部觀察，沒有執行 speaker diarization，也不能套用到其他回放。
- 教材播放段主要出現在 channel 1，而網站逐字稿卻多標為「講師」。不能用聲道號或網站標籤判斷故事朗讀是孩子回答；本頁已將兩者分開。
- ASR 存在單字誤辨、漏字、長片段合併，以及部分輸出時間戳超出取樣末端的情況。實際查核範圍以上表取樣起訖為準，不按模型時間戳延長，也不把辨識失敗用作發音評分。
- 教師示範、糾正、追問與稱讚只用來界定課內內容及提示脈絡。尚未核對的片段、獨立作答程度和長期掌握度均不自行推論。
- 本頁不代表人耳全檔驗聽、TTS 音文核對、獨立題文審查、瀏覽器／iPad 或孩子實測已完成；各項驗證分別記錄。
