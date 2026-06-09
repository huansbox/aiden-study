# -*- coding: utf-8 -*-
"""交叉比對：視覺讀的官方答案 vs classify 的 AI 判答。列出分歧供人工仲裁。"""
import sys, io, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.join(os.path.dirname(__file__), "..")
classified = json.load(open(os.path.join(ROOT, "data", "classified_questions_期末_新增.json"), encoding="utf-8"))
official = json.load(open(os.path.join(ROOT, "data", "official_answers_期末_新增.json"), encoding="utf-8"))

agree = disagree = no_official = 0
disagreements = []
for q in classified:
    src, sec, num = q["source"], q["section"], str(q["number"])
    off = official.get(src, {}).get(sec, {}).get(num)
    ai = q.get("answer")
    if off is None:
        no_official += 1
        continue
    if str(off) == str(ai):
        agree += 1
    else:
        disagree += 1
        disagreements.append((src.split("_")[1], sec, num, off, ai, q["text"][:55]))

print(f"有官方對照: agree={agree} disagree={disagree}; 無官方對照(三民/雜訊/題組): {no_official}")
print("\n=== 分歧（官方 vs AI）===")
for school, sec, num, off, ai, text in sorted(disagreements):
    print(f"{school} {sec[:2]}{num}: 官方={off} AI={ai} | {text}")
