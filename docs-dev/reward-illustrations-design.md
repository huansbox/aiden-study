# 獎勵插畫（reward illustrations）設計稿

> 對齊日期：2026-06-15（grill-me 對齊，本 session 不動 code）
> 本 session 定位：**只負責「程式側／插畫如何呈現」**。插畫內容、大小、數量由**另一個「設計圖片 session」**負責生成。
> 兩個 session 的唯一接縫＝本文「manifest 契約」一節。

## 1. 目標

練習過程中，於**批末**與**通關／錯題清除**畫面隨機跳一張**與當前內容有關聯**的獎勵插畫，增加趣味與成就感。給小孩在 pad 上用。

## 2. 核心設計決策（grill-me 定案）

| # | 決策 | 結論 | 理由（精簡） |
|---|------|------|------|
| Q1 | 出現時機 | **讀法 A：批末＋通關出獎勵**。「每 5 題一張」＝給設計圖片 session 的**產量直覺**，非顯示頻率 | 貼合現有 `renderBatchBreak`／`renderSummary` 兩個已是慶祝、已有音效的畫面，零侵入答題流程 |
| Q2/Q3 | 關聯粒度 | **粒度③：subtopic（約 30 池）＋ batch-content-aware 選圖 ＋ rollup fallback** | 粒度不等於總量；subtopic 標記是 unit 標記的超集，可隨時 roll-up。整單元批次混 subtopic 的問題用「看這批實際考了哪些 subtopic」化解 |
| Q4 | 機制 | **甲（用完即丟 / ephemeral）先上；乙（收集圖鑑）排 backlog** | 先讓插畫上線看效果、保持簡單；選圖邏輯設計成不擋乙 |
| Q5 | 呈現 | **P1：嵌入 summary 畫面**（標題下、按鈕上）。容器 1:1、置中、限高保證按鈕在折疊線上 | 現有批末已是天然慶祝畫面，當主視覺最省事；P2 全螢幕儀式版留給乙 |
| Q6 | 隨機方式 | **R3：每池洗牌袋（shuffle-bag）**，抽過不放回、整袋抽完才重裝 | 成本≈避免緊鄰重複，但變異體驗明顯更好；in-memory、reload 即清（符合甲）；天然鋪路乙的「解鎖」 |
| Q6 | 每池張數 | `clamp(ceil(subtopic題數 / 20), 下限 3, 上限 8)`，總計約 **136 張**（非線性 1:5 的 370 張） | 獎勵次數由批數（≈題數/10）決定、非題數；R3＋真實單次練習只 3–6 批 → 池 4–6 張就幾乎不重播 |
| Q7 | 錯題模式 | **也給獎勵**。錯題主題太雜 → 用**獨立「通用鼓勵池」5–10 張**洗牌輪播，不配 subtopic | 軟化「打掃任務」、強化成就感；共用 `renderSummary` 幾乎免費 |
| Q7 | 通關抽哪池 | 全模式通關＝**整單元合併池**隨機抽；錯題清除＝**通用鼓勵池** | 通關是集大成，用整單元混抽最有感 |
| Q8 | manifest | 新增 `docs/rewards.json`，**key＝subtopic 字串**，含保留 key `__generic__`；圖放 `docs/assets/rewards/` | key 對齊題庫 subtopic，零對照表；unit／科目層池由程式自動合併，設計圖片 session 不用管 roll-up |
| Q9a | 出現方式 | **淡入（fade + 輕微 scale，約 0.3s）** | 純 CSS 幾行、零依賴、多一點揭曉儀式感 |
| Q9b | 防閃爍 | **預載**：批做完瞬間先 `new Image()` 載選中那張，載好再進畫面；失敗走 roll-up／不顯示 | 圖小本機快、等待幾乎無感，避免空白閃 |
| Q9c | 互動 | **不可點、純展示** | 點圖放大／回看是乙的事，現在加會誘導碰持久化，違背「先上甲」 |

### 通用鼓勵池「一池兩用」
`__generic__`（5–10 張）同時服務：(1) 錯題清除獎勵；(2) 所有 subtopic／unit／科目池皆無圖時的**最終 fallback**。設計圖片 session 只要多畫這一組通用慶祝/鼓勵圖。

