# Study 私用題庫分包（#160／#161）

此契約接替「三科共用 256 KiB 單包」的成長限制。原單包、cache key、132 個 stable IDs 和孩子進度格式保留；新前端先取得目錄，按既有練習按鈕才取得該單元內容。家長試玩按科目／單元選單取題，不讀寫孩子資料。

長期容量、分包與發布決策以 [GitHub Wiki：Study 私用題包](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本；本頁保存實作契約、重建入口與本次交付證據。

## 2026-10-04 分包切換交付

[#163](https://github.com/huansbox/aiden-study/pull/163) 交付 runtime／builder，[#164](https://github.com/huansbox/aiden-study/pull/164) 更新家長試玩資產版本網址，兩者已合併。Worker `3061c491-ff8e-44c0-9fe7-e2a8a601261b` 為 100% 現役版本；[Pages run 37173615514](https://github.com/huansbox/aiden-study/actions/runs/37173615514) 成功後，孩子頁、試玩頁與 HTML 實際引用的四個 script URL 共六處 bytes 均與已合併 Git blob 相符。家長試玩使用 `preview.js?v=20261004-shards-preview-r2`，未沿用舊整包 runtime 的網址。

本次先發布 8 個 immutable shards，逐份 immediate／至少 60 秒後讀回一致，再啟用 rev12 manifest。原 132 個活動及全部解說逐值不變，數學 68／自然 40／社會 24；僅改載入與儲存方式。

| 內容 | revision／活動數 | bytes | SHA256 |
| --- | --- | --- | --- |
| 啟用時 manifest | 12／132，8 shards | 12073 | `6bebb138a24ea0893b58f7528d7409e410c85eecec156fa38ff5774e5cfbb0ed` |
| 保留的 legacy 單包 | 12／132 | 229503 | `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f` |

manifest 與 legacy 的管理端讀回時間為 `2026-10-04T03:18:56.224Z`、`2026-10-04T03:20:30.254Z`，相隔 94.030 秒，兩次皆與上表一致。發佈核准、精確 URL、逐 shard 指紋及兩階段證據保存在 ignored `data/private/study/g4-s1-math-u1/sharding-release/`；rev12 可重建來源與分包產物位於同根目錄的 `rev12-catalog-python/`。後續內容發布另提高 manifest revision；本表保留切換當時的事實。

[#165 自然補題](https://github.com/huansbox/aiden-study/pull/165) 是後續內容候選，尚未包含在上述正式分包切換紀錄；其正式 revision、內容指紋與讀回需另待發布確認。

## 內容與路由

- `GET /v1/packs/g4-s1-math-u1/catalog` 讀 `c:study:catalog:v2`。manifest 為 `{schemaVersion:2,packId,revision,shards}`；每個 descriptor 為 `{hash,bytes,subject,unit,ids,subtopics}`，最後兩個陣列一一對應。目錄仍須家庭授權，不放公開 Pages。
- `GET /v1/packs/g4-s1-math-u1/shards/<sha256>` 讀 `c:study:shard:<sha256>`。沿用 Bearer 或 `/api/` 家庭 session 授權，只能 GET，回應 `private, no-store`；`/v1/status` 仍只列進度。
- shard 為 `{schemaVersion:2,packId,revision:1,questions,explanations}`，revision 固定 1 是 envelope 格式相容欄位；**發布 revision 只以 manifest 為準**。內容以 SHA-256 唯一識別，無內容變動的單元跨發布維持相同 hash。每 shard 只含同 subject/unit，可沒有 legacy 首六題。一個單元可有多 shard。
- client 完整取得所選單元全部 shard、驗 bytes/hash/題型/範圍/ID/subtopic 後，才建立本輪題池。manifest metadata 可在未下載題文時顯示單元／自然七主題的題數、mastered 分母、錯題和已回報題。尚未取得的 ID 不會進作答畫面，不因缺題被當成通關或刪除。
- 原 GET 單包路由與 localStorage `study:private-pack:g4-s1-math-u1` 不變。catalog 404 才回退單包；服務失敗不自動拿 public fixture 補題。舊 client 可繼續使用凍結的 legacy 題包。
- PNG 仍內嵌私人 shard，單張最多 32 KiB、既有像素／格式守衛不變。現階段沒有另做媒體 URL、公開 assets 或圖片外置。

## 資源與儲存

manifest 最多 512 KiB／1024 descriptors，每個 descriptor 最多 4096 IDs。shard 最多 256 KiB。下載前先限制單一 unit 原始 bytes 合計 4 MiB，一次操作的所選 units 合計 16 MiB；超限不發 shard 請求，需依實際課程拆分範圍。這些是單次操作與目錄的護欄，不是三科全部內容的總額。

使用 IndexedDB `study-private-catalog`／`content`，每單元只保留最近一次完整 snapshot，附 manifest、原始 shard bytes 與題目 projection；重讀時逐 shard 重驗 SHA-256 並比對 projection，不能把合法格式的異答案當成可信 cache。壞內容可重新下載並條件式取代相同損毀 snapshot，不碰孩子進度。沒有 per-shard localStorage，避免共用約數 MiB 的同步儲存額度與大量主執行緒寫入。

readwrite transaction 在同一交易內重讀最新 manifest／unit，拒絕降版、同版異目錄與同 ID 異題。cache 保留上限 16 MiB（含原始 bytes 與 projection）；以 cursor 逐筆計量，不 `getAll` 載入所有內容。不做 LRU 或清進度；配額／IndexedDB 不可用時使用已驗證的本輪記憶體內容，明示下次需連線。有效版本衝突仍拒收。舊 localStorage 題包保持原位。

boot 只讀目錄；既有未變單元透過 hash 直接重用 cache。下載失敗可用已驗證的完整舊單元完成當次練習，但不標成新版本 ready；下一次開始仍重試新題。作答中不替換題目或半批，背景新目錄等回首頁才採用。legacy queue 尚未取得題文時保留待遷移的 challenge keys，取得後才推回 mastered。新批與錯題一輪最多 10 題。

## 重建

所有 production 產物限定本 worktree 精確 ignored `data/private/study/g4-s1-math-u1/`，且核對 realpath 與 Git ignore，拒絕公開目錄或連結逃逸。不可把 private 內容加入 Git。

既有完整、已核准的 pack 可直接轉換，第三個參數是本 worktree 私用輸出目錄：

```powershell
node scripts/build_private_study_catalog.mjs <完整來源.json> <已核准前版完整來源.json> data/private/study/g4-s1-math-u1/<release>/catalog
```

converter 逐題沿用 production validator、核對前版全部 ID、作答語意與 revision。builder 的 Python 入口可直接從 curated/mapping/explanations 建新分包，完整 authoring snapshot 不受舊 256 KiB 總包限制：

```powershell
uv run python scripts/build_private_study_pack.py --curated <curated.json> --explanations <explanations.json> --metadata <mapping.json> --previous <已核准前版完整來源.json> --catalog-dir data/private/study/g4-s1-math-u1/<release>/catalog
```

輸出 `manifest.json`、`<hash>.json`，Python 入口另保存 `source.json` 作下次完整 baseline。既有來源逐值不變需另逐題／解說核對，因一般較高 revision 仍允許 source／解說修正。converter 可以將一個 unit 分成多 shard；不必塞入其他科目或首六題湊成 legacy envelope。

## 發布順序與讀回

分包切換已依新版 Worker → Pages → 私用內容順序交付，證據見上節。後續若再次改 runtime，仍依此順序；單純內容 revision 則沿用現役 runtime，只發布已變更的 immutable shards，再發布 manifest。這份文件不是新一輪部署授權。

1. baseline 的原始 bytes、revision/count/hash 與 production 固定內容 key 讀回一致，保留 ignored archive。這個流程不讀 token、Cookie 或 `p:` 進度。
2. 完成 builder、fresh review、舊題逐值比對與下面驗證。manifest 中每個 hash/bytes/IDs/subtopic 必須能在本機對應唯一檔案。
3. **先寫全部 immutable shards** 至 `c:study:shard:<hash>`；相同 key 只能重送相同 bytes。逐份 immediate readback，再等待傳播後讀回 hash／bytes。缺件或不符時停止，不能提前發布目錄。
4. 最後一次前向寫入 `manifest.json` 至 `c:study:catalog:v2`，再 immediate／傳播後讀回同一 hash/count/revision；順便以家庭授權唯讀檢查目錄和選定單元。
5. 原 `c:study:g4-s1-math-u1` rev12 不刪除、不改寫成 manifest。舊 client 維持原題目；新版才看到新內容。失敗保留舊 pointer／cache，不透過倒退 revision、刪 key 或重設孩子進度回復。

Cloudflare KV 具有最終一致性，所以「shards 先全部讀回」仍不能保證每個 edge 同時到齊。client 遇缺件保留完整舊單元並允許重試，絕不啟用部分新單元。不要刪舊 shards；本階段尚未提供遠端 GC。

## 驗證入口與界線

```powershell
node --test tests/test_study_catalog.mjs tests/test_study_auto_pack.mjs tests/test_study_preview.mjs
node --test tests/*.mjs
uv run pytest
node scripts/build-work-catalog.mjs --check
```

真瀏覽器合成入口：先 `node tests/helpers/serve-study-auto-pack.mjs 8798`，再開 `http://127.0.0.1:8798/test-start?scenario=catalog`。此入口只清除這個 loopback origin 的合成 localStorage／IndexedDB，使用 fake family Bearer 與真 Worker route；為獨立檢查 Study，移除家庭首頁導覽 runtime。preview 使用同一 fake auth。它不是正式 cookie/session 登入與家長安排的端到端驗收。

可用 `CODEX_PLAYWRIGHT_PACKAGE` 指定既有 Playwright 套件，再跑 `node tests/helpers/study-catalog-browser-check.mjs 8798`。涵蓋只讀目錄、所選 unit 下載、真 IndexedDB reload 重用、preview 快速切科和孩子進度不變。其他 auth/session 與家長任務契約由既有 Node 測試覆蓋；沒有讀任何正式孩子進度或 token。

實作者的隔離 QA 未使用正式孩子進度或 token；正式發布由統籌完成，見上節讀回。尚未做實體 iPad Safari／主畫面容器效能或最大護欄壓力實測。冷啟動仍須網站靜態檔可載入；不宣稱整站離線可用。
