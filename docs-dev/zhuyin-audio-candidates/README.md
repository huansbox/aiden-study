# 注音 #20 音檔候選（尚未驗音）

這裡有對應 `docs/zhuyin/content.json` 的 **14 段可重建機器候選**，供家長集中試聽。**不是親錄成品，不代表發音正確，也不代表 #20 完成。** 正式 `docs/zhuyin/assets/audio/` 仍缺 14/14，這批檔案不會由 app 載入。

基準：`origin/master` 的 `a0f81e8`；製作日期 2026-09-16。依 [#15 拍板紀錄](https://github.com/huansbox/aiden-study/issues/15#issuecomment-4937229445) 的既定方向維持全親錄；TTS 單獨符號與爸爸／媽媽先前已被否決。此次候選只完成最新授權的試聽交付，沒有推翻原決策。[#20](https://github.com/huansbox/aiden-study/issues/20) 仍需親錄入庫與 iPad 驗收。

## 家長只需集中處理一次

1. 開啟本目錄的 [試聽頁](index.html)，按「全部試聽」；也可按「比較四聲」「聽分段示範」。全部連播約 17 秒，每段都有待確認重點與原始音供對照。
2. **沿用全親錄即可**：用 Safari 開啟 [既有 recorder](../../docs/zhuyin/recorder.html)，依序錄 14 段，每段試聽後下載，14 個原檔一起交回，不必改名。ㄅ 是短促開頭；ㄇ 是閉唇鼻音；都不加 ㄛ。這是完成既有決策的最短路徑。
3. 若家長明確決定採用部分機器候選，一次提供可接受的檔名，其餘親錄替換。接受候選只代表該發音獲確認，iPad checklist 仍要另外完成。

本頁不收集錄音、不儲存審核結果、不讀寫學習進度或家庭金鑰。正式站的 [錄音工具](https://huansbox.github.io/aiden-study/zhuyin/recorder.html) 也可直接使用；候選試聽頁尚未部署。

## 最需要確認的發音

| 檔案 | 實際做法 | 尚未解決的限制 |
| --- | --- | --- |
| `sym-b` | 從「八」原音取 0–28 ms，切除後面的韻母 | 編碼後可測有聲僅約 20 ms，可能只能聽到短促聲響、無法辨認；不能宣稱已取得合格本音，優先親錄 |
| `sym-m` | 從「媽」原音取 5–60 ms 鼻音段 | 約 55 ms；須聽是否太短、是否混入 ㄚ，優先親錄 |
| `sym-a` | 合成「啊」全音 | 確認一聲平穩，沒有語助詞語氣 |
| `syl-ba1`～`syl-ba4` | 載體依序為八、拔、把、爸 | 特別比較二、三聲；三聲短，可能不適合示範完整三聲 |
| `syl-ma1`～`syl-ma4` | 載體依序為媽、麻、馬、罵 | 同上；載體只供取得音節，不會變成教材詞卡 |
| `word-baba`、`word-mama` | 直接合成爸爸、媽媽 | 先前已被否決，這次並無人工認可；檢查第二字與家庭自然語氣 |
| `word-ma` | 與 `syl-ma3` 共用原始「馬」 | 兩檔內容相同是刻意的來源重用，確認孤立詞讀音即可 |

沒有把「玻」「摸」等漢字名稱當作符號音，也沒有拿整段「八」「媽」冒充 ㄅ／ㄇ。裁切點來自原音頻譜檢視，**頻譜與訊號檢查無法替代人耳辨音**。這批尚未經家長或語音專業者驗音；不再持續打磨已被否決的 TTS 路線。

## 來源與檔案

- `recipe.json`：11 個合成載體、14 個 key／目標音、ㄅㄇ裁切點、逐項待確認事項。
- `source/*.wav`：Mac `say` 的原始輸出轉成 PCM WAV（22050 Hz、mono、16-bit）；保留完整原音，避免重建依賴未來的 voice 版本。
- `source-generation.json`：macOS 26.6.2（25G83）、`say`／Meijia／zh_TW／rate 150、原文與 SHA-256。
- `audio/*.m4a`：AAC-LC、44100 Hz、mono、96 kb/s 設定、faststart；這是候選資產目錄。
- `build.json`：source／recipe／content／script hash、裁切秒數、增益與產物 hash。
- `audit.json`：實際解碼後的時長、峰值、RMS、有聲長度、頭尾靜音與削波數。所有人工驗證欄位保持 `false`。
- `../../scripts/zhuyin_audio.py`：使用 repo 的 `uv` 執行，僅標準函式庫加外部 `ffmpeg`／`ffprobe`；重新合成另需 macOS `say`。

可用工具盤點：Mac `say` 有 Meijia zh_TW；`ffmpeg`／`ffprobe` 8.1.2 可轉檔、解碼、量測；Safari 加既有 recorder 可親錄 M4A；系統也有 QuickTime Player 與 Voice Memos。沒有啟用麥克風、沒有讀取任何既有錄音，也沒有新增雲端音源或修改系統語音設定。

處理方式：保持原始音高，不伸縮、不改調；裁切後以峰值 -6 dBFS 正規化，短符號末端淡出 2 ms、其餘 6 ms；加 80 ms 頭部及 150 ms 尾部間隔後編碼。AAC 解碼後可能多出少量 padding。`say -r 110` 與 `150` 的單字「八」實測長度都為 0.268209 秒，不能把 rate 參數當成慢速教學保證。

## 重建與檢查

在 repo 根目錄執行：

```sh
# 用已保存的原音重建，不重新合成
uv run python scripts/zhuyin_audio.py build
uv run python scripts/zhuyin_audio.py audit
node --test tests/test_zhuyin_audio_candidates.mjs tests/test_zhuyin_content.mjs tests/test_zhuyin_core.mjs tests/test_zhuyin_child_store.mjs

# 開啟集中試聽：瀏覽 http://127.0.0.1:8766/docs-dev/zhuyin-audio-candidates/
uv run python -m http.server 8766 --bind 127.0.0.1

# 檢查正式目錄：目前會 exit 1，列出缺 14 段
uv run python scripts/zhuyin_audio.py audit --audio-dir docs/zhuyin/assets/audio
```

只有刻意要換一批 Mac 合成原音才執行 `uv run python scripts/zhuyin_audio.py synthesize`，它會覆寫本候選區的 `source/` 與生成紀錄。重合成後須重查裁切點、再跑 build／audit；macOS voice 更新可能改變讀音，不能保證跨系統生成位元相同。本次以保存的 PCM 重建，14 個輸出 hash 全部一致。

這個候選檢查器採取 **mono／44100 Hz** 的嚴格格式，主要驗證本批產物；Safari 親錄可能是其他取樣率或聲道數，應保留原檔並依需要轉成統一格式，再驗音與驗格式。不能把格式不符誤認成發音錯誤。

## 已完成的驗證與範圍

- 候選 14/14，缺檔 0、孤兒 0，全部可解碼且為 AAC-LC；總大小80,537 bytes（約 78.6 KiB）。
- 時長 0.279–0.766 秒；峰值 -8.41～-5.99 dBFS；整檔 RMS -32.72～-18.19 dBFS；削波 0。有聲判準為每 5 ms 視窗 RMS 大於 -45 dBFS，ㄅ 最短約 20 ms，不能由此推論足以教學。
- 反例檢查：缺檔、孤兒、靜音 AAC、WAV 偽裝 `.m4a` 同時被抓出，退出碼 1；正式目錄缺 14/14 也退出 1。原本內容測試的缺檔只警告，並未改成假通過。
- Node 全量 **324 passed**；Python **183 passed、1 skipped**。候選新增 2 項測試驗來源／產物／審計一致與真實 content 的題池、四聲、分段、詞卡音檔映射。
- 桌面 Chromium：試聽頁 14 段都收到真實 `ended`、停止能取消連播、390 px 寬無水平溢出、無 JavaScript 錯誤。
- 本機注音 app：以 `?child=bingpu&parent=1` 維護入口，在**全新拋棄式 browser context** 中把音檔請求導向候選，外部網路全部阻擋。14 段音效自檢實播結束；聽音辨認答錯→答對；組字聲符→韻符→四聲、答錯→答對、爸爸詞卡聲音可播。測試進度只存在該臨時 context，結束即丟棄。
- **未完成**：家長發音認可、親錄 14 段入庫、正式站 live 驗收、iPad 真機 checklist。既有正式檔案、同步設定與家庭進度都未修改。

整合時可先合併這個隔離候選包，但不要直接複製 `audio/` 到正式目錄，不要勾掉 #20 或 iPad 驗收項目。正式採用須有家長親錄或明確接受候選的決定。
