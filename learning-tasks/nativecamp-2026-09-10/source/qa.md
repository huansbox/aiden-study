# 2026-09-10 整合驗收

驗收日期：2026-09-19，Windows Chrome；同批交付追蹤 [#97](https://github.com/huansbox/aiden-study/issues/97)。

## 來源與內容

課程頁逐字稿配合教材交叉核對；確定範圍與限制見 [evidence-review.md](evidence-review.md)。本堂 18 題，經另一位製作者唯讀 cross-review 及整批獨立 delivery review，無未解決的內容／相容性／私人資料 finding。9/10 的 The／the 重複字卡已接受交換，避免正確句子被判錯。

## 語音

本堂 36 段 OpenAI Cedar、speed 1.0 預製 MP3。所有檔案解碼、非靜音、長度、SHA256、題文 fingerprint 通過；見 [manifest](nativecamp-audio-manifest.json)。

三堂所有 60 個問題音檔均以本地 small.en 無文字提示辨識；疑似省略片段以第二模型及切尾交叉確認，受影響音檔縮短指示並重製。最終每題辨識記錄與最新 hash 見 [全部提問核對](nativecamp-questions-asr.json)。另有每概念問題／答案各一段的 [固定抽樣](nativecamp-tts-asr.json)，三堂合計 20 段。9/12 一段 Use can 的同音拼寫差異有明列。以上不是人耳自然度或發音評量。

## 隔離瀏覽器 E2E

使用本機 8796 的 test-token 與 memory KV；只啟用測試資料中的活動，不讀寫孩子正式進度。

- 本堂全部 18 題都在 Preview 切換、顯示示範，確認答案出現及無播放錯誤；三堂總計 60／60。全數預覽後，測試 progress 仍為 rev 0、data null。
- 以 9/12 較長的 Say it 題目抽查 390 px 窄版，月曆、口說 cue、答案與操作按鈕可見，document scrollWidth 等於 clientWidth；viewport override 已清除。
- Try it：7 題首次作答，6 題獨立答對、1 題答錯。錯題訂正成功仍保留原始錯誤；Animal homes 才補第三題。
- Say it：三個概念各 2 題 Got it，共 6 題。
- 三堂均完成兩種模式並顯示 Finished；切到另一課不覆蓋已完成課。
- 家長摘要回讀測試雲端，9/10 首次錯誤及 9/12 受助紀錄均保留；Preview 入口對應所選課。獎勵只出現在回合完成畫面。

## 程式與交付

Node 24：552 passed。Python 3.13：247 passed、1 skipped（既有 regression 測試）。來源 builder 與音訊 --check 通過。舊課 ID、檔案、音訊與排程未改。

正式發布 commit、CI／Pages 與上線資源 hash 的結果記錄於 #97 及其關聯 PR；本頁記錄發布前驗收，不能單獨當成已部署證據。

尚未進行：原課完整錄音落檔／原音人耳逐句核對、TTS 人耳自然度驗聽、iPad 真機及孩子實測。公開只包含原創題文／一般 TTS，不含私人課堂逐字稿與錄音。

