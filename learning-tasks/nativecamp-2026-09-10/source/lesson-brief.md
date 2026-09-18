# 2026-09-10：Animals in full sentences

題文、公開題包與 36 個問題／答案 MP3 已完成。3 個概念，各 3 題 Try it 與 3 題 Say it，共 18 題；正式音色為 OpenAI Cedar、speed 1.0。課堂與教材交叉核對、來源限制見 [evidence-review.md](evidence-review.md)；本文件不做孩子程度或錯誤診斷。

## 目標與家長判準

| 概念 | 成功判準 | 合理替代句／界線 |
| --- | --- | --- |
| Animal homes | 說出卡片中的動物與家園，單數配 `lives`、複數配 `live`，包含完整主詞與動詞。 | `The sharks live in the ocean.`／`They live in the ocean.` 都可；複數動物用 `They`、單數用 `It`。不能只答 `ocean` 或 `in the ocean`。判準是卡片故事，不是宣稱所有動物只有一種家園。 |
| Animal food | 依明示動物數量與食物，用 `eats`／`eat` 組完整句。 | `The cow eats grass.`／`It eats grass.` 都可；合理補上 `for lunch` 仍可接受。只有食物名或缺動詞未達目標。`is eating` 表達當下動作，與本題的 `eat/eats` 練習不同，家長可先請孩子使用本課句型，該題記 With help。 |
| Pretend animals | 依角色卡用第一人稱說完整動物身份，並選對 `a/an`。 | `I am an octopus.`／`I'm an octopus.` 都可；`I am` 及 `I'm` 不分高低。只說動物名、說成第三人稱、漏冠詞或選錯冠詞都尚未達本題目標。依發音選冠詞，不額外考字母規則。 |

Try it 全部是排列題，每題只有 1 個混淆字；`live/lives`、`eat/eats` 或 `a/an` 直接對應該概念。沒有加入陌生時態或不必要陷阱。題目限制句首 `The` 或 `I`，使字卡的完整答案明確；可交換的相同文字卡不另判錯。

Say it 的畫面 `instruction` 只保留 `The …`／`I …` 短句首，不預填 `live/lives`、`eat/eats` 或 `a/an`。完整句要求留在問題語音。口說接受自然等義答案，不要求逐字等於示範；明確代名詞也可，但要保留目標的單複數與冠詞。

各概念的同一模式內，場景皆有變化。食物來源只有牛／草及松鼠／堅果，因此保留食物配對，只改動單複數與餐食卡；不假裝這是三種全新動物常識。Try it 與 Say it 分開評估，閱讀字卡後能排列不等於已能獨立口說。

依揭曉前表現評 Got it／With help／Not yet；家長供應答案字詞或先示範後跟讀不能記 Got it。前兩題首次獨立成功可收尾，否則補第 3 題；完成後以新週題複習，不清除首次結果或要求重做同課。

## 製作與驗收

[lesson-source.json](lesson-source.json)是題文真相源，共用 builder 產生題包與 speech jobs。新文字須製作對應 Cedar 音檔；問題不得先說完整答案，冠詞題亦不得在提供動物名稱時偷偷帶入正確冠詞。

獨立內容 review 已通過；三堂整合 Node 552 項通過、Python 247 項通過／1 項略過，120 個 MP3 完整解碼與 hash 均通過。本堂 [audio manifest](nativecamp-audio-manifest.json)記錄 36 個檔案；[問題音檔 ASR](nativecamp-questions-asr.json)涵蓋本堂 18 題（三堂共 60 題），[TTS ASR 抽查](nativecamp-tts-asr.json)另記本堂 6 筆（三堂共 20 筆）。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-10)供家長檢視。瀏覽器驗收、發布 commit／CI／正式資源核對結果見 [#97](https://github.com/huansbox/aiden-study/issues/97) 及其關聯 PR。原始課程錄音未落檔，原音獨立人耳核對、TTS 人耳自然度、iPad 真機與孩子實測未完成；ASR 與技術檢查不代表這些項目已通過。
