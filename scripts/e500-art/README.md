# 積木列車圖片管線

## 飛機與工作車

六款新模型的名稱、來源包數、module 與 runtime global 集中在 `vehicle-catalog.js`；正式 App 只讀 PNG，Three.js 仍限開發預覽與素材輸出。原八款列車幾何、PNG 和 WebP 縮圖均保留。

| model ID | 幾何來源／export | 來源包／組 | 可拼包／組 | 完成縮圖 |
| --- | --- | --- | --- | --- |
| `jet-plane` | `model-jet-plane.js`／`createJetPlaneModel` | 11／33 | 10／30 | `preview.png` |
| `excavator` | `model-excavator.js`／`createExcavatorModel` | 10／30 | 9／27 | `preview.png` |
| `snow-blower` | `model-snow-blower.js`／`createSnowBlowerModel` | 10／30 | 9／27 | `preview.png` |
| `mobile-crane` | `model-mobile-crane.js`／`createMobileCraneModel` | 10／30 | 9／27 | `preview.png` |
| `cement-mixer` | `model-cement-mixer.js`／`createCementMixerModel` | 10／30 | 9／27 | `preview.png` |
| `recycling-truck` | `model-recycling-truck.js`／`createRecyclingTruckModel` | 10／30 | 9／27 | `preview.png` |

六款的來源首包 `p1-1`、`p1-2`、`p1-3` 是固定展示地面；contentVersion 2 會直接顯示，不扣積木包。來源仍完整保存首包，不能從 metadata 刪除或重新編號。`build-brick-previews.mjs --model=<ID>` 只重建指定款式，避免為新增模型重輸出舊素材。

飛機使用藍白短磚、真正中空的雙噴射引擎進氣殼及各自獨立風扇，不使用平面 SVG 或外置螺旋槳。機身朝 -x，保持 800×500 世界座標與正交投影；專用固定角度 `[-950,550,720]` 及 target offset `[0,-30,0]` 讓雙進氣面與整段跑道可辨識且落在畫布內。

| 飛機來源包 | 三個穩定 part IDs（依序） |
| --- | --- |
| p1 跑道 | 前段／中段／後段展示跑道 |
| p2 起落架 | 前起落架／左主起落架／右主起落架 |
| p3 機腹 | 前段／中央翼盒與凸點接座／後段 |
| p4 機身 | 左白機身／右白機身／藍白階梯機鼻 |
| p5 主翼 | 左主翼／右主翼／中央藍色鎖扣 |
| p6 左噴射引擎 | 左吊架／左中空殼／左獨立風扇 |
| p7 右噴射引擎 | 右吊架／右中空殼／右獨立風扇 |
| p8 機頂 | 前段／中央／後段 |
| p9 尾翼 | 左水平尾翼／右水平尾翼／藍垂直尾翼 |
| p10 窗戶 | 駕駛玻璃／前段雙側客窗列／後段雙側客窗列 |
| p11 收尾 | 左翼尖紅燈／右翼尖綠燈／機尾排氣口 |

風扇在 `p6-3`／`p7-3` 裝妥後可各自試轉；3D 轉軸是 x，pivot 分別為 `[202,77,-137]`／`[202,77,137]`。其他工作車的 part／pivot 見 [工作車幾何說明](../../docs-dev/working-vehicle-art.md)。

可動組件的 optional `motion` 由固定產圖鏡頭產生並保留到正式 runtime：`pivot` 是 800×500 的軸心座標，`basis:[a,b,c,d]` 是機構旋轉平面的兩個投影基底，`vector`（若有）是伸縮方向。前端以 `A × rotation × A⁻¹` 變換，保留風扇、滾筒等斜視平面的橢圓外形。舊八款不增加此欄位、不改原輸出。

`base`／`tip`（若有）保存油壓缸或吊線的固定端／移動端投影；移動時固定端保留在原接點。真實姿勢的旋轉部件、軸向、軸心 anchor、角度與 required IDs 集中在 `vehiclePoseDefinitions`，不依 UI 預覽當時的旋轉或長寬比推算。

