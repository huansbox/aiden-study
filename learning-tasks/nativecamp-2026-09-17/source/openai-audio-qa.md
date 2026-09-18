# 2026-09-17 OpenAI 語音驗證

2026-09-18：48個一般語音使用 OpenAI Speech API `gpt-4o-mini-tts-2025-12-15`／Marin／speed 1.0，文字來自已審核的 [speech-jobs.json](speech-jobs.json)。聲音為 AI 合成，只將原創題文送 API；老師／孩子錄音沒有上傳。

- 48檔完整解碼、非靜音、輸入 fingerprint、SHA256、bytes 與音長檢查通過；共247.872秒、3,965,952 bytes，詳見 [manifest](nativecamp-audio-manifest.json)。
- `--check` 與不帶 key 的完整重跑均通過：48 skipped、0 API requests，manifest 檔案 hash 未變。
- 本機 `faster-whisper 1.2.1 / small.en` 抽查8檔，涵蓋每概念的問題與完整句答案，包括用品用途、合計數量、正在數數、相同年齡；[ASR結果](nativecamp-tts-asr.json)均附音檔 hash。沒有提供預期文字作辨識 prompt。
- 抽樣字詞內容一致；完整句、`I'm` 縮寫、問句及句尾 `Start with` 指示皆有辨識到。差異為 `eleven`／`11`、大小寫與逗號；ASR 的標點不能證明停頓長度或自然度。
- 實際48次請求、48次成功回應，未額外重製。binary response 沒有回傳 token usage，usage／實際帳單未知；秒數及請求數不是實際費用。

共用語音工具21項 Python 離線測試及音訊／六包內容27項 Node 測試通過。重建入口見[共用工具](../../shared/nativecamp/README.md#openai-語音製作)。瀏覽器播放、正式資源核對由主 issue 整合驗收；本檔不宣稱已正式發布。人耳完整聽辨、iPad 真機與孩子實測未執行，ASR 不代替自然度或發音驗收。
