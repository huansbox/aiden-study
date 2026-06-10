"""
資料處理純函式 helpers（PRD 深模組B）。

從 classify.py main 流程抽出的去重、答案合併、unit/subtopic 驗證邏輯，
不依賴外部資源、可獨立 import 測試。期中與期末分類流程共用。
"""
import re


def normalize_text(text: str) -> str:
    """去重鍵：移除所有空白字元後的題目文字。"""
    return re.sub(r"\s+", "", text or "")


def dedupe_by_text(questions: list[dict]) -> list[dict]:
    """
    以正規化題目文字為鍵去重，保留首次出現者（順序不變）。
    """
    seen = set()
    unique = []
    for q in questions:
        key = normalize_text(q["text"])
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique


def merge_answer(official_answer, ai_answer):
    """
    答案合併優先序：有官方答案 → 用官方（needs_review=False）；
    無官方但有 AI 答案 → 用 AI 並標記 needs_review=True；兩者皆無 → (None, False)。

    回傳 (answer, needs_review)。
    """
    if official_answer:
        return official_answer, False
    if ai_answer:
        return str(ai_answer), True
    return None, False


def validate_unit_subtopic(unit, subtopic, valid_units, valid_subtopics) -> bool:
    """
    合法性檢查：unit 須屬 valid_units；當 unit 非 "none" 時 subtopic 須屬 valid_subtopics。
    （unit 為 "none" 時不檢 subtopic，因排除題的 subtopic 一律視為 none。）
    """
    if str(unit) not in valid_units:
        return False
    if str(unit) != "none" and subtopic not in valid_subtopics:
        return False
    return True


# fill_in_blank 空格的合法輸入型態（設計稿「輸入摩擦原則」）
VALID_BLANK_INPUTS = {"number", "comparison", "code", "text"}


def validate_blanks(blanks) -> bool:
    """
    fill_in_blank 的 blanks 欄位驗證：
    - 非空 list，每格為 dict 且 answer 為非空字串
    - input 欄位若存在須屬 VALID_BLANK_INPUTS
    - number 格的 answer 須為數值形式（整數或小數）
    - code 格須帶非空 choices 清單（answer 須在其中）
    """
    if not isinstance(blanks, list) or not blanks:
        return False
    for b in blanks:
        if not isinstance(b, dict):
            return False
        ans = b.get("answer")
        if not isinstance(ans, str) or not ans.strip():
            return False
        inp = b.get("input")
        if inp is None:
            continue
        if inp not in VALID_BLANK_INPUTS:
            return False
        if inp == "number" and not re.fullmatch(r"\d+(\.\d+)?", ans.strip()):
            return False
        if inp == "comparison" and ans.strip() not in {">", "<", "="}:
            return False
        if inp == "code":
            choices = b.get("choices")
            if not isinstance(choices, list) or not choices or ans.strip() not in choices:
                return False
    return True


VALID_VC_OPS = {"add_decimal", "sub_decimal", "long_division"}


def validate_vertical_calc(op, operands, answer) -> bool:
    """
    vertical_calc 的 op/operands/answer 一致性驗證：用 op 實算 operands 必須等於 answer。
    long_division：整數、除數>0、answer={"quotient","remainder"} 且 被除數=除數×商+餘、0<=餘<除數。
    add/sub_decimal：answer 為數字字串，數值等於實算結果。
    """
    if op not in VALID_VC_OPS:
        return False
    if (not isinstance(operands, list) or len(operands) != 2
            or not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in operands)):
        return False
    a, b = operands
    if op == "long_division":
        if not (isinstance(a, int) and isinstance(b, int) and b > 0):
            return False
        if not isinstance(answer, dict):
            return False
        q, r = answer.get("quotient"), answer.get("remainder")
        if not (isinstance(q, int) and isinstance(r, int)):
            return False
        return a == b * q + r and 0 <= r < b
    try:
        expected = round(a + b, 6) if op == "add_decimal" else round(a - b, 6)
        return expected == round(float(answer), 6)
    except (TypeError, ValueError):
        return False


def normalize_for_compare(s: str) -> str:
    """
    text 空格比對的正規化：全形英數/符號轉半形、移除所有空白。
    與網站 isBlankCorrect 的 JS 實作保持一致（雙端各自實作，pytest 鎖此端）。
    """
    out = []
    for ch in (s or ""):
        code = ord(ch)
        if 0xFF01 <= code <= 0xFF5E:        # 全形 ASCII 區
            ch = chr(code - 0xFEE0)
        elif ch == "　":                 # 全形空白
            ch = " "
        out.append(ch)
    return re.sub(r"\s+", "", "".join(out))
