"""
產出期末 AI 補答案的複查清單（skipped_questions.md 同風格）。

民權×4 與桃子腳112 的題目卷無官方答案，答案由 AI 補（classified 中
needs_review=True）。本腳本把這些題輸出成 markdown 表，供家長逐題核對 AI 答案。

輸出 review_期末_ai答案.md（repo 根目錄）。

用法：
  uv run python scripts/build_review_list.py
"""
import sys
import os
import json
import logging
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..")
CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_期末.json"))
OUTPUT = os.path.abspath(os.path.join(ROOT, "review_期末_ai答案.md"))


def fmt_answer(q: dict) -> str:
    if q["section"] == "true_false":
        return "O（正確）" if q["answer"] == "true" else "X（錯誤）"
    return f"第 {q['answer']} 個選項" if q["answer"] else "（無）"


def fmt_question(q: dict) -> str:
    text = q["text"].replace("\n", " ").strip()
    if q["options"]:
        opts = " ".join(f"{i+1}.{o}" for i, o in enumerate(q["options"]))
        return f"{text}　選項：{opts}"
    return text


def main():
    with open(CLASSIFIED, encoding="utf-8") as f:
        classified = json.load(f)

    # 只列實際進題庫的 AI 補答案題（排除 none、含圖片、有效選項<2，與 build_questions 一致）
    def in_bank(q):
        if q["unit"] == "none" or q.get("has_image"):
            return False
        if q["section"] == "multiple_choice" and sum(1 for o in q["options"] if o.strip()) < 2:
            return False
        return True

    review = [q for q in classified if q.get("needs_review") and in_bank(q)]
    log.info(f"需複查（AI 補答案）題目: {len(review)} / {len(classified)}")

    by_source = defaultdict(list)
    for q in review:
        by_source[q["source"]].append(q)

    lines = [
        "# 期末 AI 補答案複查清單",
        "",
        "以下題目來自**無官方答案卷**的學校（民權×4、桃子腳112），答案由 AI 依國小三年級",
        "自然科知識判斷，**需家長逐題核對**。核對後若答案有誤，請直接修正",
        "`data/classified_questions_期末.json` 對應題目的 `answer` 後重跑 `build_questions.py`。",
        "",
        f"共 {len(review)} 題待複查。",
        "",
    ]

    type_label = {"true_false": "是非題", "multiple_choice": "選擇題"}
    for source in sorted(by_source):
        qs = by_source[source]
        lines.append(f"## {source}（{len(qs)} 題）")
        lines.append("")
        lines.append("| 題型 | 題號 | 單元/子主題 | AI 答案 | 信心 | 題目 |")
        lines.append("|------|------|------------|---------|------|------|")
        for q in qs:
            lines.append(
                f"| {type_label.get(q['section'], q['section'])} | {q['number']} "
                f"| {q['unit']}/{q['subtopic']} | {fmt_answer(q)} | {q['confidence']} "
                f"| {fmt_question(q)} |"
            )
        lines.append("")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    log.info(f"已輸出至 {OUTPUT}")


if __name__ == "__main__":
    main()
