# 三角形兩個為什麼（動畫短片）

給小學四年級孩子看的兩部動畫短片，各回答一個「為什麼」。旁白是臺灣中文，畫面只留關鍵字與算式，孩子用聽的、看圖形怎麼動。兩部都先講結論，再說明理由。

| 影片 | 長度 | 回答的問題 |
| --- | --- | --- |
| [`output/triangle-angles-180.mp4`](output/triangle-angles-180.mp4) | 1 分 56 秒 | 為什麼三角形三個角加起來是 180 度 |
| [`output/triangle-sides-rule.mp4`](output/triangle-sides-rule.mp4) | 3 分 09 秒 | 為什麼兩邊相加要大於第三邊、兩邊相減要小於第三邊 |

1920×1080、30 fps、H.264＋AAC。MP4 內含可開關的中文字幕軌，另附同名 `.srt`。

## 怎麼用

- 一次看一部；每部分成有編號的小段，可以在段落之間暫停討論。
- 第一部看完，拿鉛筆在自己畫的三角形上照做一次，看筆尖是不是掉頭。第二部可以拿吸管或筷子剪成 8、4、2、6 公分跟著排。
- 第二部「挑戰時間」的兩題各留 3 秒思考，孩子來不及就先暫停。

## 教學設計

- **結論先講**：每部第一句就是要帶走的結論，後面才是理由，結尾再重複一次。
- **第一部分兩階段**：
  1. 長方形切一半。四個直角共 360 度，沿對角線切成兩個一模一樣的三角形，四個角剛好全部分給它們，所以每個 180 度。這一段刻意只用直角三角形這個特例，快速得到結論，再留下疑問「沒有直角的三角形呢？」。
  2. 鉛筆轉一轉。鉛筆放在底邊，在三個角依序往同一個方向各轉一次，回到底邊時頭尾顛倒，也就是轉了半圈 180 度。這個說法適用任何三角形。
- **第二部**：最長的棒子放地上，兩根短的像手臂往中間靠。4＋2＜8 牽不到、4＋4＝8 要躺平才碰到（扁掉）、4＋6＞8 在半空中牽到。理由用「直直走最近、繞路比較遠」。「相減」用一扇門說明：8 和 3 釘在一起，門關到底時兩端距離是 8−3、開到底是 8＋3，中間才是三角形。
- 同一個東西全片同一個顏色；螢幕文字只放關鍵字，不把旁白整句打出來；音效只在關鍵時刻出現，沒有背景音樂。
- 第一版用「把三個角撕下來拼成直線」，家長認為只看到現象、沒有說明理由，所以改成上面的講法。考慮過但沒採用的講法與理由見 [design-lessons.md](design-lessons.md)。

## 來源與重建

| 檔案 | 用途 |
| --- | --- |
| `source/v1-angles.mjs`、`source/v2-sides.mjs` | 兩部影片的旁白逐句與每段動畫，唯一來源 |
| `source/lib.mjs` | 共用繪圖與時間函式 |
| `source/make_audio.mjs` | 逐句產生旁白 MP3 與 `manifest.json`（文字沒變就不重產） |
| `source/render.mjs` | 依旁白長度排時間軸、逐格繪圖、混音、加字幕，輸出 MP4 |
| `source/sheet.sh` | 把指定時間點的畫面拼成一張檢查圖 |
| `source/extract_fonts.py` | 從 macOS 系統字型拆出圓體與蘋方到 `.cache/fonts`（不進 Git） |
| `source/clone_tts.py`、`source/pronunciation.json` | 改用家長本人聲音（voice clone）時的合成程式與讀音表 |
| `assets/audio/` | 已產生的旁白（線上合成語音） |

```sh
cd learning-tasks/triangle-videos
npm install
uv run source/extract_fonts.py          # 只需一次，需 macOS
node source/make_audio.mjs              # 改了旁白才需要；--check 只檢查是否過期
node source/render.mjs v1-angles
node source/render.mjs v2-sides
```

改畫面時不必整部重輸出：`node source/render.mjs v1-angles --times` 列出各段各句的時間，`source/sheet.sh v1-angles out.jpg rect:25 pencil:20` 把指定「段落:秒數」的畫面拼成一張檢查圖。動畫時間都以「某句旁白開始後幾秒」表示，改旁白後畫面會跟著移動，但句子長度變很多時要重看該段。

### 兩種旁白

- **預設：線上合成語音**。Microsoft Edge 線上神經語音 `zh-TW-HsiaoChenNeural`（經 `edge-tts`），只送出旁白文字，產物在 `assets/audio/`，進 Git。
- **家長本人聲音**。本機 IndexTTS 2.0 以一段約 9 秒的本人錄音當參考音合成，做法沿用 huansbox/phy-redraw-video Wiki〈Voice cloning〉。這個 repo 是公開的，所以參考音、合成的旁白與輸出的影片都放在 repo 外的私人資料夾，檔名加 `-myvoice`，不進 Git。

```sh
export VOICE=clone
export TRIANGLE_PRIVATE_DIR=<私人資料夾>           # 依 global guidance 放 Dropbox 的 mywork/aiden-study/triangle-videos
export INDEXTTS_PYTHON=<index-tts>/.venv/bin/python
export INDEXTTS_RUNTIME=<index-tts>
export INDEXTTS_MODELS=<models 根目錄>
export INDEXTTS_REF=<參考音.wav>
node source/make_audio.mjs && node source/render.mjs v1-angles && node source/render.mjs v2-sides
```

多音字念錯時，把該詞加進 `source/pronunciation.json`（右邊寫大寫拼音加聲調數字），再重跑；只有受影響的句子會重新合成。

## 限制

- 兩種旁白都是 AI 合成。製作時逐段抽格看過畫面、檢查過音軌長度與音量，逐句稿由另一個模型（GPT）獨立審查過數學與推理；沒有人從頭到尾聽過旁白的發音與語氣，也還沒給孩子實際看過。
- 字型取自 macOS 系統字型，只能在 Mac 重建。
- 第一部的鉛筆說法是直觀論證，不是國中用平行線的正式證明。
