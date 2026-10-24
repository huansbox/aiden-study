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
# Fixed sides and heights for the union of every accepted route.
# The band directly below the baseline is reserved for the target box.
HEIGHTS_FOUR = {"AD": 64, "AC": 38, "BD": -82, "AB": 22, "BC": -52, "CD": 22}
HEIGHTS_FIVE = {
    "AE": 92, "AD": 58, "BE": -82, "AC": -54, "AB": 22,
    "BC": -40, "CD": -40, "DE": 22, "CE": 58, "BD": 22,
}
CHILD_PAGES = ((0, 1), (2,), (3,), (4,), (5,))


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
        f'{segment_name(problem, step["result"])} {step["value"]} = '
        f'{segment_name(problem, step["long"])} {lengths[step["long"]]} - '
        f'{segment_name(problem, step["short"])} {lengths[step["short"]]}'
    )


def preferred_route(problem):
    return next((r for r in problem["routes"] if r["id"] == problem["preferredRoute"]), problem["routes"][0])


def page_header(pdf, title, subtitle, page, total):
    text(pdf, LEFT, PAGE_H - 44, title, 22, bold=True)
    text(pdf, LEFT, PAGE_H - 66, subtitle, 10.5)
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(0.6)
    pdf.line(LEFT, PAGE_H - 77, RIGHT, PAGE_H - 77)
    text(pdf, LEFT, 24, "數線長短差｜沒有單位；圖不按比例，看端點與包含關係。", 9)
    text(pdf, RIGHT - 52, 24, f"{page} / {total}", 9)


def draw_arc(pdf, x1, x2, baseline, height, dashed=False):
    pdf.saveState()
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(0.9)
    if dashed:
        pdf.setDash(3, 2)
    path = pdf.beginPath()
    path.moveTo(x1, baseline)
    control = height / 0.75
    span = x2 - x1
    path.curveTo(x1 + span * 0.2, baseline + control, x2 - span * 0.2, baseline + control, x2, baseline)
    pdf.drawPath(path)
    pdf.restoreState()


def arc_label(pdf, x1, x2, baseline, height, label):
    label_y = baseline + height + (6 if height > 0 else -15)
    width = pdfmetrics.stringWidth(label, FONT, 11) + 8
    pdf.setFillColor(colors.white)
    pdf.rect((x1 + x2 - width) / 2, label_y - 2, width, 15, fill=1, stroke=0)
    text(pdf, (x1 + x2) / 2, label_y, label, 11, center=True)


def target_line(pdf, x1, x2, baseline, value=None):
    """Use a black thick horizontal segment and its own answer box."""
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(3)
    pdf.line(x1, baseline - 4, x2, baseline - 4)
    pdf.setLineWidth(0.8)
    pdf.line(x1, baseline, x1, baseline - 6)
    pdf.line(x2, baseline, x2, baseline - 6)
    center = (x1 + x2) / 2
    pdf.setFillColor(colors.white)
    pdf.roundRect(center - 23, baseline - 28, 46, 20, 3, fill=1, stroke=1)
    if value is not None:
        text(pdf, center, baseline - 22, str(value), 12, bold=True, center=True)


def number_line(pdf, problem, baseline, mode="bare", prefilled=(), target=None):
    start, end = LEFT + 34, RIGHT - 34
    ids = [point["id"] for point in problem["points"]]
    # Wider middle intervals keep the five-point short curves shallow as well.
    fractions = (0, 0.2, 0.5, 0.8, 1) if len(ids) == 5 else (0, 1 / 3, 2 / 3, 1)
    x = {point: start + (end - start) * fractions[index] for index, point in enumerate(ids)}
    given = {item["segment"] for item in problem["givens"]}
    lengths = all_lengths(problem)
    heights = HEIGHTS_FIVE if len(ids) == 5 else HEIGHTS_FOUR
    arcs = list(lengths) if mode == "answer" else list(prefilled)
    for segment in arcs:
        a, b = segment
        draw_arc(pdf, x[a], x[b], baseline, heights[segment], dashed=mode == "answer" and segment not in given)
    # Labels are painted last, so later curves cannot cut through earlier text.
    for segment in arcs:
        a, b = segment
        arc_label(pdf, x[a], x[b], baseline, heights[segment], f"{segment_name(problem, segment)} {lengths[segment]}")
    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(1)
    pdf.line(start, baseline, end, baseline)
    if mode == "answer":
        target = problem["target"]
    if target:
        a, b = target
        target_line(pdf, x[a], x[b], baseline, lengths[target] if mode == "answer" else None)
    for point in problem["points"]:
        px = x[point["id"]]
        pdf.setFillColor(colors.black)
        pdf.circle(px, baseline, 2.3, fill=1, stroke=0)
        text(pdf, px, baseline + 7, point["label"], 12, bold=True, center=True)


