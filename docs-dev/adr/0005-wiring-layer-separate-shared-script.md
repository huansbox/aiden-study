# 接線層抽成獨立共用腳本 wiring-v1.js，不塞進 sync-v1.js

脈絡：#33 交付後，四個接同步的 app（study／zhuyin／math／spelling）各自複製了約 150–200 行同款接線碼（身分解析與 identityUnresolvable 守衛、child 存檔 key 尋址、sync client 建立、家長區健康燈、匯入編排、pageshow 身分重驗、CHILD_INFO 名單）。#40-B 拍板抽共用時，載體有兩個選項：擴充既有的 `shared/sync-v1.js`，或另開新檔。

決定（2026-07-17）：另開 `docs/shared/wiring-v1.js`，沿用 v1-in-filename 慣例（不相容改版開 v2 新檔）。sync-v1.js 維持「協定純函式＋sync client」不動——它管雲端規則，出錯的代價是弄壞小孩存檔，越少碰越好，且其檔頭本就宣告不原地大改。接線層碰 DOM、HTML 字串、localStorage 全域，是另一個 altitude，混層會讓協定檔被 UI 需求牽著改版。

代價與化解：兩個共用檔多出「一檔載到、另一檔沒載到」的交叉組合——實際只有一格要處理（wiring 載到而 sync 沒載到 → 網址指名 child 時照樣拒開站，與現行 identityUnresolvable 行為一致）。
