# 技術債

> 快照日期：2026-10-03，全頁重新審查（對照程式、`docs-dev/` 發布紀錄與 2026-09-15 以來的交付）。依「利息」排序：現在就擋住下一步、或平常改 code 就會付成本的排前面；只有特定裝置或罕見競態才發生的排後面。技術債是已知權衡，不等於立即開工；已核准工作回查 [issues](https://github.com/huansbox/aiden-study/issues)。

## 不是技術債

- #35 iPad spike、#34 正式網域／圖示與注音 #15／#20 都已結案；家長免除的逐項 iPad checklist 不改列技術債。
- Monorepo、GitHub Pages、family token、不做登入、家長與孩子共用家庭存取權限、app 邏輯不抽共用 framework 都是 ADR 已拍板的設計。
- `wiring-v1.js` 載入失敗就擋站是安全行為，不是可用性 bug。
- Native Camp Weekly Review 停用自動排程、付費製音需人工確認，是家長決定與成本保護，不是待修功能。
- 私用題包、老師原音與原始考卷不進 Git 是設計；clone 缺這些檔不是缺檔 bug。

## 中利息

| 債 | 成本（利息） | 償還策略／條件 | 證據 |
|---|---|---|---|
| 新舊兩套認證路徑並存 | 同源 `/api/v1/*` 走 Cookie，舊 `workers.dev/v1/*` 仍收 family token，前端保留帶 `k` 圖示與 `kids_sync_token` 的轉移碼。每次動 Worker 或入口連線都要測兩條路；金鑰出現在舊圖示網址的風險也還在 | 兩支 iPad 都改用乾淨網址圖示、確認沒有入口還靠舊金鑰後，退役舊 API 與轉移碼。回退限制要先看：已轉移入口的舊金鑰已清除 | [入口連線說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/device-connection.md)、`worker/session.mjs`、`docs/shared/device-auth.js` |
| App 頁的共用腳本 cache-buster 靠手動同步 | 孩子首頁由 `build-home-release.mjs` 統一帶 release hash 且 CI 會查；五個同步 app 與家長後台仍手寫 `?v=`，現況已不一致（`wiring-v1.js` 四個 app 為 `20260916`、nativecamp 為 `20260917`）。漏改時該 app 載到舊共用檔，只在瀏覽器 cache 下出錯 | 先補 audit：同一共用檔在各入口的版本必須一致；再考慮把首頁的 release 機制延伸到 app 頁 | 各 app `index.html` script tag；`tests/test_registry_audit.mjs` 只查是否引用、不查版本 |
| `sync.markImported()` 的 meta 寫入失敗沒有回傳結果 | 匯入／重置已寫進 progress key，但若 localStorage quota 剛好讓 `anchorPending` 寫不進去，UI 仍會 reload，之後不一定補傳；fallback 路徑已誠實回報，正常 sync 路徑尚未對齊 | 讓 `patchMeta`／`markImported` 回傳成功與否，wiring 的匯入與 `anchorLocalWrite` 依結果阻止 reload 或顯示警告；補 effect／quota 測試 | `sync-v1.js` 的 `patchMeta` 以 `try {} catch {}` 吃掉例外，`markImported` 無回傳 |
| Native Camp 預製語音全數放在 Git 與 Pages | `docs/nativecamp/audio/` 約 116 MB、1,800 餘個 MP3，每堂課再加約 70 檔；repo pack 已約 80 MiB。clone、CI checkout（`fetch-depth: 0`）與 Pages 建置時間持續變長，Pages 網站建議上限為 1 GB | 目前可接受。當 clone／Pages 建置明顯變慢或接近上限時，評估把舊課音檔移到物件儲存或 KV，並保留 manifest hash 核對；不重製音檔 | `git count-objects -vH`；[Native Camp 共用工具](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/nativecamp/README.md) |
| Study 的 legacy／新 storage shape 永久 lazy 正規化 | `stats`、`mastered`、`errorBank` 的每個讀取點都要同時理解舊 flat 與新 `{modes:{…}}` 形狀；私用題包、題組與家長試玩加入後讀取點更多 | 下次變更 Study schema 時，在 load 階段做一次性 canonicalize，保留 schemaVersion migration 測試；未動 schema 前不單獨冒險改 | `docs/study/index.html` |
| Study 答錯 queue 回收邏輯分散 | 一般 submit 與手寫 remedial 完成各自做 `shift → push → saveBatch`；批次語義變更要同步改兩處 | 下次改批次／remedial 行為時抽共用 `requeueWrong`，以既有純函式測試鎖住 full／error 兩模式 | `submitAnswer` 與 `finishHandwritingRemedialQuestion` |
| 原始考卷 PDF 只存在單一機器 | `pdfs_*` 與四上數學／自然候選卷被 Git ignore、只在本機；社會看圖題、答案複核與題包重建會被檔案下落卡住，原機損壞可能永久遺失來源。Native Camp 私人資料已有 Dropbox 歸檔與逐檔 hash，考卷還沒有 | 下一次題庫擴充前，比照 Native Camp 的做法把原卷與 `data/private/` 的 rev 歸檔放進受控備份並留 manifest；大型 PDF 仍不進 Git | `.gitignore`；`learning-tasks/grade4-sem1-*-exam1/`；Wiki [Native Camp 資料保存與恢復](Native-Camp-Storage) |

## 低利息／已接受限制

| 債或限制 | 成本（利息） | 處置 |
|---|---|---|
| 進度同步的 Cloudflare KV 無 conditional write、且為最終一致 | 同 rev 的罕見併發 PUT 可能都回 200，後寫者以 LWW（last write wins，最後寫入為準）覆蓋前寫者；session 撤銷與題包讀回也有傳播延遲 | 【接受現狀】單一家庭、同 child／app 雙裝置同時作答機率低；rev、writeId、epoch 與 pagehide flush 已處理大部分風險。收藏已改用 SQLite Durable Object 交易；若進度真的出現互蓋，再把進度比照搬過去 |
| 409 後本輪健康燈可能短暫顯示 retry | 下一輪會自行收斂，但家長當下可能誤以為同步仍壞 | 【接受現狀】PR #43 已裁決不修 |
| 累計串流每次開啟多一筆 KV 紀錄 | `m:<child>:<app>:<device>` 長期只增不減，讀取靠分頁 | 【接受現狀】家庭規模下可接受；累計量明顯拖慢首頁時再做合併或歸檔 |
| 未安裝 devDependencies 時三個測試檔以載入錯誤失敗 | 新環境沒跑 `npm ci` 會看到 `ERR_MODULE_NOT_FOUND`，容易誤判成程式壞掉 | 【接受現狀】已寫進[維運手冊](Maintenance)；若常被踩到，改成缺套件時明確 skip 並說明原因 |
| 部分測試依環境 skip | DPAPI 測試只在 Windows＋PowerShell 7 跑；缺 `ffmpeg` 或原始 PDF 時對應測試 skip。CI（Linux）不會執行這些路徑 | 【接受現狀】相關功能只在製課／題庫重建的本機使用 |
| 驗收多為桌面 Chromium 尺寸模擬 | 自然題組、積木拼裝、Native Camp 自動播放、Cookie 保存都未在實體 iPad Safari 系統化驗證 | 【接受現狀】家長已免除逐項 checklist；孩子實際使用回報問題時再針對該點補驗 |
| Native Camp 製音憑證綁定單一 Windows 使用者 | DPAPI 加密副本只能在原機原帳號解密；換機要重新安裝憑證 | 【接受現狀】1Password 仍是正本，換機依 SOP 重新 install |
| 國語手寫 canvas 每次 pointer move 重畫累積 path、重讀 rect，並以全解析度 PNG 擷取 | 長筆畫、舊 iPad 或高更新率 Pencil 可能卡頓 | 等手寫真機使用回報延遲，再評估增量 stroke、快取 rect、縮圖後編碼 |
| Resume 半批時，批內進度分母只由剩餘 queue 重建 | 重開後可能顯示 `0/5`，而不是原批 `3/8`；不影響 mastered 與通關 | 【暫定接受】若孩子困惑，再把原始 batch size 納入 challenge schema |
| Study 的 mode 差異散在多個 predicate | 未來新增第三模式時要改多個判斷點 | 真正新增模式時再集中成 mode config |
| Registry children 與 wiring `CHILD_INFO` 是兩份資料 | 新增 child 要改兩處 | 【接受現狀】registry audit 會阻止兩份漂移 |
| 根目錄 `HANDOFF.md` 與 `CLAUDE.md` 的長篇歷史快照會過期 | `HANDOFF.md` 停在 2026-09-19；新 session 若當成現況會誤判 | 【接受現狀】兩檔已標明以 issue 與 code 為準；下次有跨 session 未完成工作時再更新或改成純入口 |
| `docs-dev/` 根目錄混放設計稿與 E2E 截圖／結果 JSON | 找設計文件時要略過數十個驗收產物 | 低優先；下次整理文件時把驗收產物移到子資料夾並更新連結 |

## 償還紀錄

- **2026-10-03**：#145 將家庭題包上限提高至 256 KiB，builder、瀏覽器與 Worker 共用 validator 同步；不改題目或孩子進度。決策與發布證據見 [Study 私用題包容量](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)／[#145](https://github.com/huansbox/aiden-study/issues/145)。

- **2026-09-30／10-03**：Native Camp 私人原音、逐字稿、request journal 與已完成工作副本歸檔到 Dropbox，附逐檔 SHA256 manifest 與 Git bundle；恢復順序寫入 Wiki（#138、#144）。
- **2026-09-26**：Weekly Review 自動排程停用，改為家長要求才製作，移除無人看管的付費 API 風險（#125）。
- **2026-09-23**：收藏狀態採 SQLite Durable Object 與逐命令 outbox，不沿用 KV 的 LWW 語意（#111～#113）。
- **2026-09-18**：README 作品總覽與家長白板改由 registry／catalog 自動產生，CI 拒絕漏登任務，取代手填索引（PR #92、ADR-0008）；#95 建立跨 session 開工／收尾關卡。
- **2026-09-17**：累計重置改用世代遞增，舊快取與離線補送不會把重置前數字加回來（PR #74）。
- **2026-09-16**：家庭金鑰從網址／localStorage 改為 HttpOnly Cookie session（commit `ebff26e`），舊路徑尚未退役，見上方中利息；孩子首頁加入發布版本檢查與自動更新，`build-home-release.mjs --check` 進 CI（#63）。
- **2026-07-21**：PR #51 加入 [Python／Node.js CI workflow](https://github.com/huansbox/aiden-study/blob/master/.github/workflows/test.yml)。
- **2026-07-17**：四 app 約 150～200 行重複接線抽成 `wiring-v1.js`；新增 effect-layer 測試；fallback 定錨與 zhuyin reset 寫入失敗改為誠實回報（PR #49、#50）。
- **2026-07-16**：同步加入 epoch 換代復原與 `dataNull` 守門（PR #43、#48）。
- **2026-07-15**：Math／spelling 搬入 monorepo 並接入 child store＋同步（PR #46、#47）。
- **2026-07-14**：Hub／registry 上線，app 上下架改由單一資料檔驅動（PR #45）。
- **2026-07-10**：Study 第二輪 review 清掉 6 處死碼、繞過 State facade 的寫入與重複 runtime reset。
- **2026-06-17**：題庫萃取雜訊改由 build 流程機械正規化，一次清償 1,146 題的人工修補負擔。

## 記帳規則

- 新債必須同時寫「現在付什麼成本」與「何時／如何償還」。
- 缺功能、內容未完成與 HITL gate 放 Plan，不混進本頁。
- 已接受限制要明文標記，避免每次 refresh 重複爭論。
- 清償後從 active 表格刪除，留一行摘要到償還紀錄。
- 每次大型功能收尾、同步協定變更或 Wiki refresh 時重看一次；其餘時間不為清債而清債。
