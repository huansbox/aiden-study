# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Prebuild original Native Camp speech through OpenAI; never upload recordings."""

import argparse
import array
import copy
from datetime import datetime, timezone
import hashlib
import http.client
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request

REPO = Path(__file__).resolve().parents[3]
MODEL = "gpt-4o-mini-tts-2025-12-15"
INSTRUCTIONS = "Speak in clear, natural English at a normal conversational pace with a friendly tone."
ENDPOINT = "https://api.openai.com/v1/audio/speech"


class AudioBuildError(Exception):
    """A safe, locally authored diagnostic; never include API bodies or credentials."""


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as output:
        output.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
        output.flush()
        os.fsync(output.fileno())
    temporary.replace(path)


def read_jobs(path):
    try:
        jobs = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        raise AudioBuildError("Cannot read speech jobs as JSON.") from None
    if not isinstance(jobs, list) or not jobs:
        raise AudioBuildError("Speech jobs must be a non-empty array of original text jobs.")
    seen = set()
    for job in jobs:
        if (not isinstance(job, dict) or not isinstance(job.get("file"), str)
                or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]*\.mp3", job["file"])
                or not isinstance(job.get("text"), str) or not job["text"].strip()
                or len(job["text"]) > 4096 or job["file"] in seen):
            raise AudioBuildError("Invalid, duplicate, or oversized speech job; nothing generated.")
        seen.add(job["file"])
    return jobs


def request_body(job, voice):
    return {"model": MODEL, "input": job["text"], "voice": voice,
            "instructions": INSTRUCTIONS, "response_format": "mp3", "speed": 1.0}


def inspect_audio(path):
    """Require a fully decodable, non-silent MP3; inspect all decoded samples."""
    try:
        result = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name",
            "-of", "json", str(path)], check=True, capture_output=True, timeout=30)
        metadata = json.loads(result.stdout)
        decoded = subprocess.run([
            "ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-i", str(path),
            "-ac", "1", "-ar", "16000", "-f", "s16le", "-"],
            check=True, capture_output=True, timeout=60)
        samples = array.array("h", decoded.stdout)
        rms = math.sqrt(sum(v * v for v in samples) / len(samples)) / 32768 if samples else 0
        duration = float(metadata["format"]["duration"])
        codec = metadata["streams"][0]["codec_name"]
        if codec != "mp3" or rms < 0.001 or not 0.3 < duration < 300:
            raise ValueError("invalid audio")
        return {"bytes": path.stat().st_size, "sha256": digest(path.read_bytes()),
                "durationSeconds": duration, "codec": codec, "rmsDbfs": round(20 * math.log10(rms), 2),
                "decode": "passed", "nonSilent": True}
    except (OSError, ValueError, KeyError, IndexError, subprocess.SubprocessError):
        raise AudioBuildError("Audio failed MP3 decode, duration, or non-silence validation.") from None


