"""Windows credential lifecycle with fake secrets only; no provider or vault calls."""
import json
import os
from pathlib import Path
import shutil
import subprocess

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / 'learning-tasks/shared/nativecamp/openai_credential.ps1'
pytestmark = pytest.mark.skipif(os.name != 'nt' or not shutil.which('pwsh'), reason='Windows DPAPI / PowerShell 7 only')


def call(directory, action, secret=None, *extra):
    env = dict(os.environ)
    env.pop('OPENAI_API_KEY', None)
    if secret is not None:
        env['OPENAI_API_KEY'] = secret
    result = subprocess.run(['pwsh', '-NoProfile', '-NonInteractive', '-File', str(SCRIPT),
                             '-Action', action, '-StoreDirectory', str(directory), *extra],
                            env=env, capture_output=True, text=True, timeout=30)
    if secret:
        assert secret not in result.stdout + result.stderr
    return result


def test_fake_secret_encrypt_decrypt_replace_remove(tmp_path):
    store = tmp_path / 'private'
    assert call(store, 'status').returncode == 2
    secret = 'dummy-nativecamp-secret-first'
    assert call(store, 'install', secret).returncode == 0
    encrypted = (store / 'openai.dpapi').read_text()
    assert secret not in encrypted
    result = call(store, 'status')
    assert result.returncode == 0
    assert json.loads(result.stdout)['status'] == 'ready'
    # Verify decryptability and ACL independently without writing the plaintext.
    probe = subprocess.run(['pwsh', '-NoProfile', '-NonInteractive', '-Command',
        "$s=ConvertTo-SecureString ([IO.File]::ReadAllText($env:TEST_FILE)); "
        "$ok=(ConvertFrom-SecureString $s -AsPlainText) -ceq $env:TEST_EXPECTED; "
        "$a=Get-Acl -LiteralPath $env:TEST_FILE; "
        "$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; "
        "$rules=@($a.Access | Where-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid }); "
        "if(-not $ok -or -not $a.AreAccessRulesProtected -or $rules.Count){exit 1}"],
        env={**os.environ, 'TEST_FILE': str(store / 'openai.dpapi'), 'TEST_EXPECTED': secret},
        capture_output=True, text=True, timeout=30)
    assert probe.returncode == 0
    assert secret not in probe.stdout + probe.stderr
    assert call(store, 'install', 'dummy-nativecamp-secret-second').returncode == 0
    assert (store / 'openai.dpapi').read_text() != encrypted
    assert call(store, 'status').returncode == 0
    assert call(store, 'remove').returncode == 0
    assert not (store / 'openai.dpapi').exists()
    assert call(store, 'status').returncode == 2
    assert call(store, 'remove').returncode == 0


def test_missing_reference_corrupt_and_invalid_arguments_fail_safely(tmp_path):
    assert call(tmp_path, 'install').returncode == 1
    assert call(tmp_path, 'install', 'op://Developer/fake/credential').returncode == 1
    assert not (tmp_path / 'openai.dpapi').exists()
    (tmp_path / 'openai.dpapi').write_text('dummy-corrupt-never-log')
    result = call(tmp_path, 'status')
    assert result.returncode == 1
    assert 'dummy-corrupt-never-log' not in result.stdout + result.stderr
    assert call(tmp_path, 'install', 'dummy-good').returncode == 0
    assert call(tmp_path, 'run').returncode == 1


def test_run_injects_only_into_fixed_audio_command_and_propagates_failure(tmp_path, monkeypatch):
    store = tmp_path / 'store'
    secret = 'dummy-audio-child-only'
    assert call(store, 'install', secret).returncode == 0
    bin_dir = tmp_path / 'bin'
    bin_dir.mkdir()
    (bin_dir / 'uv.ps1').write_text(
        "if ($env:OPENAI_API_KEY -cne 'dummy-audio-child-only') { exit 19 }; "
        "[IO.File]::WriteAllText($env:TEST_ARGS, (ConvertTo-Json -InputObject @($args))); exit 7",
        encoding='utf-8')
    output = tmp_path / 'args.json'
    monkeypatch.setenv('PATH', str(bin_dir) + os.pathsep + os.environ['PATH'])
    monkeypatch.setenv('TEST_ARGS', str(output))
    result = call(store, 'run', None, '-Lesson', 'weekly-2026-09-27', '-Jobs', 'jobs.json',
                  '-Manifest', 'manifest.json', '-RequestJournal', 'requests.json')
    assert result.returncode == 7
    assert secret not in result.stdout + result.stderr
    args = json.loads(output.read_text())
    assert args[:3] == ['run', '--python', '3.13']
    assert Path(args[3]).name == 'build_openai_audio.py'
    assert args[-2:] == ['--request-journal', 'requests.json']
