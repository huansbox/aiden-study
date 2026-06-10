"""
數學考卷萃取（獨立模組，issues/009）

針對數學「答案卷」（格式A：題目與答案同卷，答案印在前置括號）萃取選擇題。
數學卷固定雙欄排版：逐頁切左右欄、左→右依閱讀順序合併。
不碰自然科 extract.py 的共用 regex（SECTION_PATTERNS / NON_TARGET_SECTION），
只 import 其穩定純函式（normalize_mc_answer / normalize_pua）。

已知坑（設計稿「Pipeline」第 1 步）：PDF 文字層會把分數拆成分子/分母獨立行，
題目區塊內出現無法解釋的純數字行 → 標記分數亂序疑慮，進跳過清單不入庫，
重組 spike 留給 issues/010。

安和卷怪癖：部分題目答案數字逸出括號（`（ ）2.` 而數字浮在上一行）——
純數字行若緊接「空括號題首行」則視為該題答案，否則視為分數亂序疑慮。

用法：
  uv run python scripts/extract_math.py --input pdfs_數學/xxx_答案.pdf [--input ...] \
      --output data/raw_questions_數學.json --skipped data/skipped_questions_數學.json
"""
import sys
import os
import re
import json
import argparse
import logging

import pdfplumber

sys.path.insert(0, os.path.dirname(__file__))
from extract import normalize_mc_answer, normalize_pua

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

# 題首行：（答案）題號. 題幹起始（答案可為空＝逸出括號）
Q_START = re.compile(r"^（\s*([0-9０-９①-⑤]*)\s*）\s*(\d{1,2})\s*[.、．]\s*(.*)$")
# 填充題題首行：題號. 題幹（無前置答案括號）
FILL_Q_START = re.compile(r"^(\d{1,2})\s*[.、．]\s*(.*)$")
# 純數字行（1-3 位）：分數亂序殘渣 或 逸出括號的答案
STRAY_DIGIT = re.compile(r"^\d{1,3}$")
# 大題標頭（一、選擇題 / 二、填填看 / 二、填充題…）
SECTION_HEAD = re.compile(r"^([一二三四五六七八九十])\s*、\s*(\S+)")
OPTION_MARK = re.compile(r"[①②③④⑤]")
# 頁尾/頁首雜訊行（跨頁大題會夾入）。頁碼需帶「第」或「頁」，純數字行是分數殘渣不可誤殺
PAGE_JUNK = re.compile(r"^(第\s*\d+\s*頁?|\d+\s*頁|翻\s*頁.*|考題到此結束.*|姓名[：:（(]?.*|三年\(\s*\)班.*)$")
# 答案括號：內容前後有空白（答案卷慣例），或含「或」的替代答案形式
ANSWER_BRACKET = re.compile(r"[（(](?:\s+([^（）()]+?)\s+|([^（）()]*?或[^（）()]*?))[）)]")
# 圖形依賴題關鍵詞
IMAGE_HINT = re.compile(r"[右下左上]圖|如圖")
# 表格題關鍵詞（看表題 → issues/015 截圖流程）
TABLE_HINT = re.compile(r"統計表|票價表|時刻表|價目表|功課表|完成表格|下表")


def extract_math_text(pdf_path: str) -> str:
    """逐頁切左右欄、左→右合併（數學卷固定雙欄）。"""
    parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            w, h = page.width, page.height
            for box in [(0, 0, w / 2, h), (w / 2, 0, w, h)]:
                parts.append((page.crop(box).extract_text() or "").strip())
    return normalize_pua("\n".join(p for p in parts if p))


def _find_section(text: str, keyword: str) -> list[str]:
    """取出標頭含 keyword 的大題到下一個大題標頭之間的行（剔除頁首尾雜訊行）。"""
    lines = text.splitlines()
    start = None
    ordinal = None
    out = []
    for i, raw_ln in enumerate(lines):
        ln = raw_ln.strip()
        m = SECTION_HEAD.match(ln)
        if m and start is None and keyword in m.group(2):
            start = i + 1
            ordinal = m.group(1)
            continue
        if m and start is not None and m.group(1) != ordinal:
            break
        if start is not None and not PAGE_JUNK.match(ln):
            out.append(raw_ln)
    return out


def _find_mc_section(text: str) -> list[str]:
    """取出「選擇題」大題的行。"""
    return _find_section(text, "選擇")


