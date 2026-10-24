# /// script
# requires-python = ">=3.13"
# dependencies = ["reportlab>=4.4,<5"]
# ///
"""Rebuild the fixed, black-and-white A4 number-line worksheets."""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parent / "output" / "pdf"
PAGE_W, PAGE_H = A4
LEFT, RIGHT = 38, PAGE_W - 38
FONT, BOLD = "NumberLineCJK", "NumberLineCJKBold"
SET_NAMES = {"transition": "過渡卷", "independent": "獨立卷"}
LEVEL_NAMES = {"beginner": "初階", "intermediate": "中階", "advanced": "三次減法挑戰"}


def text(pdf, x, y, value, size=12, bold=False, center=False):
    pdf.setFillColor(colors.black)
    pdf.setFont(BOLD if bold else FONT, size)
    (pdf.drawCentredString if center else pdf.drawString)(x, y, value)


def segment_name(problem, segment):
    labels = {point["id"]: point["label"] for point in problem["points"]}
    return "".join(labels[point] for point in segment)


def given_text(problem):
    return "，".join(f'{segment_name(problem, g["segment"])} = {g["length"]}' for g in problem["givens"]) + "。"


def all_lengths(problem):
    lengths = {g["segment"]: g["length"] for g in problem["givens"]}
    for route in problem["routes"]:
        lengths.update({step["result"]: step["value"] for step in route["steps"]})
    return lengths


def equation(problem, step):
    lengths = all_lengths(problem)
    return (
        f'{segment_name(problem, step["long"])} {lengths[step["long"]]}'
        f' - {segment_name(problem, step["short"])} {lengths[step["short"]]}'
        f' = {segment_name(problem, step["result"])} {step["value"]}'
    )


def page_header(pdf, title, subtitle, page, total):
    text(pdf, LEFT, PAGE_H - 44, title, 22, bold=True)
    text(pdf, LEFT, PAGE_H - 66, subtitle, 10.5)
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(0.6)
    pdf.line(LEFT, PAGE_H - 77, RIGHT, PAGE_H - 77)
    text(pdf, LEFT, 24, "數線長短差｜圖不必按比例；看端點與包含關係。", 9)
    text(pdf, RIGHT - 52, 24, f"{page} / {total}", 9)


def draw_arc(pdf, x1, x2, baseline, height, dashed=False, target=False):
    pdf.saveState()
    pdf.setLineWidth(1.6 if target else 0.9)
    if dashed:
        pdf.setDash(3, 2)
    p = pdf.beginPath()
    p.moveTo(x1, baseline)
    control = height / 0.75
    span = x2 - x1
    p.curveTo(x1 + span * 0.2, baseline + control, x2 - span * 0.2, baseline + control, x2, baseline)
    pdf.drawPath(p)
    pdf.restoreState()


def arc_label(pdf, x1, x2, baseline, height, label, target=False):
    label_y = baseline + height + (5 if height > 0 else -14)
    width = pdfmetrics.stringWidth(label, FONT, 10.5) + 8
    pdf.setFillColor(colors.white)
    pdf.rect((x1 + x2 - width) / 2, label_y - 2, width, 15, fill=1, stroke=0)
    text(pdf, (x1 + x2) / 2, label_y, label, 10.5, bold=target, center=True)


def number_line(pdf, problem, baseline, mode="bare", prefilled=()):
    start, end = LEFT + 34, RIGHT - 34
    ids = [point["id"] for point in problem["points"]]
    x = {point: start + (end - start) * i / (len(ids) - 1) for i, point in enumerate(ids)}
    given = {g["segment"] for g in problem["givens"]}
    lengths = all_lengths(problem)
    if mode == "answer":
        if len(ids) == 5:
            heights = {"AE": 108, "AD": 84, "BE": 60, "AC": 36, "AB": -24, "BC": -24, "CD": -24, "DE": -24, "CE": -50, "BD": -76}
        else:
            heights = {"AD": 78, "AC": 54, "BD": 30, "AB": -30, "BC": -30, "CD": -30}
        arcs = list(lengths)
    else:
        heights = {"AD": 78, "AC": 54, "BD": 30, "AE": 80, "BE": 55, "CD": 30}
        arcs = list(prefilled)
    for segment in arcs:
        a, b = segment
        draw_arc(pdf, x[a], x[b], baseline, heights[segment], dashed=mode == "answer" and segment not in given, target=segment == problem["target"])
    # Paint every label after every curve, so a later crossing curve cannot
    # run through an earlier label in the full five-point answer diagram.
    for segment in arcs:
        a, b = segment
        arc_label(pdf, x[a], x[b], baseline, heights[segment], f"{segment_name(problem, segment)} {lengths[segment]}", target=segment == problem["target"])
    pdf.setLineWidth(1.1)
    pdf.line(start, baseline, end, baseline)
    for point in problem["points"]:
        pdf.circle(x[point["id"]], baseline, 2.3, fill=1, stroke=0)
        point_y = baseline + 7 if mode == "answer" else baseline - 20
        text(pdf, x[point["id"]], point_y, point["label"], 12, bold=True, center=True)


