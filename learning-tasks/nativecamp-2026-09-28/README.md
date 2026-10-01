# Native Camp 2026-09-28 Alex

課程時間：2026-09-28 20:00（Asia/Taipei）。依課內動物分類、體表、翅膀、產卵、鰓及生活環境設計 6 個概念、36 題原創練習。家長反映教材偏難，本堂以短資訊卡、可選提示及一次一項變化降低同時回想新詞的負擔，仍要求完整句。

Try 一輪 12–18 題；Say 一次一個概念、2–3 題。完成收起、不重置首次紀錄；Weekly Review 仍另待家長要求。題量不等於已驗證孩子實際難度或耗時。

- [可編輯題文](source/lesson-source.json)、[設計與來源映射](source/lesson-brief.md)。
- [原音證據](source/evidence-review.md)、[下載完整性](source/download-verification.json)。
- 原回放與詳細轉錄位於 ignored 的 `assets/audio/`、`source/private/`，不隨 Git 提供。
- 語音採 OpenAI Marin，speed 1.0。製作、檢查與正式發布追蹤 [#140](https://github.com/huansbox/aiden-study/issues/140)。

依 [共用 SOP](../nativecamp-review-pilot/lesson-sop.md)，執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-28` 重建公開題包及 speech jobs；以 `--check` 比對。修改語音文字須重製受影響音檔並核對 manifest。

## 本批驗證

來源與題文經獨立審查；72 個 OpenAI 音檔已核對完整解碼、hash 與全檔本機 ASR，疑點另用大模型交叉。三堂整合、Preview 不寫入進度及動物課完整作答證據見 [交付驗證](../../docs-dev/nativecamp-latest-three-20261001.md)。這不是孩子難度實測或人耳逐檔驗聽；發布與正式資源核對以 #140 為準。
