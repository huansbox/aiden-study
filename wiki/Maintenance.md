# 維運手冊

> 維運基線：2026-10-03 全頁重驗（本機實跑 pytest 與 Node.js 全套、核對 workflow、Worker 設定與各入口版本參數）。指令以當日 repo 為準，操作前仍回查對應 repo 文件與程式。

## 環境

- Python 3.13（`.python-version`）；使用 **uv** 管理環境與執行指令。
- Node.js 24；用內建 test runner。**Node.js 測試需要先 `npm ci`**：`package.json` 的 devDependencies（miniflare、esbuild、sharp、three）只供測試與素材建置，正式前端仍零相依、零 build。沒裝時 `test_collection*.mjs` 與 `test_e500_model.mjs` 會以 `ERR_MODULE_NOT_FOUND` 失敗，不是程式壞掉。
- Cloudflare Wrangler；只有部署或查同步 Worker 時需要。
- `ffmpeg`／`ffprobe` 與已快取的 faster-whisper `small.en`：只有製作或核對 Native Camp 音訊時需要；OpenAI API key 另依 [Native Camp 共用工具](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/nativecamp/README.md) 注入。
- 跨 macOS／Windows 維護。Python 腳本讀寫中文時維持 UTF-8，避免 Windows cp950 造成錯誤；Windows 工作目錄的 CRLF 與 Git／Pages 的 LF 在發布 hash 比對時已正規化。

初次設置：

```bash
uv sync --locked
npm ci
```

## Repository 地圖

| 位置 | 用途 |
|---|---|
| `docs/index.html`、`docs/home-release.json` | 孩子首頁與其發布版本；改首頁或其直接引用的 shared JS／CSS、registry、manifest 後必須重建 |
| `docs/parent/` | 家長後台（`parent.js`）、Native Camp 家長摘要、作品白板（`workboard.js`、生成的 `work-catalog*.json`）、火車試拼頁 |
| `docs/registry.json` | App 目錄、children 名單與 `mindMaps` 文章索引；孩子實際可見活動與順序由家庭設定決定 |
| `docs/study/` | 題庫 app：公開 1,924 題、`private-pack.js` 家庭題包載入、`science-topics.js` 自然七主題、`material.js` 圖表題組、`preview.html` 家長試玩 |
| `docs/math/`、`docs/spelling/`、`docs/zhuyin/` | 長除法（含 `nonogram/`）、英文拼字、注音 |
| `docs/nativecamp/` | Native Camp Review：`lessons/` 公開題包與 catalog、`audio/` 預製 MP3（約 116 MB、1,800 餘檔）、`preview.html` |
| `docs/mind-map.html`、`docs/*-mind-map/` | 閱讀心智圖文章 |
| `docs/shared/` | `sync-v1.js`、`wiring-v1.js`、`device-auth.js`、`family-*.js`、`home.js`／`task-home.js`／`home-update.js`、`collection-*.js`、`brick-*.js`、`rewards/`、`bricks/` |
| `worker/` | `entry.mjs` 匯出 Worker 與 `ChildCollection` Durable Object；`worker.mjs` 進度同步、`session.mjs` Cookie 入口連線、`family.mjs` 家庭設定／累計／題包、`collection.mjs`＋`collection-object.mjs` 收藏；`wrangler.jsonc` |
| `scripts/` | 題庫 pipeline、`build_private_study_pack.py`／`verify_private_study_pack.mjs`、`build-home-release.mjs`、`build-work-catalog.mjs`／`sync-work-catalog.mjs`、`build-study-pattern-report.mjs`、`e500-art/`＋`render-e500-model.mjs` 積木素材 |
| `data/` | 公開題庫中間資料；ignored `data/private/study/g4-s1-math-u1/` 放家庭題包正式內容與各 rev 歸檔 |
| `tests/` | Python 與 Node.js 測試；`tests/helpers/serve-family.mjs` 隔離家庭服務 |
| `docs-dev/` | ADR、設計稿、人工驗收與發布紀錄（含 E2E 截圖與 JSON 結果） |
| `learning-tasks/` | 家庭學習任務庫；`catalog.json` 是任務登錄，`README.md` 是規則與生成索引；`shared/nativecamp/` 放製課工具與 SOP |
| `wiki/` | GitHub Wiki 原始檔；`Native-Camp-Storage` 只存在 `.wiki.git`，不要在 `wiki/` 放同名檔 |

