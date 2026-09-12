# 四上 U1 私用題包契約（W1）

2026-09-12；對應主 #55、W1 #56。實際 validator 為 `docs/study/private-pack.js`，W2 生成器須產出能通過它的 JSON。本文件與合成 fixture 均不含原卷題文、答案或解說。

## JSON 格式

採 UTF-8 JSON object，原始檔最多 **128 KiB（131072 bytes）**。檔案選擇器先檢查檔案大小，validator 再以 UTF-8 bytes 檢查文字；空白與換行也計入。下表欄位全部必填；不接受額外欄位。

| 欄位 | 型別／限制 |
| --- | --- |
| `schemaVersion` | number，固定 `1` |
| `packId` | string，固定 `g4-s1-math-u1` |
| `revision` | 正整數，且為 JavaScript safe integer；初版 `1` |
| `questions` | array，恰好下列六個 ID 各一題，順序可變 |
| `explanations` | object，key 恰好為六題 ID；每個 value 都是非空白 string |

| 紙本定位 | 固定 ID | W2 已核准轉換 |
| --- | --- | --- |
| P01 | `math-g4s1-tyk111-I-01-v1` | `multiple_choice` |
| P02 | `math-g4s1-tyk113-II-11a-v1` | `fill_in_blank`，`number` |
| P03 | `math-g4s1-tyk113-II-11d-v1` | `fill_in_blank`，`number` |
| P04 | `math-g4s1-tyk111-II-02-v1` | `fill_in_blank`，`number` |
| P05 | `math-g4s1-tyk111-IV-01-v1` | `fill_in_blank`，`comparison` |
| P07 | `math-g4s1-anh114-II-08-v1` | `fill_in_blank`，`number` |

每題共同必填：

| 欄位 | 型別／限制 |
| --- | --- |
| `id` | 上表其中一個 ID；不可重複，也不可撞到 public 題目 |
| `subject` | string，固定 `math` |
| `unit` | number，固定 `15`；畫面顯示課本第 1 單元 |
| `type` | string，`multiple_choice` 或 `fill_in_blank` |
| `text` | 非空白 string；題幹為純文字，不混入選項文字供前端猜切 |
| `subtopic` | 非空白 string；例如概念名稱 |
| `source` | 非空白 string；W2 可放來源定位，不會自動送到 GitHub |
| `options` | 選擇題：恰好四個非空白 string；填空題：`[]` |
| `answer` | 選擇題：`"1"`～`"4"`，1-based 字串；填空題：`""` |

`fill_in_blank` 另必填 `blanks`，為長度 1～9 的 array，每格只能有：

| 欄位 | 型別／限制 |
| --- | --- |
| `input` | string，`number` 或 `comparison` |
| `answer` | string；number 用 `0` 或不含前導零的 1～8 位整數，例如 `"12345678"`；comparison 用 ASCII `">"`、`"<"`、`"="` |

題幹須包含每格對應的全形標記：`（１）`、`（２）`……。既有畫面將標記替換為可點選的空格 chip。答案不接受逗號、單位、小數、負號、全形數字、九位數或多解集合；例如 `"12,345,678"` 與 `"＞"` 都拒收。首批 W2 每個填空題只有一格，validator 保留既有逐格輸入能力。

合成單題範例（完整包仍需六題及六份解說）：

```json
{
  "id": "math-g4s1-tyk113-II-11a-v1",
  "subject": "math",
  "unit": 15,
  "type": "fill_in_blank",
  "text": "合成練習：請輸入 12345678：（１）",
  "subtopic": "合成位值",
  "source": "synthetic fixture only",
  "options": [],
  "answer": "",
  "blanks": [{ "input": "number", "answer": "12345678" }]
}
```

## 更新與失敗語意

