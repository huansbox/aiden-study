# Native Camp Weekly Review：2026-09-14～09-20

2026-09-22 追加新版 Try it：每概念 Build／Change／Fix 各一題，尚未開始才用新版，已作答原題與 Say it 保留。Preview 可切 Updated／Original；目前音訊總數以 manifest 為準。新版題量、語音與驗收見 [改版紀錄](../../docs-dev/nativecamp-try-variety.md) 與 [全新版音檔 ASR](source/nativecamp-variety-asr.json)。以下保留原版交付證據。

狀態：題庫、正式音訊與隔離整合驗收已完成；正式發布記錄見[App驗收文件](../../docs-dev/nativecamp-review.md)；交付追蹤於 [#80](https://github.com/huansbox/aiden-study/issues/80)。週期使用 Asia/Taipei，2026-09-20 開放。

本週題庫使用重新設計的完整句題目，每個候選概念保留來源課程與概念 ID，供 App 從已學內容優先選取首次錯誤或需要協助的概念；保留少量成功與較早內容。每次選取 4 個概念，其中最多 1 個較早概念，實際可用範圍以題包與 runtime 契約為準。開始後題目與順序固定，完成後收進 Finished。

可編輯題文存於 `source/lesson-source.json`，共用 `../shared/nativecamp/build_lesson.py --lesson weekly-2026-09-14` 產生 `docs/nativecamp/lessons/weekly-2026-09-14.json` 與 `source/speech-jobs.json`。正式語音使用 OpenAI Cedar、speed 1.0，問題與答案同聲。

本包只收來源已核對的原創題文，不保存私人課程網址、錄音或逐字稿；未熟結果可供製作後續週包，完成份量不代表永久掌握。

## 題庫與再製

14個候選概念、84題、168個語音工作，涵蓋09-14～09-17四堂的全部12個原課概念，加09-13季節活動與列表兩個較早候選。題庫份量不是一次作答份量，各模式實際只選4個概念，開始後各自固定。

- [候選來源、新情境與家長判準](source/lesson-brief.md)
- [可編輯題文](source/lesson-source.json)／[正式題包](../../docs/nativecamp/lessons/weekly-2026-09-14.json)／[語音工作清單](source/speech-jobs.json)
- [共用重建與語音工具](../shared/nativecamp/README.md)

新題保留完整句目標，優先首次錯誤／受助內容並保留成功樣本；後來原課reviews成功不抹去首次依據。家長Preview可看全部84題，孩子完成後收起。本包沒有即時LLM生成、兒童錄音或自動口說評分。
