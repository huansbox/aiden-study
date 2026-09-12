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

正式包請只匯入孩子實際使用的 iPad Study 容器。`tests/helpers/synthetic-study-pack.mjs` 產生的同 ID 合成包只限測試容器；合成包與正式包題意不同，不能先把合成包匯入實際容器再嘗試覆蓋。

題包和進度是兩份資料。換裝置、換瀏覽器容器或清除網站資料後，要先重新匯入題包，再還原或同步進度；進度備份本身不含題文。
