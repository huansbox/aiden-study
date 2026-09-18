# 首週新題：2026-09-14～09-20

本包有14個候選概念、84題、168個問題／答案音檔。App各模式選4個概念：3個本週、1個較早；依首次表現優先選需要協助／錯誤的概念，也保留成功範例。開始時固定兩模式各自的概念與順序，重整、跨日續作不重抽。Try實際8–12題；Say每個選入概念2–3題，不把整個題庫一次要求做完。

`weekStart=2026-09-14`、`weekEnd=2026-09-20`、`opensOn=2026-09-20`，日期使用Asia/Taipei。完成只代表本包份量完成，未熟結果仍供後續週題選取，孩子不能重開完成包。

## 候選來源與新情境

| 原課 | 原概念 | 本週新題 |
| --- | --- | --- |
| 09-14 | grandparents | 新名字與關係組合，改用完整句排列；口說使用不同人物。 |
| 09-14 | story-topic | 原創小故事判斷toys／house／family，再組成完整主題句。 |
| 09-15 | is-are | 換用不同物件與數量，辨單複數並造完整There句。 |
| 09-15 | odd-even | 使用11–16等新數量判斷奇偶，Try組完整判斷句，Say說出判斷。 |
| 09-15 | too-many | 新箱子容量與物件數，必須用可見數量說明為何放不下。 |
| 09-16 | family-roles | 用Pat的虛構家庭小情境說aunt／uncle／cousin，完整句取代舊單字選擇。 |
| 09-16 | short-forms | 新完整句做I am／He is縮寫變換，保留整句資訊。 |
| 09-16 | opposites | 由熟悉反義詞建立完整關係句；Try正反兩種自然關係句皆接受。 |
| 09-17 | school-tools | 新任務包含帶書、寫故事、畫一條線；Say分別擦線、帶物品、找可寫清單的小本子。 |
| 09-17 | supplies-together | 全新虛構數量與文具組合，正確加總後說完整句。 |
| 09-17 | counting-now | Tom和Ann從四數到六的新場景，分辨正在數的文具。 |
| 09-17 | same-age | Jo和Lee的虛構同齡情境，年齡與句型組合不同於原課。 |
| 09-13（較早） | season-actions | 新假想計畫可在不同季節做相同活動，不用「只能某季節」出陷阱。 |
| 09-13（較早） | list-commas | 新文具／物件清單辨標點，口說自然列舉；不口說評逗號。 |

每個候選的`sourceConcept`都指向真實原課的lessonId、conceptId及date；測試要求本週4堂全部12個概念都可被弱項選題命中，避免只有部分概念能得到後續複習。較早內容只有季節活動與列表兩個候選，不代表較早課所有概念都會在本包練到。

## 家長判準

- 依本題可見情境與揭曉前表現評級；完整句內容正確、自然等義即可，accepted列的是例子。
- is-are需以There is／are或相應縮寫表達；short-forms需真的改為縮寫；counting-now需表達正在計數。不能因另一句語意大致合理就略過本題明確要練的句型。
- 奇偶先核對數字；too-many先核對數量大於容量；文具合計先核對加法。不是以「看起來很多」判斷。
- 列舉要包含全部三項，順序不限；口說不用念comma，也不評書寫標點。書寫Try只在提供的完整選項中選正確列表格式。
- 題包完成、訂正成功與後來reviews成功，不回寫原課的首次結果。保留後續仍需加強的依據。

## 可重建與驗證

[lesson-source.json](lesson-source.json)是可編輯真相源。從repo根目錄執行 `uv run --offline learning-tasks/shared/nativecamp/build_lesson.py --lesson weekly-2026-09-14` 產生 [正式題包](../../../docs/nativecamp/lessons/weekly-2026-09-14.json)與 [speech-jobs.json](speech-jobs.json)；`--check`只比對。聲音固定Cedar、speed 1.0，全部預製，孩子重播不呼叫API。

Node內容測試逐題核對來源輸出、候選coverage、字幕與語音稿、排列字卡／替代順序、數量與語法目標；正式音訊測試另核對manifest、檔案bytes/hash/解碼/音長/RMS。發布、窄版、iPad、人耳與孩子實測須保留各自證據，不能用自動檢查取代。
