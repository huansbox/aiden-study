# 2026-09-16：Family and words

- 課程：2026-09-16 19:30，Edon；lesson ID：`2026-09-16`。
- 對象：已有一些英文基礎的小孩；Try it 自主，Say it 家長陪同。
- 來源與不確定界線：[evidence-review.md](evidence-review.md)。依[既定 SOP](../../nativecamp-review-pilot/lesson-sop.md)，不重新設計評級／跨日排程。
- 份量：3概念、每概念3 Try＋3 Say，共18題。首次Try回合6–9題；Say每回一個概念2–3題，前兩題獨立成功後第3題留隔天。實際時間尚未孩子測量。
- 授權：本次家長要求端到端製作、接入與語音比較；不新增孩子錄音或自動評分。

## 學習判準

| 概念 | Try it | Say it | 成功判準與提示界線 |
| --- | --- | --- | --- |
| My family | 關係卡選 uncle／aunt／cousin；三個答案位置各不同 | 換一側親屬／姓名，說 He／She is my… | 正確親屬且完整句；He is／He's、姓名句皆可。現有句框不是額外提示；家長說出uncle等目標詞則 With help。 |
| Make it short | I am→I'm、He is→He's，另1題點字排列 | 讀長句，自己縮寫後說全句 | 必須使用正確縮寫；讀出原本長句意思雖對，尚未完成本題的short form目標。畫面留空縮寫，題音不念正確縮寫。 |
| Opposites | old→young、hot→cold、small→big | 換方向 young→old、cold→hot、big→small，用完整句 | 目標反義詞正確且能完成短句。句框 `___ is the opposite.`；完整 `… is the opposite of …` 等自然替代也可。 |

所有Say答案未揭曉前可見句框；揭曉後保留。家長依揭曉前表現評 Got it／With help／Not yet，不把跟讀當獨立成功。

## 六題安排與可重建資料

逐題唯一來源為 [lesson-source.json](lesson-source.json)，包含 `prompt`、`instruction`、`scene`、`spokenQuestion`、`answerText` 及 `accepted`／`acceptedOrders`。`speech-jobs.json` 與正式題包皆由 builder 產生；不要直接只改公開 JSON。

- `family-roles`：Try使用 Mum's brother／Dad's sister／Aunt's son；Say使用 Dad's brother／Mum's sister／Uncle's daughter。關係和虛構姓名在卡片上清楚可見，不靠外貌猜性別。
- `short-forms`：Try為8歲／朋友／9歲；Say為7歲／弟弟／6歲。三變體皆短縮寫，不以提示直接給 I'm 或 He's。
- `opposites`：每模式三組詞全部各出一次；不是把同一句連續重讀三次。

使用兩個新 scene：`family-link {relation,name,pronoun}`、`word-card {text,heading}`，由 child／preview 共用 renderer；所有字串以純文字顯示。音檔加lesson日期前綴，保留9/15題包、音檔及學習進度。原始回放不公開。

## 驗收與家庭回饋

- 內容自動稽核：答案／關係／縮寫一致、source輸出一致、問音不含完整正解、18題與36音檔manifest對得上，保留舊課35音檔檢查。
- 語音：rate -2，解碼、bytes、SHA256、音長與RMS記於 [nativecamp-audio-manifest.json](nativecamp-audio-manifest.json)；不用「已生成」代替人耳自然度驗收。
- 上線／全repo檢查／瀏覽器結果由本堂README記實際完成狀態。iPad、人耳完整試聽、孩子作答難度：未測。
- 首堂家庭回饋是「使用效果不錯、TTS偏快、too前停頓不自然」；本堂採較慢設定，尚未得到本堂孩子回饋。