## 3. 觸發點與選圖演算法

### 觸發點（只在這兩個現有函式裡插入獎勵渲染）
- `renderBatchBreak()`（`docs/index.html` 約 L1959）：全模式、本批做完、整單元未通關。
- `renderSummary()`（約 L1978）：全模式通關（`title="通關！"`）或錯題清除（`title="錯題清除！"`）。

> 離開做題中途（`leaveQuiz`）不給獎勵。批末是「queue 清空」觸發 → 已隱含本批全部答對（答錯會重排到批尾）。

### 選圖流程（虛擬碼）
```
pickReward(context):
  # context.kind ∈ {batchBreak, unitClear, errorClear}
  poolKey, items = resolvePool(context)        # 見下方 roll-up
  if items is empty: return null               # 不顯示，畫面照常
  file = drawFromBag(poolKey, items)           # R3 洗牌袋
  return "assets/rewards/" + file

resolvePool(context):
  if context.kind == errorClear:
      return ("__generic__", manifest.pools["__generic__"] or [])
  if context.kind == unitClear:
      # 整單元合併池：該 unit 底下所有 subtopic 的圖合併
      key, items = unitMergedPool(context.unit)
      return rollupIfEmpty(key, items, context)
  if context.kind == batchBreak:
      st = dominantSubtopic(context.answeredThisBatch)   # 看這批實際考最多的 subtopic
      items = manifest.pools[st] or []
      if items: return (st, items)
      return rollup(st → unitMergedPool → subjectMergedPool → __generic__)

dominantSubtopic(answered):
  # 只統計「真的作答過」的題（跳過/回報不算），取出現次數最多；平手隨機挑一個
```

### roll-up fallback 鏈
`subtopic 池` →（空）→ `unit 合併池` →（空）→ `科目合併池` →（空）→ `__generic__` →（空）→ **不顯示**。

> unit／科目合併池由程式用 `SUBJECTS` 結構 + `questionMap` 算（哪些 subtopic 屬哪個 unit／科目），**設計圖片 session 不需要在 manifest 提供 unit／科目 key**。

### R3 洗牌袋
- 以「resolved poolKey」為單位，記憶體維護 `{ poolKey: 剩餘未抽清單 }`。
- 抽：從剩餘清單隨機取一個並移除；清單空了就用該池完整清單重裝再抽。
- 生命週期：**module-level、reload 即清**（符合甲 ephemeral）。乙要做時，這份「抽過集合」就是解鎖雛形。

## 4. manifest 契約（兩個 session 的唯一接縫）

新增檔 `docs/rewards.json`；圖檔放 `docs/assets/rewards/`。

```json
{
  "pools": {
    "風": ["wind_01.webp", "wind_02.webp", "wind_03.webp"],
    "天氣預報": ["forecast_01.webp", "forecast_02.webp", "...共 6 張..."],
    "綠色消費": ["green_01.webp", "green_02.webp", "green_03.webp"],
    "__generic__": ["cheer_01.webp", "...共 8 張通用鼓勵..."]
  }
}
```

規則：
- **key＝題庫現有 subtopic 字串**（逐字，見第 7 節對照表），加一個保留 key `__generic__`。
- **value＝檔名陣列**（相對 `assets/rewards/`）。檔名自由命名，靠 manifest 對應。
- 程式開頁時 fetch（同 `questions.json`／`explanations.json`）。
- **容錯＝可漸進補圖**：`rewards.json` 不存在、某 subtopic 未列、或圖檔 404 → 自動 roll-up，最後不顯示，**完全不影響作答**。設計圖片 session 可一個 subtopic 補一個、上線一個。

## 5. UI / 呈現規格

