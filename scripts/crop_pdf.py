# -*- coding: utf-8 -*-
"""PDF 裁切工具，兩種模式：

1. 象限勘查（原功能）：把某頁切成 nx*ny 塊高解析 PNG，供精細視覺判讀（含重疊避免切到題）。
   uv run python scripts/crop_pdf.py <pdf> <page1based> [--nx 2] [--ny 1] [--dpi 300] [--outdir data/_imgs]

2. bbox 模式（issues/015 看表題截圖）：讀座標清單 JSON，逐筆裁出指定命名 PNG。
   uv run python scripts/crop_pdf.py --bboxfile data/table_crops_數學.json [--outdir docs/study/assets/math] [--dpi 200]
   清單格式：[{"pdf": "pdfs_數學/xxx.pdf", "page": 2, "bbox": [x0, y0, x1, y1], "name": "tao112_trains"}]
   座標單位＝PDF point（左上原點，與 pdfplumber crop 相同）。
"""
import sys, os, io, json, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import pdfplumber


def crop_quadrants(args):
    os.makedirs(args.outdir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(args.pdf))[0]
    with pdfplumber.open(args.pdf) as pdf:
        pg = pdf.pages[args.page - 1]
        w, h = pg.width, pg.height
        ox, oy = w * 0.03, h * 0.02  # 重疊
        for iy in range(args.ny):
            for ix in range(args.nx):
                x0 = max(0, w * ix / args.nx - ox)
                x1 = min(w, w * (ix + 1) / args.nx + ox)
                y0 = max(0, h * iy / args.ny - oy)
                y1 = min(h, h * (iy + 1) / args.ny + oy)
                crop = pg.crop((x0, y0, x1, y1))
                out = os.path.join(args.outdir, f"{stem}_p{args.page}_c{iy}{ix}.png")
                crop.to_image(resolution=args.dpi).save(out)
                print(f"OK {out}")


def crop_bboxes(args):
    os.makedirs(args.outdir, exist_ok=True)
    with open(args.bboxfile, encoding="utf-8") as f:
        entries = json.load(f)
    opened = {}
    try:
        for e in entries:
            pdf = opened.get(e["pdf"])
            if pdf is None:
                pdf = opened[e["pdf"]] = pdfplumber.open(e["pdf"])
            pg = pdf.pages[e["page"] - 1]
            x0, y0, x1, y1 = e["bbox"]
            crop = pg.crop((max(0, x0), max(0, y0), min(pg.width, x1), min(pg.height, y1)))
            out = os.path.join(args.outdir, f"{e['name']}.png")
            crop.to_image(resolution=e.get("dpi", args.dpi)).save(out)
            print(f"OK {out} ({os.path.getsize(out) // 1024} KB)")
    finally:
        for pdf in opened.values():
            pdf.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", nargs="?")
    ap.add_argument("page", nargs="?", type=int)
    ap.add_argument("--nx", type=int, default=2)
    ap.add_argument("--ny", type=int, default=1)
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--outdir", default=None)
    ap.add_argument("--bboxfile", default=None, help="bbox 模式：座標清單 JSON")
    args = ap.parse_args()

    if args.bboxfile:
        args.outdir = args.outdir or "docs/study/assets/math"
        if args.dpi == 300:
            args.dpi = 200   # 截圖預設 200dpi（控檔案大小）
        crop_bboxes(args)
    else:
        if not args.pdf or not args.page:
            ap.error("象限模式需要 <pdf> <page>；或改用 --bboxfile")
        args.outdir = args.outdir or "data/_imgs"
        crop_quadrants(args)


if __name__ == "__main__":
    main()
