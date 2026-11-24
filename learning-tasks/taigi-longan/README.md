# 〈龍眼的滋味〉台語朗讀

四年級校內朗讀第三篇（最後一篇）的家庭練習，沿用[共用台語播放器](../shared/taigi/)（含 0.85x 慢速跟讀）與靜格插圖製作流程。作品含題名、作者、六段正文、66 句跟讀與 26 張微縮毛氈定格偶插圖。交付追蹤 [#283](https://github.com/huansbox/aiden-study/issues/283)。

## 孩子怎麼用

開啟練習頁，從第一段第一句開始。看著微縮定格偶畫面與逐字字幕，按「聽這一句」跟著學校原音念；需要聽清尾音或聲調時可切「語速：慢速 0.85x」。展開「看懂這一句」可讀白話意思與難詞提示，展開「錄一句，比較看看」可在裝置上錄音並與學校原音交替比較。最後可「播放這一段」或「播放全篇」，再看紙本自己朗讀。

## 私用成品與來源

Dropbox 相對根目錄為 `mywork/aiden-study/taigi-longan/`。

| 路徑 | 用途 |
| --- | --- |
| `final/index.html` | 可直接開啟的離線單檔，已內嵌原音、插圖與字幕。 |
| `final/site/` | 受保護站點的部署資料夾，由 `scripts/publish-taigi-site.mjs` 上傳至 KV。 |
| `final/龍眼的滋味-全篇.mp4` | 1920 × 1080、24 fps 的六段連續原音影片，逐字字幕已燒入。 |
| `source/reading.json`、`source/03_龍眼的滋味.mp3` | 講稿、跟讀區間、字音起點、白話意思、提示與學校原音。 |
| `source/scenes.json`、`art/` | 片頭、逐句畫面對照及 26 張正式微縮定格偶插圖。 |
| `fonts/Iansui-Regular.ttf`、`fonts/OFL.txt` | 台語罕用字補字來源與授權。 |
| `style-mocks/`、`trial/` | 三種畫風比稿頁與 5 格多圖連貫試片紀錄。 |

## 重建與驗片

需要 Python 3.10 以上、`uv`、Pillow、具 `libx264` 的 FFmpeg（含 `ffprobe`）、Fontconfig（`fc-match`）、HarfBuzz（`hb-shape`）。

```sh
uv run --script learning-tasks/taigi-longan/build_longan.py <私用根目錄> --video
uv run --script learning-tasks/shared/taigi/verify_video.py <私用根目錄>
```
