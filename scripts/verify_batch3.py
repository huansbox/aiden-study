# -*- coding: utf-8 -*-
"""獨立驗證器：對 docs/questions.json 的數學題做機械式重算與 schema 檢查。

不信任 AI agent 的盲解結果——這裡用純程式重新推算「可計算」的答案，
並對全部數學題做結構完整性檢查。結果寫成 JSON 報告，供主程式 Read。

用法： uv run python scripts/verify_batch3.py
輸出： data/_verify/report.json（findings 陣列）、stdout 摘要
"""
import json
import os
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.join(os.path.dirname(__file__), "..")
Q = os.path.abspath(os.path.join(ROOT, "docs", "questions.json"))
EXP = os.path.abspath(os.path.join(ROOT, "docs", "explanations.json"))
ASSETS = os.path.abspath(os.path.join(ROOT, "docs"))
OUTDIR = os.path.abspath(os.path.join(ROOT, "data", "_verify"))

# 批三的 7 卷來源（只深驗這批；其餘既有題已上線過）
BATCH3_SOURCES = {
    "臺北市_民權國小_113下期末2_數學康軒_題目.pdf",
    "桃園市_建德國小_113下期末2_數學康軒_題目.pdf",
    "臺北市_內湖國小_113下期末2_數學康軒_題目.pdf",
    "臺北市_內湖國小_112下期末2_數學康軒_題目.pdf",
    "南投縣_社寮國小_112下期末2_數學康軒_題目.pdf",
    "南投縣_社寮國小_110下期末2_數學康軒_題目.pdf",
    "彰化縣_舊館國小_111下期末3_數學康軒_題目.pdf",
}

findings = []


def add(qid, sev, kind, msg):
    findings.append({"id": qid, "severity": sev, "kind": kind, "msg": msg})


def half(s):
    """全形→半形（數字、運算符、括號），供解析。"""
    s = unicodedata.normalize("NFKC", s)
    return (s.replace("＋", "+").replace("－", "-").replace("×", "*")
             .replace("÷", "/").replace("＝", "=").replace("　", " "))


def to_num(t):
    t = t.strip()
    try:
        f = float(t)
        return int(f) if f == int(f) else f
    except ValueError:
        return None


# ── 可計算答案的重算引擎 ────────────────────────────────

def recompute_vertical(q):
    """vertical_calc：用 op+operands 重算，與 answer 比對。回傳 (ok, detail)。"""
    op, ops, ans = q.get("op"), q.get("operands"), q.get("answer")
    if not isinstance(ops, list) or len(ops) != 2:
        return None, "operands 形狀錯"
    a, b = ops
    if op == "add_decimal":
        exp = round(a + b, 6)
        return (abs(exp - float(ans)) < 1e-6, f"{a}+{b}={exp} vs ans={ans}")
    if op == "sub_decimal":
        exp = round(a - b, 6)
        return (abs(exp - float(ans)) < 1e-6, f"{a}-{b}={exp} vs ans={ans}")
    if op == "long_division":
        if not isinstance(ans, dict):
            return False, "long_division answer 非 dict"
        qo, r = ans.get("quotient"), ans.get("remainder")
        ok = (a == b * qo + r) and (0 <= r < b)
        return ok, f"{a}/{b}: q={qo} r={r}; check {b}*{qo}+{r}={b*qo+r}"
    return None, f"未知 op {op}"


# 純算式 "A op B = (1)" 的單空格題；回傳期望值或 None
_BIN = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)\s*=\s*$")
# "A / B = (1) ... (2)"  商餘
_DIVREM = re.compile(r"^\s*(\d+)\s*/\s*(\d+)\s*=\s*$")


_NUM = r"(\d+(?:\.\d+)?)"
_TAIL = r"(?:[一-鿿]+)?"   # § 後可選的中文單位（公分/盒/張…）


def _cmp1(exp, blank, detail):
    got = to_num(half(str(blank["answer"])))
    ok = got is not None and abs(round(exp, 6) - got) < 1e-6
    return (0, ok, f"{detail} vs ans={blank['answer']}")


