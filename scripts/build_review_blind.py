# -*- coding: utf-8 -*-
"""從 classified 檔產出「盲審版」：AI 補答案題（needs_review）去掉答案欄。

供單票盲審（review A 做法）：reviewer agent 讀盲版作答，與 classified 記錄比對，
只回報分歧題。key 格式 k = "{source去掉.pdf}#{tr|mu}{number}"（與經驗筆記「四」一致）。

用法：
  uv run python scripts/build_review_blind.py \
    [--input data/classified_questions_期末_新增.json] [--output data/_review_blind.json]
"""
import sys, io, json, os, argparse

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = os.path.join(os.path.dirname(__file__), "..")

parser = argparse.ArgumentParser()
parser.add_argument("--input", default=os.path.join(ROOT, "data", "classified_questions_期末_新增.json"))
parser.add_argument("--output", default=os.path.join(ROOT, "data", "_review_blind.json"))
args = parser.parse_args()

classified = json.load(open(args.input, encoding="utf-8"))

blind = []
for q in classified:
    # 只審會進題庫的 AI 補答案題（unit none 會被 build_questions 排除，不必審）
    if not q.get("needs_review") or q.get("unit") not in ("3", "4"):
        continue
    stem = q["source"].removesuffix(".pdf")
    blind.append({
        "k": f"{stem}#{q['section'][:2]}{q['number']}",
        "section": q["section"],
        "text": q["text"],
        "options": q["options"],
    })

json.dump(blind, open(args.output, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"盲審題數: {len(blind)} → {args.output}")