def blank_equation(pdf, problem, y, step=None, names=3):
    # Names sit above each numeric slot, just as in the photographed paper method.
    columns = [LEFT + 60, LEFT + 205, LEFT + 350]
    fields = [step["long"], step["short"], step["result"]] if step else [None] * 3
    for index, x in enumerate(columns):
        if fields[index] and index < names:
            text(pdf, x, y + 20, segment_name(problem, fields[index]), 11, center=True)
        else:
            pdf.setLineWidth(0.5)
            pdf.line(x - 30, y + 18, x + 30, y + 18)
        pdf.setLineWidth(0.7)
        pdf.line(x - 40, y - 1, x + 40, y - 1)
    text(pdf, (columns[0] + columns[1]) / 2, y, "-", 15, center=True)
    text(pdf, (columns[1] + columns[2]) / 2, y, "=", 15, center=True)


def child_question(pdf, problem, index, top, transition):
    text(pdf, LEFT, top, f"第 {index} 題｜{LEVEL_NAMES[problem['level']]}", 14, bold=True)
    text(pdf, LEFT, top - 25, given_text(problem), 12)
    text(pdf, LEFT, top - 47, f"{segment_name(problem, problem['target'])} 有多長？", 13, bold=True)
    prefilled = []
    if transition:
        prefilled = ["AD", "AC", "BD"] if index == 1 else ["AD"] if index <= 3 else []
    baseline = top - (155 if index == 6 else 167)
    number_line(pdf, problem, baseline, prefilled=prefilled)
    if not transition:
        return
    route = next((r for r in problem["routes"] if r["id"] == problem["preferredRoute"]), problem["routes"][0])
    if index <= 2:
        text(pdf, LEFT, top - 208, "補畫需要的弧線；把新結果標回圖上。", 10.5)
        blank_equation(pdf, problem, top - 258, route["steps"][0], 3 if index == 1 else 2)
    elif index == 3:
        text(pdf, LEFT, top - 205, f"先求 {segment_name(problem, 'AB')}，再用新結果。", 10.5)
        for i, step in enumerate(route["steps"]):
            blank_equation(pdf, problem, top - 248 - i * 47, step)
    elif index == 4:
        text(pdf, LEFT, top - 205, f"先求 {segment_name(problem, 'CD')}；第二式自己標段名。", 10.5)
        for i, step in enumerate(route["steps"]):
            blank_equation(pdf, problem, top - 248 - i * 47, step, 3 if i == 0 else 0)
    else:
        text(pdf, LEFT, top - (207 if index == 5 else 196), "自己選路。每個數字上方都要寫段名。", 10.5)
        for i in range(problem["minSubtractions"]):
            blank_equation(pdf, problem, top - (248 if index == 5 else 237) - i * 42)


def children_pdf(problems, name):
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle(f"數線長短差 - {SET_NAMES[name]}")
    pdf.setAuthor("Aiden Study")
    for page in range(3):
        subtitle = "補畫弧線、標長度；算式的每個數字上方寫段名。" if name == "transition" else "自己畫弧線、標長度、列式；算式的每個數字旁寫段名。"
        page_header(pdf, f"數線長短差｜{SET_NAMES[name]}", subtitle, page + 1, 3)
        text(pdf, RIGHT - 144, PAGE_H - 43, "姓名：__________", 10)
        for row in range(2):
            index = page * 2 + row
            top = PAGE_H - 106 - row * 347
            child_question(pdf, problems[index], index + 1, top, name == "transition")
        pdf.setLineWidth(0.4)
        pdf.setDash(2, 3)
        pdf.line(LEFT, PAGE_H - 433, RIGHT, PAGE_H - 433)
        pdf.setDash()
        pdf.showPage()
    pdf.save()
    return stream.getvalue()


