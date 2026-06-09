"""
題目解析器（scripts/extract.py 純函式部分）的行為測試。

只驗證外部行為（輸入文字 → 結構化題目），不綁內部實作。fixture 取自
pdfs_期末/ 真實考卷的代表性文字片段（安和 113下答案卷），以及涵蓋各正規化
分支的合成片段。

執行：uv run pytest
"""
import extract
from extract import (
    parse_questions_from_text,
    normalize_tf_answer,
    normalize_mc_answer,
    extract_options,
    detect_question_format,
    is_true_two_column,
    find_section_ranges,
)


# ── 答案正規化 ────────────────────────────────────────────

class TestNormalizeTfAnswer:
    def test_true_variants(self):
        for ch in ["O", "o", "Ｏ", "○", "✓", "ˇ", "v", "V", "✔"]:
            assert normalize_tf_answer(ch) == "true", ch

    def test_false_variants(self):
        for ch in ["X", "x", "Ｘ", "×", "✕", "✗"]:
            assert normalize_tf_answer(ch) == "false", ch

    def test_strips_whitespace(self):
        assert normalize_tf_answer("  O ") == "true"

    def test_empty_or_garbage_is_none(self):
        assert normalize_tf_answer("") is None
        assert normalize_tf_answer(None) is None
        assert normalize_tf_answer("甲") is None


class TestNormalizeMcAnswer:
    def test_circled(self):
        assert normalize_mc_answer("①") == "1"
        assert normalize_mc_answer("④") == "4"

    def test_fullwidth_digits(self):
        assert normalize_mc_answer("１") == "1"
        assert normalize_mc_answer("３") == "3"

    def test_plain_digits(self):
        assert normalize_mc_answer("2") == "2"

    def test_letters(self):
        assert normalize_mc_answer("A") == "1"
        assert normalize_mc_answer("d") == "4"
        assert normalize_mc_answer("Ｂ") == "2"

    def test_out_of_range_or_garbage(self):
        assert normalize_mc_answer("9") is None
        assert normalize_mc_answer("") is None
        assert normalize_mc_answer(None) is None


# ── 選項抽取 ──────────────────────────────────────────────

class TestExtractOptions:
    def test_circled_options_split(self):
        text = "下列何者正確? ①蘋果 ②香蕉 ③葡萄 ④西瓜。"
        assert extract_options(text) == ["蘋果", "香蕉", "葡萄", "西瓜"]

    def test_fewer_than_two_markers_returns_empty(self):
        assert extract_options("沒有選項標記的純文字") == []


# ── 題目格式偵測 ──────────────────────────────────────────

class TestDetectFormat:
    def test_format_a_inline_answer(self):
        # 答案卷：括號在前、內含答案
        assert detect_question_format("（O）1.甲 （X）2.乙 （O）3.丙") == "A"

    def test_format_b_blank_paren(self):
        # 題目卷：題號在前、空括號
        assert detect_question_format("1.（ ）甲 2.（ ）乙 3.( )丙") == "B"


# ── 格式A：答案卷（題目＋官方答案）────────────────────────

FORMAT_A_TF = (
    "一、是非題：\n"
    "（ O）1.不同種類的動物為了適應環境，會有不同的外形特徵。\n"
    "（ X）2.每一種動物的身體構造，都可以分為頭、軀幹和四肢。\n"
    "（ O）3.蚯蚓喜歡生活在陰暗、濕潤的土裡。\n"
)

FORMAT_A_MC = (
    "二、選擇題：\n"
    "（ 2）1.一天中氣溫較高通常是哪一個時段? ①上午 ②中午 ③傍晚 ④半夜。\n"
    "（ 3）2.下列哪一種動物身體外表具有乾燥的硬皮、鱗片或外殼? "
    "①哺乳類 ②兩生類 ③爬蟲類 ④魚類。\n"
)


class TestFormatAAnswerKey:
    def test_tf_text_and_answer(self):
        qs = parse_questions_from_text(FORMAT_A_TF, "ans.pdf")
        tf = [q for q in qs if q["section"] == "true_false"]
        assert len(tf) == 3
        assert tf[0]["answer"] == "true"
        assert tf[1]["answer"] == "false"
        assert "外形特徵" in tf[0]["text"]
        # 答案字元不應殘留在題目文字
        assert not tf[0]["text"].strip().endswith("O")

    def test_mc_text_answer_and_options(self):
        qs = parse_questions_from_text(FORMAT_A_MC, "ans.pdf")
        mc = [q for q in qs if q["section"] == "multiple_choice"]
        assert len(mc) == 2
        assert mc[0]["answer"] == "2"
        assert mc[1]["answer"] == "3"
        assert mc[0]["options"] == ["上午", "中午", "傍晚", "半夜"]
        assert mc[1]["options"] == ["哺乳類", "兩生類", "爬蟲類", "魚類"]


# ── 格式B：題目卷（空括號、答案留空）──────────────────────

FORMAT_B = (
    "一、是非題：\n"
    "1.（ ）蚯蚓喜歡生活在陰暗、濕潤的土裡。\n"
    "2.( )每一種動物都會飛。\n"
    "二、選擇題：\n"
    "1.（ ）哪一種是兩生類? ①龜 ②蛙 ③蜥蜴 ④魚。\n"
)


