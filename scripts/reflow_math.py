"""
分數亂序題 AI 重組（issues/010 spike 定案策略）

PDF 文字層把直式分數拆成分子/分母獨立行（亂序），extract_math.py 把這類題
擋進跳過清單。本腳本用 claude -p 看亂序原文重建題幹與選項（分數以「分子/分母」
斜線格式寫回），輸出重組 artifact 供人工對 PDF 渲染圖核對；核對通過後以
--apply 併回 raw_questions_數學.json（官方答案沿用跳過清單內的括號答案）。

spike 實測（2026-06-11，桃子腳Q3＋安和Q8）：重組 2/2 全對，含頁首雜訊剔除。

用法：
  uv run python scripts/reflow_math.py                 # 產出 artifact 供核對
  uv run python scripts/reflow_math.py --apply         # 核對通過後併入 raw
"""
import sys
import os
import json
import subprocess
import argparse
import logging

sys.path.insert(0, os.path.dirname(__file__))
from extract_math import extract_blanks

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
SKIPPED_PATH = os.path.join(DATA_DIR, "skipped_questions_數學.json")
ARTIFACT_PATH = os.path.join(DATA_DIR, "reflowed_questions_數學.json")
RAW_PATH = os.path.join(DATA_DIR, "raw_questions_數學.json")

PROMPT = """以下是從國小三年級數學考卷 PDF 文字層抽出的題目原文（選擇題或填充題）。已知問題：
1. 印刷上的直式分數（分子在上、分母在下）被文字層拆成獨立的純數字片段，位置錯亂（可能跑到前一行或後一行）。
2. 可能混入考卷頁首雜訊（學校名、學年度、姓名欄、成績欄「分數」等）。

請重建題目，規則：
- 找出散落的分子/分母數字，判斷分數應在句中哪個位置，以「分子/分母」斜線格式寫回（如 1/8、9/10、4/10）。
- 每一個散落的純數字片段都必須被用掉（它們是某個分數的分子或分母），不可丟棄；
  分子通常竄到該行之前（含前一行句尾），分母通常落在該行之後。重組後句中不應殘留來路不明的孤立數字。
- 剔除頁首雜訊。
- 題幹與選項忠於原文，不改寫、不糾正數學內容（即使選項是錯誤敘述也照抄）。
- 填充題的答案括號（如「( 0.8 )」）原樣保留在句中，不要移動或改寫括號內容。

只回傳 JSON array（不要其他文字），每個元素對應一題、按輸入順序：
- 選擇題：{"number": 題號, "section": "multiple_choice", "text": "題幹", "options": ["選項1","選項2","選項3","選項4"]}
- 填充題：{"number": 題號, "section": "fill_in_blank", "text": "重建後全文（含答案括號）"}

原文：
"""


SECTION_LABEL = {"multiple_choice": "選擇題", "fill_in_blank": "填充題"}


def run_reflow(skipped: list[dict]) -> list[dict]:
    payload = "\n\n".join(
        f"【{SECTION_LABEL.get(s['section'], s['section'])} 題 {s['number']}（{s['source']}）】\n{s['raw_text']}"
        for s in skipped
    )
    result = subprocess.run(
        ["claude", "-p", "--model", "claude-sonnet-4-6", "--output-format", "json"],
        input=PROMPT + payload, capture_output=True, text=True, encoding="utf-8", timeout=300,
    )
    if result.returncode != 0:
        raise RuntimeError(f"claude -p 失敗: {result.stderr[:300]}")
    outer = json.loads(result.stdout)
    text = outer.get("result", result.stdout)
    import re
    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        raise RuntimeError("回應中找不到 JSON array")
    reflowed = json.loads(m.group())
    if len(reflowed) != len(skipped):
        raise RuntimeError(f"重組結果數量不符（{len(reflowed)} vs {len(skipped)}）")

    out = []
    for s, r in zip(skipped, reflowed):
        if int(r["number"]) != int(s["number"]):
            raise RuntimeError(f"題號錯位：skipped {s['number']} vs reflow {r['number']}")
        entry = {
            "source": s["source"],
            "section": s["section"],
            "number": s["number"],
            "has_image": False,
            "reflowed": True,                # 標記：AI 重組題（已人工對 PNG 核對才 --apply）
        }
        if s["section"] == "fill_in_blank":
            # 重建全文仍含答案括號 → 重用 extract 的括號抽取邏輯產生佔位符與 blanks
            stem, blanks = extract_blanks(r["text"])
            if not blanks:
                raise RuntimeError(f"重組後抽不到答案括號：{s['source']} #{s['number']}")
            entry.update({"text": stem, "blanks": blanks, "options": [], "answer": ""})
        else:
            entry.update({
                "text": r["text"],
                "options": r["options"],
                "answer": s.get("answer", ""),   # 官方答案來自跳過清單（括號抽取）
            })
        out.append(entry)
    return out


def apply_to_raw(reflowed: list[dict]):
    with open(RAW_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    keys = {(q["source"], q["section"], q["number"]) for q in raw}
    added = 0
    for q in reflowed:
        k = (q["source"], q["section"], q["number"])
        if k in keys:
            log.info(f"已存在，跳過: {k}")
            continue
        raw.append(q)
        added += 1
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
    log.info(f"已併入 {RAW_PATH}（新增 {added} 題，共 {len(raw)} 題）")


def main():
    ap = argparse.ArgumentParser(description="分數亂序題 AI 重組")
    ap.add_argument("--apply", action="store_true",
                    help="把（已人工核對的）artifact 併入 raw_questions_數學.json")
    args = ap.parse_args()

    if args.apply:
        if not os.path.exists(ARTIFACT_PATH):
            raise SystemExit(f"找不到 artifact：{ARTIFACT_PATH}，先跑一次不帶 --apply")
        with open(ARTIFACT_PATH, encoding="utf-8") as f:
            reflowed = json.load(f)
        apply_to_raw(reflowed)
        return

    with open(SKIPPED_PATH, encoding="utf-8") as f:
        all_skipped = json.load(f)
    # 只重組分數亂序類；table（015 截圖）與 no_blanks（013 救回）不在此處理
    skipped = [s for s in all_skipped if s.get("category", "fraction") == "fraction"]
    if not skipped:
        log.info("跳過清單無分數亂序題，無事可做")
        return
    log.info(f"重組 {len(skipped)} 題（claude -p；其餘類別 {len(all_skipped) - len(skipped)} 題不處理）…")
    reflowed = run_reflow(skipped)
    with open(ARTIFACT_PATH, "w", encoding="utf-8") as f:
        json.dump(reflowed, f, ensure_ascii=False, indent=2)
    log.info(f"已寫入 artifact：{ARTIFACT_PATH}")
    log.info("請對 PDF 渲染圖逐題核對後，再執行 --apply 併入 raw")


if __name__ == "__main__":
    main()
