// 只用合成題；預期值由題目算術獨立推得（註解列出推算），不重述元件實作。
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../docs/study/math-interactions.js";

const M = globalThis.StudyMathInteractions;
const base = (type, unit, text, interaction) => ({ id: `math-g4s1-synthetic-${type.replace(/_/g, "")}-v1`, subject: "math", unit, type, text,
  subtopic: "合成", source: "synthetic", options: [], answer: "", interaction });
const play = (q, steps, state = M.initial(q)) => steps.reduce((s, [action, value]) => M.update(q, s, action, value), state);
const typeField = (q, state, field, text) => play(q, [["focus", String(field)], ["clearField"], ...Array.from(text).map(ch => ["key", ch])], state);
const answer = (q, texts) => texts.reduce((s, t, i) => typeField(q, s, i, t), M.initial(q));

// ---------- 安全算式 ----------
test("expression parser evaluates exact non-negative integers and rejects unsafe or ill-formed input", () => {
  const value = s => M.analyzeExpression(s)?.value ?? null;
  assert.equal(value("（12＋8）×3"), 60);   // 20×3
  assert.equal(value("12*3"), 36);
  assert.equal(value("12/3"), 4);
  assert.equal(value("12 − 3"), 9);
  assert.equal(value("2+3×4"), 14);           // 先乘後加
  assert.equal(value("(2+3)×4"), 20);
  assert.equal(value("20-6-4"), 10);          // 左結合：(20-6)-4
  assert.equal(value("48÷4÷2"), 6);           // (48÷4)÷2
  assert.equal(value("3+4=7"), 7);
  for (const bad of ["3+4=8", "1+", "()", "2÷0", "7÷2", "3-5", "alert(1)", "1e3", "constructor", "2^3", "08+1", "-3+5",
    "((((((1+1))))))", "1".repeat(10) + "+1", "1+".repeat(25) + "1", "1+2=3=3", "3+4=", "1,000+2", "", " ", null, 42])
    assert.equal(M.analyzeExpression(bad), null, String(bad));
  assert.equal(M.analyzeExpression("9999999×9999999"), null); // 約 1e14，超過 1e12 上限
  assert.equal(M.analyzeExpression("999999×999999").value, 999998000001); // (10^6-1)^2，未超過上限
  const src = readFileSync(new URL("../docs/study/math-interactions.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(|innerHTML|document\./);
});

// ---------- expression_steps ----------
const chain = () => base("expression_steps", 26, "90－(15＋25)＝（１）＝（２）", {
  blanks: [{ kind: "expression" }, { kind: "number" }],
  solutions: [[{ value: "50", expression: "90-40" }, { value: "50" }]] }); // 15+25=40, 90-40=50

test("chain blank needs the intermediate expression, not just the final value", () => {
  const q = chain(); M.validateQuestion(q);
  assert.equal(M.grade(q, answer(q, ["50", "50"])), false);
  assert.equal(M.grade(q, answer(q, ["90-40", "50"])), true);
  assert.equal(M.grade(q, answer(q, ["90-40=50", "50"])), true);
  assert.equal(M.grade(q, answer(q, ["90-40=60", "50"])), false);
  assert.equal(M.grade(q, answer(q, ["100-50", "50"])), false);          // 值同但不是這一步
  assert.equal(M.grade(q, answer(q, ["90-(15+25)", "50"])), false);      // 照抄原式沒有往下算
  assert.equal(M.grade(q, answer(q, ["90-40", "40"])), false);           // 中間步驟對、最後錯
  // 數字格只收數字鍵
  let s = typeField(q, M.initial(q), 1, "5+0");
  assert.equal(s.fields[1], "50");
});

const twoTraces = () => base("expression_steps", 26, "每盒有6顆紅球和2顆藍球，共5盒，一共有幾顆球？先算：（１）　再算：（２）　合併成一個算式：（３）", {
  blanks: [{ kind: "expression" }, { kind: "expression" }, { kind: "expression" }],
  solutions: [
    // 方法甲：一盒 6+2=8，5 盒 8×5=40
    [{ value: "8", expression: "6+2" }, { value: "40", expression: "8×5" }, { value: "40", expression: "(6+2)×5", acceptedExpressions: ["6×5+2×5"] }],
    // 方法乙：紅 6×5=30，再加藍 30+2×5=40
    [{ value: "30", expression: "6×5" }, { value: "40", expression: "30+2×5" }, { value: "40", expression: "(6+2)×5", acceptedExpressions: ["6×5+2×5"] }]] });

test("each complete trace passes, mixed traces fail, and distributive forms come only from acceptedExpressions", () => {
  const q = twoTraces(); M.validateQuestion(q);
  assert.equal(M.grade(q, answer(q, ["6+2", "8×5", "(6+2)×5"])), true);
  assert.equal(M.grade(q, answer(q, ["2+6=8", "5×8=40", "5×(2+6)"])), true);   // 交換律
  assert.equal(M.grade(q, answer(q, ["6×5", "30+2×5", "6×5+2×5"])), true);
  assert.equal(M.grade(q, answer(q, ["6×5", "2×5+30", "5×2+5×6"])), true);     // 分配律交換排列
  assert.equal(M.grade(q, answer(q, ["6+2", "30+2×5", "(6+2)×5"])), false);     // 甲的第一步配乙的第二步
  assert.equal(M.grade(q, answer(q, ["6+2", "8×5", "8×5"])), false);           // 合併格不能只寫最後一步
  assert.equal(M.grade(q, answer(q, ["6+2", "8×5", "6+2×5"])), false);         // 16 ≠ 40
  assert.equal(M.grade(q, answer(q, ["6+2", "8×5", "40"])), false);            // 算式格不收只有數字
  assert.equal(M.grade(q, answer(q, ["6+2", "8×5", "2×20"])), false);          // 值對但數字不是題目的
});

const paren = () => base("expression_steps", 26, "80張貼紙平分給4人，每人再多拿5張，每人有幾張？合併成一個有括號的算式：（１）", {
  blanks: [{ kind: "expression", requiresParentheses: true }],
  solutions: [[{ value: "25", expression: "(80÷4)+5" }]] }); // 80÷4=20, 20+5=25

test("required parentheses must group an operation inside a larger expression", () => {
  const q = paren(); M.validateQuestion(q);
  for (const ok of ["(80÷4)+5", "5+(80÷4)", "((80÷4))+5", "(80÷4)+5=25"]) assert.equal(M.grade(q, answer(q, [ok])), true, ok);
  for (const no of ["80÷4+5", "(80÷4+5)", "(80)÷4+5", "(80÷4)+5=26", "(80÷(4))+5"]) {
    const expected = no === "(80÷(4))+5"; // 外層括號群組了 80÷4 → 合法
    assert.equal(M.grade(q, answer(q, [no])), expected, no);
  }
});

test("a blank whose operation is already printed accepts a plain number", () => {
  const q = base("expression_steps", 26, "300－12×10＝300－（１）＝（２）", { blanks: [{ kind: "number" }, { kind: "number" }],
    solutions: [[{ value: "120" }, { value: "180" }]] }); // 12×10=120, 300-120=180
  M.validateQuestion(q);
  assert.equal(M.grade(q, answer(q, ["120", "180"])), true);
  assert.equal(M.grade(q, answer(q, ["120", "18"])), false);
  assert.equal(M.complete(q, answer(q, ["120", ""])), false);
});

test("expression_steps schema guards type, unit, markers, value-only expressions and duplicates", () => {
  const ok = twoTraces();
  const bad = [q => { q.unit = 25; }, q => { q.unit = 29; }, q => { q.subject = "science"; }, q => { q.extra = 1; }, q => { q.answer = "40"; },
    q => { q.options = ["1"]; }, q => { q.interaction.solutions[0][2].expression = "40"; }, q => { q.interaction.solutions[0][0].value = "9"; },
    q => { q.interaction.blanks[2].requiresParentheses = true; q.interaction.solutions[0][2].acceptedExpressions = ["6×5+2×5"]; },
    q => { q.text = q.text.replace("（３）", ""); }, q => { q.text += "（４）"; }, q => { q.interaction.solutions[1] = structuredClone(q.interaction.solutions[0]); },
    q => { q.interaction.solutions[0][2].acceptedExpressions = ["5×(6+2)"]; }, q => { q.interaction.solutions[0][0].operands = [6, 2]; },
    q => { q.interaction.blanks[0].kind = "step"; }, q => { q.interaction.blanks[0].requiresParentheses = false; },
    q => { q.interaction.solutions[0][0].expression = "6+2=8"; }, q => { delete q.interaction.solutions; }];
  for (const mutate of bad) { const q = structuredClone(ok); mutate(q); assert.throws(() => M.validateQuestion(q), mutate.toString()); }
  // requiresParentheses=true 需要每個參考算式都含括號群組
  const q = structuredClone(ok); q.interaction.blanks[2].requiresParentheses = true; delete q.interaction.solutions[0][2].acceptedExpressions; delete q.interaction.solutions[1][2].acceptedExpressions;
  assert.equal(M.validateQuestion(q), true);
});

// ---------- vertical_decimal ----------
const sub = () => base("vertical_decimal", 25, "用直式計算：60－2.35＝", { op: "-", operands: ["60", "2.35"], result: "57.65" }); // 60.00-2.35=57.65
const add = () => base("vertical_decimal", 25, "用直式計算：4.5＋12.38＝", { op: "+", operands: ["4.5", "12.38"], result: "16.88" }); // 4.50+12.38=16.88
// 在 row 從 col 開始依序按鍵（"." 是小數點鍵）
const write = (q, s, row, col, keys) => play(q, [["focus", `${row}:${col}`], ...Array.from(keys).map(k => ["key", k])], s);
const lay = (q, rows) => rows.reduce((s, [r, c, keys]) => write(q, s, r, c, keys), M.initial(q));

test("vertical answer needs both operands written by the child with decimal points aligned", () => {
  const q = sub(); M.validateQuestion(q);
  assert.equal(M.initial(q).rows.every(row => row.cells.every(ch => ch === "")), true); // 不預填運算元
  const cols = M.initial(q).rows[0].cells.length;
  assert.ok(cols >= 6);
  // 60 的個位在第 2 格（index 2）；2.35 的 2 也在 index 2；57.65 的 7 在 index 2
  const aligned = [[0, 1, "60"], [1, 2, "2.35"], [2, 1, "57.65"]];
  assert.equal(M.grade(q, lay(q, aligned)), true);
  assert.equal(M.grade(q, lay(q, [[0, 0, "60"], [1, 1, "2.35"], [2, 0, "57.65"]])), true);   // 整體左移一格
  assert.equal(M.grade(q, lay(q, [[0, 0, "60"], [1, 0, "2.35"], [2, 0, "57.65"]])), false);  // 靠左對齊：位值錯
  assert.equal(M.grade(q, lay(q, [[0, 2, "60"], [1, 0, "2.35"], [2, 0, "57.65"]])), false);  // 靠右對齊，答案數字對
  assert.equal(M.grade(q, lay(q, [[0, 1, "60"], [1, 2, "2.35"], [2, 0, "57.65"]])), false);  // 答案數值對但沒對齊
  assert.equal(M.grade(q, lay(q, [[0, 1, "60"], [1, 2, "2.35"], [2, 1, "57.75"]])), false);  // 計算錯
  assert.equal(M.grade(q, lay(q, [[0, 2, "2.35"], [1, 1, "60"], [2, 1, "57.65"]])), false);  // 減法上下顛倒
  assert.equal(M.grade(q, lay(q, [[0, 1, "60."], [1, 2, "2.35"], [2, 1, "57.65"]])), false); // 小數點後沒有數字
  assert.equal(M.grade(q, lay(q, [[0, 0, "060"], [1, 2, "2.35"], [2, 1, "57.65"]])), false); // 多餘的前導 0
  assert.equal(M.grade(q, lay(q, [[0, 1, "60.00"], [1, 2, "2.35"], [2, 1, "57.65"]])), true); // 自己補 0
});

test("pad zeros is explicit, keeps values, and does not repair misalignment", () => {
  const q = sub();
  let s = lay(q, [[0, 1, "60."], [1, 2, "2.35"], [2, 1, "57.65"]]);
  s = M.update(q, s, "pad");
  assert.deepEqual(s.rows[0].cells.slice(1, 5), ["6", "0", "0", "0"]);
  assert.equal(M.grade(q, s), true);
  let w = lay(q, [[0, 0, "60."], [1, 2, "2.35"], [2, 1, "57.65"]]); // 60. 左偏一格
  w = M.update(q, w, "pad");
  assert.equal(M.grade(q, w), false);
  let n = lay(q, [[0, 1, "60"], [1, 2, "2.35"], [2, 1, "57.65"]]);
  assert.deepEqual(M.update(q, n, "pad").rows[0], n.rows[0]); // 沒有小數點的整數列不補，避免 60 變 6000
});

test("addition accepts either operand on top and editing keys repair a wrong layout", () => {
  const q = add(); M.validateQuestion(q);
  assert.equal(M.grade(q, lay(q, [[0, 2, "4.5"], [1, 1, "12.38"], [2, 1, "16.88"]])), true);
  assert.equal(M.grade(q, lay(q, [[0, 1, "12.38"], [1, 2, "4.5"], [2, 1, "16.88"]])), true);
  assert.equal(M.grade(q, lay(q, [[0, 2, "4.5"], [1, 2, "12.38"], [2, 1, "16.88"]])), false);
  let s = lay(q, [[0, 2, "4.5"], [1, 2, "12.38"], [2, 1, "16.88"]]);
  s = M.update(q, s, "clearRow", "1"); s = write(q, s, 1, 1, "12.38");
  assert.equal(M.grade(q, s), true);
  s = play(q, [["focus", "2:5"], ["back"], ["key", "9"]], s); // 改成 16.89
  assert.equal(M.grade(q, s), false);
  s = play(q, [["back"], ["key", "8"]], s);
  assert.equal(M.grade(q, s), true);
  assert.deepEqual(M.update(q, s, "clear"), M.initial(q));
});

test("vertical schema guards", () => {
  const ok = sub();
  for (const mutate of [q => { q.unit = 26; }, q => { q.interaction.op = "×"; }, q => { q.interaction.result = "57.6"; },
    q => { q.interaction.operands = ["2.35", "60"]; q.interaction.result = "57.65"; }, q => { q.interaction.operands[0] = "060"; },
    q => { q.interaction.operands[0] = "60.001"; }, q => { q.interaction.operands.push("1"); }, q => { q.interaction.columns = 8; },
    q => { q.interaction.operands[0] = "60."; }]) {
    const q = structuredClone(ok); mutate(q); assert.throws(() => M.validateQuestion(q), mutate.toString());
  }
});

// ---------- fraction_shade ----------
const gridShade = () => base("fraction_shade", 27, "請依分數畫上斜線：11/8", { shape: "grid", wholes: 2, partsPerWhole: 8, grid: { rows: 2, cols: 4 }, target: { numerator: 11, denominator: 8 } });
const circleShade = () => base("fraction_shade", 27, "13/5 換成帶分數並畫畫看：13/5＝（１）", { shape: "circle", wholes: 3, partsPerWhole: 5, target: { numerator: 13, denominator: 5 }, companion: { form: "mixed" } });

test("fraction shading grades the total count of any parts and supports undo and redraw", () => {
  const q = gridShade(); M.validateQuestion(q);
  assert.doesNotMatch(M.render(q, M.initial(q)), /is-on/);
  const pick = list => play(q, list.map(k => ["toggle", String(k)]));
  assert.equal(M.grade(q, pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])), false);                // 10/8
  assert.equal(M.grade(q, pick([15, 0, 9, 3, 12, 7, 1, 10, 14, 6, 2])), true);         // 任選 11 份
  let s = pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);                                   // 12/8
  assert.equal(M.grade(q, s), false);
  s = M.update(q, s, "toggle", "11");
  assert.equal(M.grade(q, s), true);
  s = M.update(q, s, "clearShade");
  assert.deepEqual(s.selected, []);
  assert.equal(M.update(q, s, "toggle", "16").selected.length, 0); // 超出 2×8
});

