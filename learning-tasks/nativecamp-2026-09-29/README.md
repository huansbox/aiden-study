# Native Camp 課後複習：2026-09-29 Zibuyile

課程：2026-09-29 20:00（Asia/Taipei）。用原創角色與短文字情境，練正在做的動作、幫忙的方法、兩項動作、polite／patient、工作者角色，以及教室 can／cannot 規則。

6 個概念、36 題；每概念有 Build 組句、Change 依條件變換、Fix 單字修正及 3 題 Say 口說。18 題 Try 均有可選提示與短解釋，18 題 Say 均有作答句首與合理替代答案。適合已有一些英文基礎的兒童，由家長陪同口說；不用鍵盤，不要求真實家庭資訊。Try 每輪 12–18 題，Say 每回 2–3 題；耗時與孩子難度尚未實測。

## 來源與使用

- 教材線索：Oxford Discover 2，Unit 9，第 86–88 頁。依主流程在已登入課程頁觀察的教學摘要選概念；不公開私人逐字稿、孩子家庭事實或教材原圖。
- [lesson-source.json](source/lesson-source.json) 是可編輯題文正本；[設計與家長判準](source/lesson-brief.md) 保存來源時間、目標、答案及判讀界線。
- 沿用 [Native Camp 製作 SOP](../nativecamp-review-pilot/lesson-sop.md)，接入既有 App；Preview 不計分，首次結果保留，完成後收起。
- 語音固定 OpenAI Cedar、speed 1.0，72 檔，問題與答案同聲。音訊與整合驗證由主流程另留實際證據。
- 原始錄音與私人來源依本堂 .gitignore 保存在 ignored 路徑；source/private/web-source-notes.md 是私人工作摘要，不隨 Git 公開。

## 再製

在 repo 根目錄執行：

~~~sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-29
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-29 --check
~~~

產物為 docs/nativecamp/lessons/2026-09-29.json 與 source/speech-jobs.json。聲音文字變更須另重製相關音檔並核對 manifest。沒有紙本產物。

題文完成不等於音訊、瀏覽器、iPad、孩子實測或正式發布完成。工作狀態以 [任務登錄](../catalog.json) 為準，整合交付追蹤 [#140](https://github.com/huansbox/aiden-study/issues/140)。

## 本批驗證

來源與題文經獨立審查；72 個 OpenAI 音檔已核對完整解碼、hash 與全檔本機 ASR，疑點另用大模型交叉。三堂整合、Preview 不寫入進度及動物課完整作答證據見 [交付驗證](../../docs-dev/nativecamp-latest-three-20261001.md)。這不是孩子難度實測或人耳逐檔驗聽；發布與正式資源核對以 #140 為準。
