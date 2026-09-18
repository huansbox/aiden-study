# Native Camp 2026-09-12 Lena

2026-09-12 21:00（Asia/Taipei）Lena 課程的課後複習，適合已有基本英文閱讀能力、由家長陪同口說的孩子。題包與正式 OpenAI 語音已完成，由 [#97](https://github.com/huansbox/aiden-study/issues/97) 統籌交付；任務狀態以 [任務登錄](../catalog.json) 為準。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-12)可供家長檢視題目；實際發布 commit、CI 與正式資源核對結果見 #97 及其關聯 PR。

本堂以動作與完整句為主，不再複製 09-13 的整套季節／天氣題。共 3 個概念，各有 3 題 Try it、3 題 Say it，合計 18 題；前兩題獨立成功即可依既有規則結束該概念，不要求每次做完全部題庫。

| 概念 | 孩子要會什麼 | 本堂題目設計 |
| --- | --- | --- |
| `can-actions` | 把人、can、動作與物件說成完整句 | `We can …` 搭配 build／grow／watch／make；題面明示動作，不把 make 和 build 同時當成互斥答案。 |
| `watch-grow` | 說出自己看著什麼生長 | `I watch … grow.`，用課內的 buds／apples／flowers／trees 換情境；保留完整主詞、動作、物件及 grow。 |
| `tree-details` | 描述樹上蘋果的特徵 | `My tree has … apples.`，先用一個特徵，口說後兩題需保留兩個特徵；接受意思相同的自然完整句。 |

Try it 全為完整句排列，每題只有 1 個多餘字（is／are），不要求打字。Say it 先說、再揭曉，家長依揭曉前表現評級。字卡上的詞與句首是預設輔助，完整句組織才是本次目標；不是沒有提示的自由口說測驗。

## 來源與限制

課程日期、老師、教材線索及範圍已由授權課程頁核對。可讀逐字稿範圍為 0:00–25:02，播放器顯示 25:48。這份來源支持「本課教了什麼」，未完成原始錄音落檔、完整解碼或獨立人耳驗聽；不從網站 ASR 或講者標籤診斷孩子的能力。公開的 [證據摘要](source/evidence-review.md) 記錄時間範圍、取捨與限制；私人頁面及逐字稿節錄保留在 ignored 的 `source/private/`。

題面是原創短情境，不複製教材故事。36 個問題／答案 MP3 使用 OpenAI Cedar、speed 1.0；僅送出原創問題及示範答案，不上傳回放或孩子原始聲音。教材交叉核對與來源取捨見 [證據摘要](source/evidence-review.md)。

## 檔案與重建

- [lesson-source.json](source/lesson-source.json)：唯一可編輯題文來源，含顯示文字、題目語音逐字稿、示範及可接受口說答案。
- [lesson-brief.md](source/lesson-brief.md)：設計目標、提示尺度及評級邊界。
- [evidence-review.md](source/evidence-review.md)：去識別來源摘要；詳細節錄不進 Git。
- [公開題包](../../docs/nativecamp/lessons/2026-09-12.json)、[speech jobs](source/speech-jobs.json)與 [audio manifest](source/nativecamp-audio-manifest.json)：已建置的題目、語音文字與檔案技術證據。

從 repo 根目錄執行下列共用 builder；它只產生題包與語音工作，不產生或覆寫 MP3：

```sh
uv run learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-12
uv run learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-12 --check
```

沿用 [製作 SOP](../nativecamp-review-pilot/lesson-sop.md) 及 [共用音訊工具](../shared/nativecamp/README.md)，維持舊課 ID 與孩子進度。

## 本次驗收界線

獨立內容 review 已通過；本次三堂整合的 Node 測試 552 項通過，Python 測試 247 項通過、1 項略過。三堂共 120 個 MP3 的完整解碼與 hash 檢查通過，本堂 36 個檔案見 audio manifest。

本堂 [18 題問題音檔 ASR 核對](source/nativecamp-questions-asr.json)涵蓋全部問題；三堂共核對 60 題。另外保留本堂 [6 筆 TTS ASR 抽查](source/nativecamp-tts-asr.json)，三堂合計 20 筆。ASR 不等於人耳驗聽。原始課程錄音未落檔，原音獨立人耳核對、TTS 人耳自然度、iPad 與孩子實測未測。瀏覽器驗收與正式發布結果另由 #97 及其 PR 記錄，不以音檔檢查替代。

[整合驗收紀錄](source/qa.md)：來源、語音、逐題預覽、隔離孩子／家長流程與未測界線。

