# /// script
# requires-python = ">=3.13"
# dependencies = ["faster-whisper==1.2.1", "numpy>=2,<3"]
# ///
"""Extract and locally transcribe bounded samples; private results stay ignored."""

import argparse
import hashlib
import importlib.metadata
import json
import shutil
import subprocess
import time
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

TASK = Path(__file__).resolve().parents[1]
SAMPLES = [
    ("opening", 0, 90),
    ("topic", 950, 65),
    ("class_size", 1045, 85),
    ("transfer", 1195, 30),
    ("hats_and_toys", 1265, 115),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="small.en")
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--offline", action="store_true", help="Use cached model only")
    parser.add_argument("--separate-channels", action="store_true")
    args = parser.parse_args()
    if args.threads < 1:
        parser.error("--threads must be positive")
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        parser.error("ffmpeg is required on PATH")
    manifest_path = TASK / "source/download-verification.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    original = (manifest_path.parent / manifest["relative_file"]).resolve()
    if not original.is_file():
        parser.error("The original local recording is missing")
    with original.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != manifest["sha256"]:
        parser.error("Recording SHA256 does not match the verified sample")

    clip_dir = TASK / "assets/audio/samples"
    private_dir = TASK / "source/private"
    clip_dir.mkdir(parents=True, exist_ok=True)
    private_dir.mkdir(parents=True, exist_ok=True)
    result_path = private_dir / ("local-channel-check.json" if args.separate_channels else "local-audio-check.json")
    result = {
        "status": "running",
        "source_sha256": digest,
        "engine": "faster-whisper",
        "engine_version": importlib.metadata.version("faster-whisper"),
        "model": args.model,
        "device": "cpu",
        "compute_type": "int8",
        "language": "en",
        "beam_size": 5,
        "vad_filter": True,
        "condition_on_previous_text": False,
        "initial_prompt": None,
        "speaker_diarization": False,
        "pronunciation_scoring": False,
        "audio_uploaded": False,
        "channel_mode": "separate" if args.separate_channels else "mixed",
        "samples": [],
    }
    print(f"Loading {args.model} on CPU; recordings stay local.", flush=True)
    model = WhisperModel(
        args.model, device="cpu", compute_type="int8", cpu_threads=args.threads,
        local_files_only=args.offline,
    )
    for label, start, duration in SAMPLES:
        clip = clip_dir / f"{label}.wav"
        subprocess.run([
            ffmpeg, "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y",
            "-ss", str(start), "-i", str(original), "-t", str(duration),
            "-map", "0:a:0", "-ar", "16000", "-ac", "2", "-c:a", "pcm_s16le",
            str(clip),
        ], check=True)
        with wave.open(str(clip), "rb") as wav:
            sample_rate = wav.getframerate()
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2")
            samples = samples.reshape(-1, wav.getnchannels()).astype(np.float64)
        rms = np.sqrt(np.mean(samples ** 2, axis=0))
        correlation = float(np.corrcoef(samples.T)[0, 1]) if np.all(rms > 0) else None
        print(f"Transcribing {label}: {start}–{start + duration} seconds.", flush=True)
        started = time.monotonic()
        rows = []
        inputs = [(str(clip), None)]
        if args.separate_channels:
            inputs = [(np.asarray(samples[:, channel] / 32768, dtype=np.float32), channel)
                      for channel in range(samples.shape[1])]
        for audio_input, channel in inputs:
            segments, info = model.transcribe(
                audio_input, language="en", beam_size=5, vad_filter=True,
                word_timestamps=True, condition_on_previous_text=False,
            )
            for segment in segments:
                rows.append({
                    "channel": channel,
                    "start": round(start + segment.start, 3),
                    "end": round(start + segment.end, 3),
                    "text": segment.text.strip(),
                    "avg_logprob": segment.avg_logprob,
                    "no_speech_prob": segment.no_speech_prob,
                    "words": [{
                        "start": round(start + word.start, 3),
                        "end": round(start + word.end, 3),
                        "word": word.word, "probability": word.probability,
                    } for word in (segment.words or [])],
                })
        rows.sort(key=lambda row: (row["start"], row["channel"] or 0))
        result["samples"].append({
            "name": label, "start": start, "requested_duration": duration,
            "decoded_duration": len(samples) / sample_rate,
            "relative_audio_file": clip.relative_to(TASK).as_posix(),
            "rms_per_channel": rms.tolist(),
            "channel_correlation": correlation,
            "channels_identical": bool(np.array_equal(samples[:, 0], samples[:, 1])),
            "transcription_seconds": round(time.monotonic() - started, 2),
            "segments": rows,
        })
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Saved {label}: {len(rows)} segments.", flush=True)
    result["status"] = "complete"
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Completed local sample checks.", flush=True)


if __name__ == "__main__":
    main()
