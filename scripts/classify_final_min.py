"""
最小期末分類器（issue #1 tracer 專用，將由 #4 的正式可切換分類器取代）

讀 data/raw_questions_期末.json，用 claude -p 把每題分類到：
  unit: "3"(動物) / "4"(天氣) / "none"
subtopic 一律填 "none"（正式 subtopic 留給 #4，不在此重跑 AI）。
答案已由答案卷萃取（格式A 內嵌），直接沿用，不請 AI 補答案。

輸出 data/classified_questions_期末.json。

用法：
  uv run python scripts/classify_final_min.py
"""
import sys
import os
import json
import subprocess
import re
import time
import logging

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

INPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw_questions_期末.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "classified_questions_期末.json")

# 分類任務單純（動物 vs 天氣），用 sonnet 控制成本
MODEL = "claude-sonnet-4-6"
BATCH_SIZE = 30  # 25 題一批即可
MAX_RETRIES = 3

SYSTEM_PROMPT = """你是國小三年級下學期自然科「期末」考題分類專家。期末範圍只有兩個單元：

第3單元：動物（動物分類、身體構造、生存與適應、觀察動物的方法）
第4單元：天氣（風、氣溫測量、雨量降雨、天氣預報）

請將每道題目分類到 unit "3"（動物）或 "4"（天氣）。
不屬於動物也不屬於天氣的題目，unit 填 "none"。

對於每道題目，請回傳：
- unit: "3" 或 "4" 或 "none"
- confidence: 0-100 的整數，表示分類信心
- classify_reason: 一句話說明分類理由

請以 JSON array 格式回傳，每個元素對應一道題目，按輸入順序排列。只回傳 JSON，不要有其他文字。"""


def build_question_text(q: dict) -> str:
    if q["section"] == "true_false":
        return f"[是非題] {q['text']}"
    opts_text = ""
    if q["options"]:
        opts_text = " ".join(f"({i+1}){opt}" for i, opt in enumerate(q["options"]))
    return f"[選擇題] {q['text']}" + (f" 選項：{opts_text}" if opts_text else "")


def classify_batch(batch: list[dict], batch_idx: int) -> list[dict] | None:
    questions_text = [f"{i+1}. {build_question_text(q)}" for i, q in enumerate(batch)]
    user_prompt = f"請分類以下 {len(batch)} 道題目：\n\n" + "\n".join(questions_text)

    for attempt in range(MAX_RETRIES):
        try:
            result = subprocess.run(
                ["claude", "-p", "--model", MODEL, "--output-format", "json"],
                input=f"{SYSTEM_PROMPT}\n\n---\n\n{user_prompt}",
                capture_output=True,
                text=True,
                encoding="utf-8",
                timeout=180,
            )
            if result.returncode != 0:
                log.warning(f"  批次 {batch_idx} 嘗試 {attempt+1}: claude -p 失敗: {result.stderr[:200]}")
                time.sleep(2)
                continue

            try:
                outer = json.loads(result.stdout)
                response_text = outer.get("result", result.stdout)
            except json.JSONDecodeError:
                response_text = result.stdout

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

            valid = True
            for ci, c in enumerate(classifications):
                if str(c.get("unit", "")) not in ("3", "4", "none"):
                    log.warning(f"  批次 {batch_idx} 題 {ci+1}: 非法 unit '{c.get('unit')}'")
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

    # 跳過：含圖片題、選項不足的選擇題（同期中）
    kept = [q for q in all_questions if not q["has_image"]
            and not (q["section"] == "multiple_choice" and len(q["options"]) < 2)]
    log.info(f"保留題目: {len(kept)}（原 {len(all_questions)}）")

    total_batches = (len(kept) + BATCH_SIZE - 1) // BATCH_SIZE
    results: list[dict] = [None] * len(kept)

    for bi in range(total_batches):
        start = bi * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(kept))
        batch = kept[start:end]
        log.info(f"分類批次 {bi+1}/{total_batches}（{len(batch)} 題）")
        batch_results = classify_batch(batch, bi + 1)

        if batch_results is None:
            log.error(f"  批次 {bi+1} 完全失敗，標記為 none")
            for j in range(start, end):
                results[j] = {"unit": "none", "confidence": 0, "classify_reason": "分類失敗"}
        else:
            for j, cr in enumerate(batch_results):
                results[start + j] = cr
        if bi < total_batches - 1:
            time.sleep(1)

    classified = []
    for q, cr in zip(kept, results):
        entry = {**q}
        entry["unit"] = str(cr.get("unit", "none"))
        entry["subtopic"] = "none"  # #1 一律 none，正式 subtopic 留給 #4
        entry["confidence"] = int(cr.get("confidence", 0))
        entry["classify_reason"] = cr.get("classify_reason", "")
        # 答案沿用答案卷萃取結果（格式A 內嵌），不請 AI 補
        classified.append(entry)

    from collections import defaultdict
    unit_counts = defaultdict(int)
    for c in classified:
        unit_counts[c["unit"]] += 1
    log.info("\n=== 分類統計 ===")
    log.info(f"單元 3（動物）: {unit_counts.get('3', 0)}")
    log.info(f"單元 4（天氣）: {unit_counts.get('4', 0)}")
    log.info(f"none: {unit_counts.get('none', 0)}")

    with open(os.path.abspath(OUTPUT_PATH), "w", encoding="utf-8") as f:
        json.dump(classified, f, ensure_ascii=False, indent=2)
    log.info(f"已輸出至 {os.path.abspath(OUTPUT_PATH)}")


if __name__ == "__main__":
    main()
