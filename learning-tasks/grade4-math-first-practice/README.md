# 四上數學第一份短練習

狀態：**已完成（時間待孩子實測）**。日期：2026-09-12。適用對象為四年級學生，主題是 U1「一億以內的數」，設計成約 15～20 分鐘完成的 A4 紙本短練習，另附分開的家長答案。實作追蹤為 [#54](https://github.com/huansbox/aiden-study/issues/54)，本 task 承接已完成的候選卷收集，不重開其範圍。

## 適用進度

本次 U1 主題已由家長確認。題目練習一億以內數的讀寫、位名／位值、化聚、大小比較與加減；不表示孩子實際已學完，也不是學校正式考試範圍公告。時間是編排估計，尚未經孩子實測。

## 交付物

- `output/pdf/grade4-math-u1-practice.pdf`：孩子直接作答的題目卷。
- `output/pdf/grade4-math-u1-parent-guide.pdf`：完整答案、簡短核對方法與誤答回看提示。
- `output/preview/`：最終 PDF 的逐頁 render 圖，供本機版面驗收。
- `source/qa-review.md`：題目、答案、mapping、重建與全頁視讀的驗收結果。
- [source/acceptance-review.md](source/acceptance-review.md)：獨立驗收的查核方法、已修 findings 與最終通過證據。

兩份 PDF 與 `output/preview/` 是私用衍生成品，由局部 `.gitignore` 排除，不會隨 public repo clone 取得；QA 與獨立驗收紀錄不含完整題文或答案，隨 Git 保存。

## 來源、映射與授權邊界

題目由 [四上第一次段考數學候選卷](../grade4-sem1-math-exam1/) 中已核為 U1／M1a／M1b 的歷屆題挑選，優先採用已有學校官方答案的卷。每個練習題的穩定 ID、原卷、頁碼、原題 ID、改編狀態與驗算結果記在 `source/mapping-metadata.json`；含完整題文的排版資料另放 `source/private/`，不進 Git。

原卷仍只保存在前一任務的 ignored `source/papers/`。本次整理供家庭練習不等於取得公開再授權；不得將原卷、擷取題文、題目 PDF、答案 PDF 或 preview 當成可公開素材。

## 使用方式

1. 先確認孩子目前適合練 U1，再只印孩子卷。
2. 建議不計分，讓孩子在約 15～20 分鐘內依序作答；需要直式時保留原筆跡。
3. 完成後由家長使用答案卷核對。單題答錯只作為初步觀察，依提示回看概念，不直接判定能力。
4. 在家長卷的人工記錄區寫下日期、實際時間與需要再看的題號。

## 再製與驗收

在本 task 目錄執行 `uv run source/build_practice.py` 重建兩份 PDF；程式以 PEP 723 宣告 `reportlab`，不需修改 repo 根目錄的 Python dependencies。生成前須確保本機存在 ignored 的 `source/private/practice-content.json`。目前排版使用 Windows 內建的微軟正黑體 `C:/Windows/Fonts/msjh.ttc` 與粗體 `msjhbd.ttc`，缺少這兩個字型時會明確停止，不會產出缺字 PDF。

驗收包含：逐題對照原卷的題幹、相依條件與 U1 概念；自行重算答案並比對官方答案；將全部 PDF 頁面 render 為 PNG 後視讀；確認孩子卷字級、作答空間，以及來源／題號映射。

## 後續方向

目前學習主軸是把已核歷屆題小批加入既有 Study，先讓孩子在 iPad 完成四上 U1 並可離開後接續；本任務仍是已完成的紙本成品，尚未進入 Study。具體整合邊界與驗收方案預留在 [`docs-dev/grade4-u1-study-integration-plan.md`](../../docs-dev/grade4-u1-study-integration-plan.md)。

日後只有在孩子需要紙筆計算、特定題型回看或短時間離線練習時，才沿用本任務的來源映射、觀念欄與孩子／家長分卷格式製作下一份紙本；不預設每章都有 PDF，也不先建立跨章 framework。
