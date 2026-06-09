# -*- coding: utf-8 -*-
"""把 PDF 某頁切成 nx*ny 塊高解析 PNG，供精細視覺判讀（含重疊避免切到題）。
用法： uv run python scripts/crop_pdf.py <pdf> <page1based> [--nx 2] [--ny 1] [--dpi 300] [--outdir data/_imgs]
"""
import sys, os, io, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import pdfplumber

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("page", type=int)
    ap.add_argument("--nx", type=int, default=2)
    ap.add_argument("--ny", type=int, default=1)
    ap.add_argument("--dpi", type=int, default=300)
    ap.add_argument("--outdir", default="data/_imgs")
    args = ap.parse_args()
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

if __name__ == "__main__":
    main()
