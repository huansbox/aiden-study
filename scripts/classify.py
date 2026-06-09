"""
AI 分類器 + 答案補充
讀取 data/raw_questions.json，用 claude -p 批次分類題目所屬單元，
無答案的題目同時由 AI 提供答案。輸出 data/classified_questions.json
"""
import sys
import os
import json
import subprocess
import re
import time
import logging
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from data_helpers import normalize_text, dedupe_by_text, merge_answer, validate_unit_subtopic

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw_questions.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "classified_questions.json")

VALID_SUBTOPICS = {
    "蔬菜從哪裡來",
    "影響蔬菜生長的因素",
    "蔬菜生長的變化過程",
    "影響物質變化的因素",
    "溫度對水的變化",
    "溫度對其他物質的影響",
}

BATCH_SIZE = 12
MAX_RETRIES = 3

SYSTEM_PROMPT = """你是國小三年級自然科考題分類專家。請將每道題目分類到以下單元和子主題：

第1單元：田園樂
- 蔬菜從哪裡來：題目核心是蔬菜的產地、種類辨識、哪些部位可食用
- 影響蔬菜生長的因素：題目核心是光、水、土壤、氣候、蟲害、肥料對生長的影響
- 蔬菜生長的變化過程：題目核心是發芽、開花、結果等生命週期順序，播種方式，觀察記錄

第2單元：溫度變化對物質的影響
- 影響物質變化的因素：題目核心是「什麼條件造成物質狀態或外觀改變」（不限溫度，含空氣、水分等因素導致的生鏽、變質等）
- 溫度對水的變化：題目核心是冰、水、水蒸氣三態，含融化/結冰/蒸發/凝結
- 溫度對其他物質的影響：題目核心是非水物質（奶油、巧克力、鐵…）受溫度改變

衝突規則：若題目同時符合兩個單元，優先歸屬「題目直接詢問的核心概念」所屬單元。
不屬於以上任何子主題的題目，unit 填 "none"。

對於每道題目，請回傳：
- unit: "1" 或 "2" 或 "none"
- subtopic: 上述六個子主題之一，若 unit 為 "none" 則填 "none"
- confidence: 0-100 的整數，表示分類信心
- classify_reason: 一句話說明分類理由
- answer: 正確答案（是非題填 "true" 或 "false"，選擇題填 "1"/"2"/"3"/"4"）。若題目已有答案則直接回傳該答案，若無答案請根據國小三年級自然科知識判斷正確答案。

請以 JSON array 格式回傳，每個元素對應一道題目，按輸入順序排列。只回傳 JSON，不要有其他文字。"""


def build_question_text(q: dict) -> str:
    """組合題目文字供 AI 閱讀"""
    if q["section"] == "true_false":
        return f"[是非題] {q['text']}"
    else:
        opts_text = ""
        if q["options"]:
            opts_text = " ".join(f"({i+1}){opt}" for i, opt in enumerate(q["options"]))
        return f"[選擇題] {q['text']}" + (f" 選項：{opts_text}" if opts_text else "")


def classify_batch(batch: list[dict], batch_idx: int) -> list[dict] | None:
    """
    用 claude -p 分類一批題目。
    回傳分類結果 list，失敗回傳 None。
    """
    questions_text = []
    for i, q in enumerate(batch):
        has_ans = f" (已知答案: {q['answer']})" if q["answer"] else " (需提供答案)"
        questions_text.append(f"{i+1}. {build_question_text(q)}{has_ans}")

    user_prompt = f"請分類以下 {len(batch)} 道題目：\n\n" + "\n".join(questions_text)

    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                ["claude", "-p", "--output-format", "json"],
                input=f"{SYSTEM_PROMPT}\n\n---\n\n{user_prompt}",
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=120,
            )

            if result.returncode != 0:
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: claude -p 失敗: {result.stderr[:200]}")
                time.sleep(2)
                continue

            # Parse the JSON output from claude -p --output-format json
            try:
                outer = json.loads(result.stdout)
                response_text = outer.get("result", result.stdout)
            except json.JSONDecodeError:
                response_text = result.stdout

            # Extract JSON array from response
            json_match = re.search(r"\[[\s\S]*\]", response_text)
            if not json_match:
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 無法找到 JSON array")
                time.sleep(2)
                continue

            classifications = json.loads(json_match.group())

            if len(classifications) != len(batch):
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 結果數量不符 ({len(classifications)} vs {len(batch)})")
                time.sleep(2)
                continue

            # Validate each result
            valid = True
            for ci, c in enumerate(classifications):
                if not validate_unit_subtopic(
                    c.get("unit", ""), c.get("subtopic", ""), {"1", "2", "none"}, VALID_SUBTOPICS
                ):
                    log.warning(f"  批次 {batch_idx} 題 {ci+1}: 非法 unit/subtopic "
                                f"'{c.get('unit')}'/'{c.get('subtopic')}'")
                    valid = False

            if not valid and attempt < MAX_RETRIES - 1:
                time.sleep(2)
                continue

            return classifications

        except subprocess.TimeoutExpired:
            log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 逾時")
            time.sleep(2)
        except Exception as e:
            log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: 例外 {e}")
            time.sleep(2)

    return None


