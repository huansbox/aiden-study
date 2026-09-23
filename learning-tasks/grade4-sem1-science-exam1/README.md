# 四上自然第一次段考候選卷

狀態：**首批收集與概念對照已完成，獨立複核通過**（2026-09-23）。本任務供桃子腳國小 115 學年度四年級上學期第一次定期評量前，收集自然科歷屆卷，按概念逐題判讀，作為後續 iPad 練習題庫的來源。工作範圍見 [#115](https://github.com/huansbox/aiden-study/issues/115)。

這頁記錄**原卷收集階段**；下文「本次 App 新增／上線 0」只指當時未轉題。後續已有[自然首批 20 個 activity 正式上線](../../data/study/g4-s1-science-exam1/README.md)；[第二批 #119](../../data/study/g4-s1-science-exam1/second-batch.md)已有 12 個 activity 的 revision 6 本機候選，尚未發布。

今年採康軒版；「地表的靜與動」「水生生物與環境」是本批**暫定收題核心**，不是校方已公布的正式考試範圍。舊卷依實際概念對照，月亮題留供後續使用。卷面未證實的出版社標為未知。

## 首批入口

目前有 **4 份題目原卷、8 頁**：桃子腳 113／114 與永安 113／114；另有桃子腳 113 校方答案 1 份、2 頁。永安 114 同年度校方版本表直接證實南一，與今年康軒不同。桃子腳兩份舊卷的出版社沒有證實，均標未知。

- [首批題數、概念與出題方式概覽](source/coverage-overview.md)：兩組不同計數口徑、題組依賴、答案現況及後續數位化缺口。
- [桃子腳校卷來源](source/school-manifest.json)、[逐格分類](source/school-question-review.md)與[資料](source/school-question-review.json)。
- [永安補充卷來源](source/supplement-manifest.json)、[逐項分類](source/supplement-question-review.md)與[資料](source/supplement-question-review.json)。

桃子腳標了 **200 個作答格**；永安標了 **153 個 review items／155 個作答格**。這些數字不是可獨立上線的題數，不能合寫成「353 題」。本次 App 新增／上線 **0**；可轉入多少題仍須核答案、圖文權利與題組粒度。

來源身分、版本／課程證據、逐格／逐項 metadata、跨卷 scope 判準與總報告已完成獨立複核。這項驗收不代表校方答案正確性已逐格驗算，也不代表其他三卷已有官方答案、桃子腳正式考試範圍已確認，或可接入 App 的題數已定。後續可先從有課程依據的暫定核心挑選能完整呈現圖文、取得可驗答案的小批題組。

## 來源與操作

- [課程比較](source/curriculum-comparison.md)：115 康軒前兩單元、校方版本／評量日期，以及 113／114 康軒概念先例；校方自然週進度和正式考試範圍仍未取得。
- [收集紀錄](source/collection-notes.md)：來源、取得方式及限制；本批只收有限首批，不代表全庫已查盡。
- 原卷存於本機 `source/papers/`；OCR、題文及含題文的核對紀錄存於本機 `source/private/`。兩個目錄均由本 task 的 `.gitignore` 排除，Git clone 不提供原件。

公開檔案只記來源 metadata、概念分類與核對結果，不放題文、選項、答案、解說或原圖。原件需由公開且允許取得的來源重新下載，核對來源身分、PDF 每頁、頁數與 SHA256；遇登入或存取限制即記錄，不繞過限制。

本機工作原件位於此 task 的 `source/papers/` 與 `source/private/`。長期保留副本位於 `D:/mywork/aiden-study/learning-tasks/grade4-sem1-science-exam1/source/` 的同名目錄，兩處皆以精確 ignore 保護；Git clone 只有 metadata，需按 manifest 來源重新取得並核 hash。私人核題資料分在 `source/private/school/`、`source/private/supplement/`，課程原件在 `source/private/curriculum/`。正式答案、素材權利與 App 接入仍須後續處理。

本批不製作 App、Worker、正式題包或 PDF 練習卷，也不更動孩子的正式進度。
