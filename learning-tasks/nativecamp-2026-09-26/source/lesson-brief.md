# 2026-09-26：Homes, rooms, and reasons

以虛構住家與人物練位置、否定附和、房間描述、理由、enjoy 後接活動，以及 When 條件句。

課程：2026-09-26 20:00（Asia/Taipei），Danielle。教材線索：Oxford Discover 1，第 127 頁，Where Do We Live?。共 6 個概念、36 題；每概念 3 題 Try it 與 3 題 Say it。Try 一輪 12–18 題；Say 每回一個概念、2–3 題。時間與孩子難度尚未實測。

本文件記內容設計與來源映射；音訊、原錄音核對、獨立審查、畫面與發布由本次主流程另記實際證據。未製作紙本。唯一可編輯題文為 [lesson-source.json](lesson-source.json)。

## 來源與判讀界線

依已觀察的網站課程逐字稿片段摘要選題。網站 speaker 標籤可能誤分，教材播放、跟讀、老師提示與孩子獨立回答尚不能只靠轉錄分開。下表每列的獨立／受助程度均為「未確定」，不以 ASR 結果評發音或宣稱已掌握。原始來源下載、解碼與關鍵片段核對由主流程另留紀錄；本內容製作者未獨立驗聽整堂錄音。

| 概念 | 來源時間 | 已觀察的教學內容 | 選題理由／範圍 |
| --- | --- | --- | --- |
| home-locations | 03:01–04:22；10:57–12:40 | 課堂看圖說看到樹木、水上住家，並比較水上與陸地住家，也談乘船上學。 | 用虛構房屋的位置與否定句確認理解，不放孩子真實住宅位置。 |
| negative-either | 07:33–07:50 | 逐字稿呈現明確教學更正：否定附和由 too 改為 either。 | 只記課堂出現此教學，不據 speaker 標籤認定孩子有穩定錯誤。 |
| home-rooms | 14:24–18:48 | 課堂以 has 描述房間，提到 bedroom、bathroom、study、living room 與 kitchen。 | 使用虛構房屋與數量練 has／have，不保存家庭真實房間數或配置。 |
| room-reasons | 19:13–19:46 | 課堂用 because 說喜歡某房間的原因，包含在 living room 看電視的理由。 | 改用原創的閱讀、休息、烹調與遊戲情境，保留房間加理由的完整句。 |
| enjoy-activities | 20:03–20:43 | 課堂提到 enjoy playing board games 與喜歡的 card game。 | 納入 enjoy + -ing；活動與人物均為虛構。 |
| when-dangerous | 23:01–25:16 | 課堂談 neighbourhood，使用 When there are many cars, it can be dangerous。 | 保留 when 條件及 can be 的可能性，不改成必然危險的斷言。 |

所有住家、房間數、角色與喜好均為虛構。沒有任何題目要求孩子透露真實家庭資訊。水上船隻的危險情境是原創遷移題，並非聲稱課堂曾逐字教過該句。

## 目標與成功判準

| 概念 | 孩子要會什麼 | 易混淆處 | 成功判準 |
| --- | --- | --- | --- |
| home-locations／Homes on land and water | 完整說出虛構房屋在水上或陸地上，並修正不再成立的位置敘述。 | on water／on land、肯定與否定。 | 位置符合卡片；否定原位置或改說正確位置皆可，句子必須完整。 |
| negative-either／Agree with a negative | 以完整否定句加 either 表達與另一人相同的情況。 | 否定附和用 either，不用 too／also 放在句尾。 | 保留否定和 either；do not／don’t 均可。Me neither 是自然短答，但未達本題完整句目標。 |
| home-rooms／Tell me about the rooms | 用 has／have 說出房屋有的房間與數量。 | 單數 house has／複數 houses have。 | 主詞、房間種類、數量及 has／have 都正確；There are 是自然改述，但未示範本題 has／have。 |
| room-reasons／Say why you like a room | 用 because 連接喜歡的房間與符合題卡的原因。 | 理由需支持選擇；and 未明說因果關係。 | 完整包含房間和 because 引出的原因；主詞符合角色，口說可接受自然同義理由。 |
| enjoy-activities／Activities we enjoy | 用 enjoy／enjoys 後接 -ing 活動。 | enjoy playing，不用 enjoy play；she／he 後用 enjoys。 | 保留 enjoy + -ing，活動與主詞符合卡片；只改用 like 未達本題目標。 |
| when-dangerous／Tell me when | 用 When 子句與完整結果句，說出什麼情境可能危險。 | there is／are 和數量一致；can be 表示可能。 | 包含卡片條件與 can be dangerous 的完整結果；口說可把 when 子句放前或放後。 |

## 每概念六題與答案

下列問題／答案全部使用一般 TTS；完整 prompt、instruction、scene、spokenQuestion、tokens／choices、acceptedOrders、repair answer 與 Say accepted 以題文 JSON 為準。題卡提供情境所需資料；句首不預填受測的 is／are、either、has／have、because 或活動詞尾。Try 的 Start with 要求用來封閉句型與語序，口說則接受等義完整句。

### Homes on land and water

Change 的實際判斷：房子移到陸地，原先在水上的肯定敘述需改為否定。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | home-locations-try-1 | The house is on the water. |
| Try 2：change／order | home-locations-try-2 | The house is not on the water. |
| Try 3：fix／repair | home-locations-try-3 | The house is on land. |
| Say 1 | home-locations-say-1 | The house is on the water. |
| Say 2 | home-locations-say-2 | The house is not on the water. |
| Say 3 | home-locations-say-3 | The houses are on land. |

Fix 只修「water.」→「land.」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Agree with a negative

