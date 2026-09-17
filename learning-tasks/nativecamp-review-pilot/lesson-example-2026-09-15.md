# 本堂填寫範例：2026-09-15

這是已發布課的設計摘要，供[單堂模板](templates/lesson-brief.md)參考；不是另一份題庫真相源。題目、選項、替代句及audio引用以[正式題包](../../docs/nativecamp/lessons/2026-09-15.json)為準，製作語音見[manifest](source/nativecamp-audio-manifest.json)。本範例於2026-09-17依發布版本整理。

## 基本資料

- Lesson ID與日期：2026-09-15；英文課名：Counting and talking。
- 對象：已有一些英文基礎的孩子，家長陪同口說；孩子畫面全英文。
- 三概念、18個可用題目。Try it通常6–9題；Say it每回一概念2–3題，可自行停止。實際耗時與難度未經孩子驗證。
- 來源：本堂已授權回放、網站紀錄、教材核對；原錄音與詳細逐字稿保存在ignored目錄。
- 交付：單堂紙本已完成；互動App、35個預製TTS及1段家庭授權原音已發布。紙本另有主題預測，未直接搬入要求封閉判準的互動題組。

## 證據、目標與取捨

| 概念 | 來源與判讀 | Try it | Say it／cue | 成功判準 |
| --- | --- | --- | --- | --- |
| is-are · Is or are | 17:25–20:25的人數／公園數量；有老師提示證據，不能把接續回答視為完整獨立提取 | 依圖判斷is/are，再排列完整句 | 說完整There句；There … | 單複數與可見物件／數量一致；單數可接受a或one |
| odd-even · Odd or even | 已核教材第88頁有奇偶數；納入課內確認，不宣稱孩子有已證實的奇偶錯誤 | 由圖或數字判斷odd/even | 說出數字與奇偶；___ is ___. | 數量及奇偶皆正確；Four is even.可接受 |
| too-many · Too many | 21:05–23:00帽子／玩具；老師曾自我修正too much，不歸咎為孩子錯誤 | 選many/much或排列句子 | 完整句表達超過容量；… too many … | 圖上數量大於標示容量，句中有too many與正確物件；可有合理主詞變體 |

詳細判讀見[來源核對](source/evidence-review.md)。本堂沒有把ASR的hats/heads分歧當成發音錯誤，也沒有把網站合併的老師提示標為孩子已會。

## 六題／概念的實際安排

表中的Try 3／Say 3不代表每回必出；前兩題獨立成功時留到最早隔天。

| Question ID | 模式／題型 | 可見情境 | 畫面instruction | 示範答案 |
| --- | --- | --- | --- | --- |
| is-are-try-1 | Try · choice | 1 cats | Pick one. | There is a cat. |
| is-are-try-2 | Try · choice | 2 dogs | Pick one. | There are two dogs. |
| is-are-try-3 | Try · order | 3 trees | Tap the words to make a sentence. | There are three trees. |
| is-are-say-1 | Say it | 1 dogs | There … | There is a dog. |
| is-are-say-2 | Say it | 4 trees | There … | There are four trees. |
| is-are-say-3 | Say it | 2 cats | There … | There are two cats. |
| odd-even-try-1 | Try · choice | 數字 5 | Pick one. | Five is an odd number. |
| odd-even-try-2 | Try · choice | 6 toys | Pick one. | Six is an even number. |
| odd-even-try-3 | Try · choice | 9 books | Pick one. | Nine is an odd number. |
| odd-even-say-1 | Say it | 4 dogs | ___ is ___. | Four is an even number. |
| odd-even-say-2 | Say it | 數字 7 | ___ is ___. | Seven is an odd number. |
| odd-even-say-3 | Say it | 6 books | ___ is ___. | Six is an even number. |
| too-many-try-1 | Try · choice | 7 books; This shelf has room for 3 books. | Pick one. | I have too many books. |
| too-many-try-2 | Try · choice | 6 hats; This shelf has room for 2 hats. | Pick one. | There are too many hats. |
| too-many-try-3 | Try · order | 8 toys; This box has room for 3 toys. | Tap the words to make a sentence. | I have too many toys. |
| too-many-say-1 | Say it | 7 toys; This box has room for 3 toys. | … too many … | I have too many toys. |
| too-many-say-2 | Say it | 8 books; This shelf has room for 4 books. | … too many … | There are too many books. |
| too-many-say-3 | Say it | 8 hats; Tanya's shelf has room for 3 hats. | … too many … | Yes, she has too many hats. |

## 一張完整題目卡

| 欄位 | 已採用內容 |
| --- | --- |
| id／mode | is-are-say-2／say |
| prompt | How many trees can you see? |
| instruction | There …，顯示在作答區，與題目同字級深色 |
| scene | kind=trees，count=4；每個圖示是一棵樹 |
| answerText | There are four trees. |
| accepted | There are 4 trees. |
| spokenQuestion | How many trees can you see? Start with there. |
| spokenAnswer | There are four trees. |
| audio.question | audio/is-are-say-2-q.mp3 |
| audio.answer | audio/is-are-say-2-a.mp3 |
| 判分 | 揭曉前能獨立說出正確完整句為Got it；家長先給are／完整句後說出，記With help；揭曉前仍無法完成為Not yet |
| 提示界線 | 預設There只限定句型，沒有供應are或four；Listen重播原問題不算額外提示 |

以上音檔名稱是本堂既有例外。下一堂依SOP加lesson ID前綴，不能沿用這些檔名覆寫。

## 音訊與發布紀錄

- 一般問題／答案：本機Microsoft Zira Desktop英文TTS，rate -1，預製35個MP3。
- too-many-say-3問題：老師一段完整連續提問，原音ID為2026-09-15-hats-question；21:40.23–21:44.10、channel 0。這個聲道與時間只適用本檔，不是新課預設。
- 老師原音43061 bytes，SHA256 ae47f7a4e99ae39f25c6df3a32d977cdf48336bff5bc3b3d517f102cb9625c18；不逐字拼接，答案仍用一般TTS。原音本機與KV回讀校驗相同。
- 2026-09-17發布，PR #68合併；409項Node、184項Python及獨立review通過。正式54個資源內容核對一致，原音在已連線Chrome預覽成功播放、匿名請求401。
- 這些數字是本堂驗收快照。完整[發布證據與界線](../../docs-dev/nativecamp-review.md#2026-09-17-正式發布結果)仍為歷史記錄，下一堂重新填寫自己的結果。

## 家庭實測

| 檢查 | 截至整理時狀態 |
| --- | --- |
| 人工音質／內容驗聽 | 未記錄人工驗聽；已有解碼、ASR抽樣與播放功能驗證 |
| iPad真機 | 未驗證；桌面窄版模擬不能替代 |
| 孩子理解、難度、實際耗時 | 未回填；不能把3個變體宣稱為已確保熟練 |
| 後續調整 | 收到家庭觀察後再填模板末段，保留首次表現與已發布ID語意 |
