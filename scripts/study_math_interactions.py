"""Bounded Study math interaction contract; synthetic parity-tested against math-interactions.js.

The builder supplies the browser-shaped question, including generated source.
No file/network access, progress, or reward changes occur here.
"""
import json
import math
import re
import unicodedata

TYPE_UNITS = {"expression_steps": [26], "vertical_decimal": [25], "fraction_shade": [27], "hundred_grid_select": [25]}
COMMON = {"id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer", "interaction"}
DEC = re.compile(r"(?:0|[1-9][0-9]{0,3})(?:\.[0-9]{1,2})?\Z")
INTEGER = re.compile(r"(?:0|[1-9][0-9]{0,8})\Z")
JS_SPACE = "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"


def _keys(value, required, optional=()):
    return isinstance(value, dict) and set(required) <= value.keys() and value.keys() <= set(required) | set(optional)


def _int(value, lo, hi):
    return type(value) in (int, float) and lo <= value <= hi and math.isfinite(value) and value == int(value)


def _text(value, maximum):
    return isinstance(value, str) and bool(value.strip(JS_SPACE)) and len(value) <= maximum


def _need(condition, message):
    if not condition:
        raise ValueError(message)


def _decimal(value):
    return isinstance(value, str) and bool(DEC.fullmatch(value))


def hundredths(value):
    integer, _, fraction = value.partition(".")
    return int(integer) * 100 + int((fraction + "00")[:2])


def _marker(index):
    return "（" + str(index).translate(str.maketrans("0123456789", "０１２３４５６７８９")) + "）"


def _normalize(value, decimal):
    if not isinstance(value, str):
        return None
    value = unicodedata.normalize("NFKC", value).translate(str.maketrans({"−": "-", "–": "-", "—": "-"}))
    if not decimal:
        value = value.translate(str.maketrans({"*": "×", "x": "×", "X": "×", "/": "÷"}))
    return "".join(ch for ch in value if ch not in JS_SPACE)


def _analyze(raw, allow_equals, decimal):
    value = _normalize(raw, decimal)
    if not value or len(value) > 40 or not re.fullmatch(r"[0-9.+\-()=]+" if decimal else r"[0-9+\-×÷()=]+", value):
        return None
    sides = value.split("=")
    if len(sides) > 2 or len(sides) == 2 and (not allow_equals or not (DEC if decimal else INTEGER).fullmatch(sides[1])):
        return None
    claimed = (hundredths(sides[1]) if decimal else int(sides[1])) if len(sides) == 2 else None
    tokens, pos = [], 0
    while pos < len(sides[0]):
        match = re.match(r"[0-9]+(?:\.[0-9]+)?" if decimal else r"[0-9]+", sides[0][pos:])
        if match:
            number = match[0]
            if not (DEC if decimal else INTEGER).fullmatch(number):
                return None
            tokens.append(hundredths(number) if decimal else int(number))
            pos += len(number)
        else:
            tokens.append(sides[0][pos])
            pos += 1
    if len(tokens) > 31:
        return None
    cursor, groups = 0, []

    def factor(depth):
        nonlocal cursor
        if cursor >= len(tokens):
            raise ValueError()
        token = tokens[cursor]
        cursor += 1
        if type(token) is int:
            return {"n": token}
        if token != "(" or depth >= 4:
            raise ValueError()
        node = expr(depth + 1)
        if cursor >= len(tokens) or tokens[cursor] != ")":
            raise ValueError()
        cursor += 1
        groups.append(node)
        return node

    def term(depth):
        nonlocal cursor
        node = factor(depth)
        while cursor < len(tokens) and tokens[cursor] in ("×", "÷"):
            op = tokens[cursor]
            cursor += 1
            node = {"op": op, "a": node, "b": factor(depth)}
        return node

    def expr(depth):
        nonlocal cursor
        node = term(depth)
        while cursor < len(tokens) and tokens[cursor] in ("+", "-"):
            op = tokens[cursor]
            cursor += 1
            node = {"op": op, "a": node, "b": term(depth)}
        return node

    def evaluate(node):
        if "n" in node:
            return node["n"]
        a, b = evaluate(node["a"]), evaluate(node["b"])
        if node["op"] == "+":
            result = a + b
        elif node["op"] == "-":
            result = a - b
        elif node["op"] == "×":
            result = a * b
        else:
            if not b or a % b:
                raise ValueError()
            result = a // b
        if not 0 <= result <= 10**12:
            raise ValueError()
        return result

    def literals(node):
        return [node["n"]] if "n" in node else literals(node["a"]) + literals(node["b"])

    def canonical(node):
        if "n" in node:
            return str(node["n"])
        op = node["op"]
        if op in ("+", "×"):
            def flatten(child):
                return flatten(child["a"]) + flatten(child["b"]) if child.get("op") == op else [canonical(child)]
            return op + "[" + ",".join(sorted(flatten(node))) + "]"
        return op + "(" + canonical(node["a"]) + "," + canonical(node["b"]) + ")"

    try:
        tree = expr(0)
        if cursor != len(tokens):
            return None
        result = evaluate(tree)
        if decimal and result > 999999 or claimed is not None and claimed != result:
            return None
        analysis = {"value": result, "literals": sorted(literals(tree)), "canonical": canonical(tree), "hasOperator": "op" in tree}
        if not decimal:
            analysis.update(properGroup=any("op" in group and group is not tree for group in groups), claimed=claimed)
        return analysis
    except (ValueError, IndexError):
        return None


