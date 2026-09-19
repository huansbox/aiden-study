# 2026-09-08：Animals and story characters

本堂 lesson ID 為 `2026-09-08`；Maria 課程時間為 19:30（Asia/Taipei）。依[製作 SOP](../../nativecamp-review-pilot/lesson-sop.md)與[來源核對範圍](evidence-review.md)，製作四個概念、24 題。工作由 [#99](https://github.com/huansbox/aiden-study/issues/99) 統籌。未提供額外家長觀察，不診斷孩子程度；不製作紙本。

## 目標與判準

| Concept ID | 孩子要會什麼 | Try it 與合理混淆字 | Say it 成功判準 |
| --- | --- | --- | --- |
| `take-care-of` | 用完整句描述持續餵食與保護動物的照顧行為。 | 排列 `… take/takes care of …`；多餘的 `from` 不能取代 `of`。 | 人物、動物及照顧關係吻合，可用 `take care of`、`care for` 或 `look after`；完整而指代明確的代名詞句也可。只答 `care`、`feed` 或動物名稱不算完整回答。 |
| `take-a-nap` | 由短時間睡眠線索，用完整句說出小睡。 | 排列 `… take/takes a nap`；`naps` 不能放在 `a` 後。 | `takes a nap`、`has a nap` 與有相同語意的完整句皆可。只說 `sleep` 沒有完整主詞與動詞，不達本題要求。 |
| `animal-homes` | 依卡片說出動物及它住的地方。 | 排列 `… live/lives in …`；森林題以 `on` 為混淆字，保護區題用 `from`。`live on a reserve` 是自然用法，不能當錯誤選項。 | 主詞、單複數與居所正確；清楚的 `It/They` 可接受。reserve 的自然 `at a reserve`、`on a reserve` 也可。不能只回答地名，不以猜動物常識代替讀卡。 |
| `story-characters` | 分清原創故事裡的人、動物及普通物品，完整說出兩個角色。 | 物品名是唯一混淆字。人物／動物先後兩種排列皆接受。 | 說出兩個角色的完整句；`The characters are …` 與 `… are (the) characters` 皆可，順序可交換。不能漏掉其中一人／動物，也不能把沒有擬人化的物品當角色。 |

本堂只對所提供的故事判讀。並不建立「所有故事的角色永遠只能是人或動物」的普遍規則；本題沒有會說話或行動的擬人物件。

## 六題變化

| 概念 | Try 1／2／3 | Say 1／2／3 |
| --- | --- | --- |
| 照顧動物 | Mum／kitten；Dad／puppy；We／rabbits。 | Nina／bird；Tom／dog；自己與朋友／kittens。 |
| 小睡 | kitten／10 分鐘；tiger cubs／5 分鐘；puppy／15 分鐘。 | orangutan／10 分鐘；kittens／5 分鐘；tiger／15 分鐘。 |
| 動物居所 | orangutan／forest；tigers／reserve；baby orangutan／rainforest。 | lion／reserve；orangutans／rainforest；lions／forest。 |
| 故事角色 | Nina＋kitten／ball；Leo＋puppy／bowl；Ava＋rabbit／box。 | Max＋dog／stick；Lily＋cat／basket；Sam＋bird／cup。 |

每題完整 `prompt`、`instruction`、`scene`、`spokenQuestion`、`answerText`、字卡與合理替代答案都在[題文真相源](lesson-source.json)，不另維護第二份題表。每模式的三個場景不同；故事角色題不是重述教材中的人物或事件。

## 提示、評級與份量

照顧、小睡、居所的預設 cue 只提供人物或短句首，不先填入本題要產生的片語。角色 cue 提供句型，仍由孩子分辨故事裡的角色；語音會完整讀出短故事，不能只報角色名稱當答案。所有問題語音不超過 24 個空白分隔單字，必要操作 cue 放在開頭，降低尾句漏讀風險；TTS 實際產物已完成 hash、完整解碼、fingerprint 與 ASR 核對，詳見 [qa.md](qa.md)。

Try it 每題恰留一個字卡，重複文字的不同卡片 ID 可互換。Say it 先回答再揭曉；完整、內容相符的自然替代句可評 Got it，不要求逐字背示範。家長先給答案片語或示範後跟讀須評 With help。

每概念每模式前兩題首次獨立成功可收尾，否則補第三題。Try it 一輪 8～12 題；Say it 一次一個概念 2～3 題。耗時未實測。完成後收進 Finished，再以新的 Weekly Review 複習；不重置或改寫舊課進度。

## 製作與驗收

新題包使用 `docs/nativecamp/lessons/2026-09-08.json`，語音檔以完整 lesson ID 作前綴；沿用現有 `order`／`word-card` 與共用 builder，不改 runtime。48 個問題／答案 MP3 已完成，使用 OpenAI Cedar、speed 1.0；[audio manifest](nativecamp-audio-manifest.json) 記錄檔案與本次 50 次 API 請求，包含漏句修正後的重製。

題文、來源／判準文件、公開 JSON、speech jobs 與來源比對已完成。獨立內容 review、48 檔語音核對、ASR 與 24 題 Preview 均已完成；隔離孩子流程完成 Try 8 題／Say 8 題，各概念兩題全對略過第三題，故事角色的動物在前替代排列亦實際判對；家長摘要兩模式均 Done、首次紀錄正確。正式發布與線上核對見 #99，詳細證據見 [qa.md](qa.md)。原音人耳、TTS 自然度、iPad 與孩子實測均未測；原音未下載。
