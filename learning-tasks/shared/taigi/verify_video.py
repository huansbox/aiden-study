# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow>=11,<13"]
# ///
"""完整解碼成片，比對原音與每個音節在換色前後的實際像素。"""

import argparse
from collections import defaultdict
import json
import math
from pathlib import Path
import re
import subprocess


def pcm(path):
    import numpy as np

    audio = subprocess.check_output(["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", path,
                                    "-vn", "-ar", "16000", "-ac", "1", "-f", "f32le", "-"])
    return np.frombuffer(audio, "<f4")


def resolve_video_path(root, title, video=None):
    if video is not None:
        path = Path(video)
        if not path.is_file():
            raise FileNotFoundError(path)
        return path
    candidates = [
        root / "final" / f"{title}-全篇逐字字幕.mp4",
        root / "final" / f"{title}-全篇.mp4",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"找不到成片影片：{', '.join(str(p) for p in candidates)}")


def verify(root, video=None):
    import numpy as np
    from PIL import Image

    root = Path(root)
    site = root / "final/site"
    page = (site / "index.html").read_text()
    data = json.loads(re.search(r'<script id="reading" type="application/json">(.*?)</script>', page)[1])
    lines = data["intro"] + [line for group in data["paragraphs"] for line in group["lines"]]
    video_path = resolve_video_path(root, data["title"], video)
    meta = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                                               "-of", "json", video_path]))
    visual = next(s for s in meta["streams"] if s["codec_type"] == "video")
    expected_duration = data["end"] - data["start"]
    nb_frames = int(visual["nb_frames"])
    min_frames = math.floor(expected_duration * 24)
    max_frames = math.ceil(expected_duration * 24) + 1
    if ((visual["width"], visual["height"]) != (1920, 1080) or
            visual.get("r_frame_rate") != "24/1" or
            not (min_frames <= nb_frames <= max_frames)):
        raise ValueError("影片尺寸或影格率錯誤")
    if abs(float(meta["format"]["duration"]) - expected_duration) >= 1/24:
        raise ValueError("成片與原音區間長度不同")

    original = pcm(root / "source" / data["recording"])
    movie = pcm(video_path)
    offset = round(data["start"] * 16000)
    checks = defaultdict(list)
    scores = []

    def frame_at(time):
        return math.ceil((time - data["start"]) * 24 - 1e-7)

    for number, line in enumerate(lines, 1):
        lo, hi = (round(line[key] * 16000) for key in ("start", "end"))
        score = np.corrcoef(original[lo:hi], movie[lo-offset:hi-offset])[0, 1]
        if not score > .98:
            raise ValueError(f"{line['id']} 的成片音訊與原音不同步：{score}")
        scores.append(score)

        # Sample the opaque white interior of each glyph, excluding antialiasing and its outline.
        with Image.open(site / "assets" / f"caption-{number:02}.webp") as image:
            sprite = np.asarray(image.convert("RGBA").resize((960, 180), Image.Resampling.BOX))[:90]
        ink = (sprite[:, :, :3].min(axis=2) > 235) & (sprite[:, :, 3] > 248)
        left = 0
        for cue, edge in zip(line["karaoke"], line["edges"], strict=True):
            right = round(edge / 2)
            y, x = np.nonzero(ink[:, left + 1:right - 1])
            if not len(x):
                raise ValueError(f"{line['id']} 找不到字幕字形：{cue['text']}")
            x += left + 1
            frame = frame_at(cue["start"])
            if frame >= nb_frames:
                raise ValueError(f"{line['id']} 的「{cue['text']}」換色影格 {frame} 超出成片總影格數 {nb_frames}")
            checks[frame].append((line["id"], cue["text"], True, y, x))
            if frame > frame_at(line["captionAt"]):
                checks[frame - 1].append((line["id"], cue["text"], False, y, x))
            left = right

    total_checks = sum(map(len, checks.values()))
    checked_count = 0
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", video_path, "-an",
           "-vf", "crop=1920:180:0:858,scale=960:90", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    with subprocess.Popen(cmd, stdout=subprocess.PIPE) as decoder:
        try:
            for i in range(nb_frames):
                raw = decoder.stdout.read(960 * 90 * 3)
                if len(raw) != 960 * 90 * 3:
                    raise ValueError(f"影格 {i} 解碼不完整")
                if i not in checks:
                    continue
                image = np.frombuffer(raw, np.uint8).reshape(90, 960, 3)
                for line_id, token, blue, y, x in checks[i]:
                    ink_color = image[y, x].astype(np.int16)
                    difference = np.median(ink_color[:, 2] - ink_color[:, 0])
                    brightness = np.median(ink_color.mean(axis=1))
                    correct = difference >= 73 if blue else abs(difference) <= 38 and brightness >= 180
                    if not correct:
                        raise ValueError(f"{line_id} 的「{token}」在影格 {i} 的顏色錯誤")
                    checked_count += 1
            if decoder.stdout.read(1) or decoder.wait():
                raise ValueError("成片影格總數或解碼結果異常")
            if checked_count != total_checks:
                raise ValueError(f"僅完成 {checked_count}/{total_checks} 次字幕換色檢查")
        finally:
            decoder.stdout.close()
    print(f"{len(lines)} 行，原音最低相關係數 {min(scores):.6f}，"
          f"{checked_count} 次字幕換色前後影格檢查通過。")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    parser.add_argument("--video", type=Path, help="成片 MP4 路徑；省略時自動尋找 final/ 下的預設成片")
    args = parser.parse_args(argv)
    verify(args.private_root, args.video)


if __name__ == "__main__":
    main()
