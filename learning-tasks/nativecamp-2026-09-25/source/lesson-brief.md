# 2026-09-25：Animals, poems, and sounds

以動物描述、詩歌標題、押韻尾音、作者身分與 There is／are，練習依明確情境組完整句。

課程：2026-09-25 08:00（Asia/Taipei），Edon。教材線索：Oxford Discover 1，印刷頁 28–33。共 5 個概念、30 題；每概念 3 題 Try it 與 3 題 Say it。Try 一輪 10–15 題；Say 每回一個概念、2–3 題。時間與孩子難度尚未實測。

本文件記內容設計與來源映射；音訊、原錄音核對、獨立審查、畫面與發布由本次主流程另記實際證據。未製作紙本。唯一可編輯題文為 [lesson-source.json](lesson-source.json)。

## 來源與判讀界線

依已觀察的網站課程逐字稿片段摘要選題。網站 speaker 標籤可能誤分，教材播放、跟讀、老師提示與孩子獨立回答尚不能只靠轉錄分開。下表每列的獨立／受助程度均為「未確定」，不以 ASR 結果評發音或宣稱已掌握。原始來源下載、解碼與關鍵片段核對由主流程另留紀錄；本內容製作者未獨立驗聽整堂錄音。

| 概念 | 來源時間 | 已觀察的教學內容 | 選題理由／範圍 |
| --- | --- | --- | --- |
| animal-descriptions | 05:19–07:41；11:09–12:48；21:26–24:59 | 課堂談到顏色、顏色組合，以及帶數量與顏色的動物詞組。 | 納入完整描述句；不把顏色配對另擴成一套脫離句型的單字題。 |
| title-predictions | 09:08–10:18 | 依標題預測內容，出現房間與動物家庭的題材線索。 | 納入暫定的預測；自創新標題，不把標題推測當成已知全文事實。 |
| rhyming-words | 18:04–19:59 | 以 tree／see、sun／fun、black／back、sky／high、dark／bark 比較相同尾音。 | 納入相同及不同尾音。rocks／logs 不作本題封閉正解。 |
| poem-authors | 20:13–21:18 | 課堂說明 author 是 writer，並談詩歌可寫顏色、動物與自然。 | 本概念只測作者與讀者的角色；自然景物留在虛構標題中，不混用兩個判分目標。 |
| there-is-are | 21:26–24:59 | 課堂明示一個用 There is、多個用 There are，並練動物與顏色詞組。 | 納入單複數存在句，與描述已指出動物的句子分開練習。 |

動物描述和 There is／are 雖都需要數的一致性，作答功能不同：前者描述已指出的動物，後者介紹場景中有什麼。原始詩文、原書題目及課堂完整逐字稿不作公開素材；所有詩題名與角色均為新寫。

## 目標與成功判準

| 概念 | 孩子要會什麼 | 易混淆處 | 成功判準 |
| --- | --- | --- | --- |
| animal-descriptions／Describe the animals | 用 The…is／are… 說完整動物描述。 | 一個／多個配到 is／are；顏色是已給資訊，不測顏色單字回想。 | 完整指出正確動物與顏色，單複數一致；可用 it／they 指明確對象。 |
| title-predictions／Use the title | 依標題說出合理、暫定的主題。 | this poem／these poems、is／are；標題只是線索。 | 用 I think、may 等暫定語氣作完整預測；一篇與兩篇的主詞及動詞一致。 |
| rhyming-words／Hear the ending | 比較字尾聲音，找押韻字或說明尾音不同。 | 以聲音而非只看拼字；相同與不同尾音。 | 選出真正押韻的一對，或完整說尾音不同；不接受只念一個候選字。 |
| poem-authors／Who is the author? | 分辨誰寫詩、誰只是讀詩。 | author／reader；改問讀者不能仍說是作者。 | 完整指出卡片上的作者；問讀者是否為作者時，需否定或指出真正作者。 |
| there-is-are／There is or there are | 用 There is／are 介紹場景中的動物。 | a／two／three、單複數名詞與 is／are。 | 需用 There 開始的完整存在句，數量、顏色、動物和動詞皆正確。 |

## 每概念六題與答案

下列問題／答案全部使用一般 TTS；完整 prompt、instruction、scene、spokenQuestion、tokens／choices、acceptedOrders、repair answer 與 Say accepted 以題文 JSON 為準。題卡提供情境所需資料；句首不預填受測的 is／are、either、has／have、because 或活動詞尾。Try 的 Start with 要求用來封閉句型與語序，口說則接受等義完整句。

### Describe the animals

Change 的實際判斷：兩隻變一隻，birds／are 必須改成 bird／is。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | animal-descriptions-try-1 | The two birds are red. |
| Try 2：change／order | animal-descriptions-try-2 | The bird is red. |
| Try 3：fix／repair | animal-descriptions-try-3 | The three rabbits are white. |
| Say 1 | animal-descriptions-say-1 | The frog is green. |
| Say 2 | animal-descriptions-say-2 | The three rabbits are black. |
| Say 3 | animal-descriptions-say-3 | The two birds are blue. |

Fix 只修「is」→「are」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Use the title

