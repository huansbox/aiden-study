# HANDOFF — 2026-07-11 平台票 2/9（Worker）已交付，下一張 3/9（study 接入）未開工

## 目標

全家學習平台（spec＝issue #26、9 張 sub-issues #27–#35，鏈序見 CLAUDE.md 指標行）。

## 進度

- 已完成：**#27 Worker＋KV 同步服務**（PR #36 已 merge、票已關）——服務 live＝`https://aiden-kids-sync.huansbox.workers.dev`，production curl 驗收全過；code review（medium）8 CONFIRMED 全修。程式＝`worker/`、測試＝`tests/test_{decide_sync,sync_worker,sync_contract}.mjs`（33 例）。
- 進行中：無（乾淨交接點，master 與 remote 同步）。
- 下一步：**#28（study 接入同步）**——票面已含「client 契約義務」一節（#27 review 產出：純函式 sentinel 內聯搬家、writeId＝crypto.randomUUID、dirty 何時清、匯入定錨、reseed 上健康燈、403≠auth），照票做即可。**#35（iPad spike）**與之並行、等家長排時間。

## 對話中已對齊、尚未落檔的決策

- **family token 保管**：token 已鑄造並顯示給家長一次（應存 1Password）、已存入 Worker secret。⚠️ **wrangler secret 寫入後不可讀回**——若家長沒存下來，唯一路徑是 `npx wrangler secret put TOKEN` 換發新的（換發＝日後圖示網址全部重烙）。接手時若要用 token 測試，跟家長要，別嘗試從任何地方「找回」。
- production KV 裡留有 `test-a:study` 測試資料（curl 驗收產物）——無害，status 端點本來就忽略 `test-` child，不用清。

## 注意事項

- **wrangler 憑證只在這台 Mac**（`~/Library/Preferences/.wrangler/`，OAuth 登入 huansbox@gmail.com——該帳號持有 linshuhuan.com zone，已驗證是對的帳號）。換機器部署要重新 `npx wrangler login`。
- workers.dev 部署後有**幾秒傳播延遲**，剛 deploy 立刻 curl 可能打到舊版——遇過一次暫態，重試即可，別急著 debug。
- 本機 shell 是 zsh：**陣列 1-based、`set -- $var` 不自動分詞**——本 session 兩次被咬（建票標題錯位、依賴邊迴圈），寫 bash 迴圈時留意。
- 家長工作偏好：review findings **一次一條**白話確認；小事可代拍板但要註明。

## Suggested skills

- #28 實作照票即可（spec/票已齊備不需 grill）；PR merge 前 `/code-review`（#28 動現役旗艦 app 的存檔格式，effort 建議 medium）；收尾建議 `/verify` 真的驅動一次同步閉環。
- #35 是純家長操作票，agent 只需先把 spike 頁備好（票面有規格）。

## 如何接續

1. 任一台機器 `git pull` master。
2. 開工 #28：`gh issue view 28`（先讀「client 契約義務」節）→ 開 `feat/platform-study-sync` 分支 → 基線：`uv run pytest`＋逐一 `node --test tests/*.mjs` 全綠再動工。
3. 需要對 production Worker 測試時用 `test-` 前綴 child id，真 child key 別碰。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
