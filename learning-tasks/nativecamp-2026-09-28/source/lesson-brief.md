# 2026-09-28 Alex：動物課的分步複習

時間：20:00（Asia/Taipei），同日早上的另一堂不包含於本 task。製作追蹤 [#140](https://github.com/huansbox/aiden-study/issues/140)。

## 本次調整

家長反映近期動物教材較難；這是家長回饋，不等於錄音或 ASR 已證明孩子有固定錯誤。課內同時出現 animal groups、body coverings、body parts、lay eggs、gills 與 land/water。複習拆成六個不同目標，而非再加幾題同句替換。

- 提供短英文 fact card，把非本題目標的動物知識留在眼前，主要練把資訊說成完整句；不是閉卷生物測驗。
- Build 先組短句；Change 一次處理一個主要改變（改分類判斷、單複數、肯否或增加另一個成立的事實）。
- 每道 Try 都有可選 hint，先指出判斷方法；按提示後成功保留 helped，不算首次獨立成功。explanation 用於教學說明。
- Say 1 說單一事實；Say 2 做簡單對比；Say 3 是需要協助時的補強。棲地第三題回到單一地點完整句，不增加合併兩個地點的負担。
- 每概念 Try/Say 各三個可用變體。前兩題首次獨立成功仍省略第三題，沒有第四題、沒有自動重新開啟完成的課。
- 6 概念共 36 題；Try 一輪實際 12–18 題，Say 每回一個概念、2–3 題。不宣稱孩子實測時間或難度已通過。

## 目標、混淆與成功標準

| 概念 | 目標 | 需要分清的事 | 完整句成功標準 |
| --- | --- | --- | --- |
| animal-groups | 說動物所屬類別 | mammal/amphibian 是群組，skin 不是 | 用 is/are 說類別；改成 frog 時不仍說 mammal |
| animal-coverings | 描述體表 | feathers/fur/scales 與 eggs 不同 | 以 has/have 完整描述卡片中的動物；一隻用 has |
| animal-wings | 指出有無及部位數量 | wings 是部位；orangutans 沒有 wings | 數量正確；需要否定時用 do not have |
| animal-eggs | 描述是否產卵 | lay eggs 和 have feathers 不是同一件事 | 雞產卵、貓不產卵，完整肯定或否定句 |
| gills-breathing | 說明鰓的作用，修正只有魚有鰓的說法 | 功能不等於體表；其他動物也可能有鰓 | 呼吸句與情境一致，能加入 crabs 的事實 |
| frog-habitats | 說本題青蛙可生活的地方 | in water / on land | 先說一個地點，再說另一個；需要補強時再說一個地點 |

## 來源映射與限制

Native Camp 紀錄與網站逐字稿由已登入的 Chrome 核對。課內教材連結指向 Oxford Discover 2；原音前段提到 Unit 1、page 6，後續換下一頁。原音有三條 track，其中第二条只有短暫片段；網站逐字稿只顯示相當於 track 3 的尾段，不能用這份文字冒充全課。

| 概念 | 來源線索（各 track 從零起算） |
| --- | --- |
| animal-groups | track 1 09:11–10:38；track 3 00:12–00:26、03:24–04:22 |
| animal-coverings | track 1 11:27–12:10、13:41 之後；track 3 01:44–03:24 |
| animal-wings | track 1 13:07–13:41；track 3 00:26–01:44 |
| animal-eggs | track 1 09:11–10:38；track 3 01:23–01:44、03:55–04:03 |
| gills-breathing | track 1 12:11–12:46；track 3 04:22–05:38（教師更正 only fish） |
| frog-habitats | track 1 10:42–11:23；track 3 05:39–06:15 |

詳細錄音雜湊、下載完整性與實際抽樣範圍以 [evidence-review.md](evidence-review.md) 與 [download-verification.json](download-verification.json) 為準；細部轉錄只存 private。混音與分聲道 ASR 都不能當人耳驗聽、說話者完整分離或孩子獨立能力評分。

## 科學內容邊界

保留老師在尾段修正的「不只有魚有鰓」。題目使用卡片指定的 fish、crabs、baby frogs，不把兩棲類全部說成同一種呼吸方式。[Smithsonian 的兩棲類資料](https://qrius.si.edu/browse/object/10025484) 說明鰓、成長與陸地適應的差異。

產卵題限定雞與貓，不教「所有哺乳類都不產卵」；存在產卵的哺乳類，见 [Australian Museum](https://australian.museum/learn/species-identification/ask-an-expert/what-is-a-monotreme/)。題目不要求記額外例外名詞，只避免把課內簡化說成普遍定律。也不教「有翅膀的鳥一定會飛」。以上外部來源於 2026-10-01 核對。

## 再製與驗收

完整題目、token IDs、替換位置與接受句在 [lesson-source.json](lesson-source.json)；OpenAI Marin、正常速度 1.0、問題與答案同聲。原創題文經獨立內容審查後再付費製音，不上傳教師或孩子原錄音。全批音訊、ASR、隔離 Preview/孩子頁面、CI 與正式資源核對由 #140 記錄；本文件不把尚未完成的驗收寫為通過。
