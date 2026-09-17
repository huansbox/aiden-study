# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Build a dated Native Camp lesson and speech jobs; never generate or replace audio."""

import argparse
import copy
import json
from pathlib import Path

TASKS = Path(__file__).resolve().parents[2]
APP = TASKS.parent / "docs/nativecamp"


def build(lesson_id):
    source = TASKS / f"nativecamp-{lesson_id}/source"
    lesson = json.loads((source / "lesson-source.json").read_text(encoding="utf-8"))
    if lesson["id"] != lesson_id or lesson["date"] != lesson_id:
        raise ValueError("Source ID/date must match its task")
    result = copy.deepcopy(lesson)
    jobs = []
    for concept in result["concepts"]:
        for mode in ["try", "say"]:
            if len(concept[mode]) != 3:
                raise ValueError("Each mode needs three variants")
            for question in concept[mode]:
                spoken = question.pop("spokenQuestion")
                prefix = f"{lesson_id}-{question['id']}"
                question["audio"] = {"question": f"audio/{prefix}-q.mp3", "answer": f"audio/{prefix}-a.mp3"}
                jobs.extend([{"file": f"{prefix}-q.mp3", "text": spoken},
                             {"file": f"{prefix}-a.mp3", "text": question["answerText"]}])
    return result, jobs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", choices=["2026-09-14", "2026-09-16"], required=True)
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
