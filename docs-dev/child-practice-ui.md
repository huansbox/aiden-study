# 孩子練習共用樣式

可直接複製 [HTML 範例](../docs/shared/child-practice-example.html) 的區塊。[題庫](../docs/study/index.html) 示範線形進度與科目配色，[注音](../docs/zhuyin/index.html) 示範進度點、教學卡和回合結算。

在 App 自己的 CSS 後引用 `../shared/child-practice.css`，版本參數以 HTML 範例的引用為準。在孩子畫面的容器加 `.child-ui`，需要底色時一併加 `.child-page`。`data-child-theme` 支援 `study`、`math`、`science`、`social`、`english`、`zhuyin`、`puzzle`。放在練習容器或單一卡片可指定配色。家長維護頁使用原有畫面範圍。

- `.child-heading` 用於練習與結算標題。`.child-card` 共用卡片表面、邊框和圓角。
- `.child-action.primary` 標示當前的主要動作，`.child-action.secondary` 用於次要動作，`.child-action.back` 用於清楚命名的返回。用 `<button>` 切同頁畫面，用 `<a>` 前往別頁。共用操作的觸控區至少 44×44 CSS px。
- `.child-progress` 包住圖示與進度文字。線形進度採 `<progress class="child-progress-meter">`，加上可讀的標籤。`.child-summary` 包住回合結果，`.child-actions` 排列結算按鈕。
- 已使用 `KidsFamily.mount()` 的頁面可引用 `family-app.js`，版本參數比照題庫入口。在 `<body>` 加 `data-child-home-label="← 回學習首頁"`，由 mount 套用 `.child-ui` 並顯示原本孩子的學習首頁連結。各 App 自己的返回按鈕寫明「回題庫選單」等實際目的地。英文介面沿用簡單英文。

題型的作答區、回饋與鍵盤互動在各 App 的 CSS／JS。`family.record()` 記錄當下結果，等結算已顯示再呼叫 `family.finishRound()`。最新發布版本的查核方式見[首頁版本更新](home-update.md)。