class TestFormatBQuestionPaper:
    def test_answers_blank(self):
        qs = parse_questions_from_text(FORMAT_B, "q.pdf")
        assert len(qs) == 3
        assert all(q["answer"] is None for q in qs)

    def test_text_and_options_still_extracted(self):
        qs = parse_questions_from_text(FORMAT_B, "q.pdf")
        mc = [q for q in qs if q["section"] == "multiple_choice"][0]
        assert mc["options"] == ["龜", "蛙", "蜥蜴", "魚"]
        assert "兩生類" in mc["text"]


# ── 含圖片題標記 ──────────────────────────────────────────

class TestHasImage:
    def test_image_keyword_marks_has_image(self):
        text = "一、是非題：\n（O）1.如右圖所示，這是哪一種動物的構造。\n"
        q = parse_questions_from_text(text, "x.pdf")[0]
        assert q["has_image"] is True

    def test_no_keyword_not_marked(self):
        text = "一、是非題：\n（O）1.蚯蚓住在土裡。\n"
        q = parse_questions_from_text(text, "x.pdf")[0]
        assert q["has_image"] is False


# ── NON_TARGET 截斷（含「根據題意」「填一填」）─────────────

NON_TARGET_FRAGMENT = (
    "二、選擇題：\n"
    "（ 2）1.一天中氣溫較高通常是哪一個時段? ①上午 ②中午 ③傍晚 ④半夜。\n"
    "（ 2）2.何者不屬於愛護動物的行為? ①善待動物 ②隨意抓鳥 ③認養 ④不破壞。\n"
    "三、填一填：\n"
    "1.下列動物分別屬於哪一類動物，請填代號。 （戊）(1) 金魚。 （丁）(2) 綠繡眼。\n"
    "四、配合題：\n"
    "1.下列氣象預報內容代表哪一種資訊。 （D）(1) 25%。 （C）(2) 西南風。\n"
)


class TestNonTargetTruncation:
    def test_only_choice_questions_extracted(self):
        qs = parse_questions_from_text(NON_TARGET_FRAGMENT, "ans.pdf")
        # 只應抽到 2 道選擇題；填一填／配合題不應成為題目
        assert len(qs) == 2
        assert all(q["section"] == "multiple_choice" for q in qs)

    def test_choice_text_not_polluted_by_non_target(self):
        qs = parse_questions_from_text(NON_TARGET_FRAGMENT, "ans.pdf")
        last = qs[-1]
        assert "填一填" not in last["text"]
        assert "配合題" not in last["text"]
        assert "金魚" not in last["text"]
        assert "西南風" not in last["text"]

    def test_genaodti_is_section_boundary(self):
        # 「根據題意回答問題」應被視為非目標大題邊界
        text = (
            "二、選擇題：\n"
            "（ 1）1.哪一個地點適合測量雨量? ①草地 ②樹蔭 ③陽台 ④天橋。\n"
            "三、根據題意回答問題：\n"
            "1.請依甲乙丙排序。 （甲）(1) 第一。\n"
        )
        qs = parse_questions_from_text(text, "ans.pdf")
        assert len(qs) == 1
        assert "排序" not in qs[0]["text"]


# ── 雙欄偵測（雙欄不切斷題目）─────────────────────────────

class TestTwoColumnDetection:
    def test_continuation_is_not_two_column(self):
        # 右欄只是左欄文字續行（無獨立題號）→ 非雙欄
        left = "一、是非題：\n（O）1.這是一段很長的題目文字，描述了動物的各種特徵與行為模式。"
        right = "牠們會隨著季節改變遷徙的方向，這是左欄題目的續行文字而已。" * 2
        assert is_true_two_column(left, right) is False

    def test_independent_question_sequence_is_two_column(self):
        left = (
            "一、是非題：\n（O）1.動物會適應環境。\n"
            "（X）2.每種動物都會飛行於天空。\n（O）3.蚯蚓住在潮濕的土裡。"
        )
        right = (
            "（O）4.風的強弱稱為風力大小。\n（X）5.夏天經常吹東北季風影響。\n"
            "（O）6.多雲時雲量約占十分之六。\n（X）7.下雨越多對植物越好。"
        )
        assert is_true_two_column(left, right) is True

    def test_matching_answer_column_is_two_column(self):
        # 答案卷右欄＝配合題/填一填答案欄（（X）(n) 型），應判為雙欄，
        # 避免整頁讀取時左右逐行交錯污染左欄選擇題（issue 001 殘留 → 002 修正）
        left = "二、選擇題：\n（2）9.甲? ①東 ②西 ③南 ④北。\n（2）10.乙? ①善 ②隨 ③認 ④不。"
        right = "A.氣溫 B.風力 C.風向\n（D）(1) 25%。\n（C）(2) 西南風。\n（A）(3) 25度。\n（B）(4) 4級。"
        assert is_true_two_column(left, right) is True

    def test_short_right_column_is_not_two_column(self):
        assert is_true_two_column("一、是非題：\n（O）1.甲。", "短") is False


# ── section 範圍 ──────────────────────────────────────────

class TestSectionRanges:
    def test_finds_tf_and_mc_sections(self):
        text = "一、是非題：\n（O）1.甲。\n二、選擇題：\n（1）1.乙? ①A ②B ③C ④D。"
        secs = find_section_ranges(text)
        types = {s["type"] for s in secs}
        assert types == {"true_false", "multiple_choice"}
