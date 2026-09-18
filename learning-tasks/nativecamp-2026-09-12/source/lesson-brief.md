# 2026-09-12 完整句設計 brief

- 課程：2026-09-12 21:00 Lena；課堂動作詞與蘋果樹描述。
- 來源：授權網站逐字稿與教材交叉核對；原始課程錄音未落檔、未完成獨立人耳核對。證據取捨見 [evidence-review.md](evidence-review.md)。
- 對象：已有基礎閱讀／聽力，現在練把已知單字組成完整句；家長陪口說。
- 份量：3 概念 × 2 模式 × 3 變體，共 18 題，題包與 36 個問題／答案 MP3 已完成。沒有為滿足概念數而再加入重複季節題。
- 孩子介面：全英文，以現有 word-card 場景提供動作／物件／特徵；不新增 renderer、不用 emoji。

## 目標與判準

| 目標 | 預設句首 | 合格完整句 |
| --- | --- | --- |
| 兩人能一起做什麼 | `We can …` | 主詞、can、指定動作及物件都在；不是只答 treehouse／snowman。 |
| 看著物件生長 | `I watch …` | 明示所看的物件及 grow；不只答 flowers，也不漏 grow。 |
| 樹上蘋果的特徵 | `My tree …` | 說清楚樹有 apples 及指定特徵；後兩道 Say 題需有兩個特徵，不能只答 red。 |

`can-actions` 題面的動作詞是刻意提供的線索：這裡評完整句組織，不把多個都合理的動作當成唯一語義答案。Try 的 is／are 是 1 個額外字，讓孩子確認整句結構；不加入大量陷阱或未教過的時態。排列題指定句首並保留全部必要字，避免把較短但也通順的句子誤當成同一完成標準。

`watch-grow` 題面用 get bigger 描述可觀察變化，指示使用課內的 grow；不是背教材故事。`tree-details` 的顏色／大小／味道都明示在卡片上，不從圖示外觀或生活常識猜答案；示範使用自然形容詞序，口說接受同義完整句及必要的冠詞變體。

預設字卡、句首與重聽問題不算家長協助。若家長另提供答案字詞或先示範整句，依既有規則評 With help；只有單字不能因意思接近就評 Got it。完整句意思正確、保留題目要求的動作及細節即可，不以聲音像 TTS 為評級條件。

## 音訊及交付界線

正式語音使用 OpenAI Cedar、speed 1.0，問題與答案同聲。所有 `spokenQuestion` 只描述材料與要求，沒有先念完整標準答案；`answerText` 為揭曉後的自然完整句。一般合成語音送出的只有原創題文。

獨立內容 review 已通過；三堂整合 Node 552 項通過、Python 247 項通過／1 項略過，120 個 MP3 完整解碼與 hash 均通過。本堂 [audio manifest](nativecamp-audio-manifest.json)記錄 36 個檔案；[問題音檔 ASR](nativecamp-questions-asr.json)涵蓋本堂 18 題（三堂共 60 題），[TTS ASR 抽查](nativecamp-tts-asr.json)另記本堂 6 筆（三堂共 20 筆）。

[Preview 入口](https://kids.linshuhuan.com/nativecamp/preview.html?child=aiden&lesson=2026-09-12)供家長檢視。瀏覽器驗收、發布 commit／CI／正式資源核對結果見 [#97](https://github.com/huansbox/aiden-study/issues/97) 及其關聯 PR。TTS 人耳自然度、iPad 與孩子實測未完成；ASR 與技術檢查不代表這些項目已通過。
