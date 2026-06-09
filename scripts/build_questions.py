"""
合併期末題目進 docs/questions.json（網站讀取的最終題庫）

把 data/classified_questions_期末.json 轉成最終 schema（id/unit/subtopic/type/
text/options/answer/source），併入既有 docs/questions.json。

冪等：重跑前先剔除既有的 unit 3/4，再以最新期末資料重建，期中（unit 1/2）原封不動。

過濾規則（同期中）：
  - unit == "none" → 排除（超出期末範圍）
  - has_image → 排除（圖片題無法純文字作答）
  - 選擇題選項 < 2 → 排除

用法：
  uv run python scripts/build_questions.py
"""
import sys
import os
import json
import logging
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..")
QUESTIONS_PATH = os.path.abspath(os.path.join(ROOT, "docs", "questions.json"))
FINAL_CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_期末.json"))


def to_final_schema(q: dict) -> dict:
    """classified 題目 → 網站最終 schema"""
    stem = q["source"].rsplit(".", 1)[0]
    return {
        "id": f"{stem}_{q['section']}_{q['number']}",
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["section"],
        "text": q["text"],
        "options": q["options"],
        "answer": q["answer"],
        "source": q["source"],
    }


def main():
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    # 保留期中（unit 1/2），剔除既有期末以便冪等重建
    midterm = [q for q in existing if int(q["unit"]) in (1, 2)]
    log.info(f"期中題目: {len(midterm)}（原 docs/questions.json {len(existing)} 題）")

    with open(FINAL_CLASSIFIED, encoding="utf-8") as f:
        classified = json.load(f)

    final_q = []
    skipped = Counter()
    for q in classified:
        if q["unit"] == "none":
            skipped["none"] += 1
            continue
        if q.get("has_image"):
            skipped["has_image"] += 1
            continue
        if q["section"] == "multiple_choice" and len(q["options"]) < 2:
            skipped["few_options"] += 1
            continue
        final_q.append(to_final_schema(q))

    log.info(f"期末題目: {len(final_q)}（排除 {dict(skipped)}）")

    merged = midterm + final_q

    # 檢查 id 唯一
    ids = [q["id"] for q in merged]
    dup = [k for k, v in Counter(ids).items() if v > 1]
    if dup:
        log.warning(f"重複 id: {dup}")

    unit_counts = Counter(q["unit"] for q in merged)
    log.info(f"合併後總題數: {len(merged)}，各單元: {dict(sorted(unit_counts.items()))}")

    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 {QUESTIONS_PATH}")


if __name__ == "__main__":
    main()
