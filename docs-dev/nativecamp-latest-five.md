# Native Camp：9/22–9/26 五堂與手動 Weekly

本批對應 [#125](https://github.com/huansbox/aiden-study/issues/125)。從 Native Camp 已授權課程紀錄核對最新五堂，新增各堂原創完整句複習；Weekly Review 改為只有使用者明確要求時製作。正式 PR、CI、Pages commit 與逐檔發布結果以 issue 的交付紀錄為準。

## 交付內容

| 課程（Asia/Taipei） | 主題 | 概念 | Try／Say 題數 | OpenAI 音色／檔數 |
| --- | --- | ---: | ---: | --- |
| 9/22 19:30 Edon | 寵物、朋友、理由、外觀、談話主題、同色比較 | 5 | 15／15 | Cedar／60 |
| 9/23 20:30 Bianca | 工作作用、標題線索、需要／想要、Does／What 問答 | 5 | 15／15 | Marin／60 |
| 9/24 19:30 Mia | 野餐計畫、轉述、人與動作、my／your、偏好 | 6 | 18／18 | Cedar／72 |
| 9/25 08:00 Edon | 動物描述、詩題預測、押韻、作者、there is／are | 5 | 15／15 | Marin／60 |
| 9/26 20:00 Danielle | 住家位置、either、房間、because、enjoy、when | 6 | 18／18 | Cedar／72 |

共 27 概念、162 題，包含條件補強題；不是每輪必做 162 題。每概念 Try 原生使用 Build／Change／Fix，先交錯完成各概念 Build，再做 Change；前兩題首次獨立成功便省略 Fix。Say 各三題，沿用家長評分與前兩題熟練可省略第三題。所有題目是新課初版，無 `tryRevision`，Preview 不顯示 Updated／Original。

答案要求完整句，排列各有一個或兩個混淆字並明示剩餘字卡數；Change 必須改變人稱、單複數、肯否、視角或句型。所有角色、物品、家庭配置與喜好均為虛構。各 task 的 `source/lesson-source.json` 是真相源，設計與來源時間見 `source/lesson-brief.md`，產物和語音由既有 builder 重建。

## 來源與語音

- 六個原回放已下載、SHA256 與完整解碼通過；9/24 有介紹／設定和主要教學兩軌。各堂的 `source/download-verification.json` 與 `source/evidence-review.md` 記錄精確長度和範圍。
- 34 個關鍵時間窗以本機 small.en 分別辨識兩聲道，沒有 initial prompt，也沒有上傳原錄音。網站逐字稿和局部 ASR 共同支持教學範圍，不把 speaker 標籤當成身分保證，也不據此評分孩子能力。完整原音、私有頁面、轉錄和剪輯只留 ignored 路徑。
- 語音使用 `gpt-4o-mini-tts-2025-12-15`，Cedar／Marin 交替、speed 1.0；只送原創題文與答案，沒有 voice cloning。324 段最終 MP3 全部通過輸入指紋、雜湊、完整解碼、長度與非靜音檢查。
- 全 324 檔做無提示的本機 small.en 音文核對；314 檔正規化後一致，5 檔由 large-v2 還原正確文字，5 檔是限定句子的 see／sea／C 同音或 there is／there's 縮寫。未解決差異為零，見[交叉核對](nativecamp-latest-five-asr-crosscheck.json)。mum／mom 與數字寫法按報告規則正規化。
- 第一輪兩模型確認部分短尾句未辨識，改成連貫問句；`a train` 易辨成 `to train` 的口說題改為 `a toy train`。改寫均再經獨立內容審查及 ASR。共 345 次成功 API 請求，含 21 次已取得回應後的品質重製；沒有自動重試結果不確定的請求。原收據與品質重製前檔案保存在私有工作目錄。Speech API 未提供 token usage，這裡不推定實際帳單。

## 獨立審查與整合驗證

fresh read-only reviewer `/root/latest_five_content_review` 逐題檢查 162 題、來源映射、自然替代句、Change 的實際轉換、27 題 Fix 的唯一替換及 Weekly 手動政策。初審發現部分排列缺少剩餘字卡限制、把 books 直接稱為活動；修正後複查通過。後續語音改寫另經同一獨立 reviewer 核對，避免先念出受測 `prefers`。

- Node 全套 726 項通過；Python 271 項通過、1 項略過。五堂題包／speech jobs 重建一致，五堂完整音訊 `--check` 通過且零 API 請求。
- Chrome 隔離服務 8798、test-token、測試 KV 完成 9/22 Try 全輪：5 個 Build、5 個 Change、1 個 Fix。第一概念故意答錯後訂正，首次 incorrect 保留；其他四個概念前兩題獨立成功，第三題省略。結束畫面才出現徽章／建築包提示。這些是代理的合成測試，不是孩子作答。
- 驗證替代字序 `My shirt is like the blue sky` 被接受。Preview 可直接檢視第三題、進行 too／either 修正、切換 Say、遮蔽／揭示答案與重播。操作前後隔離 Native Camp 進度 envelope 完全相同。
- 390 × 844 下目視檢查較長的 When 題，題文、字卡與操作按鈕正常換行；恢復原 viewport。新課 Preview 無版本切換，月曆週一開頭並顯示全部五堂。代表性課程可自動播題與答案，瀏覽器無 console error。
- [完整性報告](nativecamp-latest-five-integrity.json) 確認相對基線 `5af6c923bb00c4025ae9d3511715e9bf7bc187a0`，原有 12 個題包、887 個音檔、runtime 與既有 task source 未變；只追加五堂和登錄。

本次原 checkout 與 8791 保留，沒有重置或寫入正式孩子進度。ASR、播放狀態與窄畫面檢查不代表已完成人耳全檔自然度驗聽、iPad 真機或孩子難度／耗時實測。

## Weekly 操作政策

Codex heartbeat `native-camp` 已透過 app 設為 `PAUSED`，並讀回設定確認。Windows 未找到對應 Native Camp／Aiden Weekly 任務；不另建替代排程。既有週包、授權憑證、工作檔與 request journal 保留。本批不建立新週包。

[手動 SOP](../learning-tasks/shared/nativecamp/weekly-automation.md) 和[規劃契約](../learning-tasks/shared/nativecamp/weekly-planning.md) 已改成使用者要求才執行；新課完成、到週日或讀到 SOP 都不能自動觸發。既有週日到週六的練習窗口與同週不覆寫規則保留。
