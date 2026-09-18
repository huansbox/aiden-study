# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""Prepare and verify Aiden's weekly publication; never deploy or print raw progress."""

import argparse
from contextlib import contextmanager
from datetime import date
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request

REPO = Path(__file__).resolve().parents[3]
PRIVATE = Path(".local/nativecamp-weekly")
TOOLS = Path("learning-tasks/shared/nativecamp")
NAMESPACE = "a2e1919289e84a21bb2169097ab33877"
ORIGIN = "https://kids.linshuhuan.com/"
MAX_PROGRESS = 2 * 1024 * 1024


class AutomationError(Exception):
    """Only locally authored, safe diagnostics may cross the CLI boundary."""


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        raise AutomationError("Required local JSON is absent or invalid.") from None


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(value, indent=2) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(path)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paths(repo, release):
    try:
        parsed = date.fromisoformat(release)
        if parsed.isoformat() != release or parsed.weekday() != 6:
            raise ValueError()
    except (TypeError, ValueError):
        raise AutomationError("Release must be an ISO Sunday in Asia/Taipei.") from None
    return repo / PRIVATE / release, "weekly-" + release


@contextmanager
def locked(repo):
    lock = repo / PRIVATE / "automation.lock"
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = lock.open("x", encoding="ascii")
    except FileExistsError:
        raise AutomationError("Weekly work is locked; inspect the owner before removing a stale lock.") from None
    try:
        with handle:
            handle.write(str(os.getpid()))
            handle.flush()
            os.fsync(handle.fileno())
        yield
    finally:
        lock.unlink()


def run(command, repo, *, input_data=None, timeout=120, env=None):
    try:
        result = subprocess.run(command, cwd=repo, input=input_data, capture_output=True,
                                timeout=timeout, check=False, env=env)
    except (OSError, subprocess.SubprocessError):
        raise AutomationError("External command could not complete; no raw output was logged.") from None
    if result.returncode:
        raise AutomationError("External command failed; no raw output was logged.")
    return result.stdout


def publication_digest(repo, relative):
    # Git's clean conversion is the deployment contract. In Windows a reviewed
    # JSON can be CRLF in the worktree while Git/Pages correctly publish LF.
    # Write only an unreferenced blob, never touch the index or working file.
    blob = run(["git", "hash-object", "-w", f"--path={relative}", "--stdin"], repo,
               input_data=(repo / relative).read_bytes()).decode("ascii").strip()
    if not re.fullmatch(r"[a-f0-9]{40,64}", blob):
        raise AutomationError("Git could not normalize the publication artifact.")
    return hashlib.sha256(run(["git", "cat-file", "blob", blob], repo)).hexdigest()


def capture_progress(repo):
    npx = shutil.which("npx.cmd" if os.name == "nt" else "npx")
    if not npx:
        raise AutomationError("The existing npx/Wrangler installation is unavailable.")
    # Wrangler 4.132.0 logger writes every level to disk independently of LOG.
    # WRITE_LOGS=false is therefore required; never use --text (logger.log).
    env = dict(os.environ, WRANGLER_WRITE_LOGS="false", WRANGLER_LOG_SANITIZE="true",
               WRANGLER_LOG="error", WRANGLER_SEND_METRICS="false")
    env.pop("OPENAI_API_KEY", None)
    raw = run([npx, "--no-install", "wrangler@4.132.0", "kv", "key", "get", "p:aiden:nativecamp",
               "--namespace-id", NAMESPACE, "--remote", "--config", "worker/wrangler.jsonc"], repo, env=env)
    if not raw.strip() or len(raw) > MAX_PROGRESS:
        raise AutomationError("Progress response is empty or oversized; this is not an empty practice week.")
    # The planner owns schema/source validation and writes only normalized progress.
    return raw


