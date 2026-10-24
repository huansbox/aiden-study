# 數線長短差

給四年級孩子的固定學習任務：先在 Pad 點端點、畫弧線與標數，再用共用端點的長段減短段，把新結果標回圖，最後帶到紙上練習。這是一次性六題教學，不加入 Study 題庫或長除法每日題數。

## 使用

- 孩子首頁的「學習任務」可開啟 [Pad 教學](https://kids.linshuhuan.com/number-line-difference/?child=aiden)。
- [家長試玩](https://kids.linshuhuan.com/number-line-difference/?preview=1) 不讀寫孩子進度或收藏；重新開啟會從第一題開始。
- 題內進度依 child 與 task 保存在這台瀏覽器，可重載續做；不提供題內進度跨裝置同步。首頁、身分與首次拼裝包沿用家庭連線。
- 基本指示一直存在；同一步錯兩次後增加具體文字與端點提示。使用提示與重試不影響完成資格。
- 六題全部完成後，首次取得既有收藏的 1 包拼裝包。首次資格由伺服器保存，重做、重送及另一台裝置再次完成不重複發包。離線時顯示待同步；連線恢復後可按「重新同步」。
- 完成頁可以重看每題圖與算式；「重做六題」會清除這台裝置本次作答，不影響已領拼裝包。
- 紙本與完整重建方式見 [printing.md](printing.md)。過渡卷、獨立卷與家長解答也可從 Pad 頁底下載。

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

開發驗證使用 `node tests/helpers/serve-family.mjs` 的隔離家庭、記憶體 KV 與 SQLite DO，不對正式孩子進度寫入。完整規格、階段交接與發布證據見 [#243](https://github.com/huansbox/aiden-study/issues/243)。
