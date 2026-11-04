# BioVis · Q5 and Q6 · Initial data tables

Initial data tables for **Q5** (do the tracts with the highest prevalence also have the most affected residents?, NYC case study) and **Q6** (how does the set of potentially high-priority communities change with the criterion and the threshold?, whole US). These are the starting tables, not the final ones: flags, percentiles and thresholds are added when the interactive versions are built.

## Unit of analysis

| Question | Unit | Rate type | Why |
|---|---|---|---|
| Q5 | NYC census tract (2,231 tracts in 5 counties) | **crude** | the PLACES tract file has no age-adjusted columns; counts need crude prevalence, because age-adjusted rates do not describe the actual local population |
| Q6 | US census tract (83,522 PLACES rows) | **crude** | same file; SVI is joined on as the social vulnerability criterion |

## Files

| Path | What |
|---|---|
| `build_q5_q6.py` (Colab cell) | raw PLACES and SVI files to the two tables below |
| `PLACES__Census_Tract_Data__GIS_Friendly_Format___2025_release_20261019.csv` | PLACES tract file, 2025 release, all US tracts (input) |
| `SVI_2022_US.csv` | CDC/ATSDR Social Vulnerability Index 2022, US tracts (input) |
| `q5.csv` | one row per NYC tract: identifiers, borough, adult population, and for each of five conditions the crude prevalence and the estimated number of affected adults |
| `q6.csv` | one row per US tract: identifiers, adult population, the same prevalence and count columns, and the overall SVI percentile (`RPL_THEMES`) |

## Reproduce

1. Open a new Colab notebook and upload both input CSVs to `/content`.
2. Paste the build code into one cell and run it. It writes `q5.csv` and `q6.csv` and downloads them.

Run the read, clean and write steps in a single cell. The files must be read with `dtype=str`, otherwise the tract codes load as numbers and lose their leading zeros.

## Columns

| Column | Type or unit | Meaning | Source or transformation |
|---|---|---|---|
| `TractFIPS` | Text, 11 digits | Census tract code; join key between PLACES and SVI | PLACES, read as text |
| `StateAbbr` | Text | State abbreviation | PLACES |
| `CountyFIPS` | Text, 5 digits | County code | first 5 characters of `TractFIPS` |
| `Borough` (Q5 only) | Text | NYC borough name | mapped from `CountyFIPS` |
| `TotalPop18plus` | Count | Adults 18 and older in the tract; the denominator for counts | PLACES, commas removed |
| `{m}_CrudePrev` | % of adults | Model-based crude prevalence of condition `{m}` | PLACES |
| `{m}_EstCount` | Count of adults | Estimated adults with the condition | derived: `{m}_CrudePrev / 100 * TotalPop18plus` |
| `RPL_THEMES` (Q6 only) | 0 to 1 | Overall SVI percentile, higher means more vulnerable | SVI; `-999` set to blank |

`{m}` is one of five conditions: `DIABETES`, `BPHIGH` (high blood pressure), `CASTHMA` (current asthma), `COPD`, `CHD` (coronary heart disease).

## Transformations

- Both input files are read as text. Population strings like `"1,370"` become numbers.
- Estimated affected adults = crude prevalence / 100 x adults 18+, per condition. Only condition measures are used. Screening and checkup measures use subgroup denominators (for example women 50 to 74), so a count based on all adults would be wrong.
- Q5: tracts selected by county FIPS 36005 (Bronx), 36047 (Brooklyn), 36061 (Manhattan), 36081 (Queens) and 36085 (Staten Island).
- Q5 "All conditions" view: sum the five `_EstCount` columns. This counts a person once per condition, so it measures condition cases, not people. Divided by `TotalPop18plus` it gives cases per adult, not a prevalence, and can exceed 100 per 100 adults.
- Q6: PLACES is left-joined to SVI on the 11-digit tract code. SVI's `-999` code means missing and is set to blank.
- Q6 criteria, applied later as sliders: prevalence (`_CrudePrev`), affected population (`_EstCount`) and social vulnerability (`RPL_THEMES`). Cutoffs on each are applied to national values, so a tract can be selected under one criterion and not another.
- Aggregation: none. Both tables stay at the tract level.

## Checks

- **Row counts.** Q5 has 2,231 tracts: Brooklyn 776, Queens 684, Bronx 347, Manhattan 304, Staten Island 120. Q6 has 83,522  tracts, the full PLACES tract file.
- **Join.** Both files use 11-character tract codes. Of the 83,522 PLACES tracts, 83,287 have a usable SVI score. The other 235 have a blank `RPL_THEMES` (not found in the SVI file, or coded `-999`). The SVI file has 84,120 tracts, and those without a PLACES row are dropped by the left join.
- **Missing estimates.** Some US tracts have no estimate or no adult population for a condition, so their `_CrudePrev` is blank or their `_EstCount` is blank or 0. A check on diabetes found about 4,700 such tracts nationally. All 2,231 NYC tracts have a diabetes estimate.
- **Count check.** `_EstCount` cannot exceed `TotalPop18plus`, because prevalence is at most 100%.

## Limits

- PLACES values are model-based estimates, not direct counts, and neighboring tracts are smoothed together. 
- The count is built from prevalence, so the two axes in Q5 are partly correlated by construction.
- Small tracts have unstable prevalence, so extreme rates cluster there and prevalence-based selection is sensitive to them.
- SVI and PLACES cover different periods (SVI 2022 uses ACS 2018 to 2022), so SVI is context and is not exactly aligned with the prevalence estimates. SVI themes also overlap with some PLACES model inputs (poverty, education, race and ethnicity), so the criteria are not fully independent.

- ## AI use statement
- I used Claude, an AI assistant made by Anthropic, to help with code and writing in this project. It helped me write and debug the Python code that cleans the PLACES and SVI data and builds the tables, and it helped me edit the wording of plans, documentation and the README.