def analyze_expression(raw, allow_equals=True):
    return _analyze(raw, allow_equals, False)


def analyze_decimal_expression(raw, allow_equals=True):
    return _analyze(raw, allow_equals, True)


def validate_decimal_expression(spec):
    _need(isinstance(spec, dict) and _decimal(spec.get("value")), "invalid decimal expression value")
    reference = analyze_decimal_expression(spec.get("answer"), False)
    _need(reference and reference["hasOperator"] and reference["value"] == hundredths(spec["value"]), "invalid decimal expression reference")


def grade_decimal_expression(spec, value):
    reference, actual = analyze_decimal_expression(spec.get("answer"), False), analyze_decimal_expression(value)
    return bool(reference and actual and actual["hasOperator"] and reference["value"] == actual["value"] and reference["literals"] == actual["literals"])


def validate_question(q):
    _need(_keys(q, COMMON, {"material"}), "invalid interaction question fields")
    kind = q["type"]
    _need(isinstance(kind, str) and kind in TYPE_UNITS and q["subject"] == "math" and _int(q["unit"], 0, 32) and q["unit"] in TYPE_UNITS[kind], "invalid interaction scope")
    _need(all(_text(q[k], limit) for k, limit in (("id", 120), ("subtopic", 60), ("source", 300), ("text", 600))), "invalid interaction text")
    _need(q["options"] == [] and q["answer"] == "", "interaction requires empty options/answer")
    _need("material" not in q or isinstance(q["material"], dict), "invalid material")
    it = q["interaction"]
    if kind == "expression_steps":
        _need(_keys(it, {"blanks", "solutions"}) and isinstance(it["blanks"], list) and 1 <= len(it["blanks"]) <= 6, "invalid expression blanks")
        for blank in it["blanks"]:
            _need(isinstance(blank, dict) and blank.get("kind") in ("number", "expression"), "invalid expression kind")
            _need(_keys(blank, {"kind"}) if blank["kind"] == "number" else _keys(blank, {"kind"}, {"requiresParentheses"}) and ("requiresParentheses" not in blank or blank["requiresParentheses"] is True), "invalid expression blank fields")
        _need(re.findall(r"（[０-９]+）", q["text"]) == [_marker(i + 1) for i in range(len(it["blanks"]))], "invalid expression markers")
        _need(isinstance(it["solutions"], list) and 1 <= len(it["solutions"]) <= 4, "invalid solutions")
        seen = set()
        for solution in it["solutions"]:
            _need(isinstance(solution, list) and len(solution) == len(it["blanks"]), "invalid solution length")
            for blank, cell in zip(it["blanks"], solution):
                _need(isinstance(cell, dict) and isinstance(cell.get("value"), str) and INTEGER.fullmatch(cell["value"]), "invalid expression result")
                if blank["kind"] == "number":
                    _need(_keys(cell, {"value"}), "invalid number cell")
                    continue
                _need(_keys(cell, {"value", "expression"}, {"acceptedExpressions"}), "invalid expression cell")
                aliases = cell.get("acceptedExpressions", [])
                _need(isinstance(aliases, list) and ("acceptedExpressions" not in cell or 1 <= len(aliases) <= 6), "invalid accepted expressions")
                canonical = set()
                for expression in [cell["expression"], *aliases]:
                    parsed = analyze_expression(expression, False)
                    _need(parsed and parsed["hasOperator"] and parsed["value"] == int(cell["value"]) and (not blank.get("requiresParentheses") or parsed["properGroup"]) and parsed["canonical"] not in canonical, "invalid reference expression")
                    canonical.add(parsed["canonical"])
            key = json.dumps([[cell["value"], analyze_expression(cell["expression"], False)["canonical"] if "expression" in cell else None] for cell in solution])
            _need(key not in seen, "duplicate solution")
            seen.add(key)
    elif kind == "vertical_decimal":
        _need(_keys(it, {"op", "operands", "result"}, {"setup"}) and it["op"] in ("+", "-") and isinstance(it["operands"], list) and len(it["operands"]) == 2, "invalid vertical fields")
        _need(all(_decimal(value) for value in [*it["operands"], it["result"]]), "invalid vertical decimals")
        a, b = map(hundredths, it["operands"])
        _need((a + b if it["op"] == "+" else a - b) == hundredths(it["result"]), "vertical result mismatch")
        parts = [value.split(".") for value in [*it["operands"], it["result"]]]
        _need(max(len(p[0]) for p in parts) + max(len(p[1]) if len(p) == 2 else 0 for p in parts) + 2 <= 10, "too many vertical columns")
        if "setup" in it:
            _need(isinstance(it["setup"], list) and 1 <= len(it["setup"]) <= 2, "invalid setup count")
            for step in it["setup"]:
                _need(_keys(step, {"prompt", "answer", "value"}) and _text(step["prompt"], 160), "invalid setup fields")
                validate_decimal_expression(step)
    elif kind == "fraction_shade":
        grid = isinstance(it, dict) and it.get("shape") == "grid"
        _need(_keys(it, {"shape", "wholes", "partsPerWhole", "target"} | ({"grid"} if grid else set()), {"companion"}) and it["shape"] in ("grid", "circle"), "invalid shade fields")
        _need(_int(it["wholes"], 1, 6) and _int(it["partsPerWhole"], 2, 12), "invalid shade dimensions")
        if grid:
            _need(_keys(it["grid"], {"rows", "cols"}) and all(_int(it["grid"][k], 1, 6) for k in ("rows", "cols")) and it["grid"]["rows"] * it["grid"]["cols"] == it["partsPerWhole"], "invalid grid")
        target = it["target"]
        _need(_keys(target, {"numerator", "denominator"}) and target["denominator"] == it["partsPerWhole"] and _int(target["numerator"], 1, it["wholes"] * it["partsPerWhole"]), "invalid shade target")
        if "companion" in it:
            _need(_keys(it["companion"], {"form"}) and it["companion"]["form"] in ("mixed", "improper"), "invalid companion")
            n, d = target["numerator"], target["denominator"]
            _need(n > d and n % d != 0 if it["companion"]["form"] == "mixed" else n >= d, "invalid companion value")
        _need(re.findall(r"（[０-９]+）", q["text"]) == ([_marker(1)] if "companion" in it else []), "invalid shade markers")
    else:
        _need(_keys(it, {"pieces", "target"}) and _keys(it["pieces"], {"boards", "rods", "units"}), "invalid base10 fields")
        p = it["pieces"]
        _need(_int(p["boards"], 0, 10) and _int(p["rods"], 0, 20) and _int(p["units"], 0, 20) and sum(p.values()) > 0, "invalid base10 pieces")
        _need(isinstance(it["target"], str) and re.fullmatch(r"(?:0|[1-9][0-9]?)(?:\.[0-9]{1,2})?", it["target"]), "invalid base10 target")
        target = hundredths(it["target"])
        _need(target > 0 and any(0 <= target - 100 * b - 10 * r <= p["units"] for b in range(int(p["boards"]) + 1) for r in range(int(p["rods"]) + 1)), "unreachable base10 target")


