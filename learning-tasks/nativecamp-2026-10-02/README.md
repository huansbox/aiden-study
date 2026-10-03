# Native Camp 2026-10-02 Denny

2026-10-02 19:30（Asia/Taipei）課後原創複習。教材線索為 Oxford Discover 1，Unit 14，第 136–140 頁。共 6 個概念、36 題，以短 fact card 支援完整句：辨認地方、比較人物、說明住家、表達環境問題與食物喜好。

題文、來源核對、OpenAI 語音、fresh read-only 獨立審查及隔離畫面驗證已完成。驗證詳見[本批交付紀錄](../../docs-dev/nativecamp-october-20261003.md)；PR／CI、正式發布與資源核對由 [#142](https://github.com/huansbox/aiden-study/issues/142) 接續記錄。

## 使用方式

- Try it：先跨概念 Build，再做 Change，只有需要補強才出 Fix。共備有 18 題，一輪約 12–18 題；不用打字。
- Say it：每回一個概念，先說完整句，再揭曉示範。家長依揭曉前表現選 Got it／With help／Not yet；提供目標字詞或示範後跟讀，不算獨立成功。
- 每概念前兩題獨立成功即可收尾；第三題只補強，不提高難度。完成後收進 Finished，Preview 可以查看全部題目，不重新計分。
- 題卡都是可見的英文線索，無須記得教材角色或另開圖片。人物、情境均為原創；不把課文故事片段搬成題庫。

## 內容

| 概念 | 重點 |
| --- | --- |
| Name the place | 用完整句分辨 orchard／cornfield，合併 new／old 描述。 |
| Describe the buildings | 處理一棟 is／多棟 are；回應課內明確單複數更正。 |
| Compare two friends | 用 but 比較不同，再改成兩人共同的 have；涵蓋寵物與 favorite color。 |
| Say where they live | 根據住家卡說 live／lives；in a home 及 on a street，口說接受英式 in a street。 |
| Say what is a problem | 依明確情境說 too noisy／boring／dangerous，或改成 not too noisy。 |
| Tell what you like | 說完整的喜歡／不喜歡，肯定轉否定；不猜測孩子本人喜好。 |

- [lesson-source.json](source/lesson-source.json)：唯一題文真相源，含可選 hint、作答後 explanation、口說替代答案及語音逐字稿。
- [lesson-brief.md](source/lesson-brief.md)：來源時間、判讀界線、學習目標與逐題答案。
- [tts-review.json](source/tts-review.json)：72 檔全檔本機 ASR、16 檔交叉及兩次單檔品質替換；不等同人耳驗聽。
- 原網站逐字稿及回放線索只存 ignored 的 `source/private/`。本內容作者未獨立驗聽原課錄音，不能由網站 ASR 判斷孩子發音或掌握度。
- 私人材料保存方式沿用 [Native Camp Storage Wiki](https://github.com/huansbox/aiden-study/wiki/Native-Camp-Storage)。

## 重建

依 [首堂 SOP](../nativecamp-review-pilot/lesson-sop.md) 與 [共用工具](../shared/nativecamp/README.md)，在 repo 根目錄執行：

```sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-10-02
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-10-02 --check
```

builder 只產生 `docs/nativecamp/lessons/2026-10-02.json` 與 `source/speech-jobs.json`，不製作音訊。正式語音指定 OpenAI gpt-4o-mini-tts 系列、Cedar、speed 1.0，共 72 個預製音檔；製作與 QA 另留實際證據。題文變更後須先重新產生 jobs，再重新核對受影響音訊。

本次只新增本堂 ID，保留既有課程與進度，不新增 Weekly Review 或排程。不製作紙本。桌面／窄版、iPad、孩子難度與耗時均須依實際驗證分開記錄，不把 source 自查當成上線驗收。