混凝土攪拌筒具有沿轉軸的長度，不能把整張 PNG 當成平面圓盤旋轉。混凝土車下載 bundle 會在一般零件之後額外渲染八個實際 3D 姿勢：`p6` 三段筒身與 `p7` 加強環／藍紋一起繞世界 x 軸、以 `[312,170,0]` 為中心每次轉 45°；`p5` 筒座與 `p8` 卸料模組保留靜態。匯入後保存為 `mechanism-poses/drum-0.png` 至 `drum-7.png`（1600×1000 透明 PNG），metadata 的 `mechanismPoses.drum` 記錄 sha256、800×500 imageBox 與完整 `p5`–`p8` required IDs；runtime 增補同來源的 `frame.src`／`frame.svg`。全模組裝妥後才在特寫切換姿勢，圖片 hash 一併納入 assetDigest／assetVersion。離線 QA 另產生 `cement-mixer-mechanism-drum.png` 八姿勢總覽。

雪車的螺旋集雪葉同樣是有軸向長度的 3D 部件。`p8-1` 螺旋葉與 `p8-2` 中央齒盤一起繞 `[32,64,0]` 的世界 z 軸渲染八姿勢，`p7` 外殼與 `p8-3` 底板保持靜態；保存為 `mechanism-poses/auger-0.png` 至 `auger-7.png`，`mechanismPoses.auger.required` 是完整 `p7`／`p8`。管嘴採 `p9-3` 的 `[31,205,0]` z 軸鉸鏈調高／降低。

怪手旋轉轉台另保存 `mechanism-poses/turntable-0.png` 至 `turntable-4.png` 五個實際上車姿勢（0°／10°／20°／30°／40°）。完整 `p4`–`p10` 的上車繞 `[302,103,0]` 世界 y 軸旋轉，排除地面工作積木 `p9-3`；`p1`–`p3` 固定下車只參與深度遮擋。`mechanismPoses.turntable.required` 要求全部上車完成；在轉台姿勢模式中先復位並停用三個挖臂軸，回到 0° 才恢復各軸試玩，避免把 3D 轉台姿勢與平面挖臂變換疊加。

吊車與回收車另外保存 `mechanismArt`：同一原件在操作時需要露出原本被固定車身擋住的表面，不能拉伸已裁洞的拼裝 PNG。吊車 `p7-2`／`p7-3` 伸縮臂及 `p8-2` 吊線，各自完整渲染、不加入遮擋。回收車 `p5`–`p7` 九件按實際 rig 保留內部深度：車斗只受同車斗先前件遮擋，排除駕駛室；門板獨立渲染，長鉸鏈 `p7-2` 留在車斗並受車斗遮擋，鎖扣 `p7-3` 僅受門板遮擋。來源規則見 catalog 的 `mechanismArt`／`mechanismArtRigs`／`mechanismArtOccluders`。

新增圖仍是來源幾何的 1600×1000 透明 PNG，保存為 `mechanism-art/<part ID>.png`，不改原先三十組的拼裝圖或編號。metadata／runtime 的 `mechanismArt[part ID]` 保存 file、sha256、800×500 imageBox，runtime 加上同來源的 src／svg，hash 納入 assetDigest／assetVersion。可見下載按鈕會在一般零件之後附加這三／九張；匯入器會拒絕缺少它們的舊 bundle。離線 QA 另產生 `*-mechanism-art.png` 分件總覽。

新六款必須從可見預覽頁正常下載 bundle，再離線匯入；不使用外接 headless browser、CDP 或 Playwright 產圖。以飛機為例：

```sh
node scripts/e500-art/serve.mjs 8877
# 在可見瀏覽器開啟 http://127.0.0.1:8877/index.html?model=jet-plane
# 點「下載素材渲染檔」，等候「素材已匯出」並保存 jet-plane-render-bundle.json
node scripts/e500-art/export-sprites.mjs --model=jet-plane --bundle=/absolute/path/jet-plane-render-bundle.json --publish
node scripts/build-e500-runtime.mjs --model=jet-plane
node scripts/build-brick-previews.mjs --model=jet-plane
node scripts/render-e500-model.mjs .scratch/jet-plane-check docs/shared/bricks/jet-plane-v1/metadata.json
node scripts/build-e500-runtime.mjs --model=jet-plane --check
node scripts/build-brick-previews.mjs --model=jet-plane --check
node --test tests/test_jet_plane_geometry.mjs tests/test_working_vehicle_geometry.mjs
# 六款全數匯入後再跑素材及縮圖整合驗證
node --test tests/test_e500_model.mjs tests/test_brick_previews.mjs
```

