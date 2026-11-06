# 四上後半冊題包接入契約

追蹤 [#249](https://github.com/huansbox/aiden-study/issues/249)。這是格式支援，不代表內容已核准或已發布。孩子端單元是否開放，仍由 `docs/shared/family-core.js` 的 `published` 控制；家長試玩使用同份單元名稱與科目 metadata。

- 數學 U6–U10 使用 unit 24–28；基本輸入、原選項集合與 PNG 契約見[數學作者交付](study-final-math-contract.md)。列式、直式對齊、作圖與量測另按核定操作處理。
- 自然 U3／U4 使用 unit 29／30，沿用自然單選、是非、共享選項題組及 table／PNG。PNG 上限仍 32 KiB。
- 社會 U3／U4 使用 unit 31／32，沿用社會單選、是非、共享選項題組、詞庫填空及 PNG。PNG 上限 192 KiB；詞庫最多 15 選項／13 空。新單元尚未開文字別名或完整答案向量。
- 圖片雙邊 1600px、shard／unit／操作／cache／manifest 容量限制維持原契約。新單元不擴大舊單元可接受的題型。

## 同材料、各自選項的題組

僅 social unit 31／32 的 `grouped_choice` 可用下列合成形式。頂層 `text` 與 `material` 保留完整共同材料；每次顯示一個小題，整組仍是一個活動。

```json
{
  "type": "grouped_choice",
  "options": [],
  "answer": "23",
  "parts": [
    { "id": "a", "text": "合成小題甲", "options": ["甲一", "甲二"] },
    { "id": "b", "text": "合成小題乙", "options": ["乙一", "乙二", "乙三"] }
  ]
}
```

全部 parts 都必須有各自的 2–4 選項，不能混用共享與個別選項；parts 數仍為 2–8。答案字串每格為各自選項的 1-based 索引。個別選項屬於 immutable 作答語意，不可在相同 stable ID 下改動。舊共享選項題組的格式與語意指紋保持。

Python builder、瀏覽器／Worker 共用 validator、孩子畫面與家長試玩使用相同契約。作答結果仍即時保存，獎勵只在整輪結束出現。

## 一電池一燈泡連線

`circuit_connect` 僅適用 science unit 30；`options=[]`、`answer="closed"`，`material` 必須是 32 KiB 內的原燈泡 PNG。`circuit.terminals` 固定五個接點，依序為 `battery-positive`、`battery-negative`、`bulb-glass`、`bulb-shell`、`bulb-base`，各含整數 `x/y`，使用 1000×700 的互動區座標。接點保留至少 90 座標單位距離；兩個電池接點同 x 且上下至少 120。位置同樣屬於 immutable 作答語意。

孩子先按「放入一顆電池」，再點選兩個端點新增電線；可刪除單線或全部重畫。電池保留正負標示，燈泡接點只用相同外觀與中性編號，玻璃接點也可選。完整作答是 `batteryPlaced=true` 加兩條不同、非自接的無向 edges；電池正負兩端各接金屬殼／底接點才正確，接受線序、端點順序與正負對調。玻璃、短路、接點重用或缺線都不通關。

原燈泡圖只作裁切與等比例放大；原完整題圖、crop 座標與指紋留在私人來源紀錄。這是限定材料的連線操作，不宣稱驗證自由手繪能力；自由列舉節能方法也不以少量文字別名冒充完整語意評分。

## 追加與重建

`scripts/build_private_study_catalog.mjs` 的 `appendCatalog()` 接受完整前版 source、manifest 與所有 shard bytes，逐片驗證內容與來源一致，再追加新活動的 shards。既有 descriptor、題目、來源、解說及原始 bytes 都保持；缺件或舊內容變動會失敗。沒有新題時可用同一 API 核對原 manifest／shards 的精確重建。

本輪從已發布完整 rev22 的 465 活動／26 shards 接續，不能回退自然歷史版或只用 delta 作基線。完整 authoring、來源、核答、整合與 E2E 證據留在 ignored 私用根；公開測試僅使用合成題。內容核准前的 schema readiness 與獨立來源核答是不同階段。
