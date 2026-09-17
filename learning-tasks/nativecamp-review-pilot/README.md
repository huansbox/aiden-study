# Native Camp 回放複習試作

狀態：**已完成（單堂複習試作；時間與難度待孩子實測）**。任務日期：2026-09-16。

以 2026-09-15 的一堂 Native Camp 課程為樣本，已完成音檔下載、本機分聲道轉錄抽樣、教材與逐字稿核對，以及可列印的口說複習。後續互動版放在 `docs/nativecamp/`，本任務仍保存來源核對、原始素材與重建流程；互動版狀態與驗證見 [Native Camp Review](../../docs-dev/nativecamp-review.md)。

## 先開啟這兩份成品

- [孩子版 PDF](output/pdf/review-child.pdf)：一頁，約 5-10 分鐘，用口說回答；數量、主題預測、too many 三個重點。
- [家長提示版 PDF](output/pdf/review-parent.pdf)：一頁，包含答案範例、提示順序、換情境練習與記錄欄。

家長先讀自己的版本，再讓孩子看孩子版。先等孩子回答，必要時才給提示；示範後的立即跟讀不算獨立回答。這份練習不評分發音。實際時間與難度待孩子使用後調整。

## 資料存放

- `assets/audio/`：本機回放音檔；由本 task 的 `.gitignore` 排除。
- `source/private/`：本次網站節錄、原始轉錄與詳細分析，排除於 Git。
- 方案與去除私人存取資訊的驗證結果放在 `source/`。

音檔連結具有時效；不將完整連結、簽章、登入資料寫入版控。重新取得時，從使用者已登入、已授權的課程頁重新讀取播放器來源。

## 已驗證結果與入口

已取得 2026-09-15 19:30 課程回放，大小 **11,152,631 bytes**，長度 **25:04.625**，與網站顯示的 25:04 相符。格式為 WebM，含一條 Opus 音軌、48 kHz、雙聲道；整份音訊解碼通過，未回報錯誤。

用本機 `faster-whisper / small.en` 抽查五段、共 385 秒，分聲道後找回混合轉錄漏掉的孩子回答。抽樣支持本檔左聲道主要為老師端、右聲道主要為學員端，但不保證整堂零缺錄。另發現網站曾把老師提示與孩子回答合併，已據此修正教學判讀。音檔未上傳外部服務，未進行發音評分。

- [本機回放音檔](assets/audio/2026-09-15-1930-lesson.webm)：只在已下載的電腦上存在，Git clone 不含此檔。
- [方案與下載重現步驟](source/plan.md)：本次結果、後續階段與驗收條件。
- [下載驗證資料](source/download-verification.json)：格式、長度、大小、SHA256 與驗證界線。
- [音訊與內容核對](source/evidence-review.md)／[抽樣驗證摘要](source/audio-validation.json)：分聲道結果、逐字稿誤標、教材頁碼與判讀限制。
- [題目內容](source/review-content.json)：題目、提示、可接受答案、來源時間與教材對照。
- [互動版題組與音訊驗證](source/nativecamp-audio-qa.md)：18題原創變體、35個預製 TTS、1段私用老師提問，以及再製方法。

本次實測可透過 Chrome 的原生媒體選單「下載」取得音檔。瀏覽器工具的 `downloadMedia()` 在這次環境中只開啟了媒體頁，必須以實際檔案落地與解碼結果判斷成功。

## 再製

在 repo 根目錄執行；Python 由 `uv` 管理，各 script 的依賴列在檔頭，不改動 repo 根目錄的套件清單。

```powershell
# 初次執行會下載語音模型；需已有原始音檔與 ffmpeg。
uv run --script learning-tasks/nativecamp-review-pilot/source/check_audio.py --separate-channels
# 已有模型時，可加 --offline 限用模型快取。

# 重建兩份 PDF；需 Windows Microsoft JhengHei 字型。
uv run --script learning-tasks/nativecamp-review-pilot/source/build_review.py
```

`check_audio.py` 只輸出忽略目錄中的片段與原始轉錄；更新樣本或模型後，需重新核對並更新 `audio-validation.json` 與核對紀錄，不能沿用舊的判讀。PDF 重建後以 Poppler 渲染並檢視 `output/preview/` 的兩張代表性預覽。
