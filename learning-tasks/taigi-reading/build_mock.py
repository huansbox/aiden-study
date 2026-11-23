"""Build an offline reading practice page from the private school recording."""

import argparse
import base64
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess


class SceneTemplates(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids = set()

    def handle_starttag(self, tag, attrs) -> None:
        if tag == "template":
            scene_id = dict(attrs).get("id")
            if scene_id:
                if scene_id in self.ids:
                    raise ValueError(f"Duplicate scene template: {scene_id}.")
                self.ids.add(scene_id)


def paragraph_manifests(private_source: Path):
    yield 1, private_source / "segments.json"
    additional = {}
    for path in private_source.glob("paragraph-*.json"):
        match = re.fullmatch(r"paragraph-([1-9][0-9]*)\.json", path.name)
        if match:
            number = int(match[1])
            if number < 2:
                raise ValueError("Use segments.json for the first paragraph.")
            additional[number] = path
    for expected, number in enumerate(sorted(additional), start=2):
        if number != expected:
            raise ValueError(f"Missing paragraph-{expected}.json before paragraph-{number}.json.")
        yield number, additional[number]


def paragraph_title(number: int) -> str:
    chinese_digits = "一二三四五六七八九十"
    ordinal = chinese_digits[number - 1] if 1 <= number <= len(chinese_digits) else str(number)
    return f"第{ordinal}段"


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
            "start": segment["start"],
            "end": segment["end"],
            **({"karaoke": segment["karaoke"]} if "karaoke" in segment else {}),
            "audio": school_clip(recording, segment["start"], segment["end"]),
        }
        for segment in segments
    ]
    start, end = segments[0]["start"], segments[-1]["end"]
    whole_audio = school_clip(recording, start, end)
    return {"title": title, "lines": lines, "wholeAudio": whole_audio, "start": start, "end": end}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    arguments = parser.parse_args()
    private_source = arguments.private_root / "source"
    repo_source = Path(__file__).resolve().parent / "source"
    recording = private_source / "01_阮小妹.mp3"

    paragraphs = []
    template = (repo_source / "mock.html").read_text(encoding="utf-8")
    scene_fragments = [
        (repo_source / name).read_text(encoding="utf-8")
        for name in ("scenes.html", "sentence-props.html")
    ]
    all_templates = SceneTemplates()
    for fragment in scene_fragments:
        all_templates.feed(fragment)
    for number, manifest in paragraph_manifests(private_source):
        paragraph = build_paragraph(recording, manifest, paragraph_title(number))
        if paragraphs and paragraph["start"] < paragraphs[-1]["end"]:
            raise ValueError(f"Paragraph {number} overlaps the previous paragraph.")
        if number > 1:
            fragment = (repo_source / f"paragraph-{number}-scenes.html").read_text(encoding="utf-8")
            section_templates = SceneTemplates()
            section_templates.feed(fragment)
            for line in paragraph["lines"]:
                if line["visual"] not in section_templates.ids:
                    raise ValueError(f"{manifest.name} has an excerpt without a matching scene: {line['visual']!r}.")
            all_templates.feed(fragment)
            scene_fragments.append(fragment)
        paragraphs.append(paragraph)

    data = json.dumps(paragraphs, ensure_ascii=False)
    page = template.replace("<!-- SCENES -->", "\n".join(scene_fragments))
    page = page.replace("<!-- DATA -->", data.replace("<", "\\u003c"))
    output = arguments.private_root / "mock" / "index.html"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
