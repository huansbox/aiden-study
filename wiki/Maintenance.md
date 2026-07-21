# 維運手冊

> 適用現況：2026-07-21。平台由 GitHub Pages 靜態前端、Cloudflare Worker＋KV（key-value 雲端儲存）同步服務，以及本機題庫 pipeline 組成。

## 環境

- Python 3.13 以上；使用 **uv** 管理環境與執行指令。
- Node.js；用內建 test runner 跑前端純函式、audit、Worker 與同步契約測試。
- Cloudflare Wrangler；只有部署或查同步 Worker 時需要。
- 前端無 package install、無 build step。`docs/` 可直接由靜態 server 提供。
- 跨 macOS／Windows 維護。Python 腳本讀寫中文時維持 UTF-8，避免 Windows cp950 造成錯誤。

初次設置：

```bash
uv sync
```

## Repository 地圖

| 位置 | 用途 |
|---|---|
| `docs/index.html` | Hub：選人、孩子首頁、家長視圖、restore 轉送 |
| `docs/registry.json` | App registry；上下架、對象與順序的唯一資料源 |
| `docs/{study,zhuyin,math,spelling}/` | 各學習 app |
| `docs/shared/sync-v1.js` | 同步協定與 sync client |
| `docs/shared/wiring-v1.js` | 四 app 共用的身分、child store、健康燈與匯入接線 |
| `worker/` | Cloudflare Worker＋KV |
| `scripts/`、`data/` | 題庫萃取、分類、策展與建置 |
| `tests/` | Python 與 Node.js 測試 |
| `docs-dev/adr/` | 架構決策紀錄 |
| `wiki/` | GitHub Wiki 原始檔；不要直接改 Wiki 網頁 |

## 日常驗證

| 目的 | 指令 |
|---|---|
| Python 全套測試 | `uv run pytest` |
| Node.js 全套測試 | `node --test "tests/*.mjs"` |
| Registry 單獨 audit | `node --test tests/test_registry_audit.mjs` |
| 注音內容與音檔 audit | `node --test tests/test_zhuyin_content.mjs` |
| 本機啟動平台 | `uv run python -m http.server 8765 -d docs` |

本機網址為 <http://localhost:8765/>。同步在 localhost 出現 CORS（瀏覽器的跨來源存取限制）錯誤是預期行為：Worker 只允許 `https://huansbox.github.io` 與 `https://kids.linshuhuan.com`。要驗證真同步，必須使用正式 origin 與 `test-` 開頭的 child id，且驗收後清掉測試 KV key。

