# 四上自然第三批 Study 整合與發布（#129）

本輪以已發布 revision 6 的 89 題為唯一基線，補入水生植物圖像與紀錄判讀、地表作用配對。七個原候選 activity 見[缺口盤點](../data/study/g4-s1-science-exam1/third-batch-gap-analysis.md)；獨立 reviewer 判定 **5 PASS／2 BLOCK**，統籌只核准五個完整 activity、13 個原卷作答格進入 revision 7，已於臺灣時間 2026-09-27 正式發布。排除植物紀錄第二問（根部推論不唯一）與風力比較題（缺必要條件），保留兩題原 ID、不重編其他 practiceId。防災前提不清的整組題、重複的八圖分類與地震報告等候選，本輪亦不採。尚未取得校方正式範圍；本次收錄以暫定核心為界。

## 主題入口

Study 與家長試玩沿用七個自然練習主題。第三批四種入選題目的 fine tag 明確歸入既有「地表變化與保護」及「水生植物」；已排除風力題的 fine tag 不加入主題清單。未登錄的 fine tag 仍可從整單元練習取得，不能被猜測歸類。這項 helper 更新不更動題目 ID、進度鍵或 private 題文。

## 私人來源與重建門檻

private 題文、答案、解說、圖表與審題紀錄只保存在本工作樹精確 ignored `data/private/study/g4-s1-math-u1/`。重建腳本 `science-third-batch/rebuild_third_batch.py` 讀 canonical `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev6-release/` 的正式 `pack.json` 與三份 `merged/` 原始輸入；先核對 revision 6 的 89 題、107,492 bytes、SHA256 `380360fa823f5083b564652c5fb1ce1e0e305bb4922ddcdbffad25ea1de6a922`，以及本工作樹公開 mapping 的原 89 筆與基線相同。再核對 private `review/approved-subset.json`、`review/review-report.md`、七份不隨審題進度改寫的來源檔指紋，以及五題唯一排除 `verification` 欄位的核准內容 hash。reviewer snapshot 中另留存兩份公開候選／缺口文件的核准當時 hash；後續進度更新改以精確 ID、來源、狀態投影核對，不以舊全文 hash 阻擋重建。沒有這份核准 snapshot 時只做基線檢查。

被排除的 activity 整組不進 pack，原 practiceId 保留、不重編號。腳本只對五個核准 ID 把 curated `verification` 和公開 mapping `reviewStatus` 設為 `independently_solved_twice_no_official_answer`，並保持兩邊 `answerPage: null`。作者原始 pending delta 不修改。它合併 89 筆原 curated、解說與 mapping row，逐值核對重建後的舊 89 題、解說及 mapping；檢查 production builder 可接受、總包不超過 128 KiB，才寫入本地 merged inputs 與公開 metadata。公開 candidate 目前頂層為 `published_with_exclusions`、五個核准 row 為 `published`／`coverageApplied: true`，兩個排除 row 維持 `excluded_after_independent_review`／`false`；selection 頂層與五個 row 均為 `published`。狀態轉換不改 pack bytes，發布事實以下方 KV 讀回為準。

從 repo 根目錄執行；腳本會要求 ID 集合精確等於核准 snapshot：

```powershell
$approvedIds = (Get-Content data/private/study/g4-s1-math-u1/science-third-batch/review/approved-subset.json -Raw | ConvertFrom-Json).items.id
$approvedArgs = @(); foreach ($approvedId in $approvedIds) { $approvedArgs += @('--approved-id', $approvedId) }
uv run python data/private/study/g4-s1-math-u1/science-third-batch/rebuild_third_batch.py @approvedArgs --review-report data/private/study/g4-s1-math-u1/science-third-batch/review/review-report.md
uv run python scripts/build_private_study_pack.py
uv run python data/private/study/g4-s1-math-u1/science-third-batch/verify_third_batch.py 12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8
node scripts/verify_private_study_pack.mjs 12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8
```

正式 builder 只能輸出本工作樹的精確 ignored `data/private/study/g4-s1-math-u1/pack.json`，契約及 128 KiB 上限不放寬。正式題包為 **revision 7、94 題（數學 57／自然 37）、125,022 bytes、SHA256 `12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8`**。private verifier、production parser 均通過；舊 89 題的完整 question、explanation、mapping row 逐值相同，公開 selection／mapping 與 private pack 新增 ID 精確一致，重新序列化與正式 pack 逐 byte 相同。記憶體模擬待發布與發布後兩種 metadata 狀態，皆能重建相同 hash，錯誤狀態則拒絕。相關合成 Node 測試 17 項、private builder Python 測試 51 項通過。

瀏覽器 QA 可重用 `tests/helpers/serve-family.mjs` 的 `test-token`、記憶體 KV 與隔離 Study 試玩入口；只在隔離環境導入核准 pack，檢查孩子與家長的圖表、逐格操作和進度哨兵，不接正式 session 或孩子 `p:` key。

## 正式發布與讀回

[PR #131](https://github.com/huansbox/aiden-study/pull/131) 合併為 `e1301ef8b27f6dbee7f53a687bb2ddf8be27073c`；Pages run `36257149727` 成功，Study 兩個 HTML 入口及 `science-topics.js` 三檔逐 byte 符合該 commit。內容寫入前，正式 KV 的 revision 6 基線逐 byte 符合核准值。管理端只對固定內容 key `c:study:g4-s1-math-u1` 執行一次前向 put；立即讀回（2026-09-26 16:57:19.021 UTC）及傳播後讀回（16:58:39.600 UTC，相隔 80.579 秒）均為 revision 7、94 題、125,022 bytes，SHA256 與上方核准值相同。現役 Worker version `6b4c4317-b419-4282-bad0-3c67219ed374` 前後皆承接 100% 流量，本輪未 deploy Worker；未讀寫任何孩子進度 `p:` key，也未使用正式家庭 session。

發布摘要與原始讀回證據保存在 canonical ignored `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev7-release/release-audit/release-summary.json` 及同目錄歸檔。這是正式內容發布證據，不代表實體 iPad／Safari 已驗收。

## 統籌整合驗收

Node 全套 729 項通過；Python 271 項通過、1 項略過。5 個新活動在 768×1024、1024×768、390×844 的隔離 Study 與家長試玩共 30 條流程通過：圖表可讀／放大、一次一小題、返回保留選擇、全部完成才提交及整組只計一次。家長試玩的進度哨兵未變，API 僅 session／pack GET，沒有進度寫入。使用 Chromium 尺寸模擬，未另做實體 iPad／Safari 驗收。

Fresh integration reviewer 已獨立核對上述實包與原 89 題、公開投影、私有邊界及重建。已修正公開進度文件更新會阻擋重建的問題；待發布／發布兩態均以記憶體模擬複驗，非法 coverage 或狀態混用均拒絕，磁碟題包及輸入不變。

canonical ignored `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev7-release/` 已保留核准 pack、三份 merged 輸入、候選／原圖／作者與獨立審查、重建腳本與隔離 QA。新收 3 份題答 PDF 及兩組來源查核原件共 17 檔另保存在 canonical task 的 ignored `source/`，逐檔 SHA256 相符。完整 clone 不包含這些私人內容；重建時將 archived merged 輸入及 `science-third-batch/` 恢復到新 worktree 的精確 ignored private root，配合該發布版本的公開 mapping 執行上述指令，不在舊 checkout 直接改正式內容。
