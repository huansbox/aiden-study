# 四上數學私用題包重建（歷史 U1 路徑）

[#129 自然第三批](grade4-science-study-third-batch.md)已在本機完成五個核准 activity、13 個原卷作答格的 revision 7 題包：全包 94 題（數學 57／自然 37）、125,022 bytes、SHA256 `12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8`。**revision 7 尚未發布**；下方「目前已發布 revision 6」及既有發布流程維持正式發布事實。

本流程建立同一個 `g4-s1-math-u1` 家庭 Study 題包；歷史名稱已包含數學與自然。目前已發布 revision 6 共 89 題，包含原數學 57 題、自然首批 20 題與第二批 12 題；發布結果與 hash 見[自然第二批整合紀錄](grade4-science-study-second-batch.md)，rev5 歷史見[首批整合紀錄](grade4-science-study-first-batch.md)。數學 U1～U5 使用 unit 15～19，自然 S1～S2 使用 unit 20～21。完整題文、答案、解說與 QA 報告固定放在已精確忽略的 `data/private/study/g4-s1-math-u1/`；公開的 `mapping-metadata.json` 只有 stable ID、unit 與來源追溯，不含題文或答案。

[#119 第二批](grade4-science-study-second-batch.md)已依「新版 Worker → 合併並讀回 Pages → 一次前向 KV 寫入與兩階段讀回」順序正式發布 revision 6；候選建置、覆核與歸檔本身仍不等於發布。以下通用步驟是後續批次的操作契約，不能把 #119 的既有發布授權套用到新工作。

## 輸入約定

- curated 頂層保留 `schemaVersion/packId/revision/items`；explanations 保留 `schemaVersion/packId/revision/entries`；public mapping 保留 `schemaVersion/packId/revision/sourceTask/sourceMapping/items`。三份版本必須一致，schemaVersion 固定 1。
- mapping row 保留原 11 欄並新增數字 `unit`：`appId/practiceId/originalId/paperId/questionPage/answerPage/concept/contextPolicy/digitalAdaptation/sourceAdaptation/reviewStatus/unit`。原六題 unit 為 15。重建歷史 rev1 curated 時也需提供已補 unit 的 mapping；原六題 pack cache 不需修改。
- mapping 的 `sourceTask/sourceMapping` 保留原六題紙本 task 入口，僅表示 legacy provenance，不宣稱新八題也出自該紙本。新題由 row 的 paperId/originalId/題答頁追溯八卷來源；新增收錄集合由核准 mapping 決定。
- curated row 仍為 `practiceId/originalId/paperId/questionPage/answerPage/concept/adaptation/verification/question`。`question.unit` 對 mapping.unit，question.id 對 appId；adaptation 對 sourceAdaptation，verification 對 reviewStatus，其餘來源欄位也需精確一致。source 仍由 builder 產生，原六題 source 字串不變。
- `questionPage` 固定為正整數。有官方答案時 `answerPage` 也必須是正整數；只有官方答案確實未取得、作者與 fresh reviewer 已各自獨立解題一致，且 mapping `reviewStatus`／curated `verification` 精確為 `independently_solved_twice_no_official_answer` 時，兩邊 `answerPage` 才可同為 `null`。作者階段或其他 status 的 null 會被 builder 拒絕；不得填假答案頁，也不得用範圍狀態冒充答案審查。
- 數學 digitalAdaptation 只收 `multiple_choice`、`fill_in_blank:number`、`fill_in_blank:comparison`；自然首批另收 `true_false`。MC 固定四選一；是非題固定空 options 與 `"true"`／`"false"` answer；填空 1～9 格、同型、順序明確，每格有全形標記。其他題型與媒體須依下方 #119 的限定契約明確加入。
- #119 的新自然題可使用受限 `material`：`png` 僅限題包內 canonical PNG data URI，解碼後最多 32 KiB、寬高各 1～1600；`table` 僅限純文字 caption／columns／rows、2～8 欄與 1～16 列。文字上限以 Unicode code points 計：caption 300、欄名 80、儲存格 240、PNG alt 200。圖片與表格都留在私人題包，不放公開 assets；內容必須經來源等價與清晰度覆核。
- #119 的 `grouped_choice` 僅限自然：`options` 是整組共用的 2～4 個選項（每項最多 300 code points），`parts` 是 2～8 個 `{id,text}`（id 組內唯一、1～32 位英數／連字號；text 最多 600 code points）；`answer` 是按 parts 順序排列的 1-based 選項索引字串。每格可以重複選同一選項。整組全部填齊後送出，一個 q.id 只算一個 activity。缺少共同選項池的原題不硬轉此格式。
- Builder 從核准 mapping 驗證 curated 與 explanations 精確覆蓋，不再硬編完整六題集合。原六個 practiceId/appId/originalId/adaptation 是必要基線；新 ID 明確登錄、不因重排序改名，不以自動尾碼消解碰撞。完整 pack 最多 128 KiB，不另設任意總題數上限。
- 覆寫既有 pack.json 前，檢查新 ID 集合包含所有舊題，且各既有 ID 的作答內容、subject/unit/subtopic 不變。新增或 source/解說更新需更高 revision；同 revision 比較排序後的完整 ID 集合。拒絕刪題、降版或同 ID 偷換題。
- `material` 全內容與 `parts` 原順序／文字都受同 ID 語意守衛保護。#119 的 rev6 另拿已核 rev5 歸檔逐值核對舊 77 題及解說；後續升版也須與當時已發布基線逐值比對，因一般升版規則允許修改解說，不能只憑語意守衛認定舊解說不變。

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

## 管理端擴題發布

以下流程只在取得統籌發布指派後執行；建置／驗證本身不等於已部署。固定使用 issue 核准的 Wrangler 版本與既有 Worker／KV 管理權限，不建立新 token、帳號或題庫寫入 API，不讀取 family token、Cookie、孩子雲端進度或任何 `p:` key。

### 先判斷是 runtime-changing 還是 content-only

#59 曾因 Worker import 的 validator 與 Study loader 一起改動，使用「新版 Worker → 新版 Pages → expanded KV」順序。那是歷史 runtime-changing release，不是每次擴題的預設步驟。

若本批修改 `worker/`、`docs/study/index.html`、`docs/study/private-pack.js`、route、cache／progress contract 或其他 runtime，必須另在 issue 核准新發布順序，不能套用下方 content-only 流程。若這些檔案與正式版本都不變，才使用 content-only 流程；不得因舊文件曾記錄某個 Worker version，就把 repo 中較舊 Worker 重新 deploy 到現役服務。

### Content-only revision

1. 完成正式內容核對、fresh review、builder／validator、public/private projection、既有題逐值守衛及相關測試，記錄本次核准 count／bytes／revision／SHA256。公開 metadata 合併及 CI 也須符合該 issue 的發布 gate。
2. 以 `npx wrangler@<核准版本> deployments list --config worker/wrangler.jsonc` 只讀確認現役 100% Worker version，並與發布後再次查得的 version 比對。本流程不執行 `wrangler deploy` 或 Pages runtime 發布。
3. 將核准 pack 放在本次 worktree 的精確 ignored root，執行唯讀 verifier。把下列參數替換成本次正式 build 並經內容核對核准的 SHA256；腳本核對 Git ignore、實際路徑、UTF-8、production validator 與預期 hash，只輸出 count／bytes／revision／hash，任何失敗立即停止。

```powershell
node scripts/verify_private_study_pack.mjs <本次核准的SHA256>
if ($LASTEXITCODE -ne 0) { throw '題包驗證失敗，停止發布' }
```

4. 在任何寫入前，由管理端 capture 固定 `c:study:g4-s1-math-u1` 的原始 bytes 到 canonical ignored archive，不 echo raw payload；核對 count／bytes／revision／SHA256 精確等於 issue 核准的 production baseline。任一值不符就停止，不把未知 live 狀態覆蓋掉。
5. 再次確認本機核准檔案未變更，只從檔案對固定內容 key 執行一次 put；不寫入任何 `p:` key，不將題文當成 command argument：

```powershell
npx wrangler@4.120.1 kv key put c:study:g4-s1-math-u1 --binding KV --path data/private/study/g4-s1-math-u1/pack.json --remote --config worker/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw '內容發布未成功，停止後續操作' }
```

6. 由統籌使用管理權限 immediate readback，再於傳播後 readback 同一固定 key；capture bytes 但不 echo raw response，兩次都核對大小、revision、題數與核准 SHA256。最後重查現役 100% Worker version 與步驟 2 完全相同，並把精確摘要記入 release issue。任一階段失敗即停在該階段，不刪題包、不重設進度，也不以較舊 revision 覆寫 KV 作 rollback；內容問題只以前向 revision 修正。

內容發布期間若 readback 暫時仍是舊 revision，已有新 cache 的 client 會拒收降版並保留 cache，可稍後重試；不增加自動降版或強制覆寫機制。更改既有題目語意仍受 stable ID 不可變規則限制，不能只提高 revision 換答案。

#55 已於 2026-09-14 依家長接受結案，後續純內容批次不自動重開其逐項 iPad 檢查；isolated synthetic QA、實際家庭回報與正式 release readback 是不同證據，不能互相冒充。

Wrangler 的 `--path`／`--binding`／`--remote` 用法依 [Cloudflare 官方 KV 指令文件](https://developers.cloudflare.com/workers/wrangler/commands/kv/#kv-key-put)。正式環境只部署核准真包；不可用 synthetic 或 fallback 補上缺少的正式內容。
