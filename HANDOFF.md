# HANDOFF

- Status: in_progress
- Task/issue: https://github.com/huansbox/aiden-study/issues/55（四上數學 U1：歷屆題庫接入 iPad 練習）
- Branch: master（本輪 release）
- Implementation: W1 [#56](https://github.com/huansbox/aiden-study/issues/56)、W2 [#57](https://github.com/huansbox/aiden-study/issues/57) 與原 W3 review 已完成；家庭權限自動讀取修正 [#58](https://github.com/huansbox/aiden-study/issues/58) 的 code／獨立 review、Worker 與正式 KV pack 發布已完成；真 iPad／家長驗收 pending
- Updated: 2026-09-12

## Progress

W1 已交付 Study 的三下／四上入口、私用題包匯入、safe loading、缺包保留進度與半批接續，題包契約記錄於 `docs-dev/grade4-u1-pack-contract.md`。W2 已交付六題 private pack builder、公開追溯 metadata、精確 ignore 規則與家長／維護操作說明；公開 `questions.json` 與 `explanations.json` 的內容未變，公開題數仍為 1,924。#56／#57 保持 closed，這些 manual import 成果與 QA 是可用歷史和備援，不代表新的自動讀取路徑已上線。

W3 clean-context review 已通過，沒有未解 finding。完整 repo 證據為 Node 254 tests pass、pytest 160 pass／1 個既有 ignored PDF extraction skip；builder 最後修正後的受影響驗證為 64 tests pass，其中 builder 26 tests。六題已獨立重算一致；desktop 真 DOM 已覆蓋部分作答、重開接續、最後一題答對／答錯後立即重載、三下欄位不變、缺包保存與重匯恢復；原生 browser file chooser 亦以正式 pack 完成首次匯入與重開保留。

私用來源與 QA 保存在 ignored 本機路徑 `data/private/study/g4-s1-math-u1/`；正式 pack 另已部署至家庭私用 KV。兩者都不進 Git、public build、進度備份或同步 payload。`pack.json` SHA256 為 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`。

2026-09-12 最新核准方案已取代「家長每個容器首次傳檔」作為正常 UX：#58 沿用 family token，從 Cloudflare Worker／KV 的固定家庭唯讀路徑自動取得 `g4-s1-math-u1`；題包使用獨立 content key，不碰 `p:` 進度 key。手動 import 保留為備援。Code 與獨立 review 已完成，Worker 與正式 KV pack 已發布；未設定 token 的裝置仍需一次家庭設定，production authenticated GET 與孩子 iPad 操作保留 W4 驗證。

#58 clean-context review 最終 PASS，唯一 P2「無 cache 且已有 flagged 進度時，自動載入後未刷新還原控制」已由作者修正並複驗，無未解 finding。Release 候選 `55982a692491c4a5ba9fdb8d8ec12f30af411ae0` 與 reviewer 最終 code `3f7a48dc30864510ccffd0e673471f008580973c` 的 runtime blobs 相同，只多四份狀態文件。

Cloudflare Worker version `239acf2e-0a30-4c8b-abcc-dd728a589508` 已為 100% 流量，正確 rollback version 為 `84449a7f-f48d-447a-9ba5-4a13f216b6d0`。正式 pack 已單次寫入 `c:study:g4-s1-math-u1`，管理端 immediate 與 72 秒後 readback 均為 4,102 bytes、SHA256 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`；沒有操作 `p:`、`/status`、真 token 或孩子進度。

## Next step

1. 在孩子實際使用的 iPad／容器核對 family token 是否已設定；未設定時完成一次家庭設定，再確認 production authenticated GET 可自動取得六題。
2. 完成部分作答後接續、三下與另一 child 隔離、未送出輸入清空及失敗時 cache／提示。結果記回 #55，全部通過後才關閉並決定是否擴充下一批。

平台維運維持另一條線：#35 仍是 #34 自訂網域搬遷的真 iPad stop-gate；#34 的逐容器備份、同步健康與進度對帳完成前，不移除舊圖示或清理舊 repo。這不阻擋現行網址執行 #55，也不因本次 desktop／Study 驗證而視為已完成。

## Validation

- W1、W2 的 acceptance criteria 已由統籌依獨立 review 與 W3 最終整合 review 接受。
- W3 驗證 public 題庫仍為 1,924 題且原 blobs 相同，tracked files 不含六題 private 題文、答案或解說。
- 正式題包通過 production validator；builder 僅能輸出到受保護的 private root，外部輸出路徑 finding 已修正並複驗。
- 既有 desktop 與原生 file chooser 證據只代表 manual path 的歷史預檢；#58 的自動讀取已另跑 production wiring／CUA／clean-context review，兩者都不冒充真 iPad 或 #35 驗收。
- #58 作者完整驗證為 Node 264 pass、pytest 166 pass／1 個既有 missing-PDF skip，修正相關 46 pass；reviewer 最終為 PASS、無未解 finding，獨立跑完整 Node 264 pass 與修正相關 28 pass。
- Reviewer 的 production harness／CUA 覆蓋首次設定 token → 自動六題、答兩題後 reload 顯示 2／6 並接續、503 保留 cache／state、家長草稿保留，以及無 cache＋六題 flagged → 自動載入後立即可還原 → 0／6 開始。
- Live 無 token／fake token GET 均為 401；`OPTIONS` 為 204，`Access-Control-Allow-Origin` 是 `https://huansbox.github.io`。正式 positive 200／`no-store`／exact hash 已由 reviewer 用 production Worker、正式 pack 與 fake token 驗證；production family-token positive GET 留給 W4。
- 本輪 `test`、`publish-wiki` 與 Pages 的精確結果見 #58 結案證據與 #55 發布 comment，不在 commit 前預寫成功。

## Blockers

沒有待家長決定的方案 blocker。下一個家庭 gate 是 W4：在孩子實際使用的 iPad／容器完成 family token、自動取得與接續驗收。#55 在取得真機證據前保持 open。
