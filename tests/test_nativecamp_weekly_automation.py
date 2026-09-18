"""Offline external-operation, privacy, publication, and recovery checks."""

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
import subprocess
from types import SimpleNamespace

import pytest

MODULE = Path(__file__).resolve().parents[1] / "learning-tasks/shared/nativecamp/weekly_automation.py"
SPEC = importlib.util.spec_from_file_location("weekly_automation", MODULE)
automation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(automation)
REAL_RUN = automation.run
REAL_PUBLICATION_DIGEST = automation.publication_digest
RELEASE = "2026-09-27"
LESSON = "weekly-" + RELEASE


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


@pytest.fixture
def repo(tmp_path):
    save(tmp_path / "docs/nativecamp/lessons/catalog.json", {"lessons": [
        {"id": "weekly-2026-09-14", "kind": "weekly", "date": "2026-09-20"}]})
    save(tmp_path / "docs/nativecamp/lessons/weekly-2026-09-14.json", {"concepts": []})
    return tmp_path


def test_capture_is_one_fixed_read_and_never_forwards_raw_diagnostics(repo, monkeypatch, capsys):
    calls = []
    monkeypatch.setattr(automation.shutil, "which", lambda tool: tool)

    def fake(command, **kwargs):
        calls.append((command, kwargs))
        return SimpleNamespace(returncode=0, stdout=b'{"private":"synthetic-answer"}')

    monkeypatch.setattr(automation.subprocess, "run", fake)
    assert b"synthetic-answer" in automation.capture_progress(repo)
    command, options = calls[0]
    assert command[1:7] == ["--no-install", "wrangler@4.132.0", "kv", "key", "get", "p:aiden:nativecamp"]
    assert command[8] == automation.NAMESPACE and "--remote" in command
    assert options["capture_output"] is True and options["check"] is False
    assert options["env"]["WRANGLER_WRITE_LOGS"] == "false"
    assert options["env"]["WRANGLER_LOG_SANITIZE"] == "true"
    assert options["env"]["WRANGLER_SEND_METRICS"] == "false"
    assert "OPENAI_API_KEY" not in options["env"]
    assert not capsys.readouterr().out
    monkeypatch.setattr(automation.subprocess, "run", lambda *a, **k: SimpleNamespace(
        returncode=1, stdout=b"raw-secret", stderr=b"Bearer raw-secret"))
    with pytest.raises(automation.AutomationError) as error:
        automation.capture_progress(repo)
    assert "raw-secret" not in str(error.value)


@pytest.mark.parametrize("raw", [b"", b" " * 2, b"x" * (automation.MAX_PROGRESS + 1)],
                         ids=["empty", "blank", "oversized"])
def test_capture_failure_or_oversized_payload_is_not_empty_week(repo, monkeypatch, raw):
    monkeypatch.setattr(automation.shutil, "which", lambda tool: tool)
    monkeypatch.setattr(automation, "run", lambda *a, **kw: raw)
    with pytest.raises(automation.AutomationError):
        automation.capture_progress(repo)


def test_prepare_skips_reserved_first_week_before_cloud_access(repo, monkeypatch):
    monkeypatch.setattr(automation, "capture_progress", lambda *a: pytest.fail("cloud must not be read"))
    assert automation.prepare(repo, "2026-09-20")["reason"] == "already-published"


def test_prepare_feeds_captured_json_to_planner_and_whitelists_summary(repo, monkeypatch):
    raw = b'{"private":"synthetic-answer"}'
    monkeypatch.setattr(automation, "capture_progress", lambda *a: raw)

    def planner(command, root, *, input_data):
        assert root == repo and input_data == raw and "--stdin" in command
        return json.dumps({"status": "planned", "releaseDate": RELEASE, "private": "synthetic-answer"}).encode()

    monkeypatch.setattr(automation, "run", planner)
    result = automation.prepare(repo, RELEASE)
    assert result == {"status": "planned", "releaseDate": RELEASE, "lessonId": LESSON}
    assert b"synthetic-answer" not in (repo / automation.PRIVATE / RELEASE / "automation.json").read_bytes()


