# -*- coding: utf-8 -*-
"""把新增的 classified 題目去重後併入既有 classified_questions_期末.json。

既有期末資料含人工複審修正（review A），不可重跑分類覆蓋；新卷另跑 classify 成
_新增 檔，本腳本以正規化題目文字跨檔去重（新題文字若已存在於既有題庫則丟棄），
保留既有資料原封不動，只 append 倖存的新題。原地覆寫 classified_questions_期末.json。

用法： uv run python scripts/merge_classified.py
"""
import sys, io, json, os
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from data_helpers import normalize_text

ROOT = os.path.join(os.path.dirname(__file__), "..")
MAIN = os.path.join(ROOT, "data", "classified_questions_期末.json")
NEW = os.path.join(ROOT, "data", "classified_questions_期末_新增.json")

main = json.load(open(MAIN, encoding="utf-8"))
new = json.load(open(NEW, encoding="utf-8"))

seen = {normalize_text(q["text"]) for q in main}
kept, dropped = [], 0
for q in new:
    key = normalize_text(q["text"])
    if key in seen:
        dropped += 1
        continue
    seen.add(key)
    kept.append(q)

merged = main + kept
json.dump(merged, open(MAIN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"既有 {len(main)} + 新增倖存 {len(kept)}（與既有/彼此重複丟棄 {dropped}）= {len(merged)}")
