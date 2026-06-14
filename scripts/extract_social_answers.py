# -*- coding: utf-8 -*-
"""社會擴充批答案卷 → official_answers_社會_新增.json（逐卷專用 parser）。

各校答案卷標記答案的方式全不同：
  安和111  格式A 括號內   （ ○ ）N. / （ 4 ）N.
  安和112  格式B 題號後   N.（○） / N.（ 1 ）   （是非空括號＝錯）
  四維112  是非答案獨立行 o/x 在「( ) N.」前；選擇括號內 ( 3 ) N.
  竹塘110  題幹後標記     《答案》○ / 《答案》４
  海佃110  格式A 括號內   ( 0 )N. / ( ○１ )N.   （0/O＝對）

題目卷已由 extract→clean 取得乾淨題目（raw_questions_社會_新增.json）；本腳本只抽
「題號→答案」映射，輸出 {題目卷檔名: {section: {num: ans}}}，並以題目卷題號集合驗證
完整性（缺漏列出供人工補）。O/o/0→true、X/x/╳/✕→false；選擇 1-4／全形／○數字→"1".."4"。

用法： uv run python scripts/extract_social_answers.py
"""
import sys, os, re, json, logging
sys.path.insert(0, os.path.dirname(__file__))
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

from extract import extract_text_from_pdf

ROOT = os.path.join(os.path.dirname(__file__), "..")
PDF_DIR = os.path.join(ROOT, "pdfs_社會")
RAW_NEW = os.path.join(ROOT, "data", "raw_questions_社會_新增.json")
OUT = os.path.join(ROOT, "data", "official_answers_社會_新增.json")

# 題目卷檔名（official_answers 的鍵＝題目卷檔名，與 raw 的 source 一致）
QFILE = {
    "安和111": "新北市_安和國小_111下期末2_社會康軒_題目.pdf",
    "安和112": "新北市_安和國小_112下期末2_社會康軒_題目.pdf",
    "四維112": "臺中市_四維國小_112下期末2_社會康軒_題目.pdf",
    "竹塘110": "彰化縣_竹塘國小_110下期末2_社會康軒_題目.pdf",
    "海佃110": "臺南市_海佃國小_110下期末2_社會康軒_題目.pdf",
}
AFILE = {k: v.replace("_題目.pdf", "_答案.pdf") for k, v in QFILE.items()}

TRUE_CH = set("○Oo0ＯＯ◯")
# ：安和112 字體把「╳」映到私用區（PUA）碼位，pdfplumber 抽出的是該碼點
FALSE_CH = set("╳×Xx✕✗╳ＸX")


def norm_tf(ch):
    ch = ch.strip()
    if ch in TRUE_CH:
        return "true"
    if ch in FALSE_CH:
        return "false"
    return None


def norm_mc(s):
    s = s.strip().lstrip("○")
    m = {"１": "1", "２": "2", "３": "3", "４": "4"}
    s = m.get(s, s)
    return s if s in {"1", "2", "3", "4"} else None


def split_sections(t):
    """回傳 (是非段文字, 選擇段文字)。以大題標題切。"""
    mc_i = t.find("選擇題")
    tf_i = t.find("是非題")
    tf = t[tf_i:mc_i] if tf_i >= 0 and mc_i > tf_i else t[:mc_i if mc_i >= 0 else len(t)]
    # 選擇段到下一個非目標大題（勾選/配合/排序/題組/生活情境）為止
    mc = t[mc_i:] if mc_i >= 0 else ""
    end = re.search(r"[三四五六七][、.\s]*(?:勾選|配合|排[出列]|題組|生活情境)", mc)
    if end:
        mc = mc[:end.start()]
    return tf, mc


def parse_bracket_a(t):
    """格式A：括號內答案＋題號。安和111(○╳/數字)、四維mc(數字)、海佃(0/○數字)。"""
    tf_seg, mc_seg = split_sections(t)
    tf, mc = {}, {}
    for m in re.finditer(r"[（(]\s*([○╳×Xx0Oo✕]|○?[1-4１-４])\s*[）)]\s*(\d{1,2})\s*[.．]", tf_seg):
        a = norm_tf(m.group(1))
        if a:
            tf[int(m.group(2))] = a
    for m in re.finditer(r"[（(]\s*(○?[1-4１-４])\s*[）)]\s*(\d{1,2})\s*[.．]", mc_seg):
        a = norm_mc(m.group(1))
        if a:
            mc[int(m.group(2))] = a
    return tf, mc


def parse_bracket_b(t):
    """格式B：題號＋括號內答案。安和112，是非空括號＝false。"""
    tf_seg, mc_seg = split_sections(t)
    tf, mc = {}, {}
    for m in re.finditer(r"(\d{1,2})\s*[.．]\s*（\s*([○╳×Xx]?)\s*）", tf_seg):
        n = int(m.group(1)); ch = m.group(2)
        tf[n] = norm_tf(ch) if ch else "false"   # 空括號＝錯
    for m in re.finditer(r"(\d{1,2})\s*[.．]\s*（\s*([1-4１-４])\s*）", mc_seg):
        mc[int(m.group(1))] = norm_mc(m.group(2))
    return tf, mc


