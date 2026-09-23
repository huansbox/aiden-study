# E500 積木圖像來源

這裡保存 E500 的可重建幾何與離線材質設定。正式 App 只載入透明 PNG；Three.js、相機、光源與 WebGL 都只用於開發時產圖。

## 重建

在 repo 根目錄執行：

```sh
npm ci
node scripts/e500-art/build.mjs
node scripts/e500-art/serve.mjs
```

開發預覽位於 `http://127.0.0.1:8877/index.html`。使用既有隔離 Chromium 的 CDP endpoint 匯出；這個指令會建立並關閉自己的頁面，不改另一個測試頁的資料、網址或 viewport：

```sh
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID
```

如果 server 使用不同 port，在最後追加 `http://127.0.0.1:PORT`。產物保存在 `.scratch/e500-art/candidates/`，比對頁為 `http://127.0.0.1:8877/candidates/index.html`。

確認比對圖後加上 `--publish`，將 42 PNG 與 metadata 更新至 `docs/shared/bricks/e500-v1/`：

```sh
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID --publish
```

發布圖片後，產生小型前端模型索引並更新首頁版本：

```sh
node scripts/build-e500-runtime.mjs
node scripts/build-home-release.mjs
node scripts/build-e500-runtime.mjs --check
```

索引內含各部件的裁切位置、名稱與本機圖片 URL，整組圖片的 digest 用於快取更新。正式頁面不執行 3D 建模程式。

## 來源與產物

- `model-source.js`：原始 42 組世界座標幾何，也是快速 vector QA 的來源。
- `build.mjs`：在獨立 VM 將繪圖函式替換成幾何收集器，不修改原始檔；產出 `.scratch/e500-art/geometry.json`。
- `render.js`：固定正交相機、塑膠圓角、圓柱 studs、輪圈、玻璃、燈光。
- `export-sprites.mjs`：各組獨立透明渲染、裁切、2× PNG、metadata 與 QA。
- `metadata.json`：保留 `steps`、`file`、`imageBox`、`box`、`z` 與 `originalZ`。每片有 `sha256`，整組有 `assetDigest`，供正式 URL cache busting。

同一相機使用 800×500 邏輯座標，整台含軌道占約 89% 畫布寬。每張 image 使用真正裁切邊界，touch box 至少 44×44。所有 PNG 保留透明底，沒有整張模型 canvas、地板或整台陰影。獨立零件保留自身內側面與自身陰影，沒有使用完整模型 depth mask。

## 目視驗證與限制

比對 `full-3d.png`（整台同時渲染）與 `composited.png`（42 張依 z 合成），並檢查 3、6、21、42 組。`*-on-beige.png` 提供暖色背景版本；黑色輪組在透明圖的黑底預覽中不易辨識。

候選 z 的必要調整寫在 exporter：懸吊與車底設備在底盤後方、後段屋頂先於前段、後駕駛室側牆在遠端屋頂斜面前。這只調整顯示順序，不改分包或 stable IDs。

不同組件互投的陰影無法完整保留於獨立 sprites；少數燈具／飾板與相鄰組件交疊處也會略有差異。`comparison.json` 包含光照、取樣與排序的像素差異，不能當作視覺等價的驗收證明。

素材完整性與快速幾何預覽：

```sh
node --test tests/test_e500_model.mjs
node scripts/render-e500-model.mjs
```

後者只產生 vector 幾何 QA，不是正式材質產物。完整重建需要支援 WebGL 的隔離 Chromium；日常資料／PNG 完整性測試不需啟動瀏覽器。
