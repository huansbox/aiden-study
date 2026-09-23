# E500 積木圖片管線

`model.js` 與 `brick-geometry.js` 是正式 E500 的幾何來源：使用原生 Three.js 建立 42 個獨立 assembly group，每組以 `userData` 記錄 stable ID、名稱、包名與顯示順序。正式 App 只載入由它輸出的透明 PNG 與 metadata；Three.js、WebGL、相機和光源只在開發產圖時使用。`prototype-model.js` 是已核准車頭與輪組的設計參考，不作為正式素材來源。

## 重建素材

在 repo 根目錄安裝依賴並啟動本機預覽：

```sh
npm ci
node scripts/e500-art/serve.mjs
```

預覽位於 `http://127.0.0.1:8877/index.html`。

同一服務的 `/celebration.html` 是完工慶祝預覽：用示範進度保留最後一組踏階，點擊或拖曳拼上後，以正式工作台與動畫模組播放約 4.2 秒試車，可略過或再次播放。示範保存僅在記憶體，不呼叫家庭 API；重新整理或按重設回到 41／42 組。

匯出器使用隔離 Chromium 的 CDP endpoint，會建立並關閉自己的頁面：

```sh
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID
```

server 若不在 8877 port，可在指令最後加上 `http://127.0.0.1:PORT`。候選素材位於 `.scratch/e500-art/candidates/`；比對頁為 `http://127.0.0.1:8877/candidates/index.html`。確認造型、分包與合成後，再用相同指令加上 `--publish`，更新 `docs/shared/bricks/e500-v1/` 中的 metadata、42 張基本 PNG 與同包任意順序所需的遮擋變體。

匯出時，每組使用相同固定正交相機，已完成的前幾包只寫入深度，避免背面的窗戶、扶手透到正面；尚未取得的未來零件不參與遮擋，因此半成品仍有完整內側面。同一包的三組可以任意順序放置，`occlusionPeers` 與 `variants` 保存前置同包部件的所有必要組合；工作台依已放上的部件選圖，缺少變體代表其像素與基本圖相同。

圖片依無同包遮擋時的可見範圍裁切，各變體共用尺寸與觸控位置，從 4× 取樣縮至 2× PNG。`metadata.json` 保存 14 包、42 組的 ID、名稱、`z`、觸控 `box`、裁切 `imageBox`、圖片路徑與每張 `sha256`；`assetDigest` 彙總基本圖與變體。所有圖片預載後才開放該包操作，避免換圖時閃爍；缺圖可重試，收藏進度不受影響。

正式素材更新後建立前端索引與首頁版本：

```sh
node scripts/build-e500-runtime.mjs
node scripts/build-home-release.mjs
node scripts/build-e500-runtime.mjs --check
```

## 離線與目視 QA

```sh
node --test tests/test_e500_model.mjs
node scripts/render-e500-model.mjs
```

離線工具只讀取已發布的 `metadata.json` 與基本圖／變體 PNG，驗證 ID、尺寸、透明度、每張 hash 與整組 digest，並輸出 `.scratch/e500-sprite-qa/`：`e500-composite.png`、3／6／21／42 組階段圖、四格階段總覽、42 組托盤圖及任意順序樣本。也可傳入輸出資料夾與另一份 metadata 進行候選素材檢查：

```sh
node scripts/render-e500-model.mjs .scratch/e500-check .scratch/e500-art/candidates/metadata.json
```

目視比對匯出器的 `full-3d.png`（整台同時渲染）與 `composited.png`（42 張按 `z` 合成），並檢查各階段與每組裁切。`*-on-beige.png` 可辨識透明圖片中的深色輪組。獨立 sprite 無法完全保留不同組件互投的陰影；`comparison.json` 的像素差異只是診斷資料，不能代替造型驗收。WebGL 僅用於這個開發匯出流程，日常離線完整性檢查不需瀏覽器。

`window-order-3*.png` 將第九包先放第三組的圖片合成與真正 3D 對照，檢查未放前玻璃時仍有窗洞。模型測試另遍歷每包六種順序，確認全部 252 次放置均有可見進展。`capture-model.mjs <CDP endpoint> [preview origin]` 擷取完整預覽、旋轉／重設與直向 Pad 畫面。