- **位置（P1）**：批末／通關畫面，標題下方、按鈕上方，當主視覺。
- **容器（背景已定案＝實底滿版方形，2026-06-15 設計圖片 session 回覆）**：1:1、置中、**響應式 `width: min(72vw, 400px)`**（iPad 直式約 400px、手機自動縮；1024 源圖降到 400px 顯示銳利；保證「再做 N 題／離開」按鈕在折疊線上方）。圖自帶乾淨背景，程式側**不需替不同圖補底色**；容器只加**圓角 ＋ 柔和投影**做成「收藏卡」感。無需透明 alpha 處理。
- **格式**：WebP（iOS 14+ Safari 支援含 alpha）。現有 `assets/math/` PNG 不動，新獎勵圖走 WebP。
- **淡入**：純 CSS `@keyframes`（opacity 0→1 + scale 0.96→1，約 0.3s ease-out）。
- **預載**：選中後 `new Image().src = path`，`onload` 再 `showPage`；`onerror` 走 roll-up／不顯示。
- **不可點**：純 `<img>`，無 click handler。
- **音效**：沿用現有 `complete`（批末）／`victory`（通關）／`complete`（錯題清除），不新增。

## 6. 實作 step-by-step（給實作 session 照著走；行號為 2026-06-15 `docs/index.html`）

> 全程零依賴、純前端，不動 Python pipeline。風格 match 周邊 code（內嵌、繁中註解）。

**Step 0 — 分支**：`feat/reward-illustrations`（本 session 已開）。生圖 session 共用同目錄但不碰 git（職責契約見 §12）。

**Step 1 — 載入 manifest**（全域宣告緊接 L589-590 `questionMap`／`explanations`；fetch 比照 L2034-2039 `explanations.json`）：
```js
let rewards = { pools: {} };           // L590 附近：reward manifest（缺檔靜默）
// init() 內、explanations fetch 之後：
try {
  const rwResp = await fetch("./rewards.json");
  if (rwResp.ok) rewards = await rwResp.json();
} catch (e) { console.warn("rewards.json not loaded:", e); }
```

**Step 2 — 建 roll-up 索引**（init 內、`questionMap` 建好後，從 `allQuestions` 一次掃出）：
```js
const subtopicsByUnit = new Map();     // unit(number) → Set(subtopic)
const subtopicsBySubject = new Map();  // subject → Set(subtopic)
const unitToSubject = new Map();       // unit → subject
for (const q of allQuestions) {
  (subtopicsByUnit.get(q.unit) || subtopicsByUnit.set(q.unit, new Set()).get(q.unit)).add(q.subtopic);
  (subtopicsBySubject.get(q.subject) || subtopicsBySubject.set(q.subject, new Set()).get(q.subject)).add(q.subtopic);
  unitToSubject.set(q.unit, q.subject);
}
```

**Step 3 — 純函式區塊 `<reward-pick-pure>`**（比照 `<enum-break-pure>`／`<backup-pure>`：區塊內**不得引用外部全域**，才能被 node 抽出獨立 eval；rng 用參數注入以利測試）：
```js
// <reward-pick-pure>
function rwPoolFor(m, key) { return (m && m.pools && m.pools[key]) || []; }
function rwMergedPool(m, keys) { const o=[]; for (const k of keys) for (const f of rwPoolFor(m,k)) o.push(f); return o; }
// 出現最多的 subtopic；平手用 rng 在並列中挑一個
function rwDominantKey(subs, rng) {
  if (!subs || !subs.length) return null;
  const c = new Map(); for (const s of subs) c.set(s,(c.get(s)||0)+1);
  let mx=0; for (const v of c.values()) if (v>mx) mx=v;
  const tied=[...c].filter(([,v])=>v===mx).map(([k])=>k);
  return tied[Math.floor((rng?rng():0)*tied.length)];
}
// ctx={kind:'batch'|'unit'|'error', subtopic?, unitKeys?, subjectKeys?} → {key, items}（含 roll-up）
function rwResolvePool(m, ctx) {
  if (ctx.kind==='error') return { key:'__generic__', items: rwPoolFor(m,'__generic__') };
  if (ctx.kind==='batch' && ctx.subtopic) { const sp=rwPoolFor(m,ctx.subtopic); if (sp.length) return {key:ctx.subtopic, items:sp}; }
  let it = rwMergedPool(m, ctx.unitKeys||[]);    if (it.length) return {key:'__unit__'+(ctx.unitKeys||[]).join(','), items:it};
  it = rwMergedPool(m, ctx.subjectKeys||[]);     if (it.length) return {key:'__subject__', items:it};
  it = rwPoolFor(m,'__generic__');               if (it.length) return {key:'__generic__', items:it};
  return { key:null, items:[] };
}
// shuffle-bag：bag={key:剩餘陣列}；抽完重裝；回傳檔名或 null
function rwDrawFromBag(bag, key, items, rng) {
  if (!key || !items.length) return null;
  let rem = bag[key]; if (!rem || !rem.length) rem = bag[key] = items.slice();
  const i = Math.floor((rng?rng():0)*rem.length); const f = rem[i]; rem.splice(i,1); return f;
}
// </reward-pick-pure>
```

