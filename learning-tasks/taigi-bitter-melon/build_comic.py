# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=11,<13"]
# ///
"""重建全篇靜格漫畫。用法見 README。"""

import argparse
import base64
import bisect
import io
import json
import math
import mimetypes
import os
import subprocess
import tempfile
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from render_comic_trial import FPS, OUTLINE, READ_COLOR, SIZE, TIMESCALE

SOURCE = Path(__file__).parent / "source/comic"
CAPTION_TOP = 858
CAPTION_HEIGHT = 180
SAFE_WIDTH = 1810


def local_file(directory, name):
    if not isinstance(name, str) or Path(name).name != name:
        raise ValueError(f"素材檔名不合法：{name!r}")
    file = directory / name
    if not file.is_file():
        raise FileNotFoundError(file)
    return file


def read_timeline(root):
    def load(name):
        return json.loads((root / "source" / name).read_text())
    data, trial, scenes = [load(name) for name in ("reading.json", "trial.json", "scenes.json")]
    recording = local_file(root / "source", data["recording"])
    duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
                     "format=duration", "-of", "default=nw=1:nk=1", recording]))
    assert 0 <= data["start"] < data["end"] <= duration
    intro = data["intro"]
    assert [line["text"] for line in intro] == [data["title"], data["author"]]
    for i, line in enumerate(intro):
        line["id"] = f"intro-{i + 1}"
    body = [line for p in data["paragraphs"] for line in p["lines"]]
    assert all(p["lines"] for p in data["paragraphs"]) and body
    assert all(line.get("meaning") for line in body), "每句都需要孩子看得懂的意思"
    lines = intro + body
    assert len({line["id"] for line in lines}) == len(lines)
    assert set(scenes["lines"]) == {line["id"] for line in body}
    last = data["start"]
    for i, line in enumerate(lines):
        cues = line["karaoke"]
        assert last <= line["start"] < line["end"] <= data["end"], line["id"]
        assert cues and "".join(c["text"] for c in cues) == line["text"], line["id"]
        starts = [c["start"] for c in cues]
        assert starts == sorted(set(starts)) and line["start"] <= starts[0] <= starts[-1] < line["end"], line["id"]
        line["captionAt"] = max(last, round(starts[0] - 0.4, 6)) if i else data["start"]
        last = line["end"]
    trial_lines = trial["paragraphs"][0]["lines"]
    assert len({scenes["lines"][line["id"]] for line in trial_lines}) == 3, "試片三格須使用三張獨立的圖"
    shots = []
    trial_changes = {line["id"]: start for line, start in zip(trial_lines, [
        trial["start"], trial["trialBeat"]["swallow"], trial["trialBeat"]["sweet"]], strict=True)}
    for line in lines:
        key = scenes["lines"].get(line["id"], scenes["intro"])
        if line["id"] in trial_changes:
            original = next(t for t in trial_lines if t["id"] == line["id"])
            assert all(line[k] == original[k] for k in ("text", "start", "end", "karaoke"))
            if line["id"] == trial_lines[0]["id"]:
                line["captionAt"] = trial["start"]
        at = trial_changes.get(line["id"], line["captionAt"])
        if not shots or key != shots[-1]["key"]:
            shots.append(dict(at=at, key=key))
    assert [s["at"] for s in shots] == sorted(set(s["at"] for s in shots))
    data["shots"] = shots
    return data, lines, recording, {s["key"]: local_file(root / "art", scenes["files"][s["key"]]) for s in shots}


class Lettering:
    def __init__(self, lines, root):
        match = subprocess.check_output(["fc-match", "-f", "%{file}\n%{index}",
            "PingFang TC,Noto Sans CJK TC:style=Semibold,Bold"], text=True)
        path, face = match.splitlines()
        self.primary = (path, int(face))
        self.fallback = (str(local_file(root / "fonts", "Iansui-Regular.ttf")), 0)
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


def make_page(data, paths):
    def safe_json(value):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", r"\u003c")
    html = (SOURCE / "index.html").read_text()
    for marker, value in {"CSS": (SOURCE / "style.css").read_text(), "JS": (SOURCE / "practice.js").read_text(),
                          "DATA": safe_json(data), "ASSETS": safe_json(paths)}.items():
        html = html.replace(f"<!-- {marker} -->", value)
    return html


def atomic_write(path, content):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as dest:
        tmp = Path(dest.name)
        try:
            dest.write(content)
            dest.flush()
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)


