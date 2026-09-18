"""Offline behavior checks for paid speech generation and resumable artifacts."""

import hashlib
import http.client
import importlib.util
import io
import json
from pathlib import Path
import subprocess
from types import SimpleNamespace
import urllib.error

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "learning-tasks/shared/nativecamp/build_openai_audio.py"
SPEC = importlib.util.spec_from_file_location("nativecamp_openai_audio", MODULE_PATH)
audio = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audio)
REAL_SPEECH_REQUEST = audio.speech_request


@pytest.fixture
def setup(tmp_path, monkeypatch):
    args = SimpleNamespace(lesson="weekly-2026-09-14", voice="cedar", jobs=tmp_path / "jobs.json",
        manifest=tmp_path / "manifest.json", audio_dir=tmp_path / "audio", limit=None, check=False)
    args.jobs.write_text(json.dumps([{"file": "first.mp3", "text": "There is one cat."},
                                     {"file": "second.mp3", "text": "There are two dogs."}]), "utf-8")
    monkeypatch.setenv("OPENAI_API_KEY", "test-secret-never-log")
    monkeypatch.setattr(audio.shutil, "which", lambda name: name)
    calls = []

    def request(body, path, key):
        calls.append(body)
        path.write_bytes(b"valid-audio-" + body["input"].encode())
        return {"requestId": "req_test", "usage": None}

    def inspect(path):
        data = path.read_bytes()
        if not data.startswith(b"valid-audio-"):
            raise audio.AudioBuildError("Invalid audio.")
        return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "durationSeconds": 2,
                "codec": "mp3", "rmsDbfs": -20, "decode": "passed", "nonSilent": True}

    monkeypatch.setattr(audio, "speech_request", request)
    monkeypatch.setattr(audio, "inspect_audio", inspect)
    return args, calls


def test_requests_are_normal_speed_and_unchanged_rerun_needs_no_key(setup, monkeypatch):
    args, calls = setup
    result = audio.build(args)
    assert result["generated"] == 2
    assert all(body["speed"] == 1.0 and body["voice"] == "cedar" for body in calls)
    assert all(body["model"] == "gpt-4o-mini-tts-2025-12-15" for body in calls)
    assert all(body["response_format"] == "mp3" for body in calls)
    assert "slow" not in calls[0]["instructions"].lower()
    assert "135" not in calls[0]["instructions"]
    previous = args.manifest.read_bytes()
    monkeypatch.delenv("OPENAI_API_KEY")
    result = audio.build(args)
    assert result["apiRequests"] == 0 and result["skipped"] == 2
    assert len(calls) == 2 and args.manifest.read_bytes() == previous
    assert b"test-secret-never-log" not in previous


def test_changed_text_voice_or_corrupted_file_rebuilds_only_affected_jobs(setup):
    args, calls = setup
    audio.build(args)
    jobs = json.loads(args.jobs.read_text())
    jobs[1]["text"] = "There are three dogs."
    args.jobs.write_text(json.dumps(jobs))
    assert audio.build(args)["generated"] == 1
    (args.audio_dir / "first.mp3").write_bytes(b"broken")
    assert audio.build(args)["generated"] == 1
    args.voice = "marin"
    assert audio.build(args)["generated"] == 2
    assert len(calls) == 6


def test_failure_preserves_existing_file_and_resume_skips_success(setup, monkeypatch):
    args, calls = setup
    args.audio_dir.mkdir()
    old = args.audio_dir / "second.mp3"
    old.write_bytes(b"previous-production-audio")
    request = audio.speech_request

    def fail_second(body, path, key):
        if body["input"] == "There are two dogs.":
            path.write_bytes(b"half-an-mp3")
            raise RuntimeError("Bearer test-secret-never-log")
        return request(body, path, key)

    monkeypatch.setattr(audio, "speech_request", fail_second)
    with pytest.raises(audio.AudioBuildError, match="no automatic retry"):
        audio.build(args)
    assert old.read_bytes() == b"previous-production-audio"
    state = args.manifest.read_text()
    assert "test-secret-never-log" not in state
    assert json.loads(state)["openaiGeneration"]["apiRequests"] == 2
    monkeypatch.setattr(audio, "speech_request", request)
    result = audio.build(args)
    assert result["generated"] == 1 and result["skipped"] == 1
    assert json.loads(args.manifest.read_text())["status"] == "complete"


