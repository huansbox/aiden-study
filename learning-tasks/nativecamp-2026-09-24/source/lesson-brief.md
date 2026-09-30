# 2026-09-24：Our picnic plans and wishes

課程：Mia，19:30（Asia/Taipei）。適用於已有基礎英文、由家長陪同口說的孩子。6 概念、36 題、預計 72 個一般問題／答案音檔；全部是原創情境，不複製課本對話或課堂中提及的私人偏好。

本次依[現行 SOP](../../nativecamp-review-pilot/lesson-sop.md)採完整句 Build／Change／Fix，各概念再提供三題 Say。Try 一輪 12–18 題；Say 每次一概念 2–3 題；紙本不在本次範圍。份量不是耗時承諾；完成後收起，後續僅在另有明確要求時製作新週題。

## 來源與選題

本課有兩段回放：track 1 約 3:57，主要是介紹與教材設定；track 2 約 21:05，才是主要教學。下表所有時間都從 **track 2** 起點計，不加上 track 1 長度。網站逐字稿已讀取；原檔下載及實際音訊抽樣範圍以 [evidence-review.md](evidence-review.md)／download verification 為準。

| 概念 | track 2 時間 | 課堂內容與證據界線 | 目標與成功判準 |
| --- | --- | --- | --- |
| `eat-and-drink`／Eat or drink? | 00:07–01:40、02:05–03:25 | 課內用 We eat／We drink 列舉野餐食物飲料，也練 I like to eat／drink；不把朗讀等同獨立口說。 | 依食物或飲料選動詞，完成 We… 或 I like to…；Change 必須連動改動作與物品。 |
| `picnic-plan`／Follow our picnic plan | 03:58–08:30、08:42–10:54 | 討論 wants／needs 清單與 we want some／we need；juice 在錄音清單與稍後接受的分類不一致。 | 僅依題目明示 must bring／nice to have 計畫選 need／want，不推定 juice 永遠屬於哪類。 |
| `report-wishes`／Tell me about someone | 18:37–20:32 | 以 What do you want／need 調查，再報告 My…wants／needs；個人回答不公開為事實。 | 把虛構角色的 I want／need 轉述為 My…wants／needs，保留原來意思與第三人稱詞尾。 |
| `people-and-actions`／People and actions | 11:25–13:27 | 區別 person／place／thing 與 action，課例含農夫、警察、玩遊戲、跑動。 | 用明示的人與動作組完整句；一個人和兩個人切換時正確調整動詞。 |
| `my-and-your`／My things and your things | 14:02–17:11 | 故事交易使用 my／your、has／wants，也提及孤單角色需要朋友；無法由文本對話推定孩子獨立能力。 | 依目前說話者與聽者選 my／your，向對方表達想要的物品或提出交換問題。 |
| `prefer-more`／What do you like more? | 17:29–18:02 | 老師以 prefer 解釋喜好，例子為 lemon candy。 | 依卡片指定的偏好，用 prefer 說完整句；Change 由 I 改成 She，動詞跟著改。 |

來源不一致的處理：juice 的需要程度由每題計畫決定；不加入「汽水不好所以只能 want」等價值判斷。動詞概念不把 Nick runs home 的 home 當作名詞測驗，因為該用法表示方向。故事保留說話者與所有者的關係，改用虛構的球、風箏、帽子與外套；不複製課本人物或長篇對話。不另加孤單／健康故事細節題，以免擴成另一個閱讀理解目標。

## 每個概念的三段 Try 與 Say

完整六題卡的 prompt、instruction、scene、spokenQuestion、answerText、accepted 與 token ID 以 [lesson-source.json](lesson-source.json) 為唯一題文來源。

