"""Local three-clip recording trial. Never writes production assets or progress.

uv run python scripts/zhuyin_recording_trial.py
"""
import argparse
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "docs-dev/zhuyin-recording-trial/index.html"
SYMBOLS = json.loads((ROOT / "docs/zhuyin/content.json").read_text())["symbols"][:3]
ITEMS = [{"key": s["audio"], "glyph": s["glyph"], "hint": s["recordHint"]} for s in SYMBOLS]
MIME_EXT = {"audio/mp4": ".m4a", "audio/webm": ".webm", "audio/ogg": ".ogg"}
MAX_BYTES = 8 * 1024 * 1024


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8767)
    parser.add_argument("--output", type=Path,
                        default=Path.home() / "Downloads/aiden-zhuyin-recording-trial")
    args = parser.parse_args()
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            parser.error(f"找不到 {tool}")
    output = args.output.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=True)
    origin = f"http://127.0.0.1:{args.port}"
    keys = {i["key"] for i in ITEMS}

    def recordings():
        # Only fully saved takes have metadata; interrupted uploads stay out of the list.
        takes = []
        for path in sorted(output.glob("*/take.json")):
            take = json.loads(path.read_text())
            if take["key"] in keys and (path.parent / "audio.m4a").is_file():
                takes.append(take)
        return takes

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def respond(self, status, body, mime="application/json; charset=utf-8"):
            if isinstance(body, (dict, list)):
                body = json.dumps(body, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)

        def local_request(self):
            return (self.headers.get("Host") == f"127.0.0.1:{args.port}"
                    and self.headers.get("Origin", origin) == origin
                    and self.headers.get("Sec-Fetch-Site", "same-origin") in ("same-origin", "none"))

        def do_GET(self):
            if not self.local_request():
                return self.respond(403, {"error": "請從本機試錄頁開啟。"})
            path = urlsplit(self.path).path
            try:
                if path == "/":
                    return self.respond(200, PAGE.read_bytes(), "text/html; charset=utf-8")
                if path == "/api/status":
                    return self.respond(200, {"items": ITEMS, "takes": recordings()})
                for take in recordings():
                    if path == f'/audio/{take["id"]}':
                        return self.respond(200, (output / take["id"] / "audio.m4a").read_bytes(), "audio/mp4")
                return self.respond(404, {"error": "找不到檔案。"})
            except (OSError, ValueError, KeyError):
                return self.respond(500, {"error": "讀取錄音失敗，請回對話讓我檢查。"})

        def do_POST(self):
            if not self.local_request() or self.headers.get("Origin") != origin:
                return self.respond(403, {"error": "請從本機試錄頁操作。"})
            key = urlsplit(self.path).path.removeprefix("/api/record/")
            if self.path != f"/api/record/{key}" or key not in keys:
                return self.respond(404, {"error": "不在本次三段試錄清單內。"})
            mime = self.headers.get("Content-Type", "").split(";")[0].strip()
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                size = 0
            if mime not in MIME_EXT or not 0 < size <= MAX_BYTES:
                return self.respond(400, {"error": "錄音格式或大小不符，請重錄 1～3 秒。"})
            self.connection.settimeout(15)
            try:
                payload = self.rfile.read(size)
                if len(payload) != size:
                    return self.respond(400, {"error": "錄音未傳完整，請按重試保存。"})
                with tempfile.TemporaryDirectory(prefix=".saving-", dir=output) as temp:
                    work = Path(temp)
                    original = work / ("original" + MIME_EXT[mime])
                    original.write_bytes(payload)
                    result = subprocess.run(
                        ["ffprobe", "-v", "error", "-show_streams", "-of", "json", str(original)],
                        check=True, capture_output=True, timeout=15)
                    streams = json.loads(result.stdout)["streams"]
                    if len(streams) != 1 or streams[0].get("codec_type") != "audio":
                        raise ValueError("不是單一音軌")
                    dest = work / "audio.m4a"
                    subprocess.run(
                        ["ffmpeg", "-v", "error", "-xerror", "-y", "-i", str(original), "-t", "31",
                         "-vn", "-map_metadata", "-1", "-ac", "1", "-ar", "44100", "-c:a", "aac",
                         "-b:a", "128k", "-movflags", "+faststart", str(dest)],
                        check=True, capture_output=True, timeout=20)
                    duration = float(subprocess.run(
                        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                         "default=noprint_wrappers=1:nokey=1", str(dest)],
                        check=True, capture_output=True, timeout=10).stdout)
                    if not 0.15 <= duration <= 30.5:
                        raise ValueError("錄音過短或過長")
                    ident = f'{datetime.now():%Y%m%d-%H%M%S-%f}-{key}-{uuid4().hex[:8]}'
                    take = {"id": ident, "key": key, "duration": round(duration, 3),
                            "recordedAt": datetime.now().astimezone().isoformat(),
                            "original": original.name, "mime": mime,
                            "inputLabel": unquote(self.headers.get("X-Recording-Device", ""))[:200]}
                    (work / "take.json").write_text(json.dumps(take, ensure_ascii=False, indent=2) + "\n")
                    work.rename(output / ident)
                    return self.respond(201, take)
            except (OSError, ValueError, KeyError, subprocess.SubprocessError):
                return self.respond(422, {"error": "未能保存這段錄音。可按重試保存；若仍失敗，回對話讓我檢查。"})

    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"三段試錄：{origin}\n錄音保存：{output}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