def test_journaled_response_recovers_without_api(setup, monkeypatch):
    args, calls = setup
    args.limit = 1
    audio.build(args)
    target = args.audio_dir / "first.mp3"
    target.replace(args.audio_dir / ".first.mp3.part")
    result = audio.build(args)
    assert result["recovered"] == 1 and result["generated"] == 1
    assert len(calls) == 2
    monkeypatch.delenv("OPENAI_API_KEY")
    assert audio.build(args)["apiRequests"] == 0


def test_check_does_not_generate_write_or_recover(setup):
    args, calls = setup
    args.check = True
    with pytest.raises(audio.AudioBuildError, match="2 audio files"):
        audio.build(args)
    assert not args.manifest.exists() and not args.audio_dir.exists() and not calls
    args.check = False
    audio.build(args)
    previous = args.manifest.read_bytes()
    args.check = True
    assert audio.build(args)["verified"] == 2
    assert args.manifest.read_bytes() == previous and len(calls) == 2


@pytest.mark.parametrize("change", ["delete", "reorder", "format"])
def test_job_list_changes_are_checked_then_saved_without_regeneration(setup, monkeypatch, change):
    args, calls = setup
    audio.build(args)
    old_manifest = args.manifest.read_bytes()
    old_audio = {path.name: path.read_bytes() for path in args.audio_dir.iterdir()}
    jobs = json.loads(args.jobs.read_text())
    if change == "delete":
        jobs = jobs[:1]
    elif change == "reorder":
        jobs.reverse()
    args.jobs.write_text(json.dumps(jobs, indent=4))
    monkeypatch.delenv("OPENAI_API_KEY")
    args.check = True
    with pytest.raises(audio.AudioBuildError, match="ordered file list"):
        audio.build(args)
    assert args.manifest.read_bytes() == old_manifest and len(calls) == 2
    args.check = False
    summary = audio.build(args)
    assert summary["apiRequests"] == 0 and summary["skipped"] == len(jobs)
    new_manifest = json.loads(args.manifest.read_text())
    assert [row["file"] for row in new_manifest["tts"]] == ["audio/" + row["file"] for row in jobs]
    assert new_manifest["speechJobsSha256"] == hashlib.sha256(args.jobs.read_bytes()).hexdigest()
    assert new_manifest["openaiGeneration"]["apiRequests"] == 2
    assert {path.name: path.read_bytes() for path in args.audio_dir.iterdir()} == old_audio
    unchanged_manifest = args.manifest.read_bytes()
    assert audio.build(args)["apiRequests"] == 0
    assert args.manifest.read_bytes() == unchanged_manifest
    args.check = True
    assert audio.build(args)["verified"] == len(jobs)
    assert args.manifest.read_bytes() == unchanged_manifest and len(calls) == 2


def test_check_rejects_wrong_manifest_order_even_when_jobs_hash_matches(setup):
    args, calls = setup
    audio.build(args)
    manifest = json.loads(args.manifest.read_text())
    manifest["tts"].reverse()
    args.manifest.write_text(json.dumps(manifest))
    original = args.manifest.read_bytes()
    args.check = True
    with pytest.raises(audio.AudioBuildError, match="ordered file list"):
        audio.build(args)
    assert args.manifest.read_bytes() == original and len(calls) == 2


@pytest.mark.parametrize("invalid", [
    [{"file": "../escape.mp3", "text": "Hello."}],
    [{"file": "x.mp3", "text": "x" * 4097}],
    [{"file": "x.mp3", "text": "Hello."}] * 2,
    [{"file": "x.mp3", "text": " "}], [],
])
def test_invalid_inputs_fail_before_any_api_or_manifest_write(setup, invalid):
    args, calls = setup
    args.jobs.write_text(json.dumps(invalid))
    with pytest.raises(audio.AudioBuildError):
        audio.build(args)
    assert not calls and not args.manifest.exists()


