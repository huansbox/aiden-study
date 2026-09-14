# HANDOFF

- Status: in_progress
- Task/issue: https://github.com/huansbox/aiden-study/issues/55（四上數學 U1：歷屆題庫接入 iPad 練習）
- Branch: master
- Implementation: #56／#57／#58 已完成並關閉；W4 家長回報四項通過，完整驗收未結案
- Updated: 2026-09-14

## Progress

Study 的三下／四上入口、首批六題 private pack、safe loading、缺包保留進度與半批接續已交付。#58 的家庭權限自動讀取、獨立 review、Worker／正式 KV pack／Pages 發布均完成；正常流程不要求家長傳檔，manual import 留作備援。公開題庫仍為 1,924 題。

2026-09-14 家長已回報：設定家庭金鑰後自動載入六題、重開接續並保留已送出進度、未送出輸入清空、哥哥／弟弟進度隔離。環境已知為 **iPad、橫向**；型號、iPadOS 版本與 Safari／主畫面 App 尚未確認。這是家長操作證據，未讀取真 token、題文或孩子雲端進度，也未擷取真機 HTTP trace。

三下歷史進度／錯題由家長確認不再追回，該實際歷史資料對帳標為不適用；2026-07-17 已有放棄舊備份找回／對帳的決策。這不授權清除現有資料，也不取消 synthetic data 的年級隔離回歸或 #34 現有資料備份。

本次結果、證據界線與剩餘清單集中在 [`docs-dev/grade4-u1-ipad-acceptance.md`](docs-dev/grade4-u1-ipad-acceptance.md)。#55 仍 open，不因四項基本操作已確認就省略完整 W4。

## Next step

1. 先依驗收紀錄補記操作容器與已測離開路徑；四項已回報結果保留，不重新當作未開始。
2. 集中完成剩餘顯示／鍵盤操作、未涵蓋的離開路徑、另一測試容器的缺包還原，以及服務失敗／本機保存失敗提示。逐項記錄結果後，再依 #55 completion protocol 做結案核對與擴題決策。

#35 仍是 #34 自訂網域搬遷的真 iPad stop-gate；本次 Study 回報不取代其三前提。#34 的逐容器備份、同步健康與有效進度對帳完成前，不移除舊圖示或清理舊 repo。

## Release 與既有驗證

- 2026-09-12 release：`af427c70dbcea7e59dedc90bac53db4effa47d72`。該版 [test](https://github.com/huansbox/aiden-study/actions/runs/34700385626)、[publish-wiki](https://github.com/huansbox/aiden-study/actions/runs/34700385605) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/34700384937) 均 success；詳見 [#55 發布紀錄](https://github.com/huansbox/aiden-study/issues/55#issuecomment-5646646569)。
- W1／W2 acceptance 與原 W3 整合 review 已通過；六題獨立重算、public 題庫不變、private 邊界、desktop DOM 與 manual file chooser 均有歷史證據。
- #58 clean-context review 最終 PASS；唯一 flagged 還原 P2 已修正並複驗。作者當時完整驗證為 Node 264 pass、pytest 166 pass／1 個既有 missing-PDF skip；reviewer 完整 Node 264 pass 與修正相關 28 pass。這些是 2026-09-12 結果，不冒充本次重跑。
- Reviewer 的 production harness／desktop CUA 已覆蓋自動六題、半批 reload、503 保留 cache／state、家長草稿，以及無 cache＋flagged 後的還原控制；真 iPad 回報範圍另見驗收紀錄。
- 當時 live 無 token／fake token GET 為 401，OPTIONS 為 204；positive 200／no-store／exact hash 有 production Worker＋正式 pack＋fake token 的隔離測試證據。本次家長確認正式家庭設定後自動取題成功，但未新增真機 HTTP／hash 檢查。

私用來源與 QA 保存在 ignored 路徑 `data/private/study/g4-s1-math-u1/`，正式 pack 位於 KV 的獨立 content key `c:study:g4-s1-math-u1`；不進 Git、public build、進度備份或同步 payload。正式 pack 為 4,102 bytes，SHA256 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`。

2026-09-12 發布的 Worker version 為 `239acf2e-0a30-4c8b-abcc-dd728a589508`，rollback version 為 `84449a7f-f48d-447a-9ba5-4a13f216b6d0`；部署時 immediate 與 72 秒後 readback 均一致。本次文件整理沒有重部署或重新讀取 Worker／KV。

## Blockers

沒有待家長決定的設計 blocker。W4 仍有環境補記與未完成操作項目；詳見單一驗收紀錄，不再將已完成的家庭設定／自動取題列為完全待辦，也不把剩餘事項縮成只有服務失敗測試。