def recompute_fill(q):
    """機械重算 fill_in_blank 的可計算式。**只用 fullmatch 全字串錨定**，避免
    把子算式或半形 (N) 子標誤判。無法 fullmatch 的（多式、含 prose）一律放生。
    回傳 list[(blank_idx, ok|None, detail)]；空 list = 不可機械驗證。"""
    blanks = q["blanks"]
    # 只把全形（N）視為空格標記；半形 (N) 是原卷子題編號，保留不動
    s = re.sub(r"（\s*\d+\s*）", "§", q["text"])
    s = half(s)                       # 全形數字/＋－×÷＝→半形（半形 (N) 不受影響）
    s = re.sub(r"^[^=§]*?[:：]", "", s).strip()   # 去前綴「想一想：」之類
    s = s.rstrip("。 ")

    # A. 純算式：A op B = §[單位]
    m = re.fullmatch(rf"{_NUM}\s*([+\-*/])\s*{_NUM}\s*=\s*§{_TAIL}", s)
    if m and len(blanks) == 1:
        a, o, b = float(m[1]), m[2], float(m[3])
        if not (o == "/" and b == 0):
            exp = {"+": a+b, "-": a-b, "*": a*b, "/": a/b if b else 0}[o]
            return [_cmp1(exp, blanks[0], f"{a}{o}{b}={round(exp,6)}")]

    # B. 商餘：A / B = § … §
    m = re.fullmatch(rf"{_NUM}\s*/\s*{_NUM}\s*=\s*§\s*[.…·]+\s*§{_TAIL}", s)
    if m and len(blanks) == 2:
        a, b = int(float(m[1])), int(float(m[2]))
        if b:
            eq, er = a // b, a % b
            gq = to_num(half(str(blanks[0]["answer"])))
            gr = to_num(half(str(blanks[1]["answer"])))
            return [(0, gq == eq, f"{a}/{b} q={eq} vs ans={blanks[0]['answer']}"),
                    (1, gr == er, f"{a}/{b} r={er} vs ans={blanks[1]['answer']}")]

    # C. 解一元：A op § = C  /  § op B = C
    m = re.fullmatch(rf"{_NUM}\s*([+\-*/])\s*§\s*=\s*{_NUM}{_TAIL}", s)
    if m and len(blanks) == 1:
        a, o, c = float(m[1]), m[2], float(m[3])
        exp = {"+": c-a, "-": a-c, "*": c/a if a else None, "/": a/c if c else None}[o]
        if exp is not None:
            return [_cmp1(exp, blanks[0], f"{a}{o}?={c}->{round(exp,6)}")]
    m = re.fullmatch(rf"§\s*([+\-*/])\s*{_NUM}\s*=\s*{_NUM}{_TAIL}", s)
    if m and len(blanks) == 1:
        o, b, c = m[1], float(m[2]), float(m[3])
        exp = {"+": c-b, "-": c+b, "*": c/b if b else None, "/": c*b}[o]
        if exp is not None:
            return [_cmp1(exp, blanks[0], f"?{o}{b}={c}->{round(exp,6)}")]

    # D. 純單位換算：A 公分 = § 毫米 / A 毫米 = § 公分
    m = re.fullmatch(rf"{_NUM}\s*公分\s*=\s*§\s*毫米", s)
    if m and len(blanks) == 1:
        return [_cmp1(float(m[1])*10, blanks[0], f"{m[1]}公分={float(m[1])*10}毫米")]
    m = re.fullmatch(rf"{_NUM}\s*毫米\s*=\s*§\s*公分", s)
    if m and len(blanks) == 1:
        return [_cmp1(float(m[1])/10, blanks[0], f"{m[1]}毫米={float(m[1])/10}公分")]

    # E. 混合單位減法：A 公分 - B 毫米 = § 公分（內湖卷型）
    m = re.fullmatch(rf"{_NUM}\s*公分\s*-\s*{_NUM}\s*毫米\s*=\s*§\s*公分", s)
    if m and len(blanks) == 1:
        exp = float(m[1]) - float(m[2]) / 10
        return [_cmp1(exp, blanks[0], f"{m[1]}cm-{m[2]}mm={round(exp,6)}cm")]

    return []  # 不可機械驗證