| 概念 | Build | Change 的實際判斷 | Fix 的唯一修正 | Say 的三種封閉任務 |
| --- | --- | --- | --- | --- |
| `eat-and-drink` | We eat grapes. | grapes 改為 juice，必須同時把 eat 改成 drink。 | We eat water. 中 eat → drink；drinks 不符合 We。 | sandwiches／soda 的完整 We 句；指定喜歡 juice 的 I like to drink 句。 |
| `picnic-plan` | 從 must bring 清單組出 need。 | juice 由 nice to have 的舊句改為新 must bring 計畫；want → need。 | candy 明示可等候，need → want；wants 不符合 We。 | 清單上需要 water、想要 grapes、需要 cups；都以 We 回答。 |
| `report-wishes` | My brother wants a cookie. | 虛構 sister 的 I need a cup. 改成第三人稱轉述，需改主詞與 need 詞尾。 | My dad need → needs；want 不符合第三人稱且不保留原話。 | 轉述 friend／want、mum／need、sister／want。 |
| `people-and-actions` | A farmer sells apples. | 一位農夫改成 Two farmers；sells → sell。 | The girl play → plays；sells 與卡片的 play 動作不符。 | Leo 跑步、farmers 種米、police officers 幫助人；都要求完整句。 |
| `my-and-your` | 向球的主人說 I want your ball. | 原陳述 You want my kite. 改為 Do you want my kite?；保留自己的所有權。 | 對 Rose 索取 Rose 的風箏，my → your；me 不能修好句子。 | 向 Kim 表達需求、向 Ben 提供自己的帽子、說明自己的外套。 |
| `prefer-more` | I prefer lemon candy. | 由自己改為談 Ava：She prefers lemon candy.；不能只換食物名。 | I prefers → prefer；wants 也不符合 I。 | 依明示偏好回答 juice、snack、fruit；皆用 I prefer，沒有詢問私人偏好。 |

Build／Change 各一個混淆字；Fix 只有一個錯字與一組成立的替換，正確選項位置交錯。既有 runtime 依 question ID 打散排列卡；題文不增加新題型或場景能力。

## 口說判準與提示界線

所有 Say 題有指定角色、物品、清單或偏好，因此可核對。`accepted` 收錄完整等義句；例如 need water／need some water、mum／mom／mother、It's my coat。單說物品不達標；reports 保留 wants／needs，prefer 題依指示使用 prefer，單說 I like…不算完成指定句型。題中 prefer 為明確造句材料，不是要求猜出 prefer 的單字測驗。

Report 的原話是轉述所必需的輸入，但不先提供第三人稱答案；my／your 題的卡片只標物品所有者，不把要填的 possessive 放進 cue。動作卡可提供原形動詞，孩子仍需決定完整句序與單複數詞尾。Fix 問題語音僅說 Find and fix one word，不唸正確替代字。

家長依揭曉前表現選 Got it／With help／Not yet；讀預設 cue 或重播不算額外協助，提示詞尾、所有者或完整示範則算 With help。訂正和跟讀不改寫首次結果。前兩題首次獨立成功即可收尾，否則補第三題；完成不代表永久掌握。

## 重建與驗證界線

`uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-24` 產生公開題包與 speech jobs；`--check` 僅比對。一般 TTS 使用固定 `gpt-4o-mini-tts-2025-12-15`、Cedar、speed 1.0。只送原創練習文字，不送原始錄音、私人逐字稿或家庭偏好。

內容來源已以現有 core validator 在記憶體加入預定音檔路徑檢查，並核對排列答案、修正後答案、全英文孩子文字與問題音訊未含完整示範答案。正式音訊、桌面／窄版、入口和獨立 review 的結果另由整合驗證保存；不把本次內容檢查當作發布證據。人耳完整驗聽、iPad 與孩子耗時／難度尚未實測。

## 整合結果

題文及語音改寫已通過獨立審查；來源音檔、公開TTS與隔離流程均有核對紀錄，見[本批驗證](../../../docs-dev/nativecamp-latest-five.md)。最終 spokenQuestion 與示範答案以 lesson-source.json 為準；本文件不據此新增孩子掌握度或發音評估。
