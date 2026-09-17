# Native Camp 較慢語音試聽與製作紀錄

日期：2026-09-17。家長回饋：首堂已實際使用、效果不錯，但 TTS 偏快，`Say the number, too.` 的停頓不自然。

**這次兩堂新課先採 Microsoft Zira 的 rate -2；OpenAI 已完成少量試聽，尚未取代正式課程音色。Mac 未取得可用連線，未生成，也不對音色自然度下結論。** 沒有改寫 9/15 的既有音檔、題目或孩子進度。

## 比較入口與控制方式

開啟[語音比較頁](../assets/tts-comparison/index.html)，可聽到四組、每組三句；另保留有逗號的控制樣本。全部是電腦生成的原創練習句，沒有老師聲音複製、兒童錄音或私人課程錄音。

| 同一句文案 | Windows 原速度 -1 | Windows 較慢 -2 | OpenAI Marin | OpenAI Cedar |
| --- | ---: | ---: | ---: | ---: |
| Is seven odd or even? Say the number too. | 4.415 秒 | 4.911 秒 | 5.016 秒 | 3.648 秒 |
| There are four trees. | 2.142 秒 | 2.377 秒 | 2.352 秒 | 2.400 秒 |
| There are too many books. | 2.351 秒 | 2.612 秒 | 2.400 秒 | 1.920 秒 |

時長包含停頓及檔尾靜音，**不能當成純發音速度或自然度評分**。Windows 兩組只改 rate；OpenAI 兩組使用相同文案、instructions、speed 1.0，只改 voice。不同引擎的 rate／speed 不代表同樣實際語速。

## 目前有證據支持的調整

- Windows rate -2 的同句時長增加約 11%，換算整句平均速度降低約 10%。這是供孩子再試的起點，尚未收到慢版的家庭回饋。
- 原句 `Say the number, too.` 在 `too` 前多出約 **0.475 秒**靜音。相同 Zira rate -1、移除逗號後，該處沒有超過 150 毫秒的靜音段。分析條件為 `silencedetect=noise=-35dB:d=0.15`；這支持逗號造成停頓，但不是人耳自然度評分。
- `too` 與 `two` 同音，本機 ASR 在所有引擎都可能寫成 `two` 或 `2`；不能把這當成漏字、孩子不會，或引擎唸錯。新課若要求完整回答，直接使用 `Say a full sentence.` 比含糊的尾句更清楚。
- OpenAI 的 instructions 要求約 135 words per minute，但三句長度仍不固定。Marin 首句有約 **1.78 秒檔尾靜音**；Cedar 的兩句比慢版 Windows 短很多。改用 OpenAI 前仍需試聽、檢查首尾與逐句節奏，不能只填「慢速」就宣稱已達標。

## OpenAI 測試與費用界線

使用已登入的 [Audio Playground](https://platform.openai.com/audio/tts) 正常操作，模型 `gpt-4o-mini-tts`，Marin／Cedar 各三句，MP3，speed 1.0。共 **6 次生成、0 次重試**，6 個 MP3 共 **17.736 秒、283,776 bytes**。沒有建立 API key、改帳務或儲值；本機腳本沒有發送 API 請求。**Playground 生成可能扣 API 餘額，這次沒有取得帳務明細，實際扣款金額未確認；不能記為零費用。**

Windows 的 Process／User／Machine 環境中均未設定 `OPENAI_API_KEY`，所以改用正常網頁功能；沒有掃描其他專案的 secrets。完整製作設定與六次生成清單見 [Playground 紀錄](tts-openai-playground-log.json)。

官方文件允許以 instructions 控制語速、語調等，並推薦 Marin／Cedar；這不等於本堂已完成聽辨驗收。[OpenAI TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech) 模型支援文字轉語音與目前 snapshot 的說明見[模型頁](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)。查閱時價格為文字輸入 US$0.60／百萬 tokens、audio 輸出 US$12／百萬 tokens；本次未取得 token usage，不能據短音檔長度當成確切帳單。[官方價格](https://developers.openai.com/api/docs/pricing)

## 驗證與限制

- [Windows manifest](tts-windows-manifest.json)：7 個樣本，含原速、慢速與逗號控制。
- [OpenAI manifest](tts-openai-manifest.json)：6 個樣本，保存 bytes、SHA256、duration、codec、RMS 與靜音範圍。
- 全部 13 檔都完整解碼且非靜音；最後一個詞後有可測得的尾部靜音，沒有解碼錯誤。這是檔案／訊號證據，不保證每個音素都經人耳核對。
- [Windows ASR](tts-windows-asr.json)與 [OpenAI ASR](tts-openai-asr.json)都使用本機 `faster-whisper 1.2.1 / small.en`，沒有提供預期文字 prompt，也沒有上傳音訊。trees／books 兩句逐字一致；odd/even 的 seven／too 出現數字及同音字正規化，句尾沒有漏掉。
- 未執行人工聽辨、iPad 真機播放、兒童慢版測試或發音評分。試聽頁可協助家長選音色，不能當成孩子理解已改善的證據。
- MBP 已獲使用授權，但此 Windows 沒有 Mac 的 SSH 設定，`.local` 名稱未解析，當時可用專案清單亦無 Mac 遠端專案。沒有反覆猜 IP、修改 Mac 設定或干擾其他 checkout；本輪 Mac 比較未完成。

## 新兩堂正式音訊與重製

正式輸入是各堂 `source/speech-jobs.json`；輸出為 `docs/nativecamp/audio/<lesson-id>-…mp3`，一題各一個問題與答案。9/16 共 36 檔，9/14 共 24 檔，皆採 Zira rate -2；每檔另有該堂 `source/nativecamp-audio-manifest.json` 記錄逐字稿、hash、bytes、長度、codec、RMS 與完整解碼結果。題文更改後重新執行，只重製內容、音色設定或檔案 hash 不一致的音檔；manifest 仍核對全部檔案。

正式 60 檔已完成解碼與訊號檢查；另依每概念抽一個問題及一個口說答案，共 [9/16 六檔](nativecamp-tts-asr.json)與 [9/14 四檔](../../nativecamp-2026-09-14/source/nativecamp-tts-asr.json)，本機 ASR 的字詞與製作文案一致，只有標點差異。9/16 原樣重跑顯示重製 0 檔、驗證 36 檔，沒有不必要地改寫已生成音訊。

```powershell
# 正式新課；此工具只接受這兩堂，不接受 9/15。
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-build-lesson.py 2026-09-16
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-build-lesson.py 2026-09-14

# 重建 Windows 比較樣本；不接觸正式 App。
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-compare.py --engine windows

# 只查核已下載的 OpenAI 樣本，不再發出付費請求。
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-compare.py --engine import-playground

# 本機轉錄比較樣本。
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-check.py --engine windows
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-check.py --engine openai

# 每概念抽一個問題及一個口說答案；不能取代人耳驗收。
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-check.py --lesson 2026-09-16
uv run --script learning-tasks/nativecamp-2026-09-16/source/tts-check.py --lesson 2026-09-14
```

腳本有 Mac 本機模式，但此輪未執行。未來在已授權 Mac 的獨立目錄使用前，先確認既有 repo branch／status，列出 `say -v '?'` 中已安裝的音色，明確指定 voice，再用 `--engine mac --voice <已安裝音色> --rate 135`；需要 `uv`、`ffmpeg` 及 `ffprobe`。不因模型名稱或電腦品牌就假定聲音一定較自然。
