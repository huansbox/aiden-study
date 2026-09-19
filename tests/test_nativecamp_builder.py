"""The content builder keeps task identities and audio handoffs reproducible."""

import copy
import importlib.util
import json
import subprocess
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "nativecamp_builder", ROOT / "learning-tasks/shared/nativecamp/build_lesson.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def _source(tmp_path, monkeypatch, lesson_id, weekly=False, lesson_date=None):
    source = json.loads((ROOT / "learning-tasks/nativecamp-2026-09-14/source/lesson-source.json").read_text(encoding="utf-8"))
    source["id"], source["date"] = lesson_id, lesson_date or ("2026-09-20" if weekly else lesson_id)
    if weekly:
        source["kind"] = "weekly"
        source["weekly"] = {"weekStart": "2026-09-14", "weekEnd": "2026-09-20", "opensOn": "2026-09-20", "conceptCount": 2, "earlierCount": 0}
        for concept in source["concepts"]:
            concept["sourceConcept"] = {"lessonId": "2026-09-14", "conceptId": concept["id"], "date": "2026-09-14"}
    path = tmp_path / f"nativecamp-{lesson_id}/source/lesson-source.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(source), encoding="utf-8")
    monkeypatch.setattr(builder, "TASKS", tmp_path)
    return source, path


@pytest.mark.parametrize("lesson_id,weekly", [("2026-09-13", False), ("2026-09-17", False), ("weekly-2026-09-14", True)])
def test_new_tasks_keep_source_and_produce_exact_audio_jobs(tmp_path, monkeypatch, lesson_id, weekly):
    source, path = _source(tmp_path, monkeypatch, lesson_id, weekly)
    original = path.read_bytes()
    lesson, jobs = builder.build(lesson_id)
    expected = copy.deepcopy(source)
    expected_jobs = []
    for concept in expected["concepts"]:
        for mode in ["try", "say"]:
            for question in concept[mode]:
                stem = f"{lesson_id}-{question['id']}"
                expected_jobs.extend([{"file": f"{stem}-q.mp3", "text": question.pop("spokenQuestion")}, {"file": f"{stem}-a.mp3", "text": question["answerText"]}])
                question["audio"] = {"question": f"audio/{stem}-q.mp3", "answer": f"audio/{stem}-a.mp3"}
    assert lesson == expected
    assert jobs == expected_jobs
    assert path.read_bytes() == original
    assert not list(tmp_path.rglob("*.mp3")), "Text building must not manufacture or replace audio."


def test_planned_sunday_pack_builds_real_runtime_valid_json_without_changing_legacy(tmp_path, monkeypatch):
    source, path = _source(tmp_path, monkeypatch, "weekly-2026-09-27", weekly=True)
    source["date"] = "2026-09-27"
    source["weekly"] = {"schemaVersion": 2, "practiceStart": "2026-09-20", "practiceEnd": "2026-09-27",
                        "opensOn": "2026-09-27", "conceptCount": len(source["concepts"])}
    path.write_text(json.dumps(source), encoding="utf-8")
    lesson, jobs = builder.build(source["id"])
    assert lesson["date"] != lesson["concepts"][0]["sourceConcept"]["date"]
    result = subprocess.run(["node", "-e", "require('./docs/nativecamp/core.js'); let s=''; process.stdin.on('data',d=>s+=d); process.stdin.on('end',()=>NativeCampCore.validateLesson(JSON.parse(s)));"],
                            cwd=ROOT, input=json.dumps(lesson), text=True, capture_output=True, check=False)
    assert result.returncode == 0, result.stderr
    assert len(jobs) == len(source["concepts"]) * 12
    assert source["weekly"]["practiceEnd"] == lesson["weekly"]["opensOn"]


@pytest.mark.parametrize("edit", [
    lambda value: value["weekly"].update(practiceEnd="2026-09-28"),
    lambda value: value["weekly"].update(conceptCount=5),
    lambda value: value["weekly"].update(conceptCount=True),
    lambda value: value["weekly"].update(schemaVersion=3),
])
def test_planned_pack_rejects_inconsistent_window_or_amount(tmp_path, monkeypatch, edit):
    source, path = _source(tmp_path, monkeypatch, "weekly-2026-09-27", weekly=True)
    source["date"] = "2026-09-27"
    source["weekly"] = {"schemaVersion": 2, "practiceStart": "2026-09-20", "practiceEnd": "2026-09-27",
                        "opensOn": "2026-09-27", "conceptCount": len(source["concepts"])}
    edit(source)
    path.write_text(json.dumps(source), encoding="utf-8")
    with pytest.raises(ValueError):
        builder.build(source["id"])


def test_source_identity_and_duplicate_audio_names_fail_before_output(tmp_path, monkeypatch):
    source, path = _source(tmp_path, monkeypatch, "weekly-2026-09-14", True)
    source["date"] = "2026-09-19"
    path.write_text(json.dumps(source), encoding="utf-8")
    with pytest.raises(ValueError, match="Weekly ID/date"):
        builder.build(source["id"])
    source["date"] = "2026-09-20"
    source["concepts"][0]["say"][0]["id"] = source["concepts"][0]["try"][0]["id"]
    path.write_text(json.dumps(source), encoding="utf-8")
    with pytest.raises(ValueError, match="Question IDs"):
        builder.build(source["id"])


def test_task_path_cannot_escape_source_root():
    with pytest.raises(ValueError, match="Invalid lesson ID"):
        builder.build("../../outside")


@pytest.mark.parametrize("suffix", ["mel", "mel-2", "2"])
def test_same_date_lessons_keep_distinct_bundle_and_audio_identities(tmp_path, monkeypatch, suffix):
    day = "2026-09-12"
    _, original_path = _source(tmp_path, monkeypatch, day)
    _, extra_path = _source(tmp_path, monkeypatch, f"{day}-{suffix}", lesson_date=day)
    originals = {path: path.read_bytes() for path in [original_path, extra_path]}
    old_lesson, old_jobs = builder.build(day)
    new_lesson, new_jobs = builder.build(f"{day}-{suffix}")
    assert old_lesson["id"] == day
    assert new_lesson["id"] == f"{day}-{suffix}"
    assert old_lesson["date"] == new_lesson["date"] == day
    assert {job["file"] for job in old_jobs}.isdisjoint(job["file"] for job in new_jobs)
    for concept in new_lesson["concepts"]:
        for mode in ["try", "say"]:
            for question in concept[mode]:
                for kind, letter in [("question", "q"), ("answer", "a")]:
                    assert question["audio"][kind] == f"audio/{day}-{suffix}-{question['id']}-{letter}.mp3"
    assert builder.build(day) == (old_lesson, old_jobs)
    assert all(path.read_bytes() == contents for path, contents in originals.items())


@pytest.mark.parametrize("lesson_id,lesson_date", [
    ("2026-09-13-mel", "2026-09-12"),
    ("2026-09-12-", "2026-09-12"),
    ("2026-09-12--mel", "2026-09-12"),
    ("2026-09-12-mel--2", "2026-09-12"),
    ("2026-09-12-Mel", "2026-09-12"),
    ("2026-09-12-mel_2", "2026-09-12"),
    ("20260912-mel", "20260912"),
    ("2026-02-30-mel", "2026-02-30"),
])
def test_dated_suffix_rejects_mismatch_and_malformed_identity(tmp_path, monkeypatch, lesson_id, lesson_date):
    _, path = _source(tmp_path, monkeypatch, lesson_id, lesson_date=lesson_date)
    original = path.read_bytes()
    with pytest.raises(ValueError):
        builder.build(lesson_id)
    assert path.read_bytes() == original
