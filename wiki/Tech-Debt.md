# 技術債

> 快照日期：2026-07-10。依**利息**排序——利息高 = 平常就在付出成本；
> 利息低 = 特定情境才痛。技術債 = 已知的權衡，記錄成本與償還條件，
> **不代表馬上要處理**。Review 節奏：每次大功能收尾或 /repo-wiki refresh 時重看本頁。

## 高利息（每天都在付成本）

（目前無——2026-07-10 第二輪 review 已把高頻路徑的問題修掉或驗證為低嚴重度。）

## 中利息（特定操作就會痛）

| 債 | 成本（利息） | 償還策略／條件 | 追蹤 |
|---|---|---|---|
| 程式碼：remedial 與 submitAnswer 的答錯 queue 回收邏輯重複 | 任何批次語義變動（saveBatch key、分母規則）要同步改兩處，漏改即行為分歧 | 下次動批次邏輯時抽共用 `requeueWrong(q)` | 2026-07-10 review 留債 |
| 程式碼：stats/mastered 雙儲存形狀（legacy flat vs `{modes:{…}}`）永久 lazy 正規化 | 備份/匯入與任何新讀取程式永遠要相容兩形；normalizer 的 legacy 分支刪不掉 | 比照 OLD_KEY 前例在 Storage.load 做一次性 canonicalize | 2026-07-10 review 驗證無 bug 風險、cleanup 級 |
| 資料：原始考卷 PDF（`pdfs_*`）只存在單一機器、不在 git | 看圖題策展等需要回讀 PDF 的工作直接卡死；機器故障即遺失 | 有需要時重抓 tcool 或複製到雲端備份 | CLAUDE.md 待辦③ |

## 低利息（記錄在案）

| 債 | 成本（利息） |
|---|---|
| 程式碼：手寫板 canvas 效能（每 pointermove 全段重 stroke O(n²)＋重讀 getBoundingClientRect；擷取用全解析度 toDataURL） | 小孩單字筆畫短，現況在舊 iPad 尚在預算內；長慢筆畫或 240Hz Pencil 才可能有感（2026-07-10 review 逐項驗證為低嚴重度）。真機驗收若有延遲感再修：改逐段 stroke＋pointerdown 快取 rect＋縮圖後再編碼 |
| UX：resume 半批時批內進度條歸零（顯示 0/5 而非 3/8） | 觀感問題；要修需在 challenge 存原始批大小（動存檔格式）。待家長定奪是否值得【接受現狀（暫定）】 |
| 架構：mode 行為差異散在多個 predicate、renderHome 以 `subjKey === "chinese"` 字面分支 | 加第三種練習模式或別科要手寫時要多點觸碰；4/5 predicate 集中在 `<chinese-mode-pure>` 區塊且有測試，現況可控（2026-07-10 review 驗證） |

## 記帳原則

- **入場資格**：新債必須寫明「成本（利息）→ 償還策略或條件」——沒有成本描述的不收。
- **接受現狀要明文標註**，避免每次盤點重新吵一遍。
- **修完即刪**：償還後刪除條目，摘要移入歷史償還紀錄。

## 歷史償還紀錄

- 2026-07-10：第二輪 review 清償——6 處死碼（`nextBatchSize` 別名、test-only 函式、write-only 欄位、死 guard 等）、remedial 寫入繞過 State facade、renderQuiz 換題重置清單重複、CLAUDE.md localStorage 節過期（merge commit `25da348`）。
- 2026-06-20：手寫版審查修正——reward 池孤兒 key（`ec8bc12`）、status helper 複製貼上與空錯題段（`83eb8db`）。
- 2026-06-17：題庫萃取雜訊（假空格/頁碼/表單欄滲漏）機械正規化入 build，1146 題一次清償。
- 2026-06-15：PRD #2 review 小債——批末按鈕文案、dead code「本輪結束」（`cce0816`）。
