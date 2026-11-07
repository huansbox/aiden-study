# 四上後半冊家庭複習

本任務適合四年級孩子；既有整合見 [#249](https://github.com/huansbox/aiden-study/issues/249)，本次社會 U3 補強及發布由 [#254](https://github.com/huansbox/aiden-study/issues/254) 追蹤。依 115 學年度康軒教材暫定數學 U6–U10、自然 U3–U4、社會 U3–U4；這不是校方正式考試範圍，正式範圍仍未取得。

自然 104 活動／180 原作答格、社會 53 活動／160 原作答格已隨 rev23 正式上線。rev24 基線另追加數學 301 活動與電路操作 1 活動，全科合計 924 活動（數學 369／自然 322／社會 233）；數學 unit 24–28 分別為 76、62、43、62、58 活動，自然 unit 30 為 52 活動。

本次社會 U3 發布批已核准追加 15 活動／19 原作答格；追加後全科為 939 活動（數學 369／自然 322／社會 248）。社會 U3 由 11 增為 26 活動，其中「信仰與生活」由 5 增為 15、「老街與生活」由 6 增為 11；U4 保持 42 活動。預期發布版本為 rev25，正式發布與讀回核對仍依 #254 最新 checkpoint，不以候選核准代表已上線。活動數不等於原作答格或操作決策數。校方正式範圍仍待確認，本任務保持 `in-progress`；既有 #178／#191 的來源及品質 backlog 不因此結案。

## 使用及保留

孩子從首頁「數學」、「自然」或「社會」進入四上單元，家長可用 Study 的不計分試玩確認內容。本次發布版開放數學 unit 24–28、自然 unit 29–30、社會 unit 31–32。數學入口暫用概念名：三角形、二位小數、兩步驟與四則運算、分數、統計圖；自然／社會主題為聲音與光、電路與用電、信仰與生活、老街與生活、生活作息、傳統節慶、現代節日。

哥哥已考的舊 unit 15–23 由個別孩子設定隱藏；所有舊內容、stable ID、作答進度與來源追溯保留，不把隱藏當成刪除或既有候選 backlog 完成。家長仍可查看舊單元與恢復入口。

## 來源與再製

### 家長重點清單

[四上期末家長清單](../../docs/parent/exam2-guide/index.html) 提供數學／自然7單元、37項原創摘要與確認例；按科目瀏覽、逐項勾選及列印。從家長區固定入口或作品白板開啟。勾選只存本瀏覽器，不寫孩子成績、不跨裝置同步；紙本作圖、直式、列式和自行舉例需另外實際確認。

來源在 [source/parent-guide/](source/parent-guide/README.md)。重建：`node learning-tasks/grade4-sem1-exam2/source/parent-guide/build.mjs`，加 `--check` 核對產物。逐項私人原卷證據與驗收在 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-parent-guide-2026-11-07/`；本次交付由 [#255](https://github.com/huansbox/aiden-study/issues/255) 追蹤。沿用上次概念與推理方法分類，不以已數位化活動數推算學校常考率。

### 私人題包

私人資料根目錄為 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-2026-11-06/`，原卷、題文、答案及圖片不納入 Git。

- 自然：`science/authoring-v3/`；教材範圍證據見 [自然範圍核對](../../docs-dev/grade4-science-final-scope.md)。
- 社會：`social/candidate-v3/`；教材對照及來源逐格映射留在 `social/`。
- 獨立審查：`reviews/`；v3 delta 見 `content-v3-delta-result.json`，runtime 見 `integration-runtime-result.json`。
- 全量 157 活動、雙尺寸 child／preview 與 17 份獨立 oracle 證據：`integration/qa-science-social-v3-2026-11-07/`。
- 自然／社會 rev23 的凍結內容、rev22 基線、重建工具、逐檔 SHA、驗證與發布／回復計畫：`integration/science-social-release/`。接手先讀該處 `CHECKPOINT.md` 及 `RELEASE.md`。

自然／社會 rev23 由完整 rev22 接續，保留舊 465 活動／26 分包，新增 157 活動／4 分包。數學與電路的 rev24 以完整 rev23 為基線；精確凍結來源、重建及發布交接見 #249 checkpoint 指向的私人附件。

本次社會 U3 私人資料另存 Dropbox 相對路徑 `mywork/aiden-study/grade4-sem1-exam2-social-u3-2026-11-07/`。新查核 3 份原卷及 1 份答案卷，採用大墩 112 上期末的 14 活動／16 格、明義 110 上期中的 1 活動／3 格；中山 108 卷保留備查，採用題無官方雙解。候選與來源追溯見該處 `candidate-v2/`、`source-provenance.json` 及 `reviews/root-approved-v2.json`，公開摘要見 [社會 U3 新卷補強批次](../../docs-dev/grade4-social-study-unit-three-more-paper-batch.md)。

本批須以完整 rev24 的 924 活動／43 分包為基線，核對私人 frozen 資料 hash，再使用本 repo 的 `appendCatalog()` 追加，保持全部舊活動與分包。rev25 的精確凍結來源、manifest hash、分包數、驗證與發布／回復紀錄依 #254 最新 checkpoint 指向的私人附件；不可用未審候選或只含新題的包取代完整基線。格式契約見 [四上後半冊接入契約](../../docs-dev/study-final-contract.md)。

公開登錄／首頁重建：`node scripts/build-work-catalog.mjs`、`node scripts/build-home-release.mjs`，並各自以 `--check` 驗證。私人題文與核答不得改成公開測試 fixture。
