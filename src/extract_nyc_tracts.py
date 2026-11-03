"""Cut the NYC rows out of the full PLACES tract file so the repo does not carry 75 MB.
Rows are copied unchanged (no values edited); only rows for NYC's five counties are kept.

Input : the full PLACES tract CSV (https://data.cdc.gov/d/yjkw-uj5s, GIS-friendly, 2025 release)
Output: data/raw/places_2025_tract_nyc.csv
Run   : python src/extract_nyc_tracts.py PATH_TO_FULL_TRACT_CSV
"""
import csv
import sys
from pathlib import Path

NYC = {"36005", "36047", "36061", "36081", "36085"}  # Bronx, Brooklyn, Manhattan, Queens, Staten Island
src = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / "data/raw/places_2025_tract_nyc.csv"
with open(src, newline="", encoding="utf-8-sig") as f, open(out, "w", newline="", encoding="utf-8") as g:
    r = csv.reader(f); w = csv.writer(g, quoting=csv.QUOTE_ALL)
    head = next(r); w.writerow(head)
    i = [h.strip() for h in head].index("CountyFIPS")
    n = 0
    for row in r:
        if row[i].zfill(5) in NYC:
            w.writerow(row); n += 1
print(f"kept {n} NYC tract rows -> {out}")
