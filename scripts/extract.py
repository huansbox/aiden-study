"""
PDF 考卷題目萃取器
從 docs/ 底下的 PDF 考卷中萃取是非題和選擇題，輸出為 data/raw_questions.json

支援兩種題目格式：
  格式A (答案在前): （O）1. 題目文字  or  （3）1. 題目文字
  格式B (題號在前): 1.（ ）題目文字    or  1.( ) 題目文字
"""
import pdfplumber
import sys
import os
import re
import json
import argparse
import logging

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# ── 常數 ──────────────────────────────────────────────

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw_questions.json")

# 圖片關鍵詞（用於 has_image 文字判斷）
IMAGE_KEYWORDS = re.compile(
    r"如[右左下上]圖|見圖|看圖|圖[一二三四五六七八九十\d（\(]|附圖|下圖|右圖|左圖|上圖|請看圖"
)

# 題型 section header 模式
# 行錨定替代式：路上111 用阿拉伯數字編大題（「1 是非題(每題 4 分…)」），且「選擇題(」的
# 前綴數字被雙欄打散 → 補「行首＋可選單一數字＋題型名＋(」形式（要求左括號降低誤判）
SECTION_PATTERNS = {
    "true_false": re.compile(
        r"[一二三四五六壹貳參][\s、.．]+"
        r"(?:是非題|判斷題|是非|對的寫[OoＯ○].*錯的寫?[XxＸ×✕]|對的打[OoＯ○].*錯的打[XxＸ×✕]|"
        r"正確的寫[OoＯ○].*錯誤的打?[XxＸ×✕]|正確的寫○.*錯誤的打×|寫[OoＯ○]或[XxＸ×✕])"
        r"|^[ \t]*\d?[ \t]*是非題[\(（]",
        re.IGNORECASE | re.MULTILINE,
    ),
    "multiple_choice": re.compile(
        r"[一二三四五六壹貳參][\s、.．]+"
        r"(?:選擇題|單選題|選出正確的答案|選出最適合的答案|選出最適當的答案)"
        r"|^[ \t]*\d?[ \t]*選擇題[\(（]",
        re.IGNORECASE | re.MULTILINE,
    ),
}

# 非目標 section（用於截斷）
# 期末新增：填一填、根據題意（桃子腳/安和答案卷用來界定單選題大題結尾，見 issues/001）
NON_TARGET_SECTION = re.compile(
    r"[一二三四五六七八壹貳參肆伍][\s、.．]+"
    r"(?:綜合[題練習]|配合題|連連看|填[填充]看|填一填|做一做|閱讀[題測驗]|"
    r"去吧|根據題[目意]|科學閱讀|科普閱讀|填填看|綜合應用題|連連看|題組|"
    r"勾選[題看]?|排[出列][^\n]{0,6}順序|生活情境[題]?)"  # 社會卷：勾選題、排出順序、生活情境題（誤入選擇題的非目標大題）
    r"|請連連看|做一做"  # 路上111 非目標大題用阿拉伯數字編號，靠題幹內指示語切界
)


# ── 答案正規化 ──────────────────────────────────────────

TF_CHARS = "OoＯ○✓ˇvV✔XxＸ×✕✗╳"

