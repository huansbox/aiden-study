# Native Camp 課後複習：2026-09-17 Khalid

2026-09-22 追加新版 Try it：每概念 Build／Change／Fix 各一題，尚未開始才用新版，已作答原題與 Say it 保留。Preview 可切 Updated／Original；目前音訊總數以 manifest 為準。新版題量、語音與驗收見 [改版紀錄](../../docs-dev/nativecamp-try-variety.md) 與 [全新版音檔 ASR](source/nativecamp-variety-asr.json)。以下保留原版交付證據。

課程：2026-09-17 19:30（Asia/Taipei），Khalid。目前工作狀態以 [catalog.json](../catalog.json) 的本任務登錄為準；以下保留有日期的交付證據與使用限制。

## 交付紀錄：2026-09-18

內容、正式音訊與整合交付已完成，由 [PR #81](https://github.com/huansbox/aiden-study/pull/81) 合併；[#80 的 Delivery and verification](https://github.com/huansbox/aiden-study/issues/80) 記錄正式資源比對、隔離整合驗收及家長 Preview 核對。這些是當日證據，不代表每次閱讀本頁都重新驗收。

本課 48 檔正式音訊的 [manifest](source/nativecamp-audio-manifest.json) 為 `complete`；完整解碼、非靜音、輸入指紋與本機 ASR 抽查見 [音訊 QA](source/openai-audio-qa.md)。未做人耳全檔自然度、iPad 真機或新版孩子難度／耗時驗收；ASR 與播放狀態不能代替人耳驗聽。track 2 未取得本機檔案的限制仍有效，詳見下方來源說明。

## 製作與來源

依[製作 SOP](../nativecamp-review-pilot/lesson-sop.md)整理已教過的重點，製作完整句排列與家長陪同口說。既有課程的 ID、題意與學習紀錄保留。

可編輯題文存於 `source/lesson-source.json`，共用 `../shared/nativecamp/build_lesson.py --lesson 2026-09-17` 產生 `docs/nativecamp/lessons/2026-09-17.json` 與 `source/speech-jobs.json`。正式語音使用 OpenAI Marin、speed 1.0，問題與答案同聲；日後改動題文時，仍須重製受影響音訊並完成對應驗證，不能只重建 JSON 就視為可交付。

原始回放保存於 ignored 的 `assets/audio/`，私人網址、逐字稿與詳細來源紀錄保存於 ignored 的 `source/private/`，不隨 Git 提供。來源不足時不推定孩子錯誤或補寫課堂內容。

## 內容與再製

4概念、24題：Choose a tool、How many together?、What are they doing?、The same age。使用虛構人物、文具數量與年齡，練完整用途句、合計句、正在計數及同齡回答；不放孩子真實班級／年齡資料，不加入本堂未做的writing numbers。

- [設計與家長評級](source/lesson-brief.md)／[來源與查核範圍](source/evidence-review.md)
- [可編輯題文](source/lesson-source.json)／[正式題包](../../docs/nativecamp/lessons/2026-09-17.json)／[語音工作清單](source/speech-jobs.json)
- [已取得兩段回放的下載／解碼證據](source/download-verification.json)／[共用重建工具](../shared/nativecamp/README.md)

已取得track 1、track 3，track 2只有可讀網站逐字稿與可播放頁面，下載未落檔；工具用途／文具合計另核對教材94頁。track 3的年齡句已本機ASR抽查。不能宣稱三段都下載或完成全課音訊核對，也不把教材播放誤標「學生」當成孩子獨立口說證據。
