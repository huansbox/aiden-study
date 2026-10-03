# 四上數學文字題補充（#148）

2026-10-03：[本批追蹤與發布證據](https://github.com/huansbox/aiden-study/issues/148)。家長授權先補可用既有 iPad 選答、數字及比較符號輸入的歷屆題，包含 E2E 與 housekeeping。本頁先記錄已核准內容；正式發布以 issue 的管理端讀回為準。

## 內容與界線

從既有八份原卷選出 7 個新 activity：U1 2、U2 2、U4 2、U5 1；全數屬暫定核心。數學由 57 增為 64，U1～U5 為 20／14／5／14／11；自然 40 題保留，候選 revision 9 共 104 個 activity。新增格式為五道四選一、一道數字填空及一道比較符號填空，沒有 agent 變式。

五題有官方答案；桃子腳 114 與民權 114 的兩題沒有官方答案，由作者與獨立 reviewer 分別解題後一致，`answerPage` 保持 `null`，不捏造答案來源。七題原卷相關完整頁、大題指示、選項、單位、概念範圍及機器答案／解說均核對；精確集合及來源見[選題 metadata](../data/study/g4-s1-math-u1/math-text-batch-selection-metadata.json)。私人作者稿與獨立推理不放進 Git。

原先的部分數列、商位數候選要求列式、列出全部可填數字或其他未支援格式，已排除；不把它們改成只驗最終數字來充數。角圖、量角器、作圖、直式／驗算、M5b 及後續單元仍留待相應需求。本批不宣稱已補滿所有數學題型，正式考試範圍仍待確認。

題型報告沿用單一主要推理模式計數，現行結果見[數學題型與題數](grade4-math-pattern-counts.md)。新增模式與逐題分類另經核對；不更動舊 57 題分類或 App 的既有進度索引。

## 基線與重建

基線為 revision 8、97 題（數學 57／自然 40）、130248 bytes，SHA256 `ca46fc48b990a43e4c104488b85b83a4fbbbd138d21b01844039cef6b4b8ab29`。來源在 canonical ignored `data/private/study/g4-s1-math-u1/rev8-release/`；舊歸檔不修改。

本批可編輯真題、解說、題包及 QA 固定保留於 ignored `data/private/study/g4-s1-math-u1/`。`math-text-batch/` 保存三份作者 pending delta、作者 QA、獨立內容審查、核准集合與指紋、rev8 baseline、重建與 E2E 腳本。作者原稿不因放行或發布而改寫。重建時先依私人歸檔 README 恢復資料，再於 repo 根目錄執行：

```powershell
uv run python data/private/study/g4-s1-math-u1/math-text-batch/rebuild_rev9.py --check
uv run python data/private/study/g4-s1-math-u1/math-text-batch/rebuild_rev9.py --promote
uv run python data/private/study/g4-s1-math-u1/math-text-batch/verify_rev9.py --candidate
node scripts/build-study-pattern-report.mjs --check --pack data/private/study/g4-s1-math-u1/pack.json
```

`--check` 要求核准集合與作者／review 指紋；`--promote` 另要求核准題包 SHA256，通過後才寫正式 inputs、公開 mapping 及精確 ignored `pack.json`。舊 97 題、解說、mapping 與舊數學分類逐值保留。公開 metadata 的待發布／已發布狀態切換不改題包 bytes。完整 builder 契約見[私用題包重建](grade4-u1-private-pack-build.md)，容量決策正本見 Wiki [Study 私用題包容量](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack)。

## 驗證與發布

核准候選為 revision 9、104 題、135176 bytes，SHA256 `b1817152bd4b8ea067de7d8d9cb663870c9a836072dabd9675a113dcb399d346`。距離 256 KiB 上限尚餘 126968 bytes。

已通過 774 項 Node 測試、274 項 Python 測試（1 項既有缺 PDF 跳過）、catalog 與報表一致性、核准閘門負向測試及獨立技術 review。驗證使用隔離的 test-child、memory KV 與 Chromium 的 iPad 768×1024／1024×768 尺寸，阻擋非 localhost 連線；新題逐題錯答、重試、重載、答對與批末，數字及比較輸入、既有多空、rev8 升版保留進度、每題 `family.record()` 與批次結束才 `family.finishRound()`、家長試玩不寫孩子資料均通過。代表畫面已目視核對。這不等於實體 iPad／Safari 實測；私人證據隨本批歸檔。

本批預設為 content-only：公開 metadata 與相關程式檢查合併後，重新核對現役 Worker 及固定 KV 的 rev8 基線，再對 `c:study:g4-s1-math-u1` 一次前向寫入核准題包；立即與傳播後讀回比對 revision／題數／bytes／SHA256。未改動的 Worker 不重新部署；不使用正式家庭 session，不讀寫孩子 `p:` 資料。發布後將分類與 selection 狀態更新並記錄交付。

## 收尾

私人來源、核准產物、覆核、E2E 與發布證據保存至 canonical ignored `rev9-release/`，逐檔 manifest 核對後才封存本批工作目錄。上一批容量工作目錄也在確認只有可重建 cache 後封存；其他含私人原件的自然工作目錄保留。實際封存、分支與測試程序處理結果見 #148 結案留言。