- 同一 `revision` 重匯同內容是冪等操作；題目順序、JSON 欄位順序、JSON 格式縮排不影響相等判斷，也不重置進度。
- 提高 `revision` 才可更新 `source`、`subtopic`、`explanations`。較舊版本拒收。
- 已載入包中相同 ID 的 `type`、`text`、`options`、`answer` 與每格的 `input/answer` 必須精確相同。連題幹中的空白、錯字變更都不自動推定語意相同；目前無強制覆寫入口。若需修題，由統籌另依來源核對決定版本策略，不能只換 revision 偷渡。
- 未載入／換容器時只能驗證這份包本身，沒有跨裝置歷史內容 registry；W2 仍須負責 stable ID 的內容一致性。合成包只用於測試容器，不要先匯進實際孩子容器後再換真包，因為合成與真題同 ID 但內容不同。
- 每次寫入前重新讀取同容器儲存 key 的最新題包，核對 ID 內容與 revision；另一分頁匯入或升版後，本頁的舊記憶體快照不能用來覆寫異題或降版。仍保留本頁已載入內容的相容核對；兩者都通過才保存。
- 最新持久包若無法讀取、是空字串、JSON 損毀或不支援版本，拒絕覆寫並保留原資料；不把它當成「尚未匯入」。目前沒有自動修復或強制清除入口，須由家長保留原檔後另行處理。
- 壞 JSON、超限、未知 version、缺題／重複 ID、未支援欄位／題型、錯誤範圍、無效答案、缺／空解說、同 ID 異題或儲存失敗，一律保留原 active 包、索引和已保存進度。成功寫入 localStorage 後才替換記憶體內容。
- 題文、選項、解說可含看似 HTML 的字串，但都顯示為文字；不接受額外 `image`、URL 或 HTML 設定欄位。題文先 escape，再加入程式產生的換行與 chip。

## 內容與進度的分界

依修正票 #58，家庭內容由管理端寫入既有 Worker KV 的 `c:study:g4-s1-math-u1`，裝置 cache 仍為 `study:private-pack:g4-s1-math-u1`，同 origin／容器共用，沒有 child 欄位。Study boot 先讀有效包與 public 題庫，再重建 map／索引；背景自動取得不增加 boot 等待。

家庭授權唯讀 API 為 `GET /v1/packs/g4-s1-math-u1`，沿用既有 family token（Study 使用 `Authorization: Bearer ...`）與 endpoint，回傳原始 pack JSON、`Cache-Control: no-store`。缺 token／錯 token 為 401，未部署為 404，損毀／服務異常為 500，其他內容操作為 405；其他 packId 為 404。OPTIONS 沿用全域 204 CORS preflight，不讀題包。`/v1/status` 仍只列 `p:` 進度 metadata，不列內容。

開啟 Study、選四上、保存家庭金鑰後會自動取得，亦可按「重試取得題包」。整輪下載含 body 最多等待 8 秒，逐段 UTF-8 接收且限制 128 KiB；無 token、401、404、網路／服務異常與逾時分別提示。下載先驗契約，回到首頁安全時點再以既有 `save` 核對最新持久包並原子保存；作答途中不替換 map、題包 cache 或批次。重試的新請求使先前回應失效。所有失敗保留原有效包與進度，不用 fixtures fallback。手動 JSON 匯入保留為家長備援。

進度仍為 `study:progress:<child>`，同步仍是 `study:sync:<child>`；`appId: study`、`schemaVersion: 1`、legacy key／歸屬不變。新增單一選擇欄位 `studyTerm`：`g3-s2` 或 `g4-s1`，缺省三下；原 `semester` 仍保留 `mid/final` 的意義。

題包不進 state、進度匯出、備份、同步 payload 或 public 題庫／解說／報告。私用題目的 GitHub 預填回報只帶 stable ID、packId、revision 與「家長標記題目有問題」；不送出 `source` 等任意匯入文字。舊公開題仍沿用原回報內容。

缺包時顯示「尚未載入家庭題包」與可重試／家庭設定提示，保留所有未載入題的 mastered、challenge、stats、errorBank、flagged，禁止四上開始／重置。載入有效包後，使用原 ID 恢復已答對計數與剩餘批次。每次送出只保存一次完整 stats／mastered／queue，失敗顯示持續警示；未送出的輸入與畫面回饋仍不保存。

## 合成驗證與 W2 使用方式

完整合成包 factory 位於 `tests/helpers/synthetic-study-pack.mjs`；只在測試用裝置／容器使用。從 repo 根目錄可產生明確指定路徑的測試檔：

```powershell
node --input-type=module -e "import { writeFileSync } from 'node:fs'; import { syntheticPack } from './tests/helpers/synthetic-study-pack.mjs'; writeFileSync(process.env.TEMP + '/aiden-w1-synthetic.json', JSON.stringify(syntheticPack(), null, 2));"
node --test tests/test_study_private_pack.mjs
```

W2 可直接以相同 validator 檢查輸出（以下路徑須換成明確的私用輸出檔；不印題文）：

```powershell
node -e "const fs=require('fs'); require('./docs/study/private-pack.js'); StudyPrivatePack.parse(fs.readFileSync(process.argv[1],'utf8'),JSON.parse(fs.readFileSync('./docs/study/questions.json','utf8'))); console.log('valid');" data/private/study/g4-s1-math-u1/pack.json
```

W2 仍須先加入計畫指定的精確 ignore 規則、驗證排除，再生成私用檔。本 W1 未新增 W2 builder／資料，也未讀取原卷或紙本私用內容。