def test_saved_plan_restores_missing_brief_without_reading_new_progress_or_erasing_ready_receipt(repo, monkeypatch):
    path = repo / automation.PRIVATE / RELEASE / "plan.json"
    save(path, {"releaseDate": RELEASE, "lessonId": LESSON, "child": "aiden"})
    receipt = path.with_name("automation.json")
    save(receipt, {"status": "ready", "existing": "frozen hashes"})
    previous_receipt = receipt.read_bytes()
    previous = path.read_bytes()
    monkeypatch.setattr(automation, "capture_progress", lambda *a: pytest.fail("must resume frozen snapshot"))

    def resume(command, root, **kwargs):
        assert command == ["node", str(automation.TOOLS / "plan_weekly.mjs"), "--resume", "--release", RELEASE]
        assert not kwargs and root == repo
        save(path.with_name("generation-brief.json"), {"restored": True})
        return json.dumps({"status": "resumed", "releaseDate": RELEASE}).encode()

    monkeypatch.setattr(automation, "run", resume)
    assert automation.prepare(repo, RELEASE)["status"] == "resumed"
    assert path.read_bytes() == previous
    assert path.with_name("generation-brief.json").exists()
    assert receipt.read_bytes() == previous_receipt


def test_saved_plan_validation_failure_is_not_reported_as_resumed(repo, monkeypatch):
    path = repo / automation.PRIVATE / RELEASE / "plan.json"
    save(path, {"releaseDate": RELEASE, "lessonId": LESSON, "child": "aiden"})
    monkeypatch.setattr(automation, "capture_progress", lambda *a: pytest.fail("must not recapture"))

    def invalid(*args, **kwargs):
        raise automation.AutomationError("Saved planner state is invalid.")

    monkeypatch.setattr(automation, "run", invalid)
    with pytest.raises(automation.AutomationError, match="invalid"):
        automation.prepare(repo, RELEASE)


def test_prepare_real_planner_restores_brief_with_local_draft_and_checks_saved_progress(tmp_path, monkeypatch):
    original = MODULE.parents[3]
    for relative in ["docs/nativecamp/core.js", "docs/nativecamp/catalog.js",
                     "docs/nativecamp/lessons/2026-09-13.json", str(automation.TOOLS / "plan_weekly.mjs")]:
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original / relative, target)
    lesson = automation.read_json(tmp_path / "docs/nativecamp/lessons/2026-09-13.json")
    catalog = {"schemaVersion": 1, "lessons": [{"id": lesson["id"], "date": lesson["date"], "teacher": "Teacher"}]}
    save(tmp_path / "docs/nativecamp/lessons/catalog.json", catalog)
    raw = REAL_RUN(["node", "--input-type=module", "-e",
        "import fs from 'node:fs'; import './docs/nativecamp/core.js'; "
        "const c=NativeCampCore, lesson=JSON.parse(fs.readFileSync('docs/nativecamp/lessons/2026-09-13.json')); "
        "let p=c.createProgress(); const concept=lesson.concepts[0]; "
        "const q=c.nextQuestion(p,lesson,'try','2026-09-21',concept.id).question; "
        "p=c.submitTry(p,lesson,'2026-09-21',concept.id,q.id,q.type==='order'?q.acceptedOrders[0]:q.answer).progress; "
        "process.stdout.write(JSON.stringify(p));"], tmp_path)
    snapshot = tmp_path / automation.PRIVATE / "synthetic.json"
    snapshot.parent.mkdir(parents=True)
    snapshot.write_bytes(raw)
    assert automation.prepare(tmp_path, RELEASE, snapshot)["status"] == "planned"
    work = snapshot.parent / RELEASE
    brief = automation.read_json(work / "generation-brief.json")
    plan_bytes = (work / "plan.json").read_bytes()
    draft = dict(brief["bundle"], concepts=[dict(row["originalConcept"], id=row["id"], sourceConcept=row["sourceConcept"])
                                           for row in brief["concepts"]])
    save(tmp_path / f"docs/nativecamp/lessons/{LESSON}.json", draft)
    catalog["lessons"].append({key: draft[key] for key in ("id", "date", "kind", "weekly")})
    save(tmp_path / "docs/nativecamp/lessons/catalog.json", catalog)
    (work / "generation-brief.json").unlink()
    save(work / "automation.json", {"status": "ready", "keep": "receipt"})
    monkeypatch.setattr(automation, "capture_progress", lambda *a: pytest.fail("resume must not fetch cloud"))
    assert automation.prepare(tmp_path, RELEASE)["status"] == "resumed"
    assert automation.read_json(work / "generation-brief.json") == brief
    assert (work / "plan.json").read_bytes() == plan_bytes
    assert automation.read_json(work / "automation.json")["status"] == "ready"
    save(work / "progress.json", {"schemaVersion": 2, "lessons": {}, "weekly": {}})
    with pytest.raises(automation.AutomationError):
        automation.prepare(tmp_path, RELEASE)


