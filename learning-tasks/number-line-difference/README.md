# 數線長短差

給四年級孩子的固定學習任務：直接在 Pad 數線點端點、畫上下分側的淺弧線，把已知數字放到圖上；再先選這一步的目標段、找長段與短段，自己計算並把結果標回圖，最後帶到紙上練習。這是一次性六題教學，不加入 Study 題庫或長除法每日題數。

## 使用

- 孩子首頁的「學習任務」可開啟 [Pad 教學](https://kids.linshuhuan.com/number-line-difference/?child=aiden)。
- [家長試玩](https://kids.linshuhuan.com/number-line-difference/?preview=1) 不讀寫孩子進度或收藏；重新開啟會從第一題開始。
- 點兩個端點畫已知弧線後，可把數字片拖進空格；也支援「點數字片 → 點空格」與鍵盤。選目標段後，直接點圖上弧線填入「目標段 = 長段 - 短段」；算對的結果再拖／點放回目標橫線下的框。
- 題內進度依 child 與 task 保存在這台瀏覽器的 v2 key，可重載續做；不提供題內進度跨裝置同步。舊 v1 key 只讀作遷移來源，不覆寫或刪除；保留合法已完成題，舊版做到一半的目前題必要時重新標圖。未知或較新的存檔格式不會被無聲覆寫。首頁、身分與首次拼裝包沿用家庭連線。
- 基本指示一直存在；同一步錯兩次後增加具體文字與端點提示。使用提示與重試不影響完成資格。
- 六題全部完成後，首次取得既有收藏的 1 包拼裝包。首次資格由伺服器保存，重做、重送及另一台裝置再次完成不重複發包。離線時顯示待同步；連線恢復後可按「重新同步」。
- 完成頁可以重看每題圖與算式；「重做六題」會清除這台裝置本次作答，不影響已領拼裝包。
- 紙本與完整重建方式見 [printing.md](printing.md)：[過渡卷](output/pdf/number-line-transition.pdf) 5 頁、[獨立卷](output/pdf/number-line-independent.pdf) 5 頁與[家長解答](output/pdf/number-line-parent-answers.pdf) 8 頁，也可從 Pad 頁底下載。黑白紙本用粗橫線與下框辨認目標段。

## 來源與重建

可編輯來源是 `source/`；`source/problems.json` 同時供 Pad 與紙本使用。`docs/number-line-difference/` 為生成部署目標，不直接編輯。

```sh
node learning-tasks/number-line-difference/build.mjs
node learning-tasks/number-line-difference/build.mjs --check
node scripts/build-work-catalog.mjs
node scripts/build-work-catalog.mjs --check
node --test tests/test_number_line_lesson.mjs tests/test_number_line_problems.mjs
```

build 將網頁來源複製到 `docs/number-line-difference/`，並將 `output/pdf/number-line-transition.pdf`、`number-line-independent.pdf`、`number-line-parent-answers.pdf` 分別複製到 `docs/number-line-difference/print/transition.pdf`、`independent.pdf`、`answers.pdf`；`--check` 也核對 PDF。題目固定為初階二題、中階三題、三次合法減法挑戰一題。程式以線段包含關係判斷，不靠答案數字巧合；挑戰題接受所有最短三次的合法路線及無相依步驟換序。

開發驗證使用 `node tests/helpers/serve-family.mjs` 的隔離家庭、記憶體 KV 與 SQLite DO，不對正式孩子進度寫入。首次交付見 [#243](https://github.com/huansbox/aiden-study/issues/243)；直接操作數線改版的規格、階段交接與驗證見 [#245](https://github.com/huansbox/aiden-study/issues/245)。
