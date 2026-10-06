# 一千根琴弦：閱讀心智圖

- 日期：2026-10-06；對象：9 歲孩子，iPad 橫向操作。
- 來源：使用者提供的 `Huan - 127.jpg`，課文〈一千根琴弦〉第 16～17 頁。原照與完整課文不公開入庫。
- 狀態：完成；沿用前篇的短詞選擇、粗體注音與五枝放射圖。
- [孩子入口](https://kids.linshuhuan.com/thousand-strings-mind-map/?child=aiden)；[陪讀入口](https://kids.linshuhuan.com/thousand-strings-mind-map/)。

## 使用與設計

中心使用課文原題，主枝為「小雅、師徒、秘方、領悟、鼓勵」。孩子每一步選一組有文章依據的短詞，不計分；完成後從中間向外抄。每組都留下小雅的困境、盲人師徒的賣藝與練琴、千根斷弦的約定、秘方白紙及希望的力量、老師邀請參加合適運動的結尾。字數不顯示在孩子畫面。

「秘方」呈現師父的約定，後續「領悟」揭示是白紙，避免把故事誤讀為琴弦能治好眼睛。正文只寫老師的邀請，沒有說小雅的行動不便被治好，或已答應上課。陪讀時可再用閱讀題討論同學如何陪伴，成品先完整保留正文。

家長於 2026-10-06 回報：前篇〈愛的分享〉老師沒有修正；本次沿用其篇幅與段落完整度。這是前篇的教學回饋，不代表本篇已由老師確認。

## 來源與再製

- `source/coverage.md`：段落對照、取捨、讀音依據與驗證紀錄。
- `source/`：可編輯 HTML、CSS、互動程式、內容與 manifest。
- `build.mjs`：產生 `docs/thousand-strings-mind-map/`，部署檔不手改。
- `output/`：實測後保存的代表性完成圖。
- 字型沿用 `docs/assets/fonts/BpmfZihiSans-Bold.ttf` 與既有授權；新文選音規則放在本篇內容，不改共用字型或舊篇。

重建：`node learning-tasks/thousand-strings/build.mjs`；核對產物：同指令加 `--check`。以靜態 server 提供 `docs/`，開啟 `/thousand-strings-mind-map/`。

每篇的選詞進度使用獨立 LocalStorage key，只存在目前瀏覽器，不跨裝置同步。孩子入口保留 `?child=`；沒有 child 時顯示給大人的陪讀說明，兩種入口仍共用同一瀏覽器的本篇存檔。家長可在自己的裝置或無痕視窗試操作。

文章索引在 `docs/registry.json` 的 `mindMaps`，依日期預設最新篇，舊文章與進度保留。額外 iPad 真機與列印驗收沿用已略過的決定，不重列使用門檻。

參考：[前篇](../love-sharing/README.md)、[既有製作流程](../shared/reading-mind-maps.md)。

## 驗證與交付

2026-10-06：32 種選法皆保留核心轉折、59 字；全 repo Node 831 項與 Python 279 項通過，1 項 Python fixture 測試略過。獨立 reviewer 直接核對照片，提示用語多音字修正後未留實質缺陷。

隔離瀏覽器驗證取消／換詞、逐步完成、回改、重整恢復，以及首頁新舊篇往返與 child 保留。1024×650、1024×768、1180×720、768×1024、390×844 完成圖未見節點或線文字重疊、越界、水平溢出；1024×650 引導版面五步按鈕均可見。注音字型成功載入，未見 console error。

[完成圖範例](output/mind-map-preview.png)是本機操作產生，非孩子的正式作答。額外真機與列印驗收已略過，不當作已測通過。
