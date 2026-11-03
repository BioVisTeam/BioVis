# Milestone 2 · Presentation data tables

Each PNG uses the same base name as its source CSV in `../data/processed/`.
There are no duplicate CSVs in this folder.

| Final PNG | Source CSV | Excel sheet |
| --- | --- | --- |
| `q3_county_svi.png` | `q3_county_svi.csv` — the same 12 selected county rows | Q3 County Sample |
| `q3_national_summary.png` | `q3_national_summary.csv` — all five rows | Q3 National Summary |
| `q4_correlations.png` | `q4_correlations.csv` — full 4 × 5 matrix | Q4 Correlations |

`q3_q4_tables.xlsx` contains the three native editable tables.
`q3_q4_tables.pdf` contains the same three pages as vector output.
All PNGs are **4320 × 2430 pixels, 300 dpi, 16:9**. Styling matches Startup.pdf
pages 18–19 and 25–26: Georgia Bold titles, Arial, navy `#0F2742` headers,
fine borders, white body cells, left-aligned labels and right-aligned numbers.

The Q4 n footnote reads `n_counties` from `q4_correlations_tidy.csv`; it does not
calculate sample sizes. Every coefficient retains its original CSV precision.
Prevalence and SVI formatting only adds trailing zeros, checked using exact
Decimal equality. FIPS is stored as text in Excel. The 135 rendered cells and
workbook values are verified in `../docs/validation/presentation_tables.json`.

To regenerate from BioVis: `python src/render_m2_data_tables.py --root .`.
The script uses locally installed Arial, Arial Bold and Georgia Bold; use
`--font-dir` to specify their directory. All data and statistical values are
read from the four canonical final CSVs and are not changed.