def prepare(repo, release, snapshot=None):
    work, lesson_id = paths(repo, release)
    receipt_path = work / "automation.json"
    if receipt_path.exists() and read_json(receipt_path).get("status") == "published":
        return {"status": "skipped", "reason": "already-published", "releaseDate": release}
    resuming = (work / "plan.json").exists()
    if resuming:
        output = run(["node", str(TOOLS / "plan_weekly.mjs"), "--resume", "--release", release], repo)
    else:
        catalog = read_json(repo / "docs/nativecamp/lessons/catalog.json")
        if any(entry.get("kind") == "weekly" and entry.get("date") == release for entry in catalog["lessons"]):
            return {"status": "skipped", "reason": "already-published", "releaseDate": release}
        if snapshot:
            snapshot = snapshot.resolve()
            if not snapshot.is_relative_to((repo / PRIVATE).resolve()):
                raise AutomationError("Synthetic snapshots must stay in the ignored weekly work directory.")
            raw = snapshot.read_bytes()
        else:
            raw = capture_progress(repo)
        if len(raw) > MAX_PROGRESS:
            raise AutomationError("Progress response is oversized.")
        output = run(["node", str(TOOLS / "plan_weekly.mjs"), "--stdin", "--release", release],
                     repo, input_data=raw)
    try:
        result = json.loads(output)
        if result["status"] not in ("planned", "resumed", "skipped") or result["releaseDate"] != release:
            raise ValueError()
    except (ValueError, KeyError, TypeError):
        raise AutomationError("Planner did not return a valid safe summary.") from None
    # Never forward a child process's arbitrary fields into logs or receipts.
    summary = {"status": result["status"], "releaseDate": release}
    if result["status"] == "skipped":
        if result.get("reason") not in ("no-synced-progress", "no-new-practice", "already-published"):
            raise AutomationError("Planner returned an unknown skip reason.")
        summary["reason"] = result["reason"]
    else:
        summary["lessonId"] = lesson_id
    # A successful resume must not erase an existing publication preflight.
    if not resuming or not receipt_path.exists():
        write_json(receipt_path, summary)
    return summary


def reviewed_artifacts(repo, release):
    work, lesson_id = paths(repo, release)
    source = Path(f"learning-tasks/nativecamp-{lesson_id}/source")
    required = [source / "lesson-source.json", source / "speech-jobs.json",
                source / "nativecamp-audio-manifest.json", source / "nativecamp-tts-asr.json",
                Path(f"docs/nativecamp/lessons/{lesson_id}.json")]
    return {path.as_posix(): digest(repo / path) for path in required}


def validate_public_content(repo, lesson, plan, brief):
    sources = [row["sourceConcept"] for row in lesson["concepts"]]
    canonical = lambda value: json.dumps(value, sort_keys=True, separators=(",", ":"))
    source_set = {canonical(row) for row in sources}
    if (sources != [row["sourceConcept"] for row in brief["concepts"]]
            or len(source_set) != len(sources)
            or source_set != {canonical(row["sourceConcept"]) for row in plan["concepts"]}):
        raise AutomationError("Generated concepts do not match the frozen plan and public brief order.")
    forbidden = {"progress", "rawprogress", "snapshot", "snapshothash", "needspractice", "lastpracticed",
                 "currentwindow", "initial", "reviews", "outcome", "rating", "child"}

    def scan(value):
        if isinstance(value, dict):
            if any(key.lower().replace("_", "") in forbidden for key in value):
                raise AutomationError("Public content contains private progress or ranking fields.")
            for item in value.values():
                scan(item)
        elif isinstance(value, list):
            for item in value:
                scan(item)

    scan(lesson)
    questions = lambda value: [q for concept in value["concepts"] for mode in ("try", "say") for q in concept[mode]]
    signature = lambda q: canonical({key: q.get(key) for key in ("prompt", "scene", "answerText")})
    old = set()
    for entry in read_json(repo / "docs/nativecamp/lessons/catalog.json")["lessons"]:
        if entry["id"] != lesson["id"]:
            previous = read_json(repo / f"docs/nativecamp/lessons/{entry['id']}.json")
            old.update(signature(question) for question in questions(previous))
    if any(signature(question) in old for question in questions(lesson)):
        raise AutomationError("New weekly questions repeat an existing prompt, scene, and answer.")


