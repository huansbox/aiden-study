"""Production path and cross-language guards, using invented operation questions."""
import copy
import json
import subprocess

import pytest
import build_private_study_pack as builder
import study_math_geometry as geometry
from test_build_private_study_pack import _fixture, _paths


@pytest.fixture(scope="module")
def questions():
    result = subprocess.run(["node", "--input-type=module", "-e", "import {operationQuestions} from './tests/helpers/synthetic-math-operations.mjs'; console.log(JSON.stringify(operationQuestions()));"], cwd=builder.ROOT, capture_output=True, text=True, check=True, encoding="utf-8")
    return json.loads(result.stdout)


def check_python(q):
    try:
        builder._validate_question({k: v for k, v in q.items() if k != "source"}, "Synthetic", {"appId": q["id"], "unit": q["unit"], "digitalAdaptation": q["type"]})
        return True
    except builder.PackBuildError:
        return False


def check_js(cases):
    script = "require('./docs/study/math-interactions.js');require('./docs/study/math-geometry.js');require('./docs/study/private-pack.js');const cases=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log(JSON.stringify(cases.map(q=>{try{StudyPrivatePack.parse(JSON.stringify({schemaVersion:2,packId:'g4-s1-math-u1',revision:1,questions:[q],explanations:{[q.id]:'Synthetic'}}),[],null,true);return true;}catch{return false;}})));"
    result = subprocess.run(["node", "-e", script], input=json.dumps(cases), cwd=builder.ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def test_seven_operations_build_through_provenance_and_match_browser(questions, tmp_path):
    values = _fixture()
    for data in values[:3]:
        data["revision"] = 2
    for i, original in enumerate(questions):
        q = {k: v for k, v in original.items() if k != "source"}
        practice = f"SYNTHETIC-OP-{i}"
        curated = dict(values[0]["items"][0], practiceId=practice, originalId=practice, paperId="synthetic-only", question=q, concept="Synthetic", adaptation="Synthetic guided operation", answerPage=None, verification=builder.NO_OFFICIAL_ANSWER_VERIFIED)
        mapping = dict(values[2]["items"][0], appId=q["id"], practiceId=practice, originalId=practice, paperId="synthetic-only", unit=q["unit"], concept="Synthetic", sourceAdaptation=curated["adaptation"], digitalAdaptation=q["type"], answerPage=None, reviewStatus=curated["verification"])
        values[0]["items"].append(curated)
        values[1]["entries"].append({"id": q["id"], "text": "Synthetic explanation。"})
        values[2]["items"].append(mapping)
    pack = builder.build_pack(*_paths(tmp_path, values))
    assert len(pack["questions"]) == 13
    assert all(check_js(pack["questions"]))
    # Unknown verification remains blocked even for a structurally valid operation.
    values[2]["items"][-1]["reviewStatus"] = "pending"
    with pytest.raises(builder.PackBuildError):
        builder.build_pack(*_paths(tmp_path, values))


def test_geometry_and_operation_rejection_parity(questions):
    cases, expected = [], []
    for original in questions:
        cases.append(copy.deepcopy(original)); expected.append(True)
        for mutate in [lambda q: q.update(unit=19), lambda q: q["interaction"].update(extra=1), lambda q: q.update(options=["invented"]), lambda q: q.update(answer="1")]:
            q = copy.deepcopy(original); mutate(q); cases.append(q); expected.append(False)
    triangle, chart, measure = questions[4:]
    changes = [
        (triangle, lambda q: q["interaction"]["scene"].update(pixelsPerCm=0)),
        (triangle, lambda q: q["interaction"]["given"][0].update(index=True)),
        (triangle, lambda q: q["interaction"]["constraints"].update(legs=[4, 21])),
        (triangle, lambda q: q["interaction"]["marks"].update(rightAt=3)),
        (triangle, lambda q: q["interaction"]["tolerance"].update(angleDeg=6)),
        (chart, lambda q: q["interaction"]["axis"].update(labels=[False, 10, None, None, None])),
        (chart, lambda q: q["interaction"]["axis"].update(minor=3)),
        (chart, lambda q: q["interaction"]["title"].update(keywords=[["社團"]])),
        (chart, lambda q: q["interaction"]["bars"][0].update(value=17)),
        (measure, lambda q: q["interaction"]["scene"].update(width=800)),
        (measure, lambda q: q["interaction"]["scene"].update(image="data:image/png;base64,AAAA")),
        (measure, lambda q: q["interaction"].update(tools=["ruler", "ruler"])),
        (measure, lambda q: q["interaction"]["outputs"][1].update(answer=[0, 1])),
        (measure, lambda q: q["interaction"]["outputs"][2].update(answer=[0, 0])),
    ]
    for original, mutate in changes:
        q = copy.deepcopy(original); mutate(q); cases.append(q); expected.append(False)
    assert [check_python(q) for q in cases] == expected
    assert check_js(cases) == expected


def test_geometry_utf16_limits_and_semantic_fields(questions):
    q = copy.deepcopy(questions[4])
    q["text"] = "😀" * 500
    geometry.validate_question(q)
    q["text"] += "😀"
    with pytest.raises(ValueError):
        geometry.validate_question(q)
    for q in questions:
        changed = copy.deepcopy(q)
        changed["interaction"] = dict(reversed(list(changed["interaction"].items())))
        assert builder._question_semantic(q) == builder._question_semantic(changed)
        changed["interaction"]["new-semantic-field"] = 1
        assert builder._question_semantic(q) != builder._question_semantic(changed)


@pytest.mark.parametrize("answer,valid", [("0", True), ("2", True), ("7/3", True), ("2 1/3", True), ("0/7", True), ("0 0/7", True), ("2 0/3", True), ("2 7/3", False), ("0 7/3", False), ("2.5", False), ("1+1", False), ("", False), ("1/0", False), ("1/1000000", False)])
def test_free_fraction_schema_keeps_bounded_notation(answer, valid):
    q = {"id": "math-g4s1-synthetic-any-v1", "subject": "math", "unit": 27, "type": "fill_in_blank", "text": "Synthetic （１）", "subtopic": "Synthetic", "source": "Synthetic", "options": [], "answer": "", "blanks": [{"input": "fraction", "form": "any", "answer": answer}]}
    try:
        builder._validate_question({k:v for k,v in q.items() if k != "source"}, "S", {"appId":q["id"], "unit":27, "digitalAdaptation":"fill_in_blank:fraction"})
        result = True
    except builder.PackBuildError:
        result = False
    assert result == valid
    assert check_js([q]) == [valid]