def test_teacher_evidence_is_preserved(setup):
    args, _ = setup
    teacher = [{"id": "private-teacher", "sha256": "unchanged", "pack": "private/pack.json"}]
    args.manifest.write_text(json.dumps({"lessonId": args.lesson, "teacher": teacher, "tts": []}))
    audio.build(args)
    assert json.loads(args.manifest.read_text())["teacher"] == teacher


def test_http_failure_never_exposes_provider_body(tmp_path, monkeypatch):
    def denied(*args, **kwargs):
        raise urllib.error.HTTPError(audio.ENDPOINT, 403, "Bearer secret-value", {},
                                     io.BytesIO(b'{"message":"Bearer secret-value"}'))
    monkeypatch.setattr(audio.urllib.request, "urlopen", denied)
    with pytest.raises(audio.AudioBuildError) as error:
        audio.speech_request({"input": "Hello."}, tmp_path / "out.part", "secret-value")
    assert "HTTP 403" in str(error.value) and "secret-value" not in str(error.value)


def http_response(headers, payload):
    class Socket:
        def makefile(self, *args):
            return io.BytesIO(b"HTTP/1.1 200 OK\r\n" + headers + b"\r\n\r\n" + payload)
    response = http.client.HTTPResponse(Socket())
    response.begin()
    return response


@pytest.mark.parametrize("transfer", ["content-length", "chunked"])
def test_real_httpresponse_truncation_preserves_production_and_redacts_errors(setup, monkeypatch, capsys, transfer):
    args, _ = setup
    args.audio_dir.mkdir()
    target = args.audio_dir / "first.mp3"
    target.write_bytes(b"previous-production-audio")
    payload = b"valid-audio-body-secret"
    if transfer == "content-length":
        # This real HTTPResponse returns a short read and then normal EOF.
        headers = b"Content-Length: 62592\r\nX-Sensitive: header-secret"
        payload = payload + b"x" * (31296 - len(payload))
    else:
        # The incomplete chunk produces http.client.IncompleteRead.
        headers = b"Transfer-Encoding: chunked\r\nX-Sensitive: header-secret"
        payload = b"ffff\r\n" + payload
    monkeypatch.setattr(audio, "speech_request", REAL_SPEECH_REQUEST)
    monkeypatch.setattr(audio.urllib.request, "urlopen", lambda *a, **kw: http_response(headers, payload))
    with pytest.raises(audio.AudioBuildError) as error:
        audio.build(args)
    assert target.read_bytes() == b"previous-production-audio"
    manifest = args.manifest.read_text()
    assert json.loads(manifest)["openaiGeneration"]["successfulRequests"] == 0
    assert json.loads(manifest)["status"] == "incomplete"
    diagnostic = str(error.value) + manifest + capsys.readouterr().out
    for secret in ["body-secret", "header-secret", "test-secret-never-log"]:
        assert secret not in diagnostic


@pytest.mark.parametrize("has_length", [True, False])
def test_real_httpresponse_accepts_complete_body_with_optional_length(tmp_path, monkeypatch, has_length):
    payload = b"complete-audio-response"
    headers = b"x-request-id: req_complete"
    if has_length:
        headers += b"\r\nContent-Length: " + str(len(payload)).encode()
    monkeypatch.setattr(audio.urllib.request, "urlopen", lambda *a, **kw: http_response(headers, payload))
    target = tmp_path / "sample.part"
    receipt = REAL_SPEECH_REQUEST({"input": "Hello."}, target, "test-secret")
    assert target.read_bytes() == payload
    assert receipt["responseBytes"] == len(payload)
    assert receipt["contentLength"] == (len(payload) if has_length else None)


def test_real_decoder_rejects_silent_or_broken_mp3(tmp_path):
    if not audio.shutil.which("ffmpeg") or not audio.shutil.which("ffprobe"):
        pytest.skip("ffmpeg and ffprobe required")
    silent = tmp_path / "silent.mp3"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-v", "error", "-f", "lavfi", "-i",
                    "anullsrc=r=24000:cl=mono", "-t", "0.6", str(silent)], check=True)
    with pytest.raises(audio.AudioBuildError):
        audio.inspect_audio(silent)
    silent.write_bytes(b"not-an-mp3")
    with pytest.raises(audio.AudioBuildError):
        audio.inspect_audio(silent)