def preflight(repo, release):
    work, lesson_id = paths(repo, release)
    plan = read_json(work / "plan.json")
    brief = read_json(work / "generation-brief.json")
    review = read_json(work / "review.json")
    receipt_path = work / "automation.json"
    if receipt_path.exists() and read_json(receipt_path).get("status") == "published":
        raise AutomationError("Published weekly packs are immutable.")
    # The SOP fetches origin/master first. HEAD may already contain an unpushed
    # weekly commit after an interruption; it is not proof of publication.
    baseline = "origin/master"
    remote_catalog = json.loads(run(["git", "show", f"{baseline}:docs/nativecamp/lessons/catalog.json"], repo))
    integrated = any(row.get("kind") == "weekly" and row.get("date") == release
                     for row in remote_catalog["lessons"])
    if plan.get("lessonId") != lesson_id or plan.get("releaseDate") != release:
        raise AutomationError("Weekly plan does not match the release.")
    hashes = reviewed_artifacts(repo, release)
    checks = ("originalQuestions", "completeAnswers", "naturalAlternatives", "sourceMapping",
              "noPrivateData", "asrWords", "independentReview")
    if (review.get("releaseDate") != release or review.get("status") != "passed"
            or review.get("artifacts") != hashes
            or not isinstance(review.get("reviewer"), str) or not review["reviewer"].strip()
            or any(review.get("checks", {}).get(check) is not True for check in checks)):
        raise AutomationError("Independent review is absent, failed, incomplete, or stale.")
    source = Path(f"learning-tasks/nativecamp-{lesson_id}/source")
    manifest = read_json(repo / source / "nativecamp-audio-manifest.json")
    asr = read_json(repo / source / "nativecamp-tts-asr.json")
    expected_samples = {index for start in range(0, len(manifest["tts"]), 12)
                        for index in (start, min(start + 11, len(manifest["tts"]) - 1))}
    sample_hashes = {manifest["tts"][index]["file"]: manifest["tts"][index]["sha256"] for index in expected_samples}
    if (asr.get("lessonId") != lesson_id or not sample_hashes
            or {row["file"]: row["sha256"] for row in asr["samples"]} != sample_hashes
            or any(not row.get("recognizedText", "").strip() for row in asr["samples"])):
        raise AutomationError("ASR evidence is incomplete or does not match the verified audio.")
    lesson = read_json(repo / f"docs/nativecamp/lessons/{lesson_id}.json")
    catalog = read_json(repo / "docs/nativecamp/lessons/catalog.json")
    entries = [entry for entry in catalog["lessons"] if entry.get("kind") == "weekly" and entry.get("date") == release]
    if (len(entries) != 1 or entries[0].get("id") != lesson_id
            or lesson.get("id") != lesson_id or lesson.get("date") != release
            or lesson.get("kind") != "weekly" or entries[0].get("weekly") != lesson.get("weekly")):
        raise AutomationError("Catalog must contain exactly one matching weekly release with identical metadata.")
    validate_public_content(repo, lesson, plan, brief)
    validate_public_content(repo, read_json(repo / source / "lesson-source.json"), plan, brief)
    run(["uv", "run", "--offline", str(TOOLS / "build_lesson.py"), "--lesson", lesson_id, "--check"], repo)
    run(["uv", "run", "--offline", str(TOOLS / "build_openai_audio.py"), "--lesson", lesson_id,
         "--voice", manifest["voice"]["name"], "--jobs", str(source / "speech-jobs.json"),
         "--manifest", str(source / "nativecamp-audio-manifest.json"),
         "--request-journal", str(PRIVATE / release / "audio-requests.json"), "--check"], repo, timeout=900)
    run(["node", "--input-type=module", "-e",
         "import fs from 'node:fs'; import './docs/nativecamp/core.js'; import './docs/nativecamp/catalog.js'; "
         "const c=JSON.parse(fs.readFileSync('docs/nativecamp/lessons/catalog.json')); "
         "await NativeCampCatalog.readLessons(NativeCampCatalog.validateCatalog(c), "
         "{base:'docs/nativecamp',fetchImpl:async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(p))})});"], repo)
    public = {"nativecamp/lessons/catalog.json": publication_digest(repo, "docs/nativecamp/lessons/catalog.json"),
              f"nativecamp/lessons/{lesson_id}.json": publication_digest(repo, f"docs/nativecamp/lessons/{lesson_id}.json")}
    for row in manifest["tts"]:
        public["nativecamp/" + row["file"]] = row["sha256"]
    if integrated:
        # A prior merge can also have completed before the process stopped.
        # Only an identical release may proceed to read-only production checks.
        for relative, expected in public.items():
            committed = run(["git", "show", f"{baseline}:docs/{relative}"], repo)
            if hashlib.sha256(committed).hexdigest() != expected:
                raise AutomationError("An existing integrated release differs; published packs are immutable.")
    receipt = {"status": "ready", "releaseDate": release, "lessonId": lesson_id,
               "reviewSha256": digest(work / "review.json"), "artifacts": hashes, "public": public}
    write_json(receipt_path, receipt)
    return {"status": "ready", "releaseDate": release, "lessonId": lesson_id,
            "files": len(public), "alreadyIntegrated": integrated}


