# Native Camp Review 音訊與題組驗證

日期：2026-09-17。適用題組：`docs/nativecamp/lessons/2026-09-15.json`。

## 題組與語音來源

首堂有 is/are、odd/even、too many 三個概念，各含三題 Try it 與三題 Say it，共18題。Try it 含兩題點字排列；其餘以固定選項作答。所有情境由本次原創，並依既有 [evidence-review.md](evidence-review.md) 的概念判讀設計，沒有複製教材頁。

- is/are 的圖上數量與單複數一致；一隻動物接受 `a` 與 `one`。
- odd/even 以圖上數量或數字決定答案，包含奇數與偶數，不沿用單一數字。
- too many 每題均標示箱子或架子的可容納數量，圖上物品多於容量；判斷不依賴「看起來很多」。兩個開放口說提示明列 `Use too many in a sentence.`，讓家長依明確任務評級。
- 選詞問題的 Listen 不念填入答案後的完整句；排列題只念情境與操作，不念排列結果。

一般英文使用本機 Windows SAPI 的 `Microsoft Zira Desktop - English (United States)`，rate 為 -1；35個 TTS MP3 全部預製，沒有 runtime TTS、外部語音服務或聲音複製。公開音訊資料夾只含這35個生成檔。

## 老師原音

`too-many-say-3` 的問題使用一段老師完整提問。題圖為 Tanya 的架子只能容納3頂帽子、實際有8頂；示範回答另用一般 TTS，不拼接老師字詞。

- 來源：已驗證的本機 `2026-09-15-1930-lesson.webm`，SHA256 `208a1e0dea16430d1acd609409cc64f3edd4d52a81981192a7baaec989189434`。
- 聲道：channel 0（左），依原先分聲道抽樣推定為老師端，非聲紋辨識。
- 實際裁切：1300.23–1304.10秒，即21:40.23–21:44.10；連續片段，未逐字拼接。
- 先重查1298.8–1305.0秒，再重查實際裁切範圍。`faster-whisper 1.2.1 / small.en` 的本機結果支持完整問題，未包含前面的過場詞或後續答題提示。沒有提供預期文字作模型 prompt。
- 裁切 MP3 長3.918367秒，含編碼補齊；43,061 bytes；SHA256 `ae47f7a4e99ae39f25c6df3a32d977cdf48336bff5bc3b3d517f102cb9625c18`。完整解碼通過，RMS 為 -18.25 dBFS。

詳細轉錄、老師 MP3 與音訊包只在已忽略的 `source/private/`。public lesson 只有 private id，不含錄音、base64 或私人存取網址。Git ignore 檢查確認老師 MP3 及 `nativecamp-audio-kv.json` 均不會追蹤。

## 已執行驗證與界線

1. 35個 TTS MP3 加1個老師 MP3 全部以 ffprobe 檢查格式與長度，ffmpeg 完整解碼，並檢查 RMS，沒有空檔或靜音假檔。每檔 SHA256、bytes、duration 與生成文字見 [nativecamp-audio-manifest.json](nativecamp-audio-manifest.json)。
2. 六個 TTS 片段經本機 ASR 抽查，涵蓋填空問題、排列操作、奇偶答案、too many 操作與答案。結果與生成文字一致（ASR 將 Seven 寫成數字7）；詳細結果在 ignored `private/nativecamp-tts-asr.json`。
3. `tests/test_nativecamp_content.mjs` 四項 audit 通過：題目結構與閉合答案、數量／奇偶／容量、全音訊引用與填空／排列無答案洩漏、private loader 的合法／非法資料與先驗證後寫入行為。
4. 本機 loader 已讀取實際 private pack，驗證1段 MP3；沒有遠端寫入。

以上是檔案、訊號與模型轉錄驗證。**未執行人工聽辨、iPad 真機播放或發音評分**；ASR 無法證明每個音素、精確邊界或音色自然度皆適合孩子。完整 app 的播放／揭曉／同步流程由整合驗收另記；本文件不宣稱已正式發布。

## 再製與本機載入

在 repo 根目錄執行；需要 Windows 本機音色、`uv`、`ffmpeg`、`ffprobe`。老師片段另需原始私人音檔。

```powershell
uv run --script learning-tasks/nativecamp-review-pilot/source/build_nativecamp.py --teacher
node --test tests/test_nativecamp_content.mjs

# 只驗證既有 TTS 並重建老師片段，可加 --skip-tts。
# 不加 --teacher 可重建公開題目與 TTS；manifest 會明示老師片段未重建。

# 兩種本機 ASR 檢查都只使用已快取的 small.en 模型，不上傳音訊。
uv run --script learning-tasks/nativecamp-review-pilot/source/check_nativecamp_clip.py --start 1300.23 --end 1304.10 --label teacher-hats-final
uv run --script learning-tasks/nativecamp-review-pilot/source/check_nativecamp_tts.py

node learning-tasks/nativecamp-review-pilot/source/load_nativecamp_audio.mjs learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json
$env:NATIVE_CAMP_AUDIO_PACK = (Resolve-Path 'learning-tasks/nativecamp-review-pilot/source/private/nativecamp-audio-kv.json').Path
node tests/helpers/serve-family.mjs 8789
```

private pack 格式是 `{clipId: {contentType: "audio/mpeg", base64: "..."}}`；本機 helper 將 key 轉為 `c:nativecamp:audio:<clipId>`。`load_nativecamp_audio.mjs` 另提供 `loadPrivateAudioPack(kv, packPath)`，可匯入測試用 KV；沒有部署功能。產生與驗證 private pack 不代表正式 Worker 已有該素材。
