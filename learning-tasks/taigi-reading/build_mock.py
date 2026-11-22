"""Build an offline parent preview from private school-audio excerpts."""

import argparse
import base64
import json
from pathlib import Path
import subprocess


def audio_url(content: bytes, media_type: str) -> str:
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{media_type};base64,{encoded}"


def school_clip(recording: Path, start: float, end: float) -> str:
    if not 0 <= start < end:
        raise ValueError(f"Invalid school-audio range: {start}–{end}")
    audio = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-ss", str(start), "-i", str(recording),
            "-t", str(end - start), "-ac", "1", "-b:a", "96k", "-f", "mp3", "pipe:1",
        ],
        check=True,
        capture_output=True,
    ).stdout
    if not audio:
        raise ValueError(f"No school audio at {start}–{end}")
    return audio_url(audio, "audio/mpeg")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    arguments = parser.parse_args()
    private_source = arguments.private_root / "source"
    repo_source = Path(__file__).resolve().parent / "source"
    segments = json.loads((private_source / "segments.json").read_text(encoding="utf-8"))
    if len(segments) != 2:
        raise ValueError("The parent preview requires exactly two excerpts.")

    recording = private_source / "01_阮小妹.mp3"
    lines = [
        {
            "text": segment["text"],
            "hint": segment.get("hint"),
            "audio": school_clip(recording, segment["start"], segment["end"]),
        }
        for segment in segments
    ]
    comparisons = [{"label": "學校原音", "audio": lines[1]["audio"]}]
    for label, filename in ((" Gemini 台文版", "gemini-han.wav"), (" Gemini 台羅版", "gemini-tailo.wav")):
        path = private_source / filename
        comparisons.append({
            "label": label,
            "audio": audio_url(path.read_bytes(), "audio/wav") if path.is_file() else None,
        })

    data = json.dumps({"lines": lines, "comparisons": comparisons}, ensure_ascii=False)
    template = (repo_source / "mock.html").read_text(encoding="utf-8")
    scenes = (repo_source / "scenes.html").read_text(encoding="utf-8")
    page = template.replace("<!-- SCENES -->", scenes).replace("<!-- DATA -->", data.replace("<", "\\u003c"))
    output = arguments.private_root / "mock" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
