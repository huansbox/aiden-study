# /// script
# requires-python = ">=3.13"
# dependencies = ["reportlab>=4.4,<5"]
# ///

from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


HERE = Path(__file__).resolve().parent
TASK_ROOT = HERE.parent
DEFAULT_CONTENT = HERE / "private" / "practice-content.json"
DEFAULT_OUTPUT = TASK_ROOT / "output" / "pdf"


def register_fonts() -> tuple[str, str]:
    regular = Path("C:/Windows/Fonts/msjh.ttc")
    bold = Path("C:/Windows/Fonts/msjhbd.ttc")
    if not regular.exists() or not bold.exists():
        raise FileNotFoundError("需要 Microsoft JhengHei 字型（msjh.ttc、msjhbd.ttc）")
    pdfmetrics.registerFont(TTFont("PracticeCJK", str(regular), subfontIndex=0))
    pdfmetrics.registerFont(TTFont("PracticeCJKBold", str(bold), subfontIndex=0))
    return "PracticeCJK", "PracticeCJKBold"


def styles(font: str, bold: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "TitleCJK", parent=base["Title"], fontName=bold, fontSize=20,
            leading=27, alignment=TA_CENTER, textColor=colors.black, spaceAfter=4 * mm
        ),
        "subtitle": ParagraphStyle(
            "SubtitleCJK", parent=base["Normal"], fontName=font, fontSize=10.5,
            leading=15, alignment=TA_CENTER, textColor=colors.HexColor("#333333"), spaceAfter=4 * mm
        ),
        "body": ParagraphStyle(
            "BodyCJK", parent=base["BodyText"], fontName=font, fontSize=11.5,
            leading=17, textColor=colors.black
        ),
        "question": ParagraphStyle(
            "QuestionCJK", parent=base["BodyText"], fontName=font, fontSize=13.2,
            leading=20, textColor=colors.black, spaceAfter=2 * mm
        ),
        "question_id": ParagraphStyle(
            "QuestionIdCJK", parent=base["Heading3"], fontName=bold, fontSize=13,
            leading=17, textColor=colors.black, spaceAfter=1.5 * mm
        ),
        "option": ParagraphStyle(
            "OptionCJK", parent=base["BodyText"], fontName=font, fontSize=12.2,
            leading=18, leftIndent=2 * mm
        ),
        "answer_heading": ParagraphStyle(
            "AnswerHeadingCJK", parent=base["Heading3"], fontName=bold, fontSize=12.5,
            leading=17, textColor=colors.black, spaceAfter=1.5 * mm
        ),
        "answer": ParagraphStyle(
            "AnswerCJK", parent=base["BodyText"], fontName=font, fontSize=10.8,
            leading=15.5, textColor=colors.black, spaceAfter=1.1 * mm
        ),
        "small": ParagraphStyle(
            "SmallCJK", parent=base["BodyText"], fontName=font, fontSize=9.5,
            leading=13.5, textColor=colors.HexColor("#333333")
        ),
    }


def markup(text: str) -> str:
    return escape(text).replace("\n", "<br/>")


def answer_lines(count: int, width: float) -> Table:
    rows = [[""] for _ in range(count)]
    table = Table(rows, colWidths=[width], rowHeights=[10 * mm] * count)
    commands = [("LINEBELOW", (0, i), (0, i), 0.65, colors.HexColor("#777777")) for i in range(count)]
    table.setStyle(TableStyle(commands + [("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return table


def question_block(item: dict, display_number: int, st: dict[str, ParagraphStyle], usable_width: float):
    content = [
        Paragraph(f"{display_number}.　{escape(item['label'])}", st["question_id"]),
        Paragraph(markup(item["prompt"]), st["question"]),
    ]
    options = item.get("options", [])
    if options:
        option_cells = [Paragraph(markup(option), st["option"]) for option in options]
        if len(option_cells) == 4:
            option_rows = [option_cells[:2], option_cells[2:]]
            option_table = Table(option_rows, colWidths=[usable_width / 2 - 4 * mm] * 2)
        else:
            option_table = Table([[cell] for cell in option_cells], colWidths=[usable_width - 8 * mm])
        option_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 1 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 1 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1 * mm),
        ]))
        content.append(option_table)
    line_count = int(item.get("answer_lines", 1))
    if line_count:
        content.append(answer_lines(line_count, usable_width - 10 * mm))
    box = Table([[content]], colWidths=[usable_width], style=TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#555555")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
    ]))
    return KeepTogether([box, Spacer(1, 3.2 * mm)])


def page_footer(canvas, doc, font: str, label: str) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#999999"))
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFont(font, 8.5)
    canvas.setFillColor(colors.HexColor("#444444"))
    canvas.drawString(18 * mm, 9 * mm, label)
    canvas.drawRightString(A4[0] - 18 * mm, 9 * mm, f"第 {doc.page} 頁")
    canvas.restoreState()


