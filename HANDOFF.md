# HANDOFF

- Status: in_progress
- Task/issue: https://github.com/huansbox/aiden-study/issues/55（四上數學 U1：歷屆題庫接入 iPad 練習）
- Branch: master（文件與 tracker 修正另在 `codex/g4-u1-auto-private-pack-docs`）
- Implementation: W1 [#56](https://github.com/huansbox/aiden-study/issues/56)、W2 [#57](https://github.com/huansbox/aiden-study/issues/57) 與原 W3 review 已完成；家庭權限自動讀取修正 [#58](https://github.com/huansbox/aiden-study/issues/58) 實作中；真 iPad／家長驗收在 #58 發布後進行
- Updated: 2026-09-12

## Progress

W1 已交付 Study 的三下／四上入口、私用題包匯入、safe loading、缺包保留進度與半批接續，題包契約記錄於 `docs-dev/grade4-u1-pack-contract.md`。W2 已交付六題 private pack builder、公開追溯 metadata、精確 ignore 規則與家長／維護操作說明；公開 `questions.json` 與 `explanations.json` 的內容未變，公開題數仍為 1,924。#56／#57 保持 closed，這些 manual import 成果與 QA 是可用歷史和備援，不代表新的自動讀取路徑已上線。

W3 clean-context review 已通過，沒有未解 finding。完整 repo 證據為 Node 254 tests pass、pytest 160 pass／1 個既有 ignored PDF extraction skip；builder 最後修正後的受影響驗證為 64 tests pass，其中 builder 26 tests。六題已獨立重算一致；desktop 真 DOM 已覆蓋部分作答、重開接續、最後一題答對／答錯後立即重載、三下欄位不變、缺包保存與重匯恢復；原生 browser file chooser 亦以正式 pack 完成首次匯入與重開保留。

正式 private pack 與 QA 只保存在 ignored 本機路徑 `data/private/study/g4-s1-math-u1/`，不進 Git、public build、進度備份或同步 payload。`pack.json` SHA256 為 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`。

2026-09-12 最新核准方案已取代「家長每個容器首次傳檔」作為正常 UX：#58 會沿用 family token，從 Cloudflare Worker／KV 的固定家庭唯讀路徑自動取得 `g4-s1-math-u1`；題包使用獨立 content key，不碰 `p:` 進度 key。手動 import 保留為備援。#58 尚在實作，不能宣稱 Pages 或孩子 iPad 已有自動載入；未設定 token 的裝置仍需一次家庭設定。

## Next step

1. 依 #58 完成 Worker 唯讀 contract、管理端從 ignored 已驗證 pack 寫入獨立 content KV、Study 自動載入與家長 token 設定後重試；以 synthetic／`test-child` 完成受影響測試、完整 Node／Python、desktop CUA 與獨立 review。
2. 依序發布 Worker、正式 pack 與 Study／Pages；每一步確認不洩漏真題、不碰 `p:` 進度 key，且失敗可保留既有 cache／state。Cloudflare 管理權限若不可用，停在部署 gate，不重鑄 token 或讀孩子真 progress。
3. 發布完成後，在孩子實際使用的 iPad／容器核對 family token 是否已設定；未設定時完成一次家庭設定，再確認自動取得六題、部分作答後接續、三下與另一 child 隔離及失敗時 cache／提示。結果記回 #55，全部通過後才關閉並決定是否擴充下一批。

平台維運維持另一條線：#35 仍是 #34 自訂網域搬遷的真 iPad stop-gate；#34 的逐容器備份、同步健康與進度對帳完成前，不移除舊圖示或清理舊 repo。這不阻擋現行網址執行 #55，也不因本次 desktop／Study 驗證而視為已完成。

## Validation

- W1、W2 的 acceptance criteria 已由統籌依獨立 review 與 W3 最終整合 review 接受。
- W3 驗證 public 題庫仍為 1,924 題且原 blobs 相同，tracked files 不含六題 private 題文、答案或解說。
- 正式題包通過 production validator；builder 僅能輸出到受保護的 private root，外部輸出路徑 finding 已修正並複驗。
- 既有 desktop 與原生 file chooser 證據只代表 manual path 的歷史預檢；#58 的自動讀取須另跑 production wiring／CUA／clean-context review，兩者都不冒充真 iPad 或 #35 驗收。
- 發布後的 `test`、`publish-wiki` 與 Pages 結果以 GitHub Actions 與 #55 最終發布 comment 為準。

## Blockers

沒有待家長決定的方案 blocker。目前交付順序是先完成 #58 實作、review 與發布，再做孩子實際 iPad gate；Cloudflare 管理權限是否可用另由統籌確認。#55 在自動路徑與真機證據都完成前保持 open。