def _split_options(body: str) -> tuple[str, list[str]]:
    """題目全文 → (題幹, 選項清單)。以 ①②③④⑤ 切分。"""
    marks = list(OPTION_MARK.finditer(body))
    if not marks:
        return body.strip(), []
    stem = body[: marks[0].start()].strip()
    options = []
    for i, m in enumerate(marks):
        seg_end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
        options.append(body[m.end(): seg_end].strip())
    return stem, options


def parse_math_mc(text: str, source: str) -> tuple[list[dict], list[dict]]:
    """
    選擇題大題 → (乾淨題目, 分數亂序疑慮題)。
    回傳題目 schema 同自然科 raw：{source, section, number, text, options, answer, has_image}
    疑慮題 schema：{source, section, number, reason, raw_text}
    """
    lines = _find_mc_section(text)
    raw_questions = []   # [{number, answer_raw, body_lines, suspect_strays}]
    current = None
    pending_digit = None

    for raw_ln in lines:
        ln = raw_ln.strip()
        if not ln:
            continue

        m = Q_START.match(ln)
        if m:
            ans_raw, number, stem_start = m.group(1), m.group(2), m.group(3)
            # 空括號＋前一行是純數字 → 逸出括號的答案（安和怪癖）
            if not ans_raw and pending_digit is not None:
                ans_raw = pending_digit
                pending_digit = None
            elif pending_digit is not None:
                # 未被消化的純數字行 → 歸前一題的分數殘渣
                if current:
                    current["suspect_strays"].append(pending_digit)
                    current["body_lines"].append(pending_digit)
                pending_digit = None
            current = {
                "number": int(number),
                "answer_raw": ans_raw,
                "body_lines": [stem_start],
                "suspect_strays": [],
            }
            raw_questions.append(current)
            continue

        if STRAY_DIGIT.match(ln):
            # 先暫存：可能是下一題逸出括號的答案，也可能是分數殘渣
            if pending_digit is not None and current:
                current["suspect_strays"].append(pending_digit)
                current["body_lines"].append(pending_digit)
            pending_digit = ln
            continue

        if current:
            if pending_digit is not None:
                current["suspect_strays"].append(pending_digit)
                current["body_lines"].append(pending_digit)
                pending_digit = None
            current["body_lines"].append(ln)

    if pending_digit is not None and current:
        current["suspect_strays"].append(pending_digit)
        current["body_lines"].append(pending_digit)

    questions, suspects = [], []
    for rq in raw_questions:
        body = " ".join(rq["body_lines"])
        stem, options = _split_options(body)
        answer = normalize_mc_answer(rq["answer_raw"]) or ""
        if rq["suspect_strays"]:
            suspects.append({
                "source": source,
                "section": "multiple_choice",
                "number": rq["number"],
                "category": "fraction",
                "reason": f"分數亂序疑慮（純數字殘渣行: {','.join(rq['suspect_strays'])}）",
                "raw_text": body,
                "answer": answer,   # 官方答案照常可抽，重組（reflow_math.py）後直接沿用
            })
            continue
        questions.append({
            "source": source,
            "section": "multiple_choice",
            "number": rq["number"],
            "text": stem,
            "options": options,
            "answer": answer,
            "has_image": False,
        })
    return questions, suspects


FW_DIGITS = str.maketrans("０１２３４５６７８９．", "0123456789.")
# 空格佔位符（題幹中的（１）（２）…）
PLACEHOLDERS = "１２３４５６７８９"


def _normalize_blank_answer(raw: str) -> str:
    """括號內答案 → 正規化：全形轉半形；「X 或 Y」取第一個形式。"""
    ans = raw.strip().translate(FW_DIGITS)
    if "或" in ans:
        ans = ans.split("或")[0].strip()
    return ans


def extract_blanks(body: str) -> tuple[str, list[dict]]:
    """題目全文 → (題幹（答案括號換成（１）（２）佔位符）, blanks)。"""
    blanks = []

    def repl(m):
        content = m.group(1) or m.group(2)
        blanks.append({"answer": _normalize_blank_answer(content)})
        return f"（{PLACEHOLDERS[len(blanks) - 1]}）"

    stem = ANSWER_BRACKET.sub(repl, body).strip()
    return stem, blanks


