# 2026-09-17：School things and sentences

4個概念，各3題Try與3題Say，共24題、48個問題／答案音檔。Try一輪8–12題；Say每次一個概念2–3題。來源依據與track 2錄音缺口見 [evidence-review.md](evidence-review.md)，不以網站speaker標籤或ASR結果宣稱孩子有固定錯誤。

全部Try以完整句排列作答，每題1個合理混淆字。重複的同文字卡各有不同token ID，所有等價交換序列都有列入acceptedOrders；字卡不是全部都要用。

| 概念 | 題目目標 | 家長可接受的口說與界線 |
| --- | --- | --- |
| Choose a tool | 依畫面任務選工具並說明用途，涵蓋ruler／eraser／notebook／backpack。 | 完整句表達正確工具與用途，例如use…to…或…with…。backpack／schoolbag等自然同義可接受；只有工具名未達完整句目標。 |
| How many together? | 加總兩個虛構角色的文具數，組成They have…完整句。 | 總數與文具都需正確；`They have…together`、`There are…in all`等自然完整句可接受，不能只有數字。 |
| What are they doing? | 看到兩人逐一數文具，表達正在做的事。 | 要有進行中的計數動作及物品；`They are…`、`They're…`、角色名字作主詞都可，不把一般習慣句當成本題正在發生的動作。 |
| The same age | 以Sam和Kim的虛構年齡回答同齡。 | `I'm…years old too`、`I'm…too`、`I am also…years old`皆可；年齡與too／also的同樣意思都要符合卡片。不要求回答孩子自己的年齡。 |

Say保留短句首與完整句要求；合理等義回答不必逐字等於示範。依揭曉前表現選Got it／With help／Not yet；揭曉後跟讀不改成首次獨立成功。前兩題獨立成功可收尾，否則補第三題；完成後收起，後續弱項由新週題處理。

從repo根目錄執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-17`，以 [lesson-source.json](lesson-source.json)重建 [正式題包](../../../docs/nativecamp/lessons/2026-09-17.json)與 [speech-jobs.json](speech-jobs.json)；`--check`只比對。正式語音固定Marin、speed 1.0，變更語音文字要重製受影響音檔。

本地內容與builder檢查已執行；音訊技術檢查、瀏覽器、iPad、人耳自然度與孩子實測分開記錄，不把生成或ASR成功當成全部驗收。
