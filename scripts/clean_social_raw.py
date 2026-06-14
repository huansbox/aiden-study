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
import argparse
import logging
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DEFAULT_RAW = os.path.join(os.path.dirname(__file__), "..", "data", "raw_questions_社會.json")

# 噪音錨點：出現即從該處切到字串尾（皆為考卷頁面 furniture，不會出現在正當題幹/選項）。
# 各校頁尾字串不同，擴充批（安和/四維/竹塘/海佃）陸續補入；題幹/選項尾巴常滲入這些字串。
SOCIAL_NOISE = re.compile(
    r"(背面)?[尚還]有試題"
    r"|背面[尚還]"
    r"|【?三年級社會試"
    r"|試卷第[一二三四五六]"
    r"|期第\s*\d+\s*次定期評量"
    r"|學期第[一二三四五六]?\s*次定期評量"
    r"|第[一二三四五六]?\s*次定期[評考][量查]"     # 次定期評量／次定期考查（安和「第二次定期考查試題」）
    r"|次成績考查"                                  # 海佃「次成績考查 社會科試卷」
    r"|學業評量試卷"                                # 竹塘「末學業評量試卷」
    r"|社會[科領][試域]"                            # 海佃「社會科試卷」、四維「社會領域」
    r"|評量範圍"
    r"|三年[_\s]*班[座_\s]*號"                      # 三年__班座號__（竹塘/安和/海佃姓名欄）
    r"|[_\s]*年[_\s]*班\s*座號[：:]"                # 海佃「____年 ____班 座號：」
    r"|座號[：:_\s]*姓名"                           # 座號：__ 姓名 殘留
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


# 選擇題選項補抽：各校選項標記格式不一（裸 ○文字／○數字文字／數字○文字），
# extract.py 的 extract_options 只認部分變體，抽不到時改用本函式統一補抽。
OPT_MARKS = "①②③④⑤"


def recover_social_options(text: str):
    """社會卷選項統一補抽。回傳 (乾淨題幹, [選項…])；無法補抽回 None。

    社會選擇題一律以 ○ 為選項項目符號，編號（1-4／１-４）散落在 ○ 前後或對齊行。
    策略：以第一個「(編號?)○」定題幹/選項分界 → 去除孤立編號 → 用 ○ 切分 →
    壓掉雙欄切碎的字間空白 → 每段砍到第一個句末標點（去尾部頁尾噪音／題組導語）。
    """
    if text.count("○") < 3:
        return None
    m = re.search(r"[1-4１-４]?\s*○", text)
    if not m:
        return None
    stem = re.sub(r"\s+", " ", text[:m.start()]).strip()
    seg = text[m.start():]
    # 去孤立編號（○ 前後緊貼的 1-4、對齊編號行），不動多位數（如電話 1922）
    seg = re.sub(r"(?<![0-9０-９])[1-4１-４](?![0-9０-９])", "", seg)
    opts = []
    for p in seg.split("○"):
        p = re.sub(r"\s+", "", p)               # 壓雙欄切碎空白
        p = re.split(r"[。？！]", p)[0]          # 砍到第一個句末標點
        p = p.strip("ˉ，、；：.·-—–　")
        if p:
            opts.append(p)
    if len(opts) < 3:
        return None
    opts = opts[:4]
    return stem, opts


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
    parser = argparse.ArgumentParser(description="社會 raw 後處理（頁尾噪音清理＋雙欄題號修正＋選項補抽）")
    parser.add_argument("--input", default=DEFAULT_RAW, help="raw JSON 路徑（原地覆寫；預設主檔）")
    args = parser.parse_args()
    path = os.path.abspath(args.input)
    with open(path, encoding="utf-8") as f:
        questions = json.load(f)

    noise_hits = 0
    for q in questions:
        q["text"], changed = strip_noise(q["text"])
        if changed:
            noise_hits += 1
        if q.get("options"):
            q["options"] = [strip_noise(o)[0] for o in q["options"]]

    # 選項補抽：mc 有效選項 <4（社會選擇題皆 4 選；extract 對標記變體常只抽中一部分）→
    # 統一補抽並重組乾淨題幹。已抽滿 4 選的乾淨題不動（避免誤切）。
    recovered = 0
    for q in questions:
        if q["section"] != "multiple_choice":
            continue
        if sum(1 for o in q.get("options") or [] if o.strip()) >= 4:
            continue
        res = recover_social_options(q["text"])
        if res:
            stem, opts = res
            q["options"] = opts
            q["text"] = stem + "".join(f"{OPT_MARKS[i]}{o}" for i, o in enumerate(opts))
            recovered += 1

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

    log.info(f"清理頁尾噪音: {noise_hits} 題；選項補抽: {recovered} 題；題號修正: {renum} 題")
    if problems:
        log.warning("待人工確認：")
        for p in problems:
            log.warning(f"  {p}")
    else:
        log.info("選項/題幹完整性檢查通過")


if __name__ == "__main__":
    main()
