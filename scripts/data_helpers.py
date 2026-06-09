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
