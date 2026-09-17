# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Build only the two Edon lessons' speech jobs with the verified slower SAPI voice."""

import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess

SOURCE = Path(__file__).resolve().parent
REPO = SOURCE.parents[2]
VOICE = {"engine": "Windows SAPI", "name": "Microsoft Zira Desktop - English (United States)",
         "rate": -2, "localOnly": True, "voiceCloning": False}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def probe(path):
    metadata = json.loads(run(["ffprobe", "-v", "error", "-show_entries",
                              "format=duration:stream=codec_name,sample_rate,channels",
                              "-of", "json", str(path)]).stdout)
    pcm = run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-i", str(path),
               "-ac", "1", "-ar", "16000", "-f", "s16le", "-"]).stdout
    samples = array.array("h", pcm)
    rms = math.sqrt(sum(value * value for value in samples) / len(samples)) / 32768 if samples else 0
    duration = float(metadata["format"]["duration"])
    if rms < 0.001 or not 0.4 < duration < 60:
        raise SystemExit(f"Audio is silent, too short, or too long: {path.name}")
    return {"bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "durationSeconds": duration, "codec": metadata["streams"][0]["codec_name"],
            "rmsDbfs": round(20 * math.log10(rms), 2), "decode": "passed"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("lesson", choices=("2026-09-14", "2026-09-16"))
    args = parser.parse_args()
    task = REPO / "learning-tasks" / f"nativecamp-{args.lesson}"
    jobs_path = task / "source/speech-jobs.json"
    manifest_path = task / "source/nativecamp-audio-manifest.json"
    jobs = json.loads(jobs_path.read_text(encoding="utf-8"))
    if not isinstance(jobs, list) or not jobs:
        raise SystemExit("Speech jobs must be a non-empty array.")
    names = set()
    for job in jobs:
        if (not isinstance(job, dict) or not isinstance(job.get("file"), str)
                or not re.fullmatch(re.escape(args.lesson) + r"-[a-z0-9-]+\.mp3", job["file"])
                or not isinstance(job.get("text"), str) or not job["text"].strip() or len(job["text"]) > 1000
                or job["file"] in names):
            raise SystemExit("Invalid or duplicate speech job; no audio has been written.")
        names.add(job["file"])
    old = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    previous = {row["file"]: row for row in old.get("tts", [])}
    audio_dir = REPO / "docs/nativecamp/audio"
    rebuild = []
    for job in jobs:
        current = audio_dir / job["file"]
        prior = previous.get(f"audio/{job['file']}", {})
        if (old.get("voice") != VOICE or prior.get("text") != job["text"] or not current.exists()
                or prior.get("sha256") != hashlib.sha256(current.read_bytes()).hexdigest()):
            rebuild.append(job)
    work = task / "source/private/tts-work"
    if rebuild:
        write_json(work / "jobs.json", [{"id": Path(job["file"]).stem, "text": job["text"]} for job in rebuild])
        run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(SOURCE / "tts-sapi.ps1"),
             "-JobsPath", str(work / "jobs.json"), "-OutputDirectory", str(work), "-Rate", "-2"])
        audio_dir.mkdir(parents=True, exist_ok=True)
        for job in rebuild:
            run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-y",
                 "-i", str(work / Path(job["file"]).with_suffix(".wav")),
                 "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-q:a", "4", "-map_metadata", "-1",
                 str(audio_dir / job["file"])])
    manifest = {"schemaVersion": 1, "lessonId": args.lesson, "voice": VOICE,
                "speechJobsSha256": hashlib.sha256(jobs_path.read_bytes()).hexdigest(),
                "tts": [{"file": f"audio/{job['file']}", "text": job["text"], **probe(audio_dir / job["file"])}
                        for job in jobs],
                "limits": {"humanListening": "not performed", "iPadPlayback": "not performed",
                           "pronunciationAssessment": "not performed"}}
    write_json(manifest_path, manifest)
    print(json.dumps({"lessonId": args.lesson, "rebuilt": len(rebuild), "verified": len(jobs),
                      "rate": -2, "apiRequests": 0}))


if __name__ == "__main__":
    main()
