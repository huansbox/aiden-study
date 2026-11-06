# 數學操作元件 StudyMathInteractions

追蹤 [#249](https://github.com/huansbox/aiden-study/issues/249)。本文件只定義元件契約，不代表任何題目已核准、已接入或已發布。來源檔：`docs/study/math-interactions.js`、`docs/study/math-interactions.css`；測試：`tests/test_study_math_interactions.mjs`（全為合成題）。

元件只處理四種題型的「驗證、畫面、狀態、評分、正解文字」。不寫家庭進度、不發獎勵、不渲染 `material`（題圖由整合端照既有方式顯示在元件上方）。題包、`private-pack.js`、Python builder、preview 與 `index.html` 由單一整合者接線。

## API

全域 `StudyMathInteractions`（frozen）：

| 成員 | 說明 |
| --- | --- |
| `TYPES` | `["expression_steps","vertical_decimal","fraction_shade","hundred_grid_select"]` |
| `TYPE_UNITS` | 題型可用單元，見下表 |
| `validateQuestion(q)` | 合法回傳 `true`，否則丟 `Error`（訊息為家長可讀中文） |
| `initial(q)` | 空白作答狀態（純 JSON） |
| `render(q, state, disabled)` | 回傳 HTML 字串；所有題文與值都經 escape |
| `update(q, state, action, payload)` | 純函式，回傳新狀態，不改動輸入 |
| `read(q, container, previousState)` | 只讀容器內本元件的 `input[data-math-field]`；本版所有作答都經按鍵，因此實際上回傳清理後的 `previousState` |
| `complete(q, state)` | 是否已填到可送出 |
| `grade(q, state)` | `true`／`false` |
| `answerText(q)` | 給孩子回饋與家長試玩的正解文字 |
| `answerState(q)` | 一份必定通過 `grade` 的作答狀態；`answerText` 由它產生，兩者同源 |
| `semantic(q)` | 作答語意指紋字串（`[type, interaction]`），整合端併入題包既有 `semantic` |
| `analyzeExpression(s)` | 安全算式分析（供 Python 對照測試用） |

所有函式接受任意（含損毀、舊版或惡意）`state`：先依題目清理，不合法欄位回到空白值，不會丟例外。狀態可直接 `JSON.stringify` 存入 child-scoped 儲存，重載後原樣交回。

### 整合端事件委派

```js
container.addEventListener("click", e => {
  const el = e.target.closest("[data-math-action]");
  if (!el || answered || el.disabled) return;
  state = M.update(q, M.read(q, container, state), el.dataset.mathAction, el.dataset.mathValue);
  container.innerHTML = M.render(q, state, answered);
});
```

- 送出鍵由整合端提供，`M.complete` 為 `false` 時停用；送出後以 `M.grade` 判對錯，以 `disabled=true` 重畫鎖定（孩子作答保持清楚，只有按鍵淡化）。
- 每題一次 `family.record()`；獎勵與成就照 AGENTS.md 只在批次結束畫面出現。
- `render` 的根節點是 `<section class="study-math" data-math-type="…">`，需載入 `math-interactions.css`。
- 分數畫斜線的部位是 SVG `<path role="button" tabindex="0">`；鎖定時移除其 `data-math-action`。

## 共通欄位

```
id, subject, unit, type, text, subtopic, source, options, answer, interaction, [material]
```

- 欄位剛好這些（`material` 可選，元件只檢查是物件，內容由整合端既有 PNG 規則驗證）。
- `subject="math"`；`options=[]`；`answer=""`；`id`≤120、`subtopic`≤60、`source`≤300、`text`≤600 字，皆非空白。
- 題型與單元守衛：

| type | unit |
| --- | --- |
| `expression_steps` | 26（U8 整數四則） |
| `vertical_decimal` | 25（U7 二位小數） |
| `hundred_grid_select` | 25 |
| `fraction_shade` | 27（U9 分數） |

全形空格標記指 `（１）`、`（２）`…（全形括號＋全形數字）。驗證時以 regex `（[０-９]+）` 抽出 text 內全部標記，必須「依序剛好等於」所需清單；`（顆）` 這類非數字括號不受影響。

## expression_steps

```json
{
  "type": "expression_steps", "unit": 26,
  "text": "每盒有6顆紅球和2顆藍球，共5盒，一共有幾顆球？先算：（１）　再算：（２）　合併成一個算式：（３）",
  "interaction": {
    "blanks": [{ "kind": "expression" }, { "kind": "expression" }, { "kind": "expression" }],
    "solutions": [
      [{ "value": "8", "expression": "6+2" }, { "value": "40", "expression": "8×5" },
       { "value": "40", "expression": "(6+2)×5", "acceptedExpressions": ["6×5+2×5"] }],
      [{ "value": "30", "expression": "6×5" }, { "value": "40", "expression": "30+2×5" },
       { "value": "40", "expression": "(6+2)×5", "acceptedExpressions": ["6×5+2×5"] }]
    ]
  }
}
```

### Schema

- `interaction` 剛好 `blanks`、`solutions`。
- `blanks`：1–6 格。每格 `{kind:"number"}` 或 `{kind:"expression"}`／`{kind:"expression", requiresParentheses:true}`（`requiresParentheses` 出現時只能是 `true`）。text 標記必須依序為 `（１）`…`（n）`。
- `solutions`：1–4 組「完整解法」，每組是長度 n 的陣列，第 i 個 cell 對應第 i 格；不同組不可完全相同。
  - 數字格 cell：剛好 `{value}`。
  - 算式格 cell：`{value, expression}`，可加 `acceptedExpressions`（1–6 個字串）。
  - `value`：`^(0|[1-9][0-9]{0,8})$`。
  - `expression` 與每個 `acceptedExpressions`：可解析（不可含 `=`）、至少一個運算子、值等於 `value`；若該格 `requiresParentheses`，每一個都需有「真實括號群組」（定義見下）；同一 cell 內各式的 canonical 形式不可重複。
- 原題已印出運算、只要孩子填數字的空格（如 `345－（１）`）用 `number`。題目要求「先算／再算／合併成一個算式」或連等式中間式（`84－(22＋38)＝（１）`）一律用 `expression`。

### 評分

整份作答必須「逐格符合同一組 solution」才對；不同解法的中間結果混用一律錯。

- 數字格：NFKC＋trim 後符合 `^(0|[1-9][0-9]{0,8})$` 且數值等於 `value`。
- 算式格：`analyzeExpression(input)` 合法、至少一個運算子、值等於 `value`、（需括號時）有真實括號群組，且下列其一：
  1. 輸入的數字字面值 multiset 等於 `expression` 的字面值 multiset（交換、結合寫法都算）；或
  2. 輸入的 canonical 等於某個 `acceptedExpressions` 的 canonical（用來補分配律等會重複數字的合法寫法）。
- 只填最終數值（無運算子）在算式格必錯，所以連等式 `84－60` 的格子只寫 `24` 不會通過。

### 安全算式語法（JS 與 Python 需逐條等價）

1. 正規化：`NFKC` → 把 `U+2212 U+2013 U+2014` 換成 `-` → `*`、`x`、`X` 換成 `×` → `/` 換成 `÷` → 移除所有空白。結果需非空、≤40 字元、只含 `0-9 + - × ÷ ( ) =`。
2. `=` 至多一個。有 `=` 時右側需為 `^(0|[1-9][0-9]{0,8})$`，且等於左側值；儲存在題包內的參考算式不可含 `=`。
3. Token：數字 `[0-9]+`（≤9 位、除 `0` 外不可有前導 0）或單一符號；token 數 ≤31。
4. 文法（無一元負號）：
   ```
   expr   := term (("+" | "-") term)*      左結合
   term   := factor (("×" | "÷") factor)*  左結合
   factor := NUMBER | "(" expr ")"         括號巢狀深度 ≤ 4
   ```
   必須消耗全部 token。
5. 求值以整數進行：減法結果不可為負、除數不可為 0、除法必須整除、任何中間值 ≤ 1e12；違反即整個算式不合法。
6. 真實括號群組：某個 `( expr )` 內的 expr 含運算子，且它不是整個算式本身。`(155÷31)+3` 合法；`(155÷31+3)`（包全部）、`(155)÷31+3`（只包數字）不算。冗餘但有群組作用的括號（`(155÷31)+3`）依原題「寫出有括號的算式」視為合格。
7. Canonical：數字→十進位字串；`+`／`×` 把同一運算子的連續子樹攤平、子項 canonical 依字串排序後寫成 `+[a,b,…]`／`×[a,b,…]`；`-`／`÷` 寫成 `-(a,b)`／`÷(a,b)`。括號不影響 canonical。

## vertical_decimal

```json
{ "type": "vertical_decimal", "unit": 25, "text": "用直式計算：60－2.35＝",
  "interaction": { "op": "-", "operands": ["60", "2.35"], "result": "57.65" } }
```

### Schema

- `interaction` 剛好 `op`、`operands`、`result`；`op` 為 `+` 或 `-`；`operands` 恰兩個。
- 三個數字都符合 `^(0|[1-9][0-9]{0,3})(\.[0-9]{1,2})?$`（最多 4 位整數、2 位小數）。運算元照題文寫法存，**不要**為了對齊改成 `50.00`；補 0 是孩子的操作。
- 以百分位整數計算：`a op b == result` 且結果不為負。
- 格數 `C = 最大整數位數 + 最大小數位數 + 2`（三數一起算），需 ≤10。

### 操作與評分

畫面是 3 列 × C 格的空白直式格（第一列被減數／加數、第二列含題目給定的運算符號、第三列答案）。孩子點格子後用按鍵輸入數字，自動跳到右邊一格；按「．」把小數點點在前一個數字（或目前格的數字）後面，再按一次取消；退格可清格或移除小數點。另有「小數後面補 0」「清除這一列」「全部重寫」。沒有進位／借位列（不計分，本版不提供）。

狀態：`{rows:[{cells:[C 個 ""|"0"…"9"], point:null|欄 index}×3], active:[row,col]}`；`point=k` 表示小數點在第 k 格數字之後。

每列解析：
- 數字需連續（第一個到最後一個非空格之間不可有空格），至少一個數字。
- 小數點需在數字範圍內且後面還有數字（`60.` 不合法）；整數部分不可多餘前導 0（`060` 不合法，`0.5` 合法）。
- 第 3 位以後的小數只允許是 0。
- 對齊錨點 = 小數點所在格 +1；沒有小數點時 = 最後一個數字 +1。

正確條件：三列都合法、三列錨點相同（允許整體左右平移）、第一列值＝`operands[0]` 且第二列值＝`operands[1]`（加法允許上下互換，減法不可）、第三列值＝`result`（`11`、`11.0`、`11.00` 等值皆可）。因此「答案數字對但運算元沒對齊」必錯；「`60` 不補 0 與 `2.35` 正確對齊」與「自己補成 `60.00`」都對。

「補 0」只對已點小數點的運算元列，在其最後一個數字之後補到兩運算元中最右的位置；不搬動數字，所以不會替孩子修正對齊，也不會把沒有小數點的 `60` 變成 `6000`。

## fraction_shade

```json
{ "type": "fraction_shade", "unit": 27, "text": "請依分數畫上斜線：11/8",
  "interaction": { "shape": "grid", "wholes": 2, "partsPerWhole": 8, "grid": { "rows": 2, "cols": 4 },
                   "target": { "numerator": 11, "denominator": 8 } } }
```

```json
{ "type": "fraction_shade", "unit": 27, "text": "13/5 換成帶分數並畫畫看：13/5＝（１）",
  "interaction": { "shape": "circle", "wholes": 3, "partsPerWhole": 5,
                   "target": { "numerator": 13, "denominator": 5 }, "companion": { "form": "mixed" } } }
```

### Schema

- `shape="grid"`：剛好 `shape, wholes, partsPerWhole, grid, target`（可加 `companion`）；`grid` 剛好 `rows`、`cols`，各 1–6，`rows×cols == partsPerWhole`。
- `shape="circle"`：同上但不可有 `grid`（扇形等分）。
- `wholes` 1–6、`partsPerWhole` 2–12 的整數。
- `target` 剛好 `numerator`、`denominator` 整數；`denominator == partsPerWhole`；`1 ≤ numerator ≤ wholes × partsPerWhole`。
- `companion`（可選）剛好 `{form}`，`form` 為 `mixed` 或 `improper`。`mixed` 需 `numerator > denominator` 且不整除；`improper` 需 `numerator ≥ denominator`。
- 有 `companion` 時 text 必須剛好含一個 `（１）`；沒有則不可含任何全形數字標記。

### 操作與評分

初始全部空白（不預塗）。點任一部位畫斜線、再點取消、「斜線全部擦掉」重畫；可以選任何部位、任何整體。正確條件：已畫部位總數 == `numerator`，且（有 companion 時）填空正確。

Companion 以整數方塊輸入（按鍵、每格最多 3 位）：
- `mixed`：整數 `w ≥ 1`、`0 < n < d`、`(w×d+n)×denominator == numerator×d`。
- `improper`：`n ≥ d`、`n×denominator == numerator×d`。

填空依有理值等價判斷，接受同形式的約分與擴分；圖形仍保留原題等分數。比較採 BigInt 交叉相乘。

狀態：`{selected:[部位 index 由小到大]}`，部位 index = `整體序 × partsPerWhole + 部位序`；有 companion 時加 `companion:{w,n,d}` 與 `active`。

## hundred_grid_select

```json
{ "type": "hundred_grid_select", "unit": 25, "text": "請圈出3.06張百格板。",
  "interaction": { "pieces": { "boards": 4, "rods": 5, "units": 7 }, "target": "3.06" } }
```

### Schema

- `interaction` 剛好 `pieces`、`target`；`pieces` 剛好 `boards`（0–10）、`rods`（0–20）、`units`（0–20），總數 > 0。
- `target`：`^(0|[1-9][0-9]?)(\.[0-9]{1,2})?$`，以百分位整數計 `T > 0`；必須存在 `b≤boards, r≤rods, u≤units` 使 `100b+10r+u == T`（題目給的教具湊不出就拒收）。

### 操作與評分

顯示題目給定數量的百格板（10×10）、十格條（1×10）與小格；每件可點選圈起／取消，「全部取消」重來。正確條件：`100×已圈板數 + 10×已圈條數 + 已圈格數 == T`，不另加最少件數限制。`answerText` 以「板最多、其次條」的第一組湊法說明；有其他湊法時註明其他合起來相同的圈法也對。

狀態：`{boards:[index], rods:[index], units:[index]}`。

## 版面

- 必要按鈕與格子 ≥44px；作答按鍵在畫面內，不叫出 iPad 系統鍵盤遮住直式。
- 768×1024、1024×768 以合成題實際點擊驗證不橫向溢出（證據在私用 Dropbox 附件，不進 Git）。375px 寬未列入本輪範圍。

## 不在本元件範圍

`triangle_construct`、`bar_chart_draw`、`measure_tool`、分數開放不等式、choice_set／小數填空等其他 proposal 項目另行派工。原 proposal 的 `steps[].kind=step/single_expression`、`spec`、`acceptFinal`、`operands` 預先補 0 等寫法已由本契約取代，內容稿需投影到上列欄位。
