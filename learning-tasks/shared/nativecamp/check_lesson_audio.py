# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1", "numpy>=2,<3"]
# ///
"""Verify a local lesson recording and transcribe bounded, separate-channel samples."""

import argparse
import hashlib
import json
import shutil
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task", choices=["2026-09-14", "2026-09-16"], required=True)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()
    task = ROOT / f"nativecamp-{args.task}"
    original = task / f"assets/audio/{args.task}-1930-lesson.webm"
    config = json.loads((task / "source/audio-samples.json").read_text(encoding="utf-8"))
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe or not original.is_file():
        parser.error("ffmpeg, ffprobe, and the local recording are required")
    if args.threads < 1:
        parser.error("threads must be positive")
    digest = hashlib.sha256(original.read_bytes()).hexdigest()
    probe = json.loads(subprocess.check_output([
        ffprobe, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(original)
    ], text=True))
    stream = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    # Native Camp recordings can contain overlapping packet timestamps. Decode all
    # samples with monotonic output timestamps; leave the original bytes untouched.
    subprocess.run([ffmpeg, "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-i",
                    str(original), "-map", "0:a:0", "-af", "asetpts=N/SR/TB", "-f", "null", "-"], check=True)
    verification = {
        "lessonDate": args.task, "relative_file": f"../assets/audio/{original.name}",
        "bytes": original.stat().st_size, "sha256": digest,
        "durationSeconds": float(probe["format"]["duration"]), "codec": stream["codec_name"],
        "sampleRate": int(stream["sample_rate"]), "channels": stream["channels"],
        "fullDecode": "passed", "decodeTimestampFilter": "asetpts=N/SR/TB", "audioUploaded": False,
    }
    (task / "source/download-verification.json").write_text(
        json.dumps(verification, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(verification), flush=True)
    private = task / "source/private"
    clips = task / "assets/audio/samples"
    private.mkdir(exist_ok=True)
    clips.mkdir(exist_ok=True)
    result = {"status": "running", "sourceSha256": digest, "engine": "faster-whisper 1.2.1",
              "model": "small.en", "computeType": "int8", "initialPrompt": None,
              "audioUploaded": False, "pronunciationScoring": False, "humanListening": False,
              "speakerDiarization": False, "samples": []}
    output = private / "local-channel-check.json"
    model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=args.threads,
                         local_files_only=True)
    for sample in config:
        started = time.monotonic()
        clip = clips / f"{sample['name']}.wav"
        subprocess.run([ffmpeg, "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y",
                        "-ss", str(sample["start"]), "-i", str(original), "-t", str(sample["duration"]),
                        "-map", "0:a:0", "-af", "asetpts=N/SR/TB", "-ar", "16000", "-ac", "2", "-c:a", "pcm_s16le",
                        str(clip)], check=True)
        with wave.open(str(clip), "rb") as wav:
            data = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").reshape(-1, 2)
        rms = np.sqrt(np.mean(data.astype(float) ** 2, axis=0))
        rows = []
        for channel in range(2):
            segments, _ = model.transcribe(np.asarray(data[:, channel] / 32768, dtype=np.float32),
                                          language="en", beam_size=5, vad_filter=True,
                                          word_timestamps=False, condition_on_previous_text=False)
            for segment in segments:
                rows.append({"channel": channel, "start": round(sample["start"] + segment.start, 3),
                             "end": round(sample["start"] + segment.end, 3), "text": segment.text.strip()})
        rows.sort(key=lambda s: (s["start"], s["channel"]))
        result["samples"].append({**sample, "decodedDuration": len(data) / 16000,
                                  "rmsPerChannel": rms.tolist(),
                                  "channelsIdentical": bool(np.array_equal(data[:, 0], data[:, 1])),
                                  "segments": rows, "seconds": round(time.monotonic() - started, 1)})
        output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"Checked {sample['name']}: {len(rows)} segments", flush=True)
    result["status"] = "complete"
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
