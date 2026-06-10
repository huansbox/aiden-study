"""
分類器可切換學期 config（scripts/classify.py 的 SEMESTERS，PRD 深模組C）測試。

驗證注入式 config 的合法 unit/subtopic 集合正確，且驗證 helper 對期末 config 生效
（非法 subtopic 被擋）。不觸發 AI 呼叫。
"""
from classify import SEMESTERS
from data_helpers import validate_unit_subtopic

FINAL_8_SUBTOPICS = {
    "動物分類", "身體構造", "生存與適應", "觀察方法",
    "風", "氣溫測量", "雨量降雨", "天氣預報",
}


def test_all_configs_present():
    assert set(SEMESTERS) == {"mid", "final", "math"}


def test_final_config_units_and_subtopics():
    final = SEMESTERS["final"]
    assert final["valid_units"] == {"3", "4", "none"}
    assert final["valid_subtopics"] == FINAL_8_SUBTOPICS


def test_midterm_config_units_and_subtopics():
    mid = SEMESTERS["mid"]
    assert mid["valid_units"] == {"1", "2", "none"}
    assert len(mid["valid_subtopics"]) == 6


def test_final_config_accepts_valid_classification():
    final = SEMESTERS["final"]
    assert validate_unit_subtopic("3", "動物分類", final["valid_units"], final["valid_subtopics"])
    assert validate_unit_subtopic("4", "天氣預報", final["valid_units"], final["valid_subtopics"])


def test_final_config_blocks_illegal_subtopic():
    final = SEMESTERS["final"]
    # 期中的子主題在期末 config 下非法
    assert not validate_unit_subtopic("3", "蔬菜從哪裡來", final["valid_units"], final["valid_subtopics"])
    # 期末 unit 4 不可能有期中 unit
    assert not validate_unit_subtopic("1", "動物分類", final["valid_units"], final["valid_subtopics"])


def test_final_config_none_excluded():
    final = SEMESTERS["final"]
    # 範圍外題目 unit=none，subtopic 不檢查
    assert validate_unit_subtopic("none", "none", final["valid_units"], final["valid_subtopics"])


MATH_13_SUBTOPICS = {
    "小數的認識", "小數比大小", "小數加減",
    "圓的構造", "圓規與畫圓", "圓的大小比較",
    "乘除互逆", "乘除計算", "乘除應用",
    "時刻與時間單位", "時制互換", "時間計算",
    "報讀表格",
}


def test_math_config_units_and_subtopics():
    math = SEMESTERS["math"]
    assert math["valid_units"] == {"5", "6", "7", "8", "9", "none"}
    assert math["valid_subtopics"] == MATH_13_SUBTOPICS
    assert validate_unit_subtopic("6", "圓的構造", math["valid_units"], math["valid_subtopics"])
    # 009 的暫時值 none 已非法（010 正式 taxonomy 後 subtopic 必填真值）
    assert not validate_unit_subtopic("7", "none", math["valid_units"], math["valid_subtopics"])
    # 自然科 unit / subtopic 在數學 config 下非法
    assert not validate_unit_subtopic("3", "動物分類", math["valid_units"], math["valid_subtopics"])
    # 範圍外題 unit=none 不檢 subtopic
    assert validate_unit_subtopic("none", "none", math["valid_units"], math["valid_subtopics"])
