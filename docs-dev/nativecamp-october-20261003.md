# Native Camp 十月課程複習驗證

追蹤 [#142](https://github.com/huansbox/aiden-study/issues/142)。本批已確認課程為 2026-10-02 19:30 Denny；家長原指定的 10/1 未出現在一般或已刪除課程記錄，另一堂日期待家長確認，不以 10/3 取代或推測 10/1 內容。

從 `origin/master` 的 `cf175226462db20020c7fd8f4ffd6b9c2ec40813` 建立隔離工作分支；原 checkout 與 8791 保留。只新增題包、原創 TTS 與任務登錄，不改 runtime、舊課、正式孩子進度或 weekly 排程。

## 內容與來源

10/2 共 6 概念、36 題：果園／玉米田與新舊、建築單複數、比較角色、住家描述、too 的情境判斷、喜好肯否。Try 備有 18 題，先跨概念 Build／Change，需要才補 Fix；Say 每回一概念 2–3 題。短英文 fact card 支援完整句，並提供可選 hint 及答後 explanation，不以額外長句增加難度。

完整單軌原音 1,529.280 秒已核對 hash、格式及完整解碼。本機雙聲道 ASR 抽查 8 個時間窗、388 秒，確認教學範圍；不把教材播放、老師示範或 ASR 誤辨當成孩子的獨立表現。來源時間與限制見 [evidence-review](../learning-tasks/nativecamp-2026-10-02/source/evidence-review.md)。私人錄音／網站逐字稿不進 Git，也不送 OpenAI。

Fresh read-only reviewer 逐題核對後，修正三類問題：`not very`／`not too` 的自然排列歧義、住家提問先播出 accepted 完整答案，以及果園問題沒有明示要求說地方類別。修正後複查，內容審查無未結案 finding；此項不等於音訊已通過。

## 音訊

OpenAI `gpt-4o-mini-tts-2025-12-15`、Cedar、speed 1.0；72 個預製 MP3，重播不再呼叫 API。首次生成 72 次均有 verified response。固定 credential helper 與單一 private request journal 保留，未自動重送結果不確定的付費請求。

72 檔的 input fingerprint、hash、完整解碼與非靜音檢查通過。全部檔案用本機 small.en 全文辨識，16 個初始差異另用 large-v2 交叉，保留各檔目前 hash 與原始辨識文字；不向模型提供預期文字。

`farm-places-say-1-q` 初版與第一次品質替換都被兩模型辨識為缺少句尾指示。保留兩次已成功回應、原檔及 receipt，將此題語音改為先說明句首，再提出問題；第二次品質替換已被兩模型完整辨識，題意與示範不變。其餘 71 檔未重製。共 74 次成功生成請求，其中 2 次為同一檔的品質替換；沒有不確定請求或自動重試。API 未提供 token usage，實際費用記為未知。

剩餘辨識差異為逐檔保留的 Lina／Lena、too／to／two／2；沒有用全域替換隱藏實質漏字。Fresh read-only 音訊 reviewer 已核對 72 個實檔及現行辨識證據，未發現未處理的實質缺陷；見 [tts-review.json](../learning-tasks/nativecamp-2026-10-02/source/tts-review.json)。ASR 不等同人耳自然度或真實 iPad 驗聽。

## 行為與回歸

隔離本機 8807、synthetic test token／記憶體資料：

- Preview 可選 36 題、Say 示範遮蔽／揭曉正常；操作前後 progress 回應相同。
- 390px 窄版的 document clientWidth／scrollWidth 均為 375px，沒有橫向溢出；已恢復暫時 viewport override。
- 題目與答案音檔可載入，揭答觀察到 Playing；不把播放狀態當作人耳驗聽。
- Try 果園題先選 apartment，再訂正 orchard；畫面和存檔仍保留第一次 incorrect。
- Say 建築概念以 With help／Got it／Got it 完成三題，第三題回到單一 old hotel 短句，正常回合收尾。
- 六概念的 Build／Change 全部首次獨立成功時，core 驗證都省略 Fix。
- 原 25 筆課程 catalog 及舊題包保留；此次驗證未讀寫正式孩子資料。

既有 Node 770/770、Python 271 passed／1 skipped。略過項目為 worktree 沒有既有私人 PDF；本批 catalog builder 與 lesson builder 可重建。PR 的 CI 與正式發布資源 SHA 核對另記 #142。

尚未進行：孩子難度／耗時實測、真實 iPad 播放，以及成人逐檔聆聽。工作目錄保留私人來源與製作 receipt；歸檔依 [Native Camp Storage Wiki](https://github.com/huansbox/aiden-study/wiki/Native-Camp-Storage)。
