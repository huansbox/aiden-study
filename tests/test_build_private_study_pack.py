import copy
import json
from pathlib import Path
import subprocess
import sys

import pytest

from build_private_study_pack import (
    EXPECTED,
    EXPECTED_IDS,
    MAX_BYTES,
    PackBuildError,
    build_pack,
    build_to_path,
    ensure_safe_output_path,
    serialize_pack,
)


def _write(path: Path, value) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def _fixture():
    items = []
    metadata_items = []
    explanations = []
    for index, (practice_id, (app_id, original_id, adaptation)) in enumerate(EXPECTED.items(), 1):
        paper_id = f"synthetic-paper-{index}"
        source_adaptation = f"Synthetic adaptation {index}."
        if adaptation == "multiple_choice":
            question = {
                "id": app_id,
                "subject": "math",
                "unit": 15,
                "type": "multiple_choice",
                "text": f"Synthetic multiple choice {index}?",
                "subtopic": "Synthetic concept",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "2",
            }
        else:
            input_type = adaptation.split(":", 1)[1]
            question = {
                "id": app_id,
                "subject": "math",
                "unit": 15,
                "type": "fill_in_blank",
                "text": f"Synthetic blank {index}: （１）",
                "subtopic": "Synthetic concept",
                "options": [],
                "answer": "",
                "blanks": [{"input": input_type, "answer": "<" if input_type == "comparison" else str(index)}],
            }
        items.append({
            "practiceId": practice_id,
            "originalId": original_id,
            "paperId": paper_id,
            "questionPage": 1,
            "answerPage": 2,
            "concept": "M1a Synthetic",
            "adaptation": source_adaptation,
            "verification": "synthetic_only",
            "question": question,
        })
        metadata_items.append({
            "appId": app_id,
            "practiceId": practice_id,
            "originalId": original_id,
            "paperId": paper_id,
            "questionPage": 1,
            "answerPage": 2,
            "concept": "M1a Synthetic",
            "contextPolicy": "Synthetic context only",
            "digitalAdaptation": adaptation,
            "sourceAdaptation": source_adaptation,
            "reviewStatus": "synthetic_only",
        })
        explanations.append({"id": app_id, "text": f"Synthetic explanation number {index}。"})
    return (
        {"schemaVersion": 1, "packId": "g4-s1-math-u1", "revision": 1, "items": items},
        {
            "schemaVersion": 1,
            "packId": "g4-s1-math-u1",
            "revision": 1,
            "entries": explanations,
        },
        {
            "schemaVersion": 1,
            "packId": "g4-s1-math-u1",
            "revision": 1,
            "sourceTask": "synthetic-task",
            "sourceMapping": "synthetic-mapping.json",
            "items": metadata_items,
        },
        [{"id": "public-synthetic-question"}],
    )


def _paths(tmp_path: Path, values):
    curated, explanations, metadata, public_questions = values
    return (
        _write(tmp_path / "curated.json", curated),
        _write(tmp_path / "explanations.json", explanations),
        _write(tmp_path / "metadata.json", metadata),
        _write(tmp_path / "public.json", public_questions),
    )


def test_build_is_stable_across_reordering_and_rebuild(tmp_path):
    values = _fixture()
    paths = _paths(tmp_path, values)
    first = build_pack(*paths)
    first_payload = serialize_pack(first)

    reordered = copy.deepcopy(values)
    reordered[0]["items"].reverse()
    reordered[1]["entries"].reverse()
    reordered[2]["items"].reverse()
    second = build_pack(*_paths(tmp_path / "reordered", reordered))

    assert [question["id"] for question in first["questions"]] == list(EXPECTED_IDS)
    assert serialize_pack(second) == first_payload
    assert serialize_pack(build_pack(*paths)) == first_payload


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data[0]["items"].pop(), "exactly the frozen six"),
        (lambda data: data[0]["items"].append(copy.deepcopy(data[0]["items"][0])), "duplicate curated"),
        (lambda data: data[1]["entries"].pop(), "缺少"),
        (lambda data: data[1]["entries"][0].update(text=" "), "為空"),
        (lambda data: data[0]["items"][0]["question"].update(unit=14), "outside the frozen contract"),
        (lambda data: data[0]["items"][1]["question"].update(type="essay"), "frozen fill-in-blank"),
        (lambda data: data[0]["items"][1]["question"]["blanks"][0].update(input="comparison"), "valid blank|wrong input type"),
        (lambda data: data[0]["items"][0]["question"].update(answer="0"), "1-based string"),
        (lambda data: data[0]["items"][1]["question"]["blanks"][0].update(answer="01"), "normalized"),
        (lambda data: data[0].update(schemaVersion=2), "version is invalid"),
        (lambda data: data[0].update(packId="wrong-pack"), "version is invalid"),
        (lambda data: data[0].update(revision=0), "version is invalid"),
    ],
)
def test_invalid_source_fails_without_changing_previous_output(tmp_path, mutate, message):
    values = _fixture()
    paths = _paths(tmp_path, values)
    output = tmp_path / "pack.json"
    output.write_bytes(b"previous valid output")
    mutate(values)
    paths = _paths(tmp_path, values)

    with pytest.raises(PackBuildError, match=message):
        build_to_path(*paths, output)

    assert output.read_bytes() == b"previous valid output"


