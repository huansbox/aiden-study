# 2026-09-16 OpenAI 語音替換驗證

2026-09-18：36個一般語音改用 OpenAI Speech API `gpt-4o-mini-tts-2025-12-15`／Cedar／speed 1.0。題文、題目 ID、檔名、課程題包與進度沒有變動。聲音為 AI 合成，只有原創題文送到 API，私人課堂錄音未上傳。

- 實際送出36次請求、36次成功；共106.416秒、1,702,656 bytes。binary response 沒有回傳 token usage，實際帳單未知；不是免費生成聲明。
- 每檔完整解碼、非靜音、輸入 fingerprint、SHA256 與音長均通過，詳細見 [manifest](nativecamp-audio-manifest.json)。
- 不帶 key 完整重跑：36 skipped、0 API requests；builder `--check` 確認課程 JSON 與 speech jobs 仍對應原題文。
- 本機 `faster-whisper 1.2.1 / small.en` 抽查6段，內容一致；ASR 將 `mum` 寫成 `mom`、`six` 寫成 `6`，不據此宣稱口音完全一致。[ASR結果](nativecamp-tts-asr.json)附音檔 SHA256，不提供預期答案作 prompt，未上傳音訊。
- 本次 Node 音訊與三堂內容檢查16項通過；共用語音工具的21項離線測試通過，涵蓋 HTTP 短讀、失敗續跑、半檔保護、秘密遮蔽、重跑不重製與清單同步。

重建與檢查入口見[共用工具](../../shared/nativecamp/README.md#openai-語音製作)。原速／慢速比較保留為歷史實驗。瀏覽器播放、正式發布資源核對由主 issue 整合驗收；本檔不宣稱已正式發布。人耳完整聽辨、iPad 真機與孩子實測未執行，ASR 不代替自然度或發音驗收。
