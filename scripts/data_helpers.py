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


# ── 萃取雜訊清理（build 階段套用，display 用）─────────────────
# CJK 統一表意文字：擴展 A（U+3400–4DBF）＋主區（U+4E00–9FFF）＋相容表意字（U+F900–FAFF，
# 台灣 Big5 系 PDF 嵌入字偶見）。自然/數學/社會題幹用字皆落此區。
_CJK = "㐀-䶿一-鿿豈-﫿"
# 兩個中文字之間的空白＝PDF 斷行假空格。零寬斷言（lookbehind/lookahead）不消耗邊界字，
# 連續多組（「出 門 遊」）一次掃描即收斂。含半形空白、tab、全形空白。
_CJK_GAP = re.compile(f"(?<=[{_CJK}])[ \\t\\u3000]+(?=[{_CJK}])")
# 題尾頁碼／〈翻頁提示〉 furniture（錨定字串結尾）：
#   「第?N頁/面」一段以上（'1頁'、'第3 頁 第4 頁'）｜含翻頁字眼的「〈…〉」導語後可帶孤立頁碼（'〈背面還有題目喔！〉 1'）。
# 〈〉 分支限定內含翻頁 furniture 關鍵字才砍，避免誤砍以合法 〈某標題〉 結尾的題（資料中確有〈〉合法用例）。
# 真句子以句末標點（。？！）收尾、不落在此 pattern 內 → 不被誤砍（全庫反查 0 誤砍）。
# 表單欄滲漏（'年度第2學期…座號 姓名'）等不規則雜訊不在此，走人工/agent 複審。
_TAIL_FURNITURE = re.compile(
    r"\s*(?:(?:第?\s*\d+\s*[頁面]\s*)+|〈[^〉]*(?:背面|還有題目|尚有試題|翻頁|繼續作答)[^〉]*〉\s*\d*)\s*$"
)
# 句末標點後的孤立裸頁碼（'…白色。 2' → '…白色。'）：頁碼未帶「頁/面」字、_TAIL_FURNITURE 漏接。
# lookbehind 保留句末標點本身；限定前置為句末標點，故純數字選項（'5'、'100'，無前置句末標點）不受影響。
# ⚠️ 這是 empirical guard 非 logical：全庫反查此型 14 處全為頁碼、0 合法案例。成立前提＝「題幹本身不以
# 句末標點+空白+1~2位數字結尾」；blank 答案已由 strip_tail_furniture=False 隔離。未來若出現此型合法題幹須重審。
_TAIL_BARE_PAGENUM = re.compile(r"(?<=[。？！」』】])\s+\d{1,2}\s*$")
# 考卷頁腳「表單欄」滲漏的強 furniture 字眼。刻意只收三下題幹正文「客觀上不可能出現」的詞——
# 不含「座號／學生號／姓名」這類弱詞（社會科學校生活題正文可能合法出現，如「同學的座號代表什麼？」），
# 否則弱詞被命中會漏砍或誤截正文（code review finding，2026-06-17）。全庫反查：這些強詞只命中頁腳滲漏題。
# 命中後砍除：從「最後一個」強詞往前回溯到其前最後一個句末標點之後全部刪掉（'…變粗。○1 …期中試卷…姓名' → '…變粗。'）。
# 找不到前置句末標點時保守不砍（避免誤食正文）。句末標點不含 ASCII '.'（避開小數點 136.3）。
_FORM_FURNITURE = re.compile(r"期中試卷|期末試卷|定期考查|定期評量|考查試題|家長簽章|評量範圍")
_SENTENCE_END = "。？！」』】"


def _strip_form_furniture(s: str) -> str:
    last = None
    for last in _FORM_FURNITURE.finditer(s):
        pass  # 取最後一個 token：頁腳永遠在尾
    if last is None:
        return s
    head = s[:last.start()]
    cut = max((head.rfind(c) for c in _SENTENCE_END), default=-1)
    if cut < 0:
        return s  # 強詞前無句末標點 → 保守不砍
    return s[:cut + 1].rstrip()


def clean_question_text(s: str, strip_tail_furniture: bool = True) -> str:
    """萃取雜訊清理（純函式、冪等）：

    1) strip_tail_furniture：砍頁腳表單欄滲漏（'…變粗。…期中試卷…姓名' → '…變粗。'）
       與題尾頁碼／〈背面…〉 furniture（'…生長。 1頁' → '…生長。'）
    2) 移除兩中文字間的 PDF 斷行假空格（'出 門 遊玩' → '出門遊玩'）
    3) 連續半形空白壓成單一、去頭尾空白

    僅處理機械可證安全的型態。blank 答案請傳 strip_tail_furniture=False
    （'100頁' 之類合法答案結尾不可砍；blank 比對本就忽略空白，此處純為顯示美觀）。
    """
    if not s:
        return s
    if strip_tail_furniture:
        s = _strip_form_furniture(s)
        s = _TAIL_FURNITURE.sub("", s)
        s = _TAIL_BARE_PAGENUM.sub("", s)
    s = _CJK_GAP.sub("", s)
    s = re.sub(r"[ \t]{2,}", " ", s).strip()
    return s
