# Native Camp 最新三堂：交付驗證（2026-10-01）

工作追蹤 [#140](https://github.com/huansbox/aiden-study/issues/140)。本批只新增課程內容與公開 TTS，不改 App runtime、正式孩子進度或 weekly 排程。從 `origin/master` 的 `c6d95e9945f0b8e74c7aa89ffc86c0a3454a8b2f` 建立隔離工作分支，原 checkout 與 8791 保留。

## 內容與難度

| 日期／老師 | 範圍 | 概念／可用題數 | 聲音 |
| --- | --- | --- | --- |
| 9/28 20:00 Alex | 動物分類、體表、翅膀、產卵、鰓、棲地 | 6／36 | Marin |
| 9/29 20:00 Zibuyile | 正在做的事、幫忙、合併動作、禮貌與耐心、工作者、規則 | 6／36 | Cedar |
| 9/30 19:30 Edon | 名詞、邀請、壁畫、配色、預測、比較顏色 | 6／36 | Marin |

家長反映動物教材偏難；這不是對孩子能力的自動診斷。本批保留完整句目標，以短英文 fact card、可選 hint、Build／Change／Fix 分步及 Say 句首降低同時回想事實、新詞和語法的負擔。動物課第三題回到單一事實，不把补強升級成長句。每概念前兩題首次獨立成功仍省略第三題；Try 每輪 12–18 題，Say 每次一個概念 2–3 題，沒有第四題或強迫重作。

六條原回放已完整下載、核對 bytes／SHA256／ffprobe／完整解碼；各課原音抽樣與轉錄範圍見 task 的 `source/evidence-review.md`。9/28 網站逐字稿只涵蓋末條回放，因此另核對主要 track；不以尾段冒充整堂。原音與私有逐字稿不進 Git、不送 OpenAI。

Fresh read-only reviewer 逐題審查 108 題，修正三個實質問題：兩個補強題原先增加難度，以及一個 Fix 問題語音先說出受測正確詞。複驗通過後才製音。視覺 Say cue 採短句首＋省略號，語音保留口頭指示。科學內容限定題卡中的動物，不教「所有哺乳類都不產卵」或「只有魚有鰓」。

## 音訊證據

每堂問題／答案各 36，共 216 個公開原創 MP3，OpenAI `gpt-4o-mini-tts-2025-12-15`，speed 1.0。音訊逐檔對應 source、speech jobs、manifest、SHA256、完整解碼與非靜音檢查。每檔在本機以 small.en 全文辨識，差異另以 large-v2 核對；沒有初始答案提示，也沒有上傳原錄音。

本批品質修正：9/28 三檔、9/29 一檔、9/30 六檔。原因為漏掉尾句／指定句首，或 `leads` 辨成 `leaves`。只替換已明確成功回應且有品質缺陷的音檔；原音檔、manifest、ASR 與 request receipts 留在各 task 的 ignored `source/private/quality-retakes-1/`。沒有自動重試結果不確定的付費請求。

9/29 曾在第八個 request 前保存 manifest 失敗：獨立查核確認只有七個 response-verified，沒有 request-started 或部分回應。沿用原 journal 跳過既有七檔，繼續尚未送出的 65 個請求。實際帳單無法由二進位 API 回應推算，manifest 不虛填費用。

最終音文核對與殘餘辨識差異見各 task `source/nativecamp-tts-asr.json`、`source/nativecamp-tts-crosscheck.json` 及本批 QA 總表。ASR 一致不等同人耳驗聽、自然度評分或孩子實測。

## 行為與回歸

隔離本機 8806，synthetic token 與記憶體 KV：

- 三堂 Preview 題面／Say 揭答可讀；操作前後 progress 回應完全相同。
- 390px viewport 的內容寬與 scrollWidth 均為 375px，沒有橫向溢出。
- 動物課 Try 完整走完 14 題：第一概念先錯再重試成功仍記 incorrect；第二概念看提示答對仍記 helped；這兩概念才出第三題，其餘四概念各兩題完成。
- Say 棲地小回合以 With help／Got it／Got it 走完三題，第三題為單一 land 句；答案先遮蔽，揭答後才由家長評分。
- 獎勵只在 Try 回合結束出現；作答中只有正常教學回饋。音訊控制、換題與揭答均觀察到 Playing 狀態，不以此聲稱人耳品質驗收。
- 三堂核心流程另驗證所有 Build／Change 首次獨立成功時都省略 Fix。
- 原 22 筆 catalog 記錄、既有題包、MP3 與 runtime 保持不變。

既有全套 Node 初次 769/770 通過，唯一失敗為新 task 缺 Preview link，補齊後 affected work catalog 14/14 通過；Python 271 passed、1 skipped，略過為本 worktree 沒有既有私人 PDF。catalog 重建與 --check 通過。PR 的獨立 CI 與正式部署資源結果另記於 #140。

尚未聲稱完成的使用者實測：真實 iPad 播放、孩子練習難度與耗時、成人逐檔驗聽。發布核對只確認站上題包／音檔與合併成果一致，不寫入家庭進度。