test("companion mixed number accepts equivalent fractions and preserves the required form", () => {
  const q = circleShade(); M.validateQuestion(q);
  const shaded = play(q, Array.from({ length: 13 }, (_, k) => ["toggle", String(k + 1)]));
  const fill = (w, n, d) => play(q, [["focus", "w"], ...Array.from(w).map(k => ["key", k]), ["focus", "n"], ...Array.from(n).map(k => ["key", k]), ["focus", "d"], ...Array.from(d).map(k => ["key", k])], shaded);
  assert.equal(M.grade(q, fill("2", "3", "5")), true);     // 13=2×5+3
  assert.equal(M.complete(q, fill("", "13", "5")), false);  // 帶分數要有整數
  assert.equal(M.grade(q, fill("1", "8", "5")), false);     // 分子不可大於分母
  assert.equal(M.grade(q, fill("2", "6", "10")), true);     // 同值同形式可換分母
  assert.equal(M.grade(q, fill("2", "4", "5")), false);
  const fewer = M.update(q, fill("2", "3", "5"), "toggle", "1");
  assert.equal(M.grade(q, fewer), false);                   // 填空對、畫斜線少一份
  assert.match(M.render(q, M.initial(q)), /<path[^>]+data-math-action="toggle"/);
});

test("fraction schema keeps shape parameters and companion contract strict", () => {
  for (const [ok, mutate] of [[gridShade, q => { q.interaction.grid.cols = 3; }], [gridShade, q => { q.interaction.target.denominator = 4; }],
    [gridShade, q => { q.interaction.target.numerator = 17; }], [gridShade, q => { delete q.interaction.grid; }], [gridShade, q => { q.text += "（１）"; }],
    [gridShade, q => { q.interaction.target.numerator = 1.5; }], [circleShade, q => { q.interaction.grid = { rows: 1, cols: 5 }; }],
    [circleShade, q => { q.interaction.target.numerator = 10; }], [circleShade, q => { q.text = q.text.replace("（１）", ""); }],
    [circleShade, q => { q.interaction.companion.form = "decimal"; }], [circleShade, q => { q.unit = 25; }]]) {
    const q = ok(); mutate(q); assert.throws(() => M.validateQuestion(q), mutate.toString());
  }
});