候選素材與比對頁各自位於 `.scratch/e500-art/candidates/<ID>/`，正式資產各自位於 `docs/shared/bricks/<ID>-v1/`。對照整機與 sprites 合成圖，並檢查來源第 3／6／21 組階段、每包六種放置順序與機構已裝妥就可操作的行為，才作造型與流程驗收。bundle 和候選圖屬可重建的暫存，不提交 Git。

`model.js` 與 `brick-geometry.js` 是正式 E500 的幾何來源：使用原生 Three.js 建立 42 個獨立 assembly group，每組以 `userData` 記錄 stable ID、名稱、包名與顯示順序。正式 App 只載入由它輸出的透明 PNG 與 metadata；Three.js、WebGL、相機和光源只在開發產圖時使用。`prototype-model.js` 是已核准車頭與輪組的設計參考，不作為正式素材來源。

EMU3000、R200、700T、N700S、EMU900、藍皮解憂號與 CT273 沿用同一管線；腳本保留原 E500 名稱與預設參數，重建既有素材的指令仍相容。

| model ID | 幾何來源 | 包／組 | 基本圖＋遮擋變體 | 成品目錄 |
| --- | --- | --- | --- | --- |
| `e500` | `model.js` | 14／42 | 42＋29 | `docs/shared/bricks/e500-v1/` |
| `emu3000` | `model-emu3000.js` | 12／36 | 36＋28 | `docs/shared/bricks/emu3000-v1/` |
| `r200` | `model-r200.js` | 12／36 | 36＋27 | `docs/shared/bricks/r200-v1/` |
| `700t` | `model-700t.js` | 12／36 | 36＋33 | `docs/shared/bricks/700t-v1/` |
| `n700s` | `model-n700s.js` | 12／36 | 36＋35 | `docs/shared/bricks/n700s-v1/` |

| `emu900` | `model-emu900.js` | 12／36 | 36＋32 | `docs/shared/bricks/emu900-v1/` |
| `breezy-blue` | `model-breezy-blue.js` | 12／36 | 36＋35 | `docs/shared/bricks/breezy-blue-v1/` |
| `ct273` | `model-ct273.js` | 14／42 | 42＋26 | `docs/shared/bricks/ct273-v1/` |

