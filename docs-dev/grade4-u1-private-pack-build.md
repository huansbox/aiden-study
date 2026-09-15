# 四上數學私用題包重建（歷史 U1 路徑）

本流程建立同一個 `g4-s1-math-u1` 家庭數學題包。#59 的核准目標是保留六題 rev1，追加八個活動成為十四題 rev2；U1～U5 使用 unit 15～19，題數 7／2／2／1／2。完整題文、答案、解說與 QA 報告固定放在已精確忽略的 `data/private/study/g4-s1-math-u1/`；公開的 `mapping-metadata.json` 只有 stable ID、unit 與來源追溯，不含題文或答案。此文件描述建置與發布流程，不代表 #59 已完成內容核對或部署。

## 輸入約定

- curated 頂層保留 `schemaVersion/packId/revision/items`；explanations 保留 `schemaVersion/packId/revision/entries`；public mapping 保留 `schemaVersion/packId/revision/sourceTask/sourceMapping/items`。三份版本必須一致，schemaVersion 固定 1。
- mapping row 保留原 11 欄並新增數字 `unit`：`appId/practiceId/originalId/paperId/questionPage/answerPage/concept/contextPolicy/digitalAdaptation/sourceAdaptation/reviewStatus/unit`。原六題 unit 為 15。重建歷史 rev1 curated 時也需提供已補 unit 的 mapping；原六題 pack cache 不需修改。
- mapping 的 `sourceTask/sourceMapping` 保留原六題紙本 task 入口，僅表示 legacy provenance，不宣稱新八題也出自該紙本。新題由 row 的 paperId/originalId/題答頁追溯八卷來源；新增收錄集合由核准 mapping 決定。
- curated row 仍為 `practiceId/originalId/paperId/questionPage/answerPage/concept/adaptation/verification/question`。`question.unit` 對 mapping.unit，question.id 對 appId；adaptation 對 sourceAdaptation，verification 對 reviewStatus，其餘來源欄位也需精確一致。source 仍由 builder 產生，原六題 source 字串不變。
- digitalAdaptation 只收 `multiple_choice`、`fill_in_blank:number`、`fill_in_blank:comparison`。MC 固定四選一；填空 1～9 格、同型、順序明確，每格有全形標記。#59 不實作未使用的 mixed token、新題型或 image。
- Builder 從核准 mapping 驗證 curated 與 explanations 精確覆蓋，不再硬編完整六題集合。原六個 practiceId/appId/originalId/adaptation 是必要基線；新 ID 明確登錄、不因重排序改名，不以自動尾碼消解碰撞。完整 pack 最多 128 KiB，不另設任意總題數上限。
- 覆寫既有 pack.json 前，檢查新 ID 集合包含所有舊題，且各既有 ID 的作答內容、subject/unit/subtopic 不變。新增或 source/解說更新需更高 revision；同 revision 比較排序後的完整 ID 集合。拒絕刪題、降版或同 ID 偷換題。

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

## 管理端擴題發布（#59；沿用 #58 基建）

以下為取得統籌部署指派後的操作流程；建置／驗證本身不等於已部署。固定使用已核對的 Wrangler `4.120.1` 與既有 Worker／KV 管理權限，不建立新 token、帳號或題庫寫入 API。不讀取家庭 token 或孩子雲端進度。可先執行 `npx wrangler@4.120.1 deploy --dry-run --outdir .wrangler/auto-pack-dry-run --config worker/wrangler.jsonc` 檢查封裝；此命令不發布。

順序固定為 **新版 Worker → 新版 Pages → 最後 expanded KV**；與 #58 首次發布時尚無既有內容的順序不同。Worker 的 route/key 雖不變，它 import 的 validator 已變，仍須重新部署。

1. 完成 code review、正式內容核對及本機 build，記錄本次核准 count／bytes／revision／SHA256。部署同時接受六題 rev1 與 expanded pack 的 Worker contract：`npx wrangler@4.120.1 deploy --config worker/wrangler.jsonc`。此時 KV 仍保留原六題，舊進度服務保持原行為。
2. 發布新版 Study／Pages（包括 private-pack.js 版本查詢字串）；新版前端先正常讀取既有六題，顯示 U2～U5 尚未載入，並保留其未知進度。確認前端更新後才繼續內容發布。
3. 將核准 expanded pack 放在本 worktree 的精確 ignored root，執行唯讀 verifier。把下列參數替換成本次正式 build 並經內容核對核准的 SHA256；腳本核對 Git ignore、實際路徑、UTF-8、production validator 與預期 hash，只輸出 count／bytes／revision／hash，任何失敗立即停止。

```powershell
node scripts/verify_private_study_pack.mjs <本次核准的SHA256>
if ($LASTEXITCODE -ne 0) { throw '題包驗證失敗，停止發布' }
```

4. 確認上一步成功且檔案未再變更，從檔案寫入固定內容 key；不寫入任何 `p:` key，不將題文當成 command argument，亦不使用 `kv key get` 把真題印到 console：

```powershell
npx wrangler@4.120.1 kv key put c:study:g4-s1-math-u1 --binding KV --path data/private/study/g4-s1-math-u1/pack.json --remote --config worker/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw '內容發布未成功，停止後續操作' }
```

5. 由統籌使用管理權限回讀固定內容 key，以 capture 的 bytes 核對大小、revision、題數與核准 SHA256，不 echo raw response，將精確摘要記入 #59 發布證據。任一階段失敗即停在該階段，不刪題包或重設進度。KV 傳播期間若讀到舊 revision，已有新 cache 的 client 拒收並保留 cache，可稍後重試；不增加自動降版或強制覆寫機制。

旧 client 只認六題，收到 expanded pack 會拒收並保留原內容／進度。若另一新版分頁已寫入 expanded cache，舊版冷啟動可能暫時無包可用，重新載入新版前端即可，不要求重設家庭金鑰。不可把六題 rev1 覆寫回 KV 當安全 rollback；保留內容並向前修正。更改既有題目語意仍受 stable ID 不可變規則限制，不能只提高 revision 換答案。

#55 已於 2026-09-14 依家長接受結案，本批不重開其逐項 iPad 檢查；#59 desktop CUA 使用隔離 synthetic origin，實際家庭回報與 desktop 證據分開記錄。rev1 的歷史核准 hash 為 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0`，不可拿它冒充本次十四題 rev2 的核准值。

Wrangler 的 `--path`／`--binding`／`--remote` 用法依 [Cloudflare 官方 KV 指令文件](https://developers.cloudflare.com/workers/wrangler/commands/kv/#kv-key-put)。正式環境只部署核准真包；不可用 synthetic 或 fallback 補上缺少的正式內容。
