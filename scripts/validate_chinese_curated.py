"""
驗證國語改錯字人工題庫。

用法：
  uv run python scripts/validate_chinese_curated.py
  uv run python scripts/validate_chinese_curated.py data/curated_questions_國語.json
"""
import argparse
import json
import os
import re
import sys


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_PATH = os.path.join(ROOT, "data", "curated_questions_國語.json")

REQUIRED_FIELDS = {
    "id", "subject", "unit", "subtopic", "type", "text",
    "wrong", "answer", "choices", "note", "source",
}
CJK_CHAR = re.compile(r"^[\u3400-\u9fff\uf900-\ufaff]$")


def is_single_cjk(value):
    return isinstance(value, str) and bool(CJK_CHAR.match(value))


def validate_question(q, index=0):
    errors = []
    label = q.get("id") if isinstance(q, dict) else f"#{index + 1}"

    if not isinstance(q, dict):
        return [f"{label}: 題目必須是 object"]

    missing = sorted(REQUIRED_FIELDS - set(q))
    if missing:
        errors.append(f"{label}: 缺欄位 {', '.join(missing)}")
        return errors

    if not isinstance(q["id"], str) or not q["id"].strip():
        errors.append(f"{label}: id 必須是非空字串")
    if q["subject"] != "chinese":
        errors.append(f"{label}: subject 必須是 chinese")
    if q["type"] != "chinese_correction":
        errors.append(f"{label}: type 必須是 chinese_correction")
    if not isinstance(q["unit"], int) or q["unit"] < 13:
        errors.append(f"{label}: unit 必須是 13 以上整數")
    if not isinstance(q["subtopic"], str) or not q["subtopic"].strip():
        errors.append(f"{label}: subtopic 必須是非空字串")
    if not isinstance(q["text"], str) or not q["text"].strip():
        errors.append(f"{label}: text 必須是非空字串")
    if not isinstance(q["note"], str) or not q["note"].strip():
        errors.append(f"{label}: note 必須是非空字串")
    if not isinstance(q["source"], str) or not q["source"].strip():
        errors.append(f"{label}: source 必須是非空字串")

    wrong = q["wrong"]
    answer = q["answer"]
    if not is_single_cjk(wrong):
        errors.append(f"{label}: wrong 必須是單一中文字")
    if not is_single_cjk(answer):
        errors.append(f"{label}: answer 必須是單一中文字")
    if wrong == answer:
        errors.append(f"{label}: wrong 和 answer 不可相同")

    if isinstance(q["text"], str) and is_single_cjk(wrong):
        count = sum(1 for ch in q["text"] if ch == wrong)
        if count != 1:
            errors.append(f"{label}: text 必須剛好包含 wrong 一次，目前 {count} 次")

    choices = q["choices"]
    if not isinstance(choices, list):
        errors.append(f"{label}: choices 必須是 array")
    else:
        if len(choices) != 4:
            errors.append(f"{label}: choices 必須剛好 4 個")
        if len(set(choices)) != len(choices):
            errors.append(f"{label}: choices 不可重複")
        for choice in choices:
            if not is_single_cjk(choice):
                errors.append(f"{label}: choices 每個選項都必須是單一中文字")
                break
        if answer not in choices:
            errors.append(f"{label}: choices 必須包含 answer")
        if wrong in choices:
            errors.append(f"{label}: choices 不可包含原本錯字 wrong")

    return errors


def validate_questions(items):
    errors = []
    if not isinstance(items, list):
        return ["題庫最外層必須是 array"]

    seen_ids = set()
    for i, q in enumerate(items):
        errors.extend(validate_question(q, i))
        qid = q.get("id") if isinstance(q, dict) else None
        if qid:
            if qid in seen_ids:
                errors.append(f"{qid}: id 重複")
            seen_ids.add(qid)
    return errors


def load_questions(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main(argv=None):
    parser = argparse.ArgumentParser(description="驗證國語改錯字人工題庫")
    parser.add_argument("path", nargs="?", default=DEFAULT_PATH)
    args = parser.parse_args(argv)

    questions = load_questions(args.path)
    errors = validate_questions(questions)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"OK: {args.path}（{len(questions)} 題）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