def build(root, output, video):
    data, lines, recording, art = read_timeline(root)
    lettering = Lettering(lines, root)
    output.mkdir(exist_ok=True, parents=True)
    assets = output / "site/assets"
    assets.mkdir(exist_ok=True, parents=True)
    online, offline = {}, {}
    def add(key, file, content):
        atomic_write(assets / file, content)
        online[key] = "assets/" + file
        mime = mimetypes.guess_type(file)[0]
        offline[key] = f"data:{mime};base64," + base64.b64encode(content).decode("ascii")
    add("audio", "reading.mp3", recording.read_bytes())
    sprites = {}
    for i, line in enumerate(lines):
        sprite = lettering.make(line)
        file = f"caption-{i + 1:02}.webp"
        key = "caption/" + line["id"]
        add(key, file, encoded(sprite, "WEBP", lossless=True, method=2))
        sprites[line["id"]] = assets / file
    scenes = {}
    for i, (key, source) in enumerate(art.items()):
        with Image.open(source) as img:
            if img.size[0] < 640:
                raise ValueError(f"畫面解析度不足：{source}")
            file = f"scene-{i + 1:02}.webp"
            if source.suffix.lower() == ".webp" and img.width * SIZE[1] == img.height * SIZE[0]:
                payload = source.read_bytes()
            else:
                scene = ImageOps.fit(img.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS)
                payload = encoded(scene, "WEBP", quality=94, method=4)
            add("art/" + key, file, payload)
            scenes[key] = assets / file
    atomic_write(output / "site/index.html", make_page(data, online).encode())
    atomic_write(output / "index.html", make_page(data, offline).encode())
    print(f"已製作 {len(data['paragraphs'])} 段、{len(lines) - len(data['intro'])} 句：{output}", flush=True)
    if video:
        render(data, lines, recording, scenes, sprites, output / f"{data['title']}-全篇.mp4")


def render(data, lines, recording, scenes, sprites, output):
    duration = round(data["end"] - data["start"], 6)
    frames = math.ceil(duration * FPS - 1e-8)
    ticks = round(duration * TIMESCALE) - (frames - 1) * (TIMESCALE // FPS)
    at = [line["captionAt"] for line in lines]
    shot_at = [s["at"] for s in data["shots"]]
    cue_at = [[cue["start"] for cue in line["karaoke"]] for line in lines]
    @lru_cache(maxsize=2)
    def art(i):
        with Image.open(scenes[data["shots"][i]["key"]]) as img:
            return ImageOps.fit(img.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS)
    @lru_cache(maxsize=2)
    def caption(i):
        with Image.open(sprites[lines[i]["id"]]) as img:
            return img.convert("RGBA")
    # The image and audio have the same origin in the school recording.
    with tempfile.NamedTemporaryFile(dir=output.parent, suffix=".mp4", delete=False) as tmp:
        temp_path = Path(tmp.name)
    try:
        args = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
            "-s", "1920x1080", "-r", str(FPS), "-i", "pipe:0", "-ss", str(data["start"]),
            "-t", str(duration), "-i", recording, "-map", "0:v", "-map", "1:a",
            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-bf", "0",
            "-fps_mode", "passthrough", "-enc_time_base:v", f"1:{TIMESCALE}", "-video_track_timescale",
            str(TIMESCALE), "-bsf:v", f"setts=duration='if(eq(N,{frames-1}),{ticks},DURATION)'",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", temp_path]
        with subprocess.Popen(args, stdin=subprocess.PIPE) as encoder:
            previous = None
            for n in range(frames):
                t = data["start"] + n / FPS + 1e-9
                i, j = bisect.bisect_right(at, t) - 1, bisect.bisect_right(shot_at, t) - 1
                count = bisect.bisect_right(cue_at[i], t)
                state = (i, j, count)
                if previous != state:
                    frame = art(j).copy()
                    sprite = caption(i)
                    white = sprite.crop((0, 0, SIZE[0], CAPTION_HEIGHT))
                    if count:
                        edge = lines[i]["edges"][count - 1]
                        blue = sprite.crop((0, CAPTION_HEIGHT, edge, CAPTION_HEIGHT * 2))
                        white.paste(blue, (0, 0))
                    frame.paste(white, (0, CAPTION_TOP), white.getchannel("A"))
                    pixels = frame.tobytes()
                    previous = state
                encoder.stdin.write(pixels)
            encoder.stdin.close()
            if encoder.wait():
                raise RuntimeError("影片編碼失敗")
        os.replace(temp_path, output)
        print(output, flush=True)
    finally:
        temp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--video", action="store_true")
    args = parser.parse_args()
    build(args.private_root, args.output or args.private_root / "final", args.video)
