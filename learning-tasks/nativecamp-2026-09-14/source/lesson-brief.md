# 2026-09-14：Family and stories

- 課程：2026-09-14 19:30，Edon；lesson ID：`2026-09-14`。
- 對象：已有一些英文基礎的小孩；家長陪同口說，要求能說完整短句。
- 來源與不確定界線：[evidence-review.md](evidence-review.md)。沿用[既定 SOP](../../nativecamp-review-pilot/lesson-sop.md)，不為湊三概念而加題。
- 份量：2概念、各3 Try＋3 Say，共12題；Try首回4–6題，Say每回一概念2–3題。實際時間未孩子測量。
- 授權：端到端製作、接入與語音比較；不新增孩子錄音或評音。

## 為什麼選這兩個

| 概念 | 來源／取捨 | 題目與成功判準 |
| --- | --- | --- |
| My grandparents | 課內教family字，老師解釋母親／父親的父母；看圖辨識曾有老師提示。不重複9/16的uncle/aunt/cousin。 | 關係卡辨 grandmother／grandfather／grandparents，Say換另一側關係且說完整句。grandma／grandpa與縮寫都是合理替代。 |
| What is it about? | 課內看圖預測後讀house/toys短文；house答案先由老師示範，toys有句首提示。本次做短文主題確認，不宣稱已獨立會預測。 | 原創兩句短文，在house／toys／family三主題中辨別；Say使用同主題不同句子並說 It is about…，不要求自由推測。 |

沒有納入：counting原課已能回答且9/15另有數量練習；朋友描述與個人喜好沒有唯一答案，不硬改為封閉記憶題；班上朗讀不能直接當理解測驗。公開題目不含孩子真實姓名、居住地或家庭事實。

## 題目安排

- `grandparents` Try：Mum's mum／Dad's dad／Mum's mum and dad；Say：Dad's mum／Mum's dad／Dad's mum and dad。名字全是虛構。`family-link` 關係卡讓答案可核對，無須記住課本人物。
- `story-topic` Try：紅門與房間／玩具車與火車／一家人互助；Say：藍門住宅／玩具飛機與車／兄弟和父母同住。以原創短文取代教材全文，圖卡只有必要文字；題音讀短文再提問，孩子可聽或讀。
- Say句框是 `She／He／They …` 或 `It is about ___.`，不先給親屬詞／主題。只答單字還沒完成完整句目標；家長提供目標詞後答對記 With help。依揭曉前表現評級，不把後續跟讀算 Got it。
- 主題題接受意思相同的 `It's about…`、`my/our house`、`my/our family` 等自然完整句；每題替代範圍列在source。

唯一可編輯題文來源為 [lesson-source.json](lesson-source.json)，內含獨立 `spokenQuestion` 欄位；[speech-jobs.json](speech-jobs.json)與[正式題包](../../../docs/nativecamp/lessons/2026-09-14.json)由共用builder生成。每題問題與答案各一音檔，共24個；音檔帶lesson前綴，不覆寫其他堂。

## 驗收與家庭回饋

- 內容稽核檢查12題／24音檔、題文／問題音／答案音、親屬關係與封閉答案一致；不以教師示範／ASR遺漏推斷孩子的掌握度。
- TTS採Zira rate -2；[manifest](nativecamp-audio-manifest.json)記實際音長、bytes、hash、完整解碼及RMS。已生成不代表人耳自然度通過。
- 瀏覽器、完整tests與正式發布狀態記本堂README；iPad、人耳完整試聽、孩子本堂作答難度未測。
