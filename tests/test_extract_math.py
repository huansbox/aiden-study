"""extract_math 數學選擇題 parser 驗證（fixture 取自真實卷面文字）"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from extract_math import parse_math_mc, _split_options, _find_mc_section

# 桃子腳 112下 答案卷（左欄節錄）：乾淨題 + 分數亂序題（殘渣行 1 / 8）
TAOZIJIAO_SAMPLE = """一、選擇題：
每題2分，共10分
（ 1 ）1.一個圓有幾條直徑？
① 無限多條 ②1 條 ③5 條 ④10 條
（ 4 ）3.下面哪一個選項錯誤？
① 0.4 和 0.6 合起來是 1
② 10 個 0.1 是 1.0
③ 9 個 0.1 合起來是 0.9
1
④ 8 個 0.1 是
8
（ 2 ）4.文具店一塊橡皮擦原價 10 元，現在特價
8 元，老師買了一些，共花了 80 元，老師
買了多少塊橡皮擦？
① 8 塊 ②10 塊 ③12 塊 ④6 塊
二、填填看：
1~3題每格1分，4~10題每格2分，共28分
1. 800÷5＝160
"""

# 安和 113下 答案卷節錄：答案數字逸出括號的怪癖（（ ）2. 的答案 2 浮在上一行）
ANHE_SAMPLE = """一、 選擇題：每題 2 分，共 16 分
（ 3 ）1. 建議國小學童每日至少飲用 1.5 公升的水，
下列是某日的喝水記錄，誰喝的水還不夠
？ ①弟弟喝了 1.5 公升 ②姊姊喝了
2.3 公升 ③哥哥喝了 0.7 公升 ④妹妹
喝了 1.8 公升
2
（ ）2. 把圓平分成兩半的摺線剛好是圓的什麼？
①圓周 ②直徑 ③圓心 ④半徑
二、 填充題：每答 2 分，共 34 分
1. 圓心到圓周的距離叫做( 半 )徑。
"""


def test_taozijiao_clean_questions():
    qs, skips = parse_math_mc(TAOZIJIAO_SAMPLE, "桃子腳.pdf")
    assert [q["number"] for q in qs] == [1, 4]
    q1 = qs[0]
    assert q1["text"] == "一個圓有幾條直徑？"
    assert q1["options"] == ["無限多條", "1 條", "5 條", "10 條"]
    assert q1["answer"] == "1"
    assert q1["section"] == "multiple_choice"
    q4 = qs[1]
    assert q4["answer"] == "2"
    assert len(q4["options"]) == 4
    assert q4["options"][3] == "6 塊"
    # 跨行題幹合併
    assert "共花了 80 元" in q4["text"]


def test_taozijiao_fraction_suspect_skipped():
    qs, skips = parse_math_mc(TAOZIJIAO_SAMPLE, "桃子腳.pdf")
    assert len(skips) == 1
    s = skips[0]
    assert s["number"] == 3
    assert "1" in s["reason"] and "8" in s["reason"]
    # 殘渣保留在 raw_text 供 010 重組
    assert "8 個 0.1 是" in s["raw_text"]


def test_anhe_escaped_bracket_answer():
    qs, skips = parse_math_mc(ANHE_SAMPLE, "安和.pdf")
    assert len(qs) == 2 and len(skips) == 0
    q2 = qs[1]
    assert q2["number"] == 2
    assert q2["answer"] == "2"  # 逸出括號的答案被復原
    assert q2["options"] == ["圓周", "直徑", "圓心", "半徑"]


def test_mc_section_bounded_by_next_section():
    qs, _ = parse_math_mc(ANHE_SAMPLE, "安和.pdf")
    # 填充題的「1. 圓心到圓周…」不得混入選擇題
    assert all("圓心到圓周" not in q["text"] for q in qs)


def test_split_options_no_marks():
    stem, options = _split_options("畫一個直徑 12 公分的圓")
    assert stem == "畫一個直徑 12 公分的圓"
    assert options == []


def test_find_mc_section_missing():
    assert _find_mc_section("二、填填看：\n1. 沒有選擇題") == []
