# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "pillow>=11,<13"]
# ///
"""保留〈阮小妹〉原本的驗片入口，實際邏輯共用 shared/taigi/verify_video.py。"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared" / "taigi"))
from verify_video import main, verify  # noqa: F401


if __name__ == "__main__":
    main()
