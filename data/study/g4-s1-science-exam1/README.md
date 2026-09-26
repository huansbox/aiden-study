# 四上自然首批練習選題

[#129 第三批](../../../docs-dev/grade4-science-study-third-batch.md)已在本機完成五個核准 activity、13 個原卷作答格的 revision 7 題包：全包 94 題（數學 57／自然 37）、125,022 bytes、SHA256 `12ba60aa97f021c24bd31becb9bf4d2224bd3317e7f40c30c4d62b1f823920a8`。兩個審題未通過的候選整組排除；**revision 7 尚未發布**。本頁下方仍保留首批 revision 5 的歷史快照。

這份公開索引記錄 [#117](https://github.com/huansbox/aiden-study/issues/117) 首批凍結的 **20 個完整、可獨立作答的 activity**。原卷題文、選項、答案、解說和逐題 QA 都保存在 Git 排除的私人資料夾，不在這裡。選題、內容轉寫與獨立覆核完成後，77 題 revision 5 家庭題包已於 **2026-09-23 正式發布**；實體 iPad 尚未驗證。

後續 [#119 第二批](second-batch.md) 增加 12 個完整活動、29 個原卷作答位置；89 題 revision 6 已於 **2026-09-23 正式發布**。下方表格與缺口敘述仍保留首批發布當時的 20 題快照，第二批後的自然題數為 32。

發布基線為 merge commit `cb2e2cc19227b614c141db4fc0b89ccccc7ed298`，Worker version `807a397e-2ba7-423c-821a-f9f15d8873fe`。題包 SHA256 `98150515D8897C0240316D173FD8D94B47EDAE0804C05A271BB0431DBBE6B22C`，正式 KV 的立即與傳播後原始讀回均逐 byte 相同；不含題文的發布證據見 canonical ignored `data/private/study/g4-s1-math-u1/rev5-release/release-audit/kv-20260923T0445Z/release-summary.json`。

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
- 私人轉寫、解說、已覆核 mapping rows 和 QA 位於 ignored `data/private/study/g4-s1-math-u1/science-first-batch/`。15 題有校方答案者經獨立核答與校答一致；5 題無校方答案者經兩次獨立解題一致。這 20 題與既有 57 題 rev4 合成 revision 5 正式包；原數學題逐值不變。
- 長期私人來源歸檔位於 canonical repo 的 ignored `data/private/study/g4-s1-math-u1/rev5-release/`；其中的 `README.md` 和 `manifest.json` 保留發布前候選快照，可定位 rev4 基線、已覆核 delta、重建腳本、兩階段 fresh review、77 題包與來源 PDF／SHA256。正式發布結果以同目錄 `release-audit/kv-20260923T0445Z/release-summary.json` 為準。