def speech_request(body, destination, api_key):
    request = urllib.request.Request(ENDPOINT, data=canonical(body), method="POST", headers={
        "Authorization": "Bearer " + api_key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            length_header = response.headers.get("Content-Length")
            if length_header is not None and not re.fullmatch(r"[0-9]+", length_header.strip()):
                raise AudioBuildError("OpenAI Speech API returned an invalid content length; no automatic retry.")
            expected_length = int(length_header) if length_header is not None else None
            received = 0
            with destination.open("wb") as output:
                while chunk := response.read(65536):
                    output.write(chunk)
                    received += len(chunk)
                # HTTPResponse.read(size) can return EOF without raising when
                # Content-Length promised more bytes, even for a decodable MP3.
                if expected_length is not None and received != expected_length:
                    raise AudioBuildError("OpenAI Speech API response was incomplete; no automatic retry.")
                output.flush()
                os.fsync(output.fileno())
            request_id = response.headers.get("x-request-id", "")
            return {"requestId": request_id if re.fullmatch(r"[a-zA-Z0-9_-]{1,128}", request_id) else None,
                    "responseBytes": received, "contentLength": expected_length, "usage": None}
    except urllib.error.HTTPError as error:
        # Error bodies may echo Authorization; never persist or print them.
        raise AudioBuildError(f"OpenAI Speech API returned HTTP {error.code}; no automatic retry.") from None
    except (OSError, urllib.error.URLError, TimeoutError, http.client.HTTPException):
        raise AudioBuildError("OpenAI Speech API transport failed; no automatic retry.") from None


def valid_existing(path, prior, fingerprint):
    if prior.get("inputFingerprint") != fingerprint or not path.is_file():
        return None
    if digest(path.read_bytes()) != prior.get("sha256"):
        return None
    try:
        return inspect_audio(path)
    except AudioBuildError:
        return None


def build(args):
    journal_path = getattr(args, "request_journal", None)
    if not journal_path:
        return _build(args)
    lock = journal_path.with_name(journal_path.name + ".lock")
    if args.check:
        if lock.exists():
            raise AudioBuildError("Audio generation is locked; verify the owner before recovery.")
        return _build(args)
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = lock.open("x", encoding="ascii")
    except FileExistsError:
        raise AudioBuildError("Audio generation is locked; verify the owner before recovery.") from None
    try:
        with handle:
            handle.write(str(os.getpid()))
            handle.flush()
            os.fsync(handle.fileno())
        return _build(args)
    finally:
        lock.unlink()


def _build(args):
    jobs = read_jobs(args.jobs)
    journal_path = getattr(args, "request_journal", None)
    try:
        journal = json.loads(journal_path.read_text(encoding="utf-8")) if journal_path and journal_path.exists() else {}
    except (OSError, ValueError):
        raise AudioBuildError("Cannot read request journal; do not retry uncertain paid requests.") from None
    if not isinstance(journal, dict) or any(not isinstance(row, dict) or row.get("state") not in
                                           ("request-started", "response-verified") for row in journal.values()):
        raise AudioBuildError("Invalid request journal; do not retry uncertain paid requests.")
    if not all(shutil.which(tool) for tool in ("ffmpeg", "ffprobe")):
        raise AudioBuildError("ffmpeg and ffprobe must be available on PATH.")
    try:
        old = json.loads(args.manifest.read_text(encoding="utf-8")) if args.manifest.exists() else {}
    except (OSError, ValueError):
        raise AudioBuildError("Cannot read existing audio manifest; it has not been replaced.") from None
    if not isinstance(old, dict) or old.get("lessonId", args.lesson) != args.lesson:
        raise AudioBuildError("Manifest lessonId does not match the requested lesson.")
    manifest = copy.deepcopy(old)
    previous = {row["file"]: row for row in old.get("tts", [])}
    rows = {job["file"]: previous.get("audio/" + job["file"], {}) for job in jobs}
    manifest.update({"schemaVersion": 2, "lessonId": args.lesson,
                     "voice": {"engine": "OpenAI Speech API", "name": args.voice, "model": MODEL,
                               "speed": 1.0, "instructions": INSTRUCTIONS,
                               "localOnly": False, "voiceCloning": False},
                     "speechJobsSha256": digest(args.jobs.read_bytes()),
                     "limits": {"humanListening": "not performed", "iPadPlayback": "not performed",
                                "pronunciationAssessment": "not performed", "productionDeployment": "not performed"}})
    accounting = manifest.setdefault("openaiGeneration", {"apiRequests": 0, "successfulRequests": 0,
        "usage": None, "costUsd": None,
        "costNote": "Binary Speech API responses do not provide token usage; actual billing is unknown."})
    summary = {"lessonId": args.lesson, "generated": 0, "skipped": 0, "recovered": 0,
               "apiRequests": 0, "verified": 0, "total": len(jobs)}
    pending = []
    manifest_contract_changed = (
        old.get("speechJobsSha256") != manifest["speechJobsSha256"]
        or [row["file"] for row in old.get("tts", [])] != ["audio/" + job["file"] for job in jobs]
    )

    def save():
        manifest["tts"] = [rows[job["file"]] for job in jobs if rows[job["file"]]]
        manifest["status"] = "complete" if summary["verified"] == len(jobs) else "incomplete"
        manifest["lastRun"] = dict(summary)
        write_json(args.manifest, manifest)

    for job in jobs:
        name = job["file"]
        body = request_body(job, args.voice)
        fingerprint = digest(canonical(body))
        target = args.audio_dir / name
        part = args.audio_dir / ("." + name + ".part")
        prior = rows[name]
        verified = valid_existing(target, prior, fingerprint)
        if verified:
            summary["verified"] += 1
            summary["skipped"] += 1
            continue
        # A verified response is journaled before promotion. A stopped process can
        # recover that exact response without buying it again.
        staged = valid_existing(part, prior, fingerprint)
        if staged and not args.check:
            part.replace(target)
            summary["verified"] += 1
            summary["recovered"] += 1
            continue
        pending.append((job, body, fingerprint, target, part))
    # Persisted before any paid call. A killed process or an unjournaled response
    # must not silently buy the same file again on the next scheduled run.
    if journal_path and any(journal.get(job["file"], {}).get("state") == "request-started"
                            for job, *_ in pending):
        raise AudioBuildError("A paid request has an uncertain result; stop and request operator review before retrying.")
    if args.check:
        if pending:
            raise AudioBuildError(f"{len(pending)} audio files need generation or repair.")
        if manifest_contract_changed or old.get("status") != "complete":
            raise AudioBuildError("Manifest speech jobs hash, ordered file list, or completion status is stale.")
        return summary
    if not pending:
        # An unchanged rerun is read-only as well as free of API requests.
        if summary["recovered"] or manifest_contract_changed or old.get("status") != "complete":
            save()
        return summary
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("op://"):
        raise AudioBuildError("Set OPENAI_API_KEY securely in the child process (for example with op run).")
    args.audio_dir.mkdir(parents=True, exist_ok=True)
    selected = pending[:args.limit] if args.limit else pending
    for job, body, fingerprint, target, part in selected:
        summary["apiRequests"] += 1
        accounting["apiRequests"] += 1
        manifest.pop("lastError", None)
        save()
        if journal_path:
            journal[job["file"]] = {"state": "request-started", "inputFingerprint": fingerprint}
            write_json(journal_path, journal)
        try:
            receipt = speech_request(body, part, api_key)
            accounting["successfulRequests"] += 1
            verified = inspect_audio(part)
            rows[job["file"]] = {"file": "audio/" + job["file"], "text": job["text"],
                "model": MODEL, "voice": args.voice,
                "settings": {k: body[k] for k in ("speed", "instructions", "response_format")},
                "inputFingerprint": fingerprint, "generatedAt": datetime.now(timezone.utc).isoformat(),
                **receipt, **verified}
            save()
            if journal_path:
                journal[job["file"]] = {"state": "response-verified", "inputFingerprint": fingerprint,
                                         "sha256": verified["sha256"]}
                write_json(journal_path, journal)
            part.replace(target)
            summary["generated"] += 1
            summary["verified"] += 1
            save()
            print(json.dumps({"generated": job["file"], "durationSeconds": verified["durationSeconds"]}), flush=True)
        except Exception as error:
            safe = str(error) if isinstance(error, AudioBuildError) else "Audio generation failed; no automatic retry."
            manifest["lastError"] = {"file": job["file"], "message": safe}
            save()
            raise AudioBuildError(safe) from None
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", required=True)
    parser.add_argument("--voice", choices=("marin", "cedar"), required=True)
    parser.add_argument("--jobs", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--audio-dir", type=Path, default=REPO / "docs/nativecamp/audio")
    parser.add_argument("--limit", type=int, help="Generate at most this many pending files (use 1 for a permission sample)")
    parser.add_argument("--check", action="store_true", help="Verify every input fingerprint, hash and audio; do not write or call API")
    parser.add_argument("--request-journal", type=Path,
                        help="Private durable paid-request journal; required for unattended weekly generation")
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    try:
        print(json.dumps(build(args)), flush=True)
    except AudioBuildError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception:
        # Fail closed without dumping runtime state or a provider's exception.
        print("Audio build failed; inspect local inputs and tooling. No credentials were logged.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
