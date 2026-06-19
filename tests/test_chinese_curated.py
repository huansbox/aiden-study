import json
from pathlib import Path

from validate_chinese_curated import validate_question, validate_questions


ROOT = Path(__file__).resolve().parents[1]


def _valid_question(**overrides):
    q = {
        "id": "cht_test_001",
        "subject": "chinese",
        "unit": 13,
        "subtopic": "L7-L8 改錯字",
        "type": "chinese_correction",
        "text": "爸爸決定繼丞爺爺的事業。",
        "wrong": "丞",
        "answer": "承",
        "choices": ["承", "成", "城", "誠"],
        "note": "接續前人的工作或責任，要用「承」。",
        "source": "aiden-cht-1.jpg",
    }
    q.update(overrides)
    return q


def test_curated_chinese_pilot_data_valid():
    path = ROOT / "data" / "curated_questions_國語.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert validate_questions(data) == []
    assert len(data) == 63


def test_skipped_chinese_records_have_reasons():
    path = ROOT / "data" / "skipped_questions_國語.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data
    assert len(data) == 3
    for item in data:
        assert item["source"].startswith("aiden-cht-")
        assert item["location"]
        assert item["reason"] in {
            "not_correction",
            "scan_unclear",
        }
        assert item["note"]


def test_review_chinese_records_are_resolved():
    path = ROOT / "data" / "review_questions_國語.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data == []


def test_rejects_original_wrong_in_choices():
    errors = validate_question(_valid_question(choices=["承", "丞", "成", "城"]))
    assert any("不可包含原本錯字" in e for e in errors)


def test_rejects_missing_answer_in_choices():
    errors = validate_question(_valid_question(choices=["成", "城", "誠", "程"]))
    assert any("必須包含 answer" in e for e in errors)


def test_rejects_text_without_exactly_one_wrong_char():
    errors = validate_question(_valid_question(text="爸爸決定繼承爺爺的事業。"))
    assert any("剛好包含 wrong 一次" in e for e in errors)


def test_rejects_duplicate_choices():
    errors = validate_question(_valid_question(choices=["承", "成", "成", "誠"]))
    assert any("choices 不可重複" in e for e in errors)
