# 家長作品白板維護

家長在 `/parent/` 的「作品白板」找 App、一次性任務與已登錄主線外作品；「家庭設定」仍是原本的設定入口。白板本身只讀，不寫孩子進度或家庭設定。作品連結可能通往真正的學習 App，不能把所有連結當成不計分試玩。

## 只登錄一次

| 內容 | 修改來源 | 自動呈現 |
| --- | --- | --- |
| App 名稱、對象，以及 `work` 中的來源／白板 metadata | `docs/registry.json` | root README App 總覽、白板 |
| 一次性任務、明確工作狀態、系列及主線外來源 | `learning-tasks/catalog.json` | 任務 README 索引、root README、白板 |
| 操作／歸檔規則 | `learning-tasks/README.md` 的非產生區段 | 新任務的操作入口 |

新增 task 時先建 `learning-tasks/<task>/README.md` 並加入 catalog。`shared/` 是共用經驗，不算一份作品；主線外作品須有明確 repo／ref／來源位置，不複製其來源。私用 PDF 或錄音不為補白板連結而公開。

```sh
node scripts/build-work-catalog.mjs
node scripts/build-work-catalog.mjs --check
```

生成器產出 `docs/parent/work-catalog.json` 與兩份 README 的受控清單。不要手改這些產物；漏登 task、無效來源或資料不一致會使檢查失敗。修改 App registry 後，沿用既有首頁版本流程執行 `node scripts/build-home-release.mjs`。

一般 CI 比對登錄與產物時，只容許本地 `created`／`updated` 在「來源已提交、bot 尚未重建」之間的差異；其他欄位及遠端快取仍須一致。Git 日期演算法另有完整歷史測試；發布流程一律先重建再嚴格 `--check`，不能因此發布舊日期。

## 日期與狀態

- `create` 是目前來源位置在 Git 首次收錄的臺灣日期；搬移前的原始創作時間未必可追溯。`update` 是該來源範圍最近變更，包含文件與素材，不是孩子作答、部署或例行同步時間。Git 歷史排除無關合併造成的假更新，但保留合併解衝突時真正修改來源的紀錄。
- 同系列一列，展開後看各份素材；系列日期取最早已知 `create` 與最新已知 `update`。分組不改變各成員的狀態。
- 工作狀態由來源明確標記；沒有依據就顯示未知。App registry 的 `active`／`draft`／`parked` 是上下架狀態，不能用來猜這次新增題目是否完成。
- 可用版本獨立呈現；作品可以仍在改版，但已有可使用的成品。被忽略的私人檔案不在 clone 中，不代表任務沒完成。
- 未知日期顯示「—」。同步失敗保留相同來源的已知值並提示可能過期；長時間沒有查核也不能視為最新。未推送的住家電腦內容不會出現。

## 自動更新與失敗處理

主線提交後重建；每日臺灣時間 05:23 排程同步已登錄外部 repo 與主線外 ref（GitHub 排程可能延遲），也可手動執行 `work-catalog` workflow。`scripts/sync-work-catalog.mjs` 只更新公開來源 metadata 的快取，`scripts/build-work-catalog.mjs` 再產生共同顯示資料；不讀私人家庭資料、不改外部作品。外部來源超過 48 小時未成功查核時，畫面自行標示可能過期，即使排程根本沒執行也不會永遠顯示最新。

主線 push 使用 `sync-work-catalog.mjs --missing-only`，只查核新登錄、來源變更或尚未成功取得資料的項目；已有同來源快取不因每次 push 改寫查核時間。每日／手動執行則完整同步。沒有產物差異就不產生 bot commit；真正來源更新所需的日期變化仍會提交。

取得日期必須有足夠完整的 Git 歷史；淺層 checkout 應補足歷史或明確失敗，不能把 checkout 當天當成建立日。遠端來源更換時不能沿用舊來源快取。

遠端來源路徑須在確定的 commit 中存在；查不到路徑或任何歷史時，視為來源取得失敗，保留相同來源的舊日期並提示過期，不能用空日期蓋掉已知值。

自動交付沿用現有 GitHub Pages，工作分支只測試、不發布未合併程式。workflow 必須明確要求 Pages build 並比對正式 `/parent/work-catalog.json`，不能把「bot commit 已推送」或「CI 成功」當成網站已更新。若主線在產生期間前進，安全失敗後重跑，不 force push 覆蓋他人工作。

## 本機與驗收

```sh
node tests/helpers/serve-family.mjs 8788
```

開啟輸出的 `/test/start`；只用 test-token、記憶體 KV 與合成題目，不接正式家庭資料。以實際畫面檢查搜尋、篩選、系列展開、連結與窄螢幕；白板操作前後未儲存表單及家庭資料應不變。資料載入失敗須可辨認，不冒充空清單。

`/test/controls` 可單獨暫停／恢復白板資料，測試首次失敗、重載失敗保留舊值及恢復。這只影響隔離服務，不改正式資料。macOS 若既有 Native Camp 測試遇到 `/var` 與 `/private/var` 的暫存路徑差異，可用 `env TMPDIR=/private/tmp node --test tests/*.mjs`，不改私人來源路徑防護。

本功能以 [#89](https://github.com/huansbox/aiden-study/issues/89) 統籌，[#90](https://github.com/huansbox/aiden-study/issues/90) 交付真實清單，[#91](https://github.com/huansbox/aiden-study/issues/91) 交付自動更新。合併前完成測試與獨立 review；合併／發布後取得主線提交與同一同步流程手動執行的正式頁面證據，才關閉 #91 與主 issue。不要用 PR 關鍵字提前自動關閉。

架構緣由見 [ADR-0008](adr/0008-generated-work-catalog.md)；舊 [ADR-0007](adr/0007-learning-task-library.md) 的分類與歸檔原則不變。
