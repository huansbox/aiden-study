# Native Camp 課後複習：2026-09-11 Edon

2026-09-22 追加新版 Try it：每概念 Build／Change／Fix 各一題，尚未開始才用新版，已作答原題與 Say it 保留。Preview 可切 Updated／Original；目前音訊總數以 manifest 為準。新版題量、語音與驗收見 [改版紀錄](../../docs-dev/nativecamp-try-variety.md) 與 [全新版音檔 ASR](source/nativecamp-variety-asr.json)。以下保留原版交付證據。

課程為 2026-09-11 20:00（Asia/Taipei），Edon。交付追蹤於 [#97](https://github.com/huansbox/aiden-study/issues/97)，任務狀態以 [任務登錄](../catalog.json) 為準。

題包與正式語音已完成。依 [製作 SOP](../nativecamp-review-pilot/lesson-sop.md) 製作完整句練習。4 個概念、24 題：Weather changes、After doesn't、The next season、Days and nights，配有 48 個 OpenAI Marin 問題／答案 MP3，speed 1.0。重點是 gets／snows、doesn't 後的原形、季節先後，以及單複數的日夜長短句；每概念各 3 題排列與 3 題口說，排列有 1 個合理混淆字。虛構天氣卡限定答案，不把冬天一定下雪或全球都分四季當通則。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-11)可供家長檢視題目；實際發布 commit、CI 與正式資源核對結果見 [#97](https://github.com/huansbox/aiden-study/issues/97) 及其關聯 PR。

可編輯題文存於 [source/lesson-source.json](source/lesson-source.json)。從 repo 根目錄執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-11`，產生 `docs/nativecamp/lessons/2026-09-11.json` 與 `source/speech-jobs.json`；`--check` 僅比對。語音指定 OpenAI Marin、speed 1.0，同堂問題與答案同聲，不改既有課程音色。

- [設計與家長判準](source/lesson-brief.md)
- [來源時間、確定度與限制](source/evidence-review.md)
- [共用建置與音訊工具](../shared/nativecamp/README.md)

來源來自已授權網站的課程內容、逐字稿與教材交叉核對；私人頁面網址、節錄與其他原始材料保存在 ignored 的 `source/private/`，不隨 Git 提供。原錄音未落檔，若之後取得則存於 ignored 的 `assets/audio/`。逐字稿的說話者標籤、教師提示與跟讀不能用來宣稱孩子有特定錯誤。只將原創題文與示範答案用於一般 TTS。

獨立內容 review 已通過；本次三堂整合的 Node 測試 552 項通過，Python 測試 247 項通過、1 項略過。三堂共 120 個 MP3 的完整解碼與 hash 檢查通過，本堂 48 個檔案的文字與技術證據見 [audio manifest](source/nativecamp-audio-manifest.json)。

本堂 [24 題問題音檔 ASR 核對](source/nativecamp-questions-asr.json)涵蓋全部問題；三堂共核對 60 題。另外保留本堂 [8 筆 TTS ASR 抽查](source/nativecamp-tts-asr.json)，三堂合計 20 筆。ASR 不等於人耳驗聽。原音獨立人耳核對、TTS 人耳自然度、iPad 與孩子實測未測。瀏覽器驗收及正式發布結果另由 #97 及其 PR 記錄；正式進度不得作為測試資料。

[整合驗收紀錄](source/qa.md)：來源、語音、逐題預覽、隔離孩子／家長流程與未測界線。