// ---------- hundred_grid_select ----------
const grid100 = () => base("hundred_grid_select", 25, "請圈出3.06張百格板。", { pieces: { boards: 4, rods: 5, units: 7 }, target: "3.06" });

test("hundred-grid selection grades exact hundredths and can be corrected or reset", () => {
  const q = grid100(); M.validateQuestion(q);
  const pick = list => play(q, list.map(v => ["toggle", v]));
  // 3.06 = 3 張百格板(300) + 6 小格(6)
  const right = pick(["boards:0", "boards:2", "boards:3", ...[0, 1, 2, 3, 4, 6].map(i => `units:${i}`)]);
  assert.equal(M.grade(q, right), true);
  let wrong = pick(["boards:0", "boards:1", "boards:2", "rods:0", ...[0, 1, 2, 3, 4, 5].map(i => `units:${i}`)]); // 3.16
  assert.equal(M.grade(q, wrong), false);
  wrong = M.update(q, wrong, "toggle", "rods:0");
  assert.equal(M.grade(q, wrong), true);
  assert.equal(M.grade(q, pick(["boards:0", "boards:1", "boards:2", "rods:0", "rods:1", "rods:2", "rods:3", "rods:4"])), false); // 3.50
  assert.deepEqual(M.update(q, right, "clear"), M.initial(q));
  assert.equal(M.update(q, M.initial(q), "toggle", "boards:4").boards.length, 0);
});

