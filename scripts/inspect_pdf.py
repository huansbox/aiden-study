# -*- coding: utf-8 -*-
"""快速診斷 PDF：頁數/字元數/圖片數 + 首頁文字樣本，判斷答案卷是否格式A可抽。"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import pdfplumber

for path in sys.argv[1:]:
    name = path.replace("\\", "/").split("/")[-1]
    try:
        with pdfplumber.open(path) as pdf:
            npages = len(pdf.pages)
            total_chars = 0
            total_imgs = 0
            samples = []
            for i, pg in enumerate(pdf.pages):
                t = pg.extract_text() or ""
                total_chars += len(t)
                total_imgs += len(pg.images)
                if i == 0:
                    samples.append(t[:500])
            print(f"=== {name} | pages={npages} chars={total_chars} images={total_imgs}")
            print(samples[0] if samples else "(no text)")
            print("-" * 60)
    except Exception as e:
        print(f"=== {name} | ERROR {e}")
        print("-" * 60)
