"""Render three presentation tables from frozen CSV tokens; no statistics.

Requires PyMuPDF and openpyxl. Defaults match the local macOS fonts used by
Startup.pdf; --font-dir can point to Arial.ttf, Arial Bold.ttf, Georgia Bold.ttf.
All coefficients are rendered verbatim at their source CSV precision.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from decimal import Decimal
from pathlib import Path

import pymupdf as pdf
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.page import PageMargins

WIDTH, HEIGHT = 1440, 810
SCALE = 3
NAVY, INK, BLUE, MUTED = "0F2742", "16202E", "256ABF", "55606E"
BORDER, DIVIDER, WHITE = "8A8A8A", "DDDBD2", "FFFFFF"
MEASURES = ["DIABETES", "CHD", "BPHIGH", "OBESITY", "COPD"]
SAMPLE_FIPS = ["36005", "36047", "36061", "36081", "36085", "06037", "17031", "48201", "04013", "12086", "28049", "01001"]
LABELS = {"DIABETES": "Diabetes", "CHD": "Coronary heart disease (CHD)",
          "BPHIGH": "High blood pressure", "OBESITY": "Obesity", "COPD": "COPD"}
THEMES = {
    "RPL_THEME1": "1 · Socioeconomic Status",
    "RPL_THEME2": "2 · Household Characteristics",
    "RPL_THEME3": "3 · Racial and Ethnic\nMinority Status",
    "RPL_THEME4": "4 · Housing Type\nand Transportation",
}


def color(hex_value):
    return tuple(int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_tokens(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def formatted_prevalence(token):
    # Add a trailing .0 only when mathematically identical, never round.
    formatted = f"{Decimal(token):.1f}"
    assert Decimal(formatted) == Decimal(token)
    return formatted


def formatted_svi(token):
    formatted = f"{Decimal(token):.4f}"
    assert Decimal(formatted) == Decimal(token)
    return formatted


class Renderer:
    def __init__(self, font_dir):
        self.font_paths = {
            "Arial": Path(font_dir) / "Arial.ttf",
            "ArialBold": Path(font_dir) / "Arial Bold.ttf",
            "GeorgiaBold": Path(font_dir) / "Georgia Bold.ttf",
        }
        for path in self.font_paths.values():
            if not path.is_file():
                raise FileNotFoundError(f"Missing reference font: {path}")
        self.fonts = {k: pdf.Font(fontfile=str(p)) for k, p in self.font_paths.items()}
        self.records = []

    def text(self, page, rect, text, size, font="Arial", fill=INK, align="left", tag="text"):
        rect = pdf.Rect(rect)
        metrics = self.fonts[font]
        lines = text.split("\n")
        line_height = size * 1.16
        glyph_height = (metrics.ascender - metrics.descender) * size
        total_height = glyph_height + (len(lines) - 1) * line_height
        if total_height > rect.height + .1:
            raise ValueError(f"Text too tall in {tag}: {text}")
        baseline = rect.y0 + (rect.height - total_height) / 2 + metrics.ascender * size
        for line in lines:
            length = metrics.text_length(line, fontsize=size)
            if length > rect.width + .1:
                raise ValueError(f"Text too wide in {tag}: {line} ({length:.1f} > {rect.width:.1f})")
            x = rect.x0 if align == "left" else (rect.x1 - length if align == "right" else rect.x0 + (rect.width - length) / 2)
            page.insert_text((x, baseline), line, fontname=font, fontsize=size, color=color(fill))
            baseline += line_height
        self.records.append({"page": page.number + 1, "tag": tag, "text": text,
                             "font": font, "size": size, "rect": list(rect)})

    def page(self, document, spec):
        page = document.new_page(width=WIDTH, height=HEIGHT)
        for name, path in self.font_paths.items():
            page.insert_font(fontname=name, fontfile=str(path))
        page.draw_rect(page.rect, color=None, fill=color(WHITE))
        self.text(page, (68, 35, 1372, 60), f"{spec['question']} · DATA TABLES", 16.5,
                  font="ArialBold", fill=BLUE, tag="section")
        self.text(page, (68, 65, 1372, 120), spec["title"], 39,
                  font="GeorgiaBold", fill=NAVY, tag="title")
        page.draw_line((69, 163), (1372, 163), color=color(DIVIDER), width=1.5)
        self.table(page, spec)
        y = spec["notes_y"]
        for i, line in enumerate(spec["notes"]):
            self.text(page, (69, y, 1372, y + 23), line, 17.5, fill=MUTED, tag=f"note_{i}")
            y += 23
        if y > 752:
            raise ValueError("Footnotes would touch the footer")
        self.text(page, (68, 759, 1160, 783),
                  "Team 15 · BioVis · Information Visualization · Milestone 2", 15, fill=MUTED, tag="footer")
        self.text(page, (1170, 759, 1372, 783), spec["footer"], 14, fill=MUTED, align="right", tag="footer_label")
        return page

    def table(self, page, spec):
        x0, y0 = 69, spec["y"]
        widths, header_h, row_h = spec["widths"], spec["header_h"], spec["row_h"]
        x_edges = [x0]
        for w in widths:
            x_edges.append(x_edges[-1] + w)
        bottom = y0 + header_h + len(spec["rows"]) * row_h
        page.draw_rect((x0, y0, x_edges[-1], bottom), color=None, fill=color(WHITE))
        page.draw_rect((x0, y0, x_edges[-1], y0 + header_h), color=None, fill=color(NAVY))
        y_edges = [y0, y0 + header_h] + [y0 + header_h + (r + 1) * row_h for r in range(len(spec["rows"]))]
        for x in x_edges:
            page.draw_line((x, y0), (x, bottom), color=color(BORDER), width=.5)
        for y in y_edges:
            page.draw_line((x0, y), (x_edges[-1], y), color=color(BORDER), width=.5)
        for c, header in enumerate(spec["headers"]):
            self.text(page, (x_edges[c] + 12, y0 + 3, x_edges[c + 1] - 12, y0 + header_h - 3),
                      header, spec["header_font"], font="ArialBold", fill=WHITE,
                      align=spec["align"][c], tag=f"header_{c}")
        for r, row in enumerate(spec["rows"]):
            top = y0 + header_h + r * row_h
            for c, value in enumerate(row):
                font_size = spec["body_font"][c] if isinstance(spec["body_font"], list) else spec["body_font"]
                self.text(page, (x_edges[c] + 12, top + 2, x_edges[c + 1] - 12, top + row_h - 2),
                          value, font_size, align=spec["align"][c], tag=f"cell_{r}_{c}")


def build_specs(root):
    processed = root / "data/processed"
    counties = {r["county_fips"]: r for r in read_tokens(processed / "q3_county_svi.csv")}
    sample = [counties[fips] for fips in SAMPLE_FIPS]
    summary = read_tokens(processed / "q3_national_summary.csv")
    matrix = read_tokens(processed / "q4_correlations.csv")
    tidy = read_tokens(processed / "q4_correlations_tidy.csv")
    assert len(sample) == 12 and len(summary) == 5 and len(matrix) == 4
    assert [r["disease"] for r in summary] == MEASURES
    assert [r["theme"] for r in matrix] == list(THEMES)
    # Read existing counts only; never infer or recompute observations/correlations.
    n_tokens = {r["n_counties"] for r in tidy}
    assert len(n_tokens) == 1
    matrix_n = format(int(next(iter(n_tokens))), ",")
    sample_rows = [[r["county_fips"], f"{r['county']}, {r['state']}",
                    *(formatted_prevalence(r[f"{d}_adj"]) for d in MEASURES), formatted_svi(r["RPL_THEMES"])] for r in sample]
    specs = [
        {"name": "q3_county_svi", "question": "Q3", "footer": "Q3 · SAMPLE",
         "title": "Q3 data table: county-level sample (12 counties)",
         "headers": ["County\nFIPS", "County / State", "Diabetes\n(%)", "CHD\n(%)", "High blood\npressure (%)", "Obesity\n(%)", "COPD\n(%)", "Overall SVI\n(0–1)"],
         "rows": sample_rows, "source_rows": sample,
         "widths": [104, 308, 152, 112, 180, 132, 112, 205],
         "align": ["left", "left", *(["right"] * 6)], "y": 189, "header_h": 53, "row_h": 34.6,
         "header_font": 18, "body_font": 20, "notes_y": 680,
         "notes": [
             "Values: age-adjusted adult prevalence (%); Overall SVI is the national county percentile (0–1; higher = more vulnerable).",
             "Source: CDC PLACES 2025; CDC/ATSDR SVI 2022 (ACS 2018–2022). Five NYC counties + seven other counties; illustrative sample.",
             "File: data/processed/q3_county_svi.csv (12 selected rows). Published 95% confidence limits remain in the source CSV."]},
        {"name": "q3_national_summary", "question": "Q3", "footer": "Q3 · SUMMARY",
         "title": "Q3 data table: national association summary",
         "headers": ["Condition", "Spearman ρ", "Valid counties (n)"],
         "rows": [[LABELS[r["disease"]], r["correlation"], format(int(r["n_counties"]), ",")] for r in summary],
         "source_rows": summary, "widths": [650, 355, 300], "align": ["left", "right", "right"],
         "y": 205, "header_h": 60, "row_h": 64, "header_font": 23, "body_font": 27,
         "notes_y": 627, "notes": [
             "Basis: Overall SVI (RPL_THEMES) versus age-adjusted prevalence; unweighted counties, pairwise complete observations.",
             "Source: CDC PLACES 2025; CDC/ATSDR SVI 2022. Coefficients retain source CSV precision; associations are not causal.",
             "File: data/processed/q3_national_summary.csv. ρ is unitless (−1 to +1); n is the valid county count."]},
        {"name": "q4_correlations", "question": "Q4", "footer": "Q4 · MATRIX",
         "title": "Q4 data table: SVI themes × disease correlations",
         "headers": ["SVI theme", "Diabetes", "CHD", "High blood\npressure", "Obesity", "COPD"],
         "rows": [[THEMES[r["theme"]], *(r[d] for d in MEASURES)] for r in matrix],
         "source_rows": matrix, "widths": [440, 173, 173, 173, 173, 173],
         "align": ["left", *(["right"] * 5)], "y": 205, "header_h": 60, "row_h": 82,
         "header_font": 20, "body_font": [23, 20, 20, 20, 20, 20],
         "notes_y": 630, "notes": [
             f"Values: Spearman ρ (unitless, −1 to +1), using age-adjusted prevalence; n = {matrix_n} valid counties in every cell.",
             "Source: CDC PLACES 2025; CDC/ATSDR SVI 2022. National county theme rankings; pairwise complete, unweighted.",
             "File: data/processed/q4_correlations.csv (n: q4_correlations_tidy.csv). Coefficients retain source CSV precision.",
             "No missing values are filled. Correlation describes association, not causation. CHD = coronary heart disease."]},
    ]
    return specs


def excel_numeric_format(token):
    decimals = max(0, -Decimal(token).as_tuple().exponent)
    return "0" + ("." + "0" * decimals if decimals else "")


def write_workbook(path, specs):
    wb = Workbook()
    wb.remove(wb.active)
    sheet_names = ["Q3 County Sample", "Q3 National Summary", "Q4 Correlations"]
    column_widths = [[15, 33, 16, 12, 20, 14, 12, 18], [53, 28, 25], [49, 21, 21, 21, 21, 23]]
    edge = Side(style="thin", color=BORDER)
    for spec, name, widths in zip(specs, sheet_names, column_widths):
        ws = wb.create_sheet(name)
        ncol = len(spec["headers"])
        ws.sheet_view.showGridLines = False
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=ncol)
        ws.cell(1, 1, f"{spec['question']} · DATA TABLES").font = Font(name="Arial", size=12, bold=True, color=BLUE)
        ws.row_dimensions[1].height = 24
        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ncol)
        ws.cell(2, 1, spec["title"]).font = Font(name="Georgia", size=24, bold=True, color=NAVY)
        ws.row_dimensions[2].height = 42
        for c, (label, width) in enumerate(zip(spec["headers"], widths), 1):
            cell = ws.cell(5, c, label)
            cell.fill = PatternFill("solid", fgColor=NAVY)
            cell.font = Font(name="Arial", size=14, bold=True, color=WHITE)
            cell.alignment = Alignment(horizontal=spec["align"][c - 1], vertical="center", wrap_text=True)
            cell.border = Border(left=edge, right=edge, top=edge, bottom=edge)
            ws.column_dimensions[cell.column_letter].width = width
        ws.row_dimensions[5].height = 42
        for row_i, row in enumerate(spec["rows"], 6):
            for col_i, display_value in enumerate(row, 1):
                numeric = spec["align"][col_i - 1] == "right"
                token = display_value.replace(",", "") if numeric else display_value
                value = float(token) if numeric else token
                cell = ws.cell(row_i, col_i, value)
                cell.font = Font(name="Arial", size=14, color=INK)
                cell.fill = PatternFill("solid", fgColor=WHITE)
                cell.alignment = Alignment(horizontal=spec["align"][col_i - 1], vertical="center", wrap_text=True)
                cell.border = Border(left=edge, right=edge, top=edge, bottom=edge)
                cell.number_format = excel_numeric_format(token) if numeric else "@"
                if numeric and spec["name"] == "q3_national_summary" and col_i == 3:
                    cell.number_format = "#,##0"
            ws.row_dimensions[row_i].height = 36 if spec["question"] == "Q4" else 27
        note_row = len(spec["rows"]) + 8
        for line in spec["notes"]:
            ws.merge_cells(start_row=note_row, start_column=1, end_row=note_row, end_column=ncol)
            cell = ws.cell(note_row, 1, line)
            cell.font = Font(name="Arial", size=11, color=MUTED)
            cell.alignment = Alignment(wrap_text=True, vertical="center")
            ws.row_dimensions[note_row].height = 30
            note_row += 1
        ws.freeze_panes = "C6" if spec["name"] == "q3_county_svi" else "B6"
        ws.print_options.horizontalCentered = True
        ws.page_setup.orientation = "landscape"
        ws.page_setup.paperSize = ws.PAPERSIZE_A3
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 1
        ws.sheet_properties.pageSetUpPr.fitToPage = True
        ws.page_margins = PageMargins(left=.3, right=.3, top=.3, bottom=.3, header=.1, footer=.1)
        ws.print_area = f"A1:{get_column_letter(ncol)}{note_row}"
    wb.save(path)
    # Actual workbook round trip: no formulas; all editable data retain values.
    saved = load_workbook(path, data_only=False)
    for ws, spec in zip(saved.worksheets, specs):
        for r, row in enumerate(spec["rows"], 6):
            for c, token in enumerate(row, 1):
                v = ws.cell(r, c).value
                if spec["align"][c - 1] == "right":
                    assert Decimal(str(v)) == Decimal(token.replace(",", ""))
                else:
                    assert v == token


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--font-dir", type=Path, default=Path("/System/Library/Fonts/Supplemental"))
    args = parser.parse_args()
    root = args.root.resolve()
    out = root / "presentation_tables"
    out.mkdir(exist_ok=True)
    inputs = [root / "data/processed" / n for n in ["q3_county_svi.csv", "q3_national_summary.csv", "q4_correlations.csv", "q4_correlations_tidy.csv"]]
    original_hashes = {p.name: sha(p) for p in inputs}
    specs = build_specs(root)
    renderer = Renderer(args.font_dir)
    document = pdf.open()
    for spec in specs:
        renderer.page(document, spec)
    pdf_path = out / "q3_q4_tables.pdf"
    document.save(pdf_path, garbage=4, deflate=True)
    document.close()
    final = pdf.open(pdf_path)
    qa_cells = []
    for page, spec in zip(final, specs):
        pixmap = page.get_pixmap(matrix=pdf.Matrix(SCALE, SCALE), alpha=False)
        pixmap.set_dpi(300, 300)
        pixmap.save(out / f"{spec['name']}.png")
        # Compare the actual final PDF's cell text with the source-based spec.
        page_records = [r for r in renderer.records if r["page"] == page.number + 1 and r["tag"].startswith("cell_")]
        for record in page_records:
            rect = pdf.Rect(record["rect"])
            # Embedded Arial maps the visible hyphen glyph to U+00AD in PDF extraction.
            actual = page.get_textbox(rect).strip().replace("\u00ad", "-")
            assert actual == record["text"], (record, actual)
            qa_cells.append({"table": spec["name"], "cell": record["tag"], "text": actual, "passed": True})
    write_workbook(out / "q3_q4_tables.xlsx", specs)
    assert {p.name: sha(p) for p in inputs} == original_hashes
    manifest = {
        "status": "completed", "source_csv_sha256": original_hashes,
        "statistics_recalculated": False, "source_csvs_modified": False,
        "coefficient_display": "Original CSV tokens, full source precision; no rounding",
        "prevalence_display": "One decimal; Decimal equality checked, no value changes",
        "svi_display": "Four decimals; Decimal equality checked, no value changes",
        "reference": "Startup.pdf pages 18–19 and 25–26; 1440 × 810 points, Georgia Bold + Arial, #0F2742 navy header, white cells as requested",
        "png_pixels": [WIDTH * SCALE, HEIGHT * SCALE], "png_dpi": 300,
        "pdf_extraction_note": "Visible Arial hyphen glyph U+00AD normalized to ASCII hyphen only for text comparison; source/drawn tokens unchanged",
        "workbook": "3 native editable sheets; numeric values retained; county FIPS stored as text; no formulas",
        "rendered_cell_checks": qa_cells,
        "files": {p.name: {"bytes": p.stat().st_size, "sha256": sha(p)} for p in sorted(out.iterdir()) if p.is_file() and p.suffix in {".png", ".pdf", ".xlsx"}},
    }
    validation_dir = root / "docs/validation"
    validation_dir.mkdir(parents=True, exist_ok=True)
    (validation_dir / "presentation_tables.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": manifest["status"], "png_pixels": manifest["png_pixels"],
                      "checked_rendered_cells": len(qa_cells), "outputs": list(manifest["files"])}, indent=2))


if __name__ == "__main__":
    main()