**Step 4 — 選圖 wrapper（impure，可用全域）**：
```js
const rewardBag = {};   // module-level shuffle-bag；reload 即清（符合甲 ephemeral）
function pickReward(kind, unit) {
  const ctx = { kind };
  if (kind !== 'error') {
    ctx.unitKeys = [...(subtopicsByUnit.get(unit) || [])];
    ctx.subjectKeys = [...(subtopicsBySubject.get(unitToSubject.get(unit)) || [])];
  }
  if (kind === 'batch') {
    const subs = quiz.answered.map(a => questionMap.get(a.questionId)).filter(Boolean).map(q => q.subtopic);
    ctx.subtopic = rwDominantKey(subs, Math.random);   // 只看真的作答過的題（跳過/回報不在 answered）
  }
  const { key, items } = rwResolvePool(rewards, ctx);
  const file = rwDrawFromBag(rewardBag, key, items, Math.random);
  return file ? ('assets/rewards/' + file) : null;
}
```

**Step 5 — 預載 helper（防閃爍）**：
```js
function preloadThen(path, cb) {
  if (!path) { cb(); return; }
  const img = new Image(); img.onload = cb; img.onerror = cb; img.src = path;
}
```

**Step 6 — 接 `renderBatchBreak`（L1959）**：函式開頭算 `const reward = pickReward('batch', quiz.unit);`，把現有 body 包進 `preloadThen(reward, () => { ...原 innerHTML... })`，在按鈕 `<div>` 上方插：
```html
${reward ? `<img class="reward-img" src="${reward}" alt="" onerror="this.remove()">` : ""}
```

**Step 7 — 接 `renderSummary`（L1978）**：`const reward = pickReward(quiz.mode === 'full' ? 'unit' : 'error', quiz.unit);`，同樣 `preloadThen` 包住、score/按鈕上方插同一行 `<img>`。（full 通關＝整單元合併池；error 清除＝`__generic__`。）

**Step 8 — CSS `.reward-img`**：
```css
.reward-img{display:block;width:min(72vw,400px);aspect-ratio:1/1;object-fit:cover;
  margin:16px auto;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.15);animation:rewardIn .3s ease-out;}
@keyframes rewardIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
```

**Step 9 — 測試 `tests/test_reward_pick.mjs`**（抽 `<reward-pick-pure>` 機制照抄 `tests/test_breaks_pure.mjs`）：rng 用 `()=>0` 等 stub 驗 `rwDominantKey`（含平手）、`rwResolvePool` roll-up 四層、`rwDrawFromBag`（抽完才重裝、不緊鄰重複）、空 manifest 不爆。

**Step 10 — 孤兒 key 審計**：node/py 檢查 `rewards.json` 每個 key（除 `__generic__`）都在 `questions.json` 的 subtopic 集合內（防題庫更新後對不上）。

**Step 11 — Playwright live**（待真圖落地後）：批末／通關／錯題清除各出現一張、淡入正常、缺圖 roll-up／不顯示不卡作答、整單元連練不緊鄰重複。

**Step 12 — pytest**：不受影響（純前端、不動 pipeline）；確認既有測試仍綠。

