"""Build an offline reading practice page from the private school recording."""

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


def build_paragraph(recording: Path, manifest: Path, title: str) -> dict:
    segments = json.loads(manifest.read_text(encoding="utf-8"))
    if not segments:
        raise ValueError(f"No school-audio excerpts listed in {manifest.name}.")
    for previous, current in zip(segments, segments[1:]):
        if previous["end"] > current["start"]:
            raise ValueError("School-audio excerpts must be ordered and non-overlapping.")

    lines = [
        {
            "text": segment["text"],
            "hint": segment.get("hint"),
            "visual": segment.get("visual"),
            "audio": school_clip(recording, segment["start"], segment["end"]),
        }
        for segment in segments
    ]
    whole_audio = school_clip(recording, segments[0]["start"], segments[-1]["end"])
    return {"title": title, "lines": lines, "wholeAudio": whole_audio}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    arguments = parser.parse_args()
    private_source = arguments.private_root / "source"
    repo_source = Path(__file__).resolve().parent / "source"
    recording = private_source / "01_阮小妹.mp3"

    paragraphs = [build_paragraph(recording, private_source / "segments.json", "第一段")]
    template = (repo_source / "mock.html").read_text(encoding="utf-8")
    scenes = (repo_source / "scenes.html").read_text(encoding="utf-8")
    scenes += (repo_source / "sentence-props.html").read_text(encoding="utf-8")
    second_manifest = private_source / "paragraph-2.json"
    if second_manifest.is_file():
        second = build_paragraph(recording, second_manifest, "第二段")
        second_scenes = (repo_source / "paragraph-2-scenes.html").read_text(encoding="utf-8")
        for line in second["lines"]:
            if not line["visual"] or f'id="{line["visual"]}"' not in second_scenes:
                raise ValueError("Every second-paragraph excerpt must have a matching scene.")
        paragraphs.append(second)
        scenes += second_scenes

    data = json.dumps(paragraphs, ensure_ascii=False)
    page = template.replace("<!-- SCENES -->", scenes).replace("<!-- DATA -->", data.replace("<", "\\u003c"))
    output = arguments.private_root / "mock" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
