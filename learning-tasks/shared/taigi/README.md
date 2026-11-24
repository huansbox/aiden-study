# 台語逐句朗讀播放器

〈苦瓜哪會苦〉與〈阮小妹〉使用同一份版面、播放／錄音控制及逐字字幕繪製程式。各篇的私用音檔、字音時標與完成頁依各自任務的 README 保存。

## 兩種畫面

`player.py` 的 `make_page(data, paths)` 產生完整 HTML。`data.intro` 與 `data.paragraphs[].lines` 提供題名、作者及正文。每行的 `start`、`end` 是跟讀區間，`captionAt` 決定連播何時換字幕，`karaoke[].start` 是各字音在學校原音中的起點。部署版的 `paths` 對應相對網址，離線版使用內嵌的 data URL。

兩篇都用 `Lettering(lines, font_dir).make(line)` 建立相同的白字與藍字圖層，並在該句填入切換顏色的像素位置。播放器於 `#screen` 中疊上字幕。

- 〈苦瓜哪會苦〉選句時預覽該句的 `sceneKey`。開始播放後從 `data.shots` 的 `at` 與 `key` 選擇當下漫畫，用 `paths["art/" + key]` 載入。
- 〈阮小妹〉透過 `scene_html`、`scene_css`、`scene_js` 放入原本的動畫。播放器呼叫 `window.taigiSceneAt(second, line, playing)`，選句、播放與製作影片都使用同一條學校錄音時間軸。`await window.taigiScreenAt(second)` 可等待該時點的字幕畫好。

## 發布受保護練習頁

先依各篇的重建指令產生私用部署資料夾。在 repo 根目錄執行下列指令，將作品 ID 與資料夾換成實際值。兩個 ID 是 `taigi-bitter-melon` 與 `taigi-reading`。

```sh
node scripts/publish-taigi-site.mjs <作品-ID> <Dropbox 的 final/site 路徑> inspect
node scripts/publish-taigi-site.mjs <作品-ID> <Dropbox 的 final/site 路徑> publish <inspect 顯示的完整 digest>
node scripts/publish-taigi-site.mjs <作品-ID> <Dropbox 的 final/site 路徑> verify <完整 digest>
```

以同一 digest 重跑會逐一比對遠端內容，不重寫已驗證的檔案和相同的 active 指標；只補尚未存在的檔案。如遇限額、連線錯誤或同一不可變 key 的內容不符，請勿刪除現有 key 硬重跑。第一次發布新 digest 仍須寫入新版本的檔案；發現限額警示，應先確認當日剩餘額度。


發布程式上傳後逐檔讀回，比對完成才切換版本。`verify` 可單獨執行。
