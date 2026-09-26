# Native Camp 課後複習：2026-09-25 Edon

課程：2026-09-25 08:00（Asia/Taipei）。以動物描述、詩歌標題、押韻尾音、作者身分與 There is／are，練習依明確情境組完整句。

5 個概念、30 題原創練習；每概念包含 Build 組句、Change 依條件變換、Fix 單字修正，以及 3 題家長陪同口說。適合已有一些英文基礎的兒童；不用鍵盤，不要求回答真實家庭資訊。Try 每輪 10–15 題，Say 每回一個概念、2–3 題；實際耗時與孩子難度尚未測。

## 來源與交付界線

教材線索：Oxford Discover 1，印刷頁 28–33；依網站課程逐字稿已觀察片段選題。題文、角色、詩題名、房屋與數量均為原創，不重刊課本詩文或私人家庭資料。網站轉錄與 speaker 標籤不足以推定獨立掌握或固定錯誤；來源下載／錄音核對、音訊與整合交付由主流程另留實際證據。

此目錄先提供內容來源與設計。音訊、人耳驗聽、瀏覽器、iPad、孩子實測及發布，不因內容檔案存在而視為完成。工作狀態以 [任務登錄](../catalog.json) 為準。

## 使用與再製

- [完整題文](source/lesson-source.json) 是可編輯真相源；[設計與家長判準](source/lesson-brief.md) 記時間證據、成功標準及每概念六題答案。
- [原回放、雜湊與雙聲道 ASR 抽查](source/evidence-review.md)／[下載與完整解碼紀錄](source/download-verification.json)。
- 依 [Native Camp SOP](../nativecamp-review-pilot/lesson-sop.md) 接入同一個 App，沿用 Preview 不計分、首次紀錄保留及完成後收起。
- 正式語音指定 OpenAI Marin、speed 1.0，問題與答案同聲；預計 60 檔，由主流程在內容審查後製作。
- 原始錄音位於 ignored 的 assets/audio/；私人網址、完整逐字稿及來源節錄位於 ignored 的 source/private/，不隨 Git 提供。

在 repo 根目錄執行：

```sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-25
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-25 --check
```

輸出為 docs/nativecamp/lessons/2026-09-25.json 與 source/speech-jobs.json；語音文字若改動，須另重製受影響音檔並核對 manifest。此 task 沒有紙本產物。

## 本批整合驗證

本堂 60 段 OpenAI 問題／答案音檔已製作，通過 manifest／MP3 雜湊、完整解碼及無提示 ASR 核對。五堂獨立內容審查、完整測試與隔離瀏覽器驗證見[本批交付紀錄](../../docs-dev/nativecamp-latest-five.md)；正式 PR／CI／Pages 與資源比對回查 [#125](https://github.com/huansbox/aiden-study/issues/125)。較早段落描述題文製作者的工作界線，整合驗證以此處為準。

[語音 manifest](source/nativecamp-audio-manifest.json) 與[全檔 ASR](source/nativecamp-tts-asr.json)保留可核對的製作證據。ASR 不等於人耳自然度、iPad 真機或孩子難度實測。
