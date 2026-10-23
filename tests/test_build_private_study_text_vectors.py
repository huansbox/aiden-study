"""Original synthetic social23 examples; never read private papers or authoring."""
import copy
import json
import subprocess

import pytest

import build_private_study_pack as builder
from test_build_private_study_pack import _fixture, _paths


def _values():
    values = _fixture()
    for document in values[:3]:
        document["revision"] = 2
    for index, kind in enumerate(["text", "select"]):
        original = f"synthetic-text-vector-{index}"
        app_id = f"social-g4s1-{original}-v1"
        question = {
            "id": app_id, "subject": "social", "unit": 23, "type": "fill_in_blank",
            "text": "原創合成題（１）（２）", "subtopic": "合成測試", "options": [], "answer": "",
            "blanks": [{"input": "text", "answer": "Alpha", "aliases": ["甲城"]}, {"input": "text", "answer": "<b>合成</b>"}],
        }
        if kind == "select":
            question.update(options=["甲標籤", "乙標籤"], blanks=[{"input": "select", "answer": "1"}, {"input": "select", "answer": "2"}], acceptedAnswers=[["1", "2"], ["2", "1"]])
        item = copy.deepcopy(values[0]["items"][0])
        item.update(practiceId=f"S2-SYN-{index}", originalId=original, paperId="synthetic-social", question=question, verification=builder.OFFICIAL_ANSWER_VERIFIED)
        mapping = copy.deepcopy(values[2]["items"][0])
        mapping.update(appId=app_id, practiceId=item["practiceId"], originalId=original, paperId=item["paperId"], unit=23, digitalAdaptation=f"fill_in_blank:{kind}", reviewStatus=builder.OFFICIAL_ANSWER_VERIFIED)
        values[0]["items"].append(item)
        values[2]["items"].append(mapping)
        values[1]["entries"].append({"id": app_id, "text": "原創合成解說。"})
    return values


def test_python_builder_and_production_js_preserve_text_aliases_and_full_vectors(tmp_path):
    result = builder.build_pack(*_paths(tmp_path, _values()))
    assert result["questions"][-2]["blanks"][0]["aliases"] == ["甲城"]
    assert result["questions"][-1]["acceptedAnswers"] == [["1", "2"], ["2", "1"]]
    output = tmp_path / "synthetic-pack.json"
    output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    command = "require('./docs/study/private-pack.js');StudyPrivatePack.parse(require('fs').readFileSync(process.argv[1],'utf8'));"
    check = subprocess.run(["node", "-e", command, str(output)], cwd=builder.ROOT, capture_output=True, text=True)
    assert check.returncode == 0, check.stderr


@pytest.mark.parametrize("kind,mutate", [
    ("text", lambda q: q.update(acceptedAnswers=[["1", "2"]])),
    ("text", lambda q: q.update(extra="unknown")),
    ("text", lambda q: q.update(options=["甲", "乙"])),
    ("text", lambda q: q["blanks"][1].update(input="number", answer="1")),
    *[("text", lambda q, aliases=aliases: q["blanks"][0].update(aliases=aliases)) for aliases in [None, "甲", ["甲"] * 9, ["Ａｌｐｈａ"], ["甲城", "　甲城 "], ["　"], ["\ufeff"], [1], ["甲" * 21]]],
    *[("text", lambda q, answer=answer: q["blanks"][0].update(answer=answer)) for answer in ["", "　", "\ufeff", 1, "😀" * 21]],
    ("select", lambda q: q["blanks"][0].update(aliases=["甲"])),
    *[("select", lambda q, vectors=vectors: q.update(acceptedAnswers=vectors)) for vectors in [None, [], "12", [["2", "1"]], [["1", "2"], ["1", "2"]], [["1"]], [[1, "2"]], [["1", "3"]], [["01", "2"]], [["1", "2"]] * 9]],
])
def test_python_rejects_invalid_schema(tmp_path, kind, mutate):
    values = _values()
    mutate(values[0]["items"][-2 if kind == "text" else -1]["question"])
    with pytest.raises(builder.PackBuildError):
        builder.build_pack(*_paths(tmp_path, values))


@pytest.mark.parametrize("kind,subject,unit", [(kind, subject, unit) for kind in ["text", "select"] for subject, unit in [("social", 22), ("math", 17), ("science", 21)]])
def test_mapping_keeps_new_seams_in_social23_only(tmp_path, kind, subject, unit):
    values = _values()
    index = -2 if kind == "text" else -1
    item, mapping = values[0]["items"][index], values[2]["items"][index]
    app_id = item["question"]["id"].replace("social-", f"{subject}-")
    item["question"].update(id=app_id, subject=subject, unit=unit)
    mapping.update(appId=app_id, unit=unit)
    values[1]["entries"][index]["id"] = app_id
    with pytest.raises(builder.PackBuildError):
        builder.build_pack(*_paths(tmp_path, values))


@pytest.mark.parametrize("count", [1, 20])
def test_unicode_codepoint_boundaries_and_optional_aliases(tmp_path, count):
    values = _values()
    values[0]["items"][-2]["question"]["blanks"][0] = {"input": "text", "answer": "😀" * count}
    builder.build_pack(*_paths(tmp_path, values))


@pytest.mark.parametrize("kind", ["aliases", "vectors"])
def test_aliases_and_vectors_cannot_change_under_existing_id(tmp_path, kind):
    output = tmp_path / "pack.json"
    values = _values()
    builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    before = output.read_bytes()
    for document in values[:3]:
        document["revision"] = 3
    if kind == "aliases":
        values[0]["items"][-2]["question"]["blanks"][0]["aliases"].append("甲都")
    else:
        values[0]["items"][-1]["question"]["acceptedAnswers"].pop()
    with pytest.raises(builder.PackBuildError, match="same ID"):
        builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    assert output.read_bytes() == before