test("hundred-grid schema requires a reachable decimal target", () => {
  for (const mutate of [q => { q.interaction.target = "4.08"; }, q => { q.interaction.target = 3.06; }, q => { q.interaction.target = "0"; },
    q => { q.interaction.target = "3.006"; }, q => { q.interaction.pieces.boards = 11; }, q => { q.interaction.pieces.extra = 1; }, q => { q.unit = 27; }]) {
    const q = grid100(); mutate(q); assert.throws(() => M.validateQuestion(q), mutate.toString());
  }
  const q = grid100(); q.interaction.target = "3.57"; assert.equal(M.validateQuestion(q), true); // 300+5×10+7（3.6 需要 6 條，只有 5 條→不可達）
  const q6 = grid100(); q6.interaction.target = "3.6"; assert.throws(() => M.validateQuestion(q6));
});

// ---------- 共通 ----------
const all = () => [chain(), twoTraces(), paren(), sub(), add(), gridShade(), circleShade(), grid100()];

test("answerText and answerState come from the same contract and the answer state passes grading", () => {
  for (const q of all()) {
    assert.equal(M.grade(q, M.answerState(q)), true, q.type);
    assert.ok(M.answerText(q).length > 0);
  }
  assert.match(M.answerText(sub()), /57\.65/);
  assert.match(M.answerText(circleShade()), /2又3\/5/);
  assert.match(M.answerText(grid100()), /3 張百格板、6 個小格/);
  assert.match(M.answerText(twoTraces()), /其他完整算法/);
});

