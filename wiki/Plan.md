# 執行中計畫

> 快照日期：2026-07-21。Source of truth 是 [open issues](https://github.com/huansbox/aiden-study/issues)、[`CLAUDE.md`](https://github.com/huansbox/aiden-study/blob/master/CLAUDE.md) 與目前程式碼；本頁只整理執行順序。HITL（human in the loop）表示需要家長在真機操作或判定。

## 結論

目前沒有只靠程式端即可獨立往前做的平台 ticket。平台工程已做到 8/9，下一個有效動作是安排一段 iPad 真機時段完成 #35；#35 沒通過前，不得開始自訂網域 flip。

注音錄音與驗收可以和 #35 同場進行。其餘內容擴充、低利息 UX 修正與新 app 都先不插隊。

## Open issues

| Issue | 性質 | 現況 | 下一個動作 |
|---|---|---|---|
| [#35 平台 1/9：iPad spike](https://github.com/huansbox/aiden-study/issues/35) | HITL stop-gate | 可立即開始 | 在現網址安裝測試 webclip，逐項記錄三個架構前提 |
| [#34 平台 9/9：掛網域＋搬遷](https://github.com/huansbox/aiden-study/issues/34) | HITL 搬遷 | Blocked by #35；8/9 工程已完成 | #35 關閉後，先完成 flip-gate 備份與同步健康清單 |
| [#20 注音 MVP 5/5 收尾](https://github.com/huansbox/aiden-study/issues/20) | 內容＋HITL | 程式已 merge；缺 14 段親錄音檔與 iPad checklist | 用 `recorder.html` 錄音、入庫、跑 audit、真機走兩活動 |
| [#11 iPad 備份還原驗收](https://github.com/huansbox/aiden-study/issues/11) | HITL／觀察 | 暫緩，不阻擋平台主鏈 | 先驗手動貼上後備；是否做剪貼簿橋樑再由家長決定 |
| [#26 全家學習平台 PRD](https://github.com/huansbox/aiden-study/issues/26) | Umbrella | 子工作 2/9～8/9 完成 | #34 完成後做整體 close audit |
| [#15 注音學習 app PRD](https://github.com/huansbox/aiden-study/issues/15) | Umbrella | #16～#19 已完成，#20 未關 | #20 驗收完成後關閉 |

## 執行順序

### A. iPad stop-gate

對 [#35](https://github.com/huansbox/aiden-study/issues/35) 一次驗三件事，結果寫進 `docs-dev/`：

1. 從測試 webclip 導航到同 origin 其他頁時，仍留在 standalone。
2. 圖示網址的 `?child=` 與 `?k=` 能被 JavaScript 讀到。
3. Safari 與 webclip 的 localStorage 分離，同一 webclip 跨頁則共享。

任一前提不成立，就停止 #34，先回到架構設計；不要用搬遷 checklist 掩蓋前提失敗。

同場順手驗：

- 舊 study 主畫面圖示經 hub 後，能以「選人 → 首頁 → 題庫」進站。
- Study 國語手寫在真機完成一批。
- 四個同步 app 顯示正確 child，且家長區沒有 token／認證異常。

### B. 注音收尾

1. 在 `docs/zhuyin/recorder.html` 依清單錄製 3 個符號、8 個音節、3 個詞，共 14 段 `.m4a`。
2. 放入 `docs/zhuyin/assets/audio/`，不要手動改檔名。
3. 跑 `node --test tests/test_zhuyin_content.mjs`，缺檔警告必須從 14/14 變成 0。
4. 跑 Node.js 與 pytest 全套測試。
5. 在 iPad 驗聽音辨認、聽音組字、自動連播、音效自檢、匯出／匯入。
6. 把結果勾回 `docs-dev/zhuyin-mvp-ipad-checklist.md`，完成後關 #20，再 audit #15。

### C. 搬遷前 flip-gate

#34 開始前，逐裝置、逐容器完成：

- #35 已關閉且三前提全通過。
- Study、zhuyin、math、spelling 的同步健康正常。
- Safari 與每個舊 webclip 都做一次文字匯出備援。
- Family token 已從 1Password 取得；不抄進 repo 或 issue。
- 清單明確記錄每個容器的 child、app、備份與最後同步狀態。

任一格沒有證據，就不掛 `kids.linshuhuan.com`。

### D. #34 搬遷

依 issue 順序執行，不重排：

1. 設定 Cloudflare DNS、`docs/CNAME` 與 CNAME audit，等待 GitHub 憑證。
2. 驗證舊 study URL 對新網域的 server-side 301。
3. 安裝哥哥／弟弟兩顆新圖示，網址帶正確 child 與 family token。
4. 每個新容器由雲端 pull；必要時用備援匯入。
5. 對帳題數、mastered 與 app 可見進度。
6. 對帳通過後才刪舊圖示。
7. 更新「Aiden還原」捷徑網址與 recipe，實測還原後有上雲。
8. 收尾舊 math／spelling repo 與 spelling 舊匯出通道。
9. 對新網域跑所有 app 的相對資產 smoke、兩 app × 兩 child 同步閉環，以及 pagehide 真機驗收。

## 完成條件

本輪平台收尾只有在以下證據都存在時才算完成：

- #35、#34 已關閉，且真機結果已提交到 repo。
- `kids.linshuhuan.com` 可用；舊網址 redirect、所有 active app 與相對資產都通過 live smoke。
- 兩個 child 的本機與雲端進度互不污染。
- 所有新容器完成進度對帳，舊圖示才被移除。
- #20 的 14 段音檔齊全、audit 零缺檔、iPad checklist 完成。
- Node.js 與 pytest 全套綠，Wiki、`CLAUDE.md`、`HANDOFF.md`／issues 狀態一致。

## 暫不排入

- Study 期中自然說明、3 題隱藏題、社會看圖題。
- Resume 半批進度條、手寫 canvas 效能與其他低利息技術債。
- 獎勵圖鑑、新 app、孩子自行排序。

這些項目在平台搬遷完成前只保留記錄，不開工。
