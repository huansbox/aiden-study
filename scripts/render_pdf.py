# -*- coding: utf-8 -*-
"""把 PDF 每頁渲染成 PNG，供視覺判讀（讀圖片型答案卷的官方答案）。
用法： uv run python scripts/render_pdf.py <pdf> [<pdf> ...] --outdir data/_imgs --dpi 200
輸出檔名： <pdf檔名去副檔名>_pN.png
"""
import sys, os, io, argparse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import pdfplumber

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdfs", nargs="+")
    ap.add_argument("--outdir", default="data/_imgs")
    ap.add_argument("--dpi", type=int, default=200)
    args = ap.parse_args()
    os.makedirs(args.outdir, exist_ok=True)
    for path in args.pdfs:
        stem = os.path.splitext(os.path.basename(path))[0]
        with pdfplumber.open(path) as pdf:
            for i, pg in enumerate(pdf.pages):
                out = os.path.join(args.outdir, f"{stem}_p{i+1}.png")
                im = pg.to_image(resolution=args.dpi)
                im.save(out)
                print(f"OK {out}")

if __name__ == "__main__":
    main()
