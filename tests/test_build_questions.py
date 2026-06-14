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


def test_social_block_gets_social_subject_and_unit_range():
    existing = [_existing_q("a", 1)]
    social = [_classified_q(1, "10"), _classified_q(2, "12"),
              _classified_q(3, "none"), _classified_q(4, "5")]  # none 與數學 unit 5 皆排除
    merged = build_merged(existing, [], [], social)
    social_q = [q for q in merged if q["subject"] == "social"]
    assert len(social_q) == 2
    assert {q["unit"] for q in social_q} == {10, 12}


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


def _fill_q(number, blanks, unit="5"):
    return {
        "number": number, "unit": unit, "subtopic": "小數的認識",
        "section": "fill_in_blank", "text": "題幹（１）",
        "blanks": blanks, "options": [], "answer": "", "source": "y.pdf",
    }


def test_fill_question_final_schema_has_blanks_no_options():
    qs = [_fill_q(1, [{"answer": "8", "input": "number"}])]
    final_q, skipped = convert_block(qs, set(), "math", {5})
    assert len(final_q) == 1
    q = final_q[0]
    assert q["type"] == "fill_in_blank"
    assert q["blanks"] == [{"answer": "8", "input": "number"}]
    assert "options" not in q and "answer" not in q


def test_fill_all_four_input_types_supported():
    # 013 解禁後 number/comparison/code/text 全部入庫
    qs = [_fill_q(1, [
        {"answer": "8", "input": "number"},
        {"answer": ">", "input": "comparison"},
        {"answer": "丁", "input": "code", "choices": ["甲", "乙", "丙", "丁"]},
        {"answer": "圓心", "input": "text"},
    ])]
    final_q, skipped = convert_block(qs, set(), "math", {5})
    assert len(final_q) == 1
    assert dict(skipped) == {}


def test_fill_unsupported_input_filtered_and_recorded():
    # 過濾機制保留：未來新增型態（如直式 grid）落地前先進解禁清單
    qs = [
        _fill_q(1, [{"answer": "8", "input": "number"}]),
        _fill_q(2, [{"answer": "8", "input": "number"}, {"answer": "格", "input": "grid"}]),
    ]
    filtered = []
    final_q, skipped = convert_block(qs, set(), "math", {5}, filtered)
    assert len(final_q) == 1
    assert skipped["unsupported_input"] == 1
    assert len(filtered) == 1 and "grid" in filtered[0]["filter_reason"]


def test_fill_invalid_blanks_skipped():
    qs = [_fill_q(1, [{"answer": "", "input": "number"}])]
    final_q, skipped = convert_block(qs, set(), "math", {5})
    assert final_q == []
    assert skipped["invalid_blanks"] == 1


def test_image_field_passthrough():
    # 015 看表題：image 欄位需進最終 schema（has_image=False 是「依賴未截圖圖片」的排除旗標，兩者不同）
    q = _fill_q(2, [{"answer": "星期一", "input": "code", "choices": ["星期一", "星期四"]}], unit="9")
    q["subtopic"] = "報讀表格"
    q["image"] = "assets/math/tao112_schedule.png"
    final_q, skipped = convert_block([q], set(), "math", {9})
    assert len(final_q) == 1
    assert final_q[0]["image"] == "assets/math/tao112_schedule.png"
