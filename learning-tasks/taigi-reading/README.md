# 〈阮小妹〉台語朗讀

桃子腳校內朗讀的家庭練習。〈阮小妹〉全篇五段都可選，讓四年級孩子先看懂句意、逐句聽讀，再回到紙本自己讀。進度與家長試用見 [#274](https://github.com/huansbox/aiden-study/issues/274)。

## 練習與新版影片

從 kid 首頁選「阮小妹」進入家庭練習，或在 Dropbox 的 `mywork/aiden-study/taigi-reading/final/index.html` 開啟單檔離線版。畫面預設第一段第一句。按「聽這一句」時，學校原音、剪紙動畫與字幕同步，字隨讀音由白轉藍。可換到任一句、播放整段，或由篇名開始聽全篇。在「看懂這一句」讀白話說明，展開「錄一句，比較看看」後，可在裝置上錄音並交替聆聽。

同資料夾的 `阮小妹-全篇逐字字幕.mp4` 使用與練習頁相同的動畫和時間表，從篇名與作者讀到全篇末句。全篇共五段、59 句、623 個正文字幕單位，篇名及作者另有 6 個。漢字按字、臺羅按音節，標點跟隨相鄰字。起點由學校錄音的語音模型與波形估計。

## 重建逐字版

在本任務目錄執行下列指令。`taigi_private_root` 指向 Dropbox 的 `mywork/aiden-study/taigi-reading`。Python 依賴由 uv 載入，另需 FFmpeg、fontconfig、HarfBuzz、PingFang TC（或 Noto Sans CJK TC）、芫荽字型、Chrome 與 Playwright。

```sh
taigi_private_root='<私人任務資料夾的絕對路徑>'
uv run --script build_words.py "$taigi_private_root" --fonts "$taigi_private_root/../taigi-bitter-melon/fonts"
TAIGI_PLAYWRIGHT_MODULE='/abs/path/playwright/index.mjs' \
  node render_video.mjs "$taigi_private_root" "$taigi_private_root/final/阮小妹-全篇逐字字幕.mp4" --word-captions
uv run --script verify_words.py "$taigi_private_root"
```

網頁產物為 `final/index.html`（內嵌素材）與 `final/site/`（家庭保護站的 `index.html`、`assets/reading.mp3`、61 張字幕圖）。練習頁套用[共用台語播放器](../shared/taigi/)。`source/` 中的剪紙場景沿用原分鏡與 CSS 動畫，網頁與影片都由學校音檔的播放時間控制動畫進度。

私人 `source/word-timeline.json` 保存定稿逐字時標。需要重新對音時，準備 `source/syllables.txt`（篇名、作者與各句的逐音節字母轉寫，共 61 行）、`source/word-notes.json`（段名與補充句意），並沿用下列舊版各段切句檔。讀入 16 kHz 原音，以 CTC 對齊每個音節，再找鄰近的波形起音。模型與字表採用同一版本的 [MMS forced aligner](https://huggingface.co/onnx-community/mms-300m-1130-forced-aligner-ONNX/tree/2100fb247d8e43962eef24491597fbeb8b469531)。

```sh
uv run --script align_words.py "$taigi_private_root" /path/to/onnx/model_quantized.onnx /path/to/vocab.json
```

## 舊版段落練習

開啟私用 `mywork/aiden-study/taigi-reading/mock/index.html`，先選段落。五段分別有 7、14、18、11 和 9 個片段，共 59 句。每句先按「看這句動畫」，再單獨聽一次原音，接著按「跟著念」，讓學校示範先念一兩個音再開口。按「下一句」時，畫面、原文和音訊一起切換。各句都可往回重播，難詞提示可按需展開。

想比較時，打開「錄一句來比較」，自己念一遍，依序按「聽學校」與「聽我念」。第一次錄音需要允許麥克風。錄音留在當前頁面的記憶體，換句、換段或離開頁面便清除。逐句念順後播放目前選的整段，最後看著紙本自己讀一遍。

第一、二段畫面採用 Claude Opus 製作的暖色剪紙風格。第三至五段由 Claude Opus／medium 擬定分鏡，Codex 核對定稿，GPT 製作畫面並合成全篇影片。逐句動畫、跟讀與整段播放都使用學校原音。

## 舊版全篇朗讀影片

私用影片的交付位置是 `mywork/aiden-study/taigi-reading/video/阮小妹-全篇朗讀.mp4`。影片用連續的學校原音，從報出篇名、作者到末句，保留原本的朗讀停頓。粗黑體字幕以金色逐組標示朗讀進度。語組亮起的時間為近似對齊。

## 重建舊版

在本任務目錄執行 `python3 build_mock.py <私人任務資料夾>`。需要 Python 3 和 FFmpeg，輸出為可離線開啟的 `mock/index.html`。私人任務資料夾的來源如下。

- `source/01_阮小妹.mp3` 取自學校講稿 QR code。
- `source/segments.json` 為第一段，`source/paragraph-2.json` 至 `source/paragraph-5.json` 為第二至五段。每個片段包含學校原音起訖、紙本原句、畫面對應及影片用的語組時間。只有第一段資料時，也可重建單段練習版。
- `source/video-intro.json` 記錄影片篇名與作者的報讀時間。
- `source/paragraph-2-storyboard.md` 和 `source/paragraph-3-5-storyboard.md` 保存審定分鏡。

重建全篇影片時，先用完整的五段資料重建練習頁。影片額外需要 Node.js、Playwright、Chrome、FFmpeg 的 `ffprobe`，以及 PingFang TC 黑體和能顯示台語罕字的備援字型。渲染器的備援順序為 Noto Sans TC、Sarasa Term TC Nerd Font。若 Playwright 已可由 Node.js 載入，可省略 `TAIGI_PLAYWRIGHT_MODULE`。

```sh
taigi_private_root='<私人任務資料夾的絕對路徑>'
python3 build_mock.py "$taigi_private_root"
TAIGI_PLAYWRIGHT_MODULE='/abs/path/playwright/index.mjs' \
  node render_video.mjs "$taigi_private_root" "$taigi_private_root/video/阮小妹-全篇朗讀.mp4" \
  --start 4.22 --end 284.76
```