2026-09-12 實作者驗證證據（不等於獨立 review 或 iPad 驗收）：

- 新增 16 個行為測試，執行實際 Study inline script、State／Picker／submitAnswer、真 wiring／sync client，使用 fake storage 與 DOM ports；含缺包 adopt→save→export→commitImport→boot→reimport、two-child 隔離、單次保存失敗、原選擇錯題門檻與國語手寫進度隔離，以及兩個 app 實例共用 storage 的過期分頁匯入衝突。
- review 修正後，harness 預設讀取真實 `rewards.json`，以 Image port 觸發載入回呼；合法 subtopic `__proto__`／`constructor`／`toString`／`hasOwnProperty` 都走完六題與最後完成畫面，獎勵查找只取 own array pool，缺池按既有順序回退。另補兩項 reward 純函式測試，涵蓋非 array／繼承屬性和實際宣告的特殊名稱 pool，不以黑名單限制 subtopic。
- 全套 Node 測試 254 通過；W1 原 pytest 驗證 140 通過、1 個 extraction regression 因缺原卷資料略過（本次 review 修正無 Python 變更）。public 1,924 題的 ID／unit／subject 指紋固定，public 題庫／解說檔案無修改。
- Codex in-app browser，以 `test-child`、本機 8766 origin 匯入合成六題，兩題正確＋一題錯答後重載顯示 2／6 並接續剩餘四題。完成最後一題後直接重載，仍顯示已通關；切三下仍為原本未練狀態。含既有三下紀錄的逐欄不變由上述行為測試驗證。
- 768×1024 桌面 viewport 可完整輸入八位數；輸入後未送出直接重載，空格清空且接續同題；比較符號可按、錯答題留到隊尾。
- 另一個本機 8767 origin 用 `test-security` 匯入含 `<img src="/w1-probe" onerror=...>`／`<svg onload=...>` 的合成文字；實際 DOM 題文／選項沒有 img、svg、script 元素，解說為純文字，本機回報摘要也安全；測試 server 沒有收到 `/w1-probe` 請求。未開啟 GitHub 預填連結或送出外部回報。

剩餘門檻由統籌接續 W2 真題 build／內容核對、W3 獨立 review、W4 實際 iPad 容器驗收；桌面 viewport 不代表 iPad Safari／主畫面容器通過，也不承諾離線冷啟動。

## #58 自動載入候選：實作者 QA（2026-09-12）

- 既有 harness 執行真 Study／wiring／validator，新增 10 個 Worker／自動載入行為測試，涵蓋 auth、固定路由、唯讀、KV 與進度隔離、無 token 設定後生效、重試、cache reload、半批、跨 child、串流超限／中斷／UTF-8、整輪逾時、revision／semantic／跨分頁競態，以及作答中延後採用。
- 自我檢查發現背景重畫可能銷毀家長表單，已改成只更新練習區和題包文字，保留家庭設定、手動匯入及還原確認。新增 DOM ports 回歸測試；CUA 在實際頁面輸入還原草稿，重試成功後草稿原樣存在。
- 完整 Node：264 passed。完整 `uv run pytest`：166 passed、1 skipped（worktree 未帶原卷的 extraction regression）。Public 題庫與解說 blob 未變，1,924 題的 ID／unit／subject 指紋測試通過。
- Codex in-app browser、loopback 8778、`test-child` 與 synthetic 題包：首次無 token 提示 → 既有家庭設定保存測試金鑰 → 自動出現六題；兩題答對、一題答錯後 reload 顯示 2／6，開始接續時進入剩餘四題的首題。服務 503 後仍顯示六題與 2／6，手動 JSON file chooser 備援成功，進度不變。
- 可重現 server：`node tests/helpers/serve-study-auto-pack.mjs 8778`，僅 bind `127.0.0.1`，開 `/test-start` 只初始化此隔離 origin 的合成資料；server 使用 production Worker.fetch／fake KV，將測試回應中的 sync endpoint 指向自己，CSP 限制連線只到本機。不連正式同步服務、不讀真題。
- Wrangler `4.120.1 deploy --dry-run` 封裝成功，沒有部署。正式 ignored pack 經唯讀 production verifier，及本機 Worker.fetch＋fake token 回傳 200；4,102 bytes、revision 1、SHA256 `695DEC01844F5D136C2BE353F98BD0F7EDD017F13A82DA70184CBDAA06EA77D0` 不變。

以上為實作者自己的 QA，並非獨立 review、正式環境 positive GET 或真 iPad 驗收；統籌另安排 clean-context review 與 Worker→正式內容→Pages 發布，W4 真容器 gate 保持 pending。