def test_lock_rejects_parallel_or_stale_owner_and_retains_the_other_lock(repo):
    with automation.locked(repo):
        with pytest.raises(automation.AutomationError, match="locked"):
            with automation.locked(repo):
                pytest.fail("second process entered")
        assert (repo / automation.PRIVATE / "automation.lock").exists()
    assert not (repo / automation.PRIVATE / "automation.lock").exists()


def test_snapshot_cannot_leave_private_directory(repo):
    snapshot = repo / "public.json"
    save(snapshot, {})
    with pytest.raises(automation.AutomationError, match="ignored"):
        automation.prepare(repo, RELEASE, snapshot)


def test_public_order_follows_brief_instead_of_private_rank_and_rejects_leaks(repo):
    first = {"lessonId": "2026-09-13", "conceptId": "first", "date": "2026-09-13"}
    second = {"lessonId": "2026-09-13", "conceptId": "second", "date": "2026-09-13"}
    lesson = {"id": LESSON, "concepts": [
        {"sourceConcept": first, "try": [], "say": []}, {"sourceConcept": second, "try": [], "say": []}]}
    plan = {"concepts": [{"sourceConcept": second}, {"sourceConcept": first}]}
    brief = {"concepts": [{"sourceConcept": first}, {"sourceConcept": second}]}
    automation.validate_public_content(repo, lesson, plan, brief)
    lesson["concepts"].reverse()
    with pytest.raises(automation.AutomationError, match="public brief order"):
        automation.validate_public_content(repo, lesson, plan, brief)
    lesson["concepts"].reverse()
    lesson["concepts"][0]["needsPractice"] = True
    with pytest.raises(automation.AutomationError, match="private progress"):
        automation.validate_public_content(repo, lesson, plan, brief)


def test_relabeling_an_old_question_does_not_pass_as_new_content(repo):
    origin = {"lessonId": "2026-09-13", "conceptId": "first", "date": "2026-09-13"}
    question = {"prompt": "What is it?", "scene": {"cat": 1}, "answerText": "It is a cat."}
    old = {"concepts": [{"try": [dict(question, id="old")], "say": []}]}
    save(repo / "docs/nativecamp/lessons/weekly-2026-09-14.json", old)
    lesson = {"id": LESSON, "concepts": [{"sourceConcept": origin, "try": [dict(question, id="new")], "say": []}]}
    plan = {"concepts": [{"sourceConcept": origin}]}
    with pytest.raises(automation.AutomationError, match="repeat"):
        automation.validate_public_content(repo, lesson, plan, plan)


