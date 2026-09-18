# Native Camp：已由兩堂重用的內容工具

2026-09-14 與 2026-09-16 Edon 課程實際共用下列工具。課程設計標準仍在[首堂 SOP](../../nativecamp-review-pilot/lesson-sop.md)，每堂題文與證據留在各自的task，不集中成一份巨大題庫。

## 文字與題包

依實際練習產生週題計畫、新週包 schema 與出題契約見[每週規劃 SOP](weekly-planning.md)。工具使用已驗證的私有快照，不呼叫 API；既有週一至週日題包繼續相容。

`build_lesson.py` 只讀取指定新課的 `source/lesson-source.json`，產生同日期公開題包與 `source/speech-jobs.json`。它不產生或覆寫音檔，也不動9/15首堂。改過spokenQuestion／answerText後，必須另外重製受影響音檔；builder通過不代表音文已一致。

```powershell
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-14
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-16
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-16 --check
```

`--check` 只比對產物，不寫檔。一般語音改由下方共用 OpenAI 工具製作；舊 `tts-build-lesson.py`／`speak_nativecamp.ps1` 是 Windows SAPI 歷史工具，不用來重建目前正式音檔。

## OpenAI 語音製作

`build_openai_audio.py` 讀取已審核的原創 `speech-jobs.json`：`[{"file":"<題目>-q.mp3","text":"完整問題"},{"file":"<題目>-a.mp3","text":"完整答案"}]`。檔名是 MP3 basename，不能含路徑、不能重複；每段最多 4096 字元。課程與週包皆可使用，`--lesson` 必須與既有 manifest 的 lessonId 相同。

使用固定 `gpt-4o-mini-tts-2025-12-15`、MP3、speed 1.0。指示為自然清楚的正常英文對話語速，沒有慢速或 135 wpm 指示。音色明確指定，不依目錄排序：09-13 Marin、09-14 Cedar、09-15 Marin、09-16 Cedar、09-17 Marin、首週包 Cedar。聲音為 AI 合成；只將原創題文送到 API，老師／孩子錄音與私人老師片段不經本工具。

```powershell
# 由已登入的 1Password CLI 暫時注入；環境裡先放 secret reference，非明文 key。
$env:OPENAI_API_KEY = 'op://<vault>/<OpenAI item>/credential'
op run -- uv run --python 3.13 learning-tasks/shared/nativecamp/build_openai_audio.py --lesson 2026-09-14 --voice cedar --jobs learning-tasks/nativecamp-2026-09-14/source/speech-jobs.json --manifest learning-tasks/nativecamp-2026-09-14/source/nativecamp-audio-manifest.json

# 不需 key，檢查每檔的輸入指紋、hash、完整解碼與非靜音。
uv run --python 3.13 learning-tasks/shared/nativecamp/build_openai_audio.py --lesson 2026-09-14 --voice cedar --jobs learning-tasks/nativecamp-2026-09-14/source/speech-jobs.json --manifest learning-tasks/nativecamp-2026-09-14/source/nativecamp-audio-manifest.json --check

# 原創合成音的本機 ASR 抽查；需要已快取的 small.en，不上傳音檔。
uv run --offline --python 3.13 learning-tasks/shared/nativecamp/check_openai_audio.py --manifest learning-tasks/nativecamp-2026-09-14/source/nativecamp-audio-manifest.json
uv run --python 3.13 pytest -q tests/test_nativecamp_openai_audio.py
```

`--audio-dir` 預設 `docs/nativecamp/audio`，可指定隔離輸出。初次權限驗證可加 `--limit 1`，之後原指令續跑；不要為同一 manifest 同時執行兩個製作程序。工具不自行重試付費請求。下載先核對可得的 Content-Length，正常 EOF 短讀或中斷都視為失敗；完整驗證暫存音檔、保存 receipt 後才取代原檔。失敗不把半檔當正式音檔，下次可接續。輸入設定、hash 與解碼都相符時跳過，零 API 請求且不需 key。僅刪除或重排 jobs 時更新 manifest 清單、順序與 jobs hash，不重製音檔；`--check` 遇到過期清單會失敗且不寫檔，完全未變的重跑也不寫檔。

無人值守週包必須另帶 `--request-journal .local/nativecamp-weekly/<發布日>/audio-requests.json`。journal 在送出每次付費請求前落盤並用排他 lock 防止並行製作；結果不確定或 receipt 尚未保存時，之後重跑仍會停止並要求人工判斷，不能自動再付費。已完整驗證且保存 receipt 的暫存回應仍可直接恢復。完整排程、私有進度擷取、憑證部署門、內容 review 與發布核對見[每週自動化 SOP](weekly-automation.md)。

manifest 保留既有老師片段證據。每個 TTS 項目包含文字、model、voice、settings、inputFingerprint、requestId、hash、bytes、音長、RMS 與驗證結果；頂層 `status: complete` 才代表所有工作完成。`openaiGeneration` 累計送出的請求與成功回應數；binary Speech API 未回傳 token usage，因此 usage／costUsd 記為 null，音長及請求數不能冒充實際帳單。ASR 報告每段附音檔 hash，沒有提供預期文字作辨識 prompt；轉錄比對不等於人耳自然度、iPad 或發音驗收。

API 契約依 [OpenAI Speech API reference](https://developers.openai.com/api/reference/resources/audio/subresources/speech/methods/create)、[TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech)及 [model snapshots](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts) 核對（2026-09-18）。

## 私人回放核對

`check_lesson_audio.py` 依各堂 `source/audio-samples.json` 取樣；先hash與整檔解碼，再做本機分聲道ASR。需要既有 ffmpeg／ffprobe 與已快取的 faster-whisper small.en；`--offline` 不自動上傳或下載模型。私人原檔不隨Git提供。

```powershell
uv run --offline learning-tasks/shared/nativecamp/check_lesson_audio.py --task 2026-09-14
uv run --offline learning-tasks/shared/nativecamp/check_lesson_audio.py --task 2026-09-16
```

公開 `download-verification.json` 只存hash、bytes、格式及本機相對路徑；詳細辨識結果在ignored的 `source/private/`。Native Camp的原封包可能有時間戳重疊，工具以 `asetpts=N/SR/TB` 正規化解碼輸出的時間軸，原檔不改。ASR不能代替人耳驗聽、老師／學生身分完整分離或發音評分。

## 內容稽核

```powershell
node --test tests/test_nativecamp_content.mjs tests/test_nativecamp_edon_content.mjs tests/test_nativecamp_weekly_content.mjs
```

各題包依 manifest 驗證音檔；測試也確認 public audio 恰好是 catalog 全部課程與週包的一般 TTS 聯集，防止重名覆寫、漏檔或未列入 manifest 的檔案。私人老師片段不在 public audio 中。
