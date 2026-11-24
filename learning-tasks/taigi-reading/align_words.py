# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "onnxruntime"]
# ///
"""以學校原音、逐音節讀法和字母 CTC 模型重建字幕起音。"""

import argparse
import json
import re
import subprocess
from pathlib import Path

import numpy as np
import onnxruntime as ort

from build_mock import paragraph_manifests


def subtitle_units(text):
    """One Han character or romanized syllable; keep punctuation with its neighbour."""
    units, prefix = [], ""
    for item in re.findall(r"[a-zA-Z\u00c0-\u024f\u1e00-\u1eff\u0300-\u036f]+|.", text):
        if item[0].isalpha():
            units.append(prefix + item)
            prefix = ""
        elif item in "「『" or not units:
            prefix += item
        else:
            units[-1] += item
    if prefix or "".join(units) != text:
        raise ValueError(f"無法拆解字幕：{text}")
    return units


def align(emission, words, vocab):
    """Viterbi alignment including CTC blank and repeated-letter transitions."""
    spelling = "".join(words)
    ids = np.zeros(2 * len(spelling) + 1, dtype=int)
    ids[1::2] = [vocab[char] for char in spelling]
    previous = np.full(len(ids), -np.inf)
    previous[0] = 0
    back = np.zeros((len(emission), len(ids)), np.int8)
    skip = (ids[2:] != 0) & (ids[:-2] != ids[2:])
    for t, frame in enumerate(emission):
        choices = np.stack([previous, np.r_[-np.inf, previous[:-1]],
                            np.r_[-np.inf, -np.inf, np.where(skip, previous[:-2], -np.inf)]])
        back[t] = choices.argmax(axis=0)
        previous = choices.max(axis=0) + frame[ids]
    state = len(ids) - 1 - int(previous[-2] > previous[-1])
    if not np.isfinite(previous[state]):
        raise ValueError(f"錄音時間不足以對齊音節：{words}")
    path = np.empty(len(emission), dtype=int)
    for t in reversed(range(len(emission))):
        path[t] = state
        state -= int(back[t, state])
    letter = 0
    for word in words:
        yield int(np.flatnonzero(path == 2 * letter + 1)[0])
        letter += len(word)


def speech_onset(seconds, previous, energy, first):
    # Each CTC time step is 20 ms. Look back for a quiet-to-speech transition in 5 ms RMS.
    edge = round(seconds / .005)
    lower = max(3, round((seconds - (.16 if first else .09)) / .005), round(previous / .005) + 1)
    for i in range(edge, lower - 1, -1):
        if max(energy[i-3:i]) < -38 and np.median(energy[i:i+5]) > -37:
            return round(i * .005, 3)
    return round(max(previous + .005, seconds - .015), 3)


def build(root, model, vocabulary):
    src = root / "source"
    get = lambda file: json.loads(file.read_text())
    notes = get(src / "word-notes.json")
    groups = []
    for number, path in paragraph_manifests(src):
        lines = get(path)
        for i, line in enumerate(lines, 1):
            line["id"] = f"p{number}-{i:02d}"
            line["meaning"] = line.pop("hint", None) or notes["meanings"][line["id"]]
        groups.append({"title": notes["paragraphTitles"][number - 1], "lines": lines})
    if [len(p["lines"]) for p in groups] != [7, 14, 18, 11, 9]:
        raise ValueError("全篇需要原來的五段 59 句")
    intro = get(src / "video-intro.json")
    # The original film omits the spoken catalogue number before the title.
    for i, (line, lo, hi) in enumerate(zip(intro, (4.22, 7.25), (6.6, 10.4), strict=True), 1):
        line.update(id=f"intro-{i}", start=lo, end=hi)
    all_lines = intro + [line for group in groups for line in group["lines"]]
    lines_of_syllables = (src / "syllables.txt").read_text().splitlines()
    recording = "01_阮小妹.mp3"
    pcm = np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", src / recording,
                        "-ar", "16000", "-ac", "1", "-f", "f32le", "-"]), "<f4")
    samples = pcm[:len(pcm)//80*80].reshape(-1, 80)
    energy = 10 * np.log10(np.mean(samples * samples, axis=1) + 1e-10)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    session = ort.InferenceSession(str(model), options, providers=["CPUExecutionProvider"])
    vocab = get(vocabulary)
    previous_end = 4.22
    for line, romanized in zip(all_lines, lines_of_syllables, strict=True):
        words, units = romanized.split(), subtitle_units(line["text"])
        if len(words) != len(units):
            raise ValueError(f"{line['id']} 音節數不同：{units} / {words}")
        lo, hi = line["start"], line["end"]
        if lo < previous_end or not lo < hi <= len(pcm)/16000:
            raise ValueError(f"{line['id']} 錄音區間錯誤")
        wave = pcm[round(lo*16000):round(hi*16000)]
        wave = (wave - wave.mean()) / np.sqrt(wave.var() + 1e-7)
        emission = session.run(None, {"input_values": wave[None, :]})[0][0]
        cues = []
        for unit, frame in zip(units, align(emission, words, vocab), strict=True):
            at = speech_onset(lo + frame*.02, cues[-1]["start"] if cues else lo-.005, energy, not cues)
            cues.append({"text": unit, "start": at})
        line["karaoke"] = cues
        line["captionAt"] = max(previous_end, round(cues[0]["start"] - .4, 3))
        if line is intro[0]:
            line["captionAt"] = lo
        previous_end = hi
    data = dict(title=intro[0]["text"], author=intro[1]["text"], recording=recording,
                start=4.22, end=284.76, intro=intro, paragraphs=groups)
    output = src / "word-timeline.json"
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ("private_root", "model", "vocabulary"):
        parser.add_argument(key, type=Path)
    args = parser.parse_args()
    build(args.private_root, args.model, args.vocabulary)