test("state survives JSON reload, garbage state is sanitized, and render escapes text", () => {
  for (const q of all()) {
    const s = M.answerState(q), reloaded = JSON.parse(JSON.stringify(s));
    assert.equal(M.grade(q, reloaded), true);
    for (const junk of [null, 7, "x", [], { fields: [{}], rows: "x", selected: [-1, 1e9, "2"], boards: [99], __proto__: { polluted: 1 } }]) {
      assert.equal(M.grade(q, junk), false);
      assert.doesNotThrow(() => M.render(q, junk));
    }
    assert.equal(({}).polluted, undefined);
    const html = M.render({ ...q, text: q.text + "<img src=x onerror=alert(1)>" }, M.initial(q), true);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;img/);
    const locked = M.render(q, M.answerState(q), true);
    assert.ok((locked.match(/<button\b[^>]*>/g) || []).every(tag => / disabled\b/.test(tag)));
    assert.doesNotMatch(locked, /<path[^>]*data-math-action/);
    assert.deepEqual(M.read(q, null, s), s);
  }
});

test("semantic fingerprint follows grading content only", () => {
  const a = twoTraces(), b = twoTraces();
  b.interaction = { solutions: b.interaction.solutions, blanks: b.interaction.blanks };
  assert.equal(M.semantic(a), M.semantic(b));
  b.interaction.solutions[0][2].acceptedExpressions = ["2×5+6×5"]; // 同一分配律的別種寫法也算改動
  assert.notEqual(M.semantic(a), M.semantic(b));
  const v = sub(); v.interaction.operands[0] = "60.00"; v.interaction.result = "57.65";
  assert.notEqual(M.semantic(sub()), M.semantic(v));
  assert.deepEqual(M.TYPES, ["expression_steps", "vertical_decimal", "fraction_shade", "hundred_grid_select"]);
});


test("companion accepts a reduced improper fraction and rejects a changed value", () => {
  const q = gridShade(); q.text += "（１）";
  q.interaction.target.numerator = 12; q.interaction.companion = { form: "improper" };
  M.validateQuestion(q);
  const state = { selected: Array.from({ length: 12 }, (_, i) => i), companion: { w: "", n: "", d: "" }, active: "n" };
  state.companion = { w: "", n: "3", d: "2" }; assert.equal(M.grade(q, state), true);
  state.companion = { w: "", n: "6", d: "4" }; assert.equal(M.grade(q, state), true);
  state.companion = { w: "", n: "4", d: "3" }; assert.equal(M.grade(q, state), false);
  state.companion = { w: "", n: "3", d: "0" }; assert.equal(M.grade(q, state), false);
});
