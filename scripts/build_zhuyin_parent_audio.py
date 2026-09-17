"""Rebuild the parent-recorded audio from preserved originals and explicit cuts.

uv run python scripts/build_zhuyin_parent_audio.py
"""
import array
import json
from pathlib import Path
import sys
import tempfile

from zhuyin_audio import RATE, db, metrics, pcm, run, save, sha

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs-dev/zhuyin-parent-audio"
DEST = ROOT / "docs/zhuyin/assets/audio"


def main():
    recipe = json.loads((BASE / "recipe.json").read_text())
    content = json.loads((ROOT / "docs/zhuyin/content.json").read_text())
    keys = [s["audio"] for s in content["symbols"]]
    for s in content["syllables"]:
        keys.append(s["audio"])
        if "word" in s:
            keys.append(s["word"]["audio"])
    if keys != [i["key"] for i in recipe["items"]]:
        raise ValueError("親錄清單與 content.json 不符")
    report = {"source": "parent-recorded", "pronunciationReviewed": False,
              "iPadVerified": False, "recipeSha256": sha(BASE / "recipe.json"),
              "processing": "只裁掉頭尾等待；末端 5 ms 淡出；峰值 -6 dBFS；不改音高、語速或聲調。",
              "items": []}
    # Validate and encode into staging first; an invalid source cannot replace a prior asset.
    with tempfile.TemporaryDirectory(prefix="zhuyin-parent-build-") as temp:
        work = Path(temp)
        for item in recipe["items"]:
            source = BASE / item["source"]
            if sha(source) != item["sourceSha256"]:
                raise ValueError(f'{item["key"]} 原音 hash 不符')
            raw = pcm(source)
            start, end = round(item["start"] * RATE), round(item["end"] * RATE)
            if not 0 <= start < end <= len(raw):
                raise ValueError(f'{item["key"]} 裁切範圍不符')
            clip = raw[start:end]
            peak = max(map(abs, clip))
            if peak < 0.0001:
                raise ValueError(f'{item["key"]} 近乎靜音')
            gain = 10 ** (recipe["targetPeakDbfs"] / 20) / peak
            fade = round(RATE * .005)
            samples = array.array('f', (x * gain * min(1, (len(clip)-1-i)/fade)
                                       for i, x in enumerate(clip)))
            if sys.byteorder != 'little':
                samples.byteswap()
            data = work / 'clip.f32'
            data.write_bytes(samples.tobytes())
            dest = work / f'{item["key"]}.m4a'
            run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '1',
                 '-i', str(data), '-map_metadata', '-1', '-c:a', 'aac', '-profile:a', 'aac_low',
                 '-b:a', '128k', '-movflags', '+faststart', str(dest)])
            report['items'].append({'key': item['key'], 'sourceSha256': sha(source),
                                    'sha256': sha(dest), 'gainDb': db(gain),
                                    'originalMetrics': metrics(raw), 'outputMetrics': metrics(pcm(dest))})
        DEST.mkdir(parents=True, exist_ok=True)
        for item in recipe['items']:
            name = f'{item["key"]}.m4a'
            (DEST / name).write_bytes((work / name).read_bytes())
    save(BASE / 'build.json', report)
    print(f'已整理 {len(keys)} 段親錄音檔；未宣稱人工驗音或 iPad 真機通過。')


if __name__ == '__main__':
    main()
