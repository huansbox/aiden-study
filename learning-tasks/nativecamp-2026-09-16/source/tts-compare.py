# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Produce bounded TTS samples; never touch the published lesson or its audio."""

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parent / "assets/tts-comparison"
PRIVATE = SOURCE / "private/tts-comparison"
SAMPLES = [
    {"id": "odd-even", "text": "Is seven odd or even? Say the number too."},
    {"id": "four-trees", "text": "There are four trees."},
    {"id": "too-many", "text": "There are too many books."},
]
INSTRUCTIONS = (
    "Speak in clear, natural American English for a young English learner. "
    "Use a calm, patient teacher's tone, about 135 words per minute. "
    "Keep words connected naturally, with only a short pause between sentences. "
    "In 'Say the number too', connect 'too' to the phrase without an extra pause. "
    "Read exactly the supplied text. Do not add words, music, or sound effects."
)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs)


def probe(path, text):
    raw = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration:stream=codec_name,sample_rate,channels", "-of", "json", str(path)])
    metadata = json.loads(raw.stdout)
    duration = float(metadata["format"]["duration"])
    if not 0.1 < duration < 60:
        raise ValueError(f"Unexpected sample duration: {path.name}")
    decoded = run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "info", "-xerror",
                   "-i", str(path), "-af", "volumedetect,silencedetect=noise=-35dB:d=0.15",
                   "-f", "null", "-"])
    log = decoded.stderr.decode("utf-8", errors="replace")
    volume = re.search(r"mean_volume: ([\d.-]+) dB", log)
    if volume is None or float(volume[1]) < -45:
        raise ValueError(f"Sample is silent or too quiet: {path.name}")
    pauses = [{"endSeconds": float(end), "durationSeconds": float(length)} for end, length in
              re.findall(r"silence_end: ([\d.]+) \| silence_duration: ([\d.]+)", log)]
    return {"file": path.relative_to(SOURCE.parent).as_posix(), "text": text,
            "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "durationSeconds": duration,
            "wordsPerMinuteIncludingPauses": round(len(text.split()) * 60 / duration, 2),
            "meanVolumeDb": float(volume[1]), "streams": metadata["streams"],
            "decoded": True, "silencesAtMinus35DbMin150Ms": pauses}


def encode(source, target):
    run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y", "-i", str(source),
         "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "4", "-map_metadata", "-1", str(target)])


def windows():
    records = []
    for rate in (-1, -2):
        jobs = list(SAMPLES)
        if rate == -1:
            jobs.append({"id": "odd-even-comma-control", "text": "Is seven odd or even? Say the number, too."})
        work = PRIVATE / f"zira-rate{rate}"
        jobs_path = work / "jobs.json"
        write_json(jobs_path, jobs)
        run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
             str(SOURCE / "tts-sapi.ps1"), "-JobsPath", str(jobs_path),
             "-OutputDirectory", str(work), "-Rate", str(rate)])
        for job in jobs:
            target = OUTPUT / f"windows-zira-rate{rate}-{job['id']}.mp3"
            encode(work / f"{job['id']}.wav", target)
            records.append({"sampleId": job["id"], "engine": "Windows SAPI",
                            "voice": "Microsoft Zira Desktop - English (United States)",
                            "rate": rate, **probe(target, job["text"])})
    return records


def mac(voice, rate):
    if sys.platform != "darwin":
        raise SystemExit("Run --engine mac on the authorized Mac; no remote connection is assumed.")
    records = []
    for job in SAMPLES:
        raw = PRIVATE / f"mac-{job['id']}.aiff"
        run(["say", "-v", voice, "-r", str(rate), "-o", str(raw), job["text"]])
        target = OUTPUT / f"mac-rate{rate}-{job['id']}.mp3"
        encode(raw, target)
        records.append({"sampleId": job["id"], "engine": "macOS say", "voice": voice,
                        "requestedWordsPerMinute": rate, **probe(target, job["text"])})
    return records


