# Native Camp 課後複習：2026-09-09 Emi

2026-09-22 追加新版 Try it：每概念 Build／Change／Fix 各一題，尚未開始才用新版，已作答原題與 Say it 保留。Preview 可切 Updated／Original；目前音訊總數以 manifest 為準。新版題量、語音與驗收見 [改版紀錄](../../docs-dev/nativecamp-try-variety.md) 與 [全新版音檔 ASR](source/nativecamp-variety-asr.json)。以下保留原版交付證據。

課程為 2026-09-09 20:00（Asia/Taipei），Emi。題包、語音、獨立 review、逐題 Preview、隔離孩子作答與家長摘要驗收皆完成；正式發布與線上核對見 [#99](https://github.com/huansbox/aiden-study/issues/99) 及其關聯 PR。任務狀態以 [任務登錄](../catalog.json) 為準。

依 [製作 SOP](../nativecamp-review-pilot/lesson-sop.md) 製作 4 個概念、24 題：Ask a question、Name it、My day、An animal day。每概念各 3 題完整句排列與 3 題口說，排列通常 1 張合理混淆。重點是 Who／What 完整問句、命名句，以及虛構日程與故事動物的完整作息句。 正式音訊為 48 個 OpenAI Marin 問題／答案 MP3，speed 1.0；同堂同聲，重播不呼叫 API。

可編輯來源為 [source/lesson-source.json](source/lesson-source.json)。從 repo 根目錄執行 `uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-09`，產生 `docs/nativecamp/lessons/2026-09-09.json` 與 `source/speech-jobs.json`；加 `--check` 僅比對，不製作或覆寫音檔。

- [設計與家長判準](source/lesson-brief.md)；[來源與出題界線](source/evidence-review.md)
- [整合驗收紀錄](source/qa.md)；[音訊 manifest](source/nativecamp-audio-manifest.json)
- [全部 24 個問題音檔 ASR](source/nativecamp-questions-asr.json)；[8 筆問題／答案 ASR 樣本](source/nativecamp-tts-asr.json)
- [共用建置與音訊工具](../shared/nativecamp/README.md)；[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-09)

本次三堂共 144 個有效 MP3，hash、完整解碼與輸入 fingerprint 均通過；本堂實際 API 請求 49 次，含已辨識問題後的重製。三堂 Node 測試 555 項通過，Python 258 項通過、1 項略過，source builder 比對通過。三堂 72 題 Preview 皆已逐題揭曉；使用者操作允許播放後未見播放錯誤，Preview 專項前後的隔離 Native Camp 進度仍為 rev 0／data null。

詳細私人網址、逐字稿摘記與請求日誌留在 ignored 的 `source/private/`，若取得原錄音則存於 ignored 的 `assets/audio/`，不隨 Git 提供。只將原創題文與示範答案送往一般 TTS，不公開家庭資料，也不把教師提示、跟讀或網站標籤當成孩子獨立能力。原始錄音未下載；原音獨立人耳核對、TTS 人耳自然度、iPad 與孩子實測未測。ASR 與桌面技術驗證不代表這些項目已通過。

隔離 UI 驗收完成 Try 8 題、Say 8 題：各概念前兩題全對時略過第三題，兩模式皆完成。家長摘要兩模式均 Done、首次紀錄正確。這是合成進度的流程驗收，不是孩子本人實測。

Chrome 390 × 844 窄版抽查孩子頁與 Preview，頁面可視寬及捲動寬均為 375，無水平溢出；此結果不代替 iPad 真機驗收。
