"""親錄音檔量測與唯讀審計：uv run python scripts/zhuyin_audio.py audit。

共用量測沿用 MBP 音檔交付工具；不含未採用的 TTS 生成流程。
"""

import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs-dev/zhuyin-parent-audio"
CONTENT = ROOT / "docs/zhuyin/content.json"
RECIPE = BASE / "recipe.json"
RATE = 44100


def run(args):
    return subprocess.run(args, check=True, capture_output=True).stdout


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def pcm(path):
    data = array.array("f")
    data.frombytes(run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1",
                        "-ar", str(RATE), "-f", "f32le", "-"]))
    if sys.byteorder != "little":
        data.byteswap()
    return data


def db(value):
    return round(20 * math.log10(max(value, 1e-10)), 2)


def metrics(samples):
    peak = max(map(abs, samples), default=0)
    window = round(RATE * 0.005)
    active = []
    for i in range(0, len(samples), window):
        frame = samples[i:i + window]
        rms = math.sqrt(sum(x * x for x in frame) / len(frame))
        if db(rms) > -45:
            active.append((i, len(frame), rms))
    return {
        "durationSeconds": round(len(samples) / RATE, 4),
        "peakDbfs": db(peak),
        "rmsDbfs": db(math.sqrt(sum(x * x for x in samples) / max(1, len(samples)))),
        "activeSeconds": round(sum(n for _, n, _ in active) / RATE, 4),
        "leadingSilenceSeconds": round(active[0][0] / RATE, 4) if active else None,
        "trailingSilenceSeconds": round((len(samples) - active[-1][0] - active[-1][1]) / RATE, 4) if active else None,
        "clippedSamples": sum(abs(x) >= 0.999 for x in samples),
    }


def audit(recipe, audio_dir):
    content = read(CONTENT)
    keys = [s["audio"] for s in content["symbols"]]
    for syllable in content["syllables"]:
        keys.append(syllable["audio"])
        if "word" in syllable:
            keys.append(syllable["word"]["audio"])
    expected = {f"{k}.m4a" for k in keys}
    actual = {p.name for p in audio_dir.iterdir() if not p.name.startswith(".")} if audio_dir.exists() else set()
    errors = []
    missing, orphans = sorted(expected - actual), sorted(actual - expected)
    if missing:
        errors.append(f"缺檔：{missing}")
    if orphans:
        errors.append(f"孤兒檔：{orphans}")
    if keys != [i["key"] for i in recipe["items"]]:
        errors.append("recipe key 順序／覆蓋與 content.json 不符")
    report = {"scope": str(audio_dir.relative_to(ROOT)) if audio_dir.is_relative_to(ROOT) else "external-check",
              "pronunciationReviewed": False, "iPadVerified": False,
              "threshold": "5 ms RMS > -45 dBFS 視為有聲；僅驗訊號，不驗發音。",
              "missing": missing, "orphans": orphans, "items": [], "errors": errors}
    for key in keys:
        path = audio_dir / f"{key}.m4a"
        if not path.is_file():
            continue
        try:
            info = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)]))
            streams = info["streams"]
            stream = streams[0]
            if len(streams) != 1 or stream.get("codec_name") != "aac" or stream.get("profile") != "LC" or stream.get("channels") != 1 or stream.get("sample_rate") != str(RATE) or "mp4" not in info["format"]["format_name"]:
                errors.append(f"{key}：應為 M4A / AAC-LC / mono / 44100 Hz")
            result = metrics(pcm(path))
            report["items"].append({"key": key, "sha256": sha(path), **result})
            if not 0.18 <= result["durationSeconds"] <= 3:
                errors.append(f"{key}：時長超界")
            if result["activeSeconds"] < (0.01 if key == "sym-b" else 0.025):
                errors.append(f"{key}：無足夠有聲訊號")
            if not -15 <= result["peakDbfs"] <= -1 or result["clippedSamples"]:
                errors.append(f"{key}：峰值過小／過大或削波")
            if result["rmsDbfs"] < -38:
                errors.append(f"{key}：平均音量過低")
            if result["leadingSilenceSeconds"] is None or result["leadingSilenceSeconds"] > 0.3 or result["trailingSilenceSeconds"] > 0.4:
                errors.append(f"{key}：頭尾靜音過長／全靜音")
        except (subprocess.CalledProcessError, ValueError, KeyError, IndexError) as exc:
            errors.append(f"{key}：解碼／格式檢查失敗（{type(exc).__name__}）")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["audit"])
    parser.add_argument("--audio-dir", type=Path, default=ROOT / "docs/zhuyin/assets/audio", help="audit 可指定正式或暫存音檔目錄（唯讀）")
    args = parser.parse_args()
    try:
        recipe = read(RECIPE)
        return audit(recipe, args.audio_dir.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"音檔作業失敗：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
