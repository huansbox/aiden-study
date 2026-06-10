"""
合併期末說明批次結果 → docs/explanations.json ＋ 家長抽查報告

輸入：data/exp_results/batch_*.json（workflow 審核後的批次結果，
每筆 {id, text, verdict: pass|fixed, reason?}）。

驗證：id 必須與 docs/questions.json 的期末題（unit 3/4）集合完全一致、
無重複、無空白說明、長度與句數在約束內。驗證全過才寫出，冪等可重跑。

產出：
  - docs/explanations.json：{question_id: 說明文字}（前端 join 用）
  - docs-dev/review_期末說明_抽查.md：全題清單供家長驗收

用法：
  uv run python scripts/build_explanations.py
"""
import sys
import os
import re
import json
import glob
import logging
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..")
QUESTIONS_PATH = os.path.abspath(os.path.join(ROOT, "docs", "questions.json"))
RESULTS_GLOB = os.path.abspath(os.path.join(ROOT, "data", "exp_results", "batch_*.json"))
OUTPUT_PATH = os.path.abspath(os.path.join(ROOT, "docs", "explanations.json"))
REPORT_PATH = os.path.abspath(os.path.join(ROOT, "docs-dev", "review_期末說明_抽查.md"))

MAX_LEN = 120          # 寫手規格 100 字，留審核改寫的緩衝
MIN_LEN = 5
MAX_SENTENCES = 4      # 規格 1–3 句，容忍短補充句

_SENTENCE_END = re.compile(r"[。！？!?]")


def final_exam_ids(questions: list) -> set:
    """docs/questions.json 題目列表 → 期末題（unit 3/4）id 集合"""
    return {q["id"] for q in questions if int(q["unit"]) in (3, 4)}


def validate_entries(entries: list, expected_ids: set) -> list:
    """驗證說明條目，回傳問題描述清單（空清單＝通過）。

    檢查：id 與期末題集合完全一致（不缺不多不重複）、說明非空、
    長度 MIN_LEN–MAX_LEN、句數 1–MAX_SENTENCES。
    """
    problems = []

    ids = [e.get("id") for e in entries]
    dup = sorted(k for k, v in Counter(ids).items() if v > 1)
    for d in dup:
        problems.append(f"重複 id: {d}")

    id_set = set(ids)
    for missing in sorted(expected_ids - id_set):
        problems.append(f"缺少期末題說明: {missing}")
    for extra in sorted(id_set - expected_ids):
        problems.append(f"多出非期末題 id: {extra}")

    for e in entries:
        eid = e.get("id", "<無id>")
        text = (e.get("text") or "").strip()
        if not text:
            problems.append(f"說明為空: {eid}")
            continue
        if len(text) < MIN_LEN:
            problems.append(f"說明過短（{len(text)} 字）: {eid}")
        if len(text) > MAX_LEN:
            problems.append(f"說明過長（{len(text)} 字 > {MAX_LEN}）: {eid}")
        sentences = len(_SENTENCE_END.findall(text))
        if sentences == 0:
            problems.append(f"無完整句（缺句尾標點）: {eid}")
        elif sentences > MAX_SENTENCES:
            problems.append(f"句數過多（{sentences} 句 > {MAX_SENTENCES}）: {eid}")

    return problems


def merge_entries(entries: list) -> dict:
    """條目清單 → {id: 說明文字}（去前後空白；重複 id 直接丟錯，不靜默覆蓋）"""
    merged = {}
    for e in entries:
        eid = e["id"]
        if eid in merged:
            raise ValueError(f"重複 id: {eid}")
        merged[eid] = e["text"].strip()
    return merged


def build_report(questions: list, entries: list) -> str:
    """全題抽查報告 markdown（題目／答案／說明／審核狀態）"""
    by_id = {e["id"]: e for e in entries}
    fixed_count = sum(1 for e in entries if e.get("verdict") == "fixed")
    lines = [
        "# 期末說明 家長抽查報告",
        "",
        f"共 {len(entries)} 題；審核者改寫 {fixed_count} 題（其餘為寫手原稿通過）。",
        "勾選方式：有問題的題目記下 id，回報後重生成該題即可。",
        "",
    ]
    current_unit = None
    for q in sorted(
        (q for q in questions if q["id"] in by_id),
        key=lambda q: (int(q["unit"]), q["id"]),
    ):
        if q["unit"] != current_unit:
            current_unit = q["unit"]
            unit_name = {3: "第3單元 動物", 4: "第4單元 天氣"}.get(int(q["unit"]), str(q["unit"]))
            lines += [f"## {unit_name}", ""]
        e = by_id[q["id"]]
        ans = q["answer"]
        if q["type"] == "true_false":
            ans = {"true": "○ 對", "false": "✕ 錯"}.get(ans, ans)
        elif q["type"] == "multiple_choice" and q.get("options"):
            try:
                idx = int(ans) - 1
                ans = f"({ans}) {q['options'][idx]}"
            except (ValueError, IndexError):
                pass
        verdict = "審核改寫" if e.get("verdict") == "fixed" else "原稿通過"
        reason = f"（{e['reason']}）" if e.get("verdict") == "fixed" and e.get("reason") else ""
        lines += [
            f"### {q['id']}",
            "",
            f"- 題目：{q['text']}",
            f"- 答案：{ans}",
            f"- 說明：**{e['text'].strip()}**",
            f"- 審核：{verdict}{reason}",
            "",
        ]
    return "\n".join(lines)


def main():
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        questions = json.load(f)
    expected = final_exam_ids(questions)
    log.info(f"期末題數: {len(expected)}")

    entries = []
    files = sorted(glob.glob(RESULTS_GLOB))
    for path in files:
        with open(path, encoding="utf-8") as f:
            entries.extend(json.load(f))
    log.info(f"批次檔: {len(files)} 個，條目: {len(entries)}")

    problems = validate_entries(entries, expected)
    if problems:
        for p in problems:
            log.error(p)
        log.error(f"驗證失敗（{len(problems)} 個問題），不寫出")
        sys.exit(1)

    merged = merge_entries(entries)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=1, sort_keys=True)
    log.info(f"已寫入 {OUTPUT_PATH}（{len(merged)} 題）")

    report = build_report(questions, entries)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report)
    log.info(f"已寫入 {REPORT_PATH}")


if __name__ == "__main__":
    main()
