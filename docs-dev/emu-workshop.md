# EMU3000／EMU900 圖形零件工坊

對應 [#217](https://github.com/huansbox/aiden-study/issues/217)。四款新工坊共用 `train-workshop.js`；兩款 EMU 的特色由 `emu-mechanism.js` 管理。整車使用原本 LEGO style PNG 分件，part ID、每包三組、v1／v2 與 collection 保存規則均沿用。

## 特色與保存界線

- 包號分清兩種：`pN-*` 是原素材序號，舊 v1 的孩子包號也使用 N；v2 已預備好第 1 包的鐵軌素材，孩子只拿車體包，所以畫面包號為 N−1。
- **EMU3000**：原素材 `p7-*`（v1 第 7 包、v2 第 6 包）接車鼻、肩線與面罩；`p12-*`（v1 第 12 包、v2 第 11 包）接上方頭燈、下方燈組與前裙板。車頭三件與兩組燈都保存後，才能點「試亮頭燈」；特寫只呈現已保存的原始部件。燈光是玩具互動，不表示真車模擬。
- **EMU900**：原素材 `p8-*`（v1 第 8 包、v2 第 7 包）的三組雙扇門各分兩次操作。先拿左門扇接到工作台，再接右門扇，兩片到齊才保存原始 ID 一次。左扇暫放時顯示「接好後保存」；Escape 取消暫放。暫停可在同一頁接續，重整後依已保存 ID 還原。保存過的舊門組直接還原為完整雙扇，沒有要求再拼或再次扣包。
- 每一組雙扇門可用「滑開／合攏」、滑桿、左右拖曳或方向鍵反向開合；Home／End 直接收合／開啟。切換門組、全車、回看、暫停與離開會收起試玩位移。試玩不呼叫 collection，也不寫入進度。
- 四款完成作品皆有「玩玩零件」入口，用唯讀的 `inspection:true` 工作台保留試玩。EMU3000 即使把燈組留到最後一片，慶祝後仍能試亮；觀察模式不提供放件、開包或再次慶祝，退出回到原作品。
- EMU900 原 PNG 同時包含近側雙扇與遠側小面板。特寫以 SVG 裁切近側雙扇，保持門扇原比例，沿中縫分成左右片；整車仍呈現完整原圖。沒有新增替代整車或幾何門片素材。
- 四款施工與完成回玩的特寫使用隨視窗高度調整的 SVG viewport，圖像維持等比例置中；不讓窄長門片把整頁撐高。此尺寸限制只套用特色特寫，不改整車或舊三款的施工畫面。

## 操作入口與驗證

家長試拼：`docs/parent/train-preview.html?model=emu3000` 或 `?model=emu900`；該頁使用記憶體示範資料，不存取孩子進度。

隔離測試服務的既有半成品入口：`/test/workshop-fixture?model=emu3000&placed=30`（v2 收尾燈包）、`/test/workshop-fixture?model=emu900&placed=18`（v2 雙扇門包）。只適用本機 synthetic fixture，不是正式孩子資料操作。

```sh
node --test tests/test_emu_workshop.mjs tests/test_highspeed_workshop.mjs tests/test_e500_workshop.mjs tests/test_ct273_workshop.mjs tests/test_breezy_workshop.mjs
```

EMU tests 涵蓋任意順序舊半成品、v1／v2 全包保存、三組一包、stage 取消與暫停接續、保存失敗與離線標示、試玩不寫進度、缺零件鎖定、圖片失敗及未來包圖片不阻擋、快速連點與動畫取消。browser 版面與實際手勢結果由整合驗收紀錄補充；未宣稱實體 iPad 或孩子長期體驗已驗收。
