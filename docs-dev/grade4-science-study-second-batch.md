# 四上自然第二批 Study 候選整合

本批承接 [#119](https://github.com/huansbox/aiden-study/issues/119)，在已發布 revision 5 的 77 題之後，新增自然 12 個完整 activity、29 個原卷作答位置。**本地候選為 revision 6、89 題；正式家庭服務仍是 revision 5、77 題。** 沒有執行 push、PR、Pages／Worker 部署或正式 KV 寫入，實體 iPad 亦尚未驗證。

## 候選與覆蓋

候選 `pack.json` 為 107,492 bytes，SHA256 `380360FA823F5083B564652C5FB1CE1E0E305BB4922DDCDBFFAD25EA1DE6A922`，低於 128 KiB 上限。總數為數學 57、自然首批 20、自然第二批 12。第二批 S1 1 題、S2 11 題，題型為是非 5、四選一 3、整組選答 4；四組各有 4／3／6／8 個作答位置，但各只計一個 activity。自然候選合計 S1 11、S2 21；是非 22、四選一 6、整組選答 4。

第二批補入 S1b 1、S2a 2、S2b 3、S2c 6 個 activity；首批 S2c 為 0。這些是[公開選題](../data/study/g4-s1-science-exam1/second-batch-selection-metadata.json)的概念分組數，不表示教材或探究能力已全面覆蓋。正式第一次定期評量範圍尚未公布；地震報告讀值、待確認的陸域棲地細目、水生植物成組圖及後續月亮／光影仍未轉入這個候選包。跨版與範圍判斷見[原卷分類概覽](../learning-tasks/grade4-sem1-science-exam1/source/coverage-overview.md)。

## 內容與相容性驗證

- 原卷轉寫、29 個答案位置、12 份解說、魚體 PNG、動物資料表與 `alt` 均經作者及獨立 reviewer 核對。唯一一則八小題解說經 focused review 精簡至既有 140 字上限；原 builder 邊界沒有放寬。`鬥魚` U+9B25 與原 PDF 文字層及放大字形一致，未改字元或字型。
- production builder 與 parser 接受 schemaVersion 1／revision 6；唯讀 verifier 對候選包確認 89 題、107,492 bytes 與上述 SHA256。重跑私人合併與 builder 得到相同 hash。
- 依 ID 逐值比較已發布 rev5 的 77 個完整 question、77 份 explanation、77 個公開 mapping row，均不變；新增 12 題與公開 selection 的來源、unit、題型、作答格數和媒體種類相符。public Study 題庫仍為 1,924 題，數學題型報告仍為 57 個 activity。
- 隔離 fake-family 以 `test-token` 和記憶體 KV 在 390×844、768×1024、1024×768 檢查 child 與家長試玩。真魚圖、表格、`alt`、放大與局部捲動可讀，試玩沒有改動進度哨兵。30 張含內容截圖只保存在 ignored private 歸檔；這是瀏覽器尺寸模擬，並非實體 iPad 測試。候選題文／圖表相對已審畫面快照逐值未變，精簡的解說另通過 focused review。
- 完整回歸：Node 614/614、Python 271 通過／1 略過；work catalog、home release 與數學題型報告的 `--check` 均通過。

## 私人歸檔與重建

canonical repo 的 ignored `data/private/study/g4-s1-math-u1/rev6-release/` 保存候選 `pack.json`、rev5 基線、核可 delta、完整原卷與來源記錄、合併輸入、獨立內容與 runtime review、實際 UI 截圖、重建腳本及逐檔 SHA256 manifest。rev5 歸檔未修改。公開 Git 只保留不含題文、答案或圖片的 selection／mapping、runtime、測試與本文件。

在具備本次核可 private 歸檔的工作樹，將 `rev5-baseline/`、`science-second-batch/` 及 `repro/merge-rev6.mjs`、`repro/verify-rev6.mjs` 放到精確 ignored `data/private/study/g4-s1-math-u1/`，並將歸檔的 merged mapping 複製到公開 mapping 位置後，可重跑：

```powershell
node data/private/study/g4-s1-math-u1/merge-rev6.mjs
uv run python scripts/build_private_study_pack.py
node data/private/study/g4-s1-math-u1/verify-rev6.mjs
node scripts/verify_private_study_pack.mjs 380360fa823f5083b564652c5fb1ce1e0e305bb4922ddcdbffad25ea1de6a922
```

候選包、核可轉寫與截圖不可放入公開 assets、progress KV 或同步 payload。正式發布須另核准現役 Worker／Pages 相容性與 KV 寫入順序，並按[私人題包發布流程](grade4-u1-private-pack-build.md)讀回核對；本次建置與歸檔不提供該授權。
