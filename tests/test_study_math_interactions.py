"""Original synthetic fixtures: verify the independently implemented Python/JS contract."""
import copy
import json
from pathlib import Path
import subprocess

import pytest
import study_math_interactions as math_contract

ROOT = Path(__file__).resolve().parents[1]


def browser(operation, values):
    script = """require('./docs/study/math-interactions.js');
const m=StudyMathInteractions, data=JSON.parse(require('fs').readFileSync(0,'utf8'));
const op=process.argv[1];
console.log(JSON.stringify(data.map(v=>{
 if(op==='validate'){try{m.validateQuestion(v);return {valid:true,semantic:m.semantic(v)}}catch{return {valid:false}}}
 if(op==='decimal')return m.analyzeDecimalExpression(v);
 if(op==='integer')return m.analyzeExpression(v);
 return m.gradeDecimalExpression(v[0],v[1]);
})));"""
    result = subprocess.run(["node", "-e", script, operation], input=json.dumps(values), cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def question(kind, unit, text, interaction):
    return {"id": "math-g4s1-synthetic-contract-v1", "subject": "math", "unit": unit, "type": kind,
            "text": text, "subtopic": "Synthetic", "source": "Original synthetic fixture", "options": [], "answer": "", "interaction": interaction}


def fixtures():
    return [
        question("expression_steps", 26, "Synthetic （１）（２）", {"blanks": [{"kind": "number"}, {"kind": "expression", "requiresParentheses": True}], "solutions": [[{"value": "8"}, {"value": "40", "expression": "(6+2)×5"}]]}),
        question("vertical_decimal", 25, "Synthetic decimal method", {"op": "-", "operands": ["18.75", "1.25"], "result": "17.5", "setup": [{"prompt": "Find the first number.", "answer": "20-1.25", "value": "18.75"}]}),
        question("fraction_shade", 27, "Synthetic （１）", {"shape": "grid", "wholes": 2, "partsPerWhole": 8, "grid": {"rows": 2, "cols": 4}, "target": {"numerator": 12, "denominator": 8}, "companion": {"form": "improper"}}),
        question("hundred_grid_select", 25, "Synthetic grouping", {"pieces": {"boards": 3, "rods": 2, "units": 8}, "target": "2.16"}),
    ]


def test_all_interaction_schemas_and_semantics_match_javascript():
    valid = fixtures()
    plain_vertical = copy.deepcopy(valid[1]); plain_vertical["interaction"].pop("setup"); valid.append(plain_vertical)
    circle = copy.deepcopy(valid[2]); circle["interaction"].pop("grid"); circle["interaction"]["shape"] = "circle"; circle["interaction"]["target"]["numerator"] = 13; circle["interaction"]["companion"]["form"] = "mixed"; valid.append(circle)
    expression = question("expression_steps", 26, "Synthetic （１）", {"blanks": [{"kind": "expression"}], "solutions": [[{"value": "40", "expression": "(6+2)×5", "acceptedExpressions": ["6×5+2×5"]}]]}); valid.append(expression)
    # JSON 25.0 is the same JS number as 25; validate identically after decoding.
    numeric = copy.deepcopy(valid[2]); numeric["unit"] = 27.0; numeric["interaction"]["wholes"] = 2.0; valid.append(numeric)
    actual = browser("validate", valid)
    for q, result in zip(valid, actual):
        assert math_contract.validate_question(q) is None
        assert result["valid"] is True
        assert math_contract.question_semantic(q) == result["semantic"]
        reordered = dict(reversed(list(q.items())))
        assert math_contract.question_semantic(reordered) == result["semantic"]


def test_rejected_interaction_shapes_match_javascript():
    invalid = []
    for q in fixtures():
        for field, value in [("unit", 15), ("subject", "social"), ("answer", "1"), ("options", ["a"]), ("source", ""), ("text", "\ufeff"), ("interaction", None), ("material", "bad")]:
            item = copy.deepcopy(q); item[field] = value; invalid.append(item)
        item = copy.deepcopy(q); item["extra"] = True; invalid.append(item)
    for index, path, value in [
        (0, ["blanks", 1, "requiresParentheses"], False), (0, ["solutions", 0, 1, "expression"], "(6+2×5)"),
        (0, ["solutions", 0, 1, "value"], "41"), (0, ["solutions", 0, 1, "acceptedExpressions"], []),
        (0, ["solutions", 0, 1, "acceptedExpressions"], ["(2+6)×5"]), (0, ["solutions"], []),
        (1, ["setup"], []), (1, ["setup", 0, "answer"], "18.75"), (1, ["setup", 0, "answer"], "20-1.250"),
        (1, ["setup", 0, "value"], "18.74"), (1, ["setup", 0, "prompt"], ""), (1, ["setup", 0, "extra"], True),
        (1, ["operands"], ["01", "0"]), (1, ["result"], "17.49"),
        (2, ["grid", "cols"], 3), (2, ["wholes"], True), (2, ["target", "numerator"], 17),
        (2, ["target", "denominator"], 4), (2, ["companion", "form"], "any"),
        (3, ["target"], "9.99"), (3, ["pieces", "boards"], 11), (3, ["pieces", "units"], False),
        (3, ["pieces"], {"boards": 0, "rods": 0, "units": 0}),
    ]:
        item = copy.deepcopy(fixtures()[index]); obj = item["interaction"]
        for key in path[:-1]: obj = obj[key]
        obj[path[-1]] = value; invalid.append(item)
    actual = browser("validate", invalid)
    assert all(not r["valid"] for r in actual)
    for q in invalid:
        with pytest.raises(ValueError): math_contract.validate_question(q)


@pytest.mark.parametrize("decimal", [False, True])
def test_bounded_parser_matches_javascript(decimal):
    values = ["", None, "1+2", "(1+2)", "(1+2)+3", "1+(2+3)", "0", "1-2", "2-1", "1+-2", "01+2", "1e2-1", "1+2=3", "1+2=4", "1+2=3=3", "(1+2", "1)+2", "1 2+3", "１＋２", "\ufeff1+2\ufeff", "\u001c1+2", "1+2cm", "((((1+2))))", "(((((1+2)))))", "+1", "", "1+" * 20 + "1"]
    values += ["0.1+0.2=0.3", "8.2-(1.1+2.1)", "6.80-1.25=5.55", "6.8-1.250", ".2+1", "1.+2", "1.2.3+1", "9999.99+0", "9999.99+0.01", "10000-1", "0.00+0", "20−(1.25+1.25)"] if decimal else ["8÷2", "8/2", "8÷3", "2×(3+4)", "999999999+1", "999999999×999999999", "1000000000+1", "1÷0", "((2))+3", "(2×3)+4"]
    parser = math_contract.analyze_decimal_expression if decimal else math_contract.analyze_expression
    assert [parser(value) for value in values] == browser("decimal" if decimal else "integer", values)
    if decimal:
        assert parser("0.1+0.2=0.3")["value"] == 30
        assert parser("8.2-(1.1+2.1)")["value"] == 500
    else:
        assert parser("(2+3)×4")["value"] == 20
        assert parser("(2+3)×4")["properGroup"] is True
        assert parser("((2+3)×4)")["properGroup"] is True


def test_decimal_method_matching_is_exact_and_rejects_only_result():
    spec = {"answer": "8.2-1.1-2.1", "value": "5"}
    math_contract.validate_decimal_expression(spec)
    values = ["8.20-(1.10+2.10)", "(8.2-2.1)-1.1=5.00", "5", "5+0", "8.2-3.2", "8.2-1.1-2.1=6"]
    expected = [True, True, False, False, False, False]
    assert [math_contract.grade_decimal_expression(spec, value) for value in values] == expected
    assert browser("grade", [[spec, value] for value in values]) == expected
