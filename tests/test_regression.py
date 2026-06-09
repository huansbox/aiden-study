"""
期中萃取回歸測試：確保重構與期末 NON_TARGET/雙欄改動不破壞期中既有萃取結果。

golden master＝committed `data/raw_questions.json`（期中 27 份 PDF 的萃取輸出）。
期中 PDF 不進 repo（`pdfs/` 已 gitignore），故本測試在 `pdfs/` 不存在時自動 skip；
維護者本機有 PDF 時可跑完整回歸。

注意：此 golden master 已含 issue 001/002 對桃子腳112 的有意修正
（補 NON_TARGET「根據題意」後，移除原本誤抽的根據題意子題、清掉 MC#15 選項污染）。
"""
import json
import os

import pytest

import extract

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PDF_DIR = os.path.join(ROOT, "pdfs")
GOLDEN_PATH = os.path.join(ROOT, "data", "raw_questions.json")

_has_pdfs = os.path.isdir(PDF_DIR) and any(f.endswith(".pdf") for f in os.listdir(PDF_DIR))

pytestmark = pytest.mark.skipif(
    not _has_pdfs,
    reason="期中 PDF 不在 pdfs/（已 gitignore）；僅本機有 PDF 時跑此回歸",
)


def _extract_all():
    questions = []
    for f in sorted(os.listdir(PDF_DIR)):
        if f.endswith(".pdf"):
            questions.extend(extract.process_pdf(os.path.join(PDF_DIR, f)))
    return questions


def test_midterm_extraction_matches_golden():
    with open(GOLDEN_PATH, encoding="utf-8") as f:
        golden = json.load(f)
    assert _extract_all() == golden, "期中萃取結果與 golden master 不一致（非預期回歸）"
