"""Build only this task's prepared speech; the shared tool owns paid-request recovery."""
import argparse
import importlib.util
import json
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lang", choices=("zh", "en"), required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("water_cycle_audio", REPO / "learning-tasks/shared/nativecamp/build_openai_audio.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.INSTRUCTIONS = "中文用自然臺灣國語、英文清楚自然，不添字不念標籤。"
    settings = SimpleNamespace(
        lesson=f"water-cycle-{args.lang}", voice="cedar", check=args.check, limit=None,
        jobs=HERE / f"speech-{args.lang}.json", manifest=HERE / f"audio-{args.lang}-manifest.json",
        audio_dir=HERE.parent / "assets/audio",
        request_journal=REPO / f".local/water-cycle/audio-{args.lang}-requests.json",
    )
    try:
        print(json.dumps(module.build(settings)))
    except module.AudioBuildError as error:
        parser.exit(1, str(error) + "\n")


if __name__ == "__main__":
    main()
