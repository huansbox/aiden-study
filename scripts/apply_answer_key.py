# -*- coding: utf-8 -*-
"""把視覺讀的官方答案覆寫進 classified（needs_review=False）。

用於「題目卷文字可抽、但答案卷是圖片」的卷：題目由 extract 抽、答案由人工視覺
判讀寫成 official_answers_*.json，本腳本依 (source, section, number) 注入官方答案，
標 needs_review=False（官方優先），覆蓋 classify 先前的 AI 判答。

用法： uv run python scripts/apply_answer_key.py <classified.json> <official_answers.json>
原地覆寫 classified.json。
"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

classified_path, official_path = sys.argv[1], sys.argv[2]
classified = json.load(open(classified_path, encoding="utf-8"))
official = json.load(open(official_path, encoding="utf-8"))

applied = 0
for q in classified:
    sec_map = official.get(q["source"], {}).get(q["section"], {})
    val = sec_map.get(str(q["number"]))
    if val is not None:
        q["answer"] = str(val)
        q["needs_review"] = False
        applied += 1

json.dump(classified, open(classified_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
still_review = sum(1 for q in classified if q.get("needs_review"))
print(f"注入官方答案 {applied} 題；仍 needs_review（AI 補/未對到官方）: {still_review} / {len(classified)}")