def parse_simang(t):
    """四維：是非答案在「( ) N.」前的獨立行 o/x；選擇括號內 ( 3 ) N.。"""
    tf_seg, mc_seg = split_sections(t)
    tf, mc = {}, {}
    # 是非：逐題抓「答案字母行 … ( ) 題號.」；答案字母緊鄰題號前
    for m in re.finditer(r"([oOxX○╳×])\s*\n\s*[（(]\s*[）)]\s*(\d{1,2})\s*[.．]", tf_seg):
        a = norm_tf(m.group(1))
        if a:
            tf[int(m.group(2))] = a
    for m in re.finditer(r"[（(]\s*([1-4１-４])\s*[）)]\s*(\d{1,2})\s*[.．]", mc_seg):
        mc[int(m.group(2))] = norm_mc(m.group(1))
    return tf, mc


def parse_answermark(t):
    """竹塘：題幹後《答案》○ / 《答案》４，按 section 內出現順序配題號。"""
    tf_seg, mc_seg = split_sections(t)
    tf, mc = {}, {}
    tf_nums = [int(m.group(1)) for m in re.finditer(r"[（(]\s*[）)]\s*(\d{1,2})\s*[.．]", tf_seg)]
    tf_ans = [m.group(1) for m in re.finditer(r"《答案》\s*([○╳×Xx])", tf_seg)]
    for n, a in zip(tf_nums, tf_ans):
        v = norm_tf(a)
        if v:
            tf[n] = v
    mc_nums = [int(m.group(1)) for m in re.finditer(r"[（(]\s*[）)]\s*(\d{1,2})\s*[.．]", mc_seg)]
    mc_ans = [m.group(1) for m in re.finditer(r"《答案》\s*([1-4１-４])", mc_seg)]
    for n, a in zip(mc_nums, mc_ans):
        mc[n] = norm_mc(a)
    return tf, mc


PARSERS = {
    "安和111": parse_bracket_a,
    "安和112": parse_bracket_b,
    "四維112": parse_simang,
    "竹塘110": parse_answermark,
    "海佃110": parse_bracket_a,
}

# 人工補：答案卷雙欄跑版，少數題的答案數字脫離括號（沒進文字層或變獨立行），
# render 答案卷視覺判讀補（安和111 p2/p3、四維 p2 紅字括號親讀，內容亦相符）。
# 竹塘 mc7：題目卷與答案卷不同版本（答案卷此位置為「地形命名」題），題目卷此題＝
# 「全國消費者服務專線是幾號？」答案為確定事實（1950＝選項3），人工確認覆蓋錯配。
MANUAL_OVERRIDE = {
    "安和111": {"multiple_choice": {4: "2", 8: "3", 9: "4", 19: "3", 20: "1"}},
    "四維112": {"multiple_choice": {11: "1", 12: "4"}},
    "竹塘110": {"multiple_choice": {7: "3"}},
}

# 排除：題目卷與答案卷為不同版本試卷（換了某題），按序配對會錯配，且該題無可靠官方答案。
# 竹塘 tr7：答案卷此題＝「結帳後自認倒楣」，題目卷此題＝「八德借四維八德命名」（不同題）→
# 八德題無官方答案核對、答案有課本版本爭議（八塊厝諧音 vs 四維八德），題庫一併剔除（見 skipped）。
SKIP_ANSWERS = {
    "竹塘110": {"true_false": [7]},
}


def main():
    raw = json.load(open(RAW_NEW, encoding="utf-8"))
    # 各題目卷的題號集合（驗證用）
    want = {}
    for q in raw:
        want.setdefault(q["source"], {"true_false": set(), "multiple_choice": set()})
        want[q["source"]][q["section"]].add(q["number"])

    official = {"_note": "社會擴充批官方答案（安和111/112、四維112、竹塘110、海佃110）。"
                "各校答案卷格式不同，逐卷專用 parser 抽取（extract_social_answers.py）。"
                "O/o/0=true X/╳=false；選擇 1-4。鍵=題目卷檔名→section→題號。"}
    for label, parser in PARSERS.items():
        t = extract_text_from_pdf(os.path.join(PDF_DIR, AFILE[label]))
        t = t.replace(chr(0xF0CD), "╳")   # 安和112 PUA「╳」碼位 → 標準 ╳
        tf, mc = parser(t)
        ov = MANUAL_OVERRIDE.get(label, {})
        tf.update(ov.get("true_false", {}))
        mc.update(ov.get("multiple_choice", {}))
        sk = SKIP_ANSWERS.get(label, {})
        for n in sk.get("true_false", []):
            tf.pop(n, None)
        for n in sk.get("multiple_choice", []):
            mc.pop(n, None)
        qfile = QFILE[label]
        official[qfile] = {
            "true_false": {str(k): tf[k] for k in sorted(tf)},
            "multiple_choice": {str(k): mc[k] for k in sorted(mc)},
        }
        # 驗證完整性
        w = want.get(qfile, {"true_false": set(), "multiple_choice": set()})
        miss_tf = sorted(w["true_false"] - set(tf))
        miss_mc = sorted(w["multiple_choice"] - set(mc))
        extra = (set(tf) - w["true_false"]) | (set(mc) - w["multiple_choice"])
        log.info(f"{label}: tf {len(tf)}/{len(w['true_false'])}  mc {len(mc)}/{len(w['multiple_choice'])}"
                 + (f"  缺tf={miss_tf}" if miss_tf else "")
                 + (f"  缺mc={miss_mc}" if miss_mc else "")
                 + (f"  多={sorted(extra)}" if extra else ""))

    json.dump(official, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log.info(f"已輸出 {OUT}")


if __name__ == "__main__":
    main()