def parse_math_fill(text: str, source: str) -> tuple[list[dict], list[dict]]:
    """
    填填看/填充題大題 → (乾淨題目, 疑慮/延後題)。
    題目 schema：{source, section: "fill_in_blank", number, text(含（１）佔位符),
                 blanks: [{answer}], options: [], answer: "", has_image}
    延後類別（category）：
      fraction  分數亂序 → reflow_math.py 重組
      table     表格題 → issues/015 截圖流程
      no_blanks 無法抽出答案括號（如比較題 ＞＜＝ 直接印在字裡）→ issues/013 人工救回
    """
    lines = _find_section(text, "填")
    raw_questions = []
    current = None
    pending_digit = None

    def flush_pending(into):
        nonlocal pending_digit
        if pending_digit is not None and into:
            into["suspect_strays"].append(pending_digit)
            into["body_lines"].append(pending_digit)
        pending_digit = None

    for raw_ln in lines:
        ln = raw_ln.strip()
        if not ln or re.fullmatch(r"[。，、．！？～]+", ln):
            continue
        m = FILL_Q_START.match(ln)
        # 子題標記 (1)… 開頭的行不是新題；題號需遞增銜接，避免把「800÷5＝160」誤判為題首
        if m and (current is None or int(m.group(1)) == current["number"] + 1):
            # 題界上的殘渣歸屬：前題殘渣為奇數＝分數對未湊齊 → 補給前題；
            # 否則視為新題的分數分子（直式分數分子常浮在題首行上方）
            carry = None
            if pending_digit is not None:
                if current and len(current["suspect_strays"]) % 2 == 1:
                    flush_pending(current)
                else:
                    carry = pending_digit
                    pending_digit = None
            current = {
                "number": int(m.group(1)),
                "body_lines": [m.group(2)],
                "suspect_strays": [],
            }
            raw_questions.append(current)
            if carry is not None:
                current["suspect_strays"].append(carry)
                current["body_lines"].append(carry)
            continue
        if STRAY_DIGIT.match(ln):
            flush_pending(current)
            pending_digit = ln
            continue
        if current:
            flush_pending(current)
            current["body_lines"].append(ln)
    flush_pending(current)

    questions, suspects = [], []
    for rq in raw_questions:
        body = " ".join(rq["body_lines"])

        def defer(category, reason):
            suspects.append({
                "source": source, "section": "fill_in_blank", "number": rq["number"],
                "category": category, "reason": reason, "raw_text": body,
            })

        if rq["suspect_strays"]:
            defer("fraction", f"分數亂序疑慮（純數字殘渣行: {','.join(rq['suspect_strays'])}）")
            continue
        if TABLE_HINT.search(body):
            defer("table", "表格題（待 015 截圖流程）")
            continue

        # 答案括號 → （１）（２）佔位符；括號內容＝官方答案
        stem, blanks = extract_blanks(body)

        if not blanks:
            defer("no_blanks", "無答案括號（比較題或圈選題，待 013 救回）")
            continue
        questions.append({
            "source": source,
            "section": "fill_in_blank",
            "number": rq["number"],
            "text": stem,
            "blanks": blanks,
            "options": [],
            "answer": "",
            "has_image": bool(IMAGE_HINT.search(body)),
        })
    return questions, suspects


def main():
    parser = argparse.ArgumentParser(description="數學考卷萃取（選擇題＋填充題）")
    parser.add_argument("--input", action="append", required=True, help="答案卷 PDF（可重複）")
    parser.add_argument("--output", required=True, help="raw 題目輸出 JSON")
    parser.add_argument("--skipped", default=None, help="疑慮題輸出 JSON（預設 output 同層 skipped_questions_數學.json）")
    args = parser.parse_args()

    all_q, all_skip = [], []
    for pdf_path in args.input:
        source = os.path.basename(pdf_path)
        text = extract_math_text(pdf_path)
        mc_qs, mc_skips = parse_math_mc(text, source)
        no_answer = [q["number"] for q in mc_qs if not q["answer"]]
        if no_answer:
            log.warning(f"{source}: 選擇題 {no_answer} 無答案（括號空白且無逸出數字）")
        fill_qs, fill_skips = parse_math_fill(text, source)
        log.info(f"{source}: 選擇題 {len(mc_qs)}（疑慮 {len(mc_skips)}）、"
                 f"填充題 {len(fill_qs)}（延後 {len(fill_skips)}）")
        all_q.extend(mc_qs + fill_qs)
        all_skip.extend(mc_skips + fill_skips)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(all_q, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 {args.output}（{len(all_q)} 題）")

    skipped_path = args.skipped or os.path.join(os.path.dirname(args.output), "skipped_questions_數學.json")
    with open(skipped_path, "w", encoding="utf-8") as f:
        json.dump(all_skip, f, ensure_ascii=False, indent=2)
    log.info(f"疑慮題已寫入 {skipped_path}（{len(all_skip)} 題）")


if __name__ == "__main__":
    main()
