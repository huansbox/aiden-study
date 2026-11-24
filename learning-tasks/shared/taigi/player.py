"""兩篇台語跟讀練習共用的字幕與網頁。"""

import io
import json
import math
import re
import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SOURCE = Path(__file__).resolve().parent
SIZE = (1920, 1080)
CAPTION_TOP = 858
CAPTION_HEIGHT = 180
SAFE_WIDTH = 1810
READ_COLOR = "#68B8EF"
OUTLINE = "#1B2B39"


class Lettering:
    def __init__(self, lines, font_dir):
        match = subprocess.check_output(["fc-match", "-f", "%{file}\n%{index}",
            "PingFang TC,Noto Sans CJK TC:style=Semibold,Bold"], text=True)
        path, face = match.splitlines()
        self.primary = (path, int(face))
        self.fallback = (str(font_dir / "Iansui-Regular.ttf"), 0)
        chars = "".join(sorted({char for line in lines for char in line["text"]}))
        glyphs = self.shape(chars, self.primary)
        self.rare = {char for char, gid in zip(chars, glyphs, strict=True) if gid == 0}
        if self.rare and not all(self.shape("".join(sorted(self.rare)), self.fallback)):
            raise ValueError("字幕字型缺字")

    @staticmethod
    def shape(chars, face):
        # One input line per character avoids shaping clusters or ligatures across checks.
        shaped = subprocess.check_output(["hb-shape", face[0], f"--face-index={face[1]}",
            "--output-format=json", "--no-glyph-names", "--text-file=-"],
            input="\n".join(chars) + "\n", text=True)
        return [int(all(g["g"] for g in json.loads(row))) for row in shaped.splitlines()]

    @lru_cache(maxsize=64)
    def font(self, rare, size):
        path, face = self.fallback if rare else self.primary
        return ImageFont.truetype(path, size, index=face)

    def make(self, line):
        def layout(size):
            tokens = [(c["text"], self.font(any(ch in self.rare for ch in c["text"]), size))
                      for c in line["karaoke"]]
            return tokens, sum(font.getlength(text) for text, font in tokens)
        size = 94
        tokens, width = layout(size)
        if width > SAFE_WIDTH:
            size = math.floor(size * SAFE_WIDTH / width)
            tokens, width = layout(size)
        start = (SIZE[0] - width) / 2
        sprite = Image.new("RGBA", (SIZE[0], CAPTION_HEIGHT * 2))
        draw = ImageDraw.Draw(sprite)
        edges = []
        for offset, color in [(0, "white"), (CAPTION_HEIGHT, READ_COLOR)]:
            x = start
            for text, font in tokens:
                draw.text((round(x), 991 - CAPTION_TOP + offset), text, font=font,
                          anchor="ls", fill=color, stroke_width=6, stroke_fill=OUTLINE)
                x += font.getlength(text)
                if not offset:
                    edges.append(round(x))
        edges[-1] = SIZE[0]
        line["edges"] = edges
        return sprite


def encoded(image, fmt, **options):
    buffer = io.BytesIO()
    image.save(buffer, format=fmt, **options)
    return buffer.getvalue()


def make_page(data, paths, *, scene_html='', scene_css='', scene_js=''):
    def safe_json(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", r"\u003c")
    parts = {
        "CSS": (SOURCE / "style.css").read_text(),
        "JS": (SOURCE / "practice.js").read_text(),
        "DATA": safe_json(data),
        "ASSETS": safe_json(paths),
        "SCENE_HTML": scene_html,
        "SCENE_CSS": scene_css,
        "SCENE_JS": scene_js,
    }
    return re.sub(r"<!-- (\w+) -->", lambda marker: parts[marker[1]], (SOURCE / "index.html").read_text())
