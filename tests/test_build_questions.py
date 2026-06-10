"""build_questions.build_merged 三來源結構驗證"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from build_questions import build_merged, convert_block


def _existing_q(qid, unit, **over):
    q = {
        "id": qid, "unit": unit, "subtopic": "none", "type": "multiple_choice",
        "text": "題目", "options": ["甲", "乙"], "answer": "1", "source": "x.pdf",
    }
    q.update(over)
    return q


def _classified_q(number, unit, source="y.pdf", **over):
    q = {
        "number": number, "unit": unit, "subtopic": "none",
        "section": "multiple_choice", "text": "題目",
        "options": ["甲", "乙"], "answer": "1", "source": source,
    }
    q.update(over)
    return q


def test_empty_math_source_produces_zero_math_questions():
    existing = [_existing_q("a", 1), _existing_q("b", 2)]
    merged = build_merged(existing, [], [])
    assert len(merged) == 2
    assert all(q["subject"] == "science" for q in merged)


def test_subject_backfill_preserves_id_unit():
    existing = [_existing_q("a", 1), _existing_q("c", 3)]  # 既有期末題會被重建剔除
    final = [_classified_q(1, "3")]
    merged = build_merged(existing, final, [])
    assert [(q["id"], q["unit"]) for q in merged] == [("a", 1), ("y_multiple_choice_1", 3)]
    assert merged[0]["subject"] == "science"
    assert merged[1]["subject"] == "science"


def test_math_block_gets_math_subject_and_unit_range():
    existing = [_existing_q("a", 1)]
    math = [_classified_q(1, "7"), _classified_q(2, "none"), _classified_q(3, "3")]
    merged = build_merged(existing, [], math)
    math_q = [q for q in merged if q["subject"] == "math"]
    assert len(math_q) == 1  # none 與超出 5-9 值域的都排除
    assert math_q[0]["unit"] == 7


def test_convert_block_filters_image_and_few_options():
    qs = [
        _classified_q(1, "5", has_image=True),
        _classified_q(2, "5", options=["甲", " "]),
        _classified_q(3, "5"),
    ]
    final_q, skipped = convert_block(qs, set(), "math", {5})
    assert len(final_q) == 1
    assert skipped["has_image"] == 1
    assert skipped["few_options"] == 1


def test_convert_block_empty_input():
    final_q, skipped = convert_block([], set(), "math", {5})
    assert final_q == []
    assert dict(skipped) == {}