## 日常驗證

| 目的 | 指令 |
|---|---|
| Python 全套測試 | `uv run pytest` |
| Node.js 全套測試 | `node --test "tests/*.mjs"`（先 `npm ci`） |
| 登錄與產物一致 | `node scripts/build-work-catalog.mjs --check` |
| 首頁發布版本一致 | `node scripts/build-home-release.mjs --check` |
| Registry 單獨 audit | `node --test tests/test_registry_audit.mjs` |
| 注音內容與音檔 audit | `node --test tests/test_zhuyin_content.mjs` |
| 純靜態本機預覽 | `uv run python -m http.server 8765 -d docs` |
| 隔離家庭服務（Cookie、KV、題包、收藏全模擬） | `node tests/helpers/serve-family.mjs 8790` → 開 `/test/start`；`/test/controls` 可暫停雲端、切首頁發布 A／B；`/test/study-preview?mode=ok` 驗試玩隔離 |

2026-10-03 本機（Windows）結果：pytest 272 passed；Node.js 在 `npm ci` 後 770 passed（未安裝時 3 個檔案載入失敗）。GitHub Actions 的 `test.yml` 跑同兩道 gate；`test_nativecamp_credential.py` 只在 Windows＋PowerShell 7 執行，缺 `ffmpeg` 時音訊測試會 skip，缺原始 PDF 時 `test_regression.py` 會 skip。測試數隨功能與資料變動，以當次輸出為準。

純靜態 server 沒有家庭 Cookie session：同步出現 CORS 錯誤、首頁顯示「請家長連接家庭」、家庭題包與收藏無法載入都是預期行為。Worker 只允許 `https://huansbox.github.io` 與 `https://kids.linshuhuan.com`。要驗真同步，用正式 origin 與 `test-` 開頭的 child id，驗收後清掉測試 KV key；要驗家庭層與收藏，用上表的隔離家庭服務，它只用 test-token、記憶體 KV 與合成題目。

## 作品索引與文件維護

App 改 `docs/registry.json`，task 改 `learning-tasks/catalog.json`，再用生成器更新 README 索引與家長白板；不要手改生成區段，也不要在 Wiki 複製作品狀態表。

```sh
node scripts/build-work-catalog.mjs
node scripts/build-work-catalog.mjs --check
node --test tests/test_work_catalog*.mjs
```

