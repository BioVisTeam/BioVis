# BioVis · Milestone 2 · Q3/Q4

Data transformation and three presentation data tables are complete. File names
follow Startup's `q1_county_prevalence.csv` / `q1_national_summary.csv` pattern:
**question + data unit/content**. There is one canonical copy of each dataset.

```text
BioVis/
├── data/
│   ├── raw/                         # two unmodified CDC source CSVs
│   └── processed/                   # four canonical final CSVs + slide exports
│       ├── q3_county_svi.csv         # shared county data, 3,144 rows
│       ├── q3_national_summary.csv   # five overall-SVI correlations + n
│       ├── q4_correlations.csv       # 4 × 5 coefficient matrix
│       └── q4_correlations_tidy.csv  # 20 coefficients + pairwise n
│   ├── q3_county_svi.png             # 12 selected rows of the county table
│   ├── q3_national_summary.png       # five national associations
│   ├── q4_correlations.png           # full correlation matrix
│   ├── q3_q4_tables.xlsx             # three editable tables
│   └── q3_q4_tables.pdf              # three vector table pages
├── notebooks/q3_q4_transformation.ipynb
├── src/
├── docs/validation/                 # cleaning checks and provenance
└── q3_q4_transformation_notes.md
```

## Exactly which CSV makes each table?

| Presentation table | Canonical CSV | Selection |
| --- | --- | --- |
| Q3 county sample | `data/processed/q3_county_svi.csv` | The same 12 fixed FIPS; no separate sample CSV |
| Q3 national summary | `data/processed/q3_national_summary.csv` | All five rows |
| Q4 correlation matrix | `data/processed/q4_correlations.csv` | All four theme rows and five disease columns |

The Q4 sample-size footnote reads the existing `n_counties` values from
`q4_correlations_tidy.csv`. It does not require another counts CSV.
The table renderer only selects/formats existing values; it never recomputes
statistics. Full source precision is retained for every coefficient.

The four canonical final CSVs are unchanged by the file cleanup. Three slide CSVs and three matching TSVs are also included as presentation exports. The former sample file and
count matrix duplicated subsets of these tables and have been removed. Raw
source copies are kept once in `data/raw`; there is no extra `source_csv` folder.
Cleaning records, unmatched counties, missingness, schema checks and source
hashes are retained together in `docs/validation`, outside the final-data folder.

## Reproduce

Open [the executed notebook](../notebooks/q3_q4_transformation.ipynb) in Google Colab.
All processing code is included; no clone or local Python installation is needed.
Upload the two official source CSVs, or use the included cached files locally.
The Q1 file is optional; the user confirmed none is available.

- [CDC PLACES 2025 County GIS-Friendly](https://data.cdc.gov/d/i46a-9kgh)
  → `data/raw/places_2025_county_gis.csv`.
- [CDC/ATSDR SVI download selector](https://svi.cdc.gov/dataDownloads/data-download.html):
  2022 / United States / Counties / CSV, national rankings
  → `data/raw/svi_2022_us_county.csv`.

From BioVis, with the listed Python dependencies installed:

```sh
python src/q3_q4_transform.py --root . --no-download
```

The transformation exports four final CSVs to `data/processed` and verification
records to `docs/validation`. The renderer reads those four final CSVs and exports
only the three PNGs, one editable workbook and one PDF. It creates no data copies.
PNG dimensions are 4320 × 2430, 300 dpi, 16:9. Styling follows Startup.pdf.

Actual input/merge results: PLACES 3,143 counties; SVI 3,144; 3,143 matched.
Loving TX (`48301`) is SVI-only and retained. Each disease has 188 missing values:
120 KY, 67 PA, plus Loving. All five NYC counties match. All 25 coefficients use
2,956 unweighted complete pairs; all 63 original data checks passed. The files
and statistics were not recomputed during cleanup. The Colab upload interface
has not been tested in a hosted Colab session; the statistical notebook was
actually executed locally, with all original intermediate results retained.

See [transformation notes](../q3_q4_transformation_notes.md) for the column dictionary,
Plan / Data Table / Table Details, sources and limitations. Names follow
Startup's `pop18plus`, `{m}_adj`, `{m}_adj_lo`, `{m}_adj_hi`. Exact Q1 CSV alignment
cannot be checked because no teammate Q1 CSV exists in this workspace.

AI (OpenAI Codex/ChatGPT) assisted in reading the supplied materials and preparing
the code, notebook, tables and documentation. Empirical values came from the two
supplied CDC exports; no synthetic data or fabricated coefficients were used.
No visualization sketches or final report were produced. Associations are not
causal; model inputs, data periods and spatial dependence are documented in the
notes. Future Observable/D3 views can load the four static CSVs with
`FileAttachment`; retain FIPS as text and numeric blanks as null.