def test_public_id_collision_fails(tmp_path):
    values = _fixture()
    values[3].append({"id": EXPECTED_IDS[0]})
    with pytest.raises(PackBuildError, match="collide"):
        build_pack(*_paths(tmp_path, values))


def test_revision_bump_cannot_replace_same_id_with_different_semantics(tmp_path):
    values = _fixture()
    paths = _paths(tmp_path, values)
    output = tmp_path / "pack.json"
    build_to_path(*paths, output)
    previous = output.read_bytes()
    values[0]["revision"] = 2
    values[1]["revision"] = 2
    values[2]["revision"] = 2
    values[0]["items"][0]["question"]["text"] = "Different synthetic question with the same ID?"

    with pytest.raises(PackBuildError, match="same ID has different"):
        build_to_path(*_paths(tmp_path, values), output)

    assert output.read_bytes() == previous


def test_comparison_answer_requires_ascii(tmp_path):
    values = _fixture()
    comparison = next(
        item for item in values[0]["items"] if item["question"].get("blanks", [{}])[0].get("input") == "comparison"
    )
    comparison["question"]["blanks"][0]["answer"] = "＜"
    with pytest.raises(PackBuildError, match="valid blank|ASCII"):
        build_pack(*_paths(tmp_path, values))


def test_oversize_pack_fails_before_replacing_output(tmp_path):
    values = _fixture()
    values[0]["items"][0]["question"]["text"] = "x" * MAX_BYTES
    paths = _paths(tmp_path, values)
    output = tmp_path / "pack.json"
    output.write_bytes(b"previous valid output")

    with pytest.raises(PackBuildError, match="limit"):
        build_to_path(*paths, output)

    assert output.read_bytes() == b"previous valid output"


def test_output_inside_repo_must_be_private():
    with pytest.raises(PackBuildError, match="must stay under"):
        ensure_safe_output_path(Path(__file__).resolve().parents[1] / "docs" / "study" / "private-pack.json")


def test_cli_bad_json_returns_nonzero_and_preserves_output(tmp_path):
    values = _fixture()
    paths = list(_paths(tmp_path, values))
    paths[0].write_text("{not valid json", encoding="utf-8")
    output = tmp_path / "pack.json"
    output.write_bytes(b"previous valid output")
    script = Path(__file__).resolve().parents[1] / "scripts" / "build_private_study_pack.py"

    result = subprocess.run(
        [
            sys.executable,
            str(script),
            "--curated", str(paths[0]),
            "--explanations", str(paths[1]),
            "--metadata", str(paths[2]),
            "--public-questions", str(paths[3]),
            "--output", str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "ERROR:" in result.stderr
    assert output.read_bytes() == b"previous valid output"


def test_mapping_contains_no_private_content_fields():
    metadata = json.loads(
        (Path(__file__).resolve().parents[1] / "data" / "study" / "g4-s1-math-u1" / "mapping-metadata.json").read_text(encoding="utf-8")
    )
    forbidden = {"text", "prompt", "options", "answer", "blanks", "explanation", "explanations"}
    assert set(metadata) == {"schemaVersion", "packId", "revision", "sourceTask", "sourceMapping", "items"}
    assert len(metadata["items"]) == 6
    assert all(not (set(item) & forbidden) for item in metadata["items"])
