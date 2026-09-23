import copy
import json
from pathlib import Path
import subprocess
import sys

import pytest

import build_private_study_pack as private_builder
from build_private_study_pack import (
    EXPECTED,
    EXPECTED_IDS,
    MAX_BYTES,
    PackBuildError,
    build_pack,
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
            "unit": 15,
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


def test_science_rows_keep_legacy_mapping_shape_and_validate_subject_unit_type(tmp_path):
    curated, explanations, metadata, public_questions = _fixture()
    for source_id, unit, adaptation, answer in (
        ("synthetic-S1-01", 20, "true_false", "false"),
        ("synthetic-S2-01", 21, "multiple_choice", "3"),
    ):
        app_id = f"science-g4s1-{source_id}-v1"
        practice_id = "S1-P01" if unit == 20 else "S2-P01"
        question = {
            "id": app_id, "subject": "science", "unit": unit,
            "type": adaptation, "text": "Synthetic science question?",
            "subtopic": "Synthetic observation", "options": [] if adaptation == "true_false" else ["A", "B", "C", "D"],
            "answer": answer,
        }
        common = {"practiceId": practice_id, "originalId": source_id, "paperId": "synthetic-paper", "questionPage": 1,
                  "answerPage": 2, "concept": "Synthetic concept", "sourceAdaptation": "Synthetic unchanged context",
                  "reviewStatus": "independently_recomputed_and_matches_official"}
        curated["items"].append({**{k: common[k] for k in ("practiceId", "originalId", "paperId", "questionPage", "answerPage", "concept")},
                                 "adaptation": common["sourceAdaptation"], "verification": common["reviewStatus"], "question": question})
        metadata["items"].append({**common, "appId": app_id, "unit": unit, "contextPolicy": "Synthetic standalone question",
                                  "digitalAdaptation": adaptation})
        explanations["entries"].append({"id": app_id, "text": "Synthetic explanation。"})
    for value in (curated, explanations, metadata):
        value["revision"] = 5
    paths = _paths(tmp_path, (curated, explanations, metadata, public_questions))
    pack = build_pack(*paths)
    assert len(pack["questions"]) == 8
    assert [q["unit"] for q in pack["questions"][-2:]] == [20, 21]
    assert all("subject" not in row for row in metadata["items"])
    for mutation in (
        lambda q: q.update(subject="math"),
        lambda q: q.update(unit=19),
        lambda q: q.update(answer="1"),
        lambda q: q.update(options=["O", "X"]),
    ):
        broken = copy.deepcopy((curated, explanations, metadata, public_questions))
        mutation(broken[0]["items"][-2]["question"])
        with pytest.raises(PackBuildError):
            build_pack(*_paths(tmp_path / str(id(broken)), broken))
    pending = copy.deepcopy((curated, explanations, metadata, public_questions))
    pending[0]["items"][-2]["verification"] = "pending"
    pending[2]["items"][-2]["reviewStatus"] = "pending"
    with pytest.raises(PackBuildError, match="review is not complete"):
        build_pack(*_paths(tmp_path / "pending", pending))
    no_official = copy.deepcopy((curated, explanations, metadata, public_questions))
    no_official[0]["items"][-2]["answerPage"] = None
    no_official[0]["items"][-2]["verification"] = private_builder.NO_OFFICIAL_ANSWER_VERIFIED
    no_official[2]["items"][-2]["answerPage"] = None
    no_official[2]["items"][-2]["reviewStatus"] = private_builder.NO_OFFICIAL_ANSWER_VERIFIED
    assert len(build_pack(*_paths(tmp_path / "no-official", no_official))["questions"]) == 8


@pytest.mark.parametrize(
    ("mutate", "message"),
    [
        (lambda data: data[0]["items"].pop(), "exactly the approved mapping"),
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
        private_builder._build_synthetic_to_path_for_test(
            *paths, output, test_output_root=tmp_path
        )

    assert output.read_bytes() == b"previous valid output"


def test_public_id_collision_fails(tmp_path):
    values = _fixture()
    values[3].append({"id": EXPECTED_IDS[0]})
    with pytest.raises(PackBuildError, match="collide"):
        build_pack(*_paths(tmp_path, values))


def test_null_answer_page_requires_two_independent_solutions(tmp_path):
    values = _fixture()
    values[0]["items"][0]["answerPage"] = None
    values[0]["items"][0]["verification"] = "independently_solved_twice_no_official_answer"
    values[2]["items"][0]["answerPage"] = None
    values[2]["items"][0]["reviewStatus"] = "independently_solved_twice_no_official_answer"

    pack = build_pack(*_paths(tmp_path, values))

    assert len(pack["questions"]) == len(EXPECTED_IDS)


@pytest.mark.parametrize(
    ("answer_page", "review_status", "message"),
    [
        (None, "independently_recomputed_no_official_answer", "only after two independent"),
        (None, "independently_recomputed_and_matches_official", "only after two independent"),
        (2, "independently_solved_twice_no_official_answer", "must be null"),
    ],
)
def test_answer_page_and_review_status_must_agree(
    tmp_path, answer_page, review_status, message
):
    values = _fixture()
    values[0]["items"][0]["answerPage"] = answer_page
    values[0]["items"][0]["verification"] = review_status
    values[2]["items"][0]["answerPage"] = answer_page
    values[2]["items"][0]["reviewStatus"] = review_status

    with pytest.raises(PackBuildError, match=message):
        build_pack(*_paths(tmp_path, values))


def test_curated_and_mapping_null_answer_page_must_match(tmp_path):
    values = _fixture()
    values[0]["items"][0]["answerPage"] = 2
    values[0]["items"][0]["verification"] = "independently_solved_twice_no_official_answer"
    values[2]["items"][0]["answerPage"] = None
    values[2]["items"][0]["reviewStatus"] = "independently_solved_twice_no_official_answer"

    with pytest.raises(PackBuildError, match="provenance does not match"):
        build_pack(*_paths(tmp_path, values))


def test_revision_bump_cannot_replace_same_id_with_different_semantics(tmp_path):
    values = _fixture()
    paths = _paths(tmp_path, values)
    output = tmp_path / "pack.json"
    private_builder._build_synthetic_to_path_for_test(
        *paths, output, test_output_root=tmp_path
    )
    previous = output.read_bytes()
    values[0]["revision"] = 2
    values[1]["revision"] = 2
    values[2]["revision"] = 2
    values[0]["items"][0]["question"]["text"] = "Different synthetic question with the same ID?"

    with pytest.raises(PackBuildError, match="same ID has different"):
        private_builder._build_synthetic_to_path_for_test(
            *_paths(tmp_path, values), output, test_output_root=tmp_path
        )

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
        private_builder._build_synthetic_to_path_for_test(
            *paths, output, test_output_root=tmp_path
        )

    assert output.read_bytes() == b"previous valid output"


def test_output_inside_repo_must_be_private():
    with pytest.raises(PackBuildError, match="must stay under"):
        ensure_safe_output_path(Path(__file__).resolve().parents[1] / "docs" / "study" / "private-pack.json")


def test_output_outside_repo_is_rejected_without_test_seam(tmp_path):
    with pytest.raises(PackBuildError, match="private root"):
        ensure_safe_output_path(tmp_path / "pack.json")


def test_production_private_output_is_accepted_only_while_git_ignored():
    private_output = private_builder.PRIVATE_DIR / "w3-policy-probe.json"

    assert ensure_safe_output_path(private_output) == private_output.resolve()


def test_explicit_synthetic_seam_can_write_under_its_test_root(tmp_path):
    output = tmp_path / "synthetic" / "pack.json"

    private_builder._build_synthetic_to_path_for_test(
        *_paths(tmp_path / "inputs", _fixture()), output, test_output_root=tmp_path
    )

    assert output.exists()


def test_synthetic_seam_cannot_write_outside_its_test_root(tmp_path):
    test_root = tmp_path / "allowed"
    with pytest.raises(PackBuildError, match="test root"):
        private_builder._build_synthetic_to_path_for_test(
            *_paths(test_root / "inputs", _fixture()),
            tmp_path / "outside" / "pack.json",
            test_output_root=test_root,
        )


def test_production_output_is_rejected_when_private_root_is_not_ignored(monkeypatch):
    unignored_root = Path(__file__).resolve().parents[1] / "data" / "w3-unignored-probe"
    monkeypatch.setattr(private_builder, "PRIVATE_DIR", unignored_root)

    with pytest.raises(PackBuildError, match="not ignored"):
        private_builder.ensure_safe_output_path(unignored_root / "pack.json")


def test_cli_rejects_public_and_external_output_paths_without_writing(tmp_path):
    paths = _paths(tmp_path / "inputs", _fixture())
    root = Path(__file__).resolve().parents[1]
    script = root / "scripts" / "build_private_study_pack.py"
    targets = [
        root / "docs" / "study" / "w3-policy-probe.json",
        root.parents[1] / "w3-other-worktree" / "aiden-study" / "docs" / "study" / "w3-policy-probe.json",
        root / "data" / "exp_results" / "w3-policy-probe.json",
        tmp_path / "arbitrary-external" / "pack.json",
    ]

    for target in targets:
        assert not target.exists()
        result = subprocess.run(
            [
                sys.executable,
                str(script),
                "--curated", str(paths[0]),
                "--explanations", str(paths[1]),
                "--metadata", str(paths[2]),
                "--public-questions", str(paths[3]),
                "--output", str(target),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode != 0
        assert "production output must stay under the private root" in result.stderr
        assert not target.exists()


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
    assert set(EXPECTED_IDS).issubset({item["appId"] for item in metadata["items"]})
    assert all(not (set(item) & forbidden) for item in metadata["items"])


def _expanded_fixture():
    values = _fixture()
    for document in values[:3]:
        document["revision"] = 2
    additions = [
        ("U1-N001", "tyk113-I-03", 15, "multiple_choice", 0),
        ("U2-N001", "tyk113-II-03", 16, "number", 3),
        ("U2-N002", "tyk113-V-02", 16, "comparison", 1),
        ("U3-N001", "tyk113-I-02", 17, "multiple_choice", 0),
        ("U3-N002", "tyk113-II-04", 17, "number", 1),
        ("U4-N001", "tyk113-I-04", 18, "multiple_choice", 0),
        ("U5-N001", "tyk113-V-03", 19, "comparison", 1),
        ("U5-N002", "c-anho-112-final-II-3", 19, "number", 2),
    ]
    for practice, original, unit, input_type, count in additions:
        app_id = f"math-g4s1-{original}-v1"
        item = copy.deepcopy(values[0]["items"][0 if count == 0 else 1])
        item.update(practiceId=practice, originalId=original, paperId="synthetic-new-paper")
        question = item["question"]
        question.update(id=app_id, unit=unit, subtopic=f"Synthetic unit {unit}")
        if count:
            question["text"] = "Synthetic ordered blanks: " + " ".join(f"（{'１２３４５６７８９'[i]}）" for i in range(count))
            question["blanks"] = [{"input": input_type, "answer": "<" if input_type == "comparison" else str(20 + i)} for i in range(count)]
        mapping = copy.deepcopy(values[2]["items"][0 if count == 0 else 1])
        mapping.update(appId=app_id, practiceId=practice, originalId=original, paperId=item["paperId"], unit=unit,
                       digitalAdaptation="multiple_choice" if count == 0 else f"fill_in_blank:{input_type}")
        values[0]["items"].append(item)
        values[2]["items"].append(mapping)
        values[1]["entries"].append({"id": app_id, "text": f"Synthetic explanation for {practice}。"})
    return values


def test_expanded_build_upgrades_six_question_output_and_passes_production_js(tmp_path):
    output = tmp_path / "pack.json"
    old, _ = private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, _fixture()), output, test_output_root=tmp_path)
    values = _expanded_fixture()
    pack, payload = private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    assert len(pack["questions"]) == 14
    assert [sum(q["unit"] == unit for q in pack["questions"]) for unit in range(15, 20)] == [7, 2, 2, 1, 2]
    assert pack["questions"][:6] == old["questions"]
    assert [len(q["blanks"]) for q in pack["questions"] if q["id"].endswith(("tyk113-II-03-v1", "c-anho-112-final-II-3-v1"))] == [3, 2]
    script = "const fs=require('node:fs');require('./docs/study/private-pack.js');const p=StudyPrivatePack.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(p.questions.length)"
    result = subprocess.run(["node", "-e", script, str(output)], cwd=private_builder.ROOT, capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "14"
    for doc, list_key in [(values[0], "items"), (values[1], "entries"), (values[2], "items")]:
        doc[list_key].reverse()
    _, reordered = private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    assert reordered == payload


@pytest.mark.parametrize("mutate, message", [
    (lambda v: v[0]["items"].pop(), "approved mapping"),
    (lambda v: v[1]["entries"].pop(), "缺少"),
    (lambda v: v[2]["items"][-1].update(unit=20), "unit"),
    (lambda v: v[0]["items"][-1]["question"].update(unit=18), "unit"),
    (lambda v: v[2]["items"][-1].update(appId=EXPECTED_IDS[0]), "duplicate"),
    (lambda v: v[2]["items"][-1].update(digitalAdaptation="fill_in_blank:number+comparison"), "unsupported"),
    (lambda v: v[0]["items"][-1]["question"].update(text="missing numbered markers"), "marker"),
    (lambda v: v[0]["items"][-1]["question"]["blanks"].extend([{"input": "number", "answer": "1"}] * 8), "1-9"),
    (lambda v: v[3].append({"id": "math-g4s1-tyk113-II-03-v1"}), "collide"),
])
def test_invalid_expanded_mapping_or_source_fails_without_replacing_pack(tmp_path, mutate, message):
    output = tmp_path / "pack.json"
    private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, _fixture()), output, test_output_root=tmp_path)
    before = output.read_bytes()
    values = _expanded_fixture(); mutate(values)
    with pytest.raises(PackBuildError, match=message):
        private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    assert output.read_bytes() == before


@pytest.mark.parametrize("change", ["same_revision_add", "same_revision_explanation", "remove", "move_unit", "subtopic", "answer", "downgrade"])
def test_expanded_previous_output_checks_full_id_set_and_immutable_progress_semantics(tmp_path, change):
    output = tmp_path / "pack.json"
    original = _fixture() if change == "same_revision_add" else _expanded_fixture()
    private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, original), output, test_output_root=tmp_path)
    before = output.read_bytes()
    values = _expanded_fixture()
    if change == "same_revision_add":
        for document in values[:3]: document["revision"] = 1
    elif change == "same_revision_explanation":
        values[1]["entries"][-1]["text"] += "changed"
    elif change == "downgrade":
        for document in values[:3]: document["revision"] = 1
    else:
        for document in values[:3]: document["revision"] = 3
        if change == "remove":
            values[0]["items"].pop(); values[1]["entries"].pop(); values[2]["items"].pop()
        elif change == "move_unit":
            values[0]["items"][-1]["question"]["unit"] = 18; values[2]["items"][-1]["unit"] = 18
        elif change == "subtopic":
            values[0]["items"][0]["question"]["subtopic"] += "changed"
        elif change == "answer":
            values[0]["items"][-1]["question"]["blanks"][1]["answer"] = "123"
    with pytest.raises(PackBuildError, match="revision|remove|same ID"):
        private_builder._build_synthetic_to_path_for_test(*_paths(tmp_path, values), output, test_output_root=tmp_path)
    assert output.read_bytes() == before
