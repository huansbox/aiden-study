# 家長首次連接與記住入口

2026-09-16 已合併至 `master` 並正式發布。

## 家庭操作

孩子沿用自己的網址與圖示。未連接時只顯示「請家長連接家庭」，輸入一次家庭金鑰後取得雲端設定；成功後連接畫面消失。家長後台使用同一個連接流程，並提供「中斷此入口連線」。這不清除題庫、進度或後台安排。

已安裝且啟動網址帶 `k` 的圖示仍可使用：先用舊金鑰換取新登入憑證、讀回確認瀏覽器接受 Cookie，再刪除本機 `kids_sync_token`。目前頁面會移除 `k`，保留 child 與 hash。無法改寫 iPad 圖示本身保存的原始啟動網址，因此正式切換後可重新加入不帶金鑰的兩個首頁；不要求先刪舊圖示或備份未正式使用的進度。

Safari 與主畫面 Web Clip 各自儲存資料；新入口若沒有登入 Cookie，就在入口內完成首次連接。不能只因 Safari 連線成功就假設主畫面已連線。

首頁開啟、回前景、從返回快取恢復、網路恢復時讀取設定；停在前景每 30 秒檢查一次。讀取設定不等待累計補送。雲端 KV 本身仍可能有傳播延遲，因此 30 秒不是跨裝置更新上限。首次未取得設定不展示預設活動冒充成功；曾取得設定的入口，斷線時保留設定並提示重試；401 顯示重新連接。正在練習時不強制離開，失效提示引導回首頁，未送紀錄保留。

## 機制與界線

- 同源 API：`https://kids.linshuhuan.com/api/v1/*`，由現有 Worker 處理；網站頁面繼續由 GitHub Pages 發布。
- `POST /api/v1/session`：JSON body 收家庭金鑰。驗證成功產生 32-byte 隨機憑證，回 `__Host-kids_session` Cookie：`HttpOnly; Secure; SameSite=Strict; Path=/`，180 天固定期限。清除 Cookie、期限到期、登出或更換家庭金鑰後需重連。
- `GET /api/v1/session`：只回已連接與到期時間，不回憑證。每個新登入產生獨立憑證；KV `s:device:<SHA-256>` 保存到期時間與家庭金鑰指紋，具有 TTL，不保存原文。登出移除該筆 session；KV 最終一致性仍可能造成短暫撤銷延遲。
- `POST /api/v1/session/logout`：中斷此入口，清 Cookie。不是清除家庭資料，也不是撤銷所有其他入口。
- `/api/` 不接受網址或 Authorization 中的家庭金鑰；所有 Cookie 寫入（含 text/plain beacon）驗證精確的同源 Origin，拒絕缺少 Origin 或跨站請求。Cookie 不設定 Domain。
- 同步、累計、設定、題包統一透過 Cookie；進度協定與 KV key 不變。舊 `workers.dev/v1/*` 的 token API 保留過渡相容，不新增 CORS credentials。
- 家長與孩子仍共用家庭存取權限，獨立畫面不是角色權限隔離；本次沒有加入帳號、OAuth、短碼配對或裝置管理清單。
- 本機測試僅在 `LOCAL_DEV === true` 且主機為 loopback 時使用不同名稱、無 Secure 的開發 Cookie。部署設定沒有此開關。

## 發布與回退

此次需要正式部署 Worker、Pages，以及將既有 `kids.linshuhuan.com` CNAME 啟用 Cloudflare proxy，才能把 `/api/*` 分流到 Worker。不搬動 GitHub Pages 內容、不改 child 網址或家庭金鑰。

1. 確認 `kids` CNAME 仍指向 `huansbox.github.io`，TLS 必須端到端 HTTPS；不為本功能降低 SSL 模式。
2. 先部署 Worker，套用 `worker/wrangler.jsonc` 的精確 route `kids.linshuhuan.com/api/*`，`workers_dev: true` 保留舊入口。
3. 啟用該 CNAME 的 proxy，確認正式 `/api/v1/session` 無 Cookie 回 401、錯誤 Origin 的 POST 回 403，且不被 Pages HTML／redirect 取代。
4. 再發布前端；以測試資料完成 Cookie 登入、重開與正常資料請求，正式家庭金鑰由家長在圖示內輸入，不寫入測試記錄。
5. 若新登入服務出問題，保留 Cookie 與 `s:` 資料以便修復；不要直接回退不認 Cookie 的前端，因已轉移入口的舊 localStorage 金鑰已清除。若必須完整回退，舊帶金鑰圖示仍可啟動，乾淨網址的入口需要重新輸入家庭金鑰。