`work-catalog.yml` 在 push `master`、每日臺灣時間 05:23 與手動觸發時重新同步外部來源並以 bot commit `chore(catalog): sync work catalog` 寫回產物，再要求 Pages 重建並讀回核對。外部來源超過 48 小時未成功查核時白板自行標示可能過期。規則見[任務庫](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/README.md)，日期語意與失敗處理見[作品白板維護](https://github.com/huansbox/aiden-study/blob/master/docs-dev/parent-whiteboard.md)。

## Registry 維護

新增 App、調整目錄上下架或預設值時（不是調整孩子當前首頁順序）：

1. 編輯 `docs/registry.json`。站內 app 使用相對 `path`；外部 app 使用 HTTPS `url`，兩者只能擇一。
2. `active` app 對每個 `audience` child 都要有 `order`。
3. `sync: true` 的 app（目前 study、math、spelling、zhuyin、nativecamp）id 必須等於雲端 key 的 app 段，且 app 頁要載入 `sync-v1.js` 與 `wiring-v1.js`。
4. 跑 `node --test tests/test_registry_audit.mjs`，再執行 `node scripts/build-home-release.mjs` 更新首頁版本，最後重建作品索引。
5. 新閱讀文章不是 app：依 [閱讀心智圖 SOP](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/reading-mind-maps.md) 製作後加入 `mindMaps` 索引並重建首頁版本；首頁卡片自動開日期最新一篇。

Registry 的 child 名單與 `wiring-v1.js` 內的 `CHILD_INFO` 是兩份靜態資料；audit 會檢查一致。新增 child 時兩處都要改。

## 共用同步、家庭層與 wiring layer

- `sync-v1.js` 管雲端協定、衝突決策、dirty／rev／epoch 與生命週期 flush。
- `wiring-v1.js` 管 app 端身分、child store、匯入／重置定錨、健康燈與 pageshow 重驗。沒載到時 app 拒絕開站，這是 ADR-0006 的預期行為，不要改回靜默降級。
- `device-auth.js` 管 Cookie 入口連線與帶 `k` 舊圖示的自動轉移；`family-core.js`／`family-client.js` 管家庭設定、臺灣日期、練習安排、累計與補送；`collection-core.js`／`collection-client.js` 管每日目標、拼裝包與逐命令 outbox。
- 不相容變更要開 `sync-v2.js` 或 `wiring-v2.js`，不要原地破壞 v1。
- 版本參數有兩套：孩子首頁引用的 shared 腳本由 `build-home-release.mjs` 統一帶 release hash；各 app 頁手寫 `?v=`（現況 `wiring-v1.js?v=20260916`，nativecamp 為 `20260917`；`sync-v1.js?v=20260918`）。改共用檔就同步更新每個引用它的 app script tag；現行值以程式為準。
- 至少跑全套 Node.js tests；協定變更另確認 `test_decide_sync.mjs`、`test_sync_contract.mjs`、`test_sync_worker.mjs`，wiring 變更確認 `test_wiring_pure.mjs`、`test_wiring_effects.mjs`，家庭層確認 `test_family*.mjs`、`test_device_*.mjs`、`test_home_update.mjs`，收藏確認 `npm run test:collection`。

## Worker 維護

設定在 `worker/wrangler.jsonc`：入口 `entry.mjs`、KV binding `KV`、Durable Object binding `COLLECTIONS`（SQLite migration `collection-v1`）、route `kids.linshuhuan.com/api/*`，另保留 `workers.dev` 舊入口相容。family token 是 secret，只存 Cloudflare 與家長的 1Password，禁止寫入 repo、Wiki、log 或 issue。

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

部署順序：**先 Worker、再前端**。新增積木車型、累計世代、題包契約等前端會送新 ID 的變更，舊 Worker 會拒絕；Worker 先上不影響舊前端。

KV key 前綴：`p:` 進度、`c:` 設定／私用題包／私人音檔／累計世代、`m:`／`mN:` 累計串流、`s:device:` 入口 session。查 production KV 必須帶 `--remote`；Wrangler v4 不帶時查的是本機模擬 namespace。

```bash
cd worker
npx wrangler kv key list --binding KV --remote
```

同步驗收固定使用保留的 `test-<name>` child id。`/v1/status` 會隱藏這些測試 key，但 KV 仍要在驗收後清掉。不得用真實 `aiden`／`bingpu` key 做破壞性測試；重置孩子累計依[累計重置說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/activity-reset.md)走世代遞增，不直接刪 key。

## 題庫、題包與課程內容

公開題庫建置：

```bash
uv run python scripts/build_questions.py
uv run python scripts/build_explanations.py
uv run python scripts/validate_chinese_curated.py
```

新考卷流程與踩坑先讀 [README](https://github.com/huansbox/aiden-study/blob/master/README.md)、[期末實作經驗](https://github.com/huansbox/aiden-study/blob/master/docs-dev/期末-實作經驗筆記.md) 及[考卷來源筆記](https://github.com/huansbox/aiden-study/blob/master/docs-dev/exam-paper-sourcing.md)。`build_explanations.py` 會順帶更新三份 `docs-dev/review_*_抽查.md`，只重建 production JSON 時先檢查 diff。

四上家庭私用題包（數學 U1～U5＋自然 S1～S2，單一 `g4-s1-math-u1`）：

```bash
git check-ignore -v data/private/study/g4-s1-math-u1/pack.json
uv run python scripts/build_private_study_pack.py
node scripts/verify_private_study_pack.mjs <核准 SHA256>
```

正式內容只在 ignored 目錄與 KV `c:study:g4-s1-math-u1`；公開 `mapping-metadata.json` 只有 ID、unit 與來源追溯。發布順序＝新版 Worker（若需）→ 合併並讀回 Pages → 一次前向 KV put → 兩階段讀回核對。**pack 上限 128 KiB，rev8 97 題已剩 824 bytes**；下一批前先處理容量，不刪舊題、不放寬契約。契約與步驟見[私用題包重建](https://github.com/huansbox/aiden-study/blob/master/docs-dev/grade4-u1-private-pack-build.md)。

Native Camp 每堂課：來源核對 → `build_lesson.py` 產題包與 speech jobs → `build_openai_audio.py` 製音（固定 model、speed 1.0、課別固定音色、私有 request journal）→ `check_openai_audio.py` ASR 抽查 → 獨立 review → PR。Weekly Review 自 2026-09-26 起只在家長明確要求時製作，heartbeat 保持 PAUSED；不得因看到 SOP 或工具就恢復排程。入口見[共用工具](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/nativecamp/README.md)與[按需製作 SOP](https://github.com/huansbox/aiden-study/blob/master/learning-tasks/shared/nativecamp/weekly-automation.md)；私人原音與工作副本的歸檔見 Wiki [Native Camp 資料保存與恢復](Native-Camp-Storage)。

## 部署

### GitHub Pages 與首頁版本

- `master` 的 `docs/` 是 production source；push 後通常一至數分鐘上線。正式網址 <https://kids.linshuhuan.com/>，`docs/CNAME` 已啟用；`kids` CNAME 走 Cloudflare proxy，只有 `/api/*` 交給 Worker，其餘仍由 Pages 提供。設定歷史見[網域上線紀錄](https://github.com/huansbox/aiden-study/blob/master/docs-dev/platform-domain-rollout.md)與[入口連線說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/device-connection.md)。
- 改動首頁或其直接引用的 shared JS／CSS、registry、平台 manifest 後執行 `node scripts/build-home-release.mjs`，把 `docs/index.html` 與 `docs/home-release.json` 一起提交；`--check` 已在 CI，漏跑會失敗。已開著的舊首頁會在前景自動換版；完全不含更新器的舊頁只能靠真正重開一次。
- 上線後從 hub、每個 active app 與其相對路徑資產各走一次 smoke test；家庭題包、收藏等需 Cookie 的功能用正式家長入口核對。

### GitHub Wiki

`wiki/` 是唯一編輯處。Push 到 `master` 且 diff 含 `wiki/**` 時，`publish-wiki.yml` 以 overlay 方式發布到 `aiden-study.wiki.git`，不刪 Wiki-only 頁；若 `wiki/Native-Camp-Storage.md` 出現在 repo，workflow 直接失敗。`Native-Camp-Storage` 只在 Wiki 網頁或 `.wiki.git` 編輯，其他頁不要在網頁編輯，否則下次發布會覆蓋。

## iPad 與進度 SOP

SOP（standard operating procedure）指每次都照同一順序執行的標準操作流程。

- 用正式 `?child=aiden`／`?child=bingpu` 乾淨網址在 Safari「分享」→「加入主畫面」，分別命名煦誠學習／秉樸學習。首次開啟出現「請家長連接家庭」時，由家長輸入 1Password 的家庭金鑰一次，之後靠 180 天 Cookie；網址與圖示不再帶金鑰。
- Safari 與主畫面 App 是不同 localStorage 與 Cookie 容器；Safari 已連線不代表圖示已連線，各自連一次即可。舊版帶 `k` 的圖示仍可啟動並自動轉移，之後可重加乾淨網址圖示。
- 雲端同步是主要保護；已正式使用後，跨裝置／容器搬遷應先文字匯出備援。刪除舊主畫面圖示前，必須先在新容器 pull 或匯入並完成題數／mastered 對帳。
- Study 的備忘錄捷徑經 `#restore=` 進 Safari；standalone 無法直接收到。現行後備是複製備忘錄內容，貼到 app 匯入框。
- 首頁數字「看起來不對」時分三件事查：程式版本（首頁更新器）、家庭連線（Cookie）、家庭設定（雲端 rev）；不要用清整站資料或重建孩子身分處理。
- 累計重置只在家長明確指定範圍後執行，依[累計重置說明](https://github.com/huansbox/aiden-study/blob/master/docs-dev/activity-reset.md)遞增世代；收藏資料不跟著重置，各 App 學習進度另行處理。

## 已知地雷

- **相對路徑不可改成根路徑**：GitHub project site 是 `/aiden-study/`，自訂網域則是 `/`。
- **Hub restore 轉送不可丟 search 或 hash**：search 帶 child，hash 帶備份內容；任一遺失都會造成身分錯置或還原失敗。
- **沒 `npm ci` 就跑 Node 測試**：收藏與 E500 三個檔案以 `ERR_MODULE_NOT_FOUND` 失敗，看起來像程式壞掉。
- **改首頁沒重建 release**：CI 的 `build-home-release.mjs --check` 會失敗；就算過了，舊首頁也不會察覺新版。
- **前端先於 Worker 發布**：新車型 ID、累計世代或題包欄位會被舊 Worker 拒絕，收藏顯示暫時無法連線。
- **家庭題包 128 KiB 上限**：rev8 只剩 824 bytes，再加題會被 builder 拒絕。
- **本機 browser cache 可能吃舊 ES module**：確認 script tag 與 module import 的 `?v=` 都已更新。
- **Weekly Review 排程 PAUSED 是家長決定**：不得因週日到了或工具可用就恢復；付費 request journal 不得刪除或改名繞過阻擋。
- **Wrangler `kv key get` 預設會把日誌寫到磁碟**：Native Camp 工具已強制關閉；更新 Wrangler 版本前重新核對。
- **原始 `pdfs_*` 與四上候選卷只在本機**：不在 Git，重建題庫或截圖前先確認原件所在機器。
- **tcool.cc 有 Cloudflare challenge**：直接抓 PDF 可能 403；依 `docs-dev/exam-paper-sourcing.md` 用瀏覽器取得有效 session。
- **Worker KV 是最終一致**：不要把單次立即 GET 當成強一致證明；同步契約以 rev、writeId 與 epoch 收斂，收藏改用 Durable Object 交易。

## 故障排查

| 症狀 | 先檢查 |
|---|---|
| 首頁一直顯示「請家長連接家庭」 | 是哪個容器（Safari／圖示）；`GET /api/v1/session` 回應；Cookie 是否被封鎖；Origin 是否為正式網域 |
| 首頁停留舊版 | `docs/home-release.json` 與 live 是否一致；舊頁是否從未載過更新器（需真正重開一次） |
| 孩子首頁沒列出 app | 家長後台家庭設定是否勾選並儲存；registry `audience`／`status`；白板有列出不代表孩子首頁已啟用 |
| App 顯示「載入不完整」 | `wiring-v1.js` 是否 200、cache-buster 是否一致 |
| 顯示「不是離線」的認證錯誤 | 入口 Cookie 是否有效；舊圖示的 `kids_sync_token` 是否已轉移；Worker secret |
| 同步卡住或反覆 retry | app 的 sync meta、Worker GET response 的 rev／epoch、409 後決策 |
| 家庭題包沒出現或只剩舊題 | Cookie session；`c:study:g4-s1-math-u1` 的 revision；app 內 pack cache；作答中不會採用新包 |
| 收藏顯示暫時無法連線 | Worker 是否已部署含 `COLLECTIONS` 的版本；新車型 ID 是否已在 Worker 的 `PACK_COUNTS` |
| 每日目標沒發包 | 家長後台是否儲存目標；當日臺灣日期；該活動是否有可練內容；一天最多兩包 |
| 題庫載不出來 | `docs/study/questions.json` 是否合法、`build_questions.py` 與 console |
| 作答後說明消失 | `docs/study/explanations.json`；缺 id 只會隱藏說明，不應阻斷作答 |
| Native Camp 沒聲音 | `docs/nativecamp/audio/` 是否有該課 MP3；瀏覽器自動播放政策（按 Listen 一次）；老師私人片段靠 Cookie 讀 KV |
| 注音沒有可練內容 | `docs/zhuyin/assets/audio/` 是否齊 14 段 `.m4a`，並跑內容 audit |
| 獎勵圖不顯示 | `docs/shared/rewards.json` key、檔案路徑與 app 相對路徑 |
| 白板日期標過期或缺任務 | `work-catalog` workflow 最近是否成功；task 是否登錄於 `catalog.json`；外部來源 48 小時未查核即標過期 |
| 進度「看起來不見」 | 目前 child、Safari／standalone 容器、對應 child store key 與雲端健康燈；先分清程式版本／連線／設定 |
