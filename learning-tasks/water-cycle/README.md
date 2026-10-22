# 一滴水的旅行

滿版紙張拼貼互動繪本，適合家長陪 6 歲、9 歲中文共看；English 使用相同簡單故事，供 9 歲自行或陪同探索。工作與交接正本：[Issue #225](https://github.com/huansbox/aiden-study/issues/225)。此版取代 #220 的六站實驗介面，並保留雨、雪、冰雹的差別。

## 怎麼玩

直接碰畫裡的物件：封面小水滴可以開始中文旅行；另有 English 入口。每頁先聽短旁白，再點太陽、摸雲、讓水滴碰在一起、接雪、托高冰粒，或選水在地面的路線。所有操作都可反覆玩，翻頁不需答題。

- 8 頁：封面、池邊、雲、雨、雪、冰雹、河谷、結尾。背景與可動角色佔滿 viewport，沒有側欄、六站地圖或底排操作台。
- 拖雲、拖水滴碰合、滑雪花、往上拖冰粒都有點選替代操作。Tab＋Enter 也能操作；左右方向鍵翻頁。
- 角落提供重聽、暫停／繼續與家長選單。語音單一播放，切頁、回封面與切背景會停止；載入或拒播失敗可重試。
- 字幕預設隱藏。家長選單可開字幕、0.8 倍速、換語言、跳頁，並看中文支援、科學解說、來源與 AI 揭露。
- 雪頁從空手套開始，接到雪後才顯示雪花；English 此時多一個暖陽探索，讓手套上的雪融化。沒有長篇英文科普或實驗表。
- 平板橫向為主；直向手機也可操作。支援系統 reduced motion。這些是產品行為；自動化驗證不等於孩子理解或 iPad 真機驗收。

## 來源與成品

可編輯來源在 `source/`；網站產物在 `docs/water-cycle/`。修改來源後重建，不各自編輯兩份。

| 檔案 | 用途 |
| --- | --- |
| `source/content.json` | 六個故事場景、家長解說與雙語旁白唯一來源 |
| `source/app.mjs` | 翻頁、畫中互動、拖曳替代與單一 Audio 播放／復原 |
| `source/art.mjs` | 可動紙張風格 SVG 角色；河谷熱區直接落在背景河流、土壤與平靜水面 |
| `source/model.mjs` | 每頁故事結果、重玩與獨立狀態 |
| `source/style.css` | 滿版／直向版面、局部動畫與 reduced motion |
| `assets/story/{pond,clouds,rain,snow,storm,river}.png` | 六張原創 AI 紙張拼貼背景，無文字或操作 UI |
| `assets/audio/{zh,en}-book-*.mp3` | 共 42 段預製 AI 語音；沒有 browser TTS |
| `source/design.md`、`verification.md` | 目前設計基準、實際驗證與限制 |

河谷的背景與熱區使用同一組百分比座標，以不重疊多邊形貼合河流、左右泥岸與平靜水面；其他背景營造環境，可動物件由程式控制。水窪整片可縮，不將看不見的水蒸氣畫成白霧。卡通水滴是故事角色。

## 重建與驗證

```sh
node learning-tasks/water-cycle/source/build.mjs
node learning-tasks/water-cycle/source/build.mjs --check
node --test tests/test_water_cycle.mjs
```

瀏覽器 helper 使用既有隔離 localhost server；不啟停 server：

```sh
# 設定 CODEX_PLAYWRIGHT_PACKAGE、WATER_CYCLE_URL 與 OUTPUT_DIR 後：
node tests/helpers/water-cycle-browser-check.mjs
# 可另設 WATER_CYCLE_WEBKIT=1 加跑 WebKit。
```

語音 jobs 由 build 產生；`speech-{zh,en}.json` 不直接改。沿用共享工具的 paid-request journal、文字指紋、完整解碼、非靜音與 hash 驗證：

```sh
uv run learning-tasks/water-cycle/source/make_audio.py --lang zh --check
uv run learning-tasks/water-cycle/source/make_audio.py --lang en --check
```

需要生成新語音時，先更新內容、重建 jobs，再由已獲授權的操作者移除 `--check`。工具只讀環境變數 `OPENAI_API_KEY`；不刪除 journal 或重送不確定請求。付費 journal 位於 ignored `.local/water-cycle/`。

本作品維持 task 分類，沒有家庭帳號、進度同步或獎勵提示。素材、語音生成與發布由 Issue 記錄；未採用美術候選不放入 Git。2026-10-20 的舊六站介面驗證是歷史證據，不代表此版新稿已驗聽或孩子已試玩。

冰雹長大後，往上拖會繼續托住，點一下或往下拖才落下；落地仍保留大冰雹與風，雲裡另出現新小冰粒供重玩。雨頁會先讓兩滴靠攏，變成一顆較大水滴，再落雨；reduced motion 至少顯示單一合併水滴。

本版入口 CSS／app、app 的 model／art import 與 content fetch 保留 `v=20261021-storybook`。CSS 另加 `&release=1`：雲端在 Pages 部署完成前的探測讓原 tag 快取到舊 CSS，部署後已實查出新 HTML／舊 CSS 混載，因此以發布修訂避開該 4 小時快取；不改樣式內容或素材。

## ③④ 幕獨立試玩原型

[開啟原型](../../docs/water-cycle/prototype/index.html)；可直接以 `file://` 開啟，也可由既有 localhost server 的 `/water-cycle/prototype/` 使用。這是 [Issue #229](https://github.com/huansbox/aiden-study/issues/229) 的中文親子試玩，供 6 歲、9 歲共同探索；既有完整繪本保持原入口，原型尚不代表正式繪本已改版。

- ③拖金色風尾巴，或先點風尾巴再點目的地。空虛線圈追蹤看不見的水；暖處保持不可見，涼處先讓麻雀覺得冷，再凝成水滴與雲。
- ④任選兩滴碰合，或先點一滴再點另一滴。合併按水量長大，夠大自己落下；金星小滴保留唯一身分，麻雀跟到它的落點。若剩下的水量不足以繼續下雨，雲裡補入可自由選取的小滴，不自動合併。
- 自由翻頁保留兩幕狀態，「重玩這一幕」只重設當幕。字幕預設隱藏；沒有測驗、家庭資料或成就系統。重聽、翻頁、重玩與切背景會清除舊待播句。
- 原型暫用本機 `Microsoft Hanhan Desktop`（zh-TW、Rate -1）預製短旁白，沒有 browser TTS 或執行時付費 API。③的冷感與④主角落雨／重逢語句會完整播完；聲音關閉時互動照常。

原型唯一來源為 `source/prototype/`，產物為 `docs/water-cycle/prototype/`。只重建此路徑，不執行完整繪本的 build。入口引用使用 `v=20261022-prototype1` 避開網站舊快取；圖片與音檔仍為相對路徑。

```sh
node learning-tasks/water-cycle/source/prototype/build.mjs
node learning-tasks/water-cycle/source/prototype/build.mjs --check
node --test tests/test_water_cycle_prototype.mjs
# Windows；不帶 ClipIds 重建全部語音，指定時只重建該段：
powershell -NoProfile -ExecutionPolicy Bypass -File learning-tasks/water-cycle/source/prototype/make-audio.ps1 -ClipIds refill
```

瀏覽器 helper 不啟停 server，也不安裝 browser。設定 `CODEX_PLAYWRIGHT_PACKAGE` 為既有 Playwright 套件路徑、`OUTPUT_DIR` 為 QA 證據目錄；`WATER_PROTOTYPE_URL` 可指定本機原型。四尺寸 helper 未指定 URL 時使用本機 `file://`；聚焦回歸 helper 預設使用既有 `http://127.0.0.1:8794/water-cycle/prototype/`，可設定 `WATER_PROTOTYPE_WEBKIT=1` 加跑已安裝的 WebKit。

```sh
node tests/helpers/water-cycle-prototype-browser-check.mjs
node tests/helpers/water-cycle-prototype-regression.mjs
```

驗證包含水量續玩、唯一主角、旁白順序、手勢解鎖、拖曳／點選、自由翻頁及不同 viewport；桌面 Chromium／WebKit 模擬不等於 iPad 真機驗收，音檔完整解碼與播放事件也不等於人耳驗聽或孩子理解。原型目前只含③④與中文，完整故事、English 與孩子回饋仍依 #229 追蹤。