def normalize_tf_answer(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if raw in ("O", "o", "Ｏ", "○", "✓", "ˇ", "v", "V", "✔"):
        return "true"
    if raw in ("X", "x", "Ｘ", "×", "✕", "✗", "╳"):
        return "false"
    return None


def normalize_mc_answer(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    mapping = {
        "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5",
        "１": "1", "２": "2", "３": "3", "４": "4", "５": "5",
        "A": "1", "B": "2", "C": "3", "D": "4",
        "Ａ": "1", "Ｂ": "2", "Ｃ": "3", "Ｄ": "4",
        "a": "1", "b": "2", "c": "3", "d": "4",
    }
    if raw in mapping:
        return mapping[raw]
    if raw.isdigit() and 1 <= int(raw) <= 5:
        return raw
    return None


# ── PDF 萃取 ──────────────────────────────────────────

def is_true_two_column(left_text: str, right_text: str) -> bool:
    """
    判斷是否為真正的雙欄排版（左右各有獨立的題目序列）。
    若右欄有獨立的題號模式（如 (ans)1. 或 1.( ) 或 section header），
    則認為是雙欄。否則右欄只是左欄的文字續行。
    """
    if len(right_text) < 50:
        return False

    # 右欄有 section header → 雙欄
    for pat in SECTION_PATTERNS.values():
        if pat.search(right_text):
            return True
    if NON_TARGET_SECTION.search(right_text):
        return True

    # 右欄有題號序列 → 雙欄
    # 格式A: (ans)number.
    fmt_a = re.findall(r"[（\(]\s*[" + TF_CHARS + r"\d１-５①-⑤]*\s*[）\)]\s*\d{1,2}\s*[.．、]", right_text)
    # 格式B: number.( )
    fmt_b = re.findall(r"(?:^|\n)\s*\d{1,2}\s*[.．、]\s*[（\(]", right_text)
    if len(fmt_a) >= 3 or len(fmt_b) >= 3:
        return True

    # 答案卷右欄常是配合題/填一填的「答案＋子題號」欄（如 （D）(1) 25%、（戊）(1) 金魚），
    # 不含一般題號序列。偵測此型，避免整頁讀取時左右欄逐行交錯污染左欄選擇題。
    matching_ans = re.findall(
        r"[（\(]\s*[A-Za-z一-鿿]\s*[）\)]\s*[（\(]\s*\d{1,2}\s*[）\)]", right_text
    )
    return len(matching_ans) >= 3


# 某些字體把選項標記 ①②③④⑤ 對映到私用區（PUA）碼位 U+F06A–F06E（如彰化廣興111
# 題目卷）。pdfplumber 抽出的是 PUA 碼點，選項偵測與顯示都會壞掉，先正規化回 ①②③④⑤。
PUA_OPTION_MAP = {chr(0xF06A + i): m for i, m in enumerate("①②③④⑤")}


def normalize_pua(text: str) -> str:
    for k, v in PUA_OPTION_MAP.items():
        text = text.replace(k, v)
    return text


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    萃取 PDF 全文，自動處理雙欄排版。
    對每頁獨立判斷是否為雙欄，雙欄時左→右合併，否則用整頁文字。
    """
    pdf = pdfplumber.open(pdf_path)
    all_text = []

    for page in pdf.pages:
        w, h = page.width, page.height
        left_crop = page.crop((0, 0, w / 2, h))
        right_crop = page.crop((w / 2, 0, w, h))
        left_text = (left_crop.extract_text() or "").strip()
        right_text = (right_crop.extract_text() or "").strip()

        if is_true_two_column(left_text, right_text):
            all_text.append(left_text)
            all_text.append(right_text)
        else:
            full_text = (page.extract_text() or "").strip()
            all_text.append(full_text)

    pdf.close()
    return normalize_pua("\n".join(all_text))


# ── 題目格式偵測 ──────────────────────────────────────────

def detect_question_format(text: str) -> str:
    """
    偵測題目格式。
    格式A: (answer)number. text  → 括號在前
    格式B: number.(空括號) text  → 題號在前
    """
    # 格式A: （O）1. or （3）1.
    fmt_a = re.findall(r"[（\(]\s*[" + TF_CHARS + r"\d１-５①-⑤]\s*[）\)]\s*\d{1,2}\s*[.．、]", text)
    # 格式B: 1.（ ） or 1.( )
    fmt_b = re.findall(r"\d{1,2}\s*[.．、]\s*[（\(]\s*[）\)]", text)

    if len(fmt_a) > len(fmt_b):
        return "A"
    elif len(fmt_b) > 0:
        return "B"
    else:
        # 也可能是格式A但括號內為空
        fmt_a_empty = re.findall(r"[（\(]\s*[）\)]\s*\d{1,2}\s*[.．、]", text)
        if len(fmt_a_empty) > 0:
            return "A"
    return "A"  # 預設


# ── 題目解析 ──────────────────────────────────────────

def find_section_ranges(text: str) -> list[dict]:
    """找出文字中的是非題和選擇題 section 範圍。"""
    sections = []
    for stype, pattern in SECTION_PATTERNS.items():
        for m in pattern.finditer(text):
            sections.append({"type": stype, "start": m.start(), "end": None, "header": m.group()})

    non_targets = [m.start() for m in NON_TARGET_SECTION.finditer(text)]
    sections.sort(key=lambda s: s["start"])
    all_starts = sorted([s["start"] for s in sections] + non_targets)

    for sec in sections:
        later = [s for s in all_starts if s > sec["start"]]
        sec["end"] = later[0] if later else len(text)

    return sections


def parse_questions_format_a(text: str, source: str, section_type: str) -> list[dict]:
    """
    解析格式A: (answer)number. text
    同時支援括號內有答案和空括號的情況。
    """
    questions = []
    full_text = " ".join(l.strip() for l in text.split("\n"))

    if section_type == "true_false":
        # 匹配 (answer?)number.
        pattern = re.compile(
            r"[（\(]\s*([" + TF_CHARS + r"]?)\s*[）\)]"
            r"\s*(\d{1,2})\s*[.．、]\s*"
        )
    else:
        # 選擇題: (answer?)number.
        pattern = re.compile(
            r"[（\(]\s*(\d{1,2}|[①②③④⑤]|[１２３４５]|[ＡＢＣＤ]|[a-dA-D]|)\s*[）\)]"
            r"\s*(\d{1,2})\s*[.．、]\s*"
        )

    matches = list(pattern.finditer(full_text))
    for i, m in enumerate(matches):
        answer_raw = m.group(1)
        number = int(m.group(2))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        q_text = full_text[start:end].strip()

        # 清理尾部殘留的下一題 pattern
        q_text = re.sub(r"\s*[（\(]\s*[" + TF_CHARS + r"\d１-５①-⑤]*\s*[）\)]\s*\d{1,2}\s*[.．、]?\s*$", "", q_text)
        q_text = re.sub(r"\s+", " ", q_text).strip()

        if section_type == "true_false":
            answer = normalize_tf_answer(answer_raw)
            # 嘗試尾部答案 (如 成德108: ...部分。x)
            if not answer:
                trail = re.search(r"[。）\)]\s*([" + TF_CHARS + r"])\s*$", q_text)
                if trail:
                    answer = normalize_tf_answer(trail.group(1))
                    q_text = q_text[:trail.start(1)].strip()
            # 清理尾部孤立答案字元
            q_text = re.sub(r"\s*[" + TF_CHARS + r"]\s*$", "", q_text).strip()
            options = []
        else:
            answer = normalize_mc_answer(answer_raw)
            options = extract_options(q_text)

        has_image = bool(IMAGE_KEYWORDS.search(q_text))

        # 確保文字不為空
        if not q_text:
            continue

        questions.append({
            "source": source,
            "section": section_type,
            "number": number,
            "text": q_text,
            "options": options,
            "answer": answer,
            "has_image": has_image,
        })

    return questions


def parse_questions_format_b(text: str, source: str, section_type: str) -> list[dict]:
    """
    解析格式B: number.(空括號) text
    如: 1.（ ）種子在土壤中要埋得深一些
        1.( ) 大部分蔬菜喜歡生長在...
    """
    questions = []
    full_text = " ".join(l.strip() for l in text.split("\n"))

    # 匹配 number.( ) 或 number.（ ）
    pattern = re.compile(
        r"(\d{1,2})\s*[.．、]\s*[（\(]\s*([" + TF_CHARS + r"\d１-５①-⑤ＡＢＣＤ]*)\s*[）\)]\s*"
    )

    matches = list(pattern.finditer(full_text))
    for i, m in enumerate(matches):
        number = int(m.group(1))
        answer_raw = m.group(2)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        q_text = full_text[start:end].strip()

        # 清理尾部殘留
        q_text = re.sub(r"\s*\d{1,2}\s*[.．、]\s*[（\(]\s*[）\)]\s*$", "", q_text)
        q_text = re.sub(r"\s+", " ", q_text).strip()

        if section_type == "true_false":
            answer = normalize_tf_answer(answer_raw)
            options = []
        else:
            answer = normalize_mc_answer(answer_raw)
            options = extract_options(q_text)

        has_image = bool(IMAGE_KEYWORDS.search(q_text))

        if not q_text:
            continue

        questions.append({
            "source": source,
            "section": section_type,
            "number": number,
            "text": q_text,
            "options": options,
            "answer": answer,
            "has_image": has_image,
        })

    return questions


def extract_options(text: str) -> list[str]:
    """從題目文字中提取選項列表"""
    patterns = [
        re.compile(r"○\s*([1-5１-５])"),  # ○1 ○2 ○3 ○4
        re.compile(r"([①②③④⑤])"),  # ①②③④
        re.compile(r"[\(（]([1-5])[\)）]"),  # (1)(2)(3)(4)（大墩112 #9；僅前兩種都失敗才試）
    ]

    for pat in patterns:
        markers = list(pat.finditer(text))
        if len(markers) >= 2:
            opts = []
            for j, mk in enumerate(markers):
                opt_start = mk.end()
                opt_end = markers[j + 1].start() if j + 1 < len(markers) else len(text)
                opt_text = text[opt_start:opt_end].strip().rstrip("。，、；")
                opts.append(opt_text)
            return opts

    return []


# ── 主流程 ──────────────────────────────────────────

def parse_questions_from_text(text: str, source: str) -> list[dict]:
    """
    純函式：考卷純文字 → 結構化題目清單。

    封裝 section 切分、格式A/B 偵測、題目切分、答案正規化、選項抽取、
    has_image 判斷與 NON_TARGET 截斷。不讀 PDF、不 logging，可獨立測試。
    """
    if not text.strip():
        return []

    questions = []
    for sec in find_section_ranges(text):
        sec_text = text[sec["start"]:sec["end"]]
        fmt = detect_question_format(sec_text)
        if fmt == "A":
            qs = parse_questions_format_a(sec_text, source, sec["type"])
        else:
            qs = parse_questions_format_b(sec_text, source, sec["type"])
        questions.extend(qs)

    return questions


def process_pdf(pdf_path: str) -> list[dict]:
    """處理單一 PDF（不純：讀檔 + logging），委派解析給純函式。"""
    source = os.path.basename(pdf_path)
    log.info(f"處理: {source}")

    text = extract_text_from_pdf(pdf_path)
    if not text.strip():
        log.warning(f"  {source}: 無法萃取文字（可能為純圖片 PDF），跳過")
        return []

    sections = find_section_ranges(text)
    if not sections:
        log.warning(f"  {source}: 未偵測到是非題/選擇題 section header")
    for sec in sections:
        sec_text = text[sec["start"]:sec["end"]]
        log.info(f"  {sec['type']} (格式{detect_question_format(sec_text)})")

    questions = parse_questions_from_text(text, source)
    log.info(f"    → {len(questions)} 題")
    return questions


def main():
    parser = argparse.ArgumentParser(description="PDF 考卷題目萃取器")
    parser.add_argument("--input", nargs="+", default=[DOCS_DIR],
                        help="PDF 檔或目錄（可多個；預設 docs/）")
    parser.add_argument("--output", default=OUTPUT_PATH, help="輸出 JSON 路徑")
    args = parser.parse_args()

    pdfs = []
    for item in args.input:
        p = os.path.abspath(item)
        if os.path.isdir(p):
            pdfs.extend(sorted(os.path.join(p, f) for f in os.listdir(p) if f.endswith(".pdf")))
        else:
            pdfs.append(p)
    log.info(f"共找到 {len(pdfs)} 份 PDF")

    all_questions = []
    for f in pdfs:
        qs = process_pdf(f)
        all_questions.extend(qs)

    # 統計
    total = len(all_questions)
    with_answer = sum(1 for q in all_questions if q["answer"])
    no_answer = total - with_answer
    with_image = sum(1 for q in all_questions if q["has_image"])
    tf_count = sum(1 for q in all_questions if q["section"] == "true_false")
    mc_count = sum(1 for q in all_questions if q["section"] == "multiple_choice")
    mc_with_opts = sum(1 for q in all_questions if q["section"] == "multiple_choice" and len(q["options"]) >= 2)

    log.info(f"\n=== 統計 ===")
    log.info(f"總題數: {total}")
    log.info(f"是非題: {tf_count}, 選擇題: {mc_count}")
    log.info(f"有答案: {with_answer} ({with_answer/total*100:.1f}%), 無答案: {no_answer}" if total else "無題目")
    log.info(f"選擇題有選項: {mc_with_opts}/{mc_count}")
    log.info(f"有圖片: {with_image}")

    # 輸出
    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    log.info(f"已輸出至 {output_path}")


if __name__ == "__main__":
    main()
