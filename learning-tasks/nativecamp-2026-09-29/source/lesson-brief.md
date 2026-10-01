# 2026-09-29：Helping, manners, and school rules

課程：2026-09-29 20:00（Asia/Taipei），Zibuyile。教材線索：Oxford Discover 2，Unit 9，第 86–88 頁。6 個概念、36 題原創練習；每概念 3 題 Try it（Build／Change／Fix）及 3 題 Say it。Try 一輪 12–18 題；Say 每回一個概念、2–3 題。孩子實測難度與耗時未測。

唯一可編輯題文為 [lesson-source.json](lesson-source.json)。本次以課堂內容線索設計確認題，不據此判定孩子已掌握、固定犯錯或發音表現。

## 來源與判讀界線

主流程從已登入的 Chrome 課程頁讀取網站逐字稿，交付本堂的時間與教學內容摘要。以下為內容製作者使用的來源映射；來源音檔、下載及關鍵片段核對由主流程另存實際證據。網站逐字稿、ASR 與 speaker 標籤不能單獨分清老師提示、跟讀與孩子獨立回答。各概念的獨立／受助程度均記為未確定；本內容製作者未自行整堂驗聽。

| 概念 | 來源時間 | 觀察到的教學範圍 |
| --- | --- | --- |
| people-actions | 03:41–06:34 | 用較長句描述兩人玩遊戲、拍手、互相面對與所在位置。 |
| help-by | 06:55–08:58 | 談幫老師給學生書本，以及藉由拖地幫忙。 |
| join-two-actions | 09:21–10:57 | 在一個回答中說出兩項幫忙內容：接送與洗衣、煮飯與檢查作業。 |
| polite-patient | 14:33–16:24；20:40–22:06 | 說 please／thank you 表禮貌；明確比較 polite 與 patient，後者指平靜等待。 |
| helper-roles | 13:07–14:46；16:38–19:52；22:35–23:25 | 介紹 librarian、principal、crossing guard、lifeguard，並配對工作與場所。 |
| classroom-rules | 22:10–22:27；23:36–25:18 | 談整理物品、輪流，以及課堂中 can／cannot 的行為規則。 |

公開題文中的 Mia、Jo、Tom、Leo、父母、教室規則與情境均為虛構。課堂家庭內容改成故事角色，不刊孩子的家庭事實、私人原話或完整逐字稿。principal 採工作角色的正確拼字；網站轉錄中的 principle 不作另一個受教概念。沒有根據紅綠燈顏色製作真實過街指示。

## 目標、混淆與成功判準

| 概念 | 孩子要會什麼 | 易混淆處 | 成功判準 |
| --- | --- | --- | --- |
| people-actions | 用現在進行的完整句說明角色正在做什麼。 | 兩人用 are；一人用 is，代名詞也隨角色一致。 | 動作與角色符合卡片，保留 be + -ing 的完整句。 |
| help-by | 用 help by + -ing 說出怎麼幫忙。 | by 後用 mopping／cleaning／giving，不用原形動詞。 | 句子包含誰幫忙與 by + -ing 的具體方法；可補 the teacher。 |
| join-two-actions | 用 and 把兩件事接成完整句。 | and 表示兩件都做；or 表示選擇，不符合兩件都發生的卡片。 | 完整包含卡片兩項動作；口說與組句都接受兩動作順序互換。 |
| polite-patient | 依具體行為，在完整句中區分 polite 與 patient。 | 兩者不是同義字；不把鞠躬或讓座當唯一判準。 | 用正確人物與 is + polite／patient 描述卡片指定的行為；不推定人物只有一種特質。 |
| helper-roles | 完整說出工作者是誰，以及做什麼或在哪裡幫忙。 | librarian 幫找書；principal 領導學校；crossing guard 在街道協助通行；lifeguard 在泳池救生。 | 人物角色與功能一致，不能只回答工作名稱單字。 |
| classroom-rules | 用 can／cannot 完整說出這張卡片的允許或禁止。 | 依卡片規則判斷，不把一般好行為推成所有教室都相同的規則。 | 主詞、can／cannot 及動作完整；cannot／can't 皆可。 |

完整句按概念需要決定長度，不為增加單字加入課內未確認的 because／when 等新語法。polite／patient 重點是精準選詞，所以可用 Mia is polite. 這類簡短完整句；工作者題則需帶功能或場所，不能只說 Librarian。

## 每概念六題

完整 prompt、instruction、scene、spokenQuestion、hint、explanation、tokens／choices、acceptedOrders 與 Say accepted 以 JSON 為準。以下為家長核對索引。

### Tell what people are doing

Change 的實際判斷：兩個女孩改成只有 Mia；are／their 改成 is／her。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | people-actions-try-1 | The girls are clapping their hands. |
| Try 2：change／order | people-actions-try-2 | Mia is clapping her hands. |
| Try 3：fix／repair | people-actions-try-3 | The girls are facing each other. |
| Say 1 | people-actions-say-1 | The girls are playing a game. |
| Say 2 | people-actions-say-2 | Mia is clapping her hands. |
| Say 3 | people-actions-say-3 | The girls are facing each other. |

Fix 只替換 is → are。

### Say how you help

Change 的實際判斷：把 I clean the floor. 改寫成說明幫忙方法的完整句；需加 help by 並把 clean 變 cleaning。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | help-by-try-1 | I help by mopping the floor. |
| Try 2：change／order | help-by-try-2 | I help by cleaning the floor. |
| Try 3：fix／repair | help-by-try-3 | We help by giving books to children. |
| Say 1 | help-by-say-1 | I help by giving books to children. |
| Say 2 | help-by-say-2 | We help by cleaning the floor. |
| Say 3 | help-by-say-3 | I help by mopping the floor. |