截至 2026-07-21，基準結果為 Node.js 220 tests 通過、pytest 140 tests 通過。`test_zhuyin_content.mjs` 仍會警告缺 14/14 音檔；這是 [#20](https://github.com/huansbox/aiden-study/issues/20) 尚未完成的內容，不算測試失敗。

## Registry 維護

新增、上下架或改順序時：

1. 編輯 `docs/registry.json`。
2. 站內 app 使用相對 `path`；外部 app 使用 HTTPS `url`，兩者只能擇一。
3. `active` app 對每個 `audience` child 都要有 `order`。
4. `sync: true` 的 app id 必須等於雲端 key 的 app 段，且 app 頁要載入 `sync-v1.js` 與 `wiring-v1.js`。
5. 跑 `node --test tests/test_registry_audit.mjs`，再從 hub 實際確認兩個孩子首頁與家長視圖。

Registry 的 child 名單與 `wiring-v1.js` 內的 `CHILD_INFO` 是兩份靜態資料；audit 會檢查一致。新增 child 時兩處都要改。

## 共用同步與 wiring layer

四個同步 app 為 study、zhuyin、math、spelling。修改平台共用層時：

- `sync-v1.js` 管雲端協定、衝突決策、dirty／rev／epoch 與生命週期 flush。
- `wiring-v1.js` 管 app 端身分、child store、匯入／重置定錨、健康燈與 pageshow 重驗。
- 不相容變更要開 `sync-v2.js` 或 `wiring-v2.js`，不要原地破壞 v1。
- 只要 `wiring-v1.js` 內容改變，就同步更新四個 app script tag 的 `?v=` cache-buster；目前為 `20260717b`。
- 至少跑全套 Node.js tests；協定變更另確認 `test_decide_sync.mjs`、`test_sync_contract.mjs`、`test_sync_worker.mjs`，wiring 變更另確認 `test_wiring_pure.mjs` 與 `test_wiring_effects.mjs`。

`wiring-v1.js` 沒載到時，app 會拒絕開站，避免在身分不明的半殘狀態寫錯 child。這是 ADR-0006 的預期行為，不要改回靜默降級。

## Worker 維護

設定在 `worker/wrangler.jsonc`；production Worker 為 `aiden-kids-sync.huansbox.workers.dev`。family token 是 secret，只存在 Cloudflare 與家長的 1Password，禁止寫入 repo、Wiki、log 或 issue。

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

查 production KV 必須帶 `--remote`；Wrangler v4 不帶時查的是本機模擬 namespace，會造成「雲端是空的」假象。

```bash
cd worker
npx wrangler kv key list --binding KV --remote
```

同步驗收固定使用保留的 `test-<name>` child id。`/v1/status` 會隱藏這些測試 key，但 KV 仍要在驗收後清掉。不得用真實 `aiden`／`bingpu` key 做破壞性測試。

## 題庫 pipeline

常用建置：

```bash
uv run python scripts/build_questions.py
uv run python scripts/build_explanations.py
uv run python scripts/validate_chinese_curated.py
```

新考卷的主要流程：

```bash
uv run python scripts/extract.py --input <PDF或目錄> --output <raw.json>
uv run python scripts/classify.py --semester <mid|final|math|social>
uv run python scripts/build_questions.py
```

完整做法與踩坑先讀 [README](https://github.com/huansbox/aiden-study/blob/master/README.md)、[期末實作經驗](https://github.com/huansbox/aiden-study/blob/master/docs-dev/期末-實作經驗筆記.md) 及 [考卷來源筆記](https://github.com/huansbox/aiden-study/blob/master/docs-dev/exam-paper-sourcing.md)。

`build_explanations.py` 會順帶更新三份 `docs-dev/review_*_抽查.md`。若本次只要重建 production JSON，先檢查 diff，避免把無關的舊審查產物一起提交。

## 部署

### GitHub Pages

- `master` 的 `docs/` 是 production source；push 後通常一至數分鐘上線。
- 目前正式網址是 <https://huansbox.github.io/aiden-study/>。
- `kids.linshuhuan.com` 尚未啟用；`docs/CNAME` 只能在 [#34 搬遷 checklist](https://github.com/huansbox/aiden-study/issues/34) 執行時加入，不能先行切換 origin。
- 上線後從 hub、每個 active app 與其相對路徑資產各走一次 smoke test。

### GitHub Wiki

`wiki/` 是唯一編輯處。Push 到 `master` 且 diff 含 `wiki/**` 時，`publish-wiki.yml` 會把內容發布到 `aiden-study.wiki.git`。不要直接在 GitHub Wiki 網頁編輯，否則下次 workflow 會覆蓋。

## iPad 與進度 SOP

SOP（standard operating procedure）指每次都照同一順序執行的標準操作流程。

- Hub 圖示的網址會帶 `?child=...&k=...`；family token 從 1Password 取得，不從文件複製。
- Safari 與「加入主畫面」的 standalone App 是不同 localStorage 容器；同一份進度不能假設兩邊互通。
- 雲端同步是主要保護；每個裝置／容器在搬遷前仍要做一次文字匯出作為備援。
- Study 的備忘錄捷徑經 `#restore=` 進 Safari；standalone 無法直接收到。現行後備是複製備忘錄內容，貼到 app 匯入框。
- 刪除舊主畫面圖示前，必須先在新容器 pull 或匯入並完成題數／mastered 對帳。

## 已知地雷

- **相對路徑不可改成根路徑**：GitHub project site 是 `/aiden-study/`，自訂網域則是 `/`。
- **Hub restore 轉送不可丟 search 或 hash**：search 帶 child／token，hash 帶備份內容；任一遺失都會造成身分錯置或還原失敗。
- **本機 browser cache 可能吃舊 ES module**：確認 script tag 與 module import 的 `?v=` 都已更新，必要時使用新版本字串。
- **原始 `pdfs_*` 不在 Git**：社會看圖題等工作需先從原機備份或 tcool 重新取得 PDF。
- **tcool.cc 有 Cloudflare challenge**：直接抓 PDF 可能 403；依 `docs-dev/exam-paper-sourcing.md` 使用瀏覽器取得有效 session。
- **Worker KV 是最終一致**：不要把單次立即 GET 當成強一致證明；同步契約以 rev、writeId 與 epoch 收斂。

## 故障排查

| 症狀 | 先檢查 |
|---|---|
| Hub 沒列出 app | `docs/registry.json` 與 `test_registry_audit.mjs` |
| App 顯示「載入不完整」 | `wiring-v1.js` 是否 200、cache-buster 是否一致 |
| 顯示「不是離線」的 token／認證錯誤 | 裝置的 `kids_sync_token`、圖示 `?k=`、Worker secret |
| 同步卡住或反覆 retry | app 的 sync meta、Worker GET response 的 rev／epoch、409 後決策 |
| 題庫載不出來 | `docs/study/questions.json` 是否合法、`build_questions.py` 與 console |
| 作答後說明消失 | `docs/study/explanations.json`；缺 id 只會隱藏說明，不應阻斷作答 |
| 注音沒有可練內容 | `docs/zhuyin/assets/audio/` 是否已放齊 14 段 `.m4a`，並跑內容 audit |
| 獎勵圖不顯示 | `docs/shared/rewards.json` key、檔案路徑與 registry／app 相對路徑 |
| 進度「看起來不見」 | 目前 child、Safari／standalone 容器、對應 child store key 與雲端健康燈 |
