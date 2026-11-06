/* 四上數學 U7–U9 最小操作元件：只負責題型契約、畫面字串、狀態轉移與評分。
   不寫進度、不發獎勵；契約說明見 docs-dev/study-math-interactions.md。 */
(function(root) {
  "use strict";
  const TYPES = ["expression_steps", "vertical_decimal", "fraction_shade", "hundred_grid_select"];
  const TYPE_UNITS = { expression_steps: [26], vertical_decimal: [25], fraction_shade: [27], hundred_grid_select: [25] };
  const COMMON = ["id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer", "interaction"];
  const FW = "０１２３４５６７８９";
  const LIMIT = { exprChars: 40, tokens: 31, depth: 4, value: 1e12, numberDigits: 9 };

  const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
  const int = (x, lo, hi) => Number.isSafeInteger(x) && x >= lo && x <= hi;
  const str = (x, limit) => typeof x === "string" && x.trim().length > 0 && Array.from(x).length <= limit;
  const keys = (value, required, optional = []) => object(value) &&
    required.every(k => Object.hasOwn(value, k)) && Object.keys(value).every(k => required.includes(k) || optional.includes(k));
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const fail = message => { throw new Error(message); };
  const marker = k => `（${String(k).split("").map(d => FW[Number(d)]).join("")}）`;
  const markers = text => (text.match(/（[０-９]+）/g) || []);

  // ---------- 安全算式（不使用 eval/Function） ----------
  function normalizeExpression(raw) {
    if (typeof raw !== "string") return null;
    const s = raw.normalize("NFKC").replace(/[−–—]/g, "-").replace(/[*xX]/g, "×").replace(/\//g, "÷").replace(/\s+/g, "");
    return s.length && Array.from(s).length <= LIMIT.exprChars && /^[0-9+\-×÷()=]+$/.test(s) ? s : null;
  }
  function tokenize(s) {
    const tokens = [];
    for (let i = 0; i < s.length;) {
      const m = /^[0-9]+/.exec(s.slice(i));
      if (m) {
        if (m[0].length > LIMIT.numberDigits || (m[0].length > 1 && m[0][0] === "0")) return null;
        tokens.push({ n: Number(m[0]) }); i += m[0].length;
      } else { tokens.push({ t: s[i] }); i++; }
    }
    return tokens.length <= LIMIT.tokens ? tokens : null;
  }
  // grammar: expr := term (("+"|"-") term)* ; term := factor (("×"|"÷") factor)* ; factor := NUMBER | "(" expr ")"
  function parseTokens(tokens) {
    let i = 0, groups = [];
    const peek = () => tokens[i], take = () => tokens[i++];
    function factor(depth) {
      const tok = take();
      if (!tok) throw 0;
      if (Object.hasOwn(tok, "n")) return { n: tok.n };
      if (tok.t !== "(" || depth >= LIMIT.depth) throw 0;
      const node = expr(depth + 1);
      if (!peek() || peek().t !== ")") throw 0;
      take(); groups.push(node); return node;
    }
    function term(depth) {
      let node = factor(depth);
      while (peek() && (peek().t === "×" || peek().t === "÷")) node = { op: take().t, a: node, b: factor(depth) };
      return node;
    }
    function expr(depth) {
      let node = term(depth);
      while (peek() && (peek().t === "+" || peek().t === "-")) node = { op: take().t, a: node, b: term(depth) };
      return node;
    }
    try { const root = expr(0); return i === tokens.length ? { root, groups } : null; } catch { return null; }
  }
  function evaluate(node) {
    if (Object.hasOwn(node, "n")) return node.n;
    const a = evaluate(node.a), b = evaluate(node.b);
    if (a === null || b === null) return null;
    let v;
    if (node.op === "+") v = a + b;
    else if (node.op === "-") v = a - b;
    else if (node.op === "×") v = a * b;
    else { if (b === 0 || a % b !== 0) return null; v = a / b; }
    return v < 0 || v > LIMIT.value ? null : v;
  }
  const literals = node => Object.hasOwn(node, "n") ? [node.n] : [...literals(node.a), ...literals(node.b)];
  function canonical(node) {
    if (Object.hasOwn(node, "n")) return String(node.n);
    if (node.op === "+" || node.op === "×") {
      const flat = [], walk = x => { if (x.op === node.op) { walk(x.a); walk(x.b); } else flat.push(canonical(x)); };
      walk(node); return `${node.op}[${flat.sort().join(",")}]`;
    }
    return `${node.op}(${canonical(node.a)},${canonical(node.b)})`;
  }
  /* 回傳 null（不合法）或 {value, literals, canonical, hasOperator, properGroup, claimed}；
     claimed＝「=結果」右側整數，未寫則 null。 */
  function analyzeExpression(raw, allowEquals = true) {
    const s = normalizeExpression(raw);
    if (!s) return null;
    const sides = s.split("=");
    if (sides.length > 2 || (sides.length === 2 && !allowEquals)) return null;
    let claimed = null;
    if (sides.length === 2) {
      if (!/^(0|[1-9][0-9]{0,8})$/.test(sides[1])) return null;
      claimed = Number(sides[1]);
    }
    const tokens = tokenize(sides[0]);
    const parsed = tokens && parseTokens(tokens);
    if (!parsed) return null;
    const value = evaluate(parsed.root);
    if (value === null || (claimed !== null && claimed !== value)) return null;
    const hasOperator = Object.hasOwn(parsed.root, "op");
    const properGroup = parsed.groups.some(g => Object.hasOwn(g, "op") && g !== parsed.root);
    return { value, literals: literals(parsed.root).sort((x, y) => x - y), canonical: canonical(parsed.root), hasOperator, properGroup, claimed };
  }
  const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  // ---------- 十進位（以 1/100 為單位的整數） ----------
  const DEC_RE = /^(0|[1-9][0-9]{0,3})(\.[0-9]{1,2})?$/;
  const hundredths = s => { const [i, f = ""] = s.split("."); return Number(i) * 100 + Number((f + "00").slice(0, 2)); };
  const fmtHundredths = v => { const i = Math.floor(v / 100), f = v % 100; return f ? `${i}.${String(f).padStart(2, "0").replace(/0$/, "")}` : String(i); };
  const decParts = s => { const [i, f = ""] = s.split("."); return { int: i.length, frac: f.length }; };
  function verticalColumns(it) {
    const all = [...it.operands, it.result].map(decParts);
    return Math.max(...all.map(p => p.int)) + Math.max(...all.map(p => p.frac)) + 2;
  }

  // ---------- validate ----------
  function validateQuestion(q) {
    if (!object(q) || !keys(q, COMMON, ["material"])) fail("數學操作題欄位不符。");
    if (q.subject !== "math" || !TYPES.includes(q.type) || !TYPE_UNITS[q.type].includes(q.unit)) fail("數學操作題科目、題型或單元不符。");
    if (!str(q.id, 120) || !str(q.subtopic, 60) || !str(q.source, 300) || !str(q.text, 600)) fail("數學操作題文字欄位無效。");
    if (!Array.isArray(q.options) || q.options.length || q.answer !== "") fail("數學操作題需空 options 與空 answer。");
    if (Object.hasOwn(q, "material") && !object(q.material)) fail("數學操作題媒體格式無效。");
    const it = q.interaction;
    if (q.type === "expression_steps") validateExpression(q, it);
    else if (q.type === "vertical_decimal") validateVertical(it);
    else if (q.type === "fraction_shade") validateShade(q, it);
    else validateBase10(it);
    return true;
  }
  function validateExpression(q, it) {
    if (!keys(it, ["blanks", "solutions"]) || !Array.isArray(it.blanks) || it.blanks.length < 1 || it.blanks.length > 6) fail("算式題空格格式無效。");
    const n = it.blanks.length;
    for (const b of it.blanks) {
      if (!object(b) || !["number", "expression"].includes(b.kind)) fail("算式題空格種類無效。");
      if (b.kind === "number" ? !keys(b, ["kind"]) : !keys(b, ["kind"], ["requiresParentheses"]) || (Object.hasOwn(b, "requiresParentheses") && b.requiresParentheses !== true)) fail("算式題空格欄位無效。");
    }
    if (!sameList(markers(q.text), it.blanks.map((_, i) => marker(i + 1)))) fail("算式題需依序含（１）到最後一格的全形標記。");
    if (!Array.isArray(it.solutions) || it.solutions.length < 1 || it.solutions.length > 4) fail("算式題需 1–4 組完整解法。");
    const seen = new Set();
    for (const sol of it.solutions) {
      if (!Array.isArray(sol) || sol.length !== n) fail("每組解法需逐格對應空格。");
      sol.forEach((cell, i) => {
        if (!object(cell) || typeof cell.value !== "string" || !/^(0|[1-9][0-9]{0,8})$/.test(cell.value)) fail("算式題格值需為非負整數字串。");
        const blank = it.blanks[i];
        if (blank.kind === "number") { if (!keys(cell, ["value"])) fail("數字格只含 value。"); return; }
        if (!keys(cell, ["value", "expression"], ["acceptedExpressions"])) fail("算式格欄位無效。");
        const forms = [cell.expression];
        if (Object.hasOwn(cell, "acceptedExpressions")) {
          if (!Array.isArray(cell.acceptedExpressions) || cell.acceptedExpressions.length < 1 || cell.acceptedExpressions.length > 6) fail("acceptedExpressions 需 1–6 個。");
          forms.push(...cell.acceptedExpressions);
        }
        const canon = new Set();
        for (const form of forms) {
          const a = analyzeExpression(form, false);
          if (!a || !a.hasOperator || a.value !== Number(cell.value) || (blank.requiresParentheses && !a.properGroup) || canon.has(a.canonical)) fail("算式格的參考算式無效、與值不符或重複。");
          canon.add(a.canonical);
        }
      });
      const key = JSON.stringify(sol.map(c => [c.value, c.expression ? analyzeExpression(c.expression, false).canonical : null]));
      if (seen.has(key)) fail("解法重複。");
      seen.add(key);
    }
  }
  function validateVertical(it) {
    if (!keys(it, ["op", "operands", "result"]) || !["+", "-"].includes(it.op) || !Array.isArray(it.operands) || it.operands.length !== 2) fail("直式題欄位無效。");
    if (![...it.operands, it.result].every(x => typeof x === "string" && DEC_RE.test(x))) fail("直式數字需為最多四位整數、兩位小數的十進位字串。");
    const [a, b] = it.operands.map(hundredths), r = hundredths(it.result);
    if ((it.op === "+" ? a + b : a - b) !== r || r < 0) fail("直式結果與運算不符。");
    if (verticalColumns(it) > 10) fail("直式格數超過 10。");
  }
  function validateShade(q, it) {
    const grid = it && it.shape === "grid";
    if (!keys(it, ["shape", "wholes", "partsPerWhole", "target", ...(grid ? ["grid"] : [])], ["companion"]) || !["grid", "circle"].includes(it.shape)) fail("分數塗色欄位無效。");
    if (!int(it.wholes, 1, 6) || !int(it.partsPerWhole, 2, 12)) fail("分數塗色的整體數或等分數無效。");
    if (grid && (!keys(it.grid, ["rows", "cols"]) || !int(it.grid.rows, 1, 6) || !int(it.grid.cols, 1, 6) || it.grid.rows * it.grid.cols !== it.partsPerWhole)) fail("方格形狀需 rows×cols＝等分數。");
    const t = it.target;
    if (!keys(t, ["numerator", "denominator"]) || t.denominator !== it.partsPerWhole || !int(t.numerator, 1, it.wholes * it.partsPerWhole)) fail("分數目標無效。");
    if (Object.hasOwn(it, "companion")) {
      const c = it.companion;
      if (!keys(c, ["form"]) || !["mixed", "improper"].includes(c.form)) fail("分數填空形式無效。");
      if (c.form === "mixed" && (t.numerator <= t.denominator || t.numerator % t.denominator === 0)) fail("帶分數填空需目標為非整數的假分數。");
      if (c.form === "improper" && t.numerator < t.denominator) fail("假分數填空需分子不小於分母。");
    }
    if (!sameList(markers(q.text), Object.hasOwn(it, "companion") ? [marker(1)] : [])) fail("分數塗色只有分數填空時才可含（１）標記。");
  }
  function validateBase10(it) {
    if (!keys(it, ["pieces", "target"]) || !keys(it.pieces, ["boards", "rods", "units"])) fail("百格板題欄位無效。");
    const p = it.pieces;
    if (!int(p.boards, 0, 10) || !int(p.rods, 0, 20) || !int(p.units, 0, 20) || p.boards + p.rods + p.units === 0) fail("百格板數量無效。");
    if (typeof it.target !== "string" || !/^(0|[1-9][0-9]?)(\.[0-9]{1,2})?$/.test(it.target)) fail("百格板目標需為十進位字串。");
    const t = hundredths(it.target);
    if (t <= 0 || !decompositions(p, t).length) fail("百格板目標無法用題目給的板、條、格湊出。");
  }
  function decompositions(p, t) {
    const out = [];
    for (let b = Math.min(p.boards, Math.floor(t / 100)); b >= 0; b--)
      for (let r = Math.min(p.rods, Math.floor((t - 100 * b) / 10)); r >= 0; r--) {
        const u = t - 100 * b - 10 * r;
        if (u <= p.units) out.push({ boards: b, rods: r, units: u });
      }
    return out;
  }

  // ---------- state ----------
  const intList = (raw, max) => Array.isArray(raw) ? [...new Set(raw.filter(x => Number.isSafeInteger(x) && x >= 0 && x < max))].sort((a, b) => a - b) : [];
  function initial(q) {
    const it = q.interaction;
    if (q.type === "expression_steps") return { fields: it.blanks.map(() => ""), active: 0 };
    if (q.type === "vertical_decimal") {
      const c = verticalColumns(it);
      return { rows: [0, 1, 2].map(() => ({ cells: Array(c).fill(""), point: null })), active: [0, 0] };
    }
    if (q.type === "fraction_shade") return it.companion ? { selected: [], companion: { w: "", n: "", d: "" }, active: it.companion.form === "mixed" ? "w" : "n" } : { selected: [] };
    return { boards: [], rods: [], units: [] };
  }
  function sanitize(q, raw) {
    const base = initial(q), it = q.interaction;
    if (!object(raw)) return base;
    if (q.type === "expression_steps") {
      const fields = base.fields.map((_, i) => {
        const v = Array.isArray(raw.fields) && typeof raw.fields[i] === "string" ? raw.fields[i] : "";
        return Array.from(v).slice(0, LIMIT.exprChars).filter(ch => it.blanks[i].kind === "number" ? /[0-9]/.test(ch) : /[0-9+\-×÷()=]/.test(ch)).join("");
      });
      return { fields, active: int(raw.active, 0, fields.length - 1) ? raw.active : 0 };
    }
    if (q.type === "vertical_decimal") {
      const c = base.rows[0].cells.length;
      const rows = base.rows.map((_, r) => {
        const row = Array.isArray(raw.rows) && object(raw.rows[r]) ? raw.rows[r] : {};
        const cells = Array.from({ length: c }, (_, i) => Array.isArray(row.cells) && /^[0-9]$/.test(row.cells[i]) ? row.cells[i] : "");
        return { cells, point: int(row.point, 0, c - 1) && cells[row.point] !== "" ? row.point : null };
      });
      const a = Array.isArray(raw.active) && int(raw.active[0], 0, 2) && int(raw.active[1], 0, c - 1) ? [raw.active[0], raw.active[1]] : [0, 0];
      return { rows, active: a };
    }
    if (q.type === "fraction_shade") {
      const out = { selected: intList(raw.selected, it.wholes * it.partsPerWhole) };
      if (it.companion) {
        const c = object(raw.companion) ? raw.companion : {};
        out.companion = Object.fromEntries(["w", "n", "d"].map(k => [k, typeof c[k] === "string" && /^[0-9]{0,3}$/.test(c[k]) ? c[k] : ""]));
        if (it.companion.form === "improper") out.companion.w = "";
        out.active = (it.companion.form === "mixed" ? ["w", "n", "d"] : ["n", "d"]).includes(raw.active) ? raw.active : base.active;
      }
      return out;
    }
    const p = it.pieces;
    return { boards: intList(raw.boards, p.boards), rods: intList(raw.rods, p.rods), units: intList(raw.units, p.units) };
  }

  // ---------- update ----------
  const EXPR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "+", "-", "×", "÷", "(", ")", "="];
  function update(q, state, action, payload) {
    const s = sanitize(q, state), it = q.interaction, value = payload === undefined || payload === null ? "" : String(payload);
    if (action === "clear") return initial(q);
    if (q.type === "expression_steps") {
      const i = s.active;
      if (action === "focus" && int(Number(value), 0, s.fields.length - 1) && /^[0-9]+$/.test(value)) s.active = Number(value);
      else if (action === "key" && EXPR_KEYS.includes(value) && (it.blanks[i].kind === "expression" || /[0-9]/.test(value)) &&
        Array.from(s.fields[i]).length < (it.blanks[i].kind === "number" ? LIMIT.numberDigits : LIMIT.exprChars)) s.fields[i] += value;
      else if (action === "back") s.fields[i] = Array.from(s.fields[i]).slice(0, -1).join("");
      else if (action === "clearField") s.fields[i] = "";
      return s;
    }
    if (q.type === "vertical_decimal") {
      const c = s.rows[0].cells.length, [r, col] = s.active, row = s.rows[r];
      if (action === "focus") {
        const m = /^([0-2]):([0-9])$/.exec(value);
        if (m && Number(m[2]) < c) s.active = [Number(m[1]), Number(m[2])];
      } else if (action === "key" && /^[0-9]$/.test(value)) {
        row.cells[col] = value;
        if (col + 1 < c) s.active = [r, col + 1];
      } else if (action === "key" && value === ".") {
        const at = row.cells[col] !== "" ? col : col - 1;
        if (at >= 0 && row.cells[at] !== "") row.point = row.point === at ? null : at;
      } else if (action === "back") {
        if (row.cells[col] !== "") { row.cells[col] = ""; if (row.point === col) row.point = null; }
        else if (col > 0) {
          if (row.point === col - 1) row.point = null;
          else { row.cells[col - 1] = ""; }
          s.active = [r, col - 1];
        }
      } else if (action === "clearRow" && /^[0-2]$/.test(value)) {
        s.rows[Number(value)] = { cells: Array(c).fill(""), point: null };
        s.active = [Number(value), 0];
      } else if (action === "pad") {
        // 只在已寫小數點的運算元列，於最後一位數字之後補 0 到兩運算元最右邊；不移動任何數字。
        const last = row => row.cells.reduce((m, ch, i) => ch !== "" ? i : m, -1);
        const right = Math.max(last(s.rows[0]), last(s.rows[1]));
        for (const target of [s.rows[0], s.rows[1]]) {
          const end = last(target);
          if (target.point === null || end < 0) continue;
          for (let i = end + 1; i <= right; i++) target.cells[i] = "0";
        }
      }
      return s;
    }
    if (q.type === "fraction_shade") {
      const total = it.wholes * it.partsPerWhole;
      if (action === "toggle" && /^[0-9]+$/.test(value) && Number(value) < total) {
        const k = Number(value);
        s.selected = s.selected.includes(k) ? s.selected.filter(x => x !== k) : [...s.selected, k].sort((a, b) => a - b);
      } else if (action === "clearShade") s.selected = [];
      else if (it.companion) {
        const fields = it.companion.form === "mixed" ? ["w", "n", "d"] : ["n", "d"];
        if (action === "focus" && fields.includes(value)) s.active = value;
        else if (action === "key" && /^[0-9]$/.test(value) && s.companion[s.active].length < 3) s.companion[s.active] += value;
        else if (action === "back") s.companion[s.active] = s.companion[s.active].slice(0, -1);
      }
      return s;
    }
    const m = /^(boards|rods|units):([0-9]+)$/.exec(value);
    if (action === "toggle" && m && Number(m[2]) < it.pieces[m[1]]) {
      const k = Number(m[2]), list = s[m[1]];
      s[m[1]] = list.includes(k) ? list.filter(x => x !== k) : [...list, k].sort((a, b) => a - b);
    }
    return s;
  }
  // 本版所有作答都經 data-math-action 按鍵；read 只同步本元件容器內的 data-math-field（目前不輸出 input，保留相容）。
  function read(q, container, previousState) {
    const s = sanitize(q, previousState);
    if (!container || typeof container.querySelectorAll !== "function") return s;
    const scope = container.querySelector?.(`.study-math[data-math-type="${q.type}"]`) || container;
    for (const el of scope.querySelectorAll("input[data-math-field]")) {
      const f = el.getAttribute("data-math-field");
      if (q.type === "expression_steps" && /^[0-9]$/.test(f) && Number(f) < s.fields.length) s.fields[Number(f)] = String(el.value || "");
    }
    return sanitize(q, s);
  }

  // ---------- grade ----------
  function cellMatches(blank, cell, input) {
    if (blank.kind === "number") return /^(0|[1-9][0-9]{0,8})$/.test(input.normalize("NFKC").trim()) && Number(input.normalize("NFKC").trim()) === Number(cell.value);
    const a = analyzeExpression(input);
    if (!a || !a.hasOperator || a.value !== Number(cell.value) || (blank.requiresParentheses && !a.properGroup)) return false;
    const ref = analyzeExpression(cell.expression, false);
    if (sameList(a.literals, ref.literals)) return true;
    return (cell.acceptedExpressions || []).some(form => analyzeExpression(form, false).canonical === a.canonical);
  }
  function parseVerticalRow(row) {
    const first = row.cells.findIndex(ch => ch !== ""), last = row.cells.reduce((m, ch, i) => ch !== "" ? i : m, -1);
    if (first < 0 || row.cells.slice(first, last + 1).some(ch => ch === "")) return null;
    if (row.point !== null && (row.point < first || row.point >= last)) return null;
    const intEnd = row.point === null ? last : row.point;
    const intDigits = row.cells.slice(first, intEnd + 1).join(""), frac = row.cells.slice(intEnd + 1, last + 1).join("");
    if (intDigits.length > 1 && intDigits[0] === "0") return null;
    if (frac.length > 2 && /[1-9]/.test(frac.slice(2))) return null;
    return { anchor: intEnd + 1, value: Number(intDigits) * 100 + Number((frac + "00").slice(0, 2)) };
  }
  function companionValue(it, c) {
    if (!it.companion) return true;
    const t = it.target, n = c.n, d = c.d;
    if (!/^[1-9][0-9]{0,2}$/.test(d) || !/^(0|[1-9][0-9]{0,2})$/.test(n)) return false;
    if (it.companion.form === "mixed")
      return /^[1-9][0-9]{0,2}$/.test(c.w) && Number(n) > 0 && Number(n) < Number(d) && (BigInt(c.w) * BigInt(d) + BigInt(n)) * BigInt(t.denominator) === BigInt(t.numerator) * BigInt(d);
    return Number(n) >= Number(d) && BigInt(n) * BigInt(t.denominator) === BigInt(t.numerator) * BigInt(d);
  }
  function complete(q, state) {
    const s = sanitize(q, state), it = q.interaction;
    if (q.type === "expression_steps") return s.fields.every(f => f.length > 0);
    if (q.type === "vertical_decimal") return s.rows.every(row => row.cells.some(ch => ch !== ""));
    if (q.type === "fraction_shade") return s.selected.length > 0 && (!it.companion || (s.companion.n !== "" && s.companion.d !== "" && (it.companion.form !== "mixed" || s.companion.w !== "")));
    return s.boards.length + s.rods.length + s.units.length > 0;
  }
  function grade(q, state) {
    const s = sanitize(q, state), it = q.interaction;
    if (!complete(q, s)) return false;
    if (q.type === "expression_steps") return it.solutions.some(sol => sol.every((cell, i) => cellMatches(it.blanks[i], cell, s.fields[i])));
    if (q.type === "vertical_decimal") {
      const rows = s.rows.map(parseVerticalRow);
      if (rows.some(r => !r) || new Set(rows.map(r => r.anchor)).size !== 1) return false;
      const [a, b] = it.operands.map(hundredths);
      const order = rows[0].value === a && rows[1].value === b || (it.op === "+" && rows[0].value === b && rows[1].value === a);
      return order && rows[2].value === hundredths(it.result);
    }
    if (q.type === "fraction_shade") return s.selected.length === it.target.numerator && companionValue(it, s.companion || {});
    return 100 * s.boards.length + 10 * s.rods.length + s.units.length === hundredths(it.target);
  }

  // ---------- 正解（answerText 與 answerState 同源） ----------
  function answerState(q) {
    const it = q.interaction, s = initial(q);
    if (q.type === "expression_steps") s.fields = it.solutions[0].map(c => Object.hasOwn(c, "expression") ? normalizeExpression(c.expression) : c.value);
    else if (q.type === "vertical_decimal") {
      const c = s.rows[0].cells.length, frac = Math.max(...[...it.operands, it.result].map(x => decParts(x).frac));
      const anchor = c - 1 - frac; // 右側保留一格空白
      [it.operands[0], it.operands[1], it.result].forEach((num, r) => {
        const [i, f = ""] = num.split(".");
        Array.from(i).forEach((d, k) => { s.rows[r].cells[anchor - i.length + k] = d; });
        Array.from(f).forEach((d, k) => { s.rows[r].cells[anchor + k] = d; });
        s.rows[r].point = f ? anchor - 1 : null;
      });
    } else if (q.type === "fraction_shade") {
      s.selected = Array.from({ length: it.target.numerator }, (_, i) => i);
      if (it.companion) {
        const t = it.target;
        s.companion = it.companion.form === "mixed" ? { w: String(Math.floor(t.numerator / t.denominator)), n: String(t.numerator % t.denominator), d: String(t.denominator) } : { w: "", n: String(t.numerator), d: String(t.denominator) };
      }
    } else {
      const d = decompositions(it.pieces, hundredths(it.target))[0];
      s.boards = [...Array(d.boards).keys()]; s.rods = [...Array(d.rods).keys()]; s.units = [...Array(d.units).keys()];
    }
    return s;
  }
  const pretty = expr => expr.replace(/\+/g, "＋").replace(/-/g, "－").replace(/\(/g, "（").replace(/\)/g, "）");
  function answerText(q) {
    const it = q.interaction, s = answerState(q);
    if (q.type === "expression_steps") {
      const main = s.fields.map((f, i) => `${marker(i + 1)}${pretty(f)}`).join("　");
      return it.solutions.length > 1 ? `${main}（也接受其他完整算法）` : main;
    }
    if (q.type === "vertical_decimal") return `小數點對齊寫直式：${it.operands[0]} ${it.op === "+" ? "＋" : "－"} ${it.operands[1]} ＝ ${fmtHundredths(hundredths(it.result))}`;
    if (q.type === "fraction_shade") {
      const t = it.target;
      let text = `在每個 ${t.denominator} 等分的圖形中，任選 ${t.numerator} 份畫斜線（${t.numerator}/${t.denominator}）`;
      if (it.companion) text += `；${marker(1)}${it.companion.form === "mixed" ? `${s.companion.w}又${s.companion.n}/${s.companion.d}` : `${s.companion.n}/${s.companion.d}`}`;
      return text;
    }
    const all = decompositions(it.pieces, hundredths(it.target)), d = all[0];
    const parts = [[d.boards, "張百格板"], [d.rods, "條十格條"], [d.units, "個小格"]].filter(([n]) => n > 0).map(([n, u]) => `${n} ${u}`);
    return `圈出 ${parts.join("、")}，合起來是 ${it.target} 張百格板${all.length > 1 ? "（其他合起來相同的圈法也對）" : ""}`;
  }
  function semantic(q) {
    const it = q.interaction;
    let body;
    if (q.type === "expression_steps") body = [it.blanks.map(b => [b.kind, b.requiresParentheses === true]),
      it.solutions.map(sol => sol.map(c => [c.value, c.expression ?? null, c.acceptedExpressions ?? null]))];
    else if (q.type === "vertical_decimal") body = [it.op, it.operands, it.result];
    else if (q.type === "fraction_shade") body = [it.shape, it.wholes, it.partsPerWhole, it.grid ? [it.grid.rows, it.grid.cols] : null, [it.target.numerator, it.target.denominator], it.companion ? it.companion.form : null];
    else body = [[it.pieces.boards, it.pieces.rods, it.pieces.units], it.target];
    return JSON.stringify([q.type, body]);
  }

  // ---------- render（純 HTML 字串） ----------
  const btn = (action, value, label, extra = "", disabled = false) =>
    `<button type="button" class="smi-btn${extra ? ` ${extra}` : ""}" data-math-action="${esc(action)}" data-math-value="${esc(value)}"${disabled ? " disabled" : ""}>${label}</button>`;
  function textWithChips(text) {
    return esc(text).replace(/（([０-９]+)）/g, (_, d) => `<span class="smi-chip">（${d}）</span>`);
  }
  function render(q, state, disabled = false) {
    const s = sanitize(q, state), it = q.interaction, lock = !!disabled;
    const wrap = (body, label) => `<section class="study-math" data-math-type="${esc(q.type)}" aria-label="${esc(label)}">${body}</section>`;
    if (q.type === "expression_steps") {
      const rows = it.blanks.map((b, i) => `<div class="smi-row"><span class="smi-label">${marker(i + 1)}</span>${btn("focus", String(i),
        s.fields[i] ? esc(pretty(s.fields[i])) : `<span class="smi-placeholder">${b.kind === "number" ? "填數字" : "寫算式"}</span>`,
        `smi-field${s.active === i ? " is-active" : ""}`, lock)}</div>`).join("");
      const numberOnly = it.blanks[s.active].kind === "number";
      const keysHtml = EXPR_KEYS.map(k => btn("key", k, esc(pretty(k)), /[0-9]/.test(k) ? "smi-key" : "smi-key smi-op", lock || (numberOnly && !/[0-9]/.test(k)))).join("");
      return wrap(`<p class="smi-text">${textWithChips(q.text)}</p><p class="smi-hint">點一個空格，再用下面的按鍵寫${numberOnly ? "數字" : "算式（可寫「＝結果」）"}。</p>
        <div class="smi-fields">${rows}</div>
        <div class="smi-keypad smi-keypad-expr">${keysHtml}${btn("back", "", "⌫ 退格", "smi-key smi-wide", lock)}${btn("clearField", "", "清除這格", "smi-key smi-wide", lock)}</div>`, "算式作答");
    }
    if (q.type === "vertical_decimal") {
      const [ar, ac] = s.active;
      const rowHtml = (r, sign) => `<div class="smi-vrow${r === 2 ? " smi-vresult" : ""}"><span class="smi-sign">${sign}</span>${s.rows[r].cells.map((ch, c) =>
        `<button type="button" class="smi-cell${ar === r && ac === c ? " is-active" : ""}" data-math-action="focus" data-math-value="${r}:${c}" aria-label="第 ${r + 1} 列第 ${c + 1} 格${ch ? `，${ch}` : "，空白"}${s.rows[r].point === c ? "，後面有小數點" : ""}"${lock ? " disabled" : ""}>${esc(ch)}${s.rows[r].point === c ? '<span class="smi-dot" aria-hidden="true"></span>' : ""}</button>`).join("")}</div>`;
      const keysHtml = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(k => btn("key", k, k, "smi-key", lock)).join("") + btn("key", ".", "．小數點", "smi-key smi-wide", lock) + btn("back", "", "⌫ 退格", "smi-key smi-wide", lock);
      return wrap(`<p class="smi-text">${esc(q.text)}</p><p class="smi-hint">自己把兩個數寫進格子，小數點要對齊，再寫答案。按「．」會把小數點點在前一個數字後面。</p>
        <div class="smi-vertical">${rowHtml(0, "")}${rowHtml(1, it.op === "+" ? "＋" : "－")}<div class="smi-vline" aria-hidden="true"></div>${rowHtml(2, "")}</div>
        <div class="smi-keypad">${keysHtml}</div>
        <div class="smi-tools">${btn("pad", "", "小數後面補 0", "", lock)}${btn("clearRow", String(ar), "清除這一列", "", lock)}${btn("clear", "", "全部重寫", "", lock)}</div>`, "直式作答");
    }
    if (q.type === "fraction_shade") {
      const n = it.partsPerWhole, size = 150;
      const shapes = Array.from({ length: it.wholes }, (_, w) => {
        let parts = "";
        for (let p = 0; p < n; p++) {
          const k = w * n + p, on = s.selected.includes(k);
          let d;
          if (it.shape === "grid") {
            const cw = size / it.grid.cols, rh = size / it.grid.rows, x = (p % it.grid.cols) * cw, y = Math.floor(p / it.grid.cols) * rh;
            d = `M${x} ${y}h${cw}v${rh}h${-cw}Z`;
          } else {
            const r = size / 2 - 2, a0 = -Math.PI / 2 + 2 * Math.PI * p / n, a1 = -Math.PI / 2 + 2 * Math.PI * (p + 1) / n, f = v => v.toFixed(2);
            d = `M75 75L${f(75 + r * Math.cos(a0))} ${f(75 + r * Math.sin(a0))}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(75 + r * Math.cos(a1))} ${f(75 + r * Math.sin(a1))}Z`;
          }
          parts += `<path d="${d}" class="smi-part${on ? " is-on" : ""}"${lock ? ' aria-disabled="true"' : ` data-math-action="toggle" data-math-value="${k}" tabindex="0"`} role="button" aria-pressed="${on}" aria-label="第 ${w + 1} 個圖形第 ${p + 1} 份"/>`;
        }
        const frame = it.shape === "grid" ? `<rect x="0" y="0" width="${size}" height="${size}" class="smi-frame"/>` : `<circle cx="75" cy="75" r="${size / 2 - 2}" class="smi-frame"/>`;
        return `<svg class="smi-shape" viewBox="-3 -3 ${size + 6} ${size + 6}" role="group" aria-label="第 ${w + 1} 個圖形">${parts}${frame}</svg>`;
      }).join("");
      let companion = "";
      if (it.companion) {
        const box = (f, label) => btn("focus", f, s.companion[f] ? esc(s.companion[f]) : "　", `smi-fbox${s.active === f ? " is-active" : ""}" aria-label="${label}`, lock);
        companion = `<div class="smi-companion"><span class="smi-label">${marker(1)}</span>${it.companion.form === "mixed" ? `${box("w", "整數")}<span class="smi-and">又</span>` : ""}<span class="smi-frac">${box("n", "分子")}<span class="smi-bar" aria-hidden="true"></span>${box("d", "分母")}</span></div>
          <div class="smi-keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(k => btn("key", k, k, "smi-key", lock)).join("")}${btn("back", "", "⌫ 退格", "smi-key smi-wide", lock)}</div>`;
      }
      return wrap(`<p class="smi-text">${textWithChips(q.text)}</p><p class="smi-hint">點一份就畫上斜線，再點一次可以取消；可以選任何位置。</p>
        <svg class="smi-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><pattern id="smi-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#dbeafe"/><line x1="0" y1="0" x2="0" y2="10" stroke="#1d4ed8" stroke-width="4"/></pattern></defs></svg><div class="smi-shapes">${shapes}</div><p class="smi-status" role="status">已畫斜線 ${s.selected.length} 份</p>${companion}
        <div class="smi-tools">${btn("clearShade", "", "斜線全部擦掉", "", lock)}</div>`, "分數畫斜線作答");
    }
    const p = it.pieces;
    const board = `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#d1d5db"/>${Array.from({ length: 9 }, (_, i) => `<line x1="${(i + 1) * 10}" y1="0" x2="${(i + 1) * 10}" y2="100"/><line x1="0" y1="${(i + 1) * 10}" x2="100" y2="${(i + 1) * 10}"/>`).join("")}<rect width="100" height="100" fill="none" stroke-width="2"/></svg>`;
    const rod = `<svg viewBox="0 0 10 100" aria-hidden="true"><rect width="10" height="100" fill="#e5e7eb"/>${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${(i + 1) * 10}" x2="10" y2="${(i + 1) * 10}"/>`).join("")}<rect width="10" height="100" fill="none" stroke-width="1.5"/></svg>`;
    const unit = `<svg viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" fill="#fff" stroke-width="1.2"/></svg>`;
    const group = (kind, count, art, name) => Array.from({ length: count }, (_, i) => {
      const on = s[kind].includes(i);
      return `<button type="button" class="smi-piece smi-${kind}${on ? " is-on" : ""}" data-math-action="toggle" data-math-value="${kind}:${i}" aria-pressed="${on}" aria-label="${name} ${i + 1}"${lock ? " disabled" : ""}>${art}</button>`;
    }).join("");
    return wrap(`<p class="smi-text">${esc(q.text)}</p><p class="smi-hint">點一下就圈起來，再點一次取消。</p>
      <div class="smi-base10"><div class="smi-boards">${group("boards", p.boards, board, "百格板")}</div><div class="smi-small"><div class="smi-rods">${group("rods", p.rods, rod, "十格條")}</div><div class="smi-units">${group("units", p.units, unit, "小格")}</div></div></div>
      <p class="smi-status" role="status">已圈 ${s.boards.length + s.rods.length + s.units.length} 個</p>
      <div class="smi-tools">${btn("clear", "", "全部取消", "", lock)}</div>`, "百格板圈選作答");
  }

  root.StudyMathInteractions = Object.freeze({ TYPES, TYPE_UNITS, validateQuestion, initial, render, update, read, complete, grade, answerText, answerState, semantic, analyzeExpression });
})(globalThis);
