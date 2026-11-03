# BioVis · Milestone 2 · Q1 and Q2

Data tables and matplotlib sketches for **Q1** (national county variation) and **Q2**
(within-county variation, NYC). D3 versions come in Milestone 3.

## Unit of analysis

| Question | Unit | Rate type | Why |
|---|---|---|---|
| Q1 | US county (3,143 PLACES rows) | age-adjusted | counties differ in age mix; the county file provides adjusted values |
| Q2 | NYC census tract (2,231 with estimates) in 5 counties | **crude** | the tract file has no age-adjusted columns; the county number used for comparison is also crude, so both are like-for-like |

## Files

| Path | What |
|---|---|
| `src/build_tables.py` | raw PLACES files to the four processed tables |
| `src/make_sketches.py` | Q1 and Q2 sketches (matplotlib), written to `figures/` |
| `src/make_slide_figs.py` | same sketches at slide size, no in-figure titles, written to `figures/slides/` |
| `src/make_report_tables.py` | sample tables as markdown, written to `docs/sample_tables.md` |
| `src/extract_nyc_tracts.py` | cuts the NYC rows out of the full PLACES tract CSV (only needed to rebuild the extract) |
| `data/raw/places_2025_county_gis.csv` | PLACES county, 2025 release (shared with Q3/Q4; byte-identical to the file Q1 used) |
| `data/raw/places_2025_tract_nyc.csv` | PLACES tract file, **NYC rows only** (2,231 rows copied unchanged from the 75 MB national file) |
| `data/raw/boundaries/` | Census 2023 cartographic boundary zips (county 1:20m, NY tracts 1:500k) |
| `data/processed/q1_county_prevalence.csv` | one row per county: adult population, five conditions (age-adjusted, 95% CI), quintile class, missing flag |
| `data/processed/q1_national_summary.csv` | per condition: n, min, p10, median, p90, max, p90 minus p10, lowest and highest county |
| `data/processed/q2_nyc_tracts.csv` | one row per NYC tract: crude prevalence, CI, CI width, county value, tract minus county, small-population flag, point location |
| `data/processed/q2_nyc_borough_summary.csv` | per condition and borough: tract spread against the county value |
| `figures/` | sketches (`q1_sketch_*.png`, `q2_sketch_*.png`) |
| `docs/sample_tables.md` | sample rows of each table |

## Reproduce

```bash
pip install -r requirements_q1_q2.txt
python src/build_tables.py        # data/processed/q1_*.csv, q2_*.csv
python src/make_sketches.py       # figures/*.png
python src/make_slide_figs.py     # figures/slides/*.png
python src/make_report_tables.py  # docs/sample_tables.md
```

No download is needed: every input is in `data/raw/`. The full national tract file is not committed (75 MB).
To rebuild the extract: download https://data.cdc.gov/d/yjkw-uj5s (GIS-friendly CSV) and run
`python src/extract_nyc_tracts.py PATH_TO_THAT_FILE`.
Boundary files: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html
(`cb_2023_us_county_20m.zip`, `cb_2023_36_tract_500k.zip`). County PLACES: https://data.cdc.gov/d/i46a-9kgh.

## Transformations

- Column names stripped (one PLACES header has a trailing tab); population strings like `"14,369"` converted to numbers.
- 95% CI strings `"( 8.2, 11.5)"` split into `_lo` / `_hi` numbers.
- Q1: five outcomes (diabetes, CHD, high blood pressure, obesity, COPD). `_quintile` = equal-count classes over counties that have an estimate; missing stays missing.
- Q2: NYC tracts selected by county FIPS 36005, 36047, 36061, 36081, 36085. Tract point taken from `Geolocation`. Each tract is compared with its county's crude estimate (`_minus_county`). Tracts with fewer than 500 adults (21) are flagged and left out of summary statistics.
- Aggregation: none for Q1. Q2 borough summaries are percentiles over tracts with 500+ adults.

## Checks

- **Missing estimates.** 187 PLACES county rows have no estimate: all 120 Kentucky and 67 Pennsylvania counties. **Loving County, TX is not in the PLACES file at all**, so it has no row in `q1_county_prevalence.csv` (3,143 rows). It appears in the SVI data and the boundary file, so the Q3 table has 3,144 rows. Counting Loving, 188 counties have no PLACES estimate. Maps draw all of them hatched gray, never as zero.
- **Agreement with Q3/Q4.** All 3,143 counties in both tables have identical values in 16 columns (adult population, and for each of the five conditions the age-adjusted prevalence and both CI limits), and the same missing counties. Q1 uses `places_2025_county_gis.csv`, the same file as Q3/Q4.
- **Joins.** All 3,143 PLACES counties join to the 2023 county boundary file by 5-digit FIPS (Connecticut planning regions included). All 2,231 NYC PLACES tracts join to the 2023 NY tract file by 11-digit ID; 93 of 2,324 NYC boundary tracts have no PLACES estimate and are drawn dotted gray.
- Sketch maps cover all 50 states (Alaska and Hawaii as insets). Puerto Rico has no PLACES estimates and is left out.

## Limits

- The tract file is crude only, so Q2 differences between boroughs partly reflect age structure. Compare tracts with each other and with the county's crude value, never with Q1's age-adjusted values.
- PLACES values are model-based. The model (CDC methodology) uses individual age, sex, race/ethnicity and education, county-level percent of adults below 150% of poverty, and state and county random effects. Tract values come from applying that model to 2020 census block counts. Tract differences inside a county therefore reflect demographic composition; they are modeled variation.
- PLACES 2025 and SVI 2022 (ACS 2018 to 2022) cover different periods.
- Associations are not causal.
