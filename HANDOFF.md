# HANDOFF — 2026-07-12 平台票 4/9（zhuyin 接入同步）已 merge；live 驗收（#28＋#29）仍卡 token

## 目標

全家學習平台（spec＝issue #26）。本 session 依「先處理能 afk 的任務」指示交付 #29（PR #39 merge、票已關閉、CLAUDE.md 狀態行已更新）；#28＋#29 的 live 驗收與多項裁決仍需家長在場。

## 進度

- 已完成：**#29 全部程式面**——實作細節、review 結果（7 修 2 駁回）、測試（node 160＋pytest 140＋Playwright mock 閉環 37/37）全記錄在 PR #39 描述與 CLAUDE.md #29 狀態行，不重複。follow-up **#40** 已開（study 鏡射修正＋平台化裁決項）。
- 進行中：無未合分支、無半成品。**#30（repo 重整）刻意未開工**，理由見下。
- 下一步：先解決 live 驗收的 token 走法（見下），驗收過才開 #30。

## 對話中已對齊、尚未落檔的決策與待裁決項

- **token 隱私走法（上一份交接遺留、家長仍未回覆）**：live 驗收需 family token（在家長 1Password）。選項＝①token 貼進對話（會留在 session 記錄）②家長自己在裝置上操作、agent 出人工驗收清單。接手時第一件事問這題。
- **live 驗收清單（#28＋#29 共用，對 live 舊 origin、`test-` 前綴 child id）**：練一題→雲端 rev 前進；清 storage 重開→自動還原；匯入選 child 寫對 key；拔 token→家長區顯異常（非離線）。zhuyin 面需音檔 stub（正式音檔未錄，票面已授權 stub 驗法）或改用逃生門匯入觸發變更。驗收若炸→reopen 對應票。
- **#28 的 2 條 PLAUSIBLE findings（具體內容只在對話，PR #38 描述僅提及）**：①seed 複製遇 quota 失敗、之後 app 又寫 child key 時 legacy 被靜默遮蔽（機率極低、`aiden_study_v2` 完好可手動救；要修＝seed 後 read-back 驗證）②三處 localStorage JSON parse 樣板收斂成 `readJsonKey` helper（純整潔）。前 session 建議：都不修。
- **#40 的裁決項**（內容在 issue，這裡只記依賴）：A 部分 study 鏡射修正建議**等 #28 live 驗收過後**再動，免得驗收炸時難歸因；B 部分平台化方向與 #31/#33 一起看。
- **#30 未開工的理由（本 session 判斷，家長可推翻）**：#30 會搬 `docs/`＝GH Pages 部署目錄本身，而同步鏈 live 驗收未過；在未驗證的部署上疊大型結構變動，炸了難 bisect。先過驗收閘門。
- **#28 家長真實備份檔對帳仍未跑**（`aiden-study-進度備份-20260615.json` 不在這台 Mac，本機＋Dropbox 都找過）。

## 注意事項

- **zhuyin 的 Playwright mock 閉環腳本**＝`.playwright-mcp/zhuyin-sync-verify.mjs`（**gitignore、只在這台 Mac**；跨機接手時照 PR #39 描述的驗法重寫即可）。要點：①mock reset 前必須先導航到中性頁（`content.json`，無 JS）——活的 app 實例會把殘留進度推上剛清空的 mock＝觸發 reseed（那是協定的正確行為，不是 bug）②組字卡子步驟點擊間隔要 ≥1600ms（stepTimer 800＋換步 tap guard 400）③MCP playwright 的 `run_code_unsafe` 檔案要放在 repo 內（allowed roots 限制）。
- **sendBeacon 攔不到 route**（打真 production worker，假 token 401 無害）——beacon 行為靠可觀察結果驗，別浪費時間 mock 它（前朝筆記，仍有效）。
- wrangler 憑證、workers.dev 傳播延遲、zsh 陣列 1-based 等更早注意事項：見 git 歷史裡 2026-07-11 的 handoff（`403bc7c` 前後）。

## Suggested skills

- live 驗收＝直接 Playwright 操作（對 live origin 不需 mock），不需 skill；驗完把 CLAUDE.md 裡 #28/#29 兩處「待辦：live 驗收」字樣拿掉。
- #30 開工：`gh issue view 30` → 開 `feat/platform-repo-restructure` 類分支 → 基線 `uv run pytest`＋逐一 `node --test tests/*.mjs` 全綠再動工；PR merge 前 `/code-review`（effort 隨規模）。

## 如何接續

1. 任一台機器 `git pull` master（一切已推送，無未合分支）。
2. 問家長：①live 驗收 token 走法（貼對話 vs 自操作＋人工清單）②#40-A 與 #28 PLAUSIBLE ×2 的裁決（可一起問）。
3. 驗收過→清 CLAUDE.md 待辦字樣→開工 #30；炸→reopen 對應票修。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
