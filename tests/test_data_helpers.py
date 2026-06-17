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
    normalize_for_compare,
    validate_vertical_calc,
    clean_question_text,
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


def test_validate_blanks_comparison_answer_set():
    assert validate_blanks([{"answer": ">", "input": "comparison"}])
    assert not validate_blanks([{"answer": "＞", "input": "comparison"}])  # 須先正規化為半形
    assert not validate_blanks([{"answer": "8", "input": "comparison"}])


def test_normalize_for_compare():
    assert normalize_for_compare("　圓 心 ") == "圓心"
    assert normalize_for_compare("１２．５") == "12.5"     # 全形英數轉半形
    assert normalize_for_compare("ＡＢ ｃ") == "ABc"
    assert normalize_for_compare("") == ""
    assert normalize_for_compare(None) == ""


# ── vertical_calc 驗證（op 實算 = answer）──────────────

def test_validate_vertical_calc_addsub():
    assert validate_vertical_calc("sub_decimal", [25, 6.7], "18.3")
    assert validate_vertical_calc("add_decimal", [53.2, 9.8], "63")
    assert not validate_vertical_calc("sub_decimal", [25, 6.7], "18.4")   # 答案錯
    assert not validate_vertical_calc("add_decimal", [25], "25")          # operands 數量錯
    assert not validate_vertical_calc("mul", [2, 3], "6")                 # 非法 op


def test_validate_vertical_calc_long_division():
    assert validate_vertical_calc("long_division", [340, 8], {"quotient": 42, "remainder": 4})
    assert not validate_vertical_calc("long_division", [340, 8], {"quotient": 42, "remainder": 5})
    assert not validate_vertical_calc("long_division", [340, 8], {"quotient": 41, "remainder": 12})  # 餘須<除數


# ── clean_question_text：萃取雜訊清理 ──────────────────────

def test_clean_collapses_cjk_linewrap_spaces():
    # 兩中文字間的斷行假空格移除；連續多組一次收斂
    assert clean_question_text("出 門 遊玩") == "出門遊玩"
    assert clean_question_text("形 狀都不同") == "形狀都不同"
    assert clean_question_text("增加接觸空 氣面積") == "增加接觸空氣面積"


def test_clean_keeps_legit_spaces_around_digits_and_latin():
    # 中文與數字/英文間的空白不是斷行假空格，保留（避免黏成 CAS標章/○1認證）
    assert clean_question_text("選購有 CAS 標章") == "選購有 CAS 標章"
    assert clean_question_text("○1 認證標章") == "○1 認證標章"
    assert clean_question_text("約 27℃ 的天氣") == "約 27℃ 的天氣"


def test_clean_strips_tail_page_furniture():
    assert clean_question_text("讓根有空間生長。 1頁") == "讓根有空間生長。"
    assert clean_question_text("○4 00C。 第3 頁 第4 頁") == "○4 00C。"
    assert clean_question_text("放在冷水中 1 頁") == "放在冷水中"
    assert clean_question_text("④風力 〈背面還有題目喔！〉 1") == "④風力"


def test_clean_keeps_legit_angle_bracket_title_ending():
    # 〈〉 分支限定翻頁字眼才砍；以合法 〈標題〉 結尾的題不可誤砍
    assert clean_question_text("請欣賞兒童影展〈小桃的一天〉") == "請欣賞兒童影展〈小桃的一天〉"


def test_clean_strips_form_field_footer_leak():
    # 考卷頁腳表單欄滲漏：從強 furniture 字眼回溯到最後句末標點後全砍
    assert clean_question_text(
        "莖也會變粗。○ 1 年度第2學期三年級自然科期中試卷年班學生號姓名"
    ) == "莖也會變粗。"
    assert clean_question_text(
        "來照顧。 背面還有題目喔!!! 第1 分數度第一次定期考查試題期座號姓名分數人數家長簽章"
    ) == "來照顧。"
    assert clean_question_text(
        "在傍晚。 1 學期第二次定期評量成家長績簽章"
    ) == "在傍晚。"


def test_clean_form_furniture_conservative_when_no_sentence_end_before_token():
    # 強字眼前無句末標點 → 保守不砍（避免誤食正文）；無此字眼 → 完全不動
    # （仍會套 CJK 空格收斂，故用無內部空格的輸入隔離 strip 行為）
    assert clean_question_text("期中試卷座號姓名") == "期中試卷座號姓名"
    assert clean_question_text("今天天氣晴朗適合出遊。") == "今天天氣晴朗適合出遊。"


def test_clean_does_not_treat_weak_school_words_as_furniture():
    # 「座號／姓名」是社會科學校生活題的合法正文詞，不可當 furniture 砍（code review finding）
    assert clean_question_text("同學的座號代表什麼？他叫什麼姓名？") == "同學的座號代表什麼？他叫什麼姓名？"
    assert clean_question_text("學校用座號方便點名。座號是每個人的編號。") == "學校用座號方便點名。座號是每個人的編號。"


def test_clean_strips_tail_bare_page_number():
    # 句末標點後的孤立裸頁碼（未帶「頁」字）
    assert clean_question_text("④第一節課下課後。 1") == "④第一節課下課後。"
    assert clean_question_text("③棕色 ④白色。 2") == "③棕色 ④白色。"
    assert clean_question_text("丙→乙→甲。 1") == "丙→乙→甲。"


def test_clean_keeps_trailing_number_that_is_real_content():
    # 數字緊接非句末標點（屬內容）不可砍：'答案是 3'、純數字選項
    assert clean_question_text("正方形的邊數是 4") == "正方形的邊數是 4"
    assert clean_question_text("100", strip_tail_furniture=False) == "100"


def test_clean_does_not_clip_legit_sentence_endings():
    # 真句子以句末標點收尾，不被題尾 furniture 規則誤砍
    assert clean_question_text("①東風 ②西風 ③南風 ④北風。") == "①東風 ②西風 ③南風 ④北風。"
    assert clean_question_text("這本故事書共有 100 頁。") == "這本故事書共有 100 頁。"


def test_clean_blank_answer_mode_keeps_tail_digits_page():
    # blank 答案（strip_tail_furniture=False）：'100頁' 結尾不可砍，只壓空格
    assert clean_question_text("100頁", strip_tail_furniture=False) == "100頁"
    assert clean_question_text("下 午", strip_tail_furniture=False) == "下午"


def test_clean_collapses_multiple_ascii_spaces():
    assert clean_question_text("○1  提高溫度") == "○1 提高溫度"


def test_clean_is_idempotent():
    samples = ["讓根有空間生長。 1頁", "出 門 遊玩", "○4 00C。 第3 頁 第4 頁", "①北風。"]
    for s in samples:
        once = clean_question_text(s)
        assert clean_question_text(once) == once


def test_clean_handles_empty_and_none():
    assert clean_question_text("") == ""
    assert clean_question_text(None) is None
    assert not validate_vertical_calc("long_division", [340.5, 8], {"quotient": 42, "remainder": 4})  # 須整數
    assert not validate_vertical_calc("long_division", [340, 8], "42...4")  # answer 須為 dict

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
