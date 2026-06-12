# -*- coding: utf-8 -*-
"""CDP 操作 tcool.cc Cloudflare 挑戰頁的小工具（一次性，下載完可刪）。

用法：
  uv run --with websocket-client python scripts/cdp_tcool.py shot out.png   # 截圖
  uv run --with websocket-client python scripts/cdp_tcool.py click X Y      # 受信任滑鼠點擊
  uv run --with websocket-client python scripts/cdp_tcool.py title          # 目前 title
  uv run --with websocket-client python scripts/cdp_tcool.py cookies        # 取 cf_clearance/PHPSESSID
  uv run --with websocket-client python scripts/cdp_tcool.py goto URL       # 導頁
"""
import base64
import json
import sys
import urllib.request

import websocket

sys.stdout.reconfigure(encoding="utf-8")

DEBUG_HTTP = "http://localhost:9222"
_next_id = [0]


def get_page_target():
    with urllib.request.urlopen(DEBUG_HTTP + "/json") as r:
        targets = json.load(r)
    pages = [t for t in targets if t["type"] == "page"]
    if not pages:
        raise SystemExit("no page target")
    return pages[0]


def cdp(ws, method, params=None):
    _next_id[0] += 1
    mid = _next_id[0]
    ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get("id") == mid:
            if "error" in msg:
                raise RuntimeError(f"{method}: {msg['error']}")
            return msg.get("result", {})


def main():
    cmd = sys.argv[1]
    page = get_page_target()
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30,
                                     suppress_origin=True)
    try:
        if cmd == "shot":
            out = sys.argv[2]
            res = cdp(ws, "Page.captureScreenshot", {"format": "png"})
            with open(out, "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print(f"saved {out}")
        elif cmd == "click":
            x, y = float(sys.argv[2]), float(sys.argv[3])
            for ev in ("mouseMoved", "mousePressed", "mouseReleased"):
                cdp(ws, "Input.dispatchMouseEvent", {
                    "type": ev, "x": x, "y": y,
                    "button": "left" if ev != "mouseMoved" else "none",
                    "clickCount": 1 if ev != "mouseMoved" else 0,
                })
            print(f"clicked {x},{y}")
        elif cmd == "title":
            print(page["title"], "|", page["url"])
        elif cmd == "cookies":
            res = cdp(ws, "Storage.getCookies")
            wanted = {c["name"]: c["value"] for c in res["cookies"]
                      if c["name"] in ("cf_clearance", "PHPSESSID")}
            print(json.dumps(wanted, ensure_ascii=False))
        elif cmd == "goto":
            cdp(ws, "Page.navigate", {"url": sys.argv[2]})
            print("navigated")
        else:
            raise SystemExit(f"unknown cmd {cmd}")
    finally:
        ws.close()


if __name__ == "__main__":
    main()