Fix 只替換 give → giving。

### Put two actions in one sentence

Change 的實際判斷：將兩個同主詞的短句合併，只保留一個 They；不是單純替換人物名字。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | join-two-actions-try-1 | They cook food and wash clothes. |
| Try 2：change／order | join-two-actions-try-2 | They take Leo to school and wash clothes. |
| Try 3：fix／repair | join-two-actions-try-3 | They cook food and check homework. |
| Say 1 | join-two-actions-say-1 | They cook food and check homework. |
| Say 2 | join-two-actions-say-2 | They take Leo to school and wash clothes. |
| Say 3 | join-two-actions-say-3 | They wash clothes and cook food. |

Fix 只替換 or → and。

### Polite words and patient waiting

Change 的實際判斷：從用禮貌用語改成平靜等輪流，改判斷受描述的行為。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | polite-patient-try-1 | Mia is polite at school. |
| Try 2：change／order | polite-patient-try-2 | Mia is patient. |
| Try 3：fix／repair | polite-patient-try-3 | Tom is polite. |
| Say 1 | polite-patient-say-1 | Mia is polite. |
| Say 2 | polite-patient-say-2 | Tom is patient. |
| Say 3 | polite-patient-say-3 | Jo is patient. |

Fix 只替換 patient. → polite.。

### Tell what helpers do

Change 的實際判斷：從泳池求助切換成過街情境；重新配對工作者與功能，而非只換人物名字。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | helper-roles-try-1 | A librarian helps children find books. |
| Try 2：change／order | helper-roles-try-2 | A crossing guard helps people cross the street. |
| Try 3：fix／repair | helper-roles-try-3 | The principal leads the school. |
| Say 1 | helper-roles-say-1 | A librarian helps children find books. |
| Say 2 | helper-roles-say-2 | A lifeguard helps people at the pool. |
| Say 3 | helper-roles-say-3 | The principal leads the school. |

Fix 只替換 librarian → principal。

### Say what classroom rules allow

Change 的實際判斷：新規則由可遊戲改為現在不准遊戲，將 can 改成 cannot。

| Slot | Question ID | 示範答案 |
| --- | --- | --- |
| Try 1：build／order | classroom-rules-try-1 | We can clean up the classroom. |
| Try 2：change／order | classroom-rules-try-2 | We cannot play now. |
| Try 3：fix／repair | classroom-rules-try-3 | We cannot fight in the classroom. |
| Say 1 | classroom-rules-say-1 | We can clean up the classroom. |
| Say 2 | classroom-rules-say-2 | We cannot fight in the classroom. |
| Say 3 | classroom-rules-say-3 | We can help the teacher. |

Fix 只替換 can → cannot。

## 題型與提示檢查

- 新課原生 try 依序為 build/order、change/order、fix/repair，沒有 tryRevision，不更動舊課或進度。
- 18 題 Try 均有可選 hint 與揭曉後 explanation；提示講判斷方法，解釋指出語法或情境理由，不只重印答案。按提示後由既有流程記為受助。
- 每個 order 有 1 個合理混淆字。兩項動作可交換順序；clean up 的粒子可放在受詞前後；now 的自然位置均納入 acceptedOrders。其他順序依 Start with 和文字情境判斷。
- 每個 Fix 只有一個可替換的錯詞；不是缺字，替換後與 answerText 一致。and 修正題的口頭情境列兩項工作，不先念出受測的連接字。
- 所有 scene 均為 word-card，標題為 Read the situation 或文字卡功能，沒有虛稱看圖。卡片短、單一判斷，不同時加入陌生單字與多項語法陷阱。
- 18 題 Say 都有 instruction 句首，依既有畫面顯示在深色作答區，揭曉後保留。句首按概念提示結構，不預填 polite／patient、工作角色或 can／cannot。help by 題提供已指定句型，仍需自己形成 -ing 方法。
- Say accepted 列合理替代完整句，家長依上表判準接受其他等義句；角色、兩項動作、語意與受測句型仍須成立，不將單字短答評為完整句成功。
- Say 先說再揭曉，按揭曉前表現評 Got it／With help／Not yet。題目預設句首及重播不算額外提示；先供目標字詞或示範後跟讀不能評 Got it。
- 前兩題獨立成功可收尾；有錯誤或協助才補第三題。完成不等於永久掌握，不重置首次結果。獎勵由既有回合結束畫面處理。

## 音訊、再製與驗收

正式語音固定 OpenAI Cedar、speed 1.0；本課問題與答案同聲，不加慢速指示。預計 72 個問題／答案音檔，由主流程製作。本文件不將題文存在當成音訊完成。

在 repo 根目錄執行：

~~~sh
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-29
uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson 2026-09-29 --check
~~~

builder 產生 docs/nativecamp/lessons/2026-09-29.json 與 source/speech-jobs.json。語音文字變更須重製受影響聲音並核對 manifest；僅重建題包不代表音文一致。

內容自檢已通過：shared builder 在記憶體產生 36 題與 72 項 speech jobs；NativeCampCore.validateLesson／checkAnswer 通過 schema、12 題 order 的 17 組可接受語序、6 題 repair 的唯一精確替換，以及每個修正組合的判分核對。18 題 Try 的 hint／explanation 與 18 題 Say 的句首／替代答案皆已檢查。過程沒有寫入生成題包、音檔或學習進度。自然語意與來源對應已由內容製作者逐題自讀，仍需主流程的獨立審查；機械驗證不能代替語意審查。

獨立內容審查、原錄音及 TTS 核對、音訊解碼／ASR、人耳自然度、桌面／窄版、iPad、孩子實測與正式發布，以主流程各自的紀錄為準。工作追蹤 [#140](https://github.com/huansbox/aiden-study/issues/140)。
