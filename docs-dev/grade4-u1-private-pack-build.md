# 四上數學私用題包重建（歷史 U1 路徑）

[最新社會三卷完整擴量](grade4-social-study-existing-paper-batch.md)已於2026-10-06正式發布rev19：全科352活動（數學68／自然217／社會67），社會101格，新增43活動／66格；14shards／social unit22六片。完整canonical封存入口為 `data/private/study/g4-s1-math-u1/rev19-release/private/social-existing-paper-batch/rev19-candidate/`，curated／explanations／mapping在此，完整source／manifest／14shards在其catalog/。**本機／Dropbox雙副本仍待建立**；建立前使用本批ignored工作資料及正式讀回SHA，不能將預定入口當成備份已完成。下方較早批次及其當時的基線入口保留歷史，後續完整基線採本段rev19；副本完成與逐檔重建收據回查[#191](https://github.com/huansbox/aiden-study/issues/191)。

[#191 社會三卷擴量](https://github.com/huansbox/aiden-study/issues/191)已發布社會 unit22 `multiple_choice` 2／3／4選項契約，答案仍為原選項的1-based字串索引；不補第四個干擾項。Python builder、JS parser與錯答／重載／舊進度守衛已核驗。下文#154／#157的規則保留各批歷史，現行三選一契約以本段為準；新增43活動的完整authoring與productionbuilder輸入採頁首rev19入口。

本批原卷路線圖的括號站名需要保留細字，故僅social unit22 PNG容量上限改192 KiB；math／science仍32 KiB。Python／JS先核科目、unit與ID，再套容量，圖雙邊1600px及既有shard／unit／操作／manifest／cache總量限制不變。原crop與實際PNG逐檔SHA、放大圖review和原題條件都要核對，不能以壓低色盤掉字換取小檔。未開社會table或新媒體格式；下方歷史各批契約保持原發布事實。長期原則見[Wiki正本](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)。

[最新深美文字題補題](grade4-science-study-smps-text-batch.md)已於2026-10-05正式發布rev18：全科309活動、自然217活動／281格，新增39活動／39格。舊270題及解說逐值保持，unit21容量自動拆成兩份shard（全包9份）；實際merge CI、Pages19資產比對及new shards／manifest兩階段讀回完成，legacy rev12與Worker不變。下一批完整基線入口採canonical `data/private/study/g4-s1-math-u1/rev18-release/private/science-smps-text-batch/rev18-candidate/`（curated／explanations／mapping在此，source／manifest／9shards在其catalog/）；本文件於封存前建立；本機／Dropbox副本與housekeeping完成狀態、最後文件merge、plan SHA及收據以#178最新封存checkpoint為準，使用前核逐檔hash及各副本獨立重建。現有完整工作來源仍在ignored `science-smps-text-batch/rev18-candidate/`，前版在同批 `baseline/`。

[#178 教材判準補題](grade4-science-study-curriculum-batch.md)已於2026-10-05正式發布rev17：全科270活動（數學68／自然178／社會24）、自然242作答格，新增10活動／18格；舊260活動與解說逐值保持。完整source為551461 bytes、SHA256 `5d8c47335d1914da543aafab1b7263f3cad37b13dc2b3e6d450e14728813cb99`；manifest為24271 bytes、SHA256 `f82a7201e54b1852f5035ad2b8fe66b422fa65ca9870ad4472244068c60623e2`。正式兩階段讀回完成，legacy rev12與Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990`保持。內容merge為`ebbdd7e8e96e130b1adbddd7af559a137f2128b1`。

本輪rev18使用完整rev17 source作前版，不能回用rev16、legacy或delta；後續完整基線以頁首rev18入口為準。目前工作完整來源在ignored `science-curriculum-batch/rev17-candidate/catalog/source.json`，可重建備份流程及各副本獨立重建尚待root收尾。完成後canonical archive真實入口為`data/private/study/g4-s1-math-u1/rev17-release/private/science-curriculum-batch/rev17-candidate/catalog/source.json`；curated／explanations／mapping在同一`rev17-candidate/`，八份shard與manifest在`catalog/`。封存根目錄的`RESTORE.md`說明還原，`archive-plan.json`與`ARCHIVE-INVENTORY.json`列出逐檔指紋；預定復原驗證在`verification/readback.json`與`verification/restore-check.json`。使用前依[#178](https://github.com/huansbox/aiden-study/issues/178)最新封存收據確認副本已完成及逐檔hash／獨立重建結果。

下方rev16及更早批次保留歷史重建背景。

[#178 自然圖文材料補題](grade4-science-study-material-batch.md)已於2026-10-04正式發布 rev16：全科260活動（數學68／自然168／社會24）、自然224作答格，新增9活動／33格。ignored `science-material-batch/rev15-baseline/` 固定上一版完整251題 authoring與八份 shard；兩份 fresh review 與 root 內容批准 v2 綁定 `science-material-batch/delivery/build_rev16.py` 的正式內容。完整工作來源為 `science-material-batch/rev16-candidate/catalog/source.json`，543409 bytes、SHA256 `c8e3200f75bc0768345b61cee6a32c6e2d49e3c7b653d02b25e33e2e5b263daf`；manifest 23414 bytes、SHA256 `6db58001ae845a241fbe17116a5a2922c5febe7e3b7d275b3e3245f1a5c75766`。舊251活動及解說逐值保留，八份 shard 僅 unit 21 改變；正式兩階段讀回完成，legacy rev12與Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 不變。

本輪內容 merge 為 `23f1cd42d3dd802a3f2d3d03de81d9380446deab`；主線 #180 的 Preview 新入口另有兩 viewport 的6個代表／24次切換／6次解說／2次入口補驗。發布依實際 merge CI與Pages19URL bytes證據，沒有把原PRhead聲稱與merge相同。當時完整 baseline 使用 rev16 source，不能回用 rev15、legacy rev12或delta。canonical 預定入口為 `data/private/study/g4-s1-math-u1/rev16-release/private/rev16-candidate/catalog/source.json`，curated／explanations／mapping 同在 `rev16-candidate/`；目前封存尚待 final docs merge後的獨立 archive批准與執行。使用前依 #178 最新封存收據核對兩份副本逐檔hash／重建結果，恢復程序見副本 `private/ops/RESTORE.md`，並先跑 `archive_rev16.py restore-check --commit <final-docs-merge-SHA> --archive-dir <副本根目錄>`。

[#160／#161 分包交付](study-private-catalog.md)已啟用 schemaVersion 2 manifest／shards；新內容依該頁的 `--catalog-dir` 入口重建，按單元取得，不再把三科全部內容塞進一份 256 KiB 單包。原 `c:study:g4-s1-math-u1` 固定保留 revision 12 作 legacy 相容，不能用 manifest 覆寫。容量與載入決策正本見 [GitHub Wiki](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)。

前版 [#175 自然練習量擴充](grade4-science-study-volume-batch.md)的 manifest revision 15 為251活動（數學68／自然159／社會24）、自然191作答格、8個單元 shard。manifest 為22598 bytes，SHA256 `073b911be60bfceb910bac6de144ff6b15b381894c4af43c9b56d53df0dca13e`；完整 authoring source 為391746 bytes、SHA256 `cda959295214019913a509577c527e51b2260612d4433df328c07ac44354305a`，與 legacy 單包的指紋不能混用。

#175 正式新增 114 活動／119 格；舊 137 活動與全部解說逐值保留，legacy rev12 不變。rev15 歷史重建入口為 ignored `science-volume-batch/delivery/build_rev15.py`，使用已核准兩份 fresh review、凍結作者稿與完整 `rev14-baseline/`，rev15 工作來源為 `science-volume-batch/rev15-candidate/catalog/source.json`。封存完成狀態與逐檔核對結果以 [#175](https://github.com/huansbox/aiden-study/issues/175) 最新交接 comment 為準，使用前核對該證據。封存核對後的 canonical 入口是 `data/private/study/g4-s1-math-u1/rev15-release/private/rev15-candidate/catalog/source.json`，curated／explanations／mapping 在同一 `rev15-candidate/`，恢復步驟見 `rev15-release/private/ops/RESTORE.md`。本輪 rev16 的 `--previous` 使用這份完整 rev15 source，不能回用 legacy rev12 或只含新題的 delta。

歷史 [#169 自然第六批](grade4-science-study-sixth-batch.md)的 rev14 為 137 活動（數學 68／自然 45／社會 24）；其完整來源仍保存於 `rev14-release/private/rev14-candidate/catalog/source.json`，只作本批先前基線與歷史重建使用。

下方為 legacy schemaVersion 1 的來源、重建與歷史發布紀錄；「全包 256 KiB／首六題／localStorage」不套用於新 shard 或完整 authoring snapshot。分包切換與正式讀回見[交付紀錄](study-private-catalog.md#2026-10-04-分包切換交付)。

[#157 社會第二批](grade4-social-study-second-batch.md)已正式發布 revision 12：全包 132 活動（數學 68／自然 40／社會 24）、229503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`，餘 32641 bytes。社會 unit 22 現支援文字是非、二／四選一、2～5 個共用選項且 2～8 個小題的 grouped_choice，以及既有上限的 PNG；社會 table 仍不開放。舊 127 活動逐值保留，數學分類不變。下文 #154 的純文字限制保留首批歷史，現行社會格式以本段與 #157 為準。

[#154 社會首批](grade4-social-study-first-batch.md)已正式發布 revision 11：全包 127 題（數學 68／自然 40／社會 19）、200737 bytes、SHA256 `4afbc74258f47d41489cd109d9119240d44844c4b0f73eb414831dff73b9784b`，距 256 KiB 上限尚餘 61407 bytes。兩階段管理端讀回相隔 94.517 秒且指紋一致。社會 unit 22「家鄉的自然環境」目前只收純文字四選一／是非；既有數學與自然逐值保留，社會不計入數學題型報表。可重建資料保存至 `rev11-release/`，細節與交付證據見本批紀錄。

[#151 角度看圖題](grade4-math-angle-batch.md)的 revision 10 已正式發布：全包 108 題（數學 68／自然 40）、186,717 bytes、SHA256 `fe6ab5874454e88fedfdf8f56305d8d52fd1bab188b311a8588f4884f5a65fd1`，現行 256 KiB 上限下尚餘 75,427 bytes。正式 KV 的兩階段讀回相隔 99.128 秒，均與核准指紋相同；PR、Worker version、驗證及封存見本批紀錄。先前 [#148 數學文字補題](grade4-math-text-batch.md)發布 revision 9：104 題（數學 64／自然 40）、135,176 bytes、SHA256 `b1817152bd4b8ea067de7d8d9cb663870c9a836072dabd9675a113dcb399d346`。

歷史基線：[#134 自然第四批](grade4-science-study-fourth-batch.md)隨 revision 8 正式發布 97 題（數學 57／自然 40）、130,248 bytes、SHA256 `ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29`。2026-10-03 [#145](https://github.com/huansbox/aiden-study/issues/145) 將 builder 與瀏覽器上限同步提高至 256 KiB；當時以 rev8 計算尚餘 131,896 bytes，該次只改容量上限，沒有重建或重新發布題包，也沒有改孩子進度。容量決策正本見 Wiki [Study 私用題包容量](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)。revision 7 見[第三批紀錄](grade4-science-study-third-batch.md)，下方 #119 段落保留 revision 6 的歷史發布流程。

本流程建立同一個 `g4-s1-math-u1` 家庭 Study 題包；歷史名稱已包含數學、自然與社會。legacy 單包保留的內容基線是 revision 12 的 132 個活動；先前 revision 8 的 97 題包含原數學 57 題、自然首批 20 題、第二批 12 題、第三批 5 題與第四批 3 題。rev6 與 rev5 歷史分別見[自然第二批整合紀錄](grade4-science-study-second-batch.md)及[首批整合紀錄](grade4-science-study-first-batch.md)。數學 U1～U5 使用 unit 15～19，自然 S1～S2 使用 unit 20～21，社會首批 U1 使用 unit 22。完整題文、答案、解說與 QA 報告固定放在已精確忽略的 `data/private/study/g4-s1-math-u1/`；公開的 `mapping-metadata.json` 只有 stable ID、unit 與來源追溯，不含題文或答案。

[#119 第二批](grade4-science-study-second-batch.md)已依「新版 Worker → 合併並讀回 Pages → 一次前向 KV 寫入與兩階段讀回」順序正式發布 revision 6；候選建置、覆核與歸檔本身仍不等於發布。以下通用步驟是後續批次的操作契約，不能把 #119 的既有發布授權套用到新工作。

## 輸入約定

- curated 頂層保留 `schemaVersion/packId/revision/items`；explanations 保留 `schemaVersion/packId/revision/entries`；public mapping 保留 `schemaVersion/packId/revision/sourceTask/sourceMapping/items`。三份版本必須一致，schemaVersion 固定 1。
- mapping row 保留原 11 欄並新增數字 `unit`：`appId/practiceId/originalId/paperId/questionPage/answerPage/concept/contextPolicy/digitalAdaptation/sourceAdaptation/reviewStatus/unit`。原六題 unit 為 15。重建歷史 rev1 curated 時也需提供已補 unit 的 mapping；原六題 pack cache 不需修改。
- mapping 的 `sourceTask/sourceMapping` 保留原六題紙本 task 入口，僅表示 legacy provenance，不宣稱新八題也出自該紙本。新題由 row 的 paperId/originalId/題答頁追溯八卷來源；新增收錄集合由核准 mapping 決定。
- curated row 仍為 `practiceId/originalId/paperId/questionPage/answerPage/concept/adaptation/verification/question`。`question.unit` 對 mapping.unit，question.id 對 appId；adaptation 對 sourceAdaptation，verification 對 reviewStatus，其餘來源欄位也需精確一致。source 仍由 builder 產生，原六題 source 字串不變。
- `questionPage` 固定為正整數。有官方答案時 `answerPage` 也必須是正整數；只有官方答案確實未取得、作者與 fresh reviewer 已各自獨立解題一致，且 mapping `reviewStatus`／curated `verification` 精確為 `independently_solved_twice_no_official_answer` 時，兩邊 `answerPage` 才可同為 `null`。作者階段或其他 status 的 null 會被 builder 拒絕；不得填假答案頁，也不得用範圍狀態冒充答案審查。
- 數學 digitalAdaptation 只收 `multiple_choice`、`fill_in_blank:number`、`fill_in_blank:comparison`；自然首批另收 `true_false`。#154 社會 unit 22 只收純文字 `multiple_choice`／`true_false`，mapping／curated 也必須通過與自然相同的完整核答狀態要求，不支援其他社會單元或媒體。MC 固定四選一；是非題固定空 options 與 `"true"`／`"false"` answer；填空 1～9 格、同型、順序明確，每格有全形標記。其他題型與媒體須依下方 #119 的限定契約明確加入。
- #119 的新自然題可使用受限 `material`；#151 僅讓數學 `unit: 17` 使用同一個 `png` 契約，不開放其他數學 unit 或 `table`。`png` 僅限題包內 canonical PNG data URI，解碼後最多 32 KiB、寬高各 1～1600；`table` 僅限自然題的純文字 caption／columns／rows、2～8 欄與 1～16 列。文字上限以 Unicode code points 計：caption 300、欄名 80、儲存格 240、PNG alt 200。圖片與表格都留在私人題包，不放公開 assets；內容必須經來源等價與清晰度覆核。#151 圖片由原卷 PDF 直接裁切，題文仍採現有四選一、數字或比較符號輸入，不加入 raw SVG、作圖或互動量角器。
- #119 的 `grouped_choice` 僅限自然：`options` 是整組共用的 2～4 個選項（每項最多 300 code points），`parts` 是 2～8 個 `{id,text}`（id 組內唯一、1～32 位英數／連字號；text 最多 600 code points）；`answer` 是按 parts 順序排列的 1-based 選項索引字串。每格可以重複選同一選項。整組全部填齊後送出，一個 q.id 只算一個 activity。缺少共同選項池的原題不硬轉此格式。
- Builder 從核准 mapping 驗證 curated 與 explanations 精確覆蓋，不再硬編完整六題集合。原六個 practiceId/appId/originalId/adaptation 是必要基線；新 ID 明確登錄、不因重排序改名，不以自動尾碼消解碰撞。完整 pack 最多 256 KiB，不另設任意總題數上限。
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

若本批修改 `worker/`、`docs/study/index.html`、`docs/study/private-pack.js`、route、cache／progress contract 或其他 runtime，必須另在 issue 核准新發布順序，不能套用下方 content-only 流程。若這些檔案與正式版本都不變，才使用 content-only 流程；不得因舊文件曾記錄某個 Worker version，就把 repo 中較舊 Worker 重新 deploy 到現役服務。 #151 已只放寬數學 unit 17 的 PNG 驗證，沿用 Study 既有圖片放大介面；Worker bundle 包含新版 parser，屬 runtime-changing。已依核准順序完成新版 Worker → 新版 Pages 合併並讀回 → 核准 rev10 題包一次前向 KV 寫入與兩階段讀回，細節見[本批紀錄](grade4-math-angle-batch.md)。

### Content-only revision

1. 完成正式內容核對、fresh review、builder／validator、public/private projection、既有題逐值守衛及相關測試，記錄本次核准 count／bytes／revision／SHA256。公開 metadata 合併及 CI 也須符合該 issue 的發布 gate。
2. 以 `npx wrangler@<核准版本> deployments list --config worker/wrangler.jsonc` 只讀確認現役 100% Worker version，並與發布後再次查得的 version 比對。本流程不執行 `wrangler deploy` 或 Pages runtime 發布。
3. 將核准 pack 放在本次 worktree 的精確 ignored root，執行唯讀 verifier。把下列參數替換成本次正式 build 並經內容核對核准的 SHA256；腳本核對 Git ignore、實際路徑、UTF-8、production validator 與預期 hash，只輸出 count／bytes／revision／hash，任何失敗立即停止。

```powershell
node scripts/verify_private_study_pack.mjs <本次核准的SHA256>
if ($LASTEXITCODE -ne 0) { throw '題包驗證失敗，停止發布' }
```

4. 在任何寫入前，由管理端 capture 固定 `c:study:g4-s1-math-u1` 的原始 bytes 到 canonical ignored archive，不 echo raw payload；核對 count／bytes／revision／SHA256 精確等於 issue 核准的 production baseline。任一值不符就停止，不把未知 live 狀態覆蓋掉。
5. 再次確認本機核准檔案未變更，只從檔案對固定內容 key 執行一次 put；把下例版本替換成該 issue 核准的 Wrangler 版本，不寫入任何 `p:` key，不將題文當成 command argument：

```powershell
npx wrangler@<核准版本> kv key put c:study:g4-s1-math-u1 --binding KV --path data/private/study/g4-s1-math-u1/pack.json --remote --config worker/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw '內容發布未成功，停止後續操作' }
```

6. 由統籌使用管理權限 immediate readback，再於傳播後 readback 同一固定 key；capture bytes 但不 echo raw response，兩次都核對大小、revision、題數與核准 SHA256。最後重查現役 100% Worker version 與步驟 2 完全相同，並把精確摘要記入 release issue。任一階段失敗即停在該階段，不刪題包、不重設進度，也不以較舊 revision 覆寫 KV 作 rollback；內容問題只以前向 revision 修正。

內容發布期間若 readback 暫時仍是舊 revision，已有新 cache 的 client 會拒收降版並保留 cache，可稍後重試；不增加自動降版或強制覆寫機制。更改既有題目語意仍受 stable ID 不可變規則限制，不能只提高 revision 換答案。

#55 已於 2026-09-14 依家長接受結案，後續純內容批次不自動重開其逐項 iPad 檢查；isolated synthetic QA、實際家庭回報與正式 release readback 是不同證據，不能互相冒充。

Wrangler 的 `--path`／`--binding`／`--remote` 用法依 [Cloudflare 官方 KV 指令文件](https://developers.cloudflare.com/workers/wrangler/commands/kv/#kv-key-put)。正式環境只部署核准真包；不可用 synthetic 或 fallback 補上缺少的正式內容。
