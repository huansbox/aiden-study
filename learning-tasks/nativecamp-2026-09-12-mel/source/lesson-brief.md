# 2026-09-12 Mel：Weather, clothes, and places

題包與音訊已完成，交付追蹤於 [#99](https://github.com/huansbox/aiden-study/issues/99)。本堂有 4 個概念、24 題：每概念 3 題完整句排列與 3 題口說。Try 一輪 8–12 題，Say 每次一個概念 2–3 題；時間與孩子實測尚未測量。正式音訊為 48 個 OpenAI Marin MP3、speed 1.0；hash、完整解碼、fingerprint 與 ASR 核對已完成。

| 概念 | Try 的判準 | Say 的提示與家長判準 |
| --- | --- | --- |
| Takes and uses | 詞卡給原形 take／use 與物件，孩子組出 He／She + takes／uses 的完整句。每題混淆為原形，不混入第二個同樣合理的動作。 | `He …`／`She …` 不先供動詞；正確說出帶 s 的動作和物件。使用人名代替代名詞仍可接受，不能只說 umbrella／pencil／bag。 |
| What are they wearing? | 明確描述現在穿戴的物件；單人用 is，兩人用 are，混淆是另一個 be 動詞。 | `He …`／`She …`／`They …` 只提供句首。完整說出 is／are wearing 與指定衣物；縮寫與人名可接受。只用 wears 描述習慣未展示本題的現在穿著句型，家長可引導後記 With help。 |
| Where are they? | 依卡片組出單複數主詞、is／are、on／under 和指定位置；一個 be 動詞混淆。 | 提供 `The cats …` 等主詞，不提供 be 動詞與位置。接受 It／They 的自然代換及縮寫；位置與單複數仍須正確，單說 under the table 不足。 |
| More than one | 把單件相加的卡片改成數量與複數完整句，練 snowmen／scarves／leaves。 | `There …` 不給數量或複數名詞；從兩件換成三件，須說完整句。I see／I can see 加正確數量與複數亦可。三種形式合在同一概念，前兩題成功時本回合不必做到第三種，不宣稱因此三種形式皆已測過。 |

每題使用簡短原創詞卡固定事實，不以真實天氣、孩子的衣物或個人喜好判對錯。採用課內詞彙與句型的變體，不抄教材段落。排字通常一個合理混淆：scarf 的複數也可寫 scarfs，因此沒有把 scarfs 當錯誤陷阱。本堂沒有使用 sunglasses 的「兩個物件」說法。

Try 指示只留句首與 `One word stays.`；由排列區提供操作，不重複長說明。Say 的句首在現有作答提示位置，揭曉前沒有完整答案。問題音文置於 `spokenQuestion`，每段不超過 24 個空白分隔詞，句首提示放前方，減少長語音漏掉尾端指令的風險；仍須實際檢查產物，長度不是音訊驗收證明。

題目、示範答案、替代答案、排列 token 與語音文字的唯一來源為 [lesson-source.json](lesson-source.json)。Say 的 `accepted` 是家長參考而非字串完全比對。自然變體仍須展示本題目標，不因換人名或縮寫扣分。家長依揭曉前表現選 Got it／With help／Not yet；預設 cue 與重聽不算額外協助，先聽答案再跟讀不能改記獨立成功。

本堂同日另一堂 Lena 的 ID、題目與進度保持不變；Mel 使用 `2026-09-12-mel`。前兩題獨立成功即收尾，否則本回合補第三題，之後收進 Finished；未來由新的 Weekly Review 再練，不要求重做本堂。

從 repo 根目錄執行 `uv run --offline --python 3.13 learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-12-mel` 產生公開題包與 speech jobs；加 `--check` 僅比對。來源限制見 [evidence-review.md](evidence-review.md)。獨立 review、24 題 Preview 與隔離孩子流程已完成：Try 9 題、Say 9 題，包含首次錯誤訂正保留、With help 後重新載入續作及條件式第三題。家長摘要已核對首次錯誤與受助紀錄，同日 Lena 的進度仍獨立；正式發布與線上核對見 #99。完整證據與未測界線見 [qa.md](qa.md)。
