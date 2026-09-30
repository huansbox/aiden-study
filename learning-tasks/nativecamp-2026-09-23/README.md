# Native Camp 課後複習：2026-09-23 Bianca

課程：2026-09-23 20:30（Asia/Taipei），Bianca；教材線索為 Oxford Discover 1，第 116–122 頁。本 task 對應 [#125](https://github.com/huansbox/aiden-study/issues/125)，提供 Jobs, needs, and questions 原創複習題。實際交付狀態以 [task catalog](../catalog.json) 與本堂驗證紀錄為準。

5 個概念、30 題：工作與作用、由標題判斷主題、情境中的 need／want、Does…have／want 問答、What does…want 問答。每概念原生 Try it 使用 Build／Change／Fix 各一題，Say it 各三題；沒有舊版題目或 tryRevision。Try 每輪 10–15 題，Say 每次一個概念 2–3 題；耗時與孩子難度尚未實測。

依[現行 SOP](../nativecamp-review-pilot/lesson-sop.md)製作，以完整問題與完整回答為重點。題文使用虛構角色與情境；網站逐字稿只支持課內主題線索，不用來認定孩子已會、不會或有固定錯誤。

- [可編輯題文](source/lesson-source.json)
- [證據時間、概念判準與家長使用說明](source/lesson-brief.md)
- [原回放、雜湊與雙聲道 ASR 抽查](source/evidence-review.md)與[下載／解碼證據](source/download-verification.json)

從 repo 根目錄執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-23`，產生 `docs/nativecamp/lessons/2026-09-23.json` 與本 task 的 `source/speech-jobs.json`；加上 `--check` 只比對。一般語音固定 OpenAI `gpt-4o-mini-tts-2025-12-15`、Marin、speed 1.0，問題與答案同聲，不加入慢速指示。語音文字改動後必須重製受影響音檔；來源 JSON 通過不代表音訊或發布已完成。

原始回放存於 ignored 的 `assets/audio/`，私人逐字稿、私人網址與細節存於 ignored 的 `source/private/`。公開內容不含原始課堂逐字稿或私人角色判讀；下載、ASR 抽查、人耳驗聽、瀏覽器播放與孩子實測分開記錄。

## 本批整合驗證

本堂 60 段 OpenAI 問題／答案音檔已製作，通過 manifest／MP3 雜湊、完整解碼及無提示 ASR 核對。五堂獨立內容審查、完整測試與隔離瀏覽器驗證見[本批交付紀錄](../../docs-dev/nativecamp-latest-five.md)；正式 PR／CI／Pages 與資源比對回查 [#125](https://github.com/huansbox/aiden-study/issues/125)。較早段落描述題文製作者的工作界線，整合驗證以此處為準。

[語音 manifest](source/nativecamp-audio-manifest.json) 與[全檔 ASR](source/nativecamp-tts-asr.json)保留可核對的製作證據。ASR 不等於人耳自然度、iPad 真機或孩子難度實測。
