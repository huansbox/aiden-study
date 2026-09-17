# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1"]
# ///
"""Check one bounded teacher clip locally; raw recognition stays ignored."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from faster_whisper import WhisperModel

TASK = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", type=float, default=1298.8)
    parser.add_argument("--end", type=float, default=1305.0)
    parser.add_argument("--label", default="teacher-hats-boundary")
    args = parser.parse_args()
    if not 0 <= args.start < args.end <= 1504.625 or args.end - args.start > 15:
        parser.error("Choose a bounded clip of at most 15 seconds")
    if not args.label.replace("-", "").isalnum():
        parser.error("Label must contain only letters, numbers, and hyphens")
    verified = json.loads((TASK / "source/download-verification.json").read_text("utf-8"))
    original = TASK / "assets/audio/2026-09-15-1930-lesson.webm"
    digest = hashlib.sha256(original.read_bytes()).hexdigest()
    if digest != verified["sha256"]:
        parser.error("Original recording SHA256 does not match")
    private = TASK / "source/private"
    private.mkdir(exist_ok=True)
    clip = private / f"{args.label}.wav"
    subprocess.run([
        "ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y",
        "-ss", str(args.start), "-i", str(original), "-t", str(args.end - args.start),
        "-af", "pan=mono|c0=c0", "-ar", "16000", "-c:a", "pcm_s16le", str(clip),
    ], check=True)
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=6,
                         local_files_only=True)
    segments, _ = model.transcribe(str(clip), language="en", beam_size=5,
                                   word_timestamps=True, vad_filter=False,
                                   condition_on_previous_text=False)
    rows = []
    for segment in segments:
        rows.append({"start": args.start + segment.start, "end": args.start + segment.end,
                     "text": segment.text, "words": [
                         {"start": args.start + word.start, "end": args.start + word.end,
                          "word": word.word, "probability": word.probability}
                         for word in (segment.words or [])]})
    result = {"source_sha256": digest, "source_start": args.start, "source_end": args.end,
              "channel": 0, "model": "small.en", "engine": "faster-whisper 1.2.1",
              "initial_prompt": None, "audio_uploaded": False, "human_listened": False,
              "segments": rows}
    output = private / f"{args.label}.json"
    output.write_text(json.dumps(result, indent=2), "utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