## 驗證

`tests/test_device_session.mjs` 覆蓋 Cookie 屬性、獨立憑證、雜湊保存、設定／題包／進度／累計共用登入、CSRF、偽造憑證、錯誤金鑰、過大 body、期限、輪替、登出與舊 API 相容。

`tests/test_device_auth_client.mjs` 以獨立 Cookie jar 模擬 Safari 與主畫面容器，驗證重開保持登入、URL／localStorage 過渡、Cookie 被拒時不清舊金鑰、正常資料請求不傳家庭金鑰、背景進度與離線／失效分流。

`tests/test_connection_pages.mjs` 驗證孩子首頁與家長後台首次讀不到設定時只提供重試，不顯示預設活動或可覆寫雲端的表單。

`node tests/helpers/serve-family.mjs 8790` 提供隔離瀏覽器驗證，只用 `test-token`、記憶體 KV 與 synthetic 題包。這不等於 iPad 真機驗收或正式環境登入驗收。

本機已在瀏覽器完成：舊本機金鑰自動轉移、登出後出現首次連接畫面、錯誤金鑰提示、正確連接後進首頁、重開仍保持登入、另一端修改活動後前景首頁自動只顯示題庫、Cookie 取得家庭題包、服務暫停時保留已取得的活動、恢復後重新連線，以及家長調整中登入失效、重新連接後保留原本修改並成功儲存。測試資料與正式家庭資料隔離，不記錄真實家庭金鑰。

本地測試：Node 315 項通過、pytest 184 項通過；Worker dry-run 打包成功，`git diff --check` 通過。

## 正式發布紀錄

- 實作 commit：`ebff26e`；資源版本修正：`8f7559e`。七個入口的本次異動 JS／CSS 帶 `v=20260916-session`，避免新 HTML 混用瀏覽器快取中的舊金鑰流程。
- Worker version：`bae214db-4ed3-4ca3-9237-617d7ed9081b`。家庭 TOKEN、KV 與既有資料保持原值。
- 透過已登入的 Cloudflare 管理頁確認並啟用 `kids` CNAME 的 proxy，目標仍是 `huansbox.github.io`；沿用原本 SSL/TLS「完整」模式。先前 CLI 讀 zone 的 403 未阻擋本次 Wrangler 發布與管理頁設定。
- 正式 API 未登入 GET 回 401、缺少 Origin 的 POST 回 403、同源錯誤金鑰回 401 且不發 Cookie；回應為 JSON 與 `Cache-Control: no-store`。根首頁 HTTPS 200；舊 Worker API 仍要求既有金鑰。
- GitHub Actions：實作版 [test](https://github.com/huansbox/aiden-study/actions/runs/35057559379) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35057558897) 成功；資源版本修正版 [test](https://github.com/huansbox/aiden-study/actions/runs/35057628989) 與 [Pages](https://github.com/huansbox/aiden-study/actions/runs/35057628586) 也成功。
- 正式站 7 個入口 HTML 與 9 個相關 JS／CSS 全部 HTTPS 200，內容與 `8f7559e` Git blob 相符。
- Chrome 沿用原本已保存的家庭金鑰自動連接，未手動重新輸入；乾淨 child 網址重開後仍可用。家長後台顯示「此入口已記住家庭連線」與「已讀取雲端設定」。煦誠首頁顯示題庫／長除法／數織，符合當時雲端 rev 5；正式檢查未修改安排或作答。
- iPad 真機重新加入乾淨網址由家長接續操作；本次桌面驗證不宣稱已完成 iPad Cookie 保存驗收。Safari 若提示首次連接，先連接再加入主畫面；從新圖示開啟若再次提示，就在該入口再連接一次。

參考：[WebKit 的安裝與儲存隔離](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/)、[OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[Cloudflare Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)。