> **與生圖 session 的職責切割（共用目錄、不開 worktree）**：生圖 session 只新增 `docs/assets/rewards/*.webp` ＋ 寫 `docs/rewards.json`，**完全不執行 git**；本 session（主導）擁有 `index.html`／`tests/`／`docs-dev/` 與全部 git 操作。兩邊檔案路徑不重疊、唯一接縫＝`rewards.json`（只有生圖 session 寫、本 session 只在 runtime 讀），故無同檔衝突。本 session 的單元測試用 inline manifest（不需檔案）；live 驗證等生圖 session 落幾張真圖後再跑。

## 7. 待與「設計圖片 session」對齊清單（彙整）

> 以下屬「圖片內容／規格」，由設計圖片 session 拍板。**2026-06-15 設計圖片 session 已回覆並定案**（詳見 [`reward-illustrations-brief.md`](reward-illustrations-brief.md) 內「我的回答」）。

1. **背景（已定案）**：**實底滿版方形、自帶乾淨背景、無透明 alpha**。→ 已回填本文 §5（容器只加圓角＋投影，不替圖補底色）。
2. **產圖規格**：master 1536×1536 →上線 1024×1024 WebP；**1536 masters 不進 `docs/`**（gitignore）；單張 ≤ ~100KB；q80–85 lossy，平塗可順手比 lossless。
3. **每池張數（取代「370」）**：`clamp(ceil(題數/20), 3, 8)`，總約 **136 張**。逐 subtopic 建議值見下表。
4. **標記到 subtopic**：用題庫現有 subtopic 字串當 manifest key（逐字，見對照表）。
5. **通用鼓勵池（已定案 8 張）**：另畫 **8 張**通用慶祝/鼓勵圖 → `__generic__`（錯題清除＋最終 fallback 共用）。第一版總量＝128 subtopic ＋ 8 通用 ＝ **136 張**。
6. **內容關聯**：每池主題扣該 subtopic（例：綠色消費→環保袋/回收；風→風向/風車；小數→小數點/量尺）。
7. **檔名／manifest**：檔名自由，但要逐一列進 `rewards.json`。可一個 subtopic 補一個、漸進上線。

### subtopic → unit／建議張數 對照表（題數為 2026-06-15 題庫）

| 科目 | unit | subtopic | 題數 | 建議張數 |
|---|---|---|---|---|
| 數學 | 5 小數 | 小數的認識 | 44 | 3 |
| 數學 | 5 小數 | 小數比大小 | 8 | 3 |
| 數學 | 5 小數 | 小數加減 | 38 | 3 |
| 數學 | 6 圓 | 圓的構造 | 24 | 3 |
| 數學 | 6 圓 | 圓規與畫圓 | 9 | 3 |
| 數學 | 6 圓 | 圓的大小比較 | 8 | 3 |
| 數學 | 7 乘除 | 乘除應用 | 40 | 3 |
| 數學 | 7 乘除 | 乘除互逆 | 32 | 3 |
| 數學 | 7 乘除 | 乘除計算 | 21 | 3 |
| 數學 | 8 時間 | 時刻與時間單位 | 7 | 3 |
| 數學 | 8 時間 | 時間計算 | 23 | 3 |
| 數學 | 8 時間 | 時制互換 | 8 | 3 |
| 數學 | 9 統計表 | 報讀表格 | 45 | 3 |
| 自然 | 1 田園樂 | 蔬菜生長的變化過程 | 144 | 8 |
| 自然 | 1 田園樂 | 影響蔬菜生長的因素 | 137 | 7 |
| 自然 | 1 田園樂 | 蔬菜從哪裡來 | 43 | 3 |
| 自然 | 2 溫度 | 溫度對水的變化 | 217 | 8 |
| 自然 | 2 溫度 | 影響物質變化的因素 | 39 | 3 |
| 自然 | 2 溫度 | 溫度對其他物質的影響 | 21 | 3 |
| 自然 | 3 動物 | 生存與適應 | 107 | 6 |
| 自然 | 3 動物 | 身體構造 | 78 | 4 |
| 自然 | 3 動物 | 觀察方法 | 27 | 3 |
| 自然 | 3 動物 | 動物分類 | 38 | 3 |
| 自然 | 4 天氣 | 風 | 53 | 3 |
| 自然 | 4 天氣 | 氣溫測量 | 49 | 3 |
| 自然 | 4 天氣 | 天氣預報 | 106 | 6 |
| 自然 | 4 天氣 | 雨量降雨 | 40 | 3 |
| 社會 | 10 消費與選擇 | 聰明消費 | 103 | 6 |
| 社會 | 10 消費與選擇 | 綠色消費 | 51 | 3 |
| 社會 | 11 家鄉的地名 | 地名的由來 | 97 | 5 |
| 社會 | 11 家鄉的地名 | 探索家鄉的地名 | 35 | 3 |
| 社會 | 12 家鄉的故事 | 傳說與文化保存 | 106 | 6 |
| 社會 | 12 家鄉的故事 | 家鄉的人物與發展 | 60 | 3 |
| —  | —（通用） | `__generic__` | — | 8 |
| | | **合計** | | **136（128＋8）** |

