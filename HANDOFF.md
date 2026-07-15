# HANDOFF — 2026-07-15 平台線 code 票已清空，剩家長裁決與 pad 相關 HITL

## 目標
全家學習平台 9 張 sub-issues（spec＝#26）收尾。本 session 完成 #32（搬入 math＋spelling）與 #33（兩 app 接同步），詳見兩票的關票留言與 CLAUDE.md 對應條目。

## 進度
- 已完成：#32、#33 皆關票、live 部署＋live 驗收全過、KV 測試 key 刪淨（雲端現為零 key 乾淨狀態）。全部已落檔（CLAUDE.md／issue 留言／PR #46、#47），無半成品、無未提交變更。
- 進行中：無。**無 pad 可做的 code 票已全部清完。**
- 下一步：等家長輸入（見下方清單），或有 pad 時做 #35。

## 對話中已對齊、尚未落檔的決策
無——本 session 所有決策（#32 收割取消、#33 各實作取捨、review findings 處置）都已寫進票與 CLAUDE.md。本檔的價值只剩下面這份「等家長」彙整清單。

## 等家長裁決／HITL 彙整（散在各處，這裡集中列）
1. **PR #47 留言 3 條**（#33 review 留裁決）：spelling 匯入無 child 選擇器／重置後可匯出空進度代碼（皆屬將退役通道）／首題渲染串在 sync boot 後（弱網最長 ~5s）
2. **PR #43 留言 2 條**（#37 遺留）：換代強制 push 不看 dirty／換代 push 撞 409 健康燈誤標 retry
3. **#40-B**：同步接線平台化定向（債已擴到 4 app，票面明寫等家長）
4. **registry 內容過目**（#31 遺留）：animal-fight／aiden-english／99-meteor 的歸類假設；99timestable／world-cup 下落
5. **有 pad 時**：#35 iPad spike（擋 #34 掛網域）→ hub iPad 圖示 smoke（多一步選人）→ 圖示網址 `?k=` 填新 token（token 在 1Password）→ zhuyin #20 錄音＋checklist → study #11
6. **study 待辦**：家長真實備份檔對帳（檔不在 Mac，#28 遺留）

## 注意事項
- wrangler KV 查刪要 `--remote`、本機測 JS 快取要 bump `?v=`——皆已寫進 CLAUDE.md 陷阱區，接手先讀那節。
- 雲端目前零 key：小孩裝置一開始同步，順手看一眼 hub 家長視圖健康燈帶真資料的樣子（#31 遺留的最後驗收）。

## Suggested skills
- 家長回覆裁決後若要動 code：小改直接做；動 shared 接線層（#40-B 方向）先 `/grill-with-docs` 對齊
- 動手前後照慣例 `/code-review`（effort 隨規模）

## 如何接續
任一台機器：`git checkout master && git pull` → 讀本檔＋CLAUDE.md「#33」條目 → 向家長要上面清單的答案，或有 pad 就開 #35。

---
本檔讀完即刪（`/handoff` 接班流程會處理）。
