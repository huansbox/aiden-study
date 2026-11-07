"""Build the two original parent quick references; no private papers are required."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parent.parent / "output" / "pdf"
INPUTS = ["content.json", "quick-reference.json", "build-pdf.py"]
W, H = A4
MARGIN = 35
INK = colors.HexColor("#1c3040")
MUTED = colors.HexColor("#52616c")
LINE = colors.HexColor("#cbd4da")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--font", default=os.environ.get("PARENT_GUIDE_FONT", "C:/Windows/Fonts/msjh.ttc"))
    parser.add_argument("--bold-font", default=os.environ.get("PARENT_GUIDE_BOLD_FONT", "C:/Windows/Fonts/msjhbd.ttc"))
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    for name, path in [("TC", args.font), ("TCBold", args.bold_font)]:
        if not Path(path).is_file():
            parser.error(f"Font missing: {path}. Supply --font and --bold-font with embeddable Traditional Chinese TrueType fonts.")
        pdfmetrics.registerFont(TTFont(name, path))

    data = json.loads((SOURCE / "quick-reference.json").read_text(encoding="utf-8"))
    original = json.loads((SOURCE / "content.json").read_text(encoding="utf-8"))
    units = {unit["id"]: unit for unit in original["units"]}
    rows = {row["id"]: row for row in data["rows"]}
    expected = [item["id"] for unit in units.values() for item in unit["items"]]
    assert len(rows) == len(data["rows"]) == len(expected) == 37
    assert set(rows) == set(expected), "Quick reference must cover every original item exactly once"
    planned = [uid for subject in data["subjects"] for page in subject["pages"] for uid in page]
    assert len(planned) == len(units) and set(planned) == set(units)
    for row in rows.values():
        assert all(row.get(key) for key in ("scope", "know", "exam"))
    text = json.dumps(data, ensure_ascii=False) + "".join(unit["title"] for unit in units.values())
    for font in ["TC", "TCBold"]:
        missing = set(text) - set(map(chr, pdfmetrics.getFont(font).face.charWidths))
        assert not missing, f"Missing glyphs in {font}: {missing}"

    normal = ParagraphStyle("body", fontName="TC", fontSize=11, leading=15.5, textColor=INK, wordWrap="CJK")
    bold = ParagraphStyle("label", parent=normal, fontName="TCBold", fontSize=10.5)
    white = ParagraphStyle("head", parent=bold, textColor=colors.white)
    note = ParagraphStyle("note", parent=normal, fontSize=9, leading=13, textColor=MUTED)
    para = lambda text, style=normal: Paragraph(escape(text), style)
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {"inputs": {name: hashlib.sha256((SOURCE / name).read_text(encoding="utf-8").encode("utf-8")).hexdigest() for name in INPUTS}, "reportlab": reportlab.Version,
                "fonts": [{"name": pdfmetrics.getFont(name).face.name.decode(), "sha256": sha(Path(path))}
                          for name, path in [("TC", args.font), ("TCBold", args.bold_font)]], "pdfs": []}
    for subject in data["subjects"]:
        path = args.output / subject["filename"]
        pdf = canvas.Canvas(str(path), pagesize=A4, pageCompression=1, invariant=1)
        pdf.setTitle(f"四上{subject['name']}｜家長備考速查")
        pdf.setAuthor("Aiden Study")
        pdf.setSubject("範圍、要會什麼、考卷怎麼考")
        coverage = []
        for number, page_units in enumerate(subject["pages"], 1):
            pdf.setFillColor(INK)
            pdf.setFont("TCBold", 20)
            pdf.drawString(MARGIN, H - 48, f"{subject['name']}｜家長備考速查")
            pdf.setFont("TC", 10)
            pdf.setFillColor(MUTED)
            pdf.drawString(MARGIN, H - 68, f"四年級上學期　{subject['range']}　／　範圍・能力・考法")
            top = H - 85
            if number == 1:
                p = para(data["scope"], note)
                _, height = p.wrap(W - 2 * MARGIN, 100)
                p.drawOn(pdf, MARGIN, top - height)
                top -= height + 12
            table_rows = [[para(t, white) for t in ["範圍", "要會什麼", "考卷怎麼考"]]]
            unit_indices = []
            for uid in page_units:
                unit = units[uid]
                assert unit["subject"] == subject["id"]
                unit_indices.append(len(table_rows))
                table_rows.append([para(unit["title"], bold), "", ""])
                for item in unit["items"]:
                    row = rows[item["id"]]
                    table_rows.append([para(row["scope"], bold), para(row["know"]), para(row["exam"])])
                    coverage.append({"id": item["id"], "page": number, "scope": row["scope"]})
            table = Table(table_rows, colWidths=[108, 215, W - 2 * MARGIN - 323])
            padding = 7 if subject["id"] == "math" else 4
            commands = [("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), padding), ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
                        ("BACKGROUND", (0, 0), (-1, 0), INK),
                        ("LINEBELOW", (0, 0), (-1, -1), .45, LINE)]
            for index in unit_indices:
                commands.extend([("SPAN", (0, index), (-1, index)),
                                 ("BACKGROUND", (0, index), (-1, index), colors.HexColor("#eaf0f3")),
                                 ("TOPPADDING", (0, index), (-1, index), 6),
                                 ("BOTTOMPADDING", (0, index), (-1, index), 6)])
            table.setStyle(TableStyle(commands))
            _, height = table.wrap(W - 2 * MARGIN, H)
            bottom = top - height
            assert bottom >= 42, f"{subject['id']} page {number} overflows: bottom={bottom:.1f}"
            table.drawOn(pdf, MARGIN, bottom)
            pdf.setStrokeColor(LINE)
            pdf.line(MARGIN, 33, W - MARGIN, 33)
            pdf.setFillColor(MUTED)
            pdf.setFont("TC", 9)
            pdf.drawString(MARGIN, 19, f"四上{subject['name']} · 家長備考速查")
            pdf.drawRightString(W - MARGIN, 19, f"{number} / {len(subject['pages'])}")
            pdf.showPage()
            print(f"{subject['id']} page {number}: {len(table_rows)-1-len(page_units)} concepts; bottom {bottom:.1f} pt")
        pdf.save()
        manifest["pdfs"].append({"file": subject["filename"], "sha256": sha(path), "pages": len(subject["pages"]), "coverage": coverage})
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
