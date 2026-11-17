# 付出比收穫更可貴：閱讀心智圖

2026-11-17。依使用者提供的課文照片第 20～21 頁製作，原照保留私用。

[煦誠入口](https://kids.linshuhuan.com/giving-more-precious-mind-map/?child=aiden) · [陪讀入口](https://kids.linshuhuan.com/giving-more-precious-mind-map/) · [交付紀錄](https://github.com/huansbox/aiden-study/issues/267)

每一步選一組短詞。完成後先寫中央的原題，再從右上方第 1 枝順時針抄。前兩枝介紹人物與處境，後三枝保留李斯特提攜蕭邦和幫助姑娘的經過。選擇存在此瀏覽器，使用本篇獨立存檔。

編輯 `source/` 後執行 `node learning-tasks/giving-more-precious/build.mjs`，可重建 `docs/giving-more-precious-mind-map/`。同指令加 `--check` 核對來源與產物。段落與取捨見 [coverage.md](source/coverage.md)。

## 驗證

Claude Sonnet／medium 直接核對原照。依審查將李斯特寫入最後一枝枝名，讓孩子只看完成圖也知道是李斯特收徒、教琴，並主動表示將演奏。提示修正「提攜」的解釋及「彈一遍」的注音。32 種合法選法均為 60 字，保留兩段故事的核心。

隔離 Chromium 驗證從煦誠首頁進入新篇、選詞取消與替換、回改、重整還原、完成抄寫版、返回孩子首頁及開啟過去文章。完成圖核對 1024×650、1024×768、1180×720、768×1024、390×844 的順時針位置、文字盒、連線與水平溢出，較矮的橫向尺寸也走完選詞。iPad 真機與實體列印沿用先前略過的決定。

[抄寫版範例](output/mind-map-preview.png)
