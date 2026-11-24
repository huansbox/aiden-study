# 〈苦瓜哪會苦〉台語朗讀

四年級校內朗讀的家庭練習，接續[〈阮小妹〉練習流程](../taigi-reading/)。作品含題名、作者、六段正文與 78 句跟讀。進度與發布紀錄見 [#276](https://github.com/huansbox/aiden-study/issues/276)。

## 孩子怎麼用

開啟練習頁，從第一段第一句開始。先看漫畫和白話意思，再按「聽這一句」。按「跟著念這句」，讓學校先念一兩個音，再跟著原音讀。可以展開「錄一句，比較看看」，自己朗讀後交替聽學校和自己的聲音。錄音留在目前瀏覽器的記憶體，換句或關頁就會清除。

選單可直接換段、換句，包含題名與作者。「播放這一段」可練連貫朗讀，「從題名聽全篇」從頭播放，最後看紙本自己念。另有全篇 MP4，可直接在影片播放器播放。

## 私用成品與來源

Dropbox 相對根目錄為 `mywork/aiden-study/taigi-bitter-melon/`。

| 路徑 | 用途 |
| --- | --- |
| `final/index.html` | 可直接開啟的離線單檔，已內嵌原音、漫畫與字幕。 |
| `final/site/` | 受保護站點的部署資料夾。整個資料夾一起部署，入口是 `index.html`，其餘檔案透過 `assets/` 相對路徑載入。 |
| `final/苦瓜哪會苦-全篇.mp4` | 1920 × 1080、24 fps 的六段連續原音影片，字幕已燒入。 |
| `source/reading.json`、`source/*.mp3` | 講稿、跟讀區間、字音起點、白話意思、提示與學校音檔。 |
| `source/scenes.json`、`art/` | 片頭、逐句畫面對照及正式漫畫圖。 |
| `source/trial.json`、`trial/01-ktv/` | 家長選定的試吃、吞下、回甘三格與切點。 |
| `fonts/Iansui-Regular.ttf`、`fonts/OFL.txt` | 罕用字的補字來源與授權。 |

## 重建

需要 Python 3.10 以上、`uv`、Pillow、具有 `libx264` 的 FFmpeg（含 `ffprobe`）、Fontconfig（`fc-match`）、HarfBuzz（`hb-shape`）。核准的黑體字形使用 macOS 的 PingFang TC Semibold。其他環境需有正體中文字型，程式依序尋找 PingFang TC、Noto Sans CJK TC。缺少的漢字使用私用資料夾中的芫荽補字。

在本資料夾執行，將 `/path/to/private-root` 換成上述私用根目錄：

```sh
uv run build_comic.py /path/to/private-root --video
```

省略 `--video` 可只重建離線與部署兩種網頁。另有 `--output` 可指定獨立的驗證目錄。`source/comic/` 放正式頁的 HTML、CSS 與 JavaScript。學校原音從 4.390 秒到 320.040 秒連續擷取，涵蓋題名、作者和正文；各段選單標題只用於導覽。字幕依同一份字音時標從白逐字轉藍，台羅以音節為單位。頁面與影片共用事先繪製的字幕，手機也能顯示罕用字。網頁錄音需要支援 MediaRecorder、已允許麥克風的瀏覽器。使用受保護站點時需 HTTPS。

歷史畫風比較保留在私用的 `style-mocks/index.html`，核准試片可透過 `uv run render_comic_trial.py /path/to/private-root` 重建。
