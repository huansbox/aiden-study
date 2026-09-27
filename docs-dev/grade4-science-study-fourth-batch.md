# 四上自然第四批 Study 整合（#134）

本批從五堵國小 113 學年度**四下期末**翰林自然卷挑選與今年四上暫定核心相符的地表題。來源不是桃子腳 115 學年度第一次評量卷，也沒有本卷官方答案；不因出版社或概念相近就把全卷視為今年考試範圍。選擇題 3、5 的地震防災，以及綜合題 5 的流水搬運圖共三個 activity、五個原卷作答格，均經作者與 fresh reviewer 各自獨立解題、覆核完整圖文後由統籌核准。本輪三題全部收錄，沒有本輪排除題；第三批歷史排除仍維持原狀。

## 基線與內容邊界

唯一正式基線是 canonical ignored `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev7-release/`：revision 7、94 題（數學 57／自然 37）、125,022 bytes、SHA256 `12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8`。同一歸檔的三份 `merged/` input 與本工作樹公開 mapping 原 94 筆逐值相同。128 KiB 尚餘 6,050 bytes；本批不刪舊題、不放寬上限，也不改 pack 架構。

核准的本地題包為 **revision 8、97 題（數學 57／自然 40）、130,248 bytes、SHA256 `ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29`**；距 128 KiB 上限剩 824 bytes。這是精確本工作樹 ignored `data/private/study/g4-s1-math-u1/pack.json` 的 production builder 輸出，尚未寫入正式 KV。

完整題文、答案、解說、原圖與審題證據只放在精確 Git ignored `data/private/study/g4-s1-math-u1/science-fourth-batch/`。作者的 `curated-delta.json` 保持 `verification: pending`、`answerPage: null`；整合腳本僅對核准 ID 在合併副本中設定 `independently_solved_twice_no_official_answer`，正式 mapping 同步設 `reviewStatus` 與 `answerPage: null`。公開候選與 selection 只列來源、狀態與收錄集合，不放題文、答案或圖像。

## 可重建與核對

`science-fourth-batch/rebuild_fourth_batch.py` 無核准參數時只核對 rev7 baseline。核准後須傳入完整 `--approved-id` 集合、review snapshot SHA256 `aa1c32109b7eaa709e515c6a2e5d64755a983f5e418f1bd7f7e7b582eaa6c282` 與 report SHA256 `357960d9b7aefe7304440751a966fd4ad5db1c7ca53fe604026aef3c888fecea`；它核對每筆只排除 `verification` 的作者內容指紋、來源投影、舊 94 題完整 question／explanation／mapping 逐值相同，並先用 production builder 在私人暫存處試建。`reviewed-inputs.json` 本身固定 SHA256 `e442d855681d6f9e957015cccddf3eb82d02ba874438a8358e107fd32723a8cd`，其九項 private/原卷/版本來源逐一比對 bytes 與 SHA256；換工作樹時舊 worktree 路徑按 `science-fourth-batch/` 相對位置對到新樹，兩份 canonical PDF 仍依固定來源核對。唯有精確核准集合且產物不超過 128 KiB，才寫本工作樹 ignored merged inputs 與公開 mapping／selection。公開候選和缺口文件的審查當時 hash 留作歷史證據，進度狀態變更後以現行欄位投影核對，不把舊全文 hash 當重建門檻。

`science-fourth-batch/verify_fourth_batch.py` 以核准 pack SHA256、兩份 review SHA256 核對原 94 題、新增 ID 集合、公開狀態投影、作者 pending delta、production builder 同 byte 重建與 production JavaScript parser。公開候選／selection 在待發布時分別為 `content_review_complete_pending_release`／`reviewed_pending_release`，全部發布後同為 `published`；兩態重建的 pack bytes 相同，coverage 只在正式發布後改為 true。production builder 只能輸出此工作樹精確 ignored `data/private/study/g4-s1-math-u1/pack.json`。

從 repo 根目錄執行；完整 ID 清單直接從核准 snapshot 取得，不能自行縮成部分題：

```powershell
$privateBatch = 'data/private/study/g4-s1-math-u1/science-fourth-batch'
$approvedIds = (Get-Content "$privateBatch/review/approved-subset.json" -Raw | ConvertFrom-Json).items.id
$approvedArgs = @(); foreach ($approvedId in $approvedIds) { $approvedArgs += @('--approved-id', $approvedId) }
uv run python "$privateBatch/rebuild_fourth_batch.py" @approvedArgs --approval-sha256 aa1c32109b7eaa709e515c6a2e5d64755a983f5e418f1bd7f7e7b582eaa6c282 --review-sha256 357960d9b7aefe7304440751a966fd4ad5db1c7ca53fe604026aef3c888fecea --state pending
uv run python scripts/build_private_study_pack.py
uv run python "$privateBatch/verify_fourth_batch.py" ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29 --approval-sha256 aa1c32109b7eaa709e515c6a2e5d64755a983f5e418f1bd7f7e7b582eaa6c282 --review-sha256 357960d9b7aefe7304440751a966fd4ad5db1c7ca53fe604026aef3c888fecea
node scripts/verify_private_study_pack.mjs ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29
```

主題入口仍為七個自然主題；`S1b 流水搬運圖示` 歸地表變化與保護，`S1c 地震當下行動`、`S1c 地震保命步驟` 歸地震與防災。Study 兩個 HTML 入口同用 `20260927-science-fourth-batch` helper cache version，避免載到舊版分類。聚焦主題測試 3 項通過；統籌 Node 全套 748 項、Python 271 項通過與 1 項略過、catalog `--check` 通過。

隔離 Study 孩子頁與家長試玩以 768×1024、1024×768、390×844 三種畫面跑三題，共 18 條流程通過；窄畫面的放大圖可橫向捲到 A/B/C 標記並返回，另兩條檢查通過。26 張截圖中代表畫面已目視覆核；試玩進度哨兵未變，隔離 API 只有 session／pack GET。這是 Chromium 尺寸模擬，未另作實體 iPad／Safari 驗收。

## 發布與保存界線

本批內容和 helper 會一起進公開 PR。正式發布順序由統籌核准：先確認 Pages 上 Study 兩個 HTML 與 helper 精確對應合併版本，再依既有 content-only 契約先 capture 正式 KV rev7 原始 bytes，比對核准基線，僅對固定 `c:study:g4-s1-math-u1` 前向寫入一次 rev8，最後立即及傳播後各讀回原始 bytes，比對題數、大小、revision 與核准 SHA256。任何步驟不碰孩子 `p:` 進度鍵，也不把舊版 Worker 重新 deploy。正式發布與 readback 由統籌執行；本地建置與模擬不等於發布。

rev8 的 pack、merged inputs、`science-fourth-batch/` 作者與審查證據、隔離 QA/測試結果會保存到 canonical ignored `rev8-release/`。歸檔與讀回腳本只接受核准 hash；已存在的 stage 證據不重寫。rev7 歸檔保持原狀，讓每次升版都能回查同一份已發布基線。
