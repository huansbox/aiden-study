# Native Camp 課後複習：2026-09-24 Mia

課程：2026-09-24 19:30（Asia/Taipei），Mia。本 task 對應 [#125](https://github.com/huansbox/aiden-study/issues/125)，提供 Our picnic plans and wishes 原創複習題。實際交付狀態以 [task catalog](../catalog.json) 與本堂驗證紀錄為準。

6 個概念、36 題：eat／drink、明示的野餐計畫、報告別人的 wants／needs、人與動作的完整句、my／your、prefer。每概念原生 Try it 使用 Build／Change／Fix 各一題，Say it 各三題；沒有舊版題目或 tryRevision。Try 每輪 12–18 題，Say 每次一個概念 2–3 題；耗時與孩子難度尚未實測。

依[現行 SOP](../nativecamp-review-pilot/lesson-sop.md)製作。所有家人、朋友、物品與偏好均為指定的虛構情境；不公開孩子或家庭實際偏好。juice 在來源不同段落的 need／want 分類不一致，題目改用清楚的 must bring／nice to have 計畫，不把食物種類或健康評價當成唯一判準。

- [可編輯題文](source/lesson-source.json)
- [兩段回放的證據時間、概念判準與家長說明](source/lesson-brief.md)
- [原回放、雜湊與雙聲道 ASR 抽查](source/evidence-review.md)與[下載／解碼證據](source/download-verification.json)

從 repo 根目錄執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-24`，產生 `docs/nativecamp/lessons/2026-09-24.json` 與本 task 的 `source/speech-jobs.json`；加上 `--check` 只比對。一般語音固定 OpenAI `gpt-4o-mini-tts-2025-12-15`、Cedar、speed 1.0，問題與答案同聲，不加入慢速指示。語音文字改動後必須重製受影響音檔。

原始回放存於 ignored 的 `assets/audio/`，私人逐字稿、私人網址與細節存於 ignored 的 `source/private/`。兩段回放須分開回查；第二段才是本堂主要教材內容。下載、ASR、人耳驗聽、瀏覽器播放與孩子實測分開記錄，不能互相替代。

## 本批整合驗證

本堂 72 段 OpenAI 問題／答案音檔已製作，通過 manifest／MP3 雜湊、完整解碼及無提示 ASR 核對。五堂獨立內容審查、完整測試與隔離瀏覽器驗證見[本批交付紀錄](../../docs-dev/nativecamp-latest-five.md)；正式 PR／CI／Pages 與資源比對回查 [#125](https://github.com/huansbox/aiden-study/issues/125)。較早段落描述題文製作者的工作界線，整合驗證以此處為準。

[語音 manifest](source/nativecamp-audio-manifest.json) 與[全檔 ASR](source/nativecamp-tts-asr.json)保留可核對的製作證據。ASR 不等於人耳自然度、iPad 真機或孩子難度實測。
