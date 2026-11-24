# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=11,<13"]
# ///
"""重建 01 漫畫試片：uv run render_comic_trial.py <私用資料夾>"""

import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont, ImageOps


SIZE = (1920, 1080)
FPS = 24
TIMESCALE = 24000
READ_COLOR = "#68B8EF"
OUTLINE = "#1B2B39"


def subtitle_font():
    # 同一 TTC 包含多個地區字形及字重，必須取出相符的 face index。
    match = subprocess.check_output(
        ["fc-match", "-f", "%{file}\n%{index}", "PingFang TC,Noto Sans CJK TC:style=Semibold,Bold"],
        text=True,
    )
    path, index = match.splitlines()
    return ImageFont.truetype(path, 94, index=int(index))


def subtitle_frame(art, font, line, read_count):
    frame = art.copy()
    draw = ImageDraw.Draw(frame)
    x = (SIZE[0] - font.getlength(line["text"])) / 2
    for i, cue in enumerate(line["karaoke"]):
        text = cue["text"]
        draw.text(
            (round(x), 991), text, font=font, anchor="ls",
            fill=READ_COLOR if i < read_count else "white",
            stroke_width=6, stroke_fill=OUTLINE,
        )
        x += font.getlength(text)
    return frame.tobytes()


def render(root):
    data = json.loads((root / "source/trial.json").read_text())
    destination = root / "trial/01-ktv"
    recording = root / "source" / data["recording"]
    duration = round(data["end"] - data["start"], 6)
    lines = [line for p in data["paragraphs"] for line in p["lines"]]
    for line in lines:
        if "".join(c["text"] for c in line["karaoke"]) != line["text"]:
            raise ValueError(f"字幕與逐字時標不一致：{line['id']}")

    # 句間有停頓，預留看完整句子的時間，已讀字幕至少保留到句末。
    caption_starts = [data["start"]] + [
        max(previous["end"], current["karaoke"][0]["start"] - 0.4)
        for previous, current in zip(lines, lines[1:])
    ]
    art = {}
    for name in ("taste", "swallow", "sweet"):
        with Image.open(destination / "art" / f"{name}.png") as image:
            art[name] = ImageOps.fit(image.convert("RGB"), SIZE, method=Image.Resampling.LANCZOS)
    scene_starts = [data["start"], data["trialBeat"]["swallow"], data["trialBeat"]["sweet"]]
    shots = [art["taste"], art["swallow"], art["sweet"]]
    font = subtitle_font()
    frames = math.ceil(duration * FPS - 1e-8)
    # 最末幀只佔剩餘的幾毫秒，讓影像與聲音都收在原音試片的終點。
    last_ticks = round(duration * TIMESCALE) - (frames - 1) * (TIMESCALE // FPS)
    output = destination / f"{data['title']}-01-漫畫試片.mp4"
    with tempfile.NamedTemporaryFile(suffix=".mp4", dir=destination, delete=False) as tmp:
        temp_path = Path(tmp.name)
    try:
        command = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", str(FPS), "-i", "pipe:0",
            "-ss", str(data["start"]), "-t", str(duration), "-i", str(recording),
            "-map", "0:v", "-map", "1:a",
            "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-bf", "0",
            "-fps_mode", "passthrough", "-enc_time_base:v", f"1:{TIMESCALE}",
            "-video_track_timescale", str(TIMESCALE),
            "-bsf:v", f"setts=duration='if(eq(N,{frames-1}),{last_ticks},DURATION)'",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(temp_path),
        ]
        with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
            previous_state = None
            for frame_index in range(frames):
                time = data["start"] + frame_index / FPS + 1e-9
                shot = sum(start <= time for start in scene_starts) - 1
                line_index = sum(start <= time for start in caption_starts) - 1
                line = lines[line_index]
                read_count = sum(cue["start"] <= time for cue in line["karaoke"])
                state = (shot, line_index, read_count)
                if state != previous_state:
                    pixels = subtitle_frame(shots[shot], font, line, read_count)
                    previous_state = state
                encoder.stdin.write(pixels)
            encoder.stdin.close()
            if encoder.wait() != 0:
                raise RuntimeError("FFmpeg 未完成影片編碼")
        os.replace(temp_path, output)
    finally:
        temp_path.unlink(missing_ok=True)
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    render(parser.parse_args().private_root)
