"""
資料處理 helpers（scripts/data_helpers.py，PRD 深模組B）的行為測試。

涵蓋去重、答案合併（官方優先／AI 補標複查）、unit/subtopic 合法性驗證。
"""
import json
import os

from data_helpers import (
    normalize_text,
    dedupe_by_text,
    merge_answer,
    validate_unit_subtopic,
    validate_blanks,
)


# ── fill_in_blank blanks 驗證 ──────────────────────────

def test_validate_blanks_ok_multi():
    assert validate_blanks([
        {"answer": "8", "input": "number"},
        {"answer": "3", "input": "number"},
    ])


def test_validate_blanks_rejects_empty_or_missing():
    assert not validate_blanks([])
    assert not validate_blanks(None)
    assert not validate_blanks([{"answer": ""}])          # 空 answer
    assert not validate_blanks([{"input": "number"}])     # 缺 answer


def test_validate_blanks_number_must_be_numeric():
    assert validate_blanks([{"answer": "10.2", "input": "number"}])
    assert not validate_blanks([{"answer": "圓心", "input": "number"}])


def test_validate_blanks_input_type_must_be_valid():
    assert not validate_blanks([{"answer": "8", "input": "numpad"}])
    assert validate_blanks([{"answer": "圓心", "input": "text"}])


def test_validate_blanks_code_requires_choices():
    assert not validate_blanks([{"answer": "丁", "input": "code"}])
    assert validate_blanks([{"answer": "丁", "input": "code", "choices": ["甲", "乙", "丙", "丁"]}])
    assert not validate_blanks([{"answer": "戊", "input": "code", "choices": ["甲", "乙"]}])


def test_validate_blanks_without_input_field_ok():
    # raw 階段（classify 前）尚無 input 欄位
    assert validate_blanks([{"answer": "800"}, {"answer": "5"}])

MIDTERM_VALID = {
    "蔬菜從哪裡來", "影響蔬菜生長的因素", "蔬菜生長的變化過程",
    "影響物質變化的因素", "溫度對水的變化", "溫度對其他物質的影響",
}


# ── 去重 ──────────────────────────────────────────────────

class TestDedupe:
    def test_duplicate_text_removed(self):
        qs = [
            {"text": "蚯蚓住在土裡。", "answer": "true"},
            {"text": "蚯蚓住在土裡。", "answer": "true"},
            {"text": "風的強弱稱為風力。", "answer": "true"},
        ]
        assert len(dedupe_by_text(qs)) == 2

    def test_whitespace_insensitive(self):
        # 換行／空白差異視為同一題
        qs = [
            {"text": "蚯蚓住在\n陰暗濕潤的土裡。"},
            {"text": "蚯蚓住在 陰暗濕潤的土裡。"},
        ]
        assert len(dedupe_by_text(qs)) == 1

    def test_keeps_first_occurrence_and_order(self):
        qs = [
            {"text": "甲", "n": 1},
            {"text": "乙", "n": 2},
            {"text": "甲", "n": 3},
        ]
        out = dedupe_by_text(qs)
        assert [q["n"] for q in out] == [1, 2]

    def test_normalize_text(self):
        assert normalize_text("a b\nc") == "abc"
        assert normalize_text("") == ""
        assert normalize_text(None) == ""


# ── 答案合併 ──────────────────────────────────────────────

class TestMergeAnswer:
    def test_official_answer_wins_over_ai(self):
        ans, review = merge_answer("true", "false")
        assert ans == "true"
        assert review is False

    def test_ai_used_when_no_official_and_marked_for_review(self):
        ans, review = merge_answer(None, "3")
        assert ans == "3"
        assert review is True

    def test_ai_answer_coerced_to_str(self):
        ans, review = merge_answer(None, 2)
        assert ans == "2"
        assert review is True

    def test_no_answer_at_all(self):
        ans, review = merge_answer(None, "")
        assert ans is None
        assert review is False

    def test_empty_string_official_treated_as_missing(self):
        ans, review = merge_answer("", "false")
        assert ans == "false"
        assert review is True


# ── unit/subtopic 驗證 ────────────────────────────────────

class TestValidateUnitSubtopic:
    def test_valid_unit_and_subtopic(self):
        assert validate_unit_subtopic("1", "蔬菜從哪裡來", {"1", "2", "none"}, MIDTERM_VALID)

    def test_illegal_unit_rejected(self):
        assert not validate_unit_subtopic("9", "蔬菜從哪裡來", {"1", "2", "none"}, MIDTERM_VALID)

    def test_illegal_subtopic_rejected_when_unit_not_none(self):
        assert not validate_unit_subtopic("1", "亂寫的子主題", {"1", "2", "none"}, MIDTERM_VALID)

    def test_none_unit_skips_subtopic_check(self):
        assert validate_unit_subtopic("none", "whatever", {"1", "2", "none"}, MIDTERM_VALID)

    def test_final_units(self):
        final_valid = {"動物分類", "身體構造", "生存與適應", "觀察方法",
                       "風", "氣溫測量", "雨量降雨", "天氣預報"}
        assert validate_unit_subtopic("3", "動物分類", {"3", "4", "none"}, final_valid)
        assert not validate_unit_subtopic("3", "蔬菜從哪裡來", {"3", "4", "none"}, final_valid)


# ── 回歸：期中 raw 去重數穩定（refactor 不改變行為）──────────

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MIDTERM_RAW = os.path.join(ROOT, "data", "raw_questions.json")


def test_midterm_dedupe_count_stable():
    """classify.py 抽出去重 helper 後，期中去重結果須與 golden 一致（645 unique）。"""
    with open(MIDTERM_RAW, encoding="utf-8") as f:
        raw = json.load(f)
    kept = [q for q in raw if not q["has_image"]
            and not (q["section"] == "multiple_choice"
                     and sum(1 for o in q["options"] if o.strip()) < 2)]
    assert len(dedupe_by_text(kept)) == 645
