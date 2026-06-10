"""
合併分類結果進 docs/questions.json（網站讀取的最終題庫）

三來源結構：
  - 期中（unit 1-2，自然）：保留既有 docs/questions.json 內容，不重建
  - 期末（unit 3-4，自然）：從 data/classified_questions_期末.json 重建
  - 數學（unit 5-9）：從 data/classified_questions_數學.json 重建（檔案不存在＝0 題，不報錯）

冪等：重跑前先剔除既有的重建區塊（3-4、5-9），期中原封不動。
全題帶 subject 欄位（unit 1-4 = science；5-9 = math）。

過濾規則（各區塊相同）：
  - unit == "none" 或不在該區塊值域 → 排除
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
MATH_CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_數學.json"))

MID_UNITS = {1, 2}
FINAL_UNITS = {3, 4}
MATH_UNITS = {5, 6, 7, 8, 9}


def unique_id(base: str, used: set) -> str:
    """確保 id 唯一：撞到既有 id 時依序加後綴 -2/-3…（考卷內偶有重複題號）。"""
    if base not in used:
        used.add(base)
        return base
    i = 2
    while f"{base}-{i}" in used:
        i += 1
    new_id = f"{base}-{i}"
    used.add(new_id)
    return new_id


def to_final_schema(q: dict, used_ids: set, subject: str) -> dict:
    """classified 題目 → 網站最終 schema"""
    stem = q["source"].rsplit(".", 1)[0]
    base = f"{stem}_{q['section']}_{q['number']}"
    return {
        "id": unique_id(base, used_ids),
        "subject": subject,
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["section"],
        "text": q["text"],
        "options": q["options"],
        "answer": q["answer"],
        "source": q["source"],
    }


def preserve_schema(q: dict, subject: str) -> dict:
    """既有題目 → 統一 key 順序並補 subject（值原封不動）"""
    return {
        "id": q["id"],
        "subject": subject,
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["type"],
        "text": q["text"],
        "options": q["options"],
        "answer": q["answer"],
        "source": q["source"],
    }


def convert_block(classified: list, used_ids: set, subject: str, allowed_units: set):
    """classified 清單 → (最終題目清單, 排除統計)。空輸入回傳 ([], {})。"""
    final_q = []
    skipped = Counter()
    for q in classified:
        if q["unit"] == "none" or int(q["unit"]) not in allowed_units:
            skipped["none"] += 1
            continue
        if q.get("has_image"):
            skipped["has_image"] += 1
            continue
        if q["section"] == "multiple_choice" and sum(1 for o in q["options"] if o.strip()) < 2:
            skipped["few_options"] += 1   # 含圖片型空選項（選項為圖示、文字空白）
            continue
        final_q.append(to_final_schema(q, used_ids, subject))
    return final_q, skipped


def build_merged(existing: list, final_classified: list, math_classified: list) -> list:
    """三來源合併（純函式）：保留期中、重建期末與數學。"""
    midterm = [preserve_schema(q, "science") for q in existing if int(q["unit"]) in MID_UNITS]
    log.info(f"期中題目: {len(midterm)}（原 docs/questions.json {len(existing)} 題）")

    used_ids = {q["id"] for q in midterm}

    final_q, skipped = convert_block(final_classified, used_ids, "science", FINAL_UNITS)
    log.info(f"期末題目: {len(final_q)}（排除 {dict(skipped)}）")

    math_q, math_skipped = convert_block(math_classified, used_ids, "math", MATH_UNITS)
    log.info(f"數學題目: {len(math_q)}（排除 {dict(math_skipped)}）")

    merged = midterm + final_q + math_q

    # 檢查重建區塊 id 唯一（期中既有重複屬 out-of-scope，不在此處理）
    rebuilt_ids = [q["id"] for q in final_q + math_q]
    dup = [k for k, v in Counter(rebuilt_ids).items() if v > 1]
    if dup:
        log.warning(f"重建區塊重複 id（未解）: {dup}")

    return merged


def load_classified(path: str, required: bool) -> list:
    if not os.path.exists(path):
        if required:
            raise FileNotFoundError(path)
        log.info(f"來源不存在（預留）: {path}")
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    with open(QUESTIONS_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    final_classified = load_classified(FINAL_CLASSIFIED, required=True)
    math_classified = load_classified(MATH_CLASSIFIED, required=False)

    merged = build_merged(existing, final_classified, math_classified)

    unit_counts = Counter(q["unit"] for q in merged)
    log.info(f"合併後總題數: {len(merged)}，各單元: {dict(sorted(unit_counts.items()))}")

    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 {QUESTIONS_PATH}")


if __name__ == "__main__":
    main()
