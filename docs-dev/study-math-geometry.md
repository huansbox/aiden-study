# StudyMathGeometry 契約

追蹤 #249。這是獨立元件；不代表私人題已投影、接入或發布。公開範例與測試皆為 synthetic。載入 `math-geometry.js`、`math-geometry.css`；全域 frozen `StudyMathGeometry` 提供 `TYPES, TYPE_UNITS, validateQuestion, initial, render, update, read, complete, grade, answerText, semantic`。與 StudyMathInteractions 同樣用純 JSON 狀態；不寫進度、不碰 family／獎勵／網路。單一 integrator 接入 private-pack、Python builder、preview 與 index。

## API 與事件

- `validateQuestion(q)`：合法回傳 true，否則 throw Error。其餘 API 接受已驗證的題目；未知、舊版或損毀 state 會清理。
- `initial(q)` 回傳空白 state；`render(q,state,disabled=false)` 回傳已 escape 的 HTML。
- `update(q,state,action,payload)` 回傳新 state，不修改原參數。`clear` 重置，`field` payload 為 `{field,value}`。
- `read(q,container,previousState)` 把容器內 `[data-geometry-field]` 的 input 值合併進狀態。
- `complete` 只問是否填完；`grade` 判數學與原要求；兩者回傳 boolean。
- `answerText` 只在交卷後回饋時使用；`semantic` 是 `[type,interaction]` 的 JSON 指紋。

按鈕用 `data-geometry-action`／`data-geometry-value`；原生 button 支援觸控、Enter、Space。所有微調按鈕至少 44×44 CSS px。畫布是 SVG，必須用 SVG 座標轉換，不得把 client px 當成圖上座標。SVG 內工具 `pointer-events="none"`，不遮擋量測圖。

以下是最小接線。每次操作後先保存 state，再畫畫面；input 的 change 也須保存，重載還原 JSON。請只讓模組處理本區事件；answered 時不委派。drag 的 pointer capture 放在不會重畫的 container，pointerup 或 pointercancel 結束；避免 pointerdown 和 click 重複操作。

```js
const M = StudyMathGeometry;
let dragging = false;
function draw() { container.innerHTML = M.render(q, state, answered); }
function save() { /* 儲存 child-scoped state；不可讀寫正式測試資料 */ }
function dispatch(action, payload) {
  if (answered) return;
  state = M.update(q, M.read(q, container, state), action, payload);
  save(); draw();
}
container.addEventListener('change', () => {
  if (answered) return;
  state = M.read(q, container, state); save(); draw();
});
container.addEventListener('click', e => {
  const b = e.target.closest('button[data-geometry-action]');
  if (b && !b.disabled) dispatch(b.dataset.geometryAction, b.dataset.geometryValue);
});
function place(e) {
  const svg = container.querySelector('svg[data-geometry-action="canvas"]');
  if (!svg) return;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  dispatch('canvas', {x:p.x, y:p.y});
}
container.addEventListener('pointerdown', e => {
  if (answered || !e.target.closest('svg[data-geometry-action="canvas"]')) return;
  dragging = true; container.setPointerCapture(e.pointerId); place(e);
});
container.addEventListener('pointermove', e => { if (dragging) place(e); });
for (const name of ['pointerup','pointercancel']) container.addEventListener(name, () => { dragging=false; });
```

按鍵微調可獨立完成：先選頂點，用方向按鈕放點及移動；用三個連線按鈕連邊。工具先選再用方向、旋轉按鈕。長條先選第幾根，再加減小格。使用者不必精確點中小頂點或細線。375px 畫布可在自身區塊橫向捲動；不讓整頁溢出。

## 共通 schema

精確 keys：`id,subject,unit,type,text,subtopic,source,options,answer,interaction`；可選 `material`（物件，整合端照既有規則驗證）。subject math、options 空陣列、answer 空字串。非空文字上限：id 120、text 1000、source 300、subtopic 60。type triangle_construct／measure_tool 只允許 unit 24；bar_chart_draw 只允許 unit 28。所有下列物件不接受未列 keys；所有值必須是指定型別，禁止 NaN／Infinity。

`scene` 精確 `{width,height,pixelsPerCm}`，可選 `image`。width 240–2000、height 180–1600、pixelsPerCm 8–200。`image` 是 PNG data URL，最多 6,000,000 字元，僅 base64。整合端須核對 PNG 真實格式與尺寸再供給；禁止把未驗證的私人 URL 放進此欄。

scene 是唯一座標系。PNG 填滿 scene；圖與工具在同一 SVG，responsive、瀏覽器縮放、區塊捲動都一起變換。`pixelsPerCm` 是這份 PNG／scene 內「圖上 1 公分」的單位數，不是螢幕物理公分。私人作者必須依原 PDF 尺寸、裁圖與重採樣倍率投影，或使用來源已知長度校準；不得從圖片看起來多大推定。缺比例尺時拒絕驗證，不能發布假工具。

## triangle_construct

interaction 精確：

```js
{
  scene: {width:800, height:600, pixelsPerCm:40},
  given: [{index:0, point:[300,250], label:'A'}],
  grid: null,
  constraints: {kind:'apex', legs:[4,5], angle:90, reference:null},
  marks: {labels:[], rightAt:null, angleAt:null},
  tolerance: {lengthCm:0.1, angleDeg:2}
}
```

