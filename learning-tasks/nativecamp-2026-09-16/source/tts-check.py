# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1"]
# ///
"""Local ASR for the bounded TTS comparison, without an expected-text prompt."""

import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel

SOURCE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--engine", choices=("windows", "mac", "openai"))
    target.add_argument("--lesson", choices=("2026-09-14", "2026-09-16"))
    args = parser.parse_args()
    if args.lesson:
        repo = SOURCE.parents[2]
        task_source = repo / "learning-tasks" / f"nativecamp-{args.lesson}" / "source"
        manifest = json.loads((task_source / "nativecamp-audio-manifest.json").read_text(encoding="utf-8"))
        samples = [sample for index, sample in enumerate(manifest["tts"]) if index % 12 in (0, 11)]
        audio_root = repo / "docs/nativecamp"
        result_path = task_source / "nativecamp-tts-asr.json"
    else:
        manifest = json.loads((SOURCE / f"tts-{args.engine}-manifest.json").read_text(encoding="utf-8"))
        samples = manifest["samples"]
        audio_root = SOURCE.parent
        result_path = SOURCE / f"tts-{args.engine}-asr.json"
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=6,
                         local_files_only=True)
    records = []
    for sample in samples:
        segments, _ = model.transcribe(str(audio_root / sample["file"]), language="en", beam_size=5,
                                       vad_filter=False, condition_on_previous_text=False)
        records.append({"file": sample["file"], "expectedText": sample["text"],
                        "recognizedText": " ".join(segment.text.strip() for segment in segments)})
    result = {"engine": "faster-whisper 1.2.1", "model": "small.en", "audioUploaded": False,
              "initialPrompt": None, "humanListening": False, "samples": records}
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
