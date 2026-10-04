# 四上自然練習量擴充（#175）

本批已通過獨立內容審查的集合是 **114 個完整活動、119 個原卷作答格**：桃子腳 54 活動／59 格、永安 60 活動／60 格。目前為 `reviewed_pending_release`，尚未正式發布；現役仍是 rev14 的自然 45 活動、全科 137 活動。本批使用先前已取得的桃子腳 113／114、永安 113／114 四卷，沒有新增原卷或校方答案。

公開逐題來源與決策以 [selection](../data/study/g4-s1-science-exam1/volume-selection-metadata.json) 為準；四卷完整狀態與剩餘數量以 [backlog metadata](../data/study/g4-s1-science-exam1/volume-backlog-metadata.json) 為準。作者 [桃子腳 inventory](../data/study/g4-s1-science-exam1/volume-tyk-inventory.json)／[永安 inventory](../data/study/g4-s1-science-exam1/volume-yap-inventory.json) 保留審查前凍結資料，不代表最終核准集合。練習量與題型覆蓋的長期原則見 [Wiki Study-Private-Pack](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)，本頁只記本次交付。

## 內容與範圍

新增集合含 106 個 `true_false`、7 個 `multiple_choice`、1 個六小題 `grouped_choice`。保留同概念的不同問法；只排除真正重複、範圍不符或無法消除的歧義。原完整分類題組維持六格共用選項，沒有為增加活動數拆成六個活動；原卷正確敘述勾選題則保留共同指示後，逐敘述改是非，已逐題覆核學習目標與答案等價。

兩份作者稿原共有 116 活動／121 格。fresh review 將 `tyk114-01-05` 與 `tyk114-03-07` 兩格延期；原稿不改寫、不以修成不同意思的新題硬納。桃子腳 113 有校方答案的收錄題逐題獨立核答並比對校答；其他三卷未取得校答的收錄題由作者與 fresh reviewer 各自解題。題文、選項、答案、解說、原頁、QA 與含答案的 review 理由全部保存在 ignored 私人資料。

今年康軒的「地表的靜與動」「水生生物與環境」仍為暫定核心，桃子腳 115 四上正式考試範圍尚未取得。桃子腳 113／114 出版社未知；永安 113 康軒、114 南一沿用原來源證據。這批不改寫原年級、學期、出版社或考次，也不宣稱已補齊地表操縱變因與實測結果表的題型缺口。

## 四卷剩餘盤點

四卷共有 353 筆來源記錄（桃子腳 200 格＋永安 153 個小項），合計 355 個作答格；按原 scope 逐格 join，不能把這兩種原始記錄口徑合稱 review items，也不能把它們當成 355 個可獨立上線活動。

| 暫定核心作答格 | 格數 |
| --- | ---: |
| 先前已發布 | 62 |
| 本批通過 review、待發布 | 119 |
| 先前已排除 | 3 |
| 仍需必要圖表／共同材料 | 33 |
| 科學敘述或條件有歧義、待核 | 18 |
| 暫定核心合計 | 235 |

核心仍有 **51 格**待處理；另有原 `future` 範圍 97 格、原 `needs-confirmation` 範圍 23 格，各自保留，不把待確認範圍混入科學歧義。兩個 fresh review 延期格已計入上述 18 格。各卷逐格定位、最終狀態與計數口徑以 backlog metadata 為準。

## 候選建置與驗證

rev15 候選為全科 **251 活動**（數學 68／自然 159／社會 24）；自然共 **191 作答格**，unit 20 為 61 活動、unit 21 為 98 活動。8 個 shard 中只自然兩份變更，其餘六份 hash 不變；legacy rev12 單包固定保留，不改寫。

| 候選內容 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 391,746 | `cda959295214019913a509577c527e51b2260612d4433df328c07ac44354305a` |
| manifest | 22,598 | `073b911be60bfceb910bac6de144ff6b15b381894c4af43c9b56d53df0dca13e` |

