# 四上 U1 私用題包重建

本流程只建立 `g4-s1-math-u1` 的六題私用包。完整題文、答案、解說與 QA 報告固定放在已精確忽略的 `data/private/study/g4-s1-math-u1/`；公開的 `mapping-metadata.json` 只有 stable ID 與來源追溯，不含題文或答案。

## 重建

先確認 private 目錄仍受 ignore 規則保護：

```powershell
git check-ignore -v data/private/study/g4-s1-math-u1/pack.json
```

再從 repo 根目錄執行：

```powershell
uv run python scripts/build_private_study_pack.py
```

預設讀取同一 private 目錄的 `curated-questions.json` 與 `explanations.json`，核對公開 mapping 和 public 題目 ID 後，以原子替換方式寫入 `pack.json`。完整驗證通過前不會替換先前輸出。Production CLI 不論是否指定 `--output`，都只接受本 worktree 的上述 private 目錄，並在生成前實際確認 Git ignore 仍生效；`docs/`、`docs-dev/`、`data/study/`、公開報告、其他 worktree 或任意外部路徑都會拒絕。

合成測試若需暫存輸出，只能由 Python 測試直接呼叫 `_build_synthetic_to_path_for_test(..., test_output_root=<temp>)` 的明確 seam；所有合成 input 與 output 都必須在同一個 repo 外暫存 root。CLI 與一般 `build_to_path` 都沒有開放此參數，正式題包不得使用它。

## 驗證與交付界線

用 production Study validator 檢查正式包；輸出只應顯示 `valid`、題數、大小或 hash，不列題文：

```powershell
node -e "const fs=require('fs'),crypto=require('crypto');require('./docs/study/private-pack.js');const raw=fs.readFileSync(process.argv[1],'utf8');const pack=StudyPrivatePack.parse(raw,JSON.parse(fs.readFileSync('./docs/study/questions.json','utf8')));console.log('valid questions='+pack.questions.length+' sha256='+crypto.createHash('sha256').update(raw).digest('hex'));" data/private/study/g4-s1-math-u1/pack.json
```

正式包由管理端發布後，孩子實際使用的 iPad Study 容器會以既有家庭金鑰自動取得，手動匯入僅為備援。`tests/helpers/synthetic-study-pack.mjs` 產生的同 ID 合成包只限測試容器；合成包與正式包題意不同，不能先把合成包匯入實際容器再嘗試覆蓋。

題包和進度是兩份資料。換裝置、換瀏覽器容器或清除網站資料後，完成既有家庭設定即可自動取得題包，進度獨立還原或同步；進度備份本身不含題文。不假設任何真 iPad 已設定 family token。

## 管理端發布（#58）

以下為取得統籌部署指派後的操作流程；建置／驗證本身不等於已部署。固定使用已核對的 Wrangler `4.120.1` 與既有 Worker／KV 管理權限，不建立新 token、帳號或題庫寫入 API。不讀取家庭 token 或孩子雲端進度。可先執行 `npx wrangler@4.120.1 deploy --dry-run --outdir .wrangler/auto-pack-dry-run --config worker/wrangler.jsonc` 檢查封裝；此命令不發布。

1. 從 repo 根目錄部署 Worker contract：`npx wrangler@4.120.1 deploy --config worker/wrangler.jsonc`。確認成功才繼續；此階段未發布題包會回 404，舊進度服務保持原行為。
2. 將核准 pack 放在本 worktree 的精確 ignored root，執行下列唯讀檢查。腳本核對 Git ignore、實際路徑、UTF-8、production validator 與預期 hash，只輸出 count／bytes／revision／hash，任何失敗立即停止。初版核准值如下：

```powershell
node scripts/verify_private_study_pack.mjs 695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0
if ($LASTEXITCODE -ne 0) { throw '題包驗證失敗，停止發布' }
```

3. 確認上一步成功且檔案未再變更，從檔案寫入固定內容 key；不寫入任何 `p:` key，不將題文當成 command argument，亦不使用 `kv key get` 把真題印到 console：

```powershell
npx wrangler@4.120.1 kv key put c:study:g4-s1-math-u1 --binding KV --path data/private/study/g4-s1-math-u1/pack.json --remote --config worker/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw '內容發布未成功，停止前端發布' }
```

4. 由統籌使用管理權限回讀固定內容 key，以 capture 的 bytes 核對大小與核准 SHA256，不 echo raw response；確認後才整合並發布 Study／Pages。Worker／KV／Pages 任一階段失敗即停在該階段，不刪題包或重設進度。KV 傳播期間若讀到舊 revision，client 拒收並保留 cache，可稍後重試；本票不增加自動降版或強制覆寫機制。
5. 最後由家長在實際 iPad／容器確認家庭設定、六題自動載入與部分作答後接續，記回 #55；desktop 驗證不取代此 gate。

Wrangler 的 `--path`／`--binding`／`--remote` 用法依 [Cloudflare 官方 KV 指令文件](https://developers.cloudflare.com/workers/wrangler/commands/kv/#kv-key-put)。正式環境只部署核准真包；不可用 synthetic 或 fallback 補上缺少的正式內容。