Change 的實際判斷：單篇變兩篇，this poem is 需變 these poems are，並概括共同的 animals 主題。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | title-predictions-try-1 | I think this poem is about a bird. |
| Try 2：change／order | title-predictions-try-2 | I think these poems are about animals. |
| Try 3：fix／repair | title-predictions-try-3 | I think this poem is about a tree. |
| Say 1 | title-predictions-say-1 | I think this poem is about a fish. |
| Say 2 | title-predictions-say-2 | I think these poems are about animals. |
| Say 3 | title-predictions-say-3 | I think this poem is about a tree. |

Fix 只修「are」→「is」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Hear the ending

Change 的實際判斷：tree／see 的押韻關係改成 tree／sun 的不同尾音判斷。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | rhyming-words-try-1 | Tree rhymes with see. |
| Try 2：change／order | rhyming-words-try-2 | Tree and sun sound different. |
| Try 3：fix／repair | rhyming-words-try-3 | Sky rhymes with high. |
| Say 1 | rhyming-words-say-1 | Sun rhymes with fun. |
| Say 2 | rhyming-words-say-2 | The ending sounds are different. |
| Say 3 | rhyming-words-say-3 | Black rhymes with back. |

Fix 只修「tree.」→「high.」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### Who is the author?

Change 的實際判斷：同一首詩改問 Ben，由肯定作者身分改成否定讀者的作者身分。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | poem-authors-try-1 | Ava is the author. |
| Try 2：change／order | poem-authors-try-2 | Ben is not the author. |
| Try 3：fix／repair | poem-authors-try-3 | Leo is the author. |
| Say 1 | poem-authors-say-1 | Mia is the author. |
| Say 2 | poem-authors-say-2 | Sam is not the author. |
| Say 3 | poem-authors-say-3 | Kim is the author. |

Fix 只修「reader.」→「author.」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

### There is or there are

Change 的實際判斷：一隻兔子變兩隻，a／is／rabbit 需改為 two／are／rabbits。

| Slot | Question ID | 完整示範答案 |
| --- | --- | --- |
| Try 1：build／order | there-is-are-try-1 | There is a black rabbit. |
| Try 2：change／order | there-is-are-try-2 | There are two black rabbits. |
| Try 3：fix／repair | there-is-are-try-3 | There is a green lizard. |
| Say 1 | there-is-are-say-1 | There is a red bird. |
| Say 2 | there-is-are-say-2 | There are three white rabbits. |
| Say 3 | there-is-are-say-3 | There are two green lizards. |

Fix 只修「are」→「is」；替換後須完全符合示範句。Say 可接受句逐題列在 accepted，仍需遵守成功判準，不以只說單字當完整回答。

## 題型、評級與內容檢查

- 新課原生 try 依序為 build/order、change/order、fix/repair；沒有 tryRevision，不改舊題或 progress。
- 每個排列題有 1 個混淆字。必要字須全選；同文字卡有不同 ID，等價交換順序均列入 acceptedOrders。Start with 與情境限定自然語序，不靠字卡初始位置提示答案。
- 每個 Fix 只有一個目標錯字，正確選項位置交錯；問題音訊不念修好的完整句。
- Say 先說再揭曉；家長按揭曉前表現給 Got it／With help／Not yet。先給目標字詞或示範後跟讀不能評 Got it。
- 前兩題獨立成功可收尾；有協助或錯誤才補第三題。完成不等於永久掌握，之後以 Weekly Review 新題複習，不重置首次紀錄。
- 孩子介面全英文、無 emoji；所有題卡均為原創，不重刊書中詩文或私人家庭內容。

## 音訊、再製與驗收

正式語音指定 OpenAI gpt-4o-mini-tts 系列，Marin，speed 1.0；本課問題與答案同聲，不加慢速指示。預計 60 個問題／答案音檔。音訊在內容獨立審查後由主流程製作；本文件不宣稱 MP3 已存在或通過驗收。

在 repo 根目錄執行：

```sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-25
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-25 --check
```

共用 builder 產生 docs/nativecamp/lessons/2026-09-25.json 與本目錄 speech-jobs.json；音訊另製並留 manifest。語音文字變動須重製受影響聲音，不能只重建題包。

內容自檢已用實際 NativeCampCore.validateLesson／checkAnswer 在記憶體執行：30 題 schema、3+3、stage、每個 order 一個 distractor、acceptedOrders 正解，以及 repair 唯一精確替換均通過。人工逐題檢查完整句、情境、目標詞提示與 Say 判準；「唯一精確替換」程式檢查本身不等同自然語意審查。未寫入 runtime 或 progress。

獨立 reviewer、音訊解碼／ASR、人耳自然度、桌面／窄版、iPad、孩子實測及正式發布均以主流程各自紀錄為準，不相互代替。家庭實測尚未提供，耗時與需協助差異均為未測。

## 整合結果

題文及語音改寫已通過獨立審查；來源音檔、公開TTS與隔離流程均有核對紀錄，見[本批驗證](../../../docs-dev/nativecamp-latest-five.md)。最終 spokenQuestion 與示範答案以 lesson-source.json 為準；本文件不據此新增孩子掌握度或發音評估。
