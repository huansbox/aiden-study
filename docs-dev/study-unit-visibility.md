# Study 單元隱藏（#250）

每位孩子的 `archivedStudyUnits` 預設空陣列；只改顯示／可練範圍，不刪題目、作答、錯題、標記、半批或課表。家長「題庫單元」取消勾選即隱藏，再勾選即可恢復。獨立 preview 不套孩子隱藏設定，也不寫進度。

單元中立唯一來源為 `docs/shared/family-core.js` 的 `STUDY_UNITS`，欄位 `{id,term,subject,num,name,semester,published,subtopics?}`。`studyTerms()`、首頁、排程、家長選單與 Worker 共用此來源；`published:false` 不產生可練內容。1–23 ID 維持，24–28 數學、29–30 自然、31–32 社會只保留候選 ID，這一版未發布新題。後續內容需另擴充 `private-pack.js`、`pack-catalog.js`、Python builder 的科目／unit／ID契約；不能只切 `published`。

Study 重開或返回入口會讀設定，開始練習再次核對；作答中不換題。離線使用上次取得的設定；另一裝置須連線回入口才能取得新設定，這不是即時推播。所有開始／錯題入口都核對範圍；跨隱藏單元的舊混合入口不會啟動。恢復後原半批及安排可繼續使用。

每日目標保留原 `configs`、當日 `targets`、`counts`；有效目標是投影結果，未開放的科目列為 `pausedTargets`。Worker route 從可信 KV 取得家庭設定，將當日 profile 交給 DO／共用 collection 規則，忽略 client 自報的 availability。當日 entitlement 仍包含原目標已累積完整份量；當全無有效目標時，以「原完整份量」與「已完成自由輪的每日1包」取較大值，再扣已領數，不額外相加。昨日補送沿用原日規則，今天設定不回改昨日。

## 驗證與限制

- `node --test "tests/*.mjs"`：1201 passed。
- `uv run pytest`：341 passed、1 skipped（既有歷史題庫 regression）。
- `tests/test_study_visibility.mjs` 覆蓋中立候選門檻、另一孩子／學期、原課表與進度、部分份量、隱藏已領科後另一科仍按原份量領包、全暫停與恢復去重、昨天補送、真 SQLite 的可信設定與舊客戶端保留欄位。
- `tests/helpers/study-visibility-browser-check.mjs` 啟動本機 synthetic 家庭／KV／SQLite，768×1024 完整動線、`--layout` 的1024×768家長控制／無內容／恢復補驗均通過。依本機環境提供 `CODEX_PLAYWRIGHT_PACKAGE`、`CHROMIUM_EXECUTABLE`；`STUDY_VISIBILITY_EVIDENCE_DIR` 可指定截圖／JSON位置。只連 loopback，沒有正式家庭測試寫入。
- 這些是 Chromium 實際瀏覽器操作，尚未以實體 iPad／Safari 雙裝置驗證。

本輪附件使用 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-planning-2026-11-06/issue-250-runtime/`。獨立審查、PR與正式發布由統籌接續，本文件不宣稱已發布。

## 統籌發布及哥哥設定 dry-run

1. 先部署新版 Worker（validator、舊client欄位保留、collection可信設定）；讀回必要版本與設定欄位，確認部署成功後才發布新版 Pages。核對 Study／parent實際 script URL、首頁 `home-release.json` 與預期 bytes。
2. 使用已保存的原 settings wrapper `ops/family-settings-before.json`（同批 Dropbox 根目錄），保留其 `rev`、`writeId`、`data` 作恢復備份。套用前再讀正式 settings；若 rev／資料已變，重新計算差異，不覆蓋並行修改。
3. 候選 `data` 深拷貝目前資料，僅將 `children.aiden.archivedStudyUnits` 改成原清單與 `[15,16,17,18,19,20,21,22,23]` 的聯集。弟弟、其他學期、apps、terms、weekly、overrides、首頁等欄位逐值維持。不得使用 goals 命令或寫作答／收藏。
4. PUT payload 使用原 `rev` 作 expected revision（**不自行 +1**）、新的唯一 `writeId`、候選 `data`。伺服器成功回應才將 rev 增1；同一 request 若回應遺失，重送同一 writeId／payload。409則停止，重新讀取後核定差異。
5. 讀回 settings 比較預期改動；讀取首頁／Study及每日目標的可用範圍，確認原 goals 保留。讀回收藏可能調和既有當日已累積獎勵，因此正式驗收只依統籌授權做必要唯讀，不製造 record／round 測試事件。
6. 若需恢復，重新讀取最新 wrapper，僅把哥哥隱藏清單還原為備份值，再用最新 rev與新writeId提交；不整份覆寫舊wrapper，以免撤銷他處修改。

## 本輪經驗

- 隱藏畫面與刪除目標是不同操作；保留原份量可避免已領科目隱藏後，把其他科下一包門檻抬高。
- 「全部沒目標」的自由輪資格必須與當日原已領數一起對帳，否則隱藏／恢復可重領。
- 實際 Study 的錯題庫要累計答錯兩次；E2E使用兩次錯答建立原錯題，不能把一次錯答假設成錯題庫已有資料。
