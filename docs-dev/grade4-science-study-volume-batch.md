# 四上自然練習量擴充（#175）

本批 **114 個完整活動、119 個原卷作答格**已於 2026-10-04 正式發布：桃子腳 54 活動／59 格、永安 60 活動／60 格。現役 rev15 為自然 **159 活動／191 作答格**、全科 **251 活動**；原 rev14 的 137 活動與全部解說逐值保留。本批使用先前已取得的桃子腳 113／114、永安 113／114 四卷，沒有新增原卷或校方答案。

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
| 本批已發布 | 119 |
| 先前已排除 | 3 |
| 仍需必要圖表／共同材料 | 33 |
| 科學敘述或條件有歧義、待核 | 18 |
| 暫定核心合計 | 235 |

核心仍有 **51 格**待處理；另有原 `future` 範圍 97 格、原 `needs-confirmation` 範圍 23 格，各自保留，不把待確認範圍混入科學歧義。兩個 fresh review 延期格已計入上述 18 格。各卷逐格定位、最終狀態與計數口徑以 backlog metadata 為準。

## 建置與驗證

rev15 為全科 **251 活動**（數學 68／自然 159／社會 24）；自然共 **191 作答格**，unit 20 為 61 活動、unit 21 為 98 活動。8 個 shard 中只自然兩份變更，其餘六份 hash 不變；legacy rev12 單包固定保留，不改寫。

| 已發布內容 | bytes | SHA256 |
| --- | ---: | --- |
| 完整 `catalog/source.json` | 391,746 | `cda959295214019913a509577c527e51b2260612d4433df328c07ac44354305a` |
| manifest | 22,598 | `073b911be60bfceb910bac6de144ff6b15b381894c4af43c9b56d53df0dca13e` |
| 自然 unit 20 shard | 124,688 | `2ae0c11162595800834c87440a49c5b7151482fece9861b5e01b7f7541ba7261` |
| 自然 unit 21 shard | 108,485 | `83eac9461c6e4476f1d3c57c3645b5c048c5797a02f6883471ca7cf25dce1f74` |

私人基線與完整候選在本批 ignored `data/private/study/g4-s1-math-u1/science-volume-batch/`。`rev14-baseline/` 精確複製 canonical `rev14-release/private/rev14-candidate/` 完整來源、curated、explanations、mapping 與 shard，保存逐檔 hash 及重建前提。`delivery/make_content_approval.py` 將 root 明確核准綁定兩份獨立 review 與全部作者稿／QA／inventory 的 SHA256；`delivery/build_rev15.py` 才據核准集合重建 `rev15-candidate/`。未核稿不可自動變成已核，也不可拿 draft QA catalog 發布。

Production builder／catalog validator 已通過，舊 **137 個活動與全部解說逐值不變**，原 curated／mapping 137 列也逐值保留。新 `practiceId` 使用 `S1-V###`／`S2-V###`，避開歷史 reserved IDs。七個自然主題維持原分類，只新增三個細標籤對應；每個自然活動恰好屬於一個主題，孩子頁與家長試玩引用相同新版本 URL。

本機 Playwright 使用 loopback、fake identity 與合成進度；768×1024／1024×768 的家長試玩共 **228 次新題全量檢查**，題數、選項、題組一次一小題與橫向溢出守衛通過。代表五種 unit／格式組合覆蓋錯答、reload 接續、答對與下一批，舊數學／自然進度哨兵保持；沒有連到正式家庭資料。這是桌面 Chromium 的 iPad 尺寸隔離驗證，並非實體 iPad Safari 驗收。

隔離 QA 另外重現了快速啟動的既有載入問題：cached reload 的練習按鈕已可按，但同版 catalog 背景重驗若在單元準備期間完成，會因目錄物件被替換而取消第一次點擊，畫面留在首頁；再次點擊可開始。孩子頁現在於快取儲存返回後重新使用既有 production manifest validator 核對，只有已驗證的同版同內容保留原目錄物件與 ready 狀態；真正升版／同版異內容仍遵守原有守衛。Node 行為回歸修前失敗、修後通過；真 DOM 確定性交錯檢查覆蓋同版首次點擊成功、真正升版不啟用舊準備且進度保持、同版異目錄拒收。22 次 cached reload／背景回應延遲壓測修前 2 次取消、修後 0 次；修後完整新題 E2E 也通過。證據在 ignored `delivery/e2e/rev15/`，沒有更改 Worker、parser 或進度格式。

