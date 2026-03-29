"""
修正 classified_questions.json 中的已知問題：
1. 12 題 confidence=0（idx 36-47）→ 重新用 claude -p 分類
2. idx=192 民權111 TF5 → unit=none
3. idx=135 成德108 MC9 → answer="2"
"""
import subprocess
import json
import sys
import re
import time

sys.stdout.reconfigure(encoding="utf-8")

DATA_PATH = "data/classified_questions.json"

def reclassify_batch(questions: list[dict]) -> list[dict]:
    """用 claude -p 重新分類一批題目"""
    lines = []
    for j, q in enumerate(questions):
        sec = "是非題" if q["section"] == "true_false" else "選擇題"
        opts = ""
        if q["options"]:
            opts = " 選項：" + " ".join(f"({k+1}){o}" for k, o in enumerate(q["options"]))
        lines.append(f"{j+1}. [{sec}] {q['text'][:200]}{opts}")

    prompt = (
        "分類國小三年級自然題目。\n"
        "第1單元：田園樂（蔬菜種類/部位/生長因素/生長過程/播種方式）\n"
        "第2單元：溫度變化對物質的影響（物質變化因素/水三態/其他物質受溫度改變）\n"
        "不屬於以上填none。\n"
        "subtopic 必須是：蔬菜從哪裡來/影響蔬菜生長的因素/蔬菜生長的變化過程/"
        "影響物質變化的因素/溫度對水的變化/溫度對其他物質的影響/none\n"
        "回傳JSON array含unit(字串\"1\"/\"2\"/\"none\"),subtopic,confidence,classify_reason,answer。\n"
        "只回傳JSON array，不要其他文字。\n\n"
        + "\n".join(lines)
    )

    result = subprocess.run(
        ["claude", "-p", "--output-format", "json"],
        input=prompt,
        capture_output=True, text=True, encoding="utf-8", timeout=120,
    )

    outer = json.loads(result.stdout)
    text = outer.get("result", result.stdout)
    match = re.search(r"\[[\s\S]*\]", text)
    return json.loads(match.group())


def main():
    with open(DATA_PATH, encoding="utf-8") as f:
        qs = json.load(f)

    # === Fix 1: Re-classify 12 confidence=0 questions ===
    zero_indices = [i for i, q in enumerate(qs) if q["confidence"] == 0]
    print(f"修正 1: 重新分類 {len(zero_indices)} 題 confidence=0")

    for batch_start in range(0, len(zero_indices), 6):
        batch_idx = zero_indices[batch_start:batch_start + 6]
        batch_qs = [qs[i] for i in batch_idx]
        batch_num = batch_start // 6 + 1
        print(f"  批次 {batch_num}: idx={batch_idx}")

        items = reclassify_batch(batch_qs)
        for j, r in enumerate(items):
            idx = batch_idx[j]
            qs[idx]["unit"] = str(r.get("unit", "none"))
            qs[idx]["subtopic"] = r.get("subtopic", "none")
            qs[idx]["confidence"] = int(r.get("confidence", 0))
            qs[idx]["classify_reason"] = r.get("classify_reason", "")
            if not qs[idx]["answer"]:
                qs[idx]["answer"] = str(r.get("answer", ""))
            print(f"    idx={idx}: unit={qs[idx]['unit']} sub={qs[idx]['subtopic']} "
                  f"conf={qs[idx]['confidence']} ans={qs[idx]['answer']}")

        if batch_start + 6 < len(zero_indices):
            time.sleep(2)

    # === Fix 2: idx=192 → unit=none ===
    print(f"\n修正 2: idx=192 民權111 TF5 → none")
    qs[192]["unit"] = "none"
    qs[192]["subtopic"] = "none"
    qs[192]["classify_reason"] = "科學工具安全規範，不屬於田園樂或溫度變化單元"

    # === Fix 3: idx=135 answer → "2" ===
    print(f"修正 3: idx=135 成德108 MC9 answer → 2")
    qs[135]["answer"] = "2"

    # === Save ===
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(qs, f, ensure_ascii=False, indent=2)

    # === Stats ===
    from collections import Counter
    units = Counter(q["unit"] for q in qs)
    with_ans = sum(1 for q in qs if q["answer"])
    conf_low = sum(1 for q in qs if q["confidence"] < 70)
    conf_mid = sum(1 for q in qs if 70 <= q["confidence"] < 90)
    conf_high = sum(1 for q in qs if q["confidence"] >= 90)
    print(f"\n=== 修正後統計 ===")
    print(f"單元1: {units['1']}, 單元2: {units['2']}, none: {units['none']}")
    print(f"有答案: {with_ans}/{len(qs)}")
    print(f"信心: <70={conf_low}, 70-89={conf_mid}, >=90={conf_high}")


if __name__ == "__main__":
    main()