def main():
    with open(os.path.abspath(INPUT_PATH), encoding="utf-8") as f:
        all_questions = json.load(f)

    # Filter out skipped questions
    kept = [q for q in all_questions if not q["has_image"]
            and not (q["section"] == "multiple_choice" and len(q["options"]) < 2)]
    log.info(f"保留題目: {len(kept)}")

    # Dedup by text（helper），並建立 正規化文字 → unique index 對照，供結果回填重複題
    unique_questions = dedupe_by_text(kept)
    seen_texts = {normalize_text(q["text"]): i for i, q in enumerate(unique_questions)}

    log.info(f"去重後: {len(unique_questions)} 題（原 {len(kept)}）")

    # Batch classify
    results = [None] * len(unique_questions)
    total_batches = (len(unique_questions) + BATCH_SIZE - 1) // BATCH_SIZE

    for bi in range(total_batches):
        start = bi * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(unique_questions))
        batch = unique_questions[start:end]

        log.info(f"分類批次 {bi+1}/{total_batches} ({len(batch)} 題)")
        batch_results = classify_batch(batch, bi + 1)

        if batch_results is None:
            log.error(f"  批次 {bi+1} 完全失敗，該批題目標記為 none")
            for j in range(start, end):
                results[j] = {
                    "unit": "none",
                    "subtopic": "none",
                    "confidence": 0,
                    "classify_reason": "分類失敗",
                    "answer": unique_questions[j]["answer"],
                }
        else:
            for j, cr in enumerate(batch_results):
                results[start + j] = cr

        # Rate limiting
        if bi < total_batches - 1:
            time.sleep(1)

    # Apply results back to all kept questions (including duplicates)
    classified = []
    for q in kept:
        unique_idx = seen_texts[normalize_text(q["text"])]
        cr = results[unique_idx]

        entry = {**q}
        entry["unit"] = str(cr.get("unit", "none"))
        entry["subtopic"] = cr.get("subtopic", "none")
        entry["confidence"] = int(cr.get("confidence", 0))
        entry["classify_reason"] = cr.get("classify_reason", "")

        # Answer: 有官方用官方，無則用 AI 補（helper）
        entry["answer"], _ = merge_answer(q["answer"], cr.get("answer", ""))

        classified.append(entry)

    # Stats
    unit_counts = defaultdict(int)
    for c in classified:
        unit_counts[c["unit"]] += 1

    with_answer = sum(1 for c in classified if c["answer"])
    conf_low = sum(1 for c in classified if c["confidence"] < 70)
    conf_mid = sum(1 for c in classified if 70 <= c["confidence"] < 90)
    conf_high = sum(1 for c in classified if c["confidence"] >= 90)

    log.info(f"\n=== 分類統計 ===")
    log.info(f"單元 1: {unit_counts.get('1', 0)}")
    log.info(f"單元 2: {unit_counts.get('2', 0)}")
    log.info(f"none: {unit_counts.get('none', 0)}")
    log.info(f"有答案: {with_answer}/{len(classified)}")
    log.info(f"信心分布: <70={conf_low}, 70-89={conf_mid}, >=90={conf_high}")

    # Output
    with open(os.path.abspath(OUTPUT_PATH), "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)

    log.info(f"已輸出至 {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