本機 Python 全套為 278 passed／1 skipped；Node 首輪 814 passed／1 failed，失敗是公開數學 generated report 隨 mapping revision 更新後尚未重建。重建後相關 14 項檢查全通，45 patterns／68 assignments 逐值不變；新增載入回歸後 loader／catalog／preview 50 項通過。精確 PR head 的[完整 CI](https://github.com/huansbox/aiden-study/actions/runs/37191754351)成功；CI 環境的 Python 為 274 passed／5 skipped，與本機環境分開記錄。

## 正式發布證據

[PR #176](https://github.com/huansbox/aiden-study/pull/176)合併於 `0f5ea3a7878b4b052cc7d590ff9c3d063779c99f`；通過 CI 的精確 head `26106cce609b9b9b961a38c031f3e471ad20edbb` 與 merge 的完整 Git tree 相同。[Pages run](https://github.com/huansbox/aiden-study/actions/runs/37191848318)成功後，孩子頁、家長試玩與全部直接引用 script／CSS 共 19 個精確 URL 讀回均與 merge Git bytes 相同。私人證據為 `delivery/runtime-ci-proof.json`、`runtime-blob-proof.json`、`pages-proof.json`。

root 核准後，管理端先核對 rev14 manifest 137 活動／12,611 bytes、SHA256 `e5826ae159f4a02287744d4335d09bee85fd4befa56bebcc61ae4bab1bc7f8fb`，再依新 immutable shards → 兩階段讀回 → manifest → 兩階段讀回順序發布。兩份新 shard 在 UTC 09:27:03.476209／09:28:20.787201 讀回一致，相隔 77.310992 秒；rev15 manifest 在 UTC 09:29:13.688578／09:30:45.007905 讀回一致，相隔 91.319327 秒，均為 251 活動／22,598 bytes 與上述核准 hash。

baseline 與兩次 manifest 讀回各自確認 legacy rev12 132 活動／229,503 bytes、SHA256 `2e2c94e743c8eb31d9d658b1177a7ebf87c27429aa468fdc611fb3cf136f3d2f` 不變，現役 Worker `808dccba-a4d0-4b4a-afa4-5b6c8789c990` 保持 100%。本次沒有 Worker／parser 變更，沒有 deploy Worker；其餘六份 shard 與孩子進度未改寫。正式原始讀回與 receipt 保存在 ignored `ops/readback/`，公開 selection／backlog 已由這些證據驗證後投影為 `published`。

## 再製入口

從具備私人來源的本 worktree 執行：

```powershell
uv run python data/private/study/g4-s1-math-u1/science-volume-batch/delivery/build_rev15.py
uv run python data/private/study/g4-s1-math-u1/science-volume-batch/delivery/project_public.py --state published --check
node data/private/study/g4-s1-math-u1/science-volume-batch/delivery/browser_check.mjs data/private/study/g4-s1-math-u1/science-volume-batch/rev15-candidate/catalog
```

完整重建資料的 canonical 入口為 `D:/mywork/aiden-study/data/private/study/g4-s1-math-u1/rev15-release/`：`private/rev15-candidate/` 保存 curated、explanations、mapping 與 `catalog/source.json`；`private/rev14-baseline/source.json` 提供完整上一版重建基線，`private/ops/RESTORE.md` 保存恢復步驟。封存完成前仍使用上述本批工作目錄；不能只拿 legacy rev12 單包作上一版來源。

正式題庫已發布；封存完成狀態與逐檔核對結果以 [#175](https://github.com/huansbox/aiden-study/issues/175) 最新交接 comment 為準，使用前核對該證據。封存內容包含四卷原件／113 校答／必要原頁與 crop、兩作者凍結稿／QA／fresh review、重建工具與發布及測試證據，目的地為 canonical 及 Dropbox 相對路徑 `mywork/aiden-study/science-volume-2026-10-04/`；兩份逐檔核 hash 並各自重建 source／manifest／全部 shard，相符後才能封存工作樹，不無差別複製整串舊 release。本機 Dropbox 根已於 2026-10-04 核對為 `C:/Users/linshuhuan/Dropbox`；跨裝置同步仍須接收端讀回確認。