def parent_question(pdf, problem, set_name, index, top):
    text(pdf, LEFT, top, f"{SET_NAMES[set_name]} 第 {index} 題｜{segment_name(problem, problem['target'])} = {problem['answer']}", 14, bold=True)
    text(pdf, LEFT, top - 24, given_text(problem), 11)
    number_line(pdf, problem, top - 153, mode="answer")
    if problem["level"] == "beginner":
        text(pdf, LEFT + 16, top - 237, equation(problem, problem["routes"][0]["steps"][0]), 12)
        text(pdf, LEFT + 16, top - 268, "共用一個端點；短段在長段裡。", 10.5)
        return
    for column, route in enumerate(problem["routes"]):
        x = LEFT + column * 264
        text(pdf, x, top - 221, "先求左側" if route["id"] == "left" else "先求右側", 11, bold=True)
        for row, step in enumerate(route["steps"]):
            text(pdf, x, top - 244 - row * 23, equation(problem, step), 10.5)


def advanced_parent(pdf, problem, set_name, page, total):
    page_header(pdf, "數線長短差｜家長解答", "實線是題目已知；虛線是算出的新段；粗線是要求的段。", page, total)
    top = PAGE_H - 107
    text(pdf, LEFT, top, f"{SET_NAMES[set_name]} 第 6 題｜BC = {problem['answer']}", 15, bold=True)
    text(pdf, LEFT, top - 25, given_text(problem), 12)
    number_line(pdf, problem, PAGE_H - 265, mode="answer")
    text(pdf, LEFT, PAGE_H - 374, "以下五條都合法；每條最少三次相減。", 11, bold=True)
    titles = {"left": "路線 1：先找 AB、AC", "left-reordered": "路線 2：先找 AC、AB", "right": "路線 3：先找 DE、BD", "outer": "路線 4：先找 AC、CE", "left-chain": "路線 5：先找 AB、BD"}
    y = PAGE_H - 402
    for route in problem["routes"]:
        text(pdf, LEFT, y, titles[route["id"]], 10.5, bold=True)
        for row, step in enumerate(route["steps"]):
            text(pdf, LEFT + 205, y - row * 17, equation(problem, step), 11)
        y -= 64
    text(pdf, LEFT, 68, "核對段名與共端包含關係；數字剛好相同，不代表用了正確線段。", 10)
    pdf.showPage()


def parent_pdf(sets):
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle("數線長短差 - 家長解答")
    pdf.setAuthor("Aiden Study")
    page = 0
    for name in SET_NAMES:
        problems = sets[name]
        for pair in [[0, 1], [2, 3], [4]]:
            page += 1
            page_header(pdf, "數線長短差｜家長解答", "實線是已知；虛線是新結果。中階左右兩路都接受。", page, 8)
            for row, index in enumerate(pair):
                parent_question(pdf, problems[index], name, index + 1, PAGE_H - 108 - row * 347)
            if len(pair) == 1:
                y = PAGE_H - 465
                for line in ["核答時先看段名，再看數字。", "每次相減：兩段共用一個端點，短段包含於長段。", "算出的新段要標回原圖，下一步才有依據。", "圖不按比例，不能用尺量或看畫得多長來猜答案。"]:
                    text(pdf, LEFT, y, line, 12)
                    y -= 32
            pdf.showPage()
        page += 1
        advanced_parent(pdf, problems[5], name, page, 8)
    pdf.save()
    return stream.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/msjh.ttc"))
    parser.add_argument("--bold-font", type=Path, default=Path("C:/Windows/Fonts/msjhbd.ttc"))
    parser.add_argument("--check", action="store_true", help="compare deterministic rebuilds without changing files")
    args = parser.parse_args()
    for name, path in [(FONT, args.font), (BOLD, args.bold_font)]:
        if not path.is_file():
            parser.error(f"找不到中文字型：{path}；可用 --font / --bold-font 指定 TrueType 字型。")
        pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=0))
    bank = json.loads((HERE / "problems.json").read_text(encoding="utf-8"))
    outputs = {
        "number-line-transition.pdf": children_pdf(bank["sets"]["transition"], "transition"),
        "number-line-independent.pdf": children_pdf(bank["sets"]["independent"], "independent"),
        "number-line-parent-answers.pdf": parent_pdf(bank["sets"]),
    }
    if not args.check:
        args.output.mkdir(parents=True, exist_ok=True)
    for name, data in outputs.items():
        path = args.output / name
        if args.check:
            if not path.is_file() or path.read_bytes() != data:
                raise SystemExit(f"產物需重建：{path}")
            print(f"OK {path}")
        else:
            path.write_bytes(data)
            print(path)


if __name__ == "__main__":
    main()
