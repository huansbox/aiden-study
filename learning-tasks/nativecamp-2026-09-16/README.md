# Native Camp 課後複習：2026-09-16

狀態：已完成（題包、接入與驗證；新課孩子實測未完成）。課程：2026-09-16 19:30（Asia/Taipei），Edon。

- [開始本堂](https://kids.linshuhuan.com/nativecamp/?child=aiden&lesson=2026-09-16)／[不計分預覽](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-16)
- [原速、慢速與OpenAI試聽比較](assets/tts-comparison/index.html)／[語音比較報告](source/tts-comparison.md)
- [本次整合驗收](../../docs-dev/nativecamp-edon-verification.md)

依[製作 SOP](../nativecamp-review-pilot/lesson-sop.md)核對回放與教材，設計英文 Try it／Say it 並接入既有 App；保留其他課程與學習進度。來源頁網址、詳細逐字稿與錄音只保存在 ignored 路徑。

本次已授權端到端製作、派工、網站接入與語音比較。來源核對已完成到本次出題所需範圍；跟讀與提示不當作獨立答對，不預先推定孩子的錯誤。

## 內容與來源

已完成3概念、18題的內容包：My family、Make it short、Opposites。題目全部英文；親屬卡使用虛構名字，短句卡不含孩子私人資料。來源核對將跟讀／老師提示與獨立回答分開。

- [設計與家長評級判準](source/lesson-brief.md)
- [來源核對及原音限制](source/evidence-review.md)
- [可編輯題文](source/lesson-source.json)、[正式題包](../../docs/nativecamp/lessons/2026-09-16.json)
- [36個問題／答案音檔的製作證據](source/nativecamp-audio-manifest.json)
- [兩堂共用的重建與查核工具](../shared/nativecamp/README.md)

正式題包與 speech jobs 由共用builder產生；改語音文字後要重製音檔，不只重建JSON。私人錄音、逐字稿與來源網址在ignored路徑，clone不會包含。

本堂原音全檔解碼與3段分聲道ASR已完成。公開音訊採比首堂較慢的Zira rate -2；桌面與窄版預覽已驗收，生成與檔案驗證不代表人耳完整試聽／iPad／孩子實測完成。正式發布證據留在本次PR，見整合驗收。
