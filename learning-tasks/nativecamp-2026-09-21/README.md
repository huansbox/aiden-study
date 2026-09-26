# Native Camp 課後複習：2026-09-21 Alex

課程：2026-09-21 19:30（Asia/Taipei）。玩具願望、交換所有權、借物、動作、職業計畫與標題線索，六個概念、36 題，每概念 Try 使用 Build／Change／Fix，Say 各三題；完整回答及自然替代句為判準。

## 內容與來源

- [可編輯題文](source/lesson-source.json)／[設計與家長判準](source/lesson-brief.md)。
- [原音與局部 ASR 範圍](source/evidence-review.md)／[下載及完整解碼紀錄](source/download-verification.json)。
- 人物、情境與喜好全為虛構，不複製教材故事或孩子私人資訊。來源只支持教學範圍，不代表能力或發音評分。
- 原回放在 ignored assets/audio/，私人網址、完整逐字稿及細部 ASR 在 ignored source/private/，不隨 Git 提供。

## 再製與使用

從 repo 根目錄執行：

```powershell
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-21
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-21 --check
```

產物為 docs/nativecamp/lessons/2026-09-21.json 和 source/speech-jobs.json；已製作 72 段 OpenAI Marin、speed 1.0 問題／答案音檔。修改 spokenQuestion／answerText 後，必須另外重製受影響音檔；builder 不製作或覆寫聲音。見[共用工具](../shared/nativecamp/README.md)與[製作 SOP](../nativecamp-review-pilot/lesson-sop.md)。

Preview 可看全題且不記錄進度；新課初版沒有 Updated／Original。Try 前兩題獨立成功省略 Fix；Say 由家長評分。完成課收起，Weekly Review 只在家長另行要求時製作。

## 驗證與交付

已完成原創題包、OpenAI 預製語音與逐檔 ASR、獨立內容審查，以及合成進度的桌面／窄版操作驗證。詳見[本批交付與驗證](../../docs-dev/nativecamp-next-five.md)及[#130 發布紀錄](https://github.com/huansbox/aiden-study/issues/130)。人耳全檔自然度、iPad 真機、孩子難度與耗時未測。
