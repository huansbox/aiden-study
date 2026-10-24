"""Check the delivered worksheets, independently of their drawing functions."""

import json
from pathlib import Path
import re

import pdfplumber
from pdfminer.pdftypes import resolve1
import pytest


TASK = Path(__file__).resolve().parents[1] / "learning-tasks" / "number-line-difference"
BANK = json.loads((TASK / "source" / "problems.json").read_text(encoding="utf-8"))["sets"]


def compact(value):
    return re.sub(r"\s+", "", value)


def segment_name(problem, segment):
    labels = {point["id"]: point["label"] for point in problem["points"]}
    return "".join(labels[point] for point in segment)


@pytest.mark.parametrize("name,pages", [("transition", 5), ("independent", 5), ("parent-answers", 8)])
def test_paper_is_a4_with_embedded_traditional_chinese_fonts(name, pages):
    with pdfplumber.open(TASK / "output" / "pdf" / f"number-line-{name}.pdf") as pdf:
        assert len(pdf.pages) == pages
        for page in pdf.pages:
            assert page.width == pytest.approx(595.276, abs=0.01)
            assert page.height == pytest.approx(841.890, abs=0.01)
            assert all("MicrosoftJhengHei" in char["fontname"] for char in page.chars)
            fonts = resolve1(page.page_obj.resources["Font"])
            chinese_fonts = [resolve1(font) for font in fonts.values() if "MicrosoftJhengHei" in str(resolve1(font).get("BaseFont"))]
            assert chinese_fonts
            assert all("FontFile2" in resolve1(font["FontDescriptor"]) for font in chinese_fonts)
            assert all(15 < char["x0"] < char["x1"] < page.width - 15 for char in page.chars)
            assert all(15 < char["top"] < char["bottom"] < page.height - 15 for char in page.chars)


@pytest.mark.parametrize("name", ["transition", "independent"])
def test_children_keep_the_original_six_questions_and_values(name):
    with pdfplumber.open(TASK / "output" / "pdf" / f"number-line-{name}.pdf") as pdf:
        content = compact("\n".join(page.extract_text() for page in pdf.pages))
        assert len(re.findall(r"第[1-6]題", content)) == 6
        for index, problem in enumerate(BANK[name], 1):
            assert f"第{index}題" in content
            assert f"{segment_name(problem, problem['target'])}有多長？" in content
            for given in problem["givens"]:
                assert f"{segment_name(problem, given['segment'])}={given['length']}" in content


def test_independent_paper_does_not_predraw_a_solution():
    with pdfplumber.open(TASK / "output" / "pdf" / "number-line-independent.pdf") as pdf:
        for page in pdf.pages:
            # Small round endpoint dots are allowed; a prepared arc or answer
            # box would occupy a substantially wider or taller region.
            assert all(curve["width"] < 6 and curve["height"] < 6 for curve in page.curves)
            assert not any(line["linewidth"] >= 2.5 for line in page.lines)
            assert "先選要算的段，再找長段、短段，算完標回圖。" in page.extract_text()
            assert "第 1 步" not in page.extract_text()


def test_transition_fades_prepared_arcs_and_target_lines():
    with pdfplumber.open(TASK / "output" / "pdf" / "number-line-transition.pdf") as pdf:
        # The first page has two beginner questions; the remaining pages one each.
        assert [sum(line["linewidth"] >= 2.5 for line in page.lines) for page in pdf.pages] == [2, 1, 1, 0, 0]
        assert [sum(len(curve["path"]) == 2 for curve in page.curves) for page in pdf.pages] == [5, 1, 0, 0, 0]
        for page in pdf.pages:
            content = page.extract_text()
            assert "目標段" in content and "長段" in content and "短段" in content


def test_parent_answers_include_every_original_route_with_segment_identity():
    with pdfplumber.open(TASK / "output" / "pdf" / "number-line-parent-answers.pdf") as pdf:
        content = compact("\n".join(page.extract_text() for page in pdf.pages))
        assert content.count("路線1：") == content.count("路線5：") == 2
        for name in ("transition", "independent"):
            for problem in BANK[name]:
                lengths = {given["segment"]: given["length"] for given in problem["givens"]}
                for route in problem["routes"]:
                    for step in route["steps"]:
                        lengths[step["result"]] = step["value"]
                for route in problem["routes"]:
                    for step in route["steps"]:
                        expected = (
                            f"{segment_name(problem, step['result'])}{step['value']}="
                            f"{segment_name(problem, step['long'])}{lengths[step['long']]}-"
                            f"{segment_name(problem, step['short'])}{lengths[step['short']]}"
                        )
                        assert expected in content
