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

- [ ] `crop_pdf.py` bbox 模式：讀座標清單檔 → 輸出指定命名 PNG（pytest 或手動驗證紀錄）
- [ ] 桃子腳 112下 看表題（功課表/票價表/時刻表/蛋糕價目表）截圖完成且品質過目通過
- [ ] 時制互換題以文字重現入庫
- [ ] UI：含 `image` 的題正確顯圖（pad 寬度下表格可讀），blanks 作答正常 —— Playwright 實測
- [ ] 看表題官方答案對 PDF 核對通過
- [ ] `docs/assets/math/` 進 repo（部署需要），檔案大小合理（單檔 < 200KB 為準）
- [ ] `uv run pytest` 全綠

## Blocked by

- Blocked by `issues/011-fill-in-blank-numpad.md`
- 條件式：若看表題含 code/comparison 空格 → 也 Blocked by `issues/013-input-type-buttons.md`（勘查時確認）

## 對應設計稿章節

- 「Scope 決議」大題五（看表填填看，家長選全收）
- 「Pipeline」第 4 步（截圖）
