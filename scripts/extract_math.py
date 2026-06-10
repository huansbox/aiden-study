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
# 純數字行（1-3 位）：分數亂序殘渣 或 逸出括號的答案
STRAY_DIGIT = re.compile(r"^\d{1,3}$")
# 大題標頭（一、選擇題 / 二、填填看 / 二、填充題…）
SECTION_HEAD = re.compile(r"^([一二三四五六七八九十])\s*、\s*(\S+)")
OPTION_MARK = re.compile(r"[①②③④⑤]")


def extract_math_text(pdf_path: str) -> str:
    """逐頁切左右欄、左→右合併（數學卷固定雙欄）。"""
    parts = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            w, h = page.width, page.height
            for box in [(0, 0, w / 2, h), (w / 2, 0, w, h)]:
                parts.append((page.crop(box).extract_text() or "").strip())
    return normalize_pua("\n".join(p for p in parts if p))


def _find_mc_section(text: str) -> list[str]:
    """取出「一、選擇題」到下一個大題標頭之間的行。"""
    lines = text.splitlines()
    start = end = None
    for i, ln in enumerate(lines):
        m = SECTION_HEAD.match(ln.strip())
        if m and start is None and m.group(1) == "一" and "選擇" in m.group(2):
            start = i + 1
        elif m and start is not None and m.group(1) != "一":
            end = i
            break
    if start is None:
        return []
    return lines[start:end]


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
                "reason": f"分數亂序疑慮（純數字殘渣行: {','.join(rq['suspect_strays'])}）",
                "raw_text": body,
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


def main():
    parser = argparse.ArgumentParser(description="數學考卷選擇題萃取")
    parser.add_argument("--input", action="append", required=True, help="答案卷 PDF（可重複）")
    parser.add_argument("--output", required=True, help="raw 題目輸出 JSON")
    parser.add_argument("--skipped", default=None, help="疑慮題輸出 JSON（預設 output 同層 skipped_questions_數學.json）")
    args = parser.parse_args()

    all_q, all_skip = [], []
    for pdf_path in args.input:
        source = os.path.basename(pdf_path)
        text = extract_math_text(pdf_path)
        qs, skips = parse_math_mc(text, source)
        log.info(f"{source}: 選擇題 {len(qs)} 題、疑慮 {len(skips)} 題")
        no_answer = [q["number"] for q in qs if not q["answer"]]
        if no_answer:
            log.warning(f"{source}: 題 {no_answer} 無答案（括號空白且無逸出數字）")
        all_q.extend(qs)
        all_skip.extend(skips)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(all_q, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 {args.output}（{len(all_q)} 題）")

    skipped_path = args.skipped or os.path.join(os.path.dirname(args.output), "skipped_questions_數學.json")
    with open(skipped_path, "w", encoding="utf-8") as f:
        json.dump(all_skip, f, ensure_ascii=False, indent=2)
    log.info(f"疑慮題已寫入 {skipped_path}（{len(all_skip)} 題）")


if __name__ == "__main__":
    main()