def blank_equation(pdf, problem, y, step=None, names=0):
    """Keep target = long - short, with a segment-name field at every number."""
    columns = [LEFT + 75, LEFT + 245, LEFT + 415]
    fields = [step["result"], step["long"], step["short"]] if step else [None] * 3
    for index, x in enumerate(columns):
        text(pdf, x, y + 47, ["目標段", "長段", "短段"][index], 10, center=True)
        if fields[index] and index < names:
            text(pdf, x, y + 24, segment_name(problem, fields[index]), 12, center=True)
        else:
            pdf.setLineWidth(0.5)
            pdf.line(x - 35, y + 21, x + 35, y + 21)
        pdf.setLineWidth(0.7)
        pdf.line(x - 42, y - 1, x + 42, y - 1)
    text(pdf, (columns[0] + columns[1]) / 2, y + 1, "=", 16, center=True)
    text(pdf, (columns[1] + columns[2]) / 2, y + 1, "-", 16, center=True)


def transition_instruction(problem, index):
    if index <= 2:
        return f"先選 {segment_name(problem, problem['target'])}；補齊弧線與長度，再找長段、短段。"
    if index in (3, 4):
        first = preferred_route(problem)["steps"][0]["result"]
        return f"先選 {segment_name(problem, first)}，算完標回圖，再求 {segment_name(problem, problem['target'])}。"
    return f"自己選第一段；用 {problem['minSubtractions']} 次相減求出 {segment_name(problem, problem['target'])}。"


def child_question(pdf, problem, index, top, transition, compact=False):
    text(pdf, LEFT, top, f"第 {index} 題｜{LEVEL_NAMES[problem['level']]}", 14, bold=True)
    text(pdf, LEFT, top - 25, given_text(problem), 12)
    text(pdf, LEFT, top - 49, f"{segment_name(problem, problem['target'])} 有多長？", 13, bold=True)
    instruction = transition_instruction(problem, index) if transition else "先選要算的段，再找長段、短段，算完標回圖。"
    text(pdf, LEFT, top - 72, instruction, 10.5)
    prefilled, target = [], None
    route = preferred_route(problem)
    if transition:
        prefilled = ["AD", "AC", "BD"] if index == 1 else ["AD", "AC"] if index == 2 else ["AD"] if index == 3 else []
        if index <= 4:
            target = route["steps"][0]["result"]
    number_line(pdf, problem, top - (158 if compact else 225), prefilled=prefilled, target=target)
    if not transition:
        return
    if compact:
        blank_equation(pdf, problem, top - 314, route["steps"][0], 3 if index == 1 else 2)
        return
    text(pdf, LEFT, top - 321, "先畫這步目標的粗橫線與下框；每步上排寫段名，下排寫數字。", 10.5)
    text(pdf, LEFT, top - 341, "算完把結果填回下框，再補成可繼續使用的弧線。", 10.5)
    for row in range(problem["minSubtractions"]):
        y = top - 432 - row * 106
        text(pdf, LEFT, y + 69, f"第 {row + 1} 步", 11, bold=True)
        names = 1 if index == 3 and row == 0 else 0
        blank_equation(pdf, problem, y, route["steps"][row] if names else None, names)


