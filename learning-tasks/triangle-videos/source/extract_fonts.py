# /// script
# dependencies = ["fonttools"]
# ///
"""Split the system Yuanti/PingFang collections into single faces the canvas can register.

Output goes to .cache/fonts (not committed: system fonts are not redistributable).
"""
import subprocess
import sys
from pathlib import Path

from fontTools.ttLib import TTCollection

OUT = Path(__file__).resolve().parents[1] / ".cache/fonts"
WANT = {("Yuanti TC", "Bold"), ("Yuanti TC", "Regular"), ("PingFang TC", "Semibold")}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    listing = subprocess.run(["fc-list", ":", "file"], capture_output=True, text=True, check=True).stdout
    found = set()
    for name in ("Yuanti.ttc", "PingFang.ttc"):
        path = next((l.split(":")[0] for l in listing.splitlines() if l.split(":")[0].endswith(name)), None)
        if not path:
            continue
        for font in TTCollection(path).fonts:
            key = (font["name"].getDebugName(1), font["name"].getDebugName(2))
            if key in WANT:
                font.save(OUT / f"{key[0].replace(' ', '')}-{key[1]}.ttf")
                found.add(key)
    missing = WANT - found
    if missing:
        sys.exit(f"missing system fonts: {sorted(missing)}")
    print("fonts ready:", sorted(p.name for p in OUT.iterdir()))


main()