私人基線與完整候選在本批 ignored `data/private/study/g4-s1-math-u1/science-volume-batch/`。`rev14-baseline/` 精確複製 canonical `rev14-release/private/rev14-candidate/` 完整來源、curated、explanations、mapping 與 shard，保存逐檔 hash 及重建前提。`delivery/make_content_approval.py` 將 root 明確核准綁定兩份獨立 review 與全部作者稿／QA／inventory 的 SHA256；`delivery/build_rev15.py` 才據核准集合重建 `rev15-candidate/`。未核稿不可自動變成已核，也不可拿 draft QA catalog 發布。

Production builder／catalog validator 已通過，舊 **137 個活動與全部解說逐值不變**，原 curated／mapping 137 列也逐值保留。新 `practiceId` 使用 `S1-V###`／`S2-V###`，避開歷史 reserved IDs。七個自然主題維持原分類，只新增三個細標籤對應；每個自然活動恰好屬於一個主題，孩子頁與家長試玩引用相同新版本 URL。

本機 Playwright 使用 loopback、fake identity 與合成進度；768×1024／1024×768 的家長試玩共 **228 次新題全量檢查**，題數、選項、題組一次一小題與橫向溢出守衛通過。代表五種 unit／格式組合覆蓋錯答、reload 接續、答對與下一批，舊數學／自然進度哨兵保持；沒有連到正式家庭資料。這是桌面 Chromium 的 iPad 尺寸隔離驗證，並非實體 iPad Safari 驗收。

隔離 QA 另外重現了快速啟動的既有載入問題：cached reload 的練習按鈕已可按，但同版 catalog 背景重驗若在單元準備期間完成，會因目錄物件被替換而取消第一次點擊，畫面留在首頁；再次點擊可開始。孩子頁現在於快取儲存返回後重新使用既有 production manifest validator 核對，只有已驗證的同版同內容保留原目錄物件與 ready 狀態；真正升版／同版異內容仍遵守原有守衛。Node 行為回歸修前失敗、修後通過；真 DOM 確定性交錯檢查覆蓋同版首次點擊成功、真正升版不啟用舊準備且進度保持、同版異目錄拒收。22 次 cached reload／背景回應延遲壓測修前 2 次取消、修後 0 次；修後完整新題 E2E 也通過。證據在 ignored `delivery/e2e/rev15/`，沒有更改 Worker、parser 或進度格式。

本輪 Python 全套為 278 passed／1 skipped；Node 首輪 814 passed／1 failed，失敗是公開數學 generated report 隨 mapping revision 更新後尚未重建。重建後相關 14 項檢查全通，45 patterns／68 assignments 逐值不變；新增載入回歸後 loader／catalog／preview 50 項通過，最終完整結果仍由精確 PR head CI 核對。

正式管理端唯讀查核已確認 rev14 manifest 137 活動／12,611 bytes、SHA256 `e5826ae159f4a02287744d4335d09bee85fd4befa56bebcc61ae4bab1bc7f8fb`，legacy rev12 132 活動／229,503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f`；現役 Worker 為 `808dccba-a4d0-4b4a-afa4-5b6c8789c990`、100%。本次沒有 Worker／parser 變更，不重新 deploy 舊 Worker。正式寫入仍須等 root 的最終 count／revision／hash 核准、PR／CI 與 Pages 精確資產讀回，再依新 immutable shards → 兩階段讀回 → manifest → 兩階段讀回順序發布。

## 再製入口

從具備私人來源的本 worktree 執行：

```powershell
uv run python data/private/study/g4-s1-math-u1/science-volume-batch/delivery/build_rev15.py
uv run python data/private/study/g4-s1-math-u1/science-volume-batch/delivery/project_public.py --write
node data/private/study/g4-s1-math-u1/science-volume-batch/delivery/browser_check.mjs data/private/study/g4-s1-math-u1/science-volume-batch/rev15-candidate/catalog
```

完整來源／重建工具／四卷原件／作者與 reviewer 證據／發布讀回完成後才封存至 canonical `data/private/study/g4-s1-math-u1/rev15-release/` 及 Dropbox 相對路徑 `mywork/aiden-study/science-volume-2026-10-04/`，逐檔核 hash 並獨立重建；不無差別複製整串舊 release。本機 Dropbox 根已於 2026-10-04 核對為 `C:/Users/linshuhuan/Dropbox`；跨裝置同步仍須接收端讀回確認。本節不是正式發布或封存授權。
