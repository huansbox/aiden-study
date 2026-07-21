# 技術債

> 快照日期：2026-07-21。依「利息」排序：平常改 code 就會付成本的項目排前面；只有特定裝置或罕見競態才會發生的項目排後面。技術債是已知權衡，不等於立即開工。

## 不是技術債

- #35 iPad spike、#20 注音音檔、#34 自訂網域搬遷是尚未完成的交付，放在 [Plan](Plan)，不拿「技術債」名義延後。
- Monorepo、GitHub Pages、family token、不做登入、app 邏輯不抽共用 framework 都是 ADR 已拍板的設計。
- `wiring-v1.js` 載入失敗就擋站是安全行為，不是可用性 bug。

## 高利息

| 債 | 成本（利息） | 償還策略／條件 | 證據 |
|---|---|---|---|
| 測試沒有 CI（continuous integration，push 後自動驗證）gate | Repo 已有 220 個 Node.js tests 與 140 個 pytest tests，但 GitHub Actions 目前只有 Wiki 發布；每次 merge 都依賴維護者手動跑完整套件，漏跑就可能直接部署到 Pages | 在下一輪 code 開發前新增單一 GitHub Actions workflow：安裝 uv／Python、跑 pytest、以 Node.js 跑 `tests/*.mjs`；先保持簡單，不加矩陣與 coverage gate | `.github/workflows/` 只有 `publish-wiki.yml` |

## 中利息

| 債 | 成本（利息） | 償還策略／條件 | 證據 |
|---|---|---|---|
| `sync.markImported()` 的 meta 寫入失敗沒有回傳結果 | Sync client 存在時，匯入／重置已寫進 progress key，但若 localStorage quota 剛好讓 `anchorPending` 寫不進去，UI 仍可能 reload，之後不一定會補傳；fallback 路徑已誠實回報，正常 sync 路徑尚未對齊 | 讓 `patchMeta`／`markImported` 回傳成功與否，wiring 的 current-child 匯入與 `anchorLocalWrite` 依結果阻止 reload 或顯示明確警告；同步補 effect／quota 測試 | `HANDOFF.md` 範圍邊界；`sync-v1.js` 的 `patchMeta` 吃掉例外且 `markImported` 無回傳 |
| `wiring-v1.js` cache-buster 要在四個 app 手動同步 | 改共用檔卻漏改任一 script tag，該 app 可能載到舊 wiring；這類混版錯誤只在瀏覽器 cache 下出現，本機與 production 行為會分歧 | 先補一個 audit：四個 sync app 的 wiring URL 版本必須一致；再考慮由 registry 或簡單更新腳本集中管理 | `HANDOFF.md` 明列「再改要同步 bump 四 app」；目前四頁皆手寫 `?v=20260717b` |
| Study 的 legacy／新 storage shape 永久 lazy 正規化 | `stats`、`mastered`、`errorBank` 等每個讀取點都要同時理解舊 flat 與新 `{modes:{…}}` 形狀，新增備份、同步或統計功能時容易漏分支 | 下次變更 Study schema 時，在 load 階段做一次性 canonicalize，保留 schemaVersion migration 測試；未動 schema 前不單獨冒險改 | `docs/study/index.html` 與 `CLAUDE.md` localStorage 規約 |
| Study 答錯 queue 回收邏輯分散 | 一般 submit 與手寫 remedial 完成各自做 `shift → push → saveBatch`；批次語義變更要同步改兩處 | 下次改批次／remedial 行為時抽共用 `requeueWrong`，以既有純函式測試鎖住 full／error 兩模式 | `submitAnswer` 與 `finishHandwritingRemedialQuestion` |
| 原始考卷 PDF 只存在原機且被 Git ignore | 社會看圖題、答案複核與 pipeline 重現會被檔案下落卡住；原機損壞可能永久遺失來源 | 在下一次題庫擴充前，先把 `pdfs_*` 放入受控雲端備份並留下來源索引；大型 PDF 仍不必進 Git | `CLAUDE.md` 待辦與 `.gitignore` |

## 低利息／已接受限制

| 債或限制 | 成本（利息） | 處置 |
|---|---|---|
| Cloudflare KV 無 conditional write、且為最終一致 | 同 rev 的罕見併發 PUT 可能都回 200，後寫者以 LWW（last write wins，最後寫入為準）覆蓋前寫者；單次讀也可能短暫看到舊值 | 【接受現狀】單一家庭、同 child／app 雙裝置同時作答機率低；rev、writeId、epoch 與 pagehide flush 已處理可控的大部分風險。若真實出現資料互蓋，再評估 Durable Object 或 server-side serialization |
| 409 後本輪健康燈可能短暫顯示 retry | 下一輪會自行收斂，但家長當下可能誤以為同步仍壞 | 【接受現狀】PR #43 已裁決不修；若 production 有持續誤報再調整 |
| 國語手寫 canvas 每次 pointer move 重畫累積 path、重讀 rect，並以全解析度 PNG 擷取 | 長筆畫、舊 iPad 或高更新率 Pencil 可能卡頓；一般單字目前可接受 | 等 #20／手寫真機使用真的回報延遲，再改增量 stroke、pointerdown 快取 rect、縮圖後編碼 |
| Resume 半批時，批內進度分母只由剩餘 queue 重建 | 重開後可能顯示 `0/5`，而不是原批 `3/8`；不影響 mastered 與通關 | 【暫定接受】若孩子困惑，再把原始 batch id／size 納入 challenge schema，並處理 migration |
| Study 的 mode 差異散在多個 predicate | 未來新增第三模式或把手寫擴到別科時，要改多個判斷點 | 現有 choice／handwriting 只有兩種且已有純測試；真正新增模式時再集中成 mode config |
| Registry children 與 wiring `CHILD_INFO` 是兩份資料 | 新增 child 要改兩處 | 【接受現狀】app 開機少抓一個檔，且 registry audit 會阻止兩份漂移 |

## 償還紀錄

- **2026-07-17**：四 app 約 150～200 行重複接線抽成 `wiring-v1.js`；新增 15 個 effect-layer 測試；Study／zhuyin safe storage 收斂；fallback 定錨與 zhuyin reset 寫入失敗改為誠實回報（PR #49、#50）。
- **2026-07-16**：同步加入 epoch 換代復原，並補 `dataNull` 守門，避免本機進度遺失時用空資料覆蓋重建後的雲端（PR #43、#48）。
- **2026-07-15**：Math／spelling 搬入 monorepo 並接入 child store＋同步；避免跨 repo 遺忘與四套部署入口（PR #46、#47）。
- **2026-07-14**：Hub／registry 上線，app 上下架與孩子首頁順序改由單一資料檔驅動（PR #45）。
- **2026-07-10**：Study 第二輪 review 清掉 6 處死碼、繞過 State facade 的寫入與重複 runtime reset（merge `25da348`）。
- **2026-06-17**：題庫萃取雜訊改由 build 流程機械正規化，一次清償 1,146 題的人工修補負擔。

## 記帳規則

- 新債必須同時寫「現在付什麼成本」與「何時／如何償還」。
- 缺功能、內容未完成與 HITL gate 放 Plan，不混進本頁。
- 已接受限制要明文標記，避免每次 refresh 重複爭論。
- 清償後從 active 表格刪除，留一行摘要到償還紀錄。
- 每次大型功能收尾、同步協定變更或 Wiki refresh 時重看一次；其餘時間不為清債而清債。
