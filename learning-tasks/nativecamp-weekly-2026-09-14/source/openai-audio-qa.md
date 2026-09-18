# 2026-09-14～09-20 Weekly Review OpenAI 語音驗證

2026-09-18：168個一般語音使用 OpenAI Speech API `gpt-4o-mini-tts-2025-12-15`／Cedar／speed 1.0，文字來自已審核的 [speech-jobs.json](speech-jobs.json)。聲音為 AI 合成，只將原創題文送 API；老師／孩子錄音沒有上傳。

- 168檔完整解碼、非靜音、輸入 fingerprint、SHA256、bytes 與音長檢查通過；最終共761.136秒、12,178,176 bytes，詳見 [manifest](nativecamp-audio-manifest.json)。
- `--check` 與不帶 key 的完整重跑均通過：168 skipped、0 API requests，manifest 檔案 hash 未變。
- 本機 `faster-whisper 1.2.1 / small.en` 抽查28檔，涵蓋14個候選概念的問題與完整句答案；[ASR結果](nativecamp-tts-asr.json)均附現行音檔 hash。沒有提供預期文字作辨識 prompt。
- 抽樣涵蓋問句、排列指示、`He's` 縮寫、數字、親屬所有格及列舉句。字詞內容符合；辨識文字有數字／英文拼法、大小寫、`Jo`／`Joe`、`mum`／`mom` 及標點差異。列舉項目與順序完整，答案未多唸標點名稱；不由 ASR 標點宣稱停頓長度或口音完全相同。
- `week-too-many-try-1-q` 原檔在整段及最後4／7秒三次 ASR 都漏掉 `Start with There.`；保持文字及全部語音設定不變，精確重製一次，替代檔 ASR 已辨識完整尾句。前後 hash、原辨識與處置見 [尾段查核紀錄](nativecamp-tts-tail-asr.json)及 manifest 的 `repairs`。
- 累計169次實際請求、169次成功回應，含上列1次有依據的重製。binary response 沒有回傳 token usage，usage／實際帳單未知；秒數及請求數不是實際費用。

共用語音工具21項 Python 離線測試及音訊／六包內容27項 Node 測試通過。重建入口見[共用工具](../../shared/nativecamp/README.md#openai-語音製作)。瀏覽器播放、正式資源核對由主 issue 整合驗收；本檔不宣稱已正式發布。人耳完整聽辨、iPad 真機與孩子實測未執行，ASR 不代替自然度或發音驗收。

## 五堂與首週包彙總

下列秒數為目前保留的音檔長度；請求數包含兩個已被替換的初版，不應以359個保留檔案推算成359次付費請求。

| 題包 | 音色 | 保留音檔 | 實際請求／成功回應 | 最終音長（秒） | ASR抽樣檔案 |
| --- | --- | ---: | ---: | ---: | ---: |
| 2026-09-13 | Marin | 48 | 49 | 262.656 | 8 |
| 2026-09-14 | Cedar | 24 | 24 | 89.592 | 4 |
| 2026-09-15 | Marin | 35 | 35 | 115.656 | 6 |
| 2026-09-16 | Cedar | 36 | 36 | 106.416 | 6 |
| 2026-09-17 | Marin | 48 | 48 | 247.872 | 8 |
| 首週包 | Cedar | 168 | 169 | 761.136 | 28 |
| 合計 | — | 359 | 361 | 1583.328 | 60 |

最終359檔共25,333,248 bytes、26分23.328秒。361次請求均收到成功回應；實際帳單未知。60個不同音檔的 ASR 抽樣不代表全359檔已逐字人工聽辨。
