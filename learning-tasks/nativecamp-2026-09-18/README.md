# Native Camp 課後複習：2026-09-18 Zeus

課程：2026-09-18 19:30（Asia/Taipei），Oxford Discover 1 Unit 10，第 96–100 頁。以食物與物件、詢問有沒有食物、故事順序、數量合計及理由，練習完整句子。新 lesson ID 為 `2026-09-18`。

5 個概念、30 題原創練習。每概念有 Build 組句、Change 依新條件變換、Fix 單字修正及 3 題 Say it；Try 一輪 10–15 題，Say 每回一個概念、2–3 題。已有一些英文基礎的兒童可自行做 Try；Say 由家長陪同。孩子實際耗時、難度及 iPad 體驗尚未測。

## 來源與使用

- [完整題文](source/lesson-source.json) 是可編輯真相源；[設計與家長判準](source/lesson-brief.md) 說明來源、概念、各題答案與取捨。
- [來源查核](source/evidence-review.md) 記錄私人回放完整解碼、8 個雙聲道 ASR 時間窗及限制；[下載紀錄](source/download-verification.json) 保存檔案雜湊與格式。
- 新故事、人物及數量均為虛構；不重刊 Stone Soup 原文，也不沿用家庭私人事實。網站轉錄與 ASR 不作孩子能力、發音或獨立程度的評分。
- 依 [Native Camp SOP](../nativecamp-review-pilot/lesson-sop.md) 接入同一個 App。Preview 不計分，首次結果保留，完成課程收起；Weekly Review 只在使用者另行要求時製作。
- 正式語音指定 OpenAI Marin、speed 1.0，同課問題與答案同聲；60 段音訊須由整合流程於內容審查後製作與驗證。本頁不因題文完成就宣稱音訊、瀏覽器或發布已通過。

原始錄音位於 ignored 的 `assets/audio/`；完整逐字稿、私人網址與 ASR 明細位於 ignored 的 `source/private/`，不隨 Git 提供。公開原創題包不含私人來源連結。

## 再製

在 repo 根目錄執行：

```sh
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-18
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-18 --check
```

輸出為 `docs/nativecamp/lessons/2026-09-18.json` 與 `source/speech-jobs.json`。修改 spokenQuestion 或 answerText 後，另重製受影響語音並核對 manifest。此 task 沒有紙本產物。

工作狀態以[任務登錄](../catalog.json)為準；本批整合、獨立審查、語音、CI 與發布證據由 [#130](https://github.com/huansbox/aiden-study/issues/130) 統一追蹤。

已完成原創題包、OpenAI 預製語音與逐檔 ASR、獨立內容審查，以及合成進度的桌面／窄版操作驗證。詳見[本批交付與驗證](../../docs-dev/nativecamp-next-five.md)及[#130 發布紀錄](https://github.com/huansbox/aiden-study/issues/130)。人耳全檔自然度、iPad 真機、孩子難度與耗時未測。
