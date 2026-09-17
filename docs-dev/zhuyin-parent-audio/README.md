# 家長親錄音檔（2026-09-17）

使用者完成 14 段錄音，並在比較 AirPods／MacBook Pro 後選擇 MBP。此包全部採用 Safari 回報的「MacBook Pro的麥克風」，不混用 TTS 或 AirPods。先前三段 MBP 原音與後續十一段都保留；正式資產路徑為 `docs/zhuyin/assets/audio/`。本分支尚未合併或部署。

**使用者已試聽接受（2026-09-17）**：在集中試聽整理後的 14 段音檔後回覆「sounds ok」。採用這批親錄聲音供統籌整合，不需再要求整批驗音；確認紀錄與對應 commit 見 `acceptance.json`。這項接受不代表做過 iPad 真機驗證或已部署。

## 使用與來源

- [集中試聽頁](index.html)：播放整理後的 14 段。從 repo 根以 `uv run python -m http.server 8766 --bind 127.0.0.1` 開站，再開 `http://127.0.0.1:8766/docs-dev/zhuyin-parent-audio/`。
- `source/*.m4a`：瀏覽器送出的原始檔，不經試錄 server 的二次轉碼；與 Mac Downloads 中的原檔 SHA-256 相同。AirPods 三段與所有本機 take 仍留在 `~/Downloads/aiden-zhuyin-recording-trial/`，此包不複製未採用的 AirPods 原音。
- `recipe.json`：每段目標音、take ID、時間、實際麥克風名稱、原音 hash 與裁切起訖秒數。
- `build.json`：原音及產物的音訊量測、增益與產物 hash。`audit.json`：實際正式資產的格式、缺檔、孤兒、靜音與削波檢查結果。

只裁切說話前後的等待，保留發音前約 60～80 ms 與後方餘裕；不切斷中間音節、不改音高、聲調或語速。末端 5 ms 淡出，峰值調到 -6 dBFS 後輸出 AAC-LC、44100 Hz、mono、128 kb/s 設定、faststart。峰值一致不代表所有音的主觀響度完全一樣。

原始 `syl-ba1` 解碼後有 2 個接近滿刻度（絕對振幅 ≥ 0.999）的取樣；這不足以證明可聽見的破音，也不能據此宣稱沒有失真。集中試聽頁已標記。處理後全部檔案都留有峰值餘裕，但調低音量不能修復原始削波。

## 重建

```sh
uv run python scripts/build_zhuyin_parent_audio.py
uv run python scripts/zhuyin_audio.py audit --audio-dir docs/zhuyin/assets/audio
node --test tests/test_zhuyin_parent_audio.mjs tests/test_zhuyin_content.mjs tests/test_zhuyin_core.mjs
```

重建直接使用本包保存的原音與指定裁切點，無需再次錄音。原音 hash 或內容 key 不符會拒絕重建；先在暫存處完成全批轉碼，再寫入正式資產路徑。連續重建後 14 個成品 hash 完全相同。

## 驗證與狀態

- 親錄 14/14，正式資產缺檔 0、孤兒 0，全部 AAC-LC 可解碼；總計 142,594 bytes。
- 整理後時長 0.3715～0.7663 秒；峰值 -6.18～-6.00 dBFS；削波取樣 0，沒有全靜音或過長頭尾等待。原音量測也完整保存在 build.json，未以處理後數值掩蓋原音狀態。
- Node 全量 325 passed；pytest 183 passed、1 skipped。
- Chromium 集中試聽頁：14 段各播至 `ended`，390 px 無水平溢出、無 JavaScript 錯誤。
- 本機注音 app：直接讀正式資產，未替換音檔路由。新建拋棄式 browser context、阻擋全部外部網路；自檢實播 14 段、聽音辨認錯→對、組字聲韻／四聲錯→對、爸爸詞卡音訊可播。沒有讀寫真實家庭進度或金鑰。
- 使用者已完成錄製、選擇 MBP 音質，並試聽接受整理後的全部 14 段。build/audit 的 `pronunciationReviewed: false` 記錄自動處理不做發音判定，使用者後續試聽接受另記在 `acceptance.json`；不宣稱專業音韻評鑑。也未做 iPad 真機驗證、未部署；依使用者既定決定，不要求逐項 iPad checklist。

先前 [TTS 候選包](../zhuyin-audio-candidates/) 保持獨立，僅作歷史與來源對照；本批出貨資產不使用任何 TTS 片段。#20 是否收尾及正式發布交由統籌處理，本任務不修改 remote issue、parent/shared family 文件或 HANDOFF。
