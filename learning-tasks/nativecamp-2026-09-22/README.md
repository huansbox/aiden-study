# Native Camp 課後複習：2026-09-22 Edon

課程：2026-09-22 19:30（Asia/Taipei），Edon，Oxford Discover 1 第 22–27 頁。以網站回放逐字稿提供的課程範圍設計 5 個概念、30 題：朋友與寵物、喜歡寵物的理由、寵物外觀、正在談論的主題、同色比較。

所有人物、寵物所有關係與顏色情境均為新編故事，不是孩子真實朋友、家庭或寵物資料。每概念 Try it 直接使用 Build／Change／Fix 三階段，Say it 各三題；這是新課，不建立 `tryRevision`。所有回答均要求完整句，顏色題不涉及混色，沒有寵物照護建議。

## 來源與內容

- [可編輯題文](source/lesson-source.json) 是內容真相源；[設計、來源時間與家長判準](source/lesson-brief.md) 說明概念選擇及未確認事項。
- [原回放、雜湊與雙聲道 ASR 抽查](source/evidence-review.md)／[下載與完整解碼紀錄](source/download-verification.json)。
- 課程可見內容包含寵物名稱與用品、喜歡寵物的理由、朋友介紹、外觀、對話主題與同色比較。本包選擇能用現有完整句題型驗證的五項能力，不為題量納入所有談話細節。
- 網站逐字稿只作課程內容線索；speaker 標籤、孩子是否獨立回答、是否跟讀或受提示均未據此確定。本機音檔與 ASR 由整合流程另行核對，不把內容設計完成寫成全課驗聽或孩子已掌握。
- 原回放留在 ignored 的 `assets/audio/`，逐字稿、私人頁面與詳細查核資料留在 ignored 的 `source/private/`，不隨 Git 發布。

## 再製

從 repo 根目錄執行：

```powershell
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-22
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-22 --check
```

共用 builder 由本課來源產生 `docs/nativecamp/lessons/2026-09-22.json` 與 `source/speech-jobs.json`，預計 60 段問題／答案語音。正式語音設定為 OpenAI Cedar、speed 1.0，不加慢速指示；只送出原創題文，不使用老師或孩子聲音。語音製作、manifest、音文核對及正式入口由整合流程完成，沿用[共用工具](../shared/nativecamp/README.md)與[製作 SOP](../nativecamp-review-pilot/lesson-sop.md)。

## 驗證界線

內容已通過記憶體中的現行 `NativeCampCore.validateLesson`，並檢查五組 Build／Change／Fix、30 題唯一 ID、完整句排列的標準答案、單字修正後答案、卡片字數，以及問題文字不包含完整答案。此檢查未寫入 runtime 產物或家庭進度。

音檔下載／解碼、原音 ASR、正式 TTS、獨立內容 review、瀏覽器與發布驗證由本次整合結果另行記錄；人耳全檔自然度、iPad 真機及孩子耗時／難度目前未測。當前任務狀態以任務庫 `catalog.json` 為準。Weekly Review 只在家長明確要求時另外製作，本堂不建立或恢復自動排程。

## 本批整合驗證

本堂 60 段 OpenAI 問題／答案音檔已製作，通過 manifest／MP3 雜湊、完整解碼及無提示 ASR 核對。五堂獨立內容審查、完整測試與隔離瀏覽器驗證見[本批交付紀錄](../../docs-dev/nativecamp-latest-five.md)；正式 PR／CI／Pages 與資源比對回查 [#125](https://github.com/huansbox/aiden-study/issues/125)。較早段落描述題文製作者的工作界線，整合驗證以此處為準。

[語音 manifest](source/nativecamp-audio-manifest.json) 與[全檔 ASR](source/nativecamp-tts-asr.json)保留可核對的製作證據。ASR 不等於人耳自然度、iPad 真機或孩子難度實測。