def build_child(content: dict, output: Path, font: str, bold: str) -> None:
    st = styles(font, bold)
    doc = SimpleDocTemplate(
        str(output), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=20 * mm, title=content["title"],
        author="Aiden Study family learning task"
    )
    width = A4[0] - 36 * mm
    story = [
        Paragraph(markup(content["title"]), st["title"]),
        Paragraph(markup(content["subtitle"]), st["subtitle"]),
    ]
    info = Table(
        [["姓名：________________", "日期：____________", "實際時間：______ 分鐘"]],
        colWidths=[width * 0.38, width * 0.28, width * 0.34], rowHeights=[10 * mm]
    )
    info.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), font), ("FONTSIZE", (0, 0), (-1, -1), 10.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#777777")),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BBBBBB")),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    story.extend([info, Spacer(1, 3 * mm), Paragraph(markup(content["child_instructions"]), st["body"]), Spacer(1, 4 * mm)])
    for display_number, item in enumerate(content["questions"], start=1):
        if item.get("page_break_before"):
            story.append(PageBreak())
        story.append(question_block(item, display_number, st, width))
    doc.build(
        story,
        onFirstPage=lambda canvas, d: page_footer(canvas, d, font, "一億以內的數｜孩子練習"),
        onLaterPages=lambda canvas, d: page_footer(canvas, d, font, "一億以內的數｜孩子練習"),
    )


def parent_block(item: dict, display_number: int, st: dict[str, ParagraphStyle], usable_width: float):
    rows = [
        [Paragraph(f"{display_number}.　{escape(item['label'])}", st["answer_heading"])],
        [Paragraph(f"<b>答案：</b>{markup(item['answer'])}", st["answer"])],
        [Paragraph(f"<b>核對方法：</b>{markup(item['method'])}", st["answer"])],
        [Paragraph(f"<b>練習觀念：</b>{markup(item['concept'])}", st["answer"])],
        [Paragraph(f"<b>如果答錯：</b>{markup(item['review'])}", st["answer"])],
    ]
    table = Table(rows, colWidths=[usable_width])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#555555")),
        ("LINEBELOW", (0, 0), (-1, 0), 0.45, colors.HexColor("#AAAAAA")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFEFEF")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.3 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.3 * mm),
    ]))
    return KeepTogether([table, Spacer(1, 3.2 * mm)])


def build_parent(content: dict, output: Path, font: str, bold: str) -> None:
    st = styles(font, bold)
    doc = SimpleDocTemplate(
        str(output), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=20 * mm, title=f"{content['title']}－家長答案",
        author="Aiden Study family learning task"
    )
    width = A4[0] - 36 * mm
    story = [
        Paragraph(markup(f"{content['title']}｜家長答案"), st["title"]),
        Paragraph(markup(content["parent_intro"]), st["body"]),
        Spacer(1, 4 * mm),
    ]
    for display_number, item in enumerate(content["questions"], start=1):
        story.append(parent_block(item, display_number, st, width))
    story.extend([
        Spacer(1, 2 * mm),
        Paragraph("人工記錄（只供下次安排，不作能力診斷）", st["answer_heading"]),
        Table(
            [["日期", "實際時間", "需要再看的題號", "觀察／下次調整"], ["", "", "", ""]],
            colWidths=[28 * mm, 30 * mm, 43 * mm, width - 101 * mm],
            rowHeights=[9 * mm, 24 * mm],
            style=TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), font), ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("ALIGN", (0, 0), (-1, 0), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EFEFEF")),
                ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#555555")),
                ("INNERGRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#999999")),
                ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
            ]),
        ),
        Spacer(1, 3 * mm),
        Paragraph(markup(content["parent_caution"]), st["small"]),
    ])
    doc.build(
        story,
        onFirstPage=lambda canvas, d: page_footer(canvas, d, font, "一億以內的數｜家長答案"),
        onLaterPages=lambda canvas, d: page_footer(canvas, d, font, "一億以內的數｜家長答案"),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build child practice and parent guide PDFs from private content JSON.")
    parser.add_argument("--content", type=Path, default=DEFAULT_CONTENT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    content = json.loads(args.content.read_text(encoding="utf-8"))
    expected_ids = [f"U1-P{i:02d}" for i in range(1, 11)]
    actual_ids = [item["id"] for item in content["questions"]]
    if actual_ids != expected_ids:
        raise ValueError(f"practice IDs must be exactly {expected_ids}; got {actual_ids}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    font, bold = register_fonts()
    build_child(content, args.output_dir / "grade4-math-u1-practice.pdf", font, bold)
    build_parent(content, args.output_dir / "grade4-math-u1-parent-guide.pdf", font, bold)


if __name__ == "__main__":
    main()
