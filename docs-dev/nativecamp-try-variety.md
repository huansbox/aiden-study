# Native Camp Try it：Build、Change、Fix

需求與發布追蹤：[Issue #108](https://github.com/huansbox/aiden-study/issues/108)。2026-09-22 改版在既有題包追加版本，保留原題、Say it、首次結果與既有音檔。正式合併、CI、Pages 與資源核對結果以該 issue 的交付紀錄為準。

## 內容與操作

每概念三題依序為 Build（用字卡組完整句）、Change（新情境改變句子）、Fix（點一個錯字，再選替代字）。先做各概念的 Build，再做 Change；前兩題都是首次獨立成功的概念省略 Fix。第三題是補強，不是難度升級；不新增第四題。字卡按題目 ID 穩定打散，操作中不重新洗牌。

Change 可改主詞、單複數、肯定／否定、條件成立與否或語序。例：兩人計數改成一人計數，需從 They are 改成 She is；不同齡時不使用 too。只換同句中的名詞／數字不足以作為新版的主要變化。必要字卡都使用，通常一個、最多兩個合理混淆；所有符合指定情境的自然答案必須接受。

新版涵蓋 8 堂單課與 1 份既有週包，共 44 個概念、132 題新 Try、264 段問題／答案音檔。週包的 14 個是候選概念，仍依原規則選 4 個，不要求一次做完題庫。

| 題包 | 新 Try 題數 | 固定音色 |
| --- | ---: | --- |
| 2026-09-08 Maria | 12 | Cedar |
| 2026-09-09 Emi | 12 | Marin |
| 2026-09-10 Anastasia | 9 | Cedar |
| 2026-09-11 Edon | 12 | Marin |
| 2026-09-12 Lena | 9 | Cedar |
| 2026-09-12-mel Mel | 12 | Marin |
| 2026-09-13 Michael | 12 | Marin |
| 2026-09-17 Khalid | 12 | Marin |
| weekly-2026-09-14（09-20 開放） | 42 | Cedar |

## 歷史與相容

`concept.try` 保存原三題；`concept.tryRevision = {id: "variety-v1", questions: [...]}` 保存新版，question ID 使用 `<concept>-v2-try-1/2/3`。任一舊 initial、reviews、deferred 或 pending question ID 會固定該概念沿用原題；沒有這些紀錄才使用新版。已完成概念不重開，未出的第三題不算欠題。Say it 不改。

Preview 預設 Updated，可切 Original；不讀寫孩子進度。新版 repair 的句子及替代選項以 token id 定位，判分需同時符合 wordId 與 choiceId，替換後完整句須與 answerText 一致。修正重試沿用既有首次結果保留與音訊回饋。

新課／新週包初版可直接在 `concept.try` 寫 `build/order → change/order → fix/repair`，不需要虛構原版。Weekly planner 同時辨識新舊 question ID，仍映射回同一原課概念；既有凍結 brief 只接受已知舊指示及缺少後追加 tryRevision 的原內容，其餘竄改仍拒絕，續作不重寫既有 plan／brief。

## 驗證證據

- 9 份 source 去除新增 tryRevision 後，與改版前 `ed0dc5369c5e84610f3415cfc0bfe206e3ff97b9` 的原始欄位逐物件相同。原公開音檔沒有修改。
- 獨立唯讀 reviewer 檢查 runtime、版本固定、續作、132 題與原課證據；採納舊 Weekly brief 相容、避免語音先提供目標冠詞／介系詞、接受前置時間／地點語序及無 Oxford comma 的自然列表等修正。
- Node 全套 608 項通過；Python 268 項通過、1 項略過。9 包 builder 與完整音訊輸入指紋、hash、解碼、非靜音檢查通過；檢查重跑零 API 請求。
- Chrome 隔離服務 8798 使用 test-token 及記憶體 KV，完成 Lena 新版 Try：三個 Build、三個 Change、只補一個 Fix。兩概念各兩題獨立答對即完成；另一概念首次答錯、訂正成功後仍保留 incorrect，最終三題完成。測試非孩子本人作答。
- Preview 驗證錯字定位、替換、錯誤回饋、重選正解、Updated／Original 及 Say 切換。操作前後隔離 Native Camp 進度 envelope 完全相同。390 × 844 寬度的修正題字卡與選項可閱讀、換行正常；不是 iPad 真機結果。

所有新版問題／答案音檔均以本機 small.en 辨識，證據在各課 `source/nativecamp-variety-asr.json`；非單純數字拼法、mum／mom、縮寫差異另用 large-v2 複核，見 [複核報告](nativecamp-try-variety-asr-crosscheck.json)。語音使用 OpenAI 預製、speed 1.0；API 不回傳 token usage，不能將請求數或音長當實際帳單。生成請求與品質重製前的收據保存在 ignored 的本機工作目錄。

本次共 272 次成功 API 請求，產出 264 段最終音檔，含 8 次針對已取得回應的品質重製；沒有重試結果不確定的傳輸。7 段重製後，Michael 列表問題仍有漏指示的辨識結果，因此將兩句指示改成單一句並再製，最後辨識完整。最終僅 3 段 small.en 的人名／字詞差異需 large-v2 複核，三段均完整符合預期（標點、大小寫不同不影響內容）。[保留與完整性報告](nativecamp-try-variety-integrity.json)記錄版本欄位、既有音訊與 264 筆 ASR hash 核對。

ASR 與瀏覽器播放狀態不代表人耳自然度、iPad 真機或孩子新版難度實測已通過。正式家庭進度、排程與原 8791 預覽服務均未用作測試或重置。

後續製作沿用[課後 SOP](../learning-tasks/nativecamp-review-pilot/lesson-sop.md)、[單課模板](../learning-tasks/nativecamp-review-pilot/templates/lesson-brief.md)與[Weekly 規劃](../learning-tasks/shared/nativecamp/weekly-planning.md)。
