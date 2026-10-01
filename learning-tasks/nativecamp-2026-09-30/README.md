# Native Camp 2026-09-30 Edon

2026-09-30 19:30（Asia/Taipei）課後原創複習，依 Oxford Discover 1，第 34–38 頁的課堂線索設計。共 6 個概念、36 題，重點是根據短線索說完整句。來源、題文、OpenAI 語音與隔離驗證已完成；完整證據及正式發布結果由 [#140](https://github.com/huansbox/aiden-study/issues/140) 主流程續記。

## 使用方式

- Try it：先跨概念做 Build，再做 Change；需要補強時才出 Fix。每概念備有 3 題，孩子點字卡，不需打字。每題有可選英文提示及作答後解釋。
- Say it：每回一個概念，先說完整句再看示範。家長依揭曉前表現選 Got it／With help／Not yet；先示範再跟讀不算獨立成功。
- 每概念前兩題獨立成功可收尾；需協助才補第三題。本堂份量與耗時尚未由孩子實測。
- 所有情境為英文短文字卡；卡片沒有彩色插圖，不需回看教材。配色僅依題卡中的顏料模型，書名與人物均為原創。

## 內容與來源

| 概念 | 練習重點 |
| --- | --- |
| Name the noun group | 用完整句分類 person／place／thing，單複數一致。 |
| Invite a friend | 邀請問句與 Let's 建議句；want to 後用原形。 |
| Describe a mural | 用 mural(s) 和 shows／show 描述牆上畫作中的海洋物件。 |
| Mix two paints | 根據配色卡說明混合材料及結果，主詞與 mix／mixes 一致。 |
| Predict the topic | 用標題及開頭線索預測主題，區分 orange 顏色與水果。 |
| Compare the colors | 用完整句比較 same／different colors，主詞與 are 一致。 |

- [lesson-source.json](source/lesson-source.json)：唯一可編輯題文，包含 Try hint／explanation、口說示範、合理替代及語音逐字稿。
- [lesson-brief.md](source/lesson-brief.md)：來源映射、目標、混淆、判準、逐題答案與驗證界線。
- 私人網站摘要放在 ignored 的 `source/private/web-source-notes.md`；公開文件只留去識別摘要。本內容作者未獨立驗聽原課錄音，不據此判定孩子發音或掌握度。
- 原始資料的保存與恢復依 [Native Camp Storage Wiki](https://github.com/huansbox/aiden-study/wiki/Native-Camp-Storage)。

## 重建

依 [首堂 SOP](../nativecamp-review-pilot/lesson-sop.md) 與 [共用工具](../shared/nativecamp/README.md)，在 repo 根目錄執行：

```sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-30
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-30 --check
```

產物為 `docs/nativecamp/lessons/2026-09-30.json` 與 `source/speech-jobs.json`。本堂是新課，沒有 `tryRevision`。只新增本堂 ID，不改舊課與學習進度。

語音指定 OpenAI gpt-4o-mini-tts 系列、Marin、speed 1.0，問題與答案同聲，共 72 個預製音檔。語音文字改動須重製受影響聲音；builder 通過不代表音訊完成或音文一致。製作與驗收由主流程另留實際證據。未製作紙本。

## 本批驗證

來源與題文經獨立審查；72 個 OpenAI 音檔已核對完整解碼、hash 與全檔本機 ASR，疑點另用大模型交叉。三堂整合、Preview 不寫入進度及動物課完整作答證據見 [交付驗證](../../docs-dev/nativecamp-latest-three-20261001.md)。這不是孩子難度實測或人耳逐檔驗聽；發布與正式資源核對以 #140 為準。