# ── 比較符號正規化 ────────────────────────────────
def norm_cmp(s):
    s = unicodedata.normalize("NFKC", str(s)).strip()
    return s.replace("＞", ">").replace("＜", "<").replace("＝", "=")


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    data = json.load(open(Q, encoding="utf-8"))
    arr = data["questions"] if isinstance(data, dict) else data
    exp = json.load(open(EXP, encoding="utf-8"))

    ids = [q["id"] for q in arr]
    dup = {i for i in ids if ids.count(i) > 1}
    for d in dup:
        add(d, "ERROR", "dup_id", "重複 id")

    math_q = [q for q in arr if q.get("subject") == "math"]
    batch3 = [q for q in math_q if q.get("source") in BATCH3_SOURCES]

    n_recomputed = n_recomp_fail = 0
    n_unverifiable = 0

    for q in math_q:
        qid = q["id"]
        is_b3 = q.get("source") in BATCH3_SOURCES
        t = q["type"]

        # ── schema 檢查（全部數學題）──
        if t == "multiple_choice":
            opts = [o for o in q.get("options", []) if str(o).strip()]
            ans = str(q.get("answer", ""))
            if not ans.isdigit() or not (1 <= int(ans) <= len(opts)):
                add(qid, "ERROR", "mc_answer_range", f"answer={ans} options={len(opts)}")
        elif t == "true_false":
            if str(q.get("answer")) not in ("true", "false"):
                add(qid, "ERROR", "tf_answer", f"answer={q.get('answer')}")
        elif t == "vertical_calc":
            ok, detail = recompute_vertical(q)
            if ok is False:
                add(qid, "ERROR", "vcalc_recompute", detail)
                n_recomp_fail += 1
            elif ok is True:
                n_recomputed += 1
        elif t == "fill_in_blank":
            blanks = q.get("blanks", [])
            # 空格數 vs 題幹（N）標記數
            markers = len(re.findall(r"（\s*\d+\s*）", q["text"]))
            if markers and markers != len(blanks):
                add(qid, "WARN", "blank_count", f"題幹標記 {markers} vs blanks {len(blanks)}")
            for i, b in enumerate(blanks):
                inp = b.get("input", "")
                if inp not in ("number", "comparison", "code", "text"):
                    add(qid, "ERROR", "bad_input", f"blank{i} input={inp}")
                if inp == "code":
                    ch = b.get("choices") or []
                    if not ch:
                        add(qid, "ERROR", "code_no_choices", f"blank{i} 無 choices")
                    elif str(b.get("answer")) not in [str(c) for c in ch]:
                        add(qid, "ERROR", "code_answer_oob", f"blank{i} ans={b.get('answer')} not in {ch}")
                if inp == "comparison":
                    if norm_cmp(b.get("answer")) not in ("<", ">", "="):
                        add(qid, "ERROR", "cmp_answer", f"blank{i} ans={b.get('answer')}")
            # 重算可計算式
            res = recompute_fill(q)
            for bi, ok, detail in res:
                if ok is True:
                    n_recomputed += 1
                elif ok is False:
                    add(qid, "ERROR", "fill_recompute", detail)
                    n_recomp_fail += 1

        # ── 圖片存在性 ──
        if q.get("image"):
            p = os.path.join(ASSETS, q["image"])
            if not os.path.isfile(p):
                add(qid, "ERROR", "missing_image", q["image"])

        # ── 說明覆蓋 ──
        if qid not in exp:
            add(qid, "ERROR", "no_explanation", "缺說明")
        else:
            if not str(exp[qid]).strip():
                add(qid, "ERROR", "empty_explanation", "說明空白")

    # 統計可機械驗證覆蓋率（批三）
    summary = {
        "total_math": len(math_q),
        "batch3_math": len(batch3),
        "recomputed_ok": n_recomputed,
        "recompute_fail": n_recomp_fail,
        "errors": sum(1 for f in findings if f["severity"] == "ERROR"),
        "warns": sum(1 for f in findings if f["severity"] == "WARN"),
    }
    report = {"summary": summary, "findings": findings}
    json.dump(report, open(os.path.join(OUTDIR, "report.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    # 批三逐題覆蓋表：標記哪些經機械重算、哪些只能靠讀原卷
    coverage = []
    for q in batch3:
        method, detail = "UNVERIFIED", ""
        if q["type"] == "vertical_calc":
            ok, d = recompute_vertical(q)
            method, detail = ("RECOMPUTED" if ok else "FAIL"), d
        elif q["type"] == "fill_in_blank":
            res = recompute_fill(q)
            if res:
                method = "RECOMPUTED" if all(r[1] for r in res) else "FAIL"
                detail = " | ".join(r[2] for r in res)
        ans = (q.get("answer") if q["type"] != "fill_in_blank"
               else [b["answer"] for b in q["blanks"]])
        coverage.append({"id": q["id"], "type": q["type"], "method": method,
                         "has_image": bool(q.get("image")), "text": q["text"],
                         "answer": ans, "detail": detail})
    json.dump(coverage, open(os.path.join(OUTDIR, "coverage.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    from collections import Counter as _C
    print("批三覆蓋:", dict(_C(c["method"] for c in coverage)))
    print(json.dumps(summary, ensure_ascii=False))
    for f in findings:
        if f["severity"] == "ERROR":
            print(f"[{f['severity']}] {f['kind']} {f['id']}: {f['msg']}")


if __name__ == "__main__":
    main()
