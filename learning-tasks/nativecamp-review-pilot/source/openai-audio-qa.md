# 2026-09-15 OpenAI 語音替換驗證

2026-09-18：35個一般語音改用 OpenAI Speech API `gpt-4o-mini-tts-2025-12-15`／Marin／speed 1.0。題文、題目 ID、檔名、課程題包與進度沒有變動；老師問題 `too-many-say-3` 的原音仍沿用原私人路徑，manifest 的老師片段證據保留。

- 聲音為 AI 合成，只有原創題文送 API，沒有上傳老師／孩子錄音。[speech-jobs.json](speech-jobs.json)保存35段原創題文，不包含私人老師提問。
- 實際送出35次請求、35次成功；共115.656秒、1,850,496 bytes。binary response 沒有回傳 token usage，實際帳單未知；不是免費生成聲明。
- 每檔完整解碼、非靜音、輸入 fingerprint、SHA256 與音長均通過，詳細見 [manifest](nativecamp-audio-manifest.json)。
- 不帶 key 完整重跑：35 skipped、0 API requests。
- 本機 `faster-whisper 1.2.1 / small.en` 抽查6段，字詞內容一致；`Six` 被辨識為 `6`。[ASR結果](nativecamp-tts-asr.json)附音檔 SHA256，不提供預期答案作 prompt，未上傳音訊。
- 本次 Node 音訊與三堂內容檢查16項通過；共用語音工具的21項離線測試通過，涵蓋 HTTP 短讀、失敗續跑、半檔保護、秘密遮蔽、重跑不重製與清單同步。

重建與檢查入口見[共用工具](../../shared/nativecamp/README.md#openai-語音製作)。舊 `build_nativecamp.py` 是 SAPI 歷史生成器，不用它重建目前一般音訊或 manifest。瀏覽器播放、正式發布資源核對由主 issue 整合驗收；本檔不宣稱已正式發布。人耳完整聽辨、iPad 真機與孩子實測未執行，ASR 不代替自然度或發音驗收。
