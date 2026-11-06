# 四上後半冊家庭複習

本任務由 [#249](https://github.com/huansbox/aiden-study/issues/249) 追蹤，適合四年級孩子。依 115 學年度康軒教材暫定數學 U6–U10、自然 U3–U4、社會 U3–U4；這不是校方正式考試範圍，正式範圍仍未取得。

自然 104 活動／180 原作答格、社會 53 活動／160 原作答格已完成內容核准與隔離驗證，本批待正式發布。自然實際操作為 188 決策，加上社會 160，合計 157 活動／340 原格／348 決策。數學仍在進行，本任務保持 `in-progress`；既有 #178／#191 的來源及品質 backlog 不因此結案。

## 使用及保留

發布後，孩子從首頁「自然」或「社會」進入四上單元，家長可用 Study 的不計分試玩確認內容。這批只開放自然 unit 29–30、社會 unit 31–32；數學 unit 24–28 尚未開放。主題為聲音與光、電路與用電、信仰與生活、老街與生活、生活作息、傳統節慶、現代節日。

哥哥已考的舊 unit 15–23 由個別孩子設定隱藏；所有舊內容、stable ID、作答進度與來源追溯保留，不把隱藏當成刪除或既有候選 backlog 完成。家長仍可查看舊單元與恢復入口。

## 來源與再製

私人資料根目錄為 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-2026-11-06/`，原卷、題文、答案及圖片不納入 Git。

- 自然：`science/authoring-v3/`；教材範圍證據見 [自然範圍核對](../../docs-dev/grade4-science-final-scope.md)。
- 社會：`social/candidate-v3/`；教材對照及來源逐格映射留在 `social/`。
- 獨立審查：`reviews/`；v3 delta 見 `content-v3-delta-result.json`，runtime 見 `integration-runtime-result.json`。
- 全量 157 活動、雙尺寸 child／preview 與 17 份獨立 oracle 證據：`integration/qa-science-social-v3-2026-11-07/`。
- 本批凍結內容、rev22 基線、重建工具、逐檔 SHA、驗證與發布／回復計畫：`integration/science-social-release/`。接手先讀該處 `CHECKPOINT.md` 及 `RELEASE.md`。

重建須先核對私人 frozen 資料 hash，再使用本 repo 的 `appendCatalog()` 由完整 rev22 接續 rev23，保持舊 465 活動／26 分包，新增 157 活動／4 分包。精確指令記於私人發布目錄；不可用未審候選或只含新題的包取代完整基線。格式契約見 [四上後半冊接入契約](../../docs-dev/study-final-contract.md)。

公開登錄／首頁重建：`node scripts/build-work-catalog.mjs`、`node scripts/build-home-release.mjs`，並各自以 `--check` 驗證。私人題文與核答不得改成公開測試 fixture。
