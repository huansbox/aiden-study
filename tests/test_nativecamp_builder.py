"""The content builder keeps task identities and audio handoffs reproducible."""

import copy
import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "nativecamp_builder", ROOT / "learning-tasks/shared/nativecamp/build_lesson.py"
)
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


def _source(tmp_path, monkeypatch, lesson_id, weekly=False):
    source = json.loads((ROOT / "learning-tasks/nativecamp-2026-09-14/source/lesson-source.json").read_text(encoding="utf-8"))
    source["id"], source["date"] = lesson_id, "2026-09-20" if weekly else lesson_id
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