@pytest.fixture
def release(repo, monkeypatch):
    work = repo / automation.PRIVATE / RELEASE
    source = repo / f"learning-tasks/nativecamp-{LESSON}/source"
    origin = {"lessonId": "2026-09-13", "conceptId": "colors", "date": "2026-09-13"}
    save(work / "plan.json", {"releaseDate": RELEASE, "lessonId": LESSON, "concepts": [{"sourceConcept": origin}]})
    save(work / "generation-brief.json", {"concepts": [{"sourceConcept": origin}]})
    weekly = {"schemaVersion": 2, "practiceStart": "2026-09-20", "practiceEnd": RELEASE,
              "opensOn": RELEASE, "conceptCount": 1}
    lesson = {"id": LESSON, "date": RELEASE, "kind": "weekly", "weekly": weekly, "concepts": [{"sourceConcept": origin,
              "try": [{"prompt": "What is it?", "scene": {"type": "cat"}, "answerText": "It is a cat."}], "say": []}]}
    save(source / "lesson-source.json", lesson)
    save(source / "speech-jobs.json", [{"file": "one.mp3", "text": "A cat."}])
    audio_hash = hashlib.sha256(b"complete-audio").hexdigest()
    save(source / "nativecamp-audio-manifest.json", {"voice": {"name": "cedar"}, "tts": [
        {"file": "audio/one.mp3", "sha256": audio_hash}]})
    save(source / "nativecamp-tts-asr.json", {"lessonId": LESSON, "samples": [
        {"file": "audio/one.mp3", "sha256": audio_hash, "recognizedText": "A cat."}]})
    save(repo / f"docs/nativecamp/lessons/{LESSON}.json", lesson)
    save(work / "review.json", {"releaseDate": RELEASE, "status": "passed", "reviewer": "independent-test-agent",
         "checks": dict.fromkeys(("originalQuestions", "completeAnswers", "naturalAlternatives", "sourceMapping",
                                  "noPrivateData", "asrWords", "independentReview"), True),
         "artifacts": automation.reviewed_artifacts(repo, RELEASE)})
    commands = []
    catalog_path = repo / "docs/nativecamp/lessons/catalog.json"
    baseline_catalog = catalog_path.read_bytes()
    catalog = automation.read_json(catalog_path)
    catalog["lessons"].append({"id": LESSON, "date": RELEASE, "kind": "weekly", "weekly": weekly})
    save(catalog_path, catalog)

    def fake_run(command, root, **kwargs):
        commands.append(command)
        if command[:2] == ["git", "show"]:
            return baseline_catalog
        return b"safe-summary"

    monkeypatch.setattr(automation, "run", fake_run)
    monkeypatch.setattr(automation, "publication_digest", lambda root, relative:
                        hashlib.sha256((root / relative).read_bytes().replace(b"\r\n", b"\n")).hexdigest())
    return repo, work, source, commands


def test_preflight_binds_review_to_exact_artifacts_and_uses_all_verifiers(release):
    repo, work, source, commands = release
    assert automation.preflight(repo, RELEASE)["status"] == "ready"
    assert any("build_lesson.py" in " ".join(command) and "--check" in command for command in commands)
    assert any("build_openai_audio.py" in " ".join(command) and "--request-journal" in command for command in commands)
    assert any(command[0] == "node" for command in commands)
    assert commands[0] == ["git", "show", "origin/master:docs/nativecamp/lessons/catalog.json"]
    assert not any("HEAD:" in part for command in commands for part in command)
    (source / "lesson-source.json").write_text('{"changed":true}')
    with pytest.raises(automation.AutomationError, match="stale"):
        automation.preflight(repo, RELEASE)


def test_preflight_resumes_identical_prior_merge_without_republishing(release, monkeypatch):
    repo, work, source, commands = release
    catalog_path = repo / "docs/nativecamp/lessons/catalog.json"

    def already_merged(command, *args, **kwargs):
        if command[:2] == ["git", "show"]:
            path = command[2].removeprefix("origin/master:")
            if path == "docs/nativecamp/audio/one.mp3":
                return b"complete-audio"
            return (repo / path).read_bytes()
        return b"safe-summary"

    monkeypatch.setattr(automation, "run", already_merged)
    summary = automation.preflight(repo, RELEASE)
    assert summary["status"] == "ready" and summary["alreadyIntegrated"] is True
    assert automation.read_json(work / "automation.json")["status"] == "ready"


