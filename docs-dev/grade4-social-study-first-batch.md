# 四上社會首批 Study 題庫（#154）

本批承接 [#154](https://github.com/huansbox/aiden-study/issues/154)，數學後續補題暫緩，先建立「四上社會歷屆題庫 → iPad 練習」。來源與課程核對見[收卷任務](../learning-tasks/grade4-sem1-social-exam1/README.md)及[課程對照](../learning-tasks/grade4-sem1-social-exam1/source/curriculum-comparison.md)。本文件在正式發布前只記候選與驗收契約；實際發布依 Issue 的最新交接與管理端讀回證據。

## 範圍與呈現

校方 115 學年度版本表確認四年級社會採康軒。新舊課本章節拆法不同，原卷出版社未明示時仍記 unknown；不以相同單元號或同校出題推定同版本。首次範圍採新版第一單元「家鄉的自然環境」，正式段考範圍仍待校方公告。舊卷題目按實際概念對照，而非整張考卷直接納入。

首批只開 `subject: social`、global `unit: 22`，呈現為第 1 單元。概念選單使用「地圖與位置」「地形與生活」「氣候與水資源」三個大主題；不把課綱代碼拆成孩子需要逐一選擇的分類。純文字四選一與是非題優先，每題保留完整指示與必要背景，沿用每批最多 10 題、家長試玩及既有作答回饋。未取得足夠來源、需要圖表或共享作答依賴的題先保留，不能丟圖或省略條件硬轉為文字題。

## 私用內容與穩定識別

沿用歷史 packId `g4-s1-math-u1`、固定內容 key `c:study:g4-s1-math-u1` 與 ignored `data/private/study/g4-s1-math-u1/`。名稱雖有 math，實際為家庭跨科題包。社會使用獨立 `social-g4s1-...-v1` stable ID；保留三下公開社會、既有四上數學 68 題與自然 40 題、原始題文／答案／解說／mapping 和孩子進度。社會題不納入數學題型報表的分母。

本批基線為 revision 10、108 個 activity、186717 bytes、SHA256 `fe6ab5874454e88fedfdf8f56305d8d52fd1bab188b311a8588f4884f5a65fd1`。容量維持 256 KiB。候選、轉寫、官方答案核對、獨立覆核、整合與測試證據只放私人目錄；公開僅保存來源定位、課程對照、分類及數量。

已核准的首批候選為 19 個完整 activity：112 年 6 題、113 年 13 題；9 題四選一、10 題是非，地圖與位置 11 題、地形與生活 3 題、氣候與水資源 5 題。19 題皆有校方答案，作者與 reviewer 分別自行解題後核對一致。113 年原題「正確打勾、錯誤留白」已按原指示核對，轉成兩個是非按鈕。114 年原卷保存供後續，本批未使用。原卷需圖表、地方連續線索或跨單元的題不硬轉。

候選 revision 11 共 127 個 activity（數學 68／自然 40／社會 19）、200737 bytes、SHA256 `4afbc74258f47d41489cd109d9119240d44844c4b0f73eb414831dff73b9784b`，距 256 KiB 上限尚餘 61407 bytes。公開[選題 metadata](../data/study/g4-s1-math-u1/social-first-batch-selection-metadata.json)記精確集合，核准不代表已發布。私人 `social-first-batch/approval.json` 綁定作者稿、selection、QA、獨立內容審查與候選指紋；`integration/rebuild_rev11.py --check`／`--promote` 另核四份原題／答案 PDF、校卷 manifest 身分、舊 108 題逐值保留及三科數量。

內容作者與獨立 reviewer 各自解題，再核對官方答案及原卷相關整頁。Root 核准精確集合、review 與來源指紋、預期 pack SHA256 後才提升為可發布內容。不以候選數、原卷作答格數或下載完成宣稱已上線。

## 驗收與發布順序

Builder、瀏覽器 parser 與 Worker 同步放行社會 unit 22 的文字四選一／是非；不放行其他社會單元、填空、PNG、表格或 grouped_choice。首頁、家長安排與試玩依科目／單元明確對應，避免既有「unit ≥ 20 都是自然」的假設把社會歸錯科。

驗收包含候選真包、舊 108 題逐值比對、數學 68 題／45 題型不變、revision 升級保留進度與半批，以及隔離 test-child／fake KV 的 iPad 直橫尺寸流程。確認正誤、重試、重載、家長試玩不寫孩子資料；作答時即時 `family.record()`，獎勵只在批末 `family.finishRound()` 顯示。尺寸模擬不宣稱為實體 iPad／Safari 實測。

Runtime 有改動，Worker 亦 import 新 parser，因此採核准 PR／CI → 核對現役 Worker 與遠端基線 → 新版 Worker → 合併並等待 Pages 成功 → 精確 HTML 與新版資產 URL bytes 核對 → 再核正式 rev10 基線 → 一次前向寫入核准 rev11 → 立即與超過 60 秒讀回。Pages 完成前不先請求新 cache query，避免舊檔被快取到新 URL。不使用正式家庭 session 或孩子 `p:` 資料。

收尾保留可重建題包、官方 PDF、課程來源、作者與覆核、發布及 QA 證據，逐檔 manifest 核對後才封存本批 worktree。其他 session 與既有歷史原件保留。長期契約以 Wiki [Study 私用題包](https://github.com/huansbox/aiden-study/wiki/Study-Private-Pack) 為正本。
