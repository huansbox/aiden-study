# Native Camp 課後複習：2026-09-10 Anastasia

課程：2026-09-10 19:30（Asia/Taipei），Anastasia。本堂由 [#97](https://github.com/huansbox/aiden-study/issues/97) 統籌；工作狀態以 [catalog.json](../catalog.json) 為準。

## 內容與使用

題包與正式語音已完成。依[製作 SOP](../nativecamp-review-pilot/lesson-sop.md)，將課堂與教材交叉核對的動物內容整理成 3 個概念、18 題：Animal homes、Animal food、Pretend animals。每個概念有 3 題完整句排列及 3 題口說，配有 36 個 OpenAI Cedar 問題／答案 MP3，speed 1.0。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-10)可供家長檢視題目；實際發布 commit、CI 與正式資源核對結果見 [#97](https://github.com/huansbox/aiden-study/issues/97) 及其關聯 PR。

- Try it 用 1 個合理混淆字，練習 `live/lives`、`eat/eats` 與 `I am a/an …`。
- Say it 先看動物卡，再說完整句；家長依揭曉前的表現評級。動物家園與食物由題面給定，不以猜動物常識或回答一個單字過關。
- 前兩題首次獨立成功可收尾，否則補第 3 題。Try it 一輪 6～9 題；Say it 一次一個概念 2～3 題。完成後由新的 Weekly Review 題目複習。

## 來源與再製

- [可編輯題文](source/lesson-source.json)是唯一題文來源。
- [來源與出題界線](source/evidence-review.md)記錄課內證據、採用理由與未查核部分；[設計與家長評級](source/lesson-brief.md)列各概念成功判準。
- 網站逐字稿節錄及私人頁面資料只留在 ignored 的 `source/private/`；原始錄音若取得，存於 ignored 的 `assets/audio/`。它們不隨 Git 提供。

從 repo 根目錄執行：

```powershell
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-10
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-10 --check
```

builder 產生 [公開題包](../../docs/nativecamp/lessons/2026-09-10.json) 與 [speech jobs](source/speech-jobs.json)，不產生音檔。正式音色為 OpenAI Cedar、speed 1.0；製作與核對指令見[共用工具](../shared/nativecamp/README.md)。只有本堂原創題文送到 TTS API，不上傳老師或孩子錄音。

## 本次驗收界線

獨立內容 review 已通過；本次三堂整合的 Node 測試 552 項通過，Python 測試 247 項通過、1 項略過。三堂共 120 個 MP3 的完整解碼與 hash 檢查通過，本堂 36 個檔案的文字與技術證據見 [audio manifest](source/nativecamp-audio-manifest.json)。

本堂 [18 題問題音檔 ASR 核對](source/nativecamp-questions-asr.json)涵蓋全部問題；三堂共核對 60 題。另外保留本堂 [6 筆 TTS ASR 抽查](source/nativecamp-tts-asr.json)，三堂合計 20 筆。ASR 不等於人耳驗聽。原始課程錄音未落檔，未完成原音獨立人耳核對；TTS 人耳自然度、iPad 與孩子實測亦未測。瀏覽器驗收與正式發布結果另由 #97 及其 PR 記錄，不以音檔檢查替代。

[整合驗收紀錄](source/qa.md)：來源、語音、逐題預覽、隔離孩子／家長流程與未測界線。