def openai():
    if (SOURCE / "tts-openai-playground-log.json").exists():
        raise SystemExit("Playground generation is already recorded. Use --engine import-playground to verify it without new charges.")
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise SystemExit("OPENAI_API_KEY is not configured; sent 0 API requests.")
    ledger_path = SOURCE / "tts-openai-request-log.json"
    ledger = json.loads(ledger_path.read_text(encoding="utf-8")) if ledger_path.exists() else []
    if ledger:
        raise SystemExit("A prior OpenAI attempt is recorded. Inspect it before any deliberate paid regeneration.")
    records = []
    for voice in ("marin", "cedar"):
        for job in SAMPLES:
            payload = {"model": "gpt-4o-mini-tts", "voice": voice, "input": job["text"],
                       "instructions": INSTRUCTIONS, "speed": 1.0, "response_format": "mp3"}
            entry = {"timeUtc": dt.datetime.now(dt.timezone.utc).isoformat(), "voice": voice,
                     "sampleId": job["id"], "status": "attempt-started", "request": payload}
            ledger.append(entry)
            write_json(ledger_path, ledger)
            request = urllib.request.Request("https://api.openai.com/v1/audio/speech",
                                             data=json.dumps(payload).encode("utf-8"),
                                             headers={"Authorization": "Bearer " + key,
                                                      "Content-Type": "application/json"}, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=60) as response:
                    data = response.read(5_000_001)
                    if len(data) > 5_000_000:
                        raise ValueError("Unexpected response size")
                    entry.update(status="received", requestId=response.headers.get("x-request-id"), bytes=len(data))
            except urllib.error.HTTPError as error:
                entry.update(status="failed", httpStatus=error.code)
                write_json(ledger_path, ledger)
                raise SystemExit(f"TTS returned HTTP {error.code}; stopped without retrying.") from None
            except (urllib.error.URLError, TimeoutError, ValueError):
                entry.update(status="failed-transport-or-output")
                write_json(ledger_path, ledger)
                raise SystemExit("TTS request did not complete safely; stopped without retrying.") from None
            write_json(ledger_path, ledger)
            target = OUTPUT / f"openai-{voice}-{job['id']}.mp3"
            target.write_bytes(data)
            records.append({"sampleId": job["id"], "engine": "OpenAI speech API", "voice": voice,
                            "model": payload["model"], "speed": payload["speed"],
                            "instructions": INSTRUCTIONS, **probe(target, job["text"])})
    return records


def import_playground():
    """Verify downloaded UI outputs without issuing an API request."""
    log = json.loads((SOURCE / "tts-openai-playground-log.json").read_text(encoding="utf-8-sig"))
    if len(log["generations"]) != 6 or any(row["status"] != "downloaded" for row in log["generations"]):
        raise SystemExit("The six Playground downloads are not yet recorded as complete.")
    return [{"sampleId": row["sampleId"], "engine": "OpenAI Audio Playground", "voice": row["voice"],
             "model": log["model"], "speed": log["speed"], "instructions": log["instructions"],
             **probe(OUTPUT / f"openai-{row['voice']}-{row['sampleId']}.mp3", row["text"])}
            for row in log["generations"]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=("windows", "mac", "openai", "import-playground"), required=True)
    parser.add_argument("--voice", default="Samantha", help="An installed macOS voice; inspect say -v '?' first.")
    parser.add_argument("--rate", type=int, default=135, help="macOS requested words per minute.")
    args = parser.parse_args()
    if not 90 <= args.rate <= 180:
        parser.error("Comparison rate must be 90–180 words per minute")
    for command in ("ffmpeg", "ffprobe"):
        if not shutil.which(command):
            parser.error(f"{command} is required")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    records = (windows() if args.engine == "windows" else mac(args.voice, args.rate) if args.engine == "mac"
               else import_playground() if args.engine == "import-playground" else openai())
    manifest = {"schemaVersion": 1, "createdUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
                "engine": args.engine, "scope": "Synthetic demonstration text only; not teacher or child recordings",
                "samples": records, "humanListening": "not performed", "iPadPlayback": "not performed",
                "apiRequestCount": 6 if args.engine == "openai" else 0,
                "playgroundGenerationCount": 6 if args.engine == "import-playground" else 0}
    manifest_name = "openai" if args.engine == "import-playground" else args.engine
    write_json(SOURCE / f"tts-{manifest_name}-manifest.json", manifest)
    print(json.dumps({"engine": args.engine, "verifiedSamples": len(records),
                      "apiRequestCount": manifest["apiRequestCount"]}))


if __name__ == "__main__":
    main()