def verify_published(repo, release, commit):
    work, lesson_id = paths(repo, release)
    receipt = read_json(work / "automation.json")
    if not re.fullmatch(r"[a-f0-9]{40}", commit):
        raise AutomationError("Publication requires the full deployed commit hash.")
    if (receipt.get("status") not in ("ready", "published") or receipt.get("artifacts") != reviewed_artifacts(repo, release)
            or receipt.get("reviewSha256") != digest(work / "review.json")):
        raise AutomationError("Publication preflight is absent or stale.")
    for relative, expected in receipt["public"].items():
        if not re.fullmatch(r"nativecamp/(?:lessons/[a-z0-9-]+\.json|audio/[a-z0-9._-]+\.mp3)", relative):
            raise AutomationError("Publication receipt contains an unexpected public path.")
        committed = run(["git", "show", f"{commit}:docs/{relative}"], repo)
        if hashlib.sha256(committed).hexdigest() != expected:
            raise AutomationError("The deployment commit differs from the reviewed release.")
        try:
            with urllib.request.urlopen(ORIGIN + relative, timeout=30) as response:
                if response.url.split("/", 3)[:3] != ORIGIN.rstrip("/").split("/"):
                    raise AutomationError("Public verification redirected to another origin.")
                actual = hashlib.sha256(response.read(16 * 1024 * 1024)).hexdigest()
        except (OSError, ValueError):
            raise AutomationError("Public resource verification failed; publication is not confirmed.") from None
        if actual != expected:
            raise AutomationError("Public resource differs from the reviewed release.")
    receipt.update({"status": "published", "commit": commit})
    write_json(work / "automation.json", receipt)
    return {"status": "published", "releaseDate": release, "lessonId": lesson_id, "commit": commit}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "review-hashes", "preflight", "verify-published"))
    parser.add_argument("--release", required=True)
    parser.add_argument("--snapshot", type=Path, help="Synthetic or already private snapshot; do not export production JSON")
    parser.add_argument("--commit")
    args = parser.parse_args()
    try:
        paths(REPO, args.release)
        with locked(REPO):
            if args.command == "prepare":
                result = prepare(REPO, args.release, args.snapshot)
            elif args.command == "review-hashes":
                result = reviewed_artifacts(REPO, args.release)
            elif args.command == "preflight":
                result = preflight(REPO, args.release)
            else:
                result = verify_published(REPO, args.release, args.commit or "")
        print(json.dumps(result))
        return 0
    except AutomationError as error:
        print(str(error), file=sys.stderr)
    except Exception:
        print("Weekly automation failed; inspect local inputs. No raw progress or credentials were logged.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
