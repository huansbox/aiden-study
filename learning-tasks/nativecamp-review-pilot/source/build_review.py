# /// script
# requires-python = ">=3.13"
# dependencies = ["reportlab>=4.4,<5"]
# ///
"""Build the one-page child and parent review sheets from the lesson specification."""

import json
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

TASK = Path(__file__).resolve().parents[1]
OUT = TASK / "output/pdf"
INK = colors.HexColor("#173746")
TEAL = colors.HexColor("#237569")
PALE = colors.HexColor("#F0F6F4")
GRAY = colors.HexColor("#4C5B61")
EDGE = colors.HexColor("#B7C9C6")
W, H = A4


def fonts():
    for name, file in [("CJK", "msjh.ttc"), ("CJKBold", "msjhbd.ttc")]:
        path = Path("C:/Windows/Fonts") / file
        if not path.is_file():
            raise FileNotFoundError(f"Required font missing: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path), subfontIndex=0))


def line(c, text, x, y, size=12, bold=False, color=INK):
    c.setFont("CJKBold" if bold else "CJK", size)
    c.setFillColor(color)
    c.drawString(x, y, text)


def paragraph(c, text, x, top, width, size=11, leading=16, color=INK, max_h=None):
    style = ParagraphStyle("text", fontName="CJK", fontSize=size, leading=leading,
                           textColor=color, wordWrap="CJK")
    p = Paragraph(escape(text), style)
    _, height = p.wrap(width, H)
    if max_h is not None and height > max_h:
        raise ValueError(f"Text exceeds its layout box: {text}")
    p.drawOn(c, x, top - height)
    return height


def box(c, top, height, fill=colors.white):
    c.setFillColor(fill)
    c.setStrokeColor(EDGE)
    c.setLineWidth(0.7)
    c.roundRect(40, top - height, W - 80, height, 10, fill=1, stroke=1)


def heading(c, n, title, y):
    c.setFillColor(TEAL)
    c.circle(62, y + 5, 13, fill=1, stroke=0)
    line(c, str(n), 58, y, 13, True, colors.white)
    line(c, title, 85, y, 16, True)


def footer(c, audience):
    line(c, f"Native Camp 課後複習 | {audience} | 2026/09/15 課程", 40, 28, 8, color=GRAY)
    line(c, "1 / 1", W - 70, 28, 8, color=GRAY)


def tree(c, x, y):
    c.setFillColor(colors.HexColor("#946B43"))
    c.rect(x - 3, y, 6, 22, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#488C73"))
    c.circle(x, y + 30, 15, fill=1, stroke=0)
    c.circle(x - 9, y + 23, 11, fill=1, stroke=0)
    c.circle(x + 9, y + 23, 11, fill=1, stroke=0)


def toy_box(c, x, y):
    c.setFillColor(colors.HexColor("#EBD6AD"))
    c.setStrokeColor(INK)
    c.roundRect(x, y, 110, 47, 4, fill=1, stroke=1)
    c.setLineWidth(2)
    c.line(x, y + 47, x + 101, y + 70)
    palette = [colors.HexColor(v) for v in ["#DB846F", "#77A6BB", "#E5B75B"]]
    for i, (dx, dy) in enumerate([(8, 18), (32, 18), (58, 18), (83, 18),
                                  (16, 41), (42, 42), (68, 41), (38, 63)]):
        c.setFillColor(palette[i % len(palette)])
        c.setStrokeColor(INK)
        c.roundRect(x + dx, y + dy, 20, 20, 2, fill=1, stroke=1)
    c.setLineWidth(0.7)


def child(data):
    path = OUT / "review-child.pdf"
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(data["title"] + " - 孩子版")
    c.setAuthor("家庭學習任務")
    line(c, data["title"], 40, 797, 26, True)
    line(c, "約 5-10 分鐘 | 用說的就好，不必寫答案", 40, 771, 12, color=GRAY)
    box(c, 750, 65, PALE)
    line(c, "先暖身", 55, 724, 13, True, TEAL)
    line(c, data["warmup"]["question"], 150, 721, 17, True)
    line(c, "說完就往下，不用從 1 開始數。", 150, 702, 10, color=GRAY)

    a, b, d = data["activities"]
    box(c, 670, 181)
    heading(c, 1, a["title"], 643)
    line(c, a["question"], 57, 615, 16)
    for i in range(a["tree_count"]):
        tree(c, 103 + i * 88, 537)
    c.setStrokeColor(EDGE)
    c.line(74, 536, 510, 536)
    line(c, a["instruction"], 57, 508, 11, color=GRAY)

    box(c, 475, 133)
    heading(c, 2, b["title"], 448)
    c.setFillColor(PALE)
    c.roundRect(57, 391, W - 114, 35, 5, fill=1, stroke=0)
    line(c, b["heading"], 77, 402, 18, True, TEAL)
    line(c, b["question"], 57, 372, 15)
    line(c, b["instruction"], 57, 353, 10, color=GRAY)

    box(c, 328, 168)
    heading(c, 3, d["title"], 301)
    line(c, d["instruction"], 57, 277, 11, color=GRAY)
    toy_box(c, 77, 184)
    line(c, "Tell me about", 242, 229, 19, True)
    line(c, "your toys.", 242, 202, 19, True)

    box(c, 145, 81, PALE)
    line(c, "最後，再試一次", 55, 120, 13, True, TEAL)
    paragraph(c, "選一題，換成身邊的東西，再說一句完整英文。", 55, 109, W - 110, 12, 18)
    line(c, "今天最想再練的是： 1 數量 / 2 主題 / 3 太多了", 55, 78, 10, color=GRAY)
    footer(c, "孩子版")
    c.showPage()
    c.save()
    return path


def parent(data):
    path = OUT / "review-parent.pdf"
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(data["title"] + " - 家長提示版")
    c.setAuthor("家庭學習任務")
    line(c, "家長陪練：讓孩子自己說整句", 40, 800, 20, True)
    paragraph(c, "先問、等約 5 秒；需要時只給開頭，再給完整示範。下一輪換情境，觀察能否自己想起來。", 40, 780, W - 80, 11, 16, max_h=38)

    box(c, 735, 57, PALE)
    line(c, "暖身｜30 秒", 55, 714, 12, True, TEAL)
    line(c, data["warmup"]["answer"], 178, 714, 12)
    line(c, data["warmup"]["note"], 55, 691, 10, color=GRAY)

    for i, item in enumerate(data["activities"]):
        top = 666 - i * 135
        box(c, top, 125)
        line(c, f"{i + 1}｜{item['title']}  約 2 分鐘", 55, top - 23, 12, True, TEAL)
        line(c, item["answer"], 55, top - 44, 12, True)
        paragraph(c, item["accepted"], 55, top - 50, W - 110, 9.5, 14, max_h=28)
        paragraph(c, "提示：" + item["hint"], 55, top - 68, W - 110, 9.5, 14, max_h=28)
        paragraph(c, "換情境：" + item["transfer"], 55, top - 86, W - 110, 9.5, 14, max_h=28)
        line(c, item["evidence"], 55, top - 115, 8, color=GRAY)

    line(c, "只記錄本次表現，不打分數", 40, 246, 12, True)
    labels = ["自己說", "提示後說", "示範後跟說"]
    for j, label in enumerate(labels):
        line(c, label, 205 + j * 112, 226, 10)
    for i, label in enumerate(["1 數量", "2 主題", "3 太多了"]):
        y = 202 - i * 22
        line(c, label, 55, y, 10)
        c.setFillColor(colors.white)
        c.setStrokeColor(GRAY)
        for j in range(3):
            c.rect(223 + j * 112, y - 1, 10, 10, fill=0, stroke=1)

    paragraph(c, "立即跟讀不等於自己想起來。最後換物品或標題再問一次；累了可只做一題。這份練習不評發音，也不把轉錄錯字當成孩子的錯誤。", 40, 136, W - 80, 10, 15, max_h=45)
    paragraph(c, "核對基礎：網站逐字稿、左右聲道的本機轉錄抽樣，以及 Oxford Discover 1 實際第 86-89 頁。題目與插圖為本次原創。", 40, 87, W - 80, 8.5, 12, max_h=30)
    c.linkURL(data["material"]["url"], (40, 59, W - 40, 87), relative=0)
    footer(c, "家長提示版")
    c.showPage()
    c.save()
    return path


def main():
    data = json.loads((TASK / "source/review-content.json").read_text(encoding="utf-8"))
    fonts()
    OUT.mkdir(parents=True, exist_ok=True)
    for path in [child(data), parent(data)]:
        print(path)


if __name__ == "__main__":
    main()
