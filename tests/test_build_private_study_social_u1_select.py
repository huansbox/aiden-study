"""Original synthetic U1 word bank; no private question content or answers."""
import copy
import json
import subprocess

import pytest

import build_private_study_pack as builder
from test_build_private_study_pack import _fixture, _paths


def _values():
    values = _fixture()
    for document in values[:3]:
        document["revision"] = 22
    common = {"practiceId": "SYN-U1-BANK", "originalId": "synthetic-U1-bank", "paperId": "synthetic-social",
              "questionPage": 1, "answerPage": None, "concept": "Synthetic complete word bank"}
    app_id = "social-g4s1-synthetic-U1-bank-v1"
    question = {
        "id": app_id, "subject": "social", "unit": 22, "type": "fill_in_blank",
        "text": "原創合成題 " + " ".join(f"（{n}）" for n in "１２３４５６７"),
        "subtopic": "地圖與位置", "options": [f"合成詞語 {i}" for i in range(1, 11)], "answer": "",
        "blanks": [{"input": "select", "answer": str(i)} for i in [10, 2, 7, 7, 4, 8, 1]],
    }
    values[0]["items"].append({**common, "adaptation": "Synthetic original complete bank", "verification": builder.NO_OFFICIAL_ANSWER_VERIFIED, "question": question})
    values[2]["items"].append({**common, "appId": app_id, "unit": 22, "contextPolicy": "Synthetic complete context",
                              "digitalAdaptation": "fill_in_blank:select", "sourceAdaptation": "Synthetic original complete bank",
                              "reviewStatus": builder.NO_OFFICIAL_ANSWER_VERIFIED})
    values[1]["entries"].append({"id": app_id, "text": "原創合成解說。"})
    return values


def test_u1_builder_keeps_all_options_blanks_and_repeated_selections_with_js_parity(tmp_path):
    values = _values()
    result = builder.build_pack(*_paths(tmp_path, values))
    question = result["questions"][-1]
    assert question["options"] == [f"合成詞語 {i}" for i in range(1, 11)]
    assert [blank["answer"] for blank in question["blanks"]] == ["10", "2", "7", "7", "4", "8", "1"]
    output = tmp_path / "pack.json"
    output.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    command = "require('./docs/study/private-pack.js');StudyPrivatePack.parse(require('fs').readFileSync(process.argv[1],'utf8'));"
    check = subprocess.run(["node", "-e", command, str(output)], cwd=builder.ROOT, capture_output=True, text=True)
    assert check.returncode == 0, check.stderr


@pytest.mark.parametrize("mutate", [
    lambda q, m: q.update(acceptedAnswers=[[b["answer"] for b in q["blanks"]]]),
    lambda q, m: q["blanks"][0].update(aliases=["甲"]),
    lambda q, m: q["blanks"][0].update(input="text", answer="甲"),
    lambda q, m: (q.update(options=[], blanks=[{"input": "text", "answer": "甲"}]), m.update(digitalAdaptation="fill_in_blank:text")),
    lambda q, m: (q.update(options=[], blanks=[{"input": "number", "answer": "1"}]), m.update(digitalAdaptation="fill_in_blank:number")),
    lambda q, m: q.update(options=q["options"] + ["合成"] * 6),
    lambda q, m: q["blanks"][0].update(answer="11"),
    lambda q, m: q.update(text=q["text"].replace("（７）", "(7)")),
    lambda q, m: (q.update(unit=24), m.update(unit=24)),
    lambda q, m: (q.update(subject="science", unit=21, id=q["id"].replace("social-", "science-")), m.update(unit=21, appId=m["appId"].replace("social-", "science-"))),
])
def test_u1_rejects_text_vectors_aliases_and_invalid_bank(tmp_path, mutate):
    values = copy.deepcopy(_values())
    mutate(values[0]["items"][-1]["question"], values[2]["items"][-1])
    with pytest.raises(builder.PackBuildError):
        builder.build_pack(*_paths(tmp_path, values))
