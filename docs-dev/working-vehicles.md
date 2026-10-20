# 飛機與工作車積木工坊

對應 [#223](https://github.com/huansbox/aiden-study/issues/223)。收藏仍由 `collection-core.js` 管理，六款共用原圖形組裝工作台；可動特寫使用原始 PNG 分件與同一 3D 來源輸出的姿勢 PNG。

| ID | 作品 | 來源包 | v2 孩子包／組 | 操作重點 |
| --- | --- | --- | --- | --- |
| jet-plane | 雙引擎噴射客機 | 11 | 10／30 | 機翼接合、左右噴射風扇各自試轉 |
| excavator | 怪手 | 10 | 9／27 | 大臂、小臂、鏟斗、旋轉座帶動完整上車 |
| snow-blower | 旋轉拋雪車 | 10 | 9／27 | 螺旋集雪筒、調高管口、集雪拋出 |
| mobile-crane | 伸縮吊車 | 10 | 9／27 | 支撐腳伸出後，伸縮臂與吊鉤吊箱 |
| cement-mixer | 水泥攪拌車 | 10 | 9／27 | 攪拌筒旋轉、卸料槽與積木出料 |
| recycling-truck | 資源回收車 | 10 | 9／27 | 舉桶倒入、後門與抬斗卸料 |

## 保存與素材

- 新作品一律 `contentVersion:2`。原 `p1-1/2/3` 是已備好的展示場景，不配包、不保存為孩子放置紀錄；孩子第一包仍使用原 `p2-*`，不改原始 part ID。
- 既有七款列車仍開放；R200 與 `car/train/plane` 保留資料與既有半成品契約，不開放新選。新飛機使用 `jet-plane`，沒有改寫舊 `plane`。
- 新選順序為飛機、怪手、拋雪車、吊車、攪拌車、回收車，再接既有列車。收藏系列名稱為「積木收藏」。新作品縮圖為各自 `preview.png`，舊列車沿用 `preview.webp`。
- 正式素材由 `scripts/e500-art/` 重建；PNG、metadata、SHA 與 generated runtime 必須一致。發布檢查不以 synthetic fixture 替代缺少的正式素材。
- `motion.pivot/basis` 是固定匯出相機下的鉸鏈與機構平面投影。風扇使用三層 `A × R × A⁻¹`，中層以 SVG `animateTransform` 旋轉，避免橢圓進氣面旋歪；液壓桿保存投影 `base/tip`，固定基端、讓另一端隨關節移動。
- 長筒與上車 yaw 會改變 3D 輪廓，使用 `model.mechanismPoses` 的真姿勢影格。`drum` 必須裝齊 p5–p8；`auger` 必須裝齊 p7–p8；`turntable` 必須裝齊 p4–p10（地面貨物 p9-3 除外）。只在對應零件齊備後載入影格，缺少影格就鎖住該操作。
- 吊車 `supports` 必須裝齊 p4 三件與五張姿勢圖，橫梁、四支缸及四塊腳墊一起換姿勢。第零張對齊原裝圖；伸出時只加長橫梁，缸與腳墊保持尺寸、同步平移。所有姿勢試玩共用單一 `<image>` 換圖，結束只保留最終影格，滑桿接管時清除動畫。
- 吊車三件與回收車九件另有 `model.mechanismArt`。原組裝 PNG 保留原本的深度遮擋；試玩素材排除會分開的外部遮擋物，保留同一 rig 內的遮擋，避免吊線或門板移動後露出透明斷洞。兩者皆是同一來源的原件 PNG，不增加收藏零件。
- 吊車的 p8-2 含吊線及下方鉤座；試玩沿原圖透明區分裁，吊線縮短、鉤座保持原尺寸。伸縮臂的段落共用接點，滑輪及吊線跟隨臂端。回收車的後門長軸留在車斗，門板及鎖扣沿軸開合；p10-2 的車斗頂燈與車架反光由原圖透明區分開，分別跟隨車斗及車架。

## 操作界線

`KidsVehicleMechanism.create(model)` 只持有暫態操作值。機構不接收 collection adapter，不做配包、放件或 storage 寫入。缺支持件或機構零件時沒有可操作的圖形；試玩不能把未保存的零件變成完成。

場景只呈現已保存的原始零件。選零件、接合、點按、拖曳、鍵盤、Escape、取消、回看、暫停、逐包與圖片重試仍由共用工作台處理。一般整體畫面使用完整 `model.viewBox` 並保留捲動；特寫限制高度，僅特寫範圍保留 `touch-action:none`。

新六款的操作鈕與滑桿位於 `vehicle-model-area` 內、緊貼 SVG 前方，避免右側零件盤較高時把控制推到模型下方。完工作品的「玩玩零件」使用唯讀 adapter；退出返回原作品，不再次宣告完成或慶祝。

吊車支撐腳必須完全伸出（100%），才能操作伸縮臂與吊鉤；退回任何位置都會收回暫態伸臂與吊箱值。怪手轉台操作期間先收回挖臂試玩值，回正後才再開放挖臂；旋轉影格與挖臂分件不疊成不存在的姿勢。

## 隔離驗證入口

- 家長試拼：`docs/parent/train-preview.html?model=jet-plane`；改 `model` 可看其他五款。頁面使用記憶體示範資料與 `connect-src 'none'`，不讀寫孩子進度。
- `&mode=last`：試最後一組與完成畫面，完成後可進唯讀回玩。
- 本機 synthetic fixture：`/test/workshop-fixture?model=jet-plane&placed=15` 可到左右引擎交界；怪手可用 `placed=24`、拋雪車 `placed=21`、吊車 `placed=24`、攪拌車 `placed=21`、回收車 `placed=24`。fixture 只在隔離服務存在，不放進正式 Worker。
- 共用 action：`data-e500-action=part/place/next/mechanism`。機構 action：`data-train-action=open/close` 加 `data-kind`；`data-train-range` 為滑桿，`data-train-operate` 為 SVG 拖曳／鍵盤區。
- 機構 key：飛機 `wings/fan-left/fan-right`；怪手 `boom/stick/bucket/turntable`；雪車 `auger/chute/snow`；吊車 `supports/telescope/hoist`；攪拌車 `drum/gutter/pour`；回收車 `bin/tip`。

## 測試

```sh
node --test tests/test_vehicle_workshop.mjs tests/test_working_vehicles_release.mjs tests/test_train_workshop_routing.mjs tests/test_collection_availability.mjs
```

行為測試覆蓋每款原分件只保存一次、fixed scene 免費、操作缺件鎖定、取消、鍵盤、reduced motion、圖片重試、未來素材不阻擋目前包、唯讀回玩與控制／場景的相對位置。發布測試讀正式 PNG、metadata、SHA、姿勢影格與實際鉸鏈數學，缺來源會失敗；吊車另實際合成 PNG 檢查不同伸臂／升鉤位置的 alpha 連通性，回收車核對後門長軸兩端的接合。實際 Pad 版面、手勢與外觀以整合端的 browser 驗收紀錄為準。
