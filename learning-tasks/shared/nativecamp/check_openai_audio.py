# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1"]
# ///
"""Transcribe bounded samples of generated speech locally; never upload audio."""

import argparse
import hashlib
import json
from pathlib import Path

from faster_whisper import WhisperModel

from build_openai_audio import REPO, write_json


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--audio-dir", type=Path, default=REPO / "docs/nativecamp/audio")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("status") != "complete" or manifest.get("voice", {}).get("engine") != "OpenAI Speech API":
        parser.error("A complete OpenAI speech manifest is required.")
    if args.threads < 1:
        parser.error("--threads must be positive")
    rows = manifest["tts"]
    indices = sorted({index for start in range(0, len(rows), 12)
                      for index in (start, min(start + 11, len(rows) - 1))})
    samples = []
    for index in indices:
        row = rows[index]
        if not row["file"].startswith("audio/") or Path(row["file"]).name != row["file"][6:]:
            parser.error("Manifest contains a non-local speech file.")
        path = args.audio_dir / row["file"][6:]
        sha256 = hashlib.sha256(path.read_bytes()).hexdigest()
        if sha256 != row["sha256"]:
            parser.error("Sample hash does not match its manifest; regenerate or validate first.")
        samples.append((row, path))
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=args.threads,
                         local_files_only=True)
    result = {"lessonId": manifest["lessonId"], "engine": "faster-whisper 1.2.1", "model": "small.en",
              "audioUploaded": False, "initialPrompt": None, "humanListening": False,
              "pronunciationAssessment": False, "samples": []}
    output = args.output or args.manifest.with_name("nativecamp-tts-asr.json")
    for row, path in samples:
        segments, _ = model.transcribe(str(path), language="en", beam_size=5,
                                       vad_filter=False, condition_on_previous_text=False)
        result["samples"].append({"file": row["file"], "sha256": row["sha256"],
            "expectedText": row["text"], "recognizedText": " ".join(part.text.strip() for part in segments)})
        write_json(output, result)
        print(json.dumps(result["samples"][-1], ensure_ascii=False), flush=True)
    print(json.dumps({"lessonId": manifest["lessonId"], "samples": len(samples), "audioUploaded": False}), flush=True)


if __name__ == "__main__":
    main()
