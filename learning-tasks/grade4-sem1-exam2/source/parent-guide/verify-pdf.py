"""Verify generated PDF text, coverage, embedded fonts and duplicate copies."""
import hashlib
import json
from pathlib import Path

from pypdf import PdfReader

SOURCE = Path(__file__).resolve().parent
OUTPUT = SOURCE.parent.parent / "output" / "pdf"
PUBLIC = SOURCE.parents[3] / "docs" / "parent" / "exam2-guide"


def compact(text):
    return "".join(text.split())


def main():
    data = json.loads((SOURCE / "toy-reference.json").read_text(encoding="utf-8"))
    original = json.loads((SOURCE / "content.json").read_text(encoding="utf-8"))
    manifest = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf-8"))
    expected = {item["id"] for unit in original["units"] for item in unit["items"]}
    retained = {item["id"] for unit in original["units"] if unit["subject"] in ("math", "science") for item in unit["items"]}
    assert len(retained) == 37, "Retain all 37 original math/science core items"
    assert len(expected) == sum(len(unit["items"]) for unit in original["units"])
    assert manifest["legacyItemCount"] == len(expected)
    assert manifest["rowCount"] == sum(len(unit["rows"]) for subject in data["subjects"] for unit in subject["units"])
    assert len(manifest["pdfs"]) == len(data["subjects"])
    actual = set()
    for subject in data["subjects"]:
        record = next(pdf for pdf in manifest["pdfs"] if pdf["file"] == subject["filename"])
        path = OUTPUT / record["file"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"]
        assert path.read_bytes() == (PUBLIC / record["file"]).read_bytes()
        reader = PdfReader(path)
        assert len(reader.pages) == record["pages"]
        texts = [page.extract_text() for page in reader.pages]
        assert all("\x00" not in text and "\ufffd" not in text for text in texts)
        for page in reader.pages:
            fonts = page["/Resources"]["/Font"].get_object().values()
            embedded = []
            for ref in fonts:
                font = ref.get_object()
                if "/FontDescriptor" in font:
                    descriptor = font["/FontDescriptor"].get_object()
                    embedded.append(any(key in descriptor for key in ("/FontFile", "/FontFile2", "/FontFile3")))
            assert embedded and all(embedded), "Chinese font must be embedded on each page"
        coverage = {row["id"]: row for row in record["coverage"]}
        source_rows = [row for unit in subject["units"] for row in unit["rows"]]
        assert len(coverage) == len(source_rows) == record["rowCount"]
        for row in source_rows:
            entry = coverage[row["id"]]
            assert entry["legacyIds"] == row["legacyIds"]
            row_bytes = json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            assert entry["sourceSha256"] == hashlib.sha256(row_bytes).hexdigest()
            actual.update(row["legacyIds"])
            text = compact(texts[entry["page"] - 1])
            assert compact(row["label"]) in text, row["id"]
            for line in row["exampleLines"]:
                assert compact(line) in text, (row["id"], line)
            if row.get("figure"):
                for shape in row["figure"]["shapes"]:
                    if shape["type"] == "text":
                        assert compact(shape["text"]) in text, (row["id"], shape["text"])
            assert set(row).issubset({"id", "legacyIds", "label", "exampleLines", "figure", "pageBreakBefore"}), "No private fields in public question source"
        for legacy in record["legacyCoverage"]:
            assert legacy["rows"] == [r["id"] for r in record["coverage"] if legacy["id"] in r["legacyIds"]]
            assert legacy["pages"] == sorted({r["page"] for r in record["coverage"] if legacy["id"] in r["legacyIds"]})
        print(f"{subject['id']}: {len(reader.pages)} pages / {len(source_rows)} rows; text, fonts, manifest and public copy verified")
    assert actual == expected and retained.issubset(actual)
    print(f"All {len(expected)} core items covered, including all 37 original math/science items.")


if __name__ == "__main__":
    main()
