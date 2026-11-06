"""Source-independent mirror of StudyMathGeometry's bounded question schema.

PNG structure/CRC/dimensions remain the private-pack builder's responsibility.
This helper accepts browser-shaped questions, including their generated source.
"""
import json
import math
import re
import unicodedata

TYPE_UNITS = {"triangle_construct": {24}, "bar_chart_draw": {28}, "measure_tool": {24}}
TYPES = set(TYPE_UNITS)


def _keys(value, required, optional=()):
    return isinstance(value, dict) and set(required) <= value.keys() <= set(required) | set(optional)


def _num(value, low, high):
    return type(value) in (int, float) and low <= value <= high and math.isfinite(value)


def _int(value, low, high):
    return _num(value, low, high) and int(value) == value


def _length(value):
    return len(value.encode("utf-16-le", errors="surrogatepass")) // 2


def _str(value, limit):
    return isinstance(value, str) and bool(value.strip("\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff")) and _length(value) <= limit


def _array(value, low, high, predicate):
    return isinstance(value, list) and low <= len(value) <= high and all(predicate(v, i) for i, v in enumerate(value))


def _require(valid, message):
    if not valid:
        raise ValueError(message)


def _point(value, scene):
    return _array(value, 2, 2, lambda v, i: _num(v, 0, scene["height" if i else "width"]))


def _angle(points, index):
    a, b, c = points[(index + 1) % 3], points[index], points[(index + 2) % 3]
    ab, bc = math.dist(a, b), math.dist(b, c)
    return math.degrees(math.acos(max(-1, min(1, sum((a[j]-b[j])*(c[j]-b[j]) for j in (0, 1))/(ab*bc))))) if ab and bc else 0


def _norm(value):
    # JavaScript \s, rather than Python's additional C0/NEL whitespace.
    return re.sub(r"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]", "", unicodedata.normalize("NFKC", value)).lower()


def _scene(scene):
    _require(_keys(scene, {"width", "height", "pixelsPerCm"}, {"image"}), "invalid scene fields")
    _require(_num(scene["width"], 240, 2000) and _num(scene["height"], 180, 1600) and _num(scene["pixelsPerCm"], 8, 200), "invalid calibrated scene")
    if "image" in scene:
        image = scene["image"]
        _require(isinstance(image, str) and len(image) <= 6000000 and re.fullmatch(r"data:image/png;base64,[A-Za-z0-9+/]+={0,2}", image), "invalid scene PNG URL")


