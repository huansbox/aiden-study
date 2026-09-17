# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1"]
# ///
"""ASR spot-check generated speech locally; this is not human listening QA."""

import json
from pathlib import Path

from faster_whisper import WhisperModel

SOURCE = Path(__file__).resolve().parent
REPO = SOURCE.parents[2]
SAMPLES = ["is-are-try-1-q.mp3", "is-are-try-3-q.mp3", "odd-even-say-2-a.mp3",
           "too-many-say-1-q.mp3", "too-many-try-3-q.mp3", "too-many-say-3-a.mp3"]


def main():
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=6,
                         local_files_only=True)
    rows = []
    for name in SAMPLES:
        segments, _ = model.transcribe(str(REPO / "docs/nativecamp/audio" / name), language="en",
                                       beam_size=5, vad_filter=False, condition_on_previous_text=False)
        rows.append({"file": name, "text": " ".join(segment.text.strip() for segment in segments)})
    result = {"engine": "faster-whisper 1.2.1", "model": "small.en", "audio_uploaded": False,
              "human_listening": False, "initial_prompt": None, "samples": rows}
    output = SOURCE / "private/nativecamp-tts-asr.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, indent=2), "utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
