"""Build the private Grade 4 semester 1 Study pack (legacy math U1 key).

The production inputs and output live under the precisely ignored
``data/private/study/g4-s1-math-u1`` directory.  Public source mapping is
checked for traceability, but no question text, answers, or explanations are
written outside the selected output file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Any

from build_explanations import merge_entries, validate_entries
from data_helpers import validate_blanks


ROOT = Path(__file__).resolve().parents[1]
PRIVATE_DIR = ROOT / "data" / "private" / "study" / "g4-s1-math-u1"
PUBLIC_METADATA = ROOT / "data" / "study" / "g4-s1-math-u1" / "mapping-metadata.json"
PUBLIC_QUESTIONS = ROOT / "docs" / "study" / "questions.json"
PACK_ID = "g4-s1-math-u1"
MAX_BYTES = 128 * 1024
# The six original IDs are a required baseline, not the complete current set.
SUBJECT_UNITS = {"math": {15, 16, 17, 18, 19}, "science": {20, 21}}
ID_RE = re.compile(r"(math|science)-g4s1-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*-v[1-9][0-9]*")
ADAPTATIONS = {"multiple_choice", "fill_in_blank:number", "fill_in_blank:comparison", "true_false"}
NO_OFFICIAL_ANSWER_VERIFIED = "independently_solved_twice_no_official_answer"
EXPECTED = {
    "U1-P01": ("math-g4s1-tyk111-I-01-v1", "tyk111-I-01", "multiple_choice"),
    "U1-P02": ("math-g4s1-tyk113-II-11a-v1", "tyk113-II-11a", "fill_in_blank:number"),
    "U1-P03": ("math-g4s1-tyk113-II-11d-v1", "tyk113-II-11d", "fill_in_blank:number"),
    "U1-P04": ("math-g4s1-tyk111-II-02-v1", "tyk111-II-02", "fill_in_blank:number"),
    "U1-P05": ("math-g4s1-tyk111-IV-01-v1", "tyk111-IV-01", "fill_in_blank:comparison"),
    "U1-P07": ("math-g4s1-anh114-II-08-v1", "anh114-II-08", "fill_in_blank:number"),
}
EXPECTED_IDS = tuple(details[0] for details in EXPECTED.values())


class PackBuildError(ValueError):
    """The private source cannot produce a valid, complete pack."""


def _pairs_without_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise PackBuildError(f"JSON contains duplicate key: {key}")
        result[key] = value
    return result


def _read_json(path: Path) -> Any:
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle, object_pairs_hook=_pairs_without_duplicates)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PackBuildError(f"Cannot read valid UTF-8 JSON from {path}") from exc


def _require_exact_keys(value: Any, expected: set[str], label: str) -> None:
    if not isinstance(value, dict) or set(value) != expected:
        raise PackBuildError(f"{label} must contain exactly: {', '.join(sorted(expected))}")


def _require_nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PackBuildError(f"{label} must be a non-empty string")
    return value.strip()


def _validate_metadata(metadata: Any, revision: int) -> dict[str, dict[str, Any]]:
    _require_exact_keys(
        metadata,
        {"schemaVersion", "packId", "revision", "sourceTask", "sourceMapping", "items"},
        "mapping metadata",
    )
    if metadata["schemaVersion"] != 1 or metadata["packId"] != PACK_ID or metadata["revision"] != revision:
        raise PackBuildError("mapping metadata version does not match the private source")
    _require_nonempty(metadata["sourceTask"], "mapping sourceTask")
    _require_nonempty(metadata["sourceMapping"], "mapping sourceMapping")
    if not isinstance(metadata["items"], list):
        raise PackBuildError("mapping metadata items must be an array")

    by_practice: dict[str, dict[str, Any]] = {}
    seen_ids: set[str] = set()
    fields = {
        "appId", "practiceId", "originalId", "paperId", "questionPage", "answerPage",
        "concept", "contextPolicy", "digitalAdaptation", "sourceAdaptation", "reviewStatus", "unit",
    }
    for index, item in enumerate(metadata["items"]):
        _require_exact_keys(item, fields, f"mapping item {index}")
        practice_id = _require_nonempty(item["practiceId"], f"mapping item {index} practiceId")
        if practice_id in by_practice:
            raise PackBuildError(f"duplicate mapping practiceId: {practice_id}")
        _require_nonempty(item["appId"], f"mapping {practice_id} appId")
        app_id = item["appId"]
        if not ID_RE.fullmatch(app_id) or app_id in seen_ids:
            raise PackBuildError(f"mapping appId is invalid or duplicate for {practice_id}")
        subject = app_id.split("-", 1)[0]
        seen_ids.add(app_id)
        if type(item["unit"]) is not int or item["unit"] not in SUBJECT_UNITS[subject]:
            raise PackBuildError(f"mapping unit is outside the frozen contract for {practice_id}")
        if not isinstance(item["digitalAdaptation"], str) or item["digitalAdaptation"] not in ADAPTATIONS or (subject == "science" and item["digitalAdaptation"].startswith("fill_in_blank")) or (subject == "math" and item["digitalAdaptation"] == "true_false"):
            raise PackBuildError(f"mapping digital adaptation is unsupported for {practice_id}")
        if practice_id in EXPECTED:
            expected_id, expected_original, expected_adaptation = EXPECTED[practice_id]
            if item["appId"] != expected_id or item["originalId"] != expected_original or item["unit"] != 15:
                raise PackBuildError(f"mapping IDs or unit do not match the frozen baseline for {practice_id}")
            if item["digitalAdaptation"] != expected_adaptation:
                raise PackBuildError(f"mapping digital adaptation is wrong for {practice_id}")
        for key in ("originalId", "paperId", "concept", "contextPolicy", "sourceAdaptation", "reviewStatus"):
            _require_nonempty(item[key], f"mapping {practice_id} {key}")
        if type(item["questionPage"]) is not int or item["questionPage"] < 1:
            raise PackBuildError(f"mapping {practice_id} questionPage must be a positive integer")
        answer_page = item["answerPage"]
        no_official_answer = item["reviewStatus"] == NO_OFFICIAL_ANSWER_VERIFIED
        if no_official_answer:
            if answer_page is not None:
                raise PackBuildError(
                    f"mapping {practice_id} answerPage must be null when no official answer was obtained"
                )
        elif type(answer_page) is not int or answer_page < 1:
            raise PackBuildError(
                f"mapping {practice_id} answerPage may be null only after two independent solutions"
            )
        by_practice[practice_id] = item
    if not set(EXPECTED).issubset(by_practice):
        raise PackBuildError("mapping metadata must retain the frozen six practice IDs")
    return by_practice


def _validate_question(question: Any, practice_id: str, mapping: dict[str, Any]) -> dict[str, Any]:
    expected_id, adaptation = mapping["appId"], mapping["digitalAdaptation"]
    base_fields = {"id", "subject", "unit", "type", "text", "subtopic", "options", "answer"}
    expected_fields = base_fields | ({"blanks"} if adaptation.startswith("fill_in_blank:") else set())
    _require_exact_keys(question, expected_fields, f"question {practice_id}")
    subject = mapping["appId"].split("-", 1)[0]
    if question["id"] != expected_id or question["subject"] != subject or type(question["unit"]) is not int or question["unit"] != mapping["unit"] or question["unit"] not in SUBJECT_UNITS[subject]:
        raise PackBuildError(f"question {practice_id} ID, subject, or unit is outside the frozen contract")
    _require_nonempty(question["text"], f"question {practice_id} text")
    _require_nonempty(question["subtopic"], f"question {practice_id} subtopic")
    if not isinstance(question["options"], list) or not isinstance(question["answer"], str):
        raise PackBuildError(f"question {practice_id} options or answer has the wrong type")

    if adaptation == "multiple_choice":
        if question["type"] != "multiple_choice" or len(question["options"]) != 4:
            raise PackBuildError(f"question {practice_id} must be a four-option multiple choice question")
        if any(not isinstance(option, str) or not option.strip() for option in question["options"]):
            raise PackBuildError(f"question {practice_id} has an empty option")
        if question["answer"] not in {"1", "2", "3", "4"}:
            raise PackBuildError(f"question {practice_id} answer must be a 1-based string")
    elif adaptation == "true_false":
        if question["type"] != "true_false" or question["options"] != [] or question["answer"] not in {"true", "false"}:
            raise PackBuildError(f"question {practice_id} must use true_false with empty options and a true/false string answer")
    else:
        input_type = adaptation.split(":", 1)[1]
        if question["type"] != "fill_in_blank" or question["options"] != [] or question["answer"] != "":
            raise PackBuildError(f"question {practice_id} must use the frozen fill-in-blank shape")
        blanks = question.get("blanks")
        # The shared validator is intentionally broader; the checks below adapt it
        # to the stricter private-pack contract.
        if not validate_blanks(blanks) or not 1 <= len(blanks) <= 9:
            raise PackBuildError(f"question {practice_id} must contain 1-9 valid blanks")
        for index, blank in enumerate(blanks):
            _require_exact_keys(blank, {"input", "answer"}, f"question {practice_id} blank {index}")
            if blank["input"] != input_type:
                raise PackBuildError(f"question {practice_id} uses the wrong input type")
            if input_type == "number" and not re.fullmatch(r"0|[1-9][0-9]{0,7}", blank["answer"]):
                raise PackBuildError(f"question {practice_id} number answer must be a normalized 1-8 digit integer")
            if input_type == "comparison" and blank["answer"] not in {">", "<", "="}:
                raise PackBuildError(f"question {practice_id} comparison answer must use ASCII >, <, or =")
            marker = f"（{'１２３４５６７８９'[index]}）"
            if marker not in question["text"]:
                raise PackBuildError(f"question {practice_id} is missing the full-width blank marker {marker}")
    return dict(question)


def build_pack(
    curated_path: Path,
    explanations_path: Path,
    metadata_path: Path,
    public_questions_path: Path,
) -> dict[str, Any]:
    curated = _read_json(curated_path)
    _require_exact_keys(curated, {"schemaVersion", "packId", "revision", "items"}, "curated source")
    revision = curated["revision"]
    if curated["schemaVersion"] != 1 or curated["packId"] != PACK_ID or type(revision) is not int or revision < 1 or revision > 9_007_199_254_740_991:
        raise PackBuildError("curated source version is invalid")
    if not isinstance(curated["items"], list):
        raise PackBuildError("curated items must be an array")
    metadata = _validate_metadata(_read_json(metadata_path), revision)

    by_practice: dict[str, dict[str, Any]] = {}
    item_fields = {"practiceId", "originalId", "paperId", "questionPage", "answerPage", "concept", "adaptation", "verification", "question"}
    for index, item in enumerate(curated["items"]):
        _require_exact_keys(item, item_fields, f"curated item {index}")
        practice_id = _require_nonempty(item["practiceId"], f"curated item {index} practiceId")
        if practice_id in by_practice:
            raise PackBuildError(f"duplicate curated practiceId: {practice_id}")
        if practice_id not in metadata:
            raise PackBuildError(f"unexpected curated practiceId: {practice_id}")
        public_item = metadata[practice_id]
        for key, public_key in (
            ("originalId", "originalId"), ("paperId", "paperId"),
            ("questionPage", "questionPage"), ("answerPage", "answerPage"),
            ("concept", "concept"), ("adaptation", "sourceAdaptation"),
            ("verification", "reviewStatus"),
        ):
            if item[key] != public_item[public_key]:
                raise PackBuildError(f"curated provenance does not match public mapping for {practice_id}: {key}")
        question = _validate_question(item["question"], practice_id, public_item)
        question["source"] = (
            "data/study/g4-s1-math-u1/mapping-metadata.json "
            f"appId={question['id']}"
        )
        by_practice[practice_id] = question
    if set(by_practice) != set(metadata):
        raise PackBuildError("curated source must contain exactly the approved mapping practice IDs")
    # Stable output regardless of source ordering; legacy baseline keeps its order.
    practice_order = [*EXPECTED, *sorted((pid for pid in metadata if pid not in EXPECTED and metadata[pid]["appId"].startswith("math-"))),
                      *sorted((pid for pid in metadata if metadata[pid]["appId"].startswith("science-")))]
    expected_ids = [metadata[practice_id]["appId"] for practice_id in practice_order]

    explanation_source = _read_json(explanations_path)
    _require_exact_keys(explanation_source, {"schemaVersion", "packId", "revision", "entries"}, "explanation source")
    if (
        explanation_source["schemaVersion"] != 1
        or explanation_source["packId"] != PACK_ID
        or explanation_source["revision"] != revision
        or not isinstance(explanation_source["entries"], list)
    ):
        raise PackBuildError("explanation source version or entries are invalid")
    entries = explanation_source["entries"]
    for index, entry in enumerate(entries):
        _require_exact_keys(entry, {"id", "text"}, f"explanation entry {index}")
    explanation_problems = validate_entries(entries, set(expected_ids))
    if explanation_problems:
        raise PackBuildError("invalid explanations: " + "; ".join(explanation_problems))
    explanations = merge_entries(entries)

    public_questions = _read_json(public_questions_path)
    if not isinstance(public_questions, list):
        raise PackBuildError("public questions must be an array")
    public_ids = [question.get("id") for question in public_questions if isinstance(question, dict)]
    if len(public_ids) != len(set(public_ids)):
        raise PackBuildError("public questions contain duplicate IDs")
    collisions = sorted(set(public_ids) & set(expected_ids))
    if collisions:
        raise PackBuildError("private IDs collide with public questions: " + ", ".join(collisions))

    return {
        "schemaVersion": 1,
        "packId": PACK_ID,
        "revision": revision,
        "questions": [by_practice[practice_id] for practice_id in practice_order],
        "explanations": {question_id: explanations[question_id] for question_id in expected_ids},
    }


def serialize_pack(pack: dict[str, Any]) -> bytes:
    payload = (json.dumps(pack, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if len(payload) > MAX_BYTES:
        raise PackBuildError(f"pack is {len(payload)} bytes; limit is {MAX_BYTES} bytes")
    return payload


def _is_relative_to(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def ensure_safe_output_path(output_path: Path, *, test_output_root: Path | None = None) -> Path:
    resolved = output_path.resolve()
    if test_output_root is not None and _is_relative_to(resolved, test_output_root.resolve()):
        return resolved
    if not _is_relative_to(resolved, PRIVATE_DIR.resolve()):
        raise PackBuildError("production output must stay under the private root data/private/study/g4-s1-math-u1")
    try:
        relative = resolved.relative_to(ROOT).as_posix()
        ignored = subprocess.run(
            ["git", "check-ignore", "--quiet", "--no-index", "--", relative],
            cwd=ROOT,
            capture_output=True,
            check=False,
        )
    except (OSError, ValueError) as exc:
        raise PackBuildError("cannot verify that the production output is ignored") from exc
    if ignored.returncode != 0:
        raise PackBuildError("production private root is not ignored; refusing to generate the pack")
    return resolved


def write_pack_atomic(
    output_path: Path, payload: bytes, *, test_output_root: Path | None = None
) -> None:
    output = ensure_safe_output_path(output_path, test_output_root=test_output_root)
    output.parent.mkdir(parents=True, exist_ok=True)
    temp_name: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", dir=output.parent, prefix=f".{output.name}.", suffix=".tmp", delete=False
        ) as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
            temp_name = handle.name
        os.replace(temp_name, output)
    except OSError as exc:
        raise PackBuildError(f"could not atomically write {output}") from exc
    finally:
        if temp_name:
            Path(temp_name).unlink(missing_ok=True)


def _question_semantic(question: dict[str, Any]) -> tuple[Any, ...]:
    blanks = question.get("blanks")
    blank_semantic = (
        tuple((blank.get("input"), blank.get("answer")) for blank in blanks)
        if isinstance(blanks, list)
        else None
    )
    return (
        question.get("subject"), question.get("unit"), question.get("subtopic"),
        question.get("type"), question.get("text"), tuple(question.get("options", [])),
        question.get("answer"), blank_semantic,
    )


def _normalized_revision_content(pack: dict[str, Any]) -> tuple[Any, ...]:
    by_id = {question["id"]: question for question in pack["questions"]}
    return tuple(
        (
            question_id,
            _question_semantic(by_id[question_id]),
            by_id[question_id].get("subtopic"),
            by_id[question_id].get("source"),
            pack["explanations"].get(question_id),
        )
        for question_id in sorted(by_id)
    )


def ensure_compatible_with_existing(
    output_path: Path,
    pack: dict[str, Any],
    *,
    test_output_root: Path | None = None,
) -> None:
    """Mirror W1's conservative same-ID and revision replacement rules."""
    output = ensure_safe_output_path(output_path, test_output_root=test_output_root)
    if not output.exists():
        return
    previous = _read_json(output)
    _require_exact_keys(
        previous, {"schemaVersion", "packId", "revision", "questions", "explanations"},
        "existing output",
    )
    if (
        previous["schemaVersion"] != 1
        or previous["packId"] != PACK_ID
        or type(previous["revision"]) is not int
        or not 1 <= previous["revision"] <= 9_007_199_254_740_991
        or not isinstance(previous["questions"], list)
        or not isinstance(previous["explanations"], dict)
    ):
        raise PackBuildError("existing output is not a compatible private pack")
    previous_by_id = {}
    for question in previous["questions"]:
        if not isinstance(question, dict) or not isinstance(question.get("id"), str):
            raise PackBuildError("existing output has an invalid question ID")
        previous_by_id[question["id"]] = question
    if not set(EXPECTED_IDS).issubset(previous_by_id) or len(previous["questions"]) != len(previous_by_id):
        raise PackBuildError("existing output does not retain the frozen six unique IDs")
    if set(previous["explanations"]) != set(previous_by_id):
        raise PackBuildError("existing output explanations do not match its IDs")
    for question_id, question in previous_by_id.items():
        if not isinstance(question_id, str) or not ID_RE.fullmatch(question_id):
            raise PackBuildError("existing output has an invalid question ID")
        subject = question.get("subject")
        if subject not in SUBJECT_UNITS or not question_id.startswith(f"{subject}-g4s1-") or type(question.get("unit")) is not int or question["unit"] not in SUBJECT_UNITS[subject] or (question_id in EXPECTED_IDS and question["unit"] != 15):
            raise PackBuildError("existing output has an invalid unit")
        _require_nonempty(question.get("source"), "existing question source")
        _require_nonempty(previous["explanations"][question_id], "existing question explanation")
        adaptation = question.get("type")
        if adaptation == "fill_in_blank":
            blanks = question.get("blanks")
            if not isinstance(blanks, list) or not blanks or not isinstance(blanks[0], dict):
                raise PackBuildError("existing output has invalid blanks")
            adaptation += ":" + str(blanks[0].get("input"))
        if not isinstance(adaptation, str) or adaptation not in ADAPTATIONS:
            raise PackBuildError("existing output has an unsupported adaptation")
        _validate_question(
            {k: v for k, v in question.items() if k != "source"}, question_id,
            {"appId": question_id, "unit": question["unit"], "digitalAdaptation": adaptation},
        )
    current_by_id = {question["id"]: question for question in pack["questions"]}
    if not set(previous_by_id).issubset(current_by_id):
        raise PackBuildError("cannot remove existing question IDs")
    for question_id in previous_by_id:
        if _question_semantic(previous_by_id[question_id]) != _question_semantic(current_by_id[question_id]):
            raise PackBuildError(f"same ID has different answer semantics: {question_id}")
    if pack["revision"] < previous["revision"]:
        raise PackBuildError("cannot replace an existing pack with an older revision")
    if (
        pack["revision"] == previous["revision"]
        and _normalized_revision_content(pack) != _normalized_revision_content(previous)
    ):
        raise PackBuildError("content changes require a higher revision")


