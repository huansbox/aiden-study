"""
社會 raw 題目後處理清理（extract.py 之後、classify.py 之前）

社會卷頁面邊界的頁首／頁尾字串（「背面尚有試題」「尚有試題」「【三年級社會試卷第X面】」
「期第N次定期評量 評量範圍…三年 班 號 姓名」「試卷第X面】」、孤立頁碼）會在雙欄萃取時
滲進最後一個選項或題幹尾巴。本腳本以「噪音錨點切到字串尾」清掉，並修正雙欄把「12」切成
「1」黏前題＋「2」當題號造成的題號錯置（重複題號→補空缺號）。

extract.py 是共用且有回歸測試的純函式，社會頁尾樣式與自然/數學不同，故獨立後處理而非改
共用 parser。日後社會批次擴大可考慮把 SOCIAL_NOISE 提升進 extract.py。

用法：uv run python scripts/clean_social_raw.py
"""
import sys
import os
import re
import json
import logging
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw_questions_社會.json")

# 噪音錨點：出現即從該處切到字串尾（皆為考卷頁面 furniture，不會出現在正當題幹/選項）
SOCIAL_NOISE = re.compile(
    r"(背面)?尚有試題"
    r"|背面尚"
    r"|【?三年級社會試"
    r"|試卷第[一二三四五六]"
    r"|期第\s*\d+\s*次定期評量"
    r"|學期第[一二三四五六]?\s*次定期評量"
    r"|評量範圍"
    r"|三年_*\s*班_*\s*號"
)
# 尾端孤立頁碼：限定「句號＋空白＋1-2 位數字結尾」，避免誤剝正當的尾端數字
TRAIL_PAGENUM = re.compile(r"(?<=。)\s+\d{1,2}\s*$")


def strip_noise(s: str) -> tuple[str, bool]:
    """切掉頁尾噪音與孤立頁碼。只有實際切到時才清殘留標點，回傳 (清理後, 是否變動)。"""
    if not s:
        return s, False
    changed = False
    m = SOCIAL_NOISE.search(s)
    if m:
        s = s[:m.start()]
        changed = True
    if TRAIL_PAGENUM.search(s):
        s = TRAIL_PAGENUM.sub("", s)
        changed = True
    if changed:
        # 清掉切割後殘留的尾端空白與孤立標點（僅切過的字串才動，不影響正常題幹句號）
        s = re.sub(r"[\s。，、；：]+$", "", s).strip()
    return s, changed


def fix_numbering(questions: list) -> int:
    """修正同一卷同 section 內的重複題號：重複者補成「比前一題大的最小空缺號」。"""
    fixed = 0
    groups = defaultdict(list)
    for q in questions:
        groups[(q["source"], q["section"])].append(q)
    for (_src, _sec), items in groups.items():
        nums = [q["number"] for q in items]
        maxn = max(nums)
        present = set()
        prev = 0
        for q in items:
            n = q["number"]
            if n in present:
                # 找比前一題大的最小空缺號
                missing = [k for k in range(1, maxn + 1) if k not in present and k > prev]
                if missing:
                    newn = missing[0]
                    log.info(f"  題號修正 {_src} {_sec}: {n} → {newn}")
                    q["number"] = newn
                    fixed += 1
            present.add(q["number"])
            prev = q["number"]
    return fixed


def main():
    path = os.path.abspath(RAW_PATH)
    with open(path, encoding="utf-8") as f:
        questions = json.load(f)

    noise_hits = 0
    for q in questions:
        q["text"], changed = strip_noise(q["text"])
        if changed:
            noise_hits += 1
        if q.get("options"):
            q["options"] = [strip_noise(o)[0] for o in q["options"]]

    renum = fix_numbering(questions)

    # 驗證：每題選項仍 ≥2 且非空、題幹非空
    problems = []
    for q in questions:
        if not q["text"].strip():
            problems.append(f"{q['source']} {q['section']} #{q['number']}: 題幹空")
        if q["section"] == "multiple_choice":
            ne = sum(1 for o in q["options"] if o.strip())
            if ne < 4:
                problems.append(f"{q['source']} mc #{q['number']}: 有效選項 {ne}/4")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    log.info(f"清理頁尾噪音: {noise_hits} 題；題號修正: {renum} 題")
    if problems:
        log.warning("待人工確認：")
        for p in problems:
            log.warning(f"  {p}")
    else:
        log.info("選項/題幹完整性檢查通過")


if __name__ == "__main__":
    main()
