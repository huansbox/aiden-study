# 悠閒午後：閱讀心智圖

- 日期：2026-09-15；對象：9 歲孩子，iPad 橫向操作。
- 狀態：實作與本機驗證完成；獨立 worktree `codex/reading-leisure-afternoon`，尚未發布。
- 內容依使用者提供的 260915-1～3.jpeg；last.jpeg 是上次作業的老師回饋。原照片不公開入庫。

## 使用與設計

中心使用課文原題〈悠閒午後〉。依文章安排「行程、園景、杜甫詩、相通、心意」五條主枝，每一步讓孩子選短詞；園景選兩個，其餘選一組說法。選項均有文章依據，不計分。完成後抄寫中心、主枝與短詞。

上次老師補「貢獻」一枝，顯示只讓孩子任選重點可能漏掉重要段落。本次各主枝必填，杜甫詩的四種景物成組保留，「詩與照片的關係」與「表達深情」不與景物共用名額。所有組合最多 60 字，不在孩子畫面顯示字數。

## 來源與再製

- `source/coverage.md`：照片段落與五條主枝的對照。
- `source/index.html`、`source/style.css`、`source/app.js`、`source/content.js`、`source/app.webmanifest`：唯一可編輯來源。
- `build.mjs`：將來源複製成 GitHub Pages 部署檔 `docs/leisure-mind-map/`；產物不要手改。
- `output/`：代表性完成圖預覽（驗證後保存）。
- 字型沿用 `docs/assets/fonts/BpmfZihiSans-Bold.ttf` 與既有授權；不複製另一份字型。

重建：`node learning-tasks/leisure-afternoon/build.mjs`。以靜態伺服器提供 `docs/`，開啟 `/leisure-mind-map/`。完成圖可直接列印。進度獨立存於此瀏覽器，與上次心智圖及學習平台進度分開；沒有離線或跨機同步功能。

參考：[上次任務](../reading-mind-map/README.md)。iPad 橫向、粗體注音與連線避字沿用其經驗，本次未改動舊作業。

## 驗證結果

2026-09-15：240 種合法選法均保留五枝、詩中四景與喜愛自然，含中心及枝名皆為 58 字；僅在本紀錄核對，不顯示於孩子畫面。Node.js 全套通過；Python 183 passed、1 skipped（worktree 未含不入庫的期中 PDF，既有 PDF 回歸測試依設定跳過）。瀏覽器完成五步、園景兩張限制、回頭修改、重新整理還原均通過；console 無錯誤。

1024×650 的五步按鈕與完成圖操作列可見；完成圖另驗 1024×768、1180×720、768×1024、390×844。文字盒無互相重疊、SVG 連線取樣未進入文字周圍 3px 範圍。iPad 真機與列印仍待家長驗證。