def question_semantic(q):
    """Same canonical JSON tuple as StudyMathInteractions.semantic; q must be validated."""
    it, kind = q["interaction"], q["type"]
    if kind == "expression_steps":
        body = [[[b["kind"], b.get("requiresParentheses") is True] for b in it["blanks"]], [[[c["value"], c.get("expression"), c.get("acceptedExpressions")] for c in solution] for solution in it["solutions"]]]
    elif kind == "vertical_decimal":
        body = [it["op"], it["operands"], it["result"]]
        if "setup" in it:
            body.append([[step["prompt"], step["answer"], step["value"]] for step in it["setup"]])
    elif kind == "fraction_shade":
        body = [it["shape"], it["wholes"], it["partsPerWhole"], [it["grid"]["rows"], it["grid"]["cols"]] if "grid" in it else None, [it["target"]["numerator"], it["target"]["denominator"]], it["companion"]["form"] if "companion" in it else None]
    else:
        body = [[it["pieces"][key] for key in ("boards", "rods", "units")], it["target"]]
    def js_numbers(value):
        if isinstance(value, list):
            return [js_numbers(item) for item in value]
        return int(value) if type(value) is float and value.is_integer() else value
    return json.dumps(js_numbers([kind, body]), ensure_ascii=False, separators=(",", ":"))
