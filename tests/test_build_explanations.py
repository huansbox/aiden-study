"""
期末說明合併模組（scripts/build_explanations.py）的行為測試。

涵蓋期末 id 集合、驗證（覆蓋/重複/空值/長度/句數）、合併輸出。
"""
from build_explanations import (
    final_exam_ids,
    math_ids,
    social_ids,
    format_answer,
    validate_entries,
    merge_entries,
    MAX_LEN,
)

QUESTIONS = [
    {"id": "mid_1", "unit": 1},
    {"id": "fin_a", "unit": 3},
    {"id": "fin_b", "unit": 4},
    {"id": "math_a", "unit": 5, "subject": "math"},
    {"id": "soc_a", "unit": 10, "subject": "social"},
]


def entry(eid, text="蚯蚓喜歡住在陰暗潮濕的土裡。", verdict="pass"):
    return {"id": eid, "text": text, "verdict": verdict}


# ── 期末 id 集合 ──────────────────────────────────────────

class TestFinalExamIds:
    def test_only_unit_3_and_4(self):
        assert final_exam_ids(QUESTIONS) == {"fin_a", "fin_b"}

    def test_string_unit_coerced(self):
        assert final_exam_ids([{"id": "x", "unit": "3"}]) == {"x"}


class TestMathIds:
    def test_only_math_subject(self):
        assert math_ids(QUESTIONS) == {"math_a"}

    def test_no_subject_field_excluded(self):
        assert math_ids([{"id": "x", "unit": 5}]) == set()


class TestSocialIds:
    def test_only_social_subject(self):
        assert social_ids(QUESTIONS) == {"soc_a"}

    def test_no_subject_field_excluded(self):
        assert social_ids([{"id": "x", "unit": 10}]) == set()


# ── 報告答案格式 ──────────────────────────────────────────

class TestFormatAnswer:
    def test_true_false(self):
        assert format_answer({"type": "true_false", "answer": "false"}) == "✕ 錯"

    def test_multiple_choice_with_options(self):
        q = {"type": "multiple_choice", "answer": "2", "options": ["甲", "乙"]}
        assert format_answer(q) == "(2) 乙"

    def test_fill_in_blank_joins_blanks(self):
        q = {"type": "fill_in_blank", "blanks": [{"answer": "8"}, {"answer": "3"}]}
        assert format_answer(q) == "（1）8；（2）3"

    def test_vertical_calc_plain_answer(self):
        assert format_answer({"type": "vertical_calc", "answer": "18.3"}) == "18.3"

    def test_vertical_calc_quotient_remainder(self):
        q = {"type": "vertical_calc", "answer": {"quotient": 42, "remainder": 4}}
        assert format_answer(q) == "商 42 餘 4"


# ── 驗證 ──────────────────────────────────────────────────

class TestValidate:
    def test_complete_and_clean_passes(self):
        entries = [entry("fin_a"), entry("fin_b")]
        assert validate_entries(entries, {"fin_a", "fin_b"}) == []

    def test_missing_id_reported(self):
        problems = validate_entries([entry("fin_a")], {"fin_a", "fin_b"})
        assert any("缺少" in p and "fin_b" in p for p in problems)

    def test_extra_id_reported(self):
        problems = validate_entries(
            [entry("fin_a"), entry("mid_1")], {"fin_a"}
        )
        assert any("多出" in p and "mid_1" in p for p in problems)

    def test_duplicate_id_reported(self):
        problems = validate_entries(
            [entry("fin_a"), entry("fin_a")], {"fin_a"}
        )
        assert any("重複" in p for p in problems)

    def test_empty_text_reported(self):
        problems = validate_entries([entry("fin_a", text="  ")], {"fin_a"})
        assert any("為空" in p for p in problems)

    def test_too_long_reported(self):
        problems = validate_entries(
            [entry("fin_a", text="很" * (MAX_LEN + 1) + "。")], {"fin_a"}
        )
        assert any("過長" in p for p in problems)

    def test_no_sentence_ending_reported(self):
        problems = validate_entries(
            [entry("fin_a", text="蚯蚓喜歡住在土裡沒有標點")], {"fin_a"}
        )
        assert any("句尾標點" in p for p in problems)

    def test_too_many_sentences_reported(self):
        problems = validate_entries(
            [entry("fin_a", text="對。對。對。對。對。對。")], {"fin_a"}
        )
        assert any("句數過多" in p for p in problems)


# ── 合併 ──────────────────────────────────────────────────

class TestMerge:
    def test_merges_to_id_text_map(self):
        merged = merge_entries([entry("fin_a", text=" 說明甲。 "), entry("fin_b", text="說明乙。")])
        assert merged == {"fin_a": "說明甲。", "fin_b": "說明乙。"}

    def test_duplicate_raises(self):
        import pytest
        with pytest.raises(ValueError):
            merge_entries([entry("fin_a"), entry("fin_a")])