Change 的實際判斷：I like rain too 改為否定情境，需加入 do not 並改用 either。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | negative-either-try-1 | I do not know either. |
| Try 2：change／order | negative-either-try-2 | I do not like rain either. |
| Try 3：fix／repair | negative-either-try-3 | I do not know either. |
| Say 1 | negative-either-say-1 | I do not know either. |
| Say 2 | negative-either-say-2 | I do not like rain either. |
| Say 3 | negative-either-say-3 | I do not have a boat either. |

Fix 只修「too.」→「either.」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Tell me about the rooms

Change 的實際判斷：一棟變兩棟，主詞及 has／have 需一致；卡片已給總數，不另測加法。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | home-rooms-try-1 | The house has three bedrooms. |
| Try 2：change／order | home-rooms-try-2 | The houses have six bedrooms. |
| Try 3：fix／repair | home-rooms-try-3 | The house has two bathrooms. |
| Say 1 | home-rooms-say-1 | The house has two bathrooms. |
| Say 2 | home-rooms-say-2 | The houses have two studies. |
| Say 3 | home-rooms-say-3 | The house has four bedrooms. |

Fix 只修「have」→「has」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Say why you like a room

Change 的實際判斷：改為代表兩位朋友，I／I 改為 We／we，房間與理由也符合新情境。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | room-reasons-try-1 | I like the kitchen because I can cook. |
| Try 2：change／order | room-reasons-try-2 | We like the living room because we can play. |
| Try 3：fix／repair | room-reasons-try-3 | I like the study because I can read. |
| Say 1 | room-reasons-say-1 | I like the bedroom because I can rest. |
| Say 2 | room-reasons-say-2 | I like the study because I can read. |
| Say 3 | room-reasons-say-3 | We like the living room because we can play games. |

Fix 只修「but」→「because」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Activities we enjoy

Change 的實際判斷：從自己轉述 Mia，I enjoy 改為 She enjoys，活動也配合新人物。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | enjoy-activities-try-1 | I enjoy playing board games. |
| Try 2：change／order | enjoy-activities-try-2 | She enjoys reading books. |
| Try 3：fix／repair | enjoy-activities-try-3 | I enjoy playing card games. |
| Say 1 | enjoy-activities-say-1 | I enjoy reading books. |
| Say 2 | enjoy-activities-say-2 | We enjoy playing card games. |
| Say 3 | enjoy-activities-say-3 | He enjoys playing board games. |

Fix 只修「play」→「playing」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Tell me when

Change 的實際判斷：很多車改為一輛快車，there are／cars 改成 there is／a fast car，保留可能性。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | when-dangerous-try-1 | When there are many cars, it can be dangerous. |
| Try 2：change／order | when-dangerous-try-2 | When there is a fast car, it can be dangerous. |
| Try 3：fix／repair | when-dangerous-try-3 | When there are many cars, it can be dangerous. |
| Say 1 | when-dangerous-say-1 | When there are many cars, it can be dangerous. |
| Say 2 | when-dangerous-say-2 | When there is a fast car, it can be dangerous. |
| Say 3 | when-dangerous-say-3 | When there are many boats, it can be dangerous. |

Fix 只修「is」→「are」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

## 題型、評級與內容檢查

- 新課原生 try 依序為 build/order、change/order、fix/repair；沒有 tryRevision，不改舊題或 progress。
- 每個排列題有 1 個混淆字。必要字須全選；同文字卡有不同 ID，等價交換順序均列入 acceptedOrders。Start with 與情境限定自然語序，不靠字卡初始位置提示答案。
- 每個 Fix 只有一個目標錯字，正確選項位置交錯；問題音訊不念修好的完整句。房間理由 Fix 中 and 雖可組成兩個並列事實，未表達要求的因果，不符合本題判準。
- Say 先說再揭曉；家長按揭曉前表現給 Got it／With help／Not yet。先給目標字詞或示範後跟讀不能評 Got it。
- 前兩題獨立成功可收尾；有協助或錯誤才補第三題。完成不等於永久掌握，之後以 Weekly Review 新題複習，不重置首次紀錄。
- 孩子介面全英文、無 emoji；所有題卡均為原創，不重刊書中詩文或私人家庭內容。

## 音訊、再製與驗收

正式語音指定 OpenAI gpt-4o-mini-tts 系列，Cedar，speed 1.0；本課問題與答案同聲，不加慢速指示。預計 72 個問題／答案音檔。音訊在內容獨立審查後由主流程製作；本文件不宣稱 MP3 已存在或通過驗收。

在 repo 根目錄執行：

```sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-26
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-26 --check
```

共用 builder 產生 docs/nativecamp/lessons/2026-09-26.json 與本目錄 speech-jobs.json；音訊另製並留 manifest。語音文字變動須重製受影響聲音，不能只重建題包。

內容自檢已用實際 NativeCampCore.validateLesson／checkAnswer 在記憶體執行：36 題 schema、3+3、stage、每個 order 一個 distractor、acceptedOrders 正解，以及 repair 唯一精確替換均通過。人工逐題檢查完整句、情境、目標詞提示與 Say 判準；「唯一精確替換」程式檢查本身不等同自然語意審查。未寫入 runtime 或 progress。

獨立 reviewer、音訊解碼／ASR、人耳自然度、桌面／窄版、iPad、孩子實測及正式發布均以主流程各自紀錄為準，不相互代替。家庭實測尚未提供，耗時與需協助差異均為未測。

## 整合結果

題文及語音改寫已通過獨立審查；來源音檔、公開TTS與隔離流程均有核對紀錄，見[本批驗證](../../../docs-dev/nativecamp-latest-five.md)。最終 spokenQuestion 與示範答案以 lesson-source.json 為準；本文件不據此新增孩子掌握度或發音評估。