def test_half_audio_failure_never_marks_release_ready(release, monkeypatch):
    repo, work, source, commands = release
    previous = automation.run

    def incomplete(command, *args, **kwargs):
        if any("build_openai_audio.py" in part for part in command):
            raise automation.AutomationError("Incomplete audio.")
        return previous(command, *args, **kwargs)

    monkeypatch.setattr(automation, "run", incomplete)
    with pytest.raises(automation.AutomationError, match="Incomplete"):
        automation.preflight(repo, RELEASE)
    assert not (work / "automation.json").exists()


@pytest.mark.parametrize("change", ["missing", "duplicate", "wrong-id", "wrong-metadata"])
def test_preflight_requires_exactly_one_matching_catalog_release(release, change):
    repo, work, source, commands = release
    path = repo / "docs/nativecamp/lessons/catalog.json"
    catalog = automation.read_json(path)
    entry = catalog["lessons"][-1]
    if change == "missing":
        catalog["lessons"].pop()
    elif change == "duplicate":
        catalog["lessons"].append(dict(entry, id="another-weekly"))
    elif change == "wrong-id":
        entry["id"] = "different-weekly"
    else:
        entry["weekly"]["conceptCount"] = 2
    save(path, catalog)
    with pytest.raises(automation.AutomationError, match="exactly one matching"):
        automation.preflight(repo, RELEASE)
    assert not (work / "automation.json").exists()


def test_crlf_worktree_publishes_git_lf_json_and_exact_binary_audio(release, monkeypatch):
    repo, work, source, commands = release
    previous_run = automation.run

    def git(*args):
        return REAL_RUN(["git", *args], repo)

    git("init", "-q")
    git("config", "core.autocrlf", "true")
    git("config", "user.name", "Offline test")
    git("config", "user.email", "offline@example.invalid")
    catalog_path = repo / "docs/nativecamp/lessons/catalog.json"
    catalog = automation.read_json(catalog_path)
    save(catalog_path, {"lessons": catalog["lessons"][:-1]})
    git("add", "docs/nativecamp/lessons/catalog.json", "docs/nativecamp/lessons/weekly-2026-09-14.json")
    git("commit", "-qm", "test: existing catalog")
    git("update-ref", "refs/remotes/origin/master", "HEAD")
    catalog_path.write_bytes((json.dumps(catalog, indent=2) + "\n").replace("\n", "\r\n").encode())
    lesson_path = repo / f"docs/nativecamp/lessons/{LESSON}.json"
    lesson_path.write_bytes((json.dumps(automation.read_json(lesson_path), indent=2) + "\n").replace("\n", "\r\n").encode())
    audio_path = repo / "docs/nativecamp/audio/one.mp3"
    audio_path.parent.mkdir(parents=True)
    audio_path.write_bytes(b"binary\x00\r\nmp3")
    audio_hash = hashlib.sha256(audio_path.read_bytes()).hexdigest()
    for name, section in [("nativecamp-audio-manifest.json", "tts"), ("nativecamp-tts-asr.json", "samples")]:
        content = automation.read_json(source / name)
        content[section][0]["sha256"] = audio_hash
        save(source / name, content)
    review = automation.read_json(work / "review.json")
    review["artifacts"] = automation.reviewed_artifacts(repo, RELEASE)
    save(work / "review.json", review)
    monkeypatch.setattr(automation, "publication_digest", REAL_PUBLICATION_DIGEST)
    monkeypatch.setattr(automation, "run", lambda command, *a, **kw:
                        REAL_RUN(command, *a, **kw) if command[0] == "git" else previous_run(command, *a, **kw))
    assert automation.preflight(repo, RELEASE)["alreadyIntegrated"] is False
    receipt = automation.read_json(work / "automation.json")
    for relative in ("nativecamp/lessons/catalog.json", f"nativecamp/lessons/{LESSON}.json"):
        raw = (repo / "docs" / relative).read_bytes()
        assert b"\r\n" in raw
        assert receipt["public"][relative] == hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()
        assert receipt["public"][relative] != hashlib.sha256(raw).hexdigest()
    assert receipt["public"]["nativecamp/audio/one.mp3"] == audio_hash
    git("add", "docs")
    git("commit", "-qm", "test: new weekly release")
    commit = git("rev-parse", "HEAD").decode().strip()
    git("update-ref", "refs/remotes/origin/master", "HEAD")
    assert automation.preflight(repo, RELEASE)["alreadyIntegrated"] is True

    def fetch(url, **kwargs):
        relative = url.removeprefix(automation.ORIGIN)
        response = io.BytesIO(git("show", f"{commit}:docs/{relative}"))
        response.url = url
        return response

    monkeypatch.setattr(automation.urllib.request, "urlopen", fetch)
    assert automation.verify_published(repo, RELEASE, commit)["status"] == "published"


