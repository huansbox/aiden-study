# 四上自然首批練習選題

這份公開索引記錄 [#117](https://github.com/huansbox/aiden-study/issues/117) 首批凍結的 **20 個完整、可獨立作答的 activity**。原卷題文、選項、答案、解說和逐題 QA 都保存在 Git 排除的私人資料夾，不在這裡。選題、內容轉寫、獨立內容覆核及本機題包整合已完成；候選題包尚未正式發布。

桃子腳 115 學年度四上自然使用康軒。「地表的靜與動」和「水生生物與環境」是依 [課程比較](../../../learning-tasks/grade4-sem1-science-exam1/source/curriculum-comparison.md)採用的**暫定核心**，不是校方已公布的第一次定期評量範圍。每一題依作答所需概念比對，不沿用舊卷章序整卷放行。永安 114 原卷屬南一版，此批只選可比的水域概念。

## 本批與缺口

| 單元 | 原卷標記單位 | 本批 activity | 題型 | 作者細概念標籤 | 作者方法標籤 |
| --- | ---: | ---: | --- | ---: | ---: |
| S1 地表的靜與動 | 桃子腳 113 原卷 100 格中的相關格 | 10 | 是非 10 | 10 | 9 |
| S2 水生生物與環境 | 桃子腳 113 原卷與永安 114 原卷的相關格 | 10 | 是非 7、四選一 3 | 10 | 9 |
| 合計 | 不把不同原卷的作答格當成獨立題數 | 20 | 是非 17、四選一 3 | 20 | 18 |

細概念和方法的數量按 [`selection-metadata.json`](selection-metadata.json) 的逐題標籤去重，描述本批選題的切面，不代表教材所有概念或方法已完整覆蓋。原卷總量與不同計數口徑見 [首批概覽](../../../learning-tasks/grade4-sem1-science-exam1/source/coverage-overview.md)。

從同一份逐題資料重新計數，S1a／S1b／S1c 各有 3／5／2 個 activity，S2a／S2b 各有 4／6 個，S2c 保育行動為 0。這是 20 個 activity 的概念分組；20 個細概念與 18 個方法標籤僅為本批去重數量，不能當成完整教材分類或 18 種介面題型。

本批聚焦不需原圖、表格或跨題條件的文字是非與四選一。地震報告讀值、圖像辨識、共用閱讀材料、月亮與光影及陸域棲地待確認細目仍在原始分類資料中，沒有裁掉必要圖文硬轉成新題。永安 114 的一個水域汙染選擇題因敘述有科學歧義而未採用；細節記在私人 QA。S2 的保育行動與需要圖片的生物辨識仍是下一批缺口。

## 來源與資料界線

- 逐題來源 ID、頁碼、印刷題號、概念、方法和依賴見 [`selection-metadata.json`](selection-metadata.json)。
- 桃子腳來源與官方答案身分見 [school manifest](../../../learning-tasks/grade4-sem1-science-exam1/source/school-manifest.json)；永安 114 南一版身分與無官方答案現況見 [supplement manifest](../../../learning-tasks/grade4-sem1-science-exam1/source/supplement-manifest.json)。公開索引只記有無官方答案，不存答案內容。
- 私人轉寫、解說、已覆核 mapping rows 和 QA 位於 ignored `data/private/study/g4-s1-math-u1/science-first-batch/`。15 題有校方答案者經獨立核答與校答一致；5 題無校方答案者經兩次獨立解題一致。整合者將它們合入既有 57 題 rev4 的新 revision，仍須驗證題包與運行行為。