EMU3000 是單節先頭車，R200 是完整機車。外觀參考、範圍與照片來源見 [使用規格](../../docs-dev/daily-brick-collection.md#emu3000-與-r200)。每台前三組展示軌道、尺寸、網格與相機相容，故可共用完成慶祝；最後一組集中於前端，落點框不橫跨整車。

## 重建素材

在 repo 根目錄安裝依賴並啟動本機預覽：

```sh
npm ci
node scripts/e500-art/serve.mjs
```

預覽位於 `http://127.0.0.1:8877/index.html`。

完整模型與慶祝頁均支援上表八款 `?model=<model ID>`，頁首可切換車型。E500／CT273 的慶祝示範為 41／42 組，其餘六款為 35／36 組。可用 `node scripts/e500-art/verify-celebration.mjs <CDP endpoint> http://127.0.0.1:8877 emu3000`（或 `r200`、`700t`、`n700s`）驗證新車；結果按車型命名。

同一服務的 `/celebration.html` 是完工慶祝預覽：用示範進度保留最後一組踏階，依金色目標框點擊或拖曳拼上後，以正式工作台與動畫模組播放約 6 秒單向試車，附慶祝音效，可靜音、略過或再次播放。示範保存僅在記憶體，不呼叫家庭 API；重新整理或按重設回到 41／42 組。

另以全新隔離 agent-browser session 先打開 `/celebration.html`，取得 CDP endpoint 後可執行 `node scripts/e500-art/verify-celebration.mjs <CDP endpoint> [preview origin]`。這四項檢查包含真實 WebAudio 訊號、觸控啟動、靜音／恢復／略過、重播共用 context、直向拖曳及中途重設；結果與截圖輸出到 `.scratch/collection-e2e/`。

匯出器使用隔離 Chromium 的 CDP endpoint，會建立並關閉自己的頁面：

```sh
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID --model=emu3000 --publish
node scripts/e500-art/export-sprites.mjs ws://127.0.0.1:PORT/devtools/browser/ID --model=r200 --publish
```

server 若不在 8877 port，可在指令最後加上 `http://127.0.0.1:PORT`。候選素材位於 `.scratch/e500-art/candidates/`；比對頁為 `http://127.0.0.1:8877/candidates/index.html`。確認造型、分包與合成後，再用相同指令加上 `--publish`，更新 `docs/shared/bricks/e500-v1/` 中的 metadata、42 張基本 PNG 與同包任意順序所需的遮擋變體。

新車候選圖與比對頁位於上述 `candidates/emu3000/`、`candidates/r200/` 子目錄。每份 metadata 記錄該車實際包數與組數；輸出的 PNG 不包含其他車型的素材。

匯出時，每組使用相同固定正交相機，已完成的前幾包只寫入深度，避免背面的窗戶、扶手透到正面；尚未取得的未來零件不參與遮擋，因此半成品仍有完整內側面。同一包的三組可以任意順序放置，`occlusionPeers` 與 `variants` 保存前置同包部件的所有必要組合；工作台依已放上的部件選圖，缺少變體代表其像素與基本圖相同。

圖片依無同包遮擋時的可見範圍裁切，各變體共用尺寸與觸控位置，從 4× 取樣縮至 2× PNG。`metadata.json` 保存 14 包、42 組的 ID、名稱、`z`、觸控 `box`、裁切 `imageBox`、圖片路徑與每張 `sha256`；`assetDigest` 彙總基本圖與變體。所有圖片預載後才開放該包操作，避免換圖時閃爍；缺圖可重試，收藏進度不受影響。

正式素材更新後建立前端索引與首頁版本：

```sh
node scripts/build-e500-runtime.mjs
node scripts/build-e500-runtime.mjs --model=emu3000
node scripts/build-e500-runtime.mjs --model=r200
node scripts/build-home-release.mjs
node scripts/build-e500-runtime.mjs --check
node scripts/build-e500-runtime.mjs --model=emu3000 --check
node scripts/build-e500-runtime.mjs --model=r200 --check
```

## 離線與目視 QA

```sh
node --test tests/test_e500_model.mjs
node scripts/render-e500-model.mjs
```

離線工具只讀取已發布的 `metadata.json` 與基本圖／變體 PNG，驗證 ID、尺寸、透明度、每張 hash 與整組 digest，並輸出 `.scratch/e500-sprite-qa/`：`e500-composite.png`、3／6／21／42 組階段圖、四格階段總覽、42 組托盤圖及任意順序樣本。也可傳入輸出資料夾與另一份 metadata 進行候選素材檢查：

```sh
node scripts/render-e500-model.mjs .scratch/e500-check .scratch/e500-art/candidates/metadata.json
node scripts/render-e500-model.mjs .scratch/emu3000-check docs/shared/bricks/emu3000-v1/metadata.json
node scripts/render-e500-model.mjs .scratch/r200-check docs/shared/bricks/r200-v1/metadata.json
```

目視比對匯出器的 `full-3d.png`（整台同時渲染）與 `composited.png`（42 張按 `z` 合成），並檢查各階段與每組裁切。`*-on-beige.png` 可辨識透明圖片中的深色輪組。獨立 sprite 無法完全保留不同組件互投的陰影；`comparison.json` 的像素差異只是診斷資料，不能代替造型驗收。WebGL 僅用於這個開發匯出流程，日常離線完整性檢查不需瀏覽器。

`window-order-3*.png` 將第九包先放第三組的圖片合成與真正 3D 對照，檢查未放前玻璃時仍有窗洞。模型測試另遍歷每包六種順序，確認全部 252 次放置均有可見進展。`capture-model.mjs <CDP endpoint> [preview origin]` 擷取完整預覽、旋轉／重設與直向 Pad 畫面。

模型測試涵蓋八台；每包六種順序共 1800 次放置皆須有可見像素變化。12 包車型各 216 次，E500／CT273 各 252 次。`capture-model.mjs` 仍是 E500 專用幾何操作檢查；新車使用通用 `index.html?model=…` 與輸出比對頁檢視，並在 `verify-collection-e2e.mjs` 實際完成組裝。

## 700T／N700S 重建

兩台均是一節先頭車，各 12 包、36 組；幾何與官方照片來源見 [使用規格](../../docs-dev/daily-brick-collection.md#台灣高鐵-700t-與日本新幹線-n700s)。下列以 700T 為例，N700S 將 `700t` 替換為 `n700s`：

```sh
node scripts/e500-art/export-sprites.mjs <CDP endpoint> http://127.0.0.1:8877 --model=700t --publish
node scripts/build-e500-runtime.mjs --model=700t
node scripts/render-e500-model.mjs .scratch/700t-check docs/shared/bricks/700t-v1/metadata.json
node scripts/build-home-release.mjs
node scripts/build-e500-runtime.mjs --model=700t --check
```

新素材各約 2.80 MB；既有三台素材保持原樣。發布需要先更新 Worker 的車型 allowlist，再發布前端；本機試拼與作者預覽不需要正式家庭資料。

## EMU900／藍皮解憂號／CT273 重建

三款新幾何共用 `train-parts.js`，未改既有五款的來源或圖片。EMU900 與藍皮客車各 12 包、CT273 含煤水車共 14 包。造型與官方參考見 [使用規格](../../docs-dev/daily-brick-collection.md#emu900藍皮解憂號與-ct273)。

也可在瀏覽器使用可見預覽頁的「下載素材渲染檔」匯出。等待按鈕顯示「素材已匯出」後，將下載的 JSON 交給同一素材處理器，不需要外接 CDP。以下以 EMU900 為例，其餘替換 model ID：

```sh
node scripts/e500-art/serve.mjs
# 開啟 http://127.0.0.1:8877/index.html?model=emu900，點「下載素材渲染檔」
node scripts/e500-art/export-sprites.mjs --model=emu900 --bundle=/absolute/path/emu900-render-bundle.json --publish
node scripts/build-e500-runtime.mjs --model=emu900
node scripts/render-e500-model.mjs .scratch/emu900-check docs/shared/bricks/emu900-v1/metadata.json
node scripts/build-home-release.mjs
node --test tests/test_e500_model.mjs
```

匯出 bundle 保存完整模型、每組所有遮擋組合及第九包三種順序的參考影格；圖片處理、裁切、digest 與原 CDP 途徑共用。bundle 是可重建的開發暫存，不納入 Git；正式來源仍為幾何檔。渲染與素材測試通過後才交付。正式發布需先部署 Worker 車型 allowlist，再合併前端。

## 藍皮客車門窗特寫素材

正式工作台採用家長接受的積木特寫，來源 `model-breezy-lab.js` 沿用 `brick-geometry.js`、正式藍皮配色與塑膠材質。固定正交鏡頭保留上下開窗、左右拉門的平面操作軸。特寫是門窗模組代表圖，不重複整組所有窗戶；全車仍以原始 36 組模型顯示實際位置。body 圖層只畫車身與洞口，不畫車頂、輪組、踏階，以免半成品提前出現其他組件。

```sh
node scripts/e500-art/serve.mjs 8881
# 開啟 http://127.0.0.1:8881/breezy-lab-art.html，點「下載門窗素材」
node scripts/e500-art/import-breezy-lab-art.mjs /absolute/path/breezy-lab-art.json
node --test tests/test_breezy_workshop.mjs
node scripts/build-home-release.mjs
```

匯入器將六張 1800×940 透明 PNG 寫到 `docs/shared/breezy-art/`，並記錄 sha256 manifest；SVG 顯示座標為 900×470。正式頁面只用 PNG，不載入 Three.js／WebGL。修改已發布 PNG 時同步增加 `breezy-mechanism.js` 的圖片版本，以更新首頁 release 與瀏覽器快取。原型 draft PR #210 留作比較，正式素材來源以本分支／合併後主線為準。
