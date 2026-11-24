import importlib.util
import json
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]


def load_module(rel_path: str, name: str):
    path = ROOT / rel_path
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_resolve_video_path_prefers_explicit_and_supports_both_default_names(tmp_path):
    mod = load_module("learning-tasks/shared/taigi/verify_video.py", "shared_verify_video")
    final_dir = tmp_path / "final"
    final_dir.mkdir()

    # 兩者都不存在時報錯
    with pytest.raises(FileNotFoundError):
        mod.resolve_video_path(tmp_path, "苦瓜哪會苦")

    # 僅有 *-全篇.mp4 時可自動找到（〈苦瓜哪會苦〉命名）
    plain = final_dir / "苦瓜哪會苦-全篇.mp4"
    plain.write_bytes(b"fake")
    assert mod.resolve_video_path(tmp_path, "苦瓜哪會苦") == plain

    # 若有 *-全篇逐字字幕.mp4 時會優先找到（〈阮小妹〉命名）
    word_sub = final_dir / "苦瓜哪會苦-全篇逐字字幕.mp4"
    word_sub.write_bytes(b"fake")
    assert mod.resolve_video_path(tmp_path, "苦瓜哪會苦") == word_sub

    # 指定 --video 時使用明確路徑
    custom = tmp_path / "custom.mp4"
    custom.write_bytes(b"fake")
    assert mod.resolve_video_path(tmp_path, "苦瓜哪會苦", custom) == custom


def test_taigi_reading_verify_words_wrapper_exposes_shared_entrypoints():
    wrapper = load_module("learning-tasks/taigi-reading/verify_words.py", "reading_verify_words")
    assert callable(wrapper.verify)
    assert callable(wrapper.main)


@pytest.mark.skipif(shutil.which("ffmpeg") is None or shutil.which("uv") is None, reason="需要 ffmpeg 與 uv")
def test_verify_video_accepts_shortened_tail_frame_and_rejects_out_of_range_cue(tmp_path):
    """重現 build_comic.py 縮短尾格（avg_frame_rate != 24/1）與末字超格兩項邊界。"""
    source_dir = tmp_path / "source"
    site_assets = tmp_path / "final/site/assets"
    source_dir.mkdir(parents=True)
    site_assets.mkdir(parents=True)

    # 建立 1.0 秒 440Hz 正弦波音檔（取 0.00–0.98 秒，非 1/24 整數倍以觸發尾格縮短）
    audio_path = source_dir / "sample.mp3"
    subprocess.check_call([
        "ffmpeg", "-nostdin", "-v", "error", "-y",
        "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=1.0",
        "-c:a", "libmp3lame", "-b:a", "128k", audio_path,
    ])

    # 用 uv --script 內的 Pillow 產出 1920x360 字幕圖（上白下藍實心區塊）並合成 24 格縮短尾格 MP4
    helper = tmp_path / "make_fixture.py"
    helper.write_text("""# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=11,<13"]
# ///
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(sys.argv[1])
audio = root / "source/sample.mp3"
sprite = Image.new("RGBA", (1920, 360), (0, 0, 0, 0))
draw = ImageDraw.Draw(sprite)
draw.rectangle((400, 30, 800, 150), fill=(255, 255, 255, 255))
draw.rectangle((400, 210, 800, 330), fill=(104, 184, 239, 255))
sprite.save(root / "final/site/assets/caption-01.webp", format="WEBP", lossless=True)

# 0.98s * 24 = 23.52 -> 24 格，最後一格縮短為 520 ticks (timescale 24000)
frames = 24
ticks = round(0.98 * 24000) - (frames - 1) * 1000
args = [
    "ffmpeg", "-nostdin", "-v", "error", "-y",
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", "24", "-i", "pipe:0",
    "-ss", "0", "-t", "0.98", "-i", str(audio), "-map", "0:v", "-map", "1:a",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "17", "-bf", "0",
    "-fps_mode", "passthrough", "-enc_time_base:v", "1:24000", "-video_track_timescale", "24000",
    "-bsf:v", f"setts=duration='if(eq(N,{frames-1}),{ticks},DURATION)'",
    "-c:a", "aac", "-b:a", "128k", str(root / "final/測試篇-全篇.mp4"),
]
white_frame = Image.new("RGB", (1920, 1080), (20, 20, 20))
white_frame.paste(sprite.crop((0, 0, 1920, 180)), (0, 858), sprite.crop((0, 0, 1920, 180)).getchannel("A"))
blue_frame = Image.new("RGB", (1920, 1080), (20, 20, 20))
blue_frame.paste(sprite.crop((0, 180, 1920, 360)), (0, 858), sprite.crop((0, 180, 1920, 360)).getchannel("A"))
w_bytes, b_bytes = white_frame.tobytes(), blue_frame.tobytes()
with subprocess.Popen(args, stdin=subprocess.PIPE) as proc:
    for n in range(frames):
        # 在 frame 12 (0.50s) 切換為藍色
        proc.stdin.write(b_bytes if n >= 12 else w_bytes)
    proc.stdin.close()
    assert proc.wait() == 0
""")
    subprocess.check_call(["uv", "run", "--script", str(helper), str(tmp_path)])

    def write_index(cue_start: float):
        data = {
            "title": "測試篇",
            "recording": "sample.mp3",
            "start": 0.0,
            "end": 0.98,
            "intro": [{
                "id": "intro-1",
                "text": "測",
                "start": 0.0,
                "end": 0.98,
                "captionAt": 0.0,
                "karaoke": [{"text": "測", "start": cue_start}],
                "edges": [1920],
            }],
            "paragraphs": [],
        }
        html = f'<script id="reading" type="application/json">{json.dumps(data, ensure_ascii=False)}</script>'
        (tmp_path / "final/site/index.html").write_text(html)

    verifier = ROOT / "learning-tasks/shared/taigi/verify_video.py"

    # 1) 縮短尾格（avg_frame_rate != 24/1）且 cue 在 0.50s（frame 12）應通過
    write_index(0.50)
    ok = subprocess.run(
        ["uv", "run", "--script", str(verifier), str(tmp_path)],
        capture_output=True, text=True,
    )
    assert ok.returncode == 0, ok.stderr
    assert "2 次字幕換色前後影格檢查通過" in ok.stdout

    # 2) cue 在 0.97s（frame 24 >= nb_frames=24）必須明確失敗，不可靜默跳過
    write_index(0.97)
    bad = subprocess.run(
        ["uv", "run", "--script", str(verifier), str(tmp_path)],
        capture_output=True, text=True,
    )
    assert bad.returncode != 0
    assert "超出成片總影格數" in bad.stderr

