# 四上自然第二批 Study 整合與發布

本批承接 [#119](https://github.com/huansbox/aiden-study/issues/119)，在 revision 5 的 77 題之後，新增自然 12 個完整 activity、29 個原卷作答位置。**revision 6、89 題已於 2026-09-23 正式發布。** 原 77 題、解說與 mapping row 逐值不變；實體 iPad 尚未驗收。

## 練習主題（[#124](https://github.com/huansbox/aiden-study/issues/124)）

孩子 Study 與家長試玩共用七個自然「練習主題」：地表物質 3、地表變化與保護 6、地震與防災 2；水域環境與觀察 6、水生植物 5、水生動物 4、水域保護 6。整單元練習是兩邊的預設入口，仍包含所有已載入題目。主題只決定選題範圍，題目的 `q.subtopic`、ID、題文與正式題包均不變；舊細標籤的批次鍵與已答對題 ID 繼續保留。遇到新的細標籤時，整單元仍會收錄，但必須在 `docs/study/science-topics.js` 明確補上對應，才會進入其中一個主題，避免誤分類。

驗證使用合成題涵蓋孩子選題、主題重練不清除其他主題／未載入進度、舊細標籤批次、家長試玩與數學原流程。正式 revision 6 題包經唯讀核對，32 題全部落在上述七類，數量依序為 3／6／2、6／5／4／6；沒有將私人題文或圖片加入公開測試。

## 整組選答逐小題介面

[#122](https://github.com/huansbox/aiden-study/issues/122) 依 iPad 試玩回饋，讓孩子作答與家長試玩一次只顯示一個小題，以大按鈕選答案；上一／下一小題可返回修改。共用圖表與完整題幹持續顯示，直向表格局部捲動、橫向左右排版。填齊全部小題才能整組送出，送出後仍可逐題看回饋；整組仍只算一個 activity，題包與評分資料不變。

## 題包與覆蓋

正式 `pack.json` 為 107,492 bytes，SHA256 `380360FA823F5083B564652C5FB1CE1E0E305BB4922DDCDBFFAD25EA1DE6A922`，低於 128 KiB 上限。總數為數學 57、自然首批 20、自然第二批 12。第二批 S1 1 題、S2 11 題，題型為是非 5、四選一 3、整組選答 4；四組各有 4／3／6／8 個作答位置，但各只計一個 activity。自然正式題包合計 S1 11、S2 21；是非 22、四選一 6、整組選答 4。

第二批補入 S1b 1、S2a 2、S2b 3、S2c 6 個 activity；首批 S2c 為 0。這些是[公開選題](../data/study/g4-s1-science-exam1/second-batch-selection-metadata.json)的概念分組數，不表示教材或探究能力已全面覆蓋。正式第一次定期評量範圍尚未公布；地震報告讀值、待確認的陸域棲地細目、水生植物成組圖及後續月亮／光影仍未轉入本次正式題包。跨版與範圍判斷見[原卷分類概覽](../learning-tasks/grade4-sem1-science-exam1/source/coverage-overview.md)。

## 內容與相容性驗證

- 原卷轉寫、29 個答案位置、12 份解說、魚體 PNG、動物資料表與 `alt` 均經作者及獨立 reviewer 核對。唯一一則八小題解說經 focused review 精簡至既有 140 字上限；原 builder 邊界沒有放寬。`鬥魚` U+9B25 與原 PDF 文字層及放大字形一致，未改字元或字型。
- production builder 與 parser 接受 schemaVersion 1／revision 6；唯讀 verifier 對正式包確認 89 題、107,492 bytes 與上述 SHA256。重跑私人合併與 builder 得到相同 hash。
- 依 ID 逐值比較已發布 rev5 的 77 個完整 question、77 份 explanation、77 個公開 mapping row，均不變；新增 12 題與公開 selection 的來源、unit、題型、作答格數和媒體種類相符。public Study 題庫仍為 1,924 題，數學題型報告仍為 57 個 activity。
- 隔離 fake-family 以 `test-token` 和記憶體 KV 在 390×844、768×1024、1024×768 檢查 child 與家長試玩。真魚圖、表格、`alt`、放大與局部捲動可讀，試玩沒有改動進度哨兵。30 張含內容截圖只保存在 ignored private 歸檔；這是瀏覽器尺寸模擬，並非實體 iPad 測試。候選題文／圖表相對已審畫面快照逐值未變，精簡的解說另通過 focused review。
- 完整回歸：Node 614/614、Python 271 通過／1 略過；work catalog、home release 與數學題型報告的 `--check` 均通過。

## 私人歸檔與重建

canonical repo 的 ignored `data/private/study/g4-s1-math-u1/rev6-release/` 保存正式 `pack.json`、rev5 基線、核可 delta、完整原卷與來源記錄、合併輸入、獨立內容與 runtime review、實際 UI 截圖、重建腳本、發布前後原始讀回及逐檔 SHA256 manifest。rev5 歸檔未修改。公開 Git 只保留不含題文、答案或圖片的 selection／mapping、runtime、測試與本文件。

在具備本次核可 private 歸檔的工作樹，將 `rev5-baseline/`、`science-second-batch/` 及 `repro/merge-rev6.mjs`、`repro/verify-rev6.mjs` 放到精確 ignored `data/private/study/g4-s1-math-u1/`，並將歸檔的 merged mapping 複製到公開 mapping 位置後，可重跑：

```powershell
node data/private/study/g4-s1-math-u1/merge-rev6.mjs
uv run python scripts/build_private_study_pack.py
node data/private/study/g4-s1-math-u1/verify-rev6.mjs
node scripts/verify_private_study_pack.mjs 380360fa823f5083b564652c5fb1ce1e0e305bb4922ddcdbffad25ea1de6a922
```

## 正式發布與驗證界線

- [PR #120](https://github.com/huansbox/aiden-study/pull/120) 經獨立內容、runtime、DOM 與最終歸檔複驗，主線合併 commit 為 `06e182f5b69d8e560ca0b2c6d576c51029ba88d9`；主線 Node／Python、catalog 與 Pages checks 通過。公開 Pages 的 13 個相關資產以未登入請求逐 byte 與該 commit 比對一致。
- Worker deployment `fdfbee98-7a92-4686-9788-dc9a16cbbd41`／version `3aaf2099-0ccc-4e2b-9201-90d119b6c946` 承接 100% 流量，既有 KV 與 TOKEN 綁定未變。只對固定內容 key `c:study:g4-s1-math-u1` 執行一次從核准檔案的前向寫入；寫入前原始 rev5 為 77 題、53,239 bytes 與核准 hash，立即、83.6 秒後及根統籌另行獨立讀回均為 rev6、89 題、107,492 bytes，逐 byte 符合本頁 SHA256。未讀寫孩子進度 `p:` key，也未使用正式 family token 或 session。
- 發布證據在 canonical ignored `rev6-release/release-audit/` 的 `worker-release-20260923/`、`root-pages-release/`、`kv-release-20260923/` 與 `root-independent-readback/`；完整摘要見 `kv-release-20260923/release-summary.json`。真實題文、圖表、解說與 QA 仍不可進公開 assets、progress KV 或同步 payload。這些驗證不等於實體 iPad 驗收；正式第一次定期評量範圍也尚未公布。
