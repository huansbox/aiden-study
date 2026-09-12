# HANDOFF

- Status: in_progress
- Task/issue: https://github.com/huansbox/aiden-study/issues/55（四上數學 U1：歷屆題庫接入 iPad 練習）
- Branch: master
- Implementation: W1 [#56](https://github.com/huansbox/aiden-study/issues/56)、W2 [#57](https://github.com/huansbox/aiden-study/issues/57) 已完成；W3 獨立整合 review 已通過；W4 真 iPad／家長驗收 pending
- Updated: 2026-09-12

## Progress

W1 已交付 Study 的三下／四上入口、私用題包匯入、safe loading、缺包保留進度與半批接續，題包契約記錄於 `docs-dev/grade4-u1-pack-contract.md`。W2 已交付六題 private pack builder、公開追溯 metadata、精確 ignore 規則與家長／維護操作說明；公開 `questions.json` 與 `explanations.json` 的內容未變，公開題數仍為 1,924。

W3 clean-context review 已通過，沒有未解 finding。完整 repo 證據為 Node 254 tests pass、pytest 160 pass／1 個既有 ignored PDF extraction skip；builder 最後修正後的受影響驗證為 64 tests pass，其中 builder 26 tests。六題已獨立重算一致；desktop 真 DOM 已覆蓋部分作答、重開接續、最後一題答對／答錯後立即重載、三下欄位不變、缺包保存與重匯恢復；原生 browser file chooser 亦以正式 pack 完成首次匯入與重開保留。

正式 private pack 與 QA 只保存在 ignored 本機路徑 `data/private/study/g4-s1-math-u1/`，不進 Git、public build、進度備份或同步 payload。`pack.json` SHA256 為 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`。#55 保持 open，等 W4 在孩子實際使用的 iPad 容器完成家長驗收。

## Next step

1. 先把 Windows 本機保存的 `pack.json` 傳到 iPad「檔案」，再從既有主畫面圖示或 hub 開啟哥哥慣用的 Study 容器，展開「家長：四上題包匯入」並選擇該檔案。
2. 看到「題包已保存，這個容器可重開繼續使用。」後進入四上數學 U1，完成部分題目、離開並重開，確認剩餘題接續；切回三下確認原進度不變。
3. 完成 `docs-dev/grade4-u1-study-integration-plan.md`「真 iPad 最終驗收」的完整清單，包括另一 child 隔離與另一容器缺包／還原／重匯恢復，再將裝置、容器與結果記回 #55；全部通過後才關閉 #55，並決定是否擴充下一批。

平台維運維持另一條線：#35 仍是 #34 自訂網域搬遷的真 iPad stop-gate；#34 的逐容器備份、同步健康與進度對帳完成前，不移除舊圖示或清理舊 repo。這不阻擋現行網址執行 #55，也不因本次 desktop／Study 驗證而視為已完成。

## Validation

- W1、W2 的 acceptance criteria 已由統籌依獨立 review 與 W3 最終整合 review 接受。
- W3 驗證 public 題庫仍為 1,924 題且原 blobs 相同，tracked files 不含六題 private 題文、答案或解說。
- 正式題包通過 production validator；builder 僅能輸出到受保護的 private root，外部輸出路徑 finding 已修正並複驗。
- Desktop 與原生 file chooser 證據只代表發布前預檢，不冒充真 iPad 或 #35 驗收。
- 發布後的 `test`、`publish-wiki` 與 Pages 結果以 GitHub Actions 與 #55 最終發布 comment 為準。

## Blockers

沒有待家長決定的方案 blocker。唯一剩餘交付 gate 是 W4：在孩子實際使用的 iPad／容器匯入正式 private pack，完成接續與三下隔離驗收；#55 在取得該證據前保持 open。
