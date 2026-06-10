"""
期末說明合併模組（scripts/build_explanations.py）的行為測試。

涵蓋期末 id 集合、驗證（覆蓋/重複/空值/長度/句數）、合併輸出。
"""
from build_explanations import (
    final_exam_ids,
    validate_entries,
    merge_entries,
    MAX_LEN,
)

QUESTIONS = [
    {"id": "mid_1", "unit": 1},
    {"id": "fin_a", "unit": 3},
    {"id": "fin_b", "unit": 4},
]


def entry(eid, text="蚯蚓喜歡住在陰暗潮濕的土裡。", verdict="pass"):
    return {"id": eid, "text": text, "verdict": verdict}


# ── 期末 id 集合 ──────────────────────────────────────────

class TestFinalExamIds:
    def test_only_unit_3_and_4(self):
        assert final_exam_ids(QUESTIONS) == {"fin_a", "fin_b"}

    def test_string_unit_coerced(self):
        assert final_exam_ids([{"id": "x", "unit": "3"}]) == {"x"}


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
            [entry("fin_a", text="對。對。對。對。對。")], {"fin_a"}
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
