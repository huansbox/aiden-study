# 2026-09-23：Jobs, needs, and questions

課程：Bianca，20:30（Asia/Taipei）；Oxford Discover 1，第 116–122 頁。適用於已有基礎英文、由家長陪同口說的孩子。5 概念、30 題、預計 60 個一般問題／答案音檔。全部情境均為原創練習，不引用孩子真實偏好或表現。

本次設計按[現行 SOP](../../nativecamp-review-pilot/lesson-sop.md)採完整句 Build／Change／Fix，各概念再提供三題 Say。Try 一輪 10–15 題；Say 每次一概念 2–3 題；紙本不在本次範圍。完成後收起，後續只有另行要求的新 Weekly Review 才再次練習。

## 來源與選題

下表時間為已讀取網站逐字稿的課堂時間線。它支持「課內討論了什麼」，不能直接支持「孩子獨立會什麼」。原錄音已由整合者下載；錄音抽查、聲道與提示程度以 [evidence-review.md](evidence-review.md) 的實際範圍為準。設計時不以 speaker 標籤推定身分，不把 ASR 漏字或跟讀認作錯誤或獨立掌握。

| 概念 | 來源時間／教材 | 可觀察內容與證據界線 | 目標與成功判準 |
| --- | --- | --- | --- |
| `job-actions`／How do people help? | 02:21–05:47、08:13–16:12；第 116–122 頁 | 課堂討論工作、錢、農夫種食物，以及醫生、警察、老師的作用；獨立表現未確定。 | 以完整句說出人與作用，主詞單複數與動詞一致；不能只說職業名稱。 |
| `topic-clues`／Use the title | 05:47–08:01 | 老師用標題、標題層次與圖片引導猜主題，例子涉及 games／vegetable soup；提示程度需原音再核。 | 看新標題與文字描述的圖，從限定選項推知主題；完整說出 is about，原線索改變時能否定已不成立的舊主題。 |
| `need-or-want`／What is needed now? | 08:13–10:58 | 討論生活必需品，也有 homework／pencil、walk to school／sneakers 的特定用途。 | 依卡片明示的任務與「可等候」條件選 need 或 want，再說完整句；不把物品永久分類。 |
| `does-have-want`／Ask with Does | 17:30–19:52、22:03–24:04 | 老師練 Does…have／want、yes/no 和 he/she has／wants；完整獨立回答未確定。 | Does 後使用 have／want 原形；用卡片事實回答 yes/no，加完整 has／wants 或 doesn't want 子句。 |
| `what-does-want`／Ask what someone wants | 17:30–19:52、22:03–24:04 | 課堂明確出現 What does…want 問答。 | 能把陳述句改成詢問物品的 What does…want 問句，並以 wants 完整回答；不是重複指認職業。 |

取捨：衣物與 money 作為課堂脈絡，不另加孤立單字題；不因老師寬鬆的口頭分類把 farmer 定義為 service job。原逐字稿有不自然的 sneakers 單複數表達，未沿用。Does…have 和 Does…want 合成一概念，避免相近 yes/no 題型重複擴量。

## 每個概念的三段 Try 與 Say

完整六題卡的 prompt、instruction、scene、spokenQuestion、answerText、accepted 與 token ID 以 [lesson-source.json](lesson-source.json) 為唯一題文來源。下表說明變體實際測到的差異，避免另維護一份題庫。

| 概念 | Build | Change 的實際判斷 | Fix 的唯一修正 | Say 的三種封閉任務 |
| --- | --- | --- | --- | --- |
| `job-actions` | Farmers grow food. | Farmers 改成 A farmer，grow 必須改 grows。 | Doctors keeps → keep；另一選項 helps 仍不符合句子。 | 醫生／健康、老師／學習、警察／安全；各有指定主詞與完整句。 |
| `topic-clues` | 依球與球棒線索說 games。 | 新標題變為 Soup for Lunch；保留 games，必須把舊句改為否定，不能原樣抄。 | This text are → is。 | 各提供標題、圖像文字與兩個主題候選；從 food／games、clothes／jobs、jobs／food 作答。 |
| `need-or-want` | 作業缺鉛筆，組出 need。 | 從一般想換鞋，改成無鞋可步行上學；want 改 need。 | 玩具明示只是娛樂、可以等；need → want。 | 口渴缺水、上學缺鞋、只是娛樂的玩具；各有明確情境。 |
| `does-have-want` | Does she have a coat? | He wants a kite. 改為 Does he want a kite?；同時處理助動詞與原形。 | Does he has → have；wants 不能放在 Does 後。 | 已有外套的肯定、不要火車的否定、想要書的肯定；示範都含完整述句。 |
| `what-does-want` | What does she want? | 從 He wants a ball. 改為詢問物品的完整 What 問句。 | What does she wants? → want? | 詢問虛構女孩、回答虛構男孩想要的物品、詢問另一位虛構男孩。 |

Build／Change 各一個混淆字；全部只用現有 order／repair 與 word-card。Fix 顯示單一錯字，正確選項位置交錯。字卡交給 runtime 依 question ID 打散；初始來源陣列順序不是畫面提示。

## 口說判準與提示界線

Say 使用短句首，不提供應變化的動詞答案。相同意義的完整句與合理同義詞依 `accepted` 接受；例如 doctors help us stay healthy、clothing、a pair of shoes。第三人稱主詞可用題中姓名取代 he／she。Does 題需完整答句；只說 Yes／No 或物品名未達本課目標。What 問句必須包含 what、does、正確主詞與 want。

題目語音不先朗讀完整答案。Have／want 回答題把角色資訊留在短卡上，再詢問完整問題；家長不要在揭曉前先補 has／wants／doesn't。topic Change 只提供新線索與保留 games 的限制，不直接唸否定答案。

家長依揭曉前表現選 Got it／With help／Not yet；跟讀與訂正不能回填首次獨立成功。預設 cue 與重播問題不算額外協助；家長補關鍵字或示範才算 With help。前兩題首次獨立成功可收尾，否則做 Fix／第三題後收尾，不無限加題。

## 重建與驗證界線

`uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-23` 產生公開題包與 speech jobs；`--check` 僅比對。一般 TTS 使用固定 `gpt-4o-mini-tts-2025-12-15`、Marin、speed 1.0。只送原創練習題文，不送原始錄音或私人逐字稿。

內容來源已以現有 core validator 在記憶體加入預定音檔路徑檢查，並核對排列答案、修正後答案、全英文孩子文字與題目音訊未包含完整示範答案。正式音檔、入口、桌面／窄版與獨立 review 由整合驗證另記；本文件不宣稱生成、播放或發布已完成。人耳完整驗聽、iPad 與孩子耗時／難度尚未實測。

## 整合結果

題文及語音改寫已通過獨立審查；來源音檔、公開TTS與隔離流程均有核對紀錄，見[本批驗證](../../../docs-dev/nativecamp-latest-five.md)。最終 spokenQuestion 與示範答案以 lesson-source.json 為準；本文件不據此新增孩子掌握度或發音評估。
