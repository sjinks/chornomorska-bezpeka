"""Import Google Sheets XLSX values and owner-approved search annotations."""

import argparse
import csv
from decimal import Decimal
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

NAMESPACE = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SEARCH_AUTHORS = "Пошукові автори"
ADDITIONAL_CATEGORIES = "Додаткові рубрики"
GREEN_FILL = "FFD9EAD3"
RED_TEXT = "FFFF0000"
GENRE_TAGS = {"Інтерв'ю", "Рецензія"}
ROOT = Path(__file__).resolve().parent.parent


def text_value(element):
    return "".join(node.text or "" for node in element.findall(".//s:t", NAMESPACE))


def red_text(element):
    parts = []
    for run in element.findall("s:r", NAMESPACE):
        color = run.find("s:rPr/s:color", NAMESPACE)
        if color is not None and color.get("rgb", "").upper() == RED_TEXT:
            parts.append(text_value(run))
    return "".join(parts)


def split_lines(value):
    lines = (line.strip() for line in value.splitlines())
    return list(dict.fromkeys(line for line in lines if line))


def read_cell_value(cell, shared_strings):
    cached_value = cell.find("s:v", NAMESPACE)
    cell_type = cell.get("t", "n")

    if cell_type == "s" and cached_value is not None:
        content = shared_strings[int(cached_value.text)]
        return text_value(content), content

    if cell_type == "inlineStr":
        content = cell.find("s:is", NAMESPACE)
        return text_value(content), content

    value = cached_value.text if cached_value is not None else ""
    if value and cell_type == "n":
        number = Decimal(value)
        if number == number.to_integral_value():
            value = str(int(number))
        else:
            value = format(number, "f")

    return value, None


def has_green_fill(cell, cell_styles, fills):
    style = cell_styles[int(cell.get("s", "0"))]
    fill = fills[int(style.get("fillId", "0"))]
    color = fill.find("s:patternFill/s:fgColor", NAMESPACE)
    return color is not None and color.get("rgb", "").upper() == GREEN_FILL


def read_sheet(source):
    with ZipFile(source) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_strings = ElementTree.fromstring(
                archive.read("xl/sharedStrings.xml")
            )

        styles = ElementTree.fromstring(archive.read("xl/styles.xml"))
        sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    fills = styles.find("s:fills", NAMESPACE)
    cell_styles = styles.find("s:cellXfs", NAMESPACE)
    rows = []

    for source_row in sheet.findall("s:sheetData/s:row", NAMESPACE):
        cells = {}
        for cell in source_row.findall("s:c", NAMESPACE):
            value, content = read_cell_value(cell, shared_strings)
            column = "".join(
                character for character in cell.get("r") if character.isalpha()
            )
            cells[column] = {
                "value": value,
                "green": has_green_fill(cell, cell_styles, fills),
                "red": red_text(content) if content is not None else "",
            }

        if cells:
            rows.append(cells)

    return rows


def import_sheet(source, output):
    rows = read_sheet(source)
    headers = {column: cell["value"] for column, cell in rows[0].items()}
    required = {
        "Автор",
        "Рубрика",
        "Назва статті",
        "Теги",
        "Рік",
        "№ ",
        "(№)",
        "Сторінка",
    }
    if not required.issubset(headers.values()):
        raise ValueError("The worksheet does not have the expected catalogue headers")

    tag_column = next(column for column, name in headers.items() if name == "Теги")
    records = []
    for cells in rows[1:]:
        record = {
            name: cells.get(column, {}).get("value", "")
            for column, name in headers.items()
        }
        if not any(record.values()):
            continue
        tags = cells.get(tag_column, {})
        categories = split_lines(tags.get("red", ""))
        authors = []
        if tags.get("green"):
            authors = [
                name
                for name in split_lines(tags.get("value", ""))
                if name not in categories and name not in GENRE_TAGS
            ]
        record[SEARCH_AUTHORS] = "\n".join(authors)
        record[ADDITIONAL_CATEGORIES] = "\n".join(categories)
        records.append(record)

    with Path(output).open("w", encoding="utf-8-sig", newline="") as target:
        fields = list(headers.values()) + [SEARCH_AUTHORS, ADDITIONAL_CATEGORIES]
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Google Sheets XLSX export")
    parser.add_argument(
        "--output", type=Path, default=ROOT / "chornomorska-catalog.csv"
    )
    arguments = parser.parse_args()
    records = import_sheet(arguments.source, arguments.output)
    print(f"Imported {len(records)} publications")
    print(
        f"Search-author annotations: {sum(bool(row[SEARCH_AUTHORS]) for row in records)}"
    )
    print(
        f"Additional-category annotations: {sum(bool(row[ADDITIONAL_CATEGORIES]) for row in records)}"
    )


if __name__ == "__main__":
    main()
