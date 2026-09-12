# 四上第一次段考數學候選卷

狀態：**已完成（依暫定範圍；正式範圍待確認）**。日期：2026-09-12。適用對象為桃子腳國小 115 學年度四年級學生，收集第一次段考前可依概念挑選的數學歷屆原卷，並保存來源、答案身分、逐題範圍標記及獨立驗收紀錄。

## 使用方式與範圍

先讀 [課程比較](source/curriculum-comparison.md)，再依下方 B／C 核題清單挑題；抽用時保留 dependency／retain_context 指定的完整題組、圖表或前題條件。八份卷都只能部分使用，不能直接整卷當成今年考試範圍。

115 康軒 M1–M4、M5a 為推定核心；M5b 公里／公尺二階單位加減在考試週，仍待正式範圍確認。C 另有 11 項方法、位數或作答格式待核，暫不列核心。正式範圍未知不影響本次收集與判讀任務完成，也不能把「暫定核心」說成學校已公告會考。

## 本機原卷入口

已取得 **8 份不同題目卷、6 份學校官方答案**，共 **14 個 PDF、35 頁（題目 20 頁、答案 15 頁）**；完整 SHA256 已核對。下列相對連結指向本機原卷，由局部 `.gitignore` 排除，Git clone 本身不含這些 PDF。

| 批次 | 卷別 | 題目原卷 | 官方答案 |
| --- | --- | --- | --- |
| B | 桃子腳 113 期中 | [題目](source/papers/tcool_20000022_q.pdf) | [答案](source/papers/tcool_20000022_a.pdf) |
| B | 桃子腳 111 期中 | [題目](source/papers/tcool_20002593_q.pdf) | [答案](source/papers/tcool_20002593_a.pdf) |
| B | 安和 114 期中 | [題目](source/papers/tcool_20002844_q.pdf) | [答案](source/papers/tcool_20002844_a.pdf) |
| B | 安和 112 期中 | [題目](source/papers/anhoes_112_math4_midterm_q.pdf) | [答案](source/papers/anhoes_112_math4_midterm_a.pdf) |
| B | 民權 114 期中 | [題目](source/papers/tcool_20003685_q.pdf) | 未取得官方答案 |
| C | 桃子腳 114 期中 | [題目](source/papers/c_tyk_114_midterm_q.pdf) | 未取得官方答案 |
| C | 桃子腳 112 期中 | [題目](source/papers/c_tyk_112_midterm_q.pdf) | [答案](source/papers/c_tyk_112_midterm_a.pdf) |
| C | 安和 112 期末 | [題目](source/papers/c_anho_112_final_q.pdf) | [答案](source/papers/c_anho_112_final_a.pdf) |

部分官方答案的作圖／驗算欄可能留白或寫「略」；有答案卷不等於逐題詳解完整。答案身分、對應及可讀性已核，但沒有完成全部答案重算；沒有把站內 AI 答案當作官方答案，也沒有生成新解答。

## B：216 個標記作答單位

依作答欄位、判斷、作圖或未分小題應用題建立穩定 ID，含相依欄位；不是 216 道互不相依的完整題目，也不等於配分。見 [B 核題清單](source/question-scope-review.md) 與 [逐作答單位 JSON](source/question-scope-review.json)。

| 卷別 | 暫定核心 | M5b 暫緩 | 後續／範圍外 | 待核 | 作答單位 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 桃子腳 113 期中 | 46 | 3 | 0 | 0 | 49 |
| 桃子腳 111 期中 | 29 | 0 | 11 | 0 | 40 |
| 安和 114 期中 | 39 | 5 | 0 | 0 | 44 |
| 安和 112 期中 | 28 | 0 | 14 | 0 | 42 |
| 民權 114 期中 | 38 | 2 | 1 | 0 | 41 |
| B 合計 | 180 | 10 | 26 | 0 | 216 |

安和 114 五、3 可將全路線換為 3535 公尺後乘二，再換回二階單位，原題未強制二階加減，已依獨立驗收列為 M2a＋M5a 核心；須保留完整路線圖。

## C：126 個 review items

依原卷編號小題／必要子題計數，同題多空或相依配對不按空格拆算。**B 與 C 口徑不同，不相加成總題數。** 見 [C 核題清單](source/supplemental-review.md) 與 [逐小題 JSON](source/supplemental-question-review.json)。

| 卷別 | 暫定核心 | M5b 暫緩 | 後續 | 待核 | review items |
| --- | ---: | ---: | ---: | ---: | ---: |
| 桃子腳 114 期中 | 30 | 3 | 12 | 4 | 49 |
| 桃子腳 112 期中 | 25 | 3 | 1 | 6 | 35 |
| 安和 112 期末 | 5 | 4 | 32 | 1 | 42 |
| C 合計 | 60 | 10 | 45 | 11 | 126 |

11 項待核的題號與理由見 C 清單及 [驗收紀錄](source/acceptance-review.md)。桃子腳 112 一、6 的多解疑慮已撤回，維持原 M5b 暫緩判定與官方答案，不另改題。

## 檔案索引與再製

- [curriculum-comparison.md](source/curriculum-comparison.md)：115 暫定範圍、跨年度與跨版本概念映射、原始課程來源。
- [manifest.json](source/manifest.json)：B 五卷來源、身分、PDF 驗證與完整 SHA256。
- [collection-notes.md](source/collection-notes.md)：B 首批取得歷史、23 份候選清單與取得限制；不是整體完成數量。
- [question-scope-review.md](source/question-scope-review.md)／[JSON](source/question-scope-review.json)：B 分類、覆蓋與穩定 ID、頁碼、理由、dependency。
- [supplemental-manifest.json](source/supplemental-manifest.json)：C 三卷來源鏈、身分、PDF 驗證與完整 SHA256。
- [supplemental-review.md](source/supplemental-review.md)／[JSON](source/supplemental-question-review.json)：C 分類、方法待核與 retain_context。
- [acceptance-review.md](source/acceptance-review.md)：D 初驗證據、四項修正與複驗結果；歷史數字不代表目前狀態。

重新取得原卷時，先核對各 manifest 的來源與檔案身分；只有公開來源允許時，才以無介面下載器存至本 task 的 `source/papers/`。檢查 `%PDF-`、頁數、完整 SHA256、全頁可讀性與答案身分。tcool 匿名下載要求登入時記錄限制，不繞過；不要使用 Chrome PDF 下載按鈕或 Save As 流程。

本任務完成於數學原卷收集與範圍判讀，不轉寫題目、不生成答案、不加入網站題庫。自然與社會未收集。
