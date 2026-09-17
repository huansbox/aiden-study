# Native Camp：已由兩堂重用的內容工具

2026-09-14 與 2026-09-16 Edon 課程實際共用下列工具。課程設計標準仍在[首堂 SOP](../../nativecamp-review-pilot/lesson-sop.md)，每堂題文與證據留在各自的task，不集中成一份巨大題庫。

## 文字與題包

`build_lesson.py` 只讀取指定新課的 `source/lesson-source.json`，產生同日期公開題包與 `source/speech-jobs.json`。它不產生或覆寫音檔，也不動9/15首堂。改過spokenQuestion／answerText後，必須另外重製受影響音檔；builder通過不代表音文已一致。

```powershell
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-14
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-16
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-16 --check
```

`--check` 只比對產物，不寫檔。正式語音工具入口與比較結果見[9/16課程來源](../../nativecamp-2026-09-16/source/lesson-brief.md)；音訊工具實際位置為 `learning-tasks/nativecamp-2026-09-16/source/tts-build-lesson.py`，接受兩堂日期。

## 私人回放核對

`check_lesson_audio.py` 依各堂 `source/audio-samples.json` 取樣；先hash與整檔解碼，再做本機分聲道ASR。需要既有 ffmpeg／ffprobe 與已快取的 faster-whisper small.en；`--offline` 不自動上傳或下載模型。私人原檔不隨Git提供。

```powershell
uv run --offline learning-tasks/shared/nativecamp/check_lesson_audio.py --task 2026-09-14
uv run --offline learning-tasks/shared/nativecamp/check_lesson_audio.py --task 2026-09-16
```

公開 `download-verification.json` 只存hash、bytes、格式及本機相對路徑；詳細辨識結果在ignored的 `source/private/`。Native Camp的原封包可能有時間戳重疊，工具以 `asetpts=N/SR/TB` 正規化解碼輸出的時間軸，原檔不改。ASR不能代替人耳驗聽、老師／學生身分完整分離或發音評分。

## 內容稽核

```powershell
node --test tests/test_nativecamp_content.mjs tests/test_nativecamp_edon_content.mjs
```

舊課仍檢查35個原音檔；新課測試按各堂manifest驗證，並檢查整個public audio恰好是三課的聯集，防止重名覆寫、漏檔或未列入manifest的檔案。