def _build_to_path(
    curated_path: Path,
    explanations_path: Path,
    metadata_path: Path,
    public_questions_path: Path,
    output_path: Path,
    *,
    test_output_root: Path | None = None,
) -> tuple[dict[str, Any], bytes]:
    """Validate everything, then replace production output or an explicit test root."""
    pack = build_pack(curated_path, explanations_path, metadata_path, public_questions_path)
    payload = serialize_pack(pack)
    ensure_compatible_with_existing(output_path, pack, test_output_root=test_output_root)
    write_pack_atomic(output_path, payload, test_output_root=test_output_root)
    return pack, payload


def build_to_path(
    curated_path: Path,
    explanations_path: Path,
    metadata_path: Path,
    public_questions_path: Path,
    output_path: Path,
) -> tuple[dict[str, Any], bytes]:
    """Build only to this repo's ignored production private root."""
    return _build_to_path(
        curated_path, explanations_path, metadata_path, public_questions_path, output_path
    )


def _build_synthetic_to_path_for_test(
    curated_path: Path,
    explanations_path: Path,
    metadata_path: Path,
    public_questions_path: Path,
    output_path: Path,
    *,
    test_output_root: Path,
) -> tuple[dict[str, Any], bytes]:
    """Explicit test-only seam: every input and output must stay in one temp root."""
    test_root = test_output_root.resolve()
    if _is_relative_to(test_root, ROOT) or _is_relative_to(ROOT, test_root):
        raise PackBuildError("synthetic test root must be separate from the repository")
    paths = (
        curated_path, explanations_path, metadata_path, public_questions_path, output_path
    )
    if any(not _is_relative_to(path.resolve(), test_root) for path in paths):
        raise PackBuildError("synthetic test inputs and output must stay under the test root")
    return _build_to_path(
        curated_path,
        explanations_path,
        metadata_path,
        public_questions_path,
        output_path,
        test_output_root=test_root,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curated", type=Path, default=PRIVATE_DIR / "curated-questions.json")
    parser.add_argument("--explanations", type=Path, default=PRIVATE_DIR / "explanations.json")
    parser.add_argument("--metadata", type=Path, default=PUBLIC_METADATA)
    parser.add_argument("--public-questions", type=Path, default=PUBLIC_QUESTIONS)
    parser.add_argument("--output", type=Path, default=PRIVATE_DIR / "pack.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        pack, payload = build_to_path(
            args.curated, args.explanations, args.metadata, args.public_questions, args.output
        )
    except PackBuildError as exc:
        raise SystemExit(f"ERROR: {exc}") from exc
    print(
        f"valid questions={len(pack['questions'])} bytes={len(payload)} "
        f"sha256={hashlib.sha256(payload).hexdigest()} output={ensure_safe_output_path(args.output)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
