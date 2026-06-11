> 類型：HITL（人工框選截圖座標＋品質過目）

## Parent PRD

`docs-dev/exam-math-pipeline-design.md`

## What to build

看表填填看大題端到端（家長定案：**全收**，第一版就建截圖流程）：

- **複雜表**（功課表/票價表/時刻表）：`crop_pdf.py` **新增 bbox 模式**（現況是整頁切 nx×ny 象限的勘查工具，沒有任意 bbox 與依題目 id 命名輸出——這是新功能不是小改參數）。流程：人工框選每題表格座標（座標清單檔）→ 輸出 `docs/assets/math/<id>.png` → 題目 `image` 欄位 → UI 題幹上方顯圖＋blanks 作答。
- **簡單表**（24/12 時制互換）：文字/簡單 HTML 重現，不截圖。
- HITL 點：框選座標逐題人工調、截圖品質（解析度/裁切完整性）家長或操作者過目後才入庫。
- 勘查注意：若看表題含 code/comparison 空格（如「在□裡打√」），依賴升級為 013。

## Acceptance criteria

- [x] `crop_pdf.py` bbox 模式：讀座標清單 `data/table_crops_數學.json` → 輸出指定命名 PNG（手動驗證紀錄＝本 session 逐張 PNG 親讀核對）
- [x] 桃子腳 112下 看表題截圖完成（功課表/票價表/火車時刻表/蛋糕價目表 4 張，從**題目卷**裁切避免紅字答案）；操作者品質過目通過，**家長最終過目待回**（不擋合併）
- [x] 時制互換題以文字重現入庫（上/下 為 code 格、時分為 number 格）
- [x] UI：含 `image` 的題題幹上方正確顯圖（pad 寬度可讀），blanks 作答正常（混合 code＋number 面板切換）—— Playwright 實測
- [x] 看表題官方答案對 PDF 紅字逐題核對（含票價表√＝蘇澳新站、蛋糕題 80−40=40→紅茶/綠奶茶）
- [x] `docs/assets/math/` 進 repo，單檔 8–13KB（遠低於 200KB）
- [x] `uv run pytest` 全綠（90 passed）

## 完成紀錄（2026-06-11）

- 看表題走**人工 curated 路線**：`data/curated_questions_數學.json`（classified 形狀、手寫 blanks/unit/subtopic）由 build 直接併入，不過 classify——HITL 題的分類本來就是人工
- 桃子腳五大題拆 7 題入庫：時制互換(unit 8)＋功課表/票價表×2/火車時刻表×2/蛋糕(unit 9 報讀表格)；題庫 1155 題（數學 54）
- 多答案順序問題（星期一、星期四／紅茶、綠奶茶／羅東→花蓮）：blanks 逐格嚴格比對，題幹明示「依～順序作答」固定順序——家長過目時可確認此 UX 是否 OK
- **殘留（記錄，下批處理）**：安和表格題 5 題（填充8 健康統計表/填充9 公車票價表/填充10 優酪乳營養表、應用4 高鐵時刻表/應用5 影展時刻表）仍在延後清單——同 curated 流程可做，留待家長確認桃子腳這批的呈現品質後再批量做
- **殘留已補做（2026-06-11，feat/math-anhe-tables）**：安和 5 題同 curated 流程入庫（截圖 `anhe113_*.png`、紅字答案逐題核對、Playwright 逐題作答驗證）；高鐵時刻表 12 欄寬表觸發 `.q-image` 上限放寬（560px→容器寬）；應用5 歸 unit 8 時間計算，其餘 unit 9 報讀表格；題庫 1160（數學 59）

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`
- 條件式：若看表題含 code/comparison 空格 → 也 Blocked by `issues/013-input-type-buttons.md`（勘查時確認）

## 對應設計稿章節

- 「Scope 決議」大題五（看表填填看，家長選全收）
- 「Pipeline」第 4 步（截圖）
