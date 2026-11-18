"""Check that spreadsheet annotations survive import without changing credits."""

import csv
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from scripts.import_sheet import import_sheet

NAMESPACE = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def element(name, attributes=None):
    return ET.Element(f"{{{NAMESPACE}}}{name}", attributes or {})


def inline_cell(reference, value, style="0"):
    cell = element("c", {"r": reference, "t": "inlineStr", "s": style})
    content = ET.SubElement(cell, f"{{{NAMESPACE}}}is")
    ET.SubElement(content, f"{{{NAMESPACE}}}t").text = value
    return cell


def write_fixture(path, valid_headers=True):
    worksheet = element("worksheet")
    data = ET.SubElement(worksheet, f"{{{NAMESPACE}}}sheetData")
    headers = [
        "№ ",
        "(№)",
        "Рік",
        "Автор",
        "Країна",
        "Статус",
        "Назва статті",
        "Сторінка",
        "Рубрика",
        "Мова публікації",
        "Теги",
    ]
    header_row = ET.SubElement(data, f"{{{NAMESPACE}}}row", {"r": "1"})
    for index, header in enumerate(headers):
        header_row.append(
            inline_cell(f"{chr(65 + index)}1", header if valid_headers else "wrong")
        )

    annotated = ET.SubElement(data, f"{{{NAMESPACE}}}row", {"r": "2"})
    for reference, value in [
        ("A2", "1.0"),
        ("B2", "11.0"),
        ("C2", "2009.0"),
        ("H2", "9.0"),
    ]:
        cell = element("c", {"r": reference})
        ET.SubElement(cell, f"{{{NAMESPACE}}}v").text = value
        annotated.append(cell)
    annotated.append(inline_cell("G2", 'Review, "quoted"\nsecond line'))
    annotated.append(inline_cell("I2", "Геополітика"))
    tags = element("c", {"r": "K2", "t": "s", "s": "1"})
    ET.SubElement(tags, f"{{{NAMESPACE}}}v").text = "0"
    annotated.append(tags)

    unmarked = ET.SubElement(data, f"{{{NAMESPACE}}}row", {"r": "3"})
    unmarked.append(inline_cell("G3", "Unmarked record"))
    credit = element("c", {"r": "D3", "t": "inlineStr"})
    credit_content = ET.SubElement(credit, f"{{{NAMESPACE}}}is")
    credit_run = ET.SubElement(credit_content, f"{{{NAMESPACE}}}r")
    credit_properties = ET.SubElement(credit_run, f"{{{NAMESPACE}}}rPr")
    ET.SubElement(credit_properties, f"{{{NAMESPACE}}}color", {"rgb": "FFFF0000"})
    ET.SubElement(credit_run, f"{{{NAMESPACE}}}t").text = "Автор Т."
    unmarked.append(credit)
    unmarked.append(inline_cell("I3", "Енергетична безпека"))
    unmarked.append(inline_cell("K3", "Мамедов Рустам\nІнтерв'ю"))

    shared = element("sst")
    text = ET.SubElement(shared, f"{{{NAMESPACE}}}si")
    first = ET.SubElement(text, f"{{{NAMESPACE}}}r")
    ET.SubElement(first, f"{{{NAMESPACE}}}t").text = "Мамедов Рустам\n"
    second = ET.SubElement(text, f"{{{NAMESPACE}}}r")
    properties = ET.SubElement(second, f"{{{NAMESPACE}}}rPr")
    ET.SubElement(properties, f"{{{NAMESPACE}}}color", {"rgb": "FFFF0000"})
    ET.SubElement(second, f"{{{NAMESPACE}}}t").text = "Інтерв'ю"

    styles = element("styleSheet")
    fills = ET.SubElement(styles, f"{{{NAMESPACE}}}fills")
    ET.SubElement(fills, f"{{{NAMESPACE}}}fill")
    green = ET.SubElement(fills, f"{{{NAMESPACE}}}fill")
    pattern = ET.SubElement(green, f"{{{NAMESPACE}}}patternFill")
    ET.SubElement(pattern, f"{{{NAMESPACE}}}fgColor", {"rgb": "FFD9EAD3"})
    formats = ET.SubElement(styles, f"{{{NAMESPACE}}}cellXfs")
    ET.SubElement(formats, f"{{{NAMESPACE}}}xf", {"fillId": "0"})
    ET.SubElement(formats, f"{{{NAMESPACE}}}xf", {"fillId": "1"})

    with ZipFile(path, "w") as archive:
        for name, content in [
            ("xl/worksheets/sheet1.xml", worksheet),
            ("xl/sharedStrings.xml", shared),
            ("xl/styles.xml", styles),
        ]:
            archive.writestr(name, ET.tostring(content))


class ImportSheetTests(unittest.TestCase):
    def test_annotations_preserve_values_and_do_not_promote_unmarked_tags(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.xlsx"
            output = Path(directory) / "catalog.csv"
            write_fixture(source)
            import_sheet(source, output)
            first_output = output.read_bytes()
            with output.open(encoding="utf-8-sig") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["Автор"], "")
            self.assertEqual(rows[0]["№ "], "1")
            self.assertEqual(rows[0]["Рік"], "2009")
            self.assertEqual(rows[0]["Сторінка"], "9")
            self.assertEqual(rows[0]["Назва статті"], 'Review, "quoted"\nsecond line')
            self.assertEqual(rows[0]["Рубрика"], "Геополітика")
            self.assertEqual(rows[0]["Пошукові автори"], "Мамедов Рустам")
            self.assertEqual(rows[0]["Додаткові рубрики"], "Інтерв'ю")
            self.assertEqual(rows[1]["Пошукові автори"], "")
            self.assertEqual(rows[1]["Додаткові рубрики"], "")
            self.assertEqual(rows[1]["Автор"], "Автор Т.")
            import_sheet(source, output)
            self.assertEqual(output.read_bytes(), first_output)

    def test_bad_headers_do_not_overwrite_the_catalogue(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.xlsx"
            output = Path(directory) / "catalog.csv"
            write_fixture(source, valid_headers=False)
            output.write_text("keep this catalogue")
            with self.assertRaises(ValueError):
                import_sheet(source, output)
            self.assertEqual(output.read_text(), "keep this catalogue")


if __name__ == "__main__":
    unittest.main()