def children_pdf(problems, name):
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle(f"數線長短差 - {SET_NAMES[name]}")
    pdf.setAuthor("Aiden Study")
    for page, indices in enumerate(CHILD_PAGES, 1):
        page_header(pdf, f"數線長短差｜{SET_NAMES[name]}", "先選目標段 → 找長段、短段 → 自己計算 → 把結果標回圖。", page, len(CHILD_PAGES))
        text(pdf, RIGHT - 144, PAGE_H - 43, "姓名：__________", 10)
        for row, index in enumerate(indices):
            child_question(pdf, problems[index], index + 1, PAGE_H - 106 - row * 347, name == "transition", compact=len(indices) == 2)
        if len(indices) == 2:
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
    number_line(pdf, problem, top - 147, mode="answer")
    if problem["level"] == "beginner":
        text(pdf, LEFT + 16, top - 267, equation(problem, problem["routes"][0]["steps"][0]), 12)
        text(pdf, LEFT + 16, top - 294, "先選目標段；長、短兩段共用端點，短段在長段裡。", 10.5)
        return
    for column, route in enumerate(problem["routes"]):
        x = LEFT + column * 264
        text(pdf, x, top - 254, "先求左側" if route["id"] == "left" else "先求右側", 11, bold=True)
        for row, step in enumerate(route["steps"]):
            text(pdf, x, top - 278 - row * 23, equation(problem, step), 10.5)


def advanced_parent(pdf, problem, set_name, page, total):
    page_header(pdf, "數線長短差｜家長解答", "實線弧是已知；虛線弧是新結果；粗橫線與下框是本題目標。", page, total)
    top = PAGE_H - 107
    text(pdf, LEFT, top, f"{SET_NAMES[set_name]} 第 6 題｜BC = {problem['answer']}", 15, bold=True)
    text(pdf, LEFT, top - 25, given_text(problem), 12)
    number_line(pdf, problem, PAGE_H - 281, mode="answer")
    text(pdf, LEFT, PAGE_H - 395, "以下五條都合法；先選每一步的目標段，每條最少三次相減。", 11, bold=True)
    titles = {"left": "路線 1：先找 AB、AC", "left-reordered": "路線 2：先找 AC、AB", "right": "路線 3：先找 DE、BD", "outer": "路線 4：先找 AC、CE", "left-chain": "路線 5：先找 AB、BD"}
    y = PAGE_H - 426
    for route in problem["routes"]:
        text(pdf, LEFT, y, titles[route["id"]], 10.5, bold=True)
        for row, step in enumerate(route["steps"]):
            text(pdf, LEFT + 205, y - row * 17, equation(problem, step), 11)
        y -= 64
    text(pdf, LEFT, 64, "核對段名與共端包含關係；數字剛好相同，不能換用另一段。", 10)
    pdf.showPage()


def parent_pdf(sets):
    stream = io.BytesIO()
    pdf = canvas.Canvas(stream, pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle("數線長短差 - 家長解答")
    pdf.setAuthor("Aiden Study")
    page = 0
    for name in SET_NAMES:
        problems = sets[name]
        for pair in ((0, 1), (2, 3), (4,)):
            page += 1
            page_header(pdf, "數線長短差｜家長解答", "實線弧是已知；虛線弧是新結果；粗橫線與下框是本題目標。", page, 8)
            for row, index in enumerate(pair):
                parent_question(pdf, problems[index], name, index + 1, PAGE_H - 108 - row * 347)
            if len(pair) == 1:
                y = PAGE_H - 465
                for line in (
                    "核答先看段名，再看數字：目標段 = 長段 - 短段。",
                    "每次相減：兩段共用一個端點，短段包含於長段。",
                    "算出的新段要標回圖，下一步才有依據。",
                    "圖不按比例，不能用尺量或看畫得多長來猜答案。",
                    "過渡卷第 3 題先左、第 4 題先右；第 5 題自行選路。",
                ):
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
    for name, path in ((FONT, args.font), (BOLD, args.bold_font)):
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
