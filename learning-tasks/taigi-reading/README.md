# 〈阮小妹〉台語朗讀

桃子腳校內朗讀的家庭練習。第一輪使用〈阮小妹〉第一段，讓四年級孩子先看懂句意、逐句聽讀，再回到紙本自己讀。進度與家長試用見 [#274](https://github.com/huansbox/aiden-study/issues/274)。

## 第一段練習

開啟私用 `mywork/aiden-study/taigi-reading/mock/index.html`，播放兩幕短片，再逐句聽完自己念。七個片段都可往回重播，難詞提示可按需展開。念順後播放完整第一段，跟著學校示範念，最後看著紙本自己讀一遍。

兩幕畫面由 Claude Opus 製作成 CSS 動畫，短片、逐句與整段播放都使用學校原音。整段從原音擷取連續區間，保留示範原本的停頓。

## 重建

在本任務目錄執行 `python3 build_mock.py <私人任務資料夾>`。需要 Python 3 和 FFmpeg，私人任務資料夾須有以下檔案。

- `source/01_阮小妹.mp3` 取自學校講稿 QR code。
- `source/segments.json` 含核對過的學校原音起訖與紙本原句。

輸出 `mock/index.html` 為可離線開啟的單檔。講稿、私用起訖資料、音訊與內嵌音訊的 HTML 放在 Dropbox 專案目錄。
