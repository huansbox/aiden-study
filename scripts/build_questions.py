"""
合併分類結果進 docs/questions.json（網站讀取的最終題庫）

五來源結構：
  - 期中（unit 1-2，自然）：保留既有 docs/questions.json 內容，不重建
  - 期末（unit 3-4，自然）：從 data/classified_questions_期末.json 重建
  - 數學（unit 5-9）：從 data/classified_questions_數學.json 重建（檔案不存在＝0 題，不報錯）
  - 社會（unit 10-12）：從 data/classified_questions_社會.json 重建（同上，內部 10/11/12＝課本第 4/5/6 單元）
  - 國語（unit 13-14）：從 data/curated_questions_國語.json 重建

冪等：每次都從各來源全量重建合併（期中保留既有內容）。
全題帶 subject 欄位（unit 1-4 = science；5-9 = math；10-12 = social；13-14 = chinese）。

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

sys.path.insert(0, os.path.dirname(__file__))
from data_helpers import validate_blanks, validate_vertical_calc, clean_question_text

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.join(os.path.dirname(__file__), "..")
QUESTIONS_PATH = os.path.abspath(os.path.join(ROOT, "docs", "questions.json"))
FINAL_CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_期末.json"))
MATH_CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_數學.json"))
# 人工 curated 題（015 看表題：手動截圖＋手寫 blanks，已含 unit/subtopic，不過 classify）
MATH_CURATED = os.path.abspath(os.path.join(ROOT, "data", "curated_questions_數學.json"))
SOCIAL_CLASSIFIED = os.path.abspath(os.path.join(ROOT, "data", "classified_questions_社會.json"))
CHINESE_CURATED = os.path.abspath(os.path.join(ROOT, "data", "curated_questions_國語.json"))
FILTERED_PATH = os.path.abspath(os.path.join(ROOT, "data", "filtered_unsupported_數學.json"))

MID_UNITS = {1, 2}
FINAL_UNITS = {3, 4}
MATH_UNITS = {5, 6, 7, 8, 9}
# 社會：內部 unit 10/11/12 = 課本第 4/5/6 單元（全域唯一，避開自然 unit 4）
SOCIAL_UNITS = {10, 11, 12}
# 國語：L7-L8 / L9-L10 掃描題，沿用全域唯一 unit id
CHINESE_UNITS = {13, 14}

# UI 已支援的 fill_in_blank 輸入型態（013 已落地全部四種）
SUPPORTED_BLANK_INPUTS = {"number", "comparison", "code", "text"}


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
    """classified 題目 → 網站最終 schema（fill_in_blank 帶 blanks，不帶 options/answer）"""
    stem = q["source"].rsplit(".", 1)[0]
    # origin（calc/word 大題）入 id，避免與填填看大題同 section 同題號相撞
    origin = q.get("origin", "")
    base = f"{stem}_{q['section']}_{origin}{q['number']}"
    out = {
        "id": unique_id(base, used_ids),
        "subject": subject,
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["section"],
        "text": clean_question_text(q["text"]),
    }
    if q.get("image"):
        out["image"] = q["image"]   # 看表題截圖（docs/ 相對路徑）
    if q["section"] == "fill_in_blank":
        # blank 答案只壓空格、不砍題尾（'100頁' 等合法答案結尾不可砍）
        out["blanks"] = [
            {**b, "answer": clean_question_text(b["answer"], strip_tail_furniture=False)}
            if isinstance(b.get("answer"), str) else b
            for b in q["blanks"]
        ]
    elif q["section"] == "vertical_calc":
        out["op"] = q["op"]
        out["operands"] = q["operands"]
        out["answer"] = q["answer"]
    else:
        out["options"] = [clean_question_text(o) for o in q["options"]]
        out["answer"] = q["answer"]
    out["source"] = q["source"]
    return out


def preserve_schema(q: dict, subject: str) -> dict:
    """既有題目（期中）→ 統一 key 順序並補 subject；text/options 套萃取雜訊清理（冪等）"""
    return {
        "id": q["id"],
        "subject": subject,
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["type"],
        "text": clean_question_text(q["text"]),
        "options": [clean_question_text(o) for o in q["options"]],
        "answer": q["answer"],
        "source": q["source"],
    }


def preserve_chinese_schema(q: dict, used_ids: set) -> dict:
    """國語人工 curated 題 → 網站最終 schema（保留改錯字專用欄位）。"""
    return {
        "id": unique_id(q["id"], used_ids),
        "subject": "chinese",
        "unit": int(q["unit"]),
        "subtopic": q.get("subtopic", "none"),
        "type": q["type"],
        "text": clean_question_text(q["text"]),
        "wrong": q["wrong"],
        "answer": q["answer"],
        "choices": [clean_question_text(c) for c in q["choices"]],
        "note": clean_question_text(q["note"]),
        "source": q["source"],
    }


def convert_block(classified: list, used_ids: set, subject: str, allowed_units: set,
                  filtered_out: list | None = None):
    """
    classified 清單 → (最終題目清單, 排除統計)。空輸入回傳 ([], {})。
    fill_in_blank 含 UI 未支援輸入型態的題不入庫，記到 filtered_out（013 解禁依據）。
    """
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
        if q["section"] == "fill_in_blank":
            # 先分流未支援輸入型態（013 解禁清單；code 的 choices 等 013 才補，不在此驗證）
            unsupported = sorted({b.get("input", "") for b in q.get("blanks") or []} - SUPPORTED_BLANK_INPUTS)
            if unsupported:
                skipped["unsupported_input"] += 1
                if filtered_out is not None:
                    filtered_out.append({**q, "filter_reason": f"未支援輸入型態: {','.join(unsupported)}"})
                continue
            if not validate_blanks(q.get("blanks")):
                skipped["invalid_blanks"] += 1
                log.warning(f"blanks 驗證失敗，跳過: {q['source']} #{q['number']}")
                continue
        if q["section"] == "vertical_calc":
            if not validate_vertical_calc(q.get("op"), q.get("operands"), q.get("answer")):
                skipped["invalid_vertical_calc"] += 1
                log.warning(f"vertical_calc 驗證失敗，跳過: {q['source']} #{q['number']}")
                continue
        final_q.append(to_final_schema(q, used_ids, subject))
    return final_q, skipped


def convert_chinese_block(curated: list, used_ids: set):
    """國語 curated 題 → (最終題目清單, 排除統計)。"""
    final_q = []
    skipped = Counter()
    for q in curated:
        if int(q["unit"]) not in CHINESE_UNITS:
            skipped["wrong_unit"] += 1
            continue
        if q.get("subject") != "chinese" or q.get("type") != "chinese_correction":
            skipped["wrong_schema"] += 1
            continue
        final_q.append(preserve_chinese_schema(q, used_ids))
    return final_q, skipped


def build_merged(existing: list, final_classified: list, math_classified: list,
                 social_classified: list | None = None,
                 filtered_out: list | None = None,
                 chinese_curated: list | None = None) -> list:
    """五來源合併（純函式）：保留期中、重建期末／數學／社會／國語。"""
    # 期中保留既有內容；但既有 seed 內偶有同 source 同題號的不同題撞 id
    # （如某校 PDF 含兩份選擇題，皆編 1–5），需在此去碰撞，否則 localStorage
    # 的 mastered/errorBank 以 id 為鍵會把兩題混為一題。
    used_ids: set = set()
    midterm = []
    for q in existing:
        if int(q["unit"]) in MID_UNITS:
            e = preserve_schema(q, "science")
            e["id"] = unique_id(e["id"], used_ids)
            midterm.append(e)
    log.info(f"期中題目: {len(midterm)}（原 docs/questions.json {len(existing)} 題）")

    final_q, skipped = convert_block(final_classified, used_ids, "science", FINAL_UNITS)
    log.info(f"期末題目: {len(final_q)}（排除 {dict(skipped)}）")

    math_q, math_skipped = convert_block(math_classified, used_ids, "math", MATH_UNITS, filtered_out)
    log.info(f"數學題目: {len(math_q)}（排除 {dict(math_skipped)}）")

    social_q, social_skipped = convert_block(social_classified or [], used_ids, "social", SOCIAL_UNITS)
    log.info(f"社會題目: {len(social_q)}（排除 {dict(social_skipped)}）")

    chinese_q, chinese_skipped = convert_chinese_block(chinese_curated or [], used_ids)
    log.info(f"國語題目: {len(chinese_q)}（排除 {dict(chinese_skipped)}）")

    merged = midterm + final_q + math_q + social_q + chinese_q

    # 全庫 id 唯一性檢查（期中已在上方去碰撞，重建區塊由 unique_id 保證）
    all_ids = [q["id"] for q in merged]
    dup = [k for k, v in Counter(all_ids).items() if v > 1]
    if dup:
        log.warning(f"重複 id（未解）: {dup}")

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
    math_curated = load_classified(MATH_CURATED, required=False)
    if math_curated:
        log.info(f"人工 curated 題: {len(math_curated)}")
    social_classified = load_classified(SOCIAL_CLASSIFIED, required=False)
    chinese_curated = load_classified(CHINESE_CURATED, required=False)
    if chinese_curated:
        log.info(f"國語 curated 題: {len(chinese_curated)}")

    filtered_out = []
    merged = build_merged(existing, final_classified, math_classified + math_curated,
                          social_classified, filtered_out, chinese_curated)

    with open(FILTERED_PATH, "w", encoding="utf-8") as f:
        json.dump(filtered_out, f, ensure_ascii=False, indent=2)
    if filtered_out:
        log.info(f"未支援輸入型態過濾清單: {FILTERED_PATH}（{len(filtered_out)} 題，013 解禁）")

    unit_counts = Counter(q["unit"] for q in merged)
    log.info(f"合併後總題數: {len(merged)}，各單元: {dict(sorted(unit_counts.items()))}")

    with open(QUESTIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 {QUESTIONS_PATH}")


if __name__ == "__main__":
    main()