@pytest.mark.parametrize("change", ["asr", "source", "review", "already-published"])
def test_preflight_rejects_mismatched_or_unreviewed_release(release, monkeypatch, change):
    repo, work, source, commands = release
    if change == "asr":
        asr = automation.read_json(source / "nativecamp-tts-asr.json")
        asr["samples"][0]["sha256"] = "old-audio"
        save(source / "nativecamp-tts-asr.json", asr)
        review = automation.read_json(work / "review.json")
        review["artifacts"] = automation.reviewed_artifacts(repo, RELEASE)
        save(work / "review.json", review)
    elif change == "source":
        plan = automation.read_json(work / "plan.json")
        plan["concepts"][0]["sourceConcept"]["conceptId"] = "unpracticed"
        save(work / "plan.json", plan)
    elif change == "review":
        (work / "review.json").unlink()
    else:
        monkeypatch.setattr(automation, "run", lambda *a, **kw: json.dumps({"lessons": [
            {"kind": "weekly", "date": RELEASE}]}).encode())
    with pytest.raises(automation.AutomationError):
        automation.preflight(repo, RELEASE)
    assert not (work / "automation.json").exists()


def test_publication_requires_actual_commit_and_every_remote_hash(release, monkeypatch):
    repo, work, source, commands = release
    automation.preflight(repo, RELEASE)
    remote = {"nativecamp/lessons/catalog.json": (repo / "docs/nativecamp/lessons/catalog.json").read_bytes(),
              f"nativecamp/lessons/{LESSON}.json": (repo / f"docs/nativecamp/lessons/{LESSON}.json").read_bytes(),
              "nativecamp/audio/one.mp3": b"complete-audio"}
    monkeypatch.setattr(automation, "run", lambda command, *a, **kw: remote[command[2].split(":docs/", 1)[1]])

    def fetch(url, **kwargs):
        response = io.BytesIO(remote[url.removeprefix(automation.ORIGIN)])
        response.url = url
        return response

    monkeypatch.setattr(automation.urllib.request, "urlopen", fetch)
    assert automation.verify_published(repo, RELEASE, "a" * 40)["status"] == "published"
    assert automation.read_json(work / "automation.json")["commit"] == "a" * 40
    remote["nativecamp/audio/one.mp3"] = b"wrong-audio"
    with pytest.raises(automation.AutomationError, match="commit differs"):
        automation.verify_published(repo, RELEASE, "a" * 40)


def test_subprocess_timeout_never_includes_stdout_or_secret(repo, monkeypatch):
    def timeout(*a, **kw):
        raise subprocess.TimeoutExpired("secret-command", 1, output=b"private-answer", stderr=b"Bearer secret")
    monkeypatch.setattr(automation.subprocess, "run", timeout)
    with pytest.raises(automation.AutomationError) as error:
        automation.run(["anything"], repo)
    assert "secret" not in str(error.value) and "private-answer" not in str(error.value)
