"""Build the private Grade 4 semester 1 math U1 Study pack.

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
    fields = {
        "appId", "practiceId", "originalId", "paperId", "questionPage", "answerPage",
        "concept", "contextPolicy", "digitalAdaptation", "sourceAdaptation", "reviewStatus",
    }
    for index, item in enumerate(metadata["items"]):
        _require_exact_keys(item, fields, f"mapping item {index}")
        practice_id = _require_nonempty(item["practiceId"], f"mapping item {index} practiceId")
        if practice_id in by_practice:
            raise PackBuildError(f"duplicate mapping practiceId: {practice_id}")
        if practice_id not in EXPECTED:
            raise PackBuildError(f"unexpected mapping practiceId: {practice_id}")
        expected_id, expected_original, expected_adaptation = EXPECTED[practice_id]
        if item["appId"] != expected_id or item["originalId"] != expected_original:
            raise PackBuildError(f"mapping IDs do not match the frozen contract for {practice_id}")
        if item["digitalAdaptation"] != expected_adaptation:
            raise PackBuildError(f"mapping digital adaptation is wrong for {practice_id}")
        for key in ("paperId", "concept", "contextPolicy", "sourceAdaptation", "reviewStatus"):
            _require_nonempty(item[key], f"mapping {practice_id} {key}")
        for key in ("questionPage", "answerPage"):
            if type(item[key]) is not int or item[key] < 1:
                raise PackBuildError(f"mapping {practice_id} {key} must be a positive integer")
        by_practice[practice_id] = item
    if set(by_practice) != set(EXPECTED):
        raise PackBuildError("mapping metadata must contain exactly the frozen six practice IDs")
    return by_practice


def _validate_question(question: Any, practice_id: str) -> dict[str, Any]:
    expected_id, _, adaptation = EXPECTED[practice_id]
    base_fields = {"id", "subject", "unit", "type", "text", "subtopic", "options", "answer"}
    expected_fields = base_fields | ({"blanks"} if adaptation.startswith("fill_in_blank:") else set())
    _require_exact_keys(question, expected_fields, f"question {practice_id}")
    if question["id"] != expected_id or question["subject"] != "math" or type(question["unit"]) is not int or question["unit"] != 15:
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
    else:
        input_type = adaptation.split(":", 1)[1]
        if question["type"] != "fill_in_blank" or question["options"] != [] or question["answer"] != "":
            raise PackBuildError(f"question {practice_id} must use the frozen fill-in-blank shape")
        blanks = question.get("blanks")
        # The shared validator is intentionally broader; the checks below adapt it
        # to the stricter private-pack contract.
        if not validate_blanks(blanks) or not isinstance(blanks, list) or len(blanks) != 1:
            raise PackBuildError(f"question {practice_id} must contain one valid blank")
        blank = blanks[0]
        _require_exact_keys(blank, {"input", "answer"}, f"question {practice_id} blank")
        if blank["input"] != input_type:
            raise PackBuildError(f"question {practice_id} uses the wrong input type")
        if input_type == "number" and not re.fullmatch(r"0|[1-9][0-9]{0,7}", blank["answer"]):
            raise PackBuildError(f"question {practice_id} number answer must be a normalized 1-8 digit integer")
        if input_type == "comparison" and blank["answer"] not in {">", "<", "="}:
            raise PackBuildError(f"question {practice_id} comparison answer must use ASCII >, <, or =")
        if "（１）" not in question["text"]:
            raise PackBuildError(f"question {practice_id} is missing the full-width blank marker （１）")
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
        if practice_id not in EXPECTED:
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
        question = _validate_question(item["question"], practice_id)
        question["source"] = (
            f"{item['paperId']} question p.{item['questionPage']} / answer p.{item['answerPage']}; "
            f"original {item['originalId']}"
        )
        by_practice[practice_id] = question
    if set(by_practice) != set(EXPECTED):
        raise PackBuildError("curated source must contain exactly the frozen six practice IDs")

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
    explanation_problems = validate_entries(entries, set(EXPECTED_IDS))
    if explanation_problems:
        raise PackBuildError("invalid explanations: " + "; ".join(explanation_problems))
    explanations = merge_entries(entries)

    public_questions = _read_json(public_questions_path)
    if not isinstance(public_questions, list):
        raise PackBuildError("public questions must be an array")
    public_ids = [question.get("id") for question in public_questions if isinstance(question, dict)]
    if len(public_ids) != len(set(public_ids)):
        raise PackBuildError("public questions contain duplicate IDs")
    collisions = sorted(set(public_ids) & set(EXPECTED_IDS))
    if collisions:
        raise PackBuildError("private IDs collide with public questions: " + ", ".join(collisions))

    return {
        "schemaVersion": 1,
        "packId": PACK_ID,
        "revision": revision,
        "questions": [by_practice[practice_id] for practice_id in EXPECTED],
        "explanations": {question_id: explanations[question_id] for question_id in EXPECTED_IDS},
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


def ensure_safe_output_path(output_path: Path) -> Path:
    resolved = output_path.resolve()
    if _is_relative_to(resolved, ROOT) and not _is_relative_to(resolved, PRIVATE_DIR.resolve()):
        raise PackBuildError("output inside this repo must stay under data/private/study/g4-s1-math-u1")
    return resolved


def write_pack_atomic(output_path: Path, payload: bytes) -> None:
    output = ensure_safe_output_path(output_path)
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


def build_to_path(
    curated_path: Path,
    explanations_path: Path,
    metadata_path: Path,
    public_questions_path: Path,
    output_path: Path,
) -> tuple[dict[str, Any], bytes]:
    """Validate everything in memory, then atomically replace the output."""
    pack = build_pack(curated_path, explanations_path, metadata_path, public_questions_path)
    payload = serialize_pack(pack)
    write_pack_atomic(output_path, payload)
    return pack, payload


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