> 注意：subtopic 字串須與 `docs/questions.json` 逐字一致（含全形）。實作前用 `questions.json` 重新點一次題數/字串，避免題庫更新後對不上。

## 8. 乙（收集圖鑑 / collection）backlog

甲上線後可接：
- **持久化**：localStorage 存「已解鎖圖檔集合」；R3 的「抽過集合」升級為跨 session 持久。
- **圖鑑頁**：首頁多入口，gallery 顯示已解鎖（未解鎖留剪影/問號），新解鎖標「NEW」。
- **備份整合**：併入現有「進度備份/還原」「備份到備忘錄」（否則 iOS ~7 天清掉收藏，小孩會崩潰）。
- **華麗版揭曉（P2）**：解鎖瞬間可做全螢幕揭曉動畫。
- **可點放大**：圖鑑內點圖放大回看。

## 9. 尚待決定 / 已知小邊界

- ~~§7①背景最終值未定~~ → **已定案：實底滿版方形**（2026-06-15），§5 容器樣式已回填。**已無懸而未決的跨 session 決策。**
- 邊界：批末若靠「跳過/回報最後一題」清空 queue 也會觸發獎勵（甲不特別處理，可接受）。
- 命名（設計圖片 session 採用）：檔名＝ASCII slug ＋ 兩位數流水號（如 `wind_01.webp`、`green_consumption_03.webp`）；不承載語意、靠 manifest 對應即可。
- 內容邊界（設計圖片 session 採用）：扣 subtopic 但**不做成解答圖**；避免可讀文字/數字算式/題目句/商標/真實品牌；主體置中偏大、勿放四角。
- 邊界：subtopic 字串若隨題庫擴充新增（如社會再擴充），需同步補 manifest，否則該 subtopic 走 roll-up（不致出錯，只是較不貼題）。

## 10. 驗證計畫（實作時）

- `tests/test_reward_pick.mjs`：`dominantSubtopic`（含平手）、`drawFromBag`（抽完才重裝、不緊鄰重複）、`resolvePool` roll-up 鏈、空 manifest 不爆。
- 全庫審計：每個 subtopic key 都能在 `questions.json` 找到對應題（無孤兒 key）。
- Playwright live：批末/通關/錯題清除各出現一張、淡入正常、缺圖 roll-up/不顯示不卡畫面、整單元連練不緊鄰重複。
- pytest 既有測試不受影響（純前端、不動 pipeline）。

## 11. 為什麼不採用（避免下次重議）

- **讀法 B（每 5 題硬彈）**：要動 `submitAnswer/advance` 核心流程、打斷一批連續作答，風險高。
- **粒度①②**：粒度不等於總量；subtopic 是 unit 的超集，可 roll-up，關聯性更強。
- **方案乙立刻做**：範圍大（持久化＋圖鑑頁＋備份整合），違背「先上甲看效果」。
- **P2 全螢幕**：多一層 page state＋多一次點擊，留給乙。
- **R1 純隨機 / R2 避免緊鄰**：變異體驗不如 R3，且 R3 成本相近又鋪路乙。
- **線性 1:5（370 張）**：獎勵次數由批數非題數決定；大 subtopic 會被畫 20+ 張、絕大多數看不到，純浪費。
