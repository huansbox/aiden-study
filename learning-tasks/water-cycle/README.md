# 水的循環：一起探索與深入研究

以 iPad／平板橫向使用為主的家庭學習作品。工作與交接正本：[Issue #220](https://github.com/huansbox/aiden-study/issues/220)。

美術由家長選定 C「紙張拼貼」。兩版六站故事、回顧與預製中文／英文語音已實作於 `docs/water-cycle/`；正式發布、瀏覽器與平板驗收結果回查 Issue。英文依已確認的 Native Camp 水準作容易進入的起點，再依實際試讀調整，不代表已通過孩子理解度評估。

## 兩個版本

| 版本 | 對象與使用方式 | 內容與語言 |
| --- | --- | --- |
| 一起探索 | 家長陪同 6y、9y 一起看、輪流操作 | 中文語音、圖像、動畫；不依賴識字。短旁白、操作、討論的互動故事，可回頭重玩。 |
| 深入研究 | 9y 自己或家長陪同 | 從共同概念加深加廣；英文短句與語音，中文支援可展開。先以現有 Native Camp 水準為參考，容易進入、覺得有趣後再調高。 |

## 使用方式

從網站首頁選「一起探索」或「深入研究」。每站先聽一小段，再操作下方大按鈕；地圖可自由選站，上一站／下一站不設答題門檻。前往任何一站會重新開始該站的實驗；「再試一次」也會清除該次條件。兩個孩子輪流猜、輪流按，家長不必要求說出術語。

- 喇叭重播目前段落；暫停後可繼續；「慢慢聽」切換 0.8 倍速。切頁、回首頁、頁面進入背景會停止語音；不會多段重疊。
- 每個核心操作有圖示與中文語音提示。「聽操作提示」重播當站操作；長按後放開或鍵盤聚焦後按 F1，可聽該按鈕的中文說明。
- 英文版的「中文小幫手」可展開中文旁白、重要詞彙與模型解說，並播放中文旁白。英文口述可選，用操作或指圖回答也可以。
- 雨滴需逐步合併；雪比較冷空氣與厚暖層；冰雹可分別開關上升氣流、過冷水滴再試；地面三條路可反覆比較。
- 進階版有額外比較：水窪故事後可固定起始水量、時間、空氣與風，只改水的溫度，先預測再看較暖／較冷水的蒸發結果（定性模型，不是精確量測）；冰雹站會保留四組氣流／水滴條件的實際試驗記錄，找出缺少的條件。初階保持單純故事與輪流操作，進階以 Predict／Try／Compare 引導。
- 音訊拒播或載入失敗時，畫面會提示「再聽一次」。檢查連線與裝置音量後重試；6 歲孩子需要家長陪同處理。

## 可編輯來源與成品

- `source/design.md`：已確認需求、第一版範圍、科學依據及驗證方式。
- `source/verification.md`：實際驗證範圍、獨立 review 修正與尚未驗證的限制。
- `source/english-sample.md`：初次試讀的英文樣稿與對應中文共同探索腳本；不是能力評量或已採用定稿。
- `source/style-brief.md`：同場景三種美術初稿的規格、比較方式與候選圖保存位置。
- `source/content.json`：兩版科學文字與語音文字的唯一來源，包含穩定 audio ID、六站資料、操作提示與家長中文支援。
- `source/index.html`、`style.css`、`app.mjs`、`art.mjs`、`model.mjs`：buildless 網站；SVG 科學圖解與獨立互動規則。系統字型為主；可沿用 repo 既有閱讀字型，不複製字型檔。
- `source/build.mjs`：同步語音 jobs，再將網站與 `assets/` 完整複製至 `docs/water-cycle/`；`--check` 逐檔 byte 比對。
- `assets/landscape.png`：選定紙張拼貼方向的正式環境插圖；`assets/audio/`：預製 MP3。圖片與語音為 AI 產生，網站家長資訊有揭露；科學狀態與箭頭由程式繪製。
- `source/speech-{zh,en}.json` 為生成產物，不直接改；`audio-{zh,en}-manifest.json` 保存文字指紋、音訊 hash 與驗證結果。付費請求 journal 留在 ignored `.local/water-cycle/`。
- 本任務登錄於 `learning-tasks/catalog.json`；分類維持 task，沒有家庭帳號、成果同步或獎勵提示。
- 候選美術圖為審稿資料，非正式網站素材；依 Dropbox 設定保存於 `mywork/aiden-study/water-cycle/style-review-2026-10-20/`，不將每輪未採用生成圖加入 Git。家長選定後再將正式採用素材放進任務 `assets/` 並記錄來源。

## 重建與驗證

```sh
node learning-tasks/water-cycle/source/build.mjs
node learning-tasks/water-cycle/source/build.mjs --check
node --test tests/test_water_cycle.mjs
```

現成 localhost 預覽 server 開啟後，可設定 `CODEX_PLAYWRIGHT_PACKAGE` 與 `OUTPUT_DIR` 執行 `node tests/helpers/water-cycle-browser-check.mjs`。預設連到 `http://127.0.0.1:8788/water-cycle/`，可用 `WATER_CYCLE_URL` 指定另一個 loopback port；helper 不啟停 server。它以真實 HTMLAudioElement、音量 0 驗證播放、慢速、暫停與載入中暫停、切頁、首頁、故障重試；檢查四個視窗尺寸，保存代表截圖與 JSON 報告。Chromium 用延遲／503 測試載入；WebKit 原生媒體可能繞過攔截，故以真實 MPEG 解碼錯誤測試復原。背景停止用明確派送的 pagehide 事件檢查 handler，不宣稱是 iPad 背景政策驗證。

不需要 API key 即可重建網站。要產生或驗證語音，沿用專案 Python 環境與共享 Native Camp 工具（需可用的 ffmpeg／ffprobe）：

```sh
uv run learning-tasks/water-cycle/source/make_audio.py --lang zh --check
uv run learning-tasks/water-cycle/source/make_audio.py --lang en --check
# 修改語音文字後，先重建 jobs，再由已獲授權的操作者移除 --check 生成缺少的音訊。
```

工具僅讀環境變數 `OPENAI_API_KEY`，不保存金鑰。固定使用共享工具的既有 model 與 cedar voice，只覆寫本次模組實例的發音 instructions。遇到不確定付費請求時，遵循共享工具 journal 的停止／復原規則，不刪 journal 重試。

自動測試涵蓋雲但無雨、雨滴長大、雪在厚暖層完全融化、冰雹兩個條件的四種組合、地表／地下／湖泊路徑、重設隔離、雙語可達語音與來源／成品一致性。測試依據為 `source/design.md` 的 USGS／NWS／NOAA 資料；不把合成操作當作孩子理解的證據。

語音 builder 的完整解碼、非靜音與 hash 驗證，不等於全段人耳驗聽或 iPad 真機播放。工具驗證、家長審稿、孩子理解及平板真機試玩分別記錄，不互相替代。

進度及下一步更新原 Issue，不在此重複維護工作時間軸。
