# 2026-09-13：Seasons and full sentences

4個概念，各3題Try與3題Say，共24題、48個問題／答案音檔。Try一輪8–12題；Say每次一個概念2–3題。實際耗時與孩子難度未測，不設定概念數上限，也不為湊數加入未教內容。

來源與核對範圍見 [evidence-review.md](evidence-review.md)。本課採完整句排列為主；列表標點需要直接看書寫，故該概念使用完整句選擇題。排列每題有1個合理混淆字，允許留未選；句首限制寫在題面，避免不同自然語序被誤判。

| 概念 | Try目標 | Say與家長判準 |
| --- | --- | --- |
| Actions in seasons | 依假想計畫組成 `I … in …`，選對該計畫的季節，不用個人生活經驗猜答案。 | 說出卡上的活動與季節，可用 `In …, I …` 等自然完整句。`a bike`／`my bike`、`fall`／`autumn`等同義用法可接受；內容必須符合卡片。 |
| Weather in a story | 把虛構城鎮的天氣與季節組成完整句，不能套用真實氣候印象。 | 可說 `It is…`、`It's…`或先說季節，天氣與季節都要對。只答warm／winter還未達完整句目標。 |
| Where do you do it? | 將指定活動與地點連成完整句，選對park／beach／house等地點。 | 需包含活動與地點，前後順序可不同。語意自然且等同卡片即可，不拘示範句的每一字。 |
| Lists in a sentence | 從完整句中找出用逗號分隔清單的寫法；干擾項是不分隔或把主詞與動詞拆開。 | 在一個完整句中自然列出全部三項，順序可不同；不念comma。口說不評Oxford comma或標點位置。 |

家長依揭曉前表現選 Got it／With help／Not yet。正常題目語音與預設句首不算額外提示；提供缺少的關鍵字或示範後跟讀，不能算獨立成功。替代答案清單是例子，符合本表語意與完整句要求的自然回答也可接受。

唯一題文來源是 [lesson-source.json](lesson-source.json)；`uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-13` 從repo根目錄重建 [正式題包](../../../docs/nativecamp/lessons/2026-09-13.json)及 [speech-jobs.json](speech-jobs.json)，加`--check`只比對。改spokenQuestion或answerText後需以OpenAI工具重製受影響音檔，不可只重建JSON。

音色固定Marin、speed 1.0；老師與孩子錄音不送API。本地內容與builder檢查已執行；正式音訊、瀏覽器與發布狀態以任務README／整合驗收的實際證據為準。
