# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=11,<13"]
# ///
"""將五段剪紙動畫、逐字時間、學校錄音組成網站與單檔離線頁。"""

import argparse
import base64
import json
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile

SOURCE = Path(__file__).resolve().parent / "source"
sys.path.insert(0, str(SOURCE.parents[1] / "shared" / "taigi"))
from player import Lettering, encoded, make_page


def write(path, content):
    with NamedTemporaryFile(dir=path.parent, delete=False) as file:
        tmp = Path(file.name)
        try:
            file.write(content)
            file.flush()
            tmp.replace(path)
        finally:
            tmp.unlink(missing_ok=True)


def build(root, font_dir):
    data = json.loads((root / "source/word-timeline.json").read_text())
    lines = data["intro"] + [line for group in data["paragraphs"] for line in group["lines"]]
    if len(data["intro"]) != 2 or [len(p["lines"]) for p in data["paragraphs"]] != [7,14,18,11,9]:
        raise ValueError("需要完整的篇名、作者及五段逐句時間")
    seen = set()
    previous = data["start"]
    for line in lines:
        cues = line["karaoke"]
        if line["id"] in seen or not (previous <= line["start"] < line["end"] <= data["end"]):
            raise ValueError(f"重複的識別碼或不合法的句子時間：{line['id']}")
        starts = [cue["start"] for cue in cues]
        if (not starts or starts != sorted(set(starts)) or
            not previous <= line["captionAt"] <= starts[0] or
            not line["start"] <= starts[0] <= starts[-1] < line["end"] or
            "".join(c["text"] for c in cues) != line["text"]):
            raise ValueError(f"逐字時間未正確涵蓋全句：{line['id']}")
        seen.add(line["id"])
        previous = line["end"]

    stage = ['<div id="stage" class="playing"></div>']
    for name in ["scenes", "sentence-props", *[f"paragraph-{n}-scenes" for n in range(2, 6)]]:
        stage.append((SOURCE / f"{name}.html").read_text())
    scene = dict(scene_html="\n".join(stage),
                 scene_css="""#stage {position: absolute; inset: 0; width: 100%; height: 100%}
#stage .sister-scene {border-radius: 0; box-shadow: none}""",
                 scene_js=(SOURCE / "scene-factory.js").read_text() + (SOURCE / "word-scene.js").read_text())
    output = root / "final"
    assets = output / "site/assets"
    assets.mkdir(parents=True, exist_ok=True)
    online, offline = {}, {}

    def add(key, name, mime, content):
        write(assets / name, content)
        online[key] = "assets/" + name
        offline[key] = f"data:{mime};base64," + base64.b64encode(content).decode("ascii")

    lettering = Lettering(lines, font_dir)
    add("audio", "reading.mp3", "audio/mpeg", (root / "source" / data["recording"]).read_bytes())
    for i, line in enumerate(lines, 1):
        sprite = lettering.make(line)
        add("caption/" + line["id"], f"caption-{i:02d}.webp", "image/webp",
            encoded(sprite, "WEBP", lossless=True, method=2))
    write(output / "site/index.html", make_page(data, online, **scene).encode())
    write(output / "index.html", make_page(data, offline, **scene).encode())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("private_root", type=Path)
    parser.add_argument("--fonts", type=Path, help="含 Iansui-Regular.ttf 的目錄")
    args = parser.parse_args()
    build(args.private_root, args.fonts or args.private_root / "fonts")
