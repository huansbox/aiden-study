"""extract_math 數學選擇題 parser 驗證（fixture 取自真實卷面文字）"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from extract_math import (parse_math_mc, parse_math_fill, parse_math_calc,
                          parse_math_word, extract_blanks,
                          _split_options, _find_mc_section)

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


# ── 填充題 parser ──────────────────────────────────────

# 桃子腳填填看節錄：多空格、跨行、比較題（無答案括號）、分數亂序（殘渣跨題界）、代號/文字答案
TAOZIJIAO_FILL = """二、填填看：
1~3題每格1分，4~10題每格2分，共28分
1. 800÷5＝160
→ 160×5＝ ( 800 )
→ 800÷160＝( 5 )
2. 35.8 的十分位數字是( 8 )，十位數字是( 3 )。
3. 現在是 15：57，再過 3 分鐘，是
下午( 4 )時( 0 )分
4. 9 個 1 和 12 個 0.1 合起來是( 10.2 )。
5. 在□裡填入＞、＜或＝
(1) 4 個 1 ＞ 24 個 0.1
(2) 八點三 ＞ 3.8
4
6. 2 個 合起來是( 0.8 ) (請填小數)
10
7. 下列四個圓，哪一個最大？哪一個最小？
填代號。
最大：( 丁 ) 最小：( 丙 )
三、計算題：用直式計算
(1)25－6.7＝(18.3 )
"""

ANHE_FILL = """二、 填充題：每答 2 分，共 34 分
1. 圓心到圓周的距離叫做( 半 )徑。
2. 畫一個直徑 14 公分的圓，圓規要打開( 7 )
公分。
3. 右圖，甲、乙、丙
分別是小、中、大圓的的圓心，
那麼大圓的半徑是 ( 4 )公分。
4. 一袋麵粉可以製作 10 個鬆餅，製作 1 個鬆餅需
要(0.1 或十分之一)袋麵粉，2.8 袋麵粉剛好可
以製作 ( 28 )個鬆餅。
5. 這是三年甲班學生眼科與牙科健康統計表，請
完成表格。 沒近視 ( 8 ) 6 14
三、 計算題：每題 3 分，共 15 分
"""


def test_fill_multi_blank_and_placeholders():
    qs, skips = parse_math_fill(TAOZIJIAO_FILL, "桃.pdf")
    q1 = next(q for q in qs if q["number"] == 1)
    assert q1["text"] == "800÷5＝160 → 160×5＝ （１） → 800÷160＝（２）"
    assert [b["answer"] for b in q1["blanks"]] == ["800", "5"]
    assert q1["section"] == "fill_in_blank"
    q3 = next(q for q in qs if q["number"] == 3)
    assert [b["answer"] for b in q3["blanks"]] == ["4", "0"]


def test_fill_comparison_recovered_as_blanks():
    # 013：比較題（＞＜＝印在字裡無括號）抽成 comparison 空格，不再延後
    qs, skips = parse_math_fill(TAOZIJIAO_FILL, "桃.pdf")
    q5 = next(q for q in qs if q["number"] == 5)
    assert [b["answer"] for b in q5["blanks"]] == [">", ">"]   # fixture 只含 (1)(2) 兩子題
    assert "（１）" in q5["text"] and "填入＞、＜或＝" in q5["text"]  # 指令裡的符號不被誤抽
    assert all(s["number"] != 5 for s in skips)


def test_fill_fraction_stray_crosses_question_boundary():
    qs, skips = parse_math_fill(TAOZIJIAO_FILL, "桃.pdf")
    # 殘渣 4（題首行上方）與 10 都歸 Q6，Q5 不被污染成 fraction
    s6 = next(s for s in skips if s["number"] == 6)
    assert s6["category"] == "fraction"
    assert "4" in s6["reason"] and "10" in s6["reason"]


def test_fill_code_and_text_answers_extracted():
    qs, _ = parse_math_fill(TAOZIJIAO_FILL, "桃.pdf")
    q7 = next(q for q in qs if q["number"] == 7)
    assert [b["answer"] for b in q7["blanks"]] == ["丁", "丙"]


def test_fill_image_flag_and_alt_answer():
    qs, skips = parse_math_fill(ANHE_FILL, "安.pdf")
    q3 = next(q for q in qs if q["number"] == 3)
    assert q3["has_image"] is True   # 「右圖」
    q4 = next(q for q in qs if q["number"] == 4)
    assert [b["answer"] for b in q4["blanks"]] == ["0.1", "28"]  # 「0.1 或十分之一」取 0.1


def test_fill_table_deferred():
    qs, skips = parse_math_fill(ANHE_FILL, "安.pdf")
    s5 = next(s for s in skips if s["number"] == 5)
    assert s5["category"] == "table"


def test_extract_blanks_marker_and_hint_not_answers():
    stem, blanks = extract_blanks("(1) 從寧埔站出發 ( 85 )元 (請填小數)")
    assert [b["answer"] for b in blanks] == ["85"]
    assert "(1)" in stem and "(請填小數)" in stem


# ── 計算題 parser（issues/012）──────────────────────────

TAOZIJIAO_CALC = """三、計算題：用直式計算
1~5題每題3分，6題4分，共19分
(1)25－6.7＝(18.3 ) (2)53.2＋9.8＝( 63 )
(直式做法略) (直式做法略)
(3)( 24 ) ×5＝120 (4)( 448 )÷8＝56
120÷5＝24 56×8＝448
(5)3 時 50 分－2 時 35 分＝( 1 )時 ( 15 )分
(6) 340÷8＝( 42 )…( 4 ) 驗算:
24×8＝336
四、畫畫看，做做看：
"""

ANHE_CALC = """三、 計算題：每題 3 分，共 15 分
1. 0.2 ＋ 29.8 ＝ ( 30 )
2. 27 － 2.5 ＝ ( 24.5 )
3. ( 24 ) × 4 ＝ 96
4. ( 294 ) ÷ 7＝ 42
5. ７０２ ÷ ５ ＝ ( １４０ )．．．( ２ )
用乘法與加法驗算：
140 × 5 ＝ 700
請圈選：( 正確 ， 錯誤 )。
四、 用圓規作圖，並回答問題。
"""


def test_calc_backward_and_time_extracted():
    qs, skips = parse_math_calc(TAOZIJIAO_CALC, "桃.pdf")
    fills = [q for q in qs if q["section"] == "fill_in_blank"]
    assert [(q["number"], [b["answer"] for b in q["blanks"]]) for q in fills] == [
        (3, ["24"]), (4, ["448"]), (5, ["1", "15"]),
    ]
    q5 = fills[-1]
    assert q5["text"] == "3 時 50 分－2 時 35 分＝（１）時 （２）分"
    assert all(q["origin"] == "calc" for q in qs)


def test_calc_vertical_questions_extracted():
    # 014：直式題不再延後，直接轉 vertical_calc schema
    qs, skips = parse_math_calc(TAOZIJIAO_CALC, "桃.pdf")
    vcs = {q["number"]: q for q in qs if q["section"] == "vertical_calc"}
    assert vcs[1]["op"] == "sub_decimal" and vcs[1]["operands"] == [25, 6.7] and vcs[1]["answer"] == "18.3"
    assert vcs[2]["op"] == "add_decimal" and vcs[2]["operands"] == [53.2, 9.8] and vcs[2]["answer"] == "63"
    assert vcs[6]["op"] == "long_division" and vcs[6]["operands"] == [340, 8]
    assert vcs[6]["answer"] == {"quotient": 42, "remainder": 4}
    assert skips == []


def test_calc_anhe_numbered_lines_and_fullwidth_remainder():
    qs, skips = parse_math_calc(ANHE_CALC, "安.pdf")
    fills = [(q["number"], [b["answer"] for b in q["blanks"]])
             for q in qs if q["section"] == "fill_in_blank"]
    assert fills == [(3, ["24"]), (4, ["294"])]
    vcs = {q["number"]: q for q in qs if q["section"] == "vertical_calc"}
    assert vcs[1]["op"] == "add_decimal" and vcs[1]["answer"] == "30"
    assert vcs[2]["op"] == "sub_decimal" and vcs[2]["answer"] == "24.5"
    # 全形數字＋全形連續點的商餘式
    assert vcs[5]["op"] == "long_division" and vcs[5]["operands"] == [702, 5]
    assert vcs[5]["answer"] == {"quotient": 140, "remainder": 2}
    assert skips == []


# ── 應用題 parser（issues/012）──────────────────────────

TAOZIJIAO_WORD = """六、應用題：
每題4分，共20分
1. 一條綠緞帶長 18.8 公尺，一條綠緞帶比一條紅
緞帶短 3.4 公尺， 一條紅緞帶長幾公尺？
18.8＋3.4＝22.2
答：22.2 公尺
2. 珊珊老師分配英語讀者劇場的劇本，每組負責 9 個句子，
請問整份劇本共有幾個句子？
9×4＝36
答：37 個
起
草
3
5
元
作答完畢，
3. 桃藝節時，桃桃買 5 包，付了 200 元，請問一包是多少元？
( ) ×5＝200
答：40 元
4. 太鼓隊在上午 8 時 30 分到達比賽會場，離比賽
開始還有 2 小時，比賽是上午幾時幾分開始？
8 時 30 分 ＋2 時 ＝ 10 時 30 分
答：上午 10 時 30 分
"""


def test_word_single_number_answer():
    qs, skips = parse_math_word(TAOZIJIAO_WORD, "桃.pdf")
    q1 = next(q for q in qs if q["number"] == 1)
    assert [b["answer"] for b in q1["blanks"]] == ["22.2"]
    assert q1["text"].endswith("答：（１） 公尺")
    assert q1["origin"] == "word"
    # 做法行（18.8＋3.4＝22.2）不得進題幹
    assert "18.8＋3.4" not in q1["text"]


def test_word_cross_column_garbage_ignored():
    qs, skips = parse_math_word(TAOZIJIAO_WORD, "桃.pdf")
    q2 = next(q for q in qs if q["number"] == 2)
    # 答：之後到下一題之間的跨欄垃圾（價目表直排字、純數字行）不得污染
    assert "起" not in q2["text"] and "元 作答完畢" not in q2["text"]
    q3 = next(q for q in qs if q["number"] == 3)
    assert [b["answer"] for b in q3["blanks"]] == ["40"]


def test_word_time_answer_two_blanks():
    qs, _ = parse_math_word(TAOZIJIAO_WORD, "桃.pdf")
    q4 = next(q for q in qs if q["number"] == 4)
    assert [b["answer"] for b in q4["blanks"]] == ["10", "30"]
    assert "答：上午 （１） 時 （２） 分" in q4["text"].replace("（１）時", "（１） 時")


def test_word_complex_answer_deferred():
    sample = """五、 把做法和答案記下來：每題 5 分
1. 跑得比較快的是哪一班？快了幾秒鐘？
308－288＝20
答：丙班快
20 秒鐘
"""
    qs, skips = parse_math_word(sample, "安.pdf")
    assert qs == []
    assert skips[0]["category"] == "complex_answer"
