# 2026-09-11：Seasons: say a full sentence

題文、公開題包與 48 個問題／答案 MP3 已完成。4 個概念，各 3 題 Try／3 題 Say，共 24 題；正式音色為 OpenAI Marin、speed 1.0。Try 一輪 8–12 題；Say 每次一個概念 2–3 題。耗時與孩子實測尚未測量。課堂與教材交叉核對、來源限制見 [evidence-review.md](evidence-review.md)，不將課內跟讀或 ASR 標籤當成孩子獨立能力。

本次沿用現有 order 與 word-card；沒有新增題型、scene、錄音、計分或排程規則。所有 Try 都需要選出必要字卡並排完整句，每題僅一個混淆。所有語音與孩子畫面使用簡短英文。

| 概念 | Try 的判準 | Say 的提示與家長判準 |
| --- | --- | --- |
| Weather changes | 肯定句的 It 接 gets／snows，排入卡上的溫度與季節；get／snow 為合理混淆。 | `It …` 不先給動詞。冷暖變化使用 gets；雪的事實使用 snows。詞序可自然變化、季節前可有 the，但只說 warm／snow 或換成單純 `It is warm` 尚未展示這題的動詞目標。 |
| After doesn't | doesn't 後接 get／snow，不能選 gets／snows；季節與否定事實都須符合卡片。 | `It doesn't …` 明示本題句型，目標是動詞原形與完整否定句。does not 可替代 doesn't。`It isn't hot` 意思正確但未展示 doesn't + base；家長可提示本題要用的開頭，再依揭曉前協助程度評級。 |
| The next season | 用下一季開頭，說出 `… comes after …`；混淆卡是其他已學季節。問題只提供目前季節，不先說下一季。 | `… comes after …` 提供關係句骨架，不提供季節答案。fall／autumn 都可；同義完整關係句可接受，單說季節名不算達到完整句。四季只有四個相鄰關係，跨模式會再使用關係，但有 winter → spring、fall／autumn 替換，不將換詞當成新概念或新的獨立學習證據。 |
| Days and nights | 完整描述卡上的季節與日夜長度；複數 days／nights 用 are，is 為混淆。`The days in summer are long` 與 `The days are long in summer` 皆列入可接受排列。 | 第 1 題為複數 days，第 2／3 題明確要求 one night／one day，以 `A summer night …`／`A summer day …` 引導單數。需正確 is／are 與長短；只說 long／short 不足。 |

虛構天氣卡只提供作答所需的詞與事實，不展示整個標準答案。肯定變化卡以 `cool, then warm` 類短語表達變化；否定卡使用 `Hot weather: no` 類事實，不以真實世界經驗猜答案。四季卡明示 Four-season calendar，避免把四季當成全球唯一分法。

每題 prompt、instruction、scene、tokens、acceptedOrders／accepted、spokenQuestion 與 answerText 全部集中在 [lesson-source.json](lesson-source.json)，不另複製第二份題目清單。Try 指示要求的句首與詞序納入判準；Day／night 中季節片語兩種自然位置均接受。Say 替代答案是家長參考，不是字串完全比對，也不是自動發音評分。

家長依揭曉前表現選 Got it／With help／Not yet。預設句首與重聽不另外算協助；家長補動詞或先念答案後跟讀不能改記首次獨立成功。前兩題獨立成功收尾，否則本回合補第三題；完成後收起，由之後的新 Weekly Review 複習，不要求重做舊題。

重建沿用 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-11`，產出題包與 speech jobs；`--check` 只比對。音色固定 OpenAI Marin、speed 1.0；只有原創題文送出製作，不使用孩子或老師原聲。

獨立內容 review 已通過；三堂整合 Node 552 項通過、Python 247 項通過／1 項略過，120 個 MP3 完整解碼與 hash 均通過。本堂 [audio manifest](nativecamp-audio-manifest.json)記錄 48 個檔案；[問題音檔 ASR](nativecamp-questions-asr.json)涵蓋本堂 24 題（三堂共 60 題），[TTS ASR 抽查](nativecamp-tts-asr.json)另記本堂 8 筆（三堂共 20 筆）。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-11)供家長檢視。瀏覽器驗收、發布 commit／CI／正式資源核對結果見 [#97](https://github.com/huansbox/aiden-study/issues/97) 及其關聯 PR。原始課程錄音未落檔，原音獨立人耳核對、TTS 人耳自然度、iPad 與孩子實測未完成；ASR 與技術檢查不代表這些項目已通過。
