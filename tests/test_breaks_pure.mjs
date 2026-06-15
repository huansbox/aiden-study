// 題幹列舉條列換行純函式測試（待辦⑤，做法 B）。
// 執行：node --test tests/test_breaks_pure.mjs
// 做法：從 docs/index.html 抽出 <enum-break-pure> sentinel 區塊 eval（維持單一 index.html）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const m = html.match(/\/\/ <enum-break-pure>([\s\S]*?)\/\/ <\/enum-break-pure>/);
if (!m) throw new Error("docs/index.html 找不到 <enum-break-pure> 區塊");
const { applyEnumBreaks } = new Function(m[1] + "\nreturn { applyEnumBreaks };")();

// ── 真列舉：在標記前分行 ──

test("全形括號（甲）…（戊）：每個標記前分行（桃子腳112 mc_8 結構）", () => {
  const stem = "他們（甲）搭乘大眾運輸，（乙）但是吃不完，（丙）花媽自備水壺，（丁）柚子買罐裝水，（戊）自備餐盒。";
  assert.equal(applyEnumBreaks(stem),
    "他們<br>（甲）搭乘大眾運輸，<br>（乙）但是吃不完，<br>（丙）花媽自備水壺，<br>（丁）柚子買罐裝水，<br>（戊）自備餐盒。");
});

test("裸式 甲.乙.丙.：首標記在句首→開頭不留 <br>（自然身體部位題結構）", () => {
  const stem = "甲.頭、乙.翅膀、丙.尾羽、丁.軀幹、戊.尾巴、己.腳。";
  assert.equal(applyEnumBreaks(stem),
    "甲.頭、<br>乙.翅膀、<br>丙.尾羽、<br>丁.軀幹、<br>戊.尾巴、<br>己.腳。");
});

test("半形括號 (甲)(乙)(丙)：首標記在句首（民權110 mc_14 結構）", () => {
  const stem = "(甲)開花、(乙)結果、(丙)長高、長大 以上是成長過程的順序？";
  assert.equal(applyEnumBreaks(stem),
    "(甲)開花、<br>(乙)結果、<br>(丙)長高、長大 以上是成長過程的順序？");
});

test("全形括號內嵌句中（海佃110 mc_5 結構）：標記前分行、前導語留行尾", () => {
  const stem = "請將（甲）漢人（乙）日本人（丙）原住民族，依先後順序排列？";
  assert.equal(applyEnumBreaks(stem),
    "請將<br>（甲）漢人<br>（乙）日本人<br>（丙）原住民族，依先後順序排列？");
});

test("頓號真列舉（甲、…乙、…，各帶內容）：應分行", () => {
  const stem = "甲、選擇外觀不佳的蔬果乙、到吃到飽餐廳";
  assert.equal(applyEnumBreaks(stem), "甲、選擇外觀不佳的蔬果<br>乙、到吃到飽餐廳");
});

// ── 假陽性：不分行 ──

test("句中代號指稱（用甲、乙、丙三個容器）：標記互相緊鄰無內容→整題不斷", () => {
  const stem = "用甲、乙、丙三個平底直筒的容器測量雨量";
  assert.equal(applyEnumBreaks(stem), stem);
});

test("答案串（①甲乙丁②乙丙戊）：序數無定界符/括號→無標記、不斷", () => {
  const stem = "①甲乙丁②乙丙戊③甲丙戊④甲丙丁";
  assert.equal(applyEnumBreaks(stem), stem);
});

test("單一標記不足兩個：不斷", () => {
  assert.equal(applyEnumBreaks("甲.這只有一個標記而已"), "甲.這只有一個標記而已");
});

test("變數命名（甲數的8倍、甲袋稻米）：序數後接漢字非定界符→無標記、不斷", () => {
  assert.equal(applyEnumBreaks("甲數的8倍是832，甲數是多少？"), "甲數的8倍是832，甲數是多少？");
  assert.equal(applyEnumBreaks("甲袋稻米用掉後和乙袋一樣重"), "甲袋稻米用掉後和乙袋一樣重");
});

// ── 收尾與邊界 ──

test("與既有換行相鄰的 <br> 收合成一個", () => {
  // 模擬 fill：上游已在標記前留了一個 <br>，applyEnumBreaks 再插一個 → 收合
  assert.equal(applyEnumBreaks("句子<br>(甲)第一(乙)第二"), "句子<br>(甲)第一<br>(乙)第二");
});

test("非字串原樣回傳（不炸）", () => {
  assert.equal(applyEnumBreaks(null), null);
  assert.equal(applyEnumBreaks(undefined), undefined);
  assert.equal(applyEnumBreaks(42), 42);
});

test("含 regex 特殊字元的標記 (甲) / 甲. 用純字串處理、不炸", () => {
  // (、) 、. 在 RegExp 裡有特殊意義；插入用 slice 不用 RegExp，故安全
  assert.doesNotThrow(() => applyEnumBreaks("(甲)阿(乙)乙(丙)丙"));
});
