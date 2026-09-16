"""隔離的 #20 音檔候選：uv run python scripts/zhuyin_audio.py build|audit|synthesize.

只寫 docs-dev/zhuyin-audio-candidates；不接觸正式音檔、設定或進度。
build 使用已保存的 PCM source，synthesize 才重新呼叫 Mac say。
"""

import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs-dev/zhuyin-audio-candidates"
CONTENT = ROOT / "docs/zhuyin/content.json"
RECIPE = BASE / "recipe.json"
RATE = 44100
LEAD = 0.08
TAIL = 0.15


def run(args):
    return subprocess.run(args, check=True, capture_output=True).stdout


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def read(path):
    return json.loads(path.read_text())


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


def synthesize(recipe):
    """明確 opt-in：重新合成會因 macOS/voice 版本改變，裁切點需重查。"""
    versions = {
        "macOS": run(["sw_vers", "-productVersion"]).decode().strip(),
        "macOSBuild": run(["sw_vers", "-buildVersion"]).decode().strip(),
        "engine": "/usr/bin/say", "voice": recipe["voice"],
        "locale": recipe["locale"], "rate": recipe["rate"],
        "note": "機器合成，非家長錄音。單字實測 -r 110 與 150 長度相同；沒有額外伸縮或改調。",
        "sources": {},
    }
    (BASE / "source").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="zhuyin-say-") as temp:
        for name, text in recipe["sources"].items():
            raw = Path(temp) / f"{name}.aiff"
            dest = BASE / "source" / f"{name}.wav"
            run(["say", "-v", recipe["voice"], "-r", str(recipe["rate"]), "-o", str(raw), text])
            run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-map_metadata", "-1",
                 "-c:a", "pcm_s16le", str(dest)])
            versions["sources"][name] = {"text": text, "sha256": sha(dest)}
    save(BASE / "source-generation.json", versions)


def build(recipe):
    sources = read(BASE / "source-generation.json")["sources"]
    for name, text in recipe["sources"].items():
        if sources.get(name) != {"text": text, "sha256": sha(BASE / "source" / f"{name}.wav")}:
            raise ValueError(f"source 與生成紀錄不符：{name}；先確認來源，勿沿用舊裁切點")
    report = {
        "status": recipe["status"], "contentSha256": sha(CONTENT), "recipeSha256": sha(RECIPE),
        "scriptSha256": sha(Path(__file__)),
        "ffmpeg": run(["ffmpeg", "-version"]).decode().splitlines()[0],
        "encoding": {"codec": "AAC-LC", "sampleRate": RATE, "channels": 1, "bitrate": 96000},
        "processing": {"targetPeakDbfs": -6, "leadingPadSeconds": LEAD, "trailingPadSeconds": TAIL,
                       "note": "保留原音高與時長；符號裁切末端淡出 2 ms，其餘 6 ms；不消除聲母、不產生假音。"},
        "items": [],
    }
    (BASE / "audio").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="zhuyin-build-") as temp:
        for item in recipe["items"]:
            source = BASE / "source" / f'{item["source"]}.wav'
            samples = pcm(source)
            start = item.get("start", 0)
            end = item.get("end", len(samples) / RATE)
            segment = samples[round(start * RATE):round(end * RATE)]
            peak = max(map(abs, segment), default=0)
            if peak <= 0.0001:
                raise ValueError(f'{item["key"]} source 近乎靜音，拒絕製作')
            gain = 10 ** (-6 / 20) / peak
            fade = round(RATE * (0.002 if "end" in item else 0.006))
            segment = array.array("f", (x * gain * min(1, (len(segment) - 1 - i) / fade)
                                       for i, x in enumerate(segment)))
            padded = array.array("f", [0] * round(LEAD * RATE))
            padded.extend(segment)
            padded.extend([0] * round(TAIL * RATE))
            if sys.byteorder != "little":
                padded.byteswap()
            raw = Path(temp) / "processed.f32"
            raw.write_bytes(padded.tobytes())
            dest = BASE / "audio" / f'{item["key"]}.m4a'
            run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "1",
                 "-i", str(raw), "-map_metadata", "-1", "-c:a", "aac", "-profile:a", "aac_low",
                 "-b:a", "96k", "-movflags", "+faststart", str(dest)])
            report["items"].append({"key": item["key"], "source": str(source.relative_to(BASE)),
                                    "sourceSha256": sha(source), "startSeconds": start,
                                    "endSeconds": round(end, 6), "gainDb": db(gain),
                                    "file": str(dest.relative_to(BASE)), "sha256": sha(dest)})
    save(BASE / "build.json", report)


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
    # 正式目錄或外部資料只驗訊號；候選另驗來源與 recipe，避免舊 audit 冒充新成品。
    if audio_dir == BASE / "audio":
        built = read(BASE / "build.json")
        for field, path in [("contentSha256", CONTENT), ("recipeSha256", RECIPE), ("scriptSha256", Path(__file__))]:
            if built[field] != sha(path):
                errors.append(f"build 紀錄過期：{field}")
        for item in built["items"]:
            if not (BASE / item["file"]).exists() or item["sha256"] != sha(BASE / item["file"]):
                errors.append(f'{item["key"]}：成品 hash 與 build 不符')
            if item["sourceSha256"] != sha(BASE / item["source"]):
                errors.append(f'{item["key"]}：source hash 與 build 不符')
        save(BASE / "audit.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["synthesize", "build", "audit"])
    parser.add_argument("--audio-dir", type=Path, default=BASE / "audio", help="audit 可指定正式或暫存音檔目錄（唯讀）")
    args = parser.parse_args()
    recipe = read(RECIPE)
    try:
        if args.command == "synthesize":
            synthesize(recipe)
        elif args.command == "build":
            build(recipe)
        else:
            return audit(recipe, args.audio_dir.resolve())
    except (OSError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"音檔作業失敗：{exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
