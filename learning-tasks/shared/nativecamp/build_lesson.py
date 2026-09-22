# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Build a Native Camp lesson or weekly pack and speech jobs; never replace audio."""

import argparse
import copy
import json
import re
from datetime import date, timedelta
from pathlib import Path

TASKS = Path(__file__).resolve().parents[2]
APP = TASKS.parent / "docs/nativecamp"


def build(lesson_id):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", lesson_id):
        raise ValueError("Invalid lesson ID")
    source = TASKS / f"nativecamp-{lesson_id}/source"
    lesson = json.loads((source / "lesson-source.json").read_text(encoding="utf-8"))
    if lesson["id"] != lesson_id:
        raise ValueError("Source ID must match its task")
    if date.fromisoformat(lesson["date"]).isoformat() != lesson["date"]:
        raise ValueError("Source date must use YYYY-MM-DD")
    if lesson.get("kind") == "weekly":
        weekly = lesson["weekly"]
        if weekly.get("schemaVersion") == 2:
            start, end = date.fromisoformat(weekly["practiceStart"]), date.fromisoformat(weekly["practiceEnd"])
            if (start.weekday() != 6 or end - start != timedelta(days=7)
                    or weekly["opensOn"] != end.isoformat() or lesson["date"] != weekly["opensOn"]
                    or lesson_id != f"weekly-{weekly['opensOn']}"
                    or type(weekly["conceptCount"]) is not int or not 1 <= weekly["conceptCount"] <= 4
                    or len(lesson["concepts"]) != weekly["conceptCount"]):
                raise ValueError("Planned weekly pack must match its Sunday release and practice window")
        elif weekly.get("schemaVersion", 1) != 1 or lesson_id != f"weekly-{weekly['weekStart']}" or lesson["date"] != weekly["weekEnd"]:
            raise ValueError("Weekly ID/date must match its week start/end")
    elif not re.fullmatch(rf"{re.escape(lesson['date'])}(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?", lesson_id):
        raise ValueError("Source date must match its dated task")
    result = copy.deepcopy(lesson)
    jobs = []
    question_ids = set()
    for concept in result["concepts"]:
        groups = [concept[mode] for mode in ["try", "say"]]
        if any("stage" in question for question in concept["try"]):
            validate_stages(concept["try"])
        if "tryRevision" in concept:
            revision = concept["tryRevision"]
            if not isinstance(revision, dict) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,79}", revision.get("id", "")):
                raise ValueError("Try revision needs a valid ID")
            revised = revision.get("questions")
            validate_stages(revised)
            groups.append(revised)
        for questions in groups:
            if len(questions) != 3:
                raise ValueError("Each mode needs three variants")
            for question in questions:
                spoken = question.pop("spokenQuestion")
                if not isinstance(spoken, str) or not spoken.strip():
                    raise ValueError("Each question needs nonempty spokenQuestion text")
                if question["id"] in question_ids:
                    raise ValueError("Question IDs must be unique within a lesson")
                question_ids.add(question["id"])
                prefix = f"{lesson_id}-{question['id']}"
                question["audio"] = {"question": f"audio/{prefix}-q.mp3", "answer": f"audio/{prefix}-a.mp3"}
                jobs.extend([{"file": f"{prefix}-q.mp3", "text": spoken},
                             {"file": f"{prefix}-a.mp3", "text": question["answerText"]}])
    return result, jobs


def validate_stages(questions):
    if not isinstance(questions, list) or len(questions) != 3 or any(
        not isinstance(question, dict) or question.get("stage") != stage or question.get("type") != kind
        for question, stage, kind in zip(questions, ["build", "change", "fix"], ["order", "order", "repair"])
    ):
        raise ValueError("Try practice needs Build, Change, and Fix questions")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", required=True, help="YYYY-MM-DD[-suffix] or weekly-YYYY-MM-DD")
    parser.add_argument("--check", action="store_true", help="Compare only; write nothing")
    args = parser.parse_args()
    lesson, jobs = build(args.lesson)
    files = [(APP / f"lessons/{args.lesson}.json", lesson),
             (TASKS / f"nativecamp-{args.lesson}/source/speech-jobs.json", jobs)]
    for path, data in files:
        text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if path.read_text(encoding="utf-8") != text:
                raise SystemExit(f"Generated output differs: {path}")
        else:
            path.write_text(text, encoding="utf-8")
    print(f"{'Verified' if args.check else 'Built'} {args.lesson}: {len(jobs) // 2} questions, {len(jobs)} speech jobs")


if __name__ == "__main__":
    main()