- 頂點 index 為 0、1、2。`given` 0–2 個 `{index,point,label}`，index 不重複，point `[x,y]` 在 scene 內，label 可空字串、最多 8 字；兩指定點形成不能移動的給定邊。其他點必須由學生放置，連三邊按鈕不代放點。
- `grid` null 或 4–100：方格單位數，頂點會吸附格點。給定點不改動。
- constraints 固定四 keys。kind `isosceles`（任兩邊相等，含正三角形）、`right`（任一角直角）：legs、angle、reference 皆 null。
- kind `apex`：given 必須含 index 0；legs 是兩數（各 0.2–20 cm），angle null 或 10–170 度，reference null。兩腰可不等，判定接受兩邊交換、旋轉與鏡射；角必在 index 0。
- kind `congruent`：given 含 index 0，legs／angle null，reference 三點且不退化。參考點 index 0 是與學生指定頂點對應的角；判三邊全等與該角。若有 scene.image，原圖已含參考圖；否則顯示 reference 三角形與 A/B/C。不先告訴孩子參考邊長。
- marks 精確 `{labels,rightAt,angleAt}`。labels 0–3 個 `{index,text}`（text 1–8 字），要求學生在該點寫名稱；rightAt null 或 index；angleAt null 或 `{index,degrees}`。只有原文要求時才加入，既有印字放 given.label，不能冒稱是學生標註。
- tolerance 精確 `{lengthCm,angleDeg}`，0.01–0.2 cm、0.1–5 度。任何答案最短邊至少 0.2 cm、各角至少 5 度且不超過 170 度；不接受退化圖。容差套在幾何數值，標記文字仍須符合原要求。
- state：points、edges、labels、rights、angles、active、tool、used；所有固定點／邊重載仍以題目為準。畫布只接受座標，不接受「輸入邊長自動畫圖」。

此契約涵蓋給定邊等腰、方格直角、任意角的指定兩腰、指定鈍頂角、等腰直角、不等兩邊直角、原參考圖全等及其學生標記。8 原題的私人投影須逐題保留指定點及原標記，不能直接沿用先前 pending construct/spec。

## bar_chart_draw

interaction 精確 `{axis,bars,unit,title}`：

```js
{
  axis:{min:0,max:40,step:10,minor:2,break:false,labels:[0,10,null,null,null],below:[]},
  bars:[{label:'甲組',value:18,given:false,labelGiven:true},
        {label:'乙組',value:26,given:false,labelGiven:false}],
  unit:{text:'人',required:false},
  title:{text:'社團學生人數',required:true,keywords:[['社團'],['人數','學生數']]}
}
```

- axis min 0–100000，max > min 且 ≤100000，step 1–10000，minor 1–step。大格 1–30、小格 1–100，每大格包含 1–20 小格，皆整數。每根柱高以小格 index 存檔，不能直接輸入數據冒稱作圖。
- labels 由下往上，長度 `(max-min)/step+1`，每格只能 null（學生補）或該位置真實值。所有刻度都需符合相同 scale，填錯刻度即使柱高正確也不通過。
- break=true 必須 min>0；below 0–3 個嚴格遞增、低於 min 的已給值，用於斷軸下的原刻度（例如 0 及另一原刻度）。畫布清楚顯示斷軸；break=false 時 min=0、below=[]。
- bars 1–8 個 `{label,value,given,labelGiven}`，label 1–24 字不重複，value 在 axis 範圍且落在小格上，至少一根未畫。given 的柱子鎖定；labelGiven=true 類別印好、false 學生補。
- unit `{text,required}`，text 1–12 字；required=false 是原印單位，不能加考。
- title `{text,required,keywords}`，text 是 1–60 字的範例／原印標題。required=false 時 keywords=[]。required=true 時 2–5 組必要意義，每組 1–5 個替代詞（各 1–16 字），每組至少一詞出現在作答；標題最多 60 字。不依單一關鍵詞或單一固定句判定。投影者須涵蓋對象與統計主題，不能只用泛稱「統計」「圖」。
- 4 原題的斷軸、原已畫柱、待填刻度／類別／單位／標題分別投影；資料表是題目資訊，與學生畫出的圖分開。

## measure_tool

interaction 精確 `{scene,tools,outputs}`。scene 必須有 PNG image；tools 是 1–3 個不重複的 `ruler`、`protractor`、`square`。直尺有毫米／半公分／公分刻度，量角器每度刻度、每 10 度雙向讀數，三角板為等腰直角形。用圖上起點定位，方向可 ±1 或 ±10 度轉動。

outputs 1–8 個，可混合：

```js
{kind:'single',label:'圖一是哪一類？',options:['直角','鈍角','銳角'],answer:[0]}
{kind:'set',label:'哪些圖形符合？',options:['甲','乙','丙'],answer:[0,2]}
{kind:'number',label:'邊長',answer:4.5,tolerance:0.1,unit:'cm'}
```

label 1–80 字；選項 2–10 個不重複，1–24 字；answer 是零起算索引、不重複，single 長度 1、set 非空。number answer 0–10000，tolerance 0–5，unit 0–12 字。數值接受 NFKC 數字、最多 7 整數位／3 小數位，不接受科學記號或運算式。

工具操作記錄 `used` 只記移動或旋轉過的種類；至少一次即可作答，不要求無意義的固定點擊序列，也不宣稱這證明孩子量了所有邊。題目應保留實際量測指令，量測過程可在需要時由家長觀察。7 原題可用 3 組 set／single 及 4 組 single 投影；這不等於已用正式原圖驗證。

## 私人作者仍需提供

原圖 natural width／height 與 scene 的關係、依 PDF 或已知長度核定的 pixelsPerCm、固定點／給定線端點、參考圖三頂點（全等題指定對應角）、原方格間距、每個原印／待填軸刻度、原已畫柱與類別，及原文要求學生自行添加的標記。公用模組不猜這些值。校準值與投影證據應在私人附件／來源 review 保存，不能放入公開 fixture。
