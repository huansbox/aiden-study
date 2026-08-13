# HANDOFF

- Status: idle
- Task/issue: GitHub #35（iPad 單容器 spike）；後續 #34（自訂網域搬遷）
- Branch: master
- Updated: 2026-08-13

## Progress

本 session 完成專案與遷移狀態回顧。平台 #27–#33 已完成，現況停在正式切換前的 #35 iPad stop-gate；#34 仍 blocked by #35。使用者決定「期中自然 unit 1/2 作答後說明」與「3 題隱藏數學題救回」均為 not planned，已更新 `CLAUDE.md` 與 `skipped_questions.md`，不再列入後續工作。

## Next step

取得 iPad 後，依 `docs-dev/platform-ipad-spike-checklist.md` 執行 #35 三項真機驗證。三項全 PASS 才關閉 #35 並開始 #34；任一 FAIL 則停止 #34，先用 `/grill-me` 重新對齊架構。若仍沒有 iPad，本 repo 目前沒有已選定的桌面工作要接續。

## Validation

- `git fetch --prune`：`master` 與 `origin/master` 對齊，session 開始時 working tree 乾淨。
- GitHub：#35、#34、#26、#20、#15 狀態與 parent/child 關係已查核；無 open PR；最新 `master` test 與 Pages workflow 成功。
- Live HTTP：hub、platform iPad spike、zhuyin recorder 均回 200；同步 API 無 token 回 401，符合預期。
- 本 session 只修改文件與 tracker，未執行 Python／Node.js test suites。

## Blockers

目前手邊沒有 iPad，無法執行 #35 真機驗證；桌面瀏覽器、模擬器與自動測試不可替代。#34 在 #35 通過前不得開始正式切換。