def validate_question(q):
    _require(_keys(q, {"id", "subject", "unit", "type", "text", "subtopic", "source", "options", "answer", "interaction"}, {"material"}), "invalid geometry question fields")
    _require(q["subject"] == "math" and isinstance(q["type"], str) and q["type"] in TYPES and _num(q["unit"], 24, 28) and q["unit"] in TYPE_UNITS[q["type"]], "invalid geometry scope")
    _require(all(_str(q[k], n) for k, n in [("id", 120), ("text", 1000), ("source", 300), ("subtopic", 60)]), "invalid geometry text")
    _require(q["options"] == [] and q["answer"] == "", "geometry options/answer must be empty")
    _require("material" not in q or isinstance(q["material"], dict), "invalid geometry material")
    it = q["interaction"]
    if q["type"] == "triangle_construct":
        _require(_keys(it, {"scene", "given", "grid", "constraints", "marks", "tolerance"}), "invalid triangle fields")
        _scene(it["scene"])
        _require(it["grid"] is None or _num(it["grid"], 4, 100), "invalid grid")
        _require(_array(it["given"], 0, 2, lambda g, _: _keys(g, {"index", "point", "label"}) and _int(g["index"], 0, 2) and _point(g["point"], it["scene"]) and isinstance(g["label"], str) and _length(g["label"]) <= 8), "invalid given point")
        _require(len({g["index"] for g in it["given"]}) == len(it["given"]), "duplicate given point")
        _require(len(it["given"]) != 2 or math.dist(it["given"][0]["point"], it["given"][1]["point"]) > 1, "degenerate given edge")
        c = it["constraints"]
        _require(_keys(c, {"kind", "legs", "angle", "reference"}) and isinstance(c["kind"], str) and c["kind"] in {"isosceles", "right", "apex", "congruent"}, "invalid constraint")
        _require(c["legs"] is None or _array(c["legs"], 2, 2, lambda v, _: _num(v, .2, 20)), "invalid legs")
        _require(c["angle"] is None or _num(c["angle"], 10, 170), "invalid angle")
        _require(c["reference"] is None or _array(c["reference"], 3, 3, lambda p, _: _point(p, it["scene"])), "invalid reference")
        _require((any(g["index"] == 0 for g in it["given"]) and c["legs"] is not None and c["reference"] is None) if c["kind"] == "apex" else c["legs"] is None and c["angle"] is None, "invalid apex constraint")
        _require((c["reference"] is not None and all(_angle(c["reference"], i) > 5 for i in range(3)) and any(g["index"] == 0 for g in it["given"])) if c["kind"] == "congruent" else c["reference"] is None, "invalid congruent constraint")
        m = it["marks"]
        _require(_keys(m, {"labels", "rightAt", "angleAt"}) and _array(m["labels"], 0, 3, lambda v, _: _keys(v, {"index", "text"}) and _int(v["index"], 0, 2) and _str(v["text"], 8)), "invalid marks")
        _require(len({v["index"] for v in m["labels"]}) == len(m["labels"]) and (m["rightAt"] is None or _int(m["rightAt"], 0, 2)), "invalid mark index")
        _require(m["angleAt"] is None or _keys(m["angleAt"], {"index", "degrees"}) and _int(m["angleAt"]["index"], 0, 2) and _num(m["angleAt"]["degrees"], 10, 170), "invalid angle mark")
        _require(_keys(it["tolerance"], {"lengthCm", "angleDeg"}) and _num(it["tolerance"]["lengthCm"], .01, .2) and _num(it["tolerance"]["angleDeg"], .1, 5), "invalid tolerance")
    elif q["type"] == "bar_chart_draw":
        _require(_keys(it, {"axis", "bars", "unit", "title"}), "invalid chart fields")
        a = it["axis"]
        _require(_keys(a, {"min", "max", "step", "minor", "break", "labels", "below"}) and _num(a["min"], 0, 100000) and _num(a["max"], a["min"]+1, 100000) and _num(a["step"], 1, 10000) and _num(a["minor"], 1, a["step"]) and type(a["break"]) is bool, "invalid axis")
        count, levels = (a["max"]-a["min"])/a["step"], (a["max"]-a["min"])/a["minor"]
        _require(_int(count, 1, 30) and _int(a["step"]/a["minor"], 1, 20) and _int(levels, 1, 100) and (a["min"] > 0 if a["break"] else a["min"] == 0), "invalid scale")
        _require(_array(a["labels"], count+1, count+1, lambda v, i: v is None or type(v) in (int, float) and v == a["min"]+i*a["step"]) and _array(a["below"], 0, 3, lambda v, i: _num(v, 0, a["min"]-1) and (i == 0 or v > a["below"][i-1])), "invalid axis labels")
        _require(a["break"] or a["below"] == [], "unexpected below-axis labels")
        _require(_array(it["bars"], 1, 8, lambda b, _: _keys(b, {"label", "value", "given", "labelGiven"}) and _str(b["label"], 24) and _num(b["value"], a["min"], a["max"]) and _int((b["value"]-a["min"])/a["minor"], 0, 100) and type(b["given"]) is bool and type(b["labelGiven"]) is bool), "invalid bars")
        _require(len({b["label"] for b in it["bars"]}) == len(it["bars"]) and any(not b["given"] for b in it["bars"]), "duplicate or entirely given bars")
        _require(_keys(it["unit"], {"text", "required"}) and _str(it["unit"]["text"], 12) and type(it["unit"]["required"]) is bool, "invalid chart unit")
        t = it["title"]
        _require(_keys(t, {"text", "required", "keywords"}) and _str(t["text"], 60) and type(t["required"]) is bool, "invalid title")
        _require((_array(t["keywords"], 2, 5, lambda g, _: _array(g, 1, 5, lambda w, _: _str(w, 16))) and all(any(_norm(w) in _norm(t["text"]) for w in g) for g in t["keywords"])) if t["required"] else t["keywords"] == [], "invalid title criteria")
    else:
        _require(_keys(it, {"scene", "tools", "outputs"}), "invalid measurement fields")
        _scene(it["scene"])
        _require("image" in it["scene"], "measurement requires PNG")
        _require(_array(it["tools"], 1, 3, lambda v, _: isinstance(v, str) and v in {"ruler", "protractor", "square"}) and len(set(it["tools"])) == len(it["tools"]), "invalid tools")
        def output(o, _):
            if not isinstance(o, dict) or not _str(o.get("label"), 80):
                return False
            if o.get("kind") == "number":
                return _keys(o, {"kind", "label", "answer", "tolerance", "unit"}) and _num(o["answer"], 0, 10000) and _num(o["tolerance"], 0, 5) and isinstance(o["unit"], str) and _length(o["unit"]) <= 12
            return (_keys(o, {"kind", "label", "options", "answer"}) and isinstance(o["kind"], str) and o["kind"] in {"single", "set"}
                    and _array(o["options"], 2, 10, lambda v, _: _str(v, 24)) and len(set(o["options"])) == len(o["options"])
                    and _array(o["answer"], 1, 1 if o["kind"] == "single" else len(o["options"]), lambda v, _: _int(v, 0, len(o["options"])-1)) and len(set(o["answer"])) == len(o["answer"]))
        _require(_array(it["outputs"], 1, 8, output), "invalid measurement outputs")


def question_semantic(q):
    return json.dumps([q["type"], q["interaction"]], ensure_ascii=False, separators=(",", ":"))
