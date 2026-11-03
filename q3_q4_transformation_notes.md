# BioVis · Milestone 2 · Q3/Q4 Data Transformation

<!-- RUN_STATUS_START -->

**Current status: empirical transformation completed at 2026-11-02T20:47:33.524736+00:00; implemented validation checks passed.**

Actual computed results are in the generated-results section. Source hashes and download records are in the run manifest. An uploaded file's release year and national ranking universe still require confirmation against the original CDC export. Q1 alignment status is recorded separately and may remain unresolved.

<!-- RUN_STATUS_END -->

This document covers data transformation only. Views and interactions below are future plans. No sketches, visualizations, causal analysis, gap scores or final report are produced.

## Reference alignment

Read and used:

- `Information Visualization Project Proposal.docx`: five outcomes, 2025 PLACES / 2022 SVI, Q3 and Q4 questions, national county comparisons and NYC highlighting.
- `Team15.M1.feedback.pdf`, pp. 1–2: fix the analysis unit, identify shared model inputs, distinguish data periods, use association wording, document data access and AI use.
- `Startup.pdf`, slides 12–13, 18–21, 25–28: Plan / Data Table / Table Details format; `county_fips`, `state`, `county`, `pop18plus`, `{m}_adj`, `{m}_adj_lo`, `{m}_adj_hi`; borough labels Bronx, Brooklyn, Manhattan, Queens, Staten Island.

The Q3/Q4 unit is **one US county or county equivalent**, including DC, Alaska and Hawaii; no Puerto Rico or other territories. NYC five counties are highlighted within the national county data. Q2/Q5/Q6 remain NYC census-tract analyses and are outside this work.

The proposal's older preprocessing paragraph refers broadly to an 11-digit tract join, removal of missing/small-population tracts and a gap score. Those steps do **not** apply here: this work follows the user's county-level specification and the feedback. SVI uses CDC's published national **county** rankings. Tract percentiles are never averaged. Missing counties/estimates are retained. The gap score stays outside the core, consistent with Startup slide 9.

The supplied PLACES CSV independently confirms Startup's reported 3,143 counties and 187 counties without each of the five selected estimates (120 KY, 67 PA). These counts were calculated from the actual CSV and were not hard-coded as cleaning targets. The supplied SVI CSV has 3,144 counties, including Loving County TX (`48301`), which is absent from PLACES. The shared outer join preserves Loving as `svi_only`, yielding 3,144 rows and 188 missing values per disease/CI column. A county-equivalent count must be read from the particular release, not inferred from a general current CDC page.

Startup's source overview lists tract-level SVI and slide 5 allows an owner decision on county SVI. For Q3/Q4, this is resolved in favor of the official national county CSV, as the user requires. The slides should eventually identify this additional county-level SVI source.

## Q3

**Question.** How is chronic disease prevalence associated with overall social vulnerability across US counties, and how do NYC's five counties compare with the national pattern?

### Plan

**Unit and Data.** One county/county equivalent. CDC PLACES 2025 County GIS-Friendly (`i46a-9kgh`): age-adjusted adult prevalence and 95% CIs for diabetes, CHD, high blood pressure, obesity and COPD; adult population where provided. CDC/ATSDR SVI 2022: `RPL_THEMES`, ranked against the US county universe. County names remain official source labels; borough labels are separate.

**Transformations.** Inspect actual headers, as-read types, rows and duplicates. Normalize valid county FIPS to five-character strings. Select published adjusted values and split adjusted CI strings. Convert source missing tokens and `-999` to NA; retain a cell-level audit. Convert other out-of-range/unparseable values to NA with their original values recorded. Outer-join once by FIPS, with one-to-one validation, and keep a join-status flag. Preserve all in-scope source counties and original missingness. Compute five national unweighted pairwise-complete Spearman coefficients. Add NYC and borough flags and a fixed 12-county documentation sample.

**How it answers the question.** A common county table supports national association views with the same five NYC counties marked. The five coefficients summarize monotonic national patterns without claiming causation. NYC is included in each national calculation when its paired values are available; no separate correlation based on only five NYC counties is estimated.

**Views — future plan only.** County scatterplot of `RPL_THEMES` (x: 0–1) against selected adjusted prevalence (y: %); distinguish NYC using labels and symbol outlines. A linked national county map may locate selected counties. Show missing-pair counts explicitly. CI fields support uncertainty inspection.

**Interaction — future plan only.** Switch disease; hover to show county, adjusted estimate, 95% CI and SVI; highlight NYC; brush a scatterplot range to highlight corresponding counties on a linked map. Use fixed axes within a condition and label missing values. Q3/Q4 do not depend on a browser statistics engine.

**Risks.** Different data periods; missing modeled estimates; partial overlap of PLACES inputs and SVI factors; geography vintage differences; ecological and spatial dependence; uncertainty not incorporated into the rank correlation; NYC is only five counties. No disease counts are estimated by multiplying age-adjusted prevalence by population.

### Data Table

The actual 12-county sample and overall-SVI correlations are displayed in the generated-results section and exported as CSVs. The executed notebook also shows all sample columns, including the confidence limits.

The fixed sample selects NYC five counties plus Los Angeles CA (`06037`), Cook IL (`17031`), Harris TX (`48201`), Maricopa AZ (`04013`), Miami-Dade FL (`12086`), Hinds MS (`28049`) and Autauga AL (`01001`). It provides geographic/contextual breadth and is not a statistically representative sample. The selected rows in q3_county_svi.csv retain CIs and all shared fields, even when the compact Markdown table omits them for readability.

### Table Details — Column Definitions

| Column | Type / unit | Meaning / source |
| --- | --- | --- |
| `county_fips` | Text, five digits | State + county FIPS; join key; preserve leading zeros |
| `state` | Text, postal abbreviation | PLACES `StateAbbr`; SVI `ST_ABBR` for SVI-only rows |
| `county` | Text | PLACES `CountyName`; SVI `COUNTY` for SVI-only rows |
| `pop18plus` | Count, nullable | PLACES `TotalPop18plus`, adults aged 18+, Census 2023 estimate according to CDC's release dictionary; context only, never a weight |
| `DIABETES_adj` | Percent, 0–100 | Published age-adjusted adult diagnosed diabetes prevalence |
| `CHD_adj` | Percent, 0–100 | Published age-adjusted adult coronary heart disease prevalence |
| `BPHIGH_adj` | Percent, 0–100 | Published age-adjusted adult high blood pressure prevalence |
| `OBESITY_adj` | Percent, 0–100 | Published age-adjusted adult obesity prevalence |
| `COPD_adj` | Percent, 0–100 | Published age-adjusted adult COPD prevalence |
| `{m}_adj_lo`, `{m}_adj_hi` | Percent, nullable | Published adjusted 95% confidence limits, parsed from `{m}_Adj95CI` |
| `RPL_THEMES` | Number, 0–1 | CDC-published overall national county SVI percentile; higher = more vulnerable |
| `RPL_THEME1` ... `RPL_THEME4` | Number, 0–1 | Four CDC-published national county theme percentiles, retained for Q4 reuse |
| `is_nyc` | Boolean | FIPS in NYC five-county set |
| `borough` | Text, nullable | `36005` Bronx; `36047` Brooklyn; `36061` Manhattan; `36081` Queens; `36085` Staten Island. Blank outside NYC is expected, not an error |
| `join_status` | Text | `matched`, `places_only` or `svi_only`; measures join coverage, not completeness of disease/SVI values |

`Kings` is the county name corresponding to Brooklyn; `New York` corresponds to Manhattan; `Richmond` corresponds to Staten Island. Keeping both avoids conflating borough and official county labels. No crude prevalence is substituted when an adjusted value is missing.

`q3_national_summary.csv` contains `svi_measure`, `disease`, `correlation`, `n_counties`: one row per condition. In this question the summary is the requested overall-SVI association, rather than Q1's prevalence distribution statistics.

### Table Details — Transformations

1. Raw CSVs are retained without editing; SHA-256 hashes, actual headers and runtime versions are exported in the run manifest. Reads use pandas string dtype to protect FIPS and preserve original missing tokens. Numeric-parseability counts are reported separately from the intentionally string-based read dtype.
2. Required columns are resolved case-insensitively so official display headers and API-style lowercase headers can be accepted. Unexpected schemas stop execution; the program never silently substitutes crude values or tract data. Numeric thousands separators are removed where present.
3. FIPS are stripped, an integer-like `.0` suffix is removed, and valid 4/5-digit county codes are padded to length five. Missing, malformed, aggregate or duplicate FIPS stop the run; duplicates are not arbitrarily discarded. Both SVI `FIPS` and `STCNTY`, if present, must be unique and agree, which rejects tract files.
4. Only 50 states + DC are in scope. Any other source rows are preserved in a separate exclusions table with a reason. Missing disease/SVI values never trigger removal. No small-population threshold is applied to counties.
5. `-999`, blanks and documented textual missing markers become NA, never zero. Other numeric values outside allowed ranges are recorded as anomalies and masked to NA. Original source missing, sentinel, parse-error and invalid-value reasons remain distinguishable in the cleaning audit. Zeros within the valid range are retained.
6. Parse CIs with a full-string expression. Malformed intervals, bounds outside 0–100, reversed intervals or intervals excluding their point estimate are audited. Inconsistent intervals are made missing while retaining the point estimate and county.
7. Outer merge on FIPS with `validate='one_to_one'` retains unmatched counties from both sources. State conflicts stop the run. The unweighted national analysis is based on each available pair in the merged county union. SVI-only rows cannot contribute without a PLACES estimate. No geometry download or boundary crosswalk is part of this stage.
8. Q1 candidate inspection is performed before official downloads. Q1 values are reused only if all canonical adjusted values/CIs and the FIPS universe match the official release, including identical missingness. Otherwise use independent official PLACES processing, export Q1 scope differences and document unresolved alignment. The teammate file is never overwritten.

### Table Details — Checks

The successful-run audit records raw and in-scope counts; full-row duplicates; duplicate county FIPS; matched and each unmatched count; match rates with explicit PLACES, SVI and union denominators; all five NYC counties; column missingness; anomalous source values; valid prevalence/SVI/CI ranges; Q1 field and scope compatibility; and effective n for all correlations. A matched FIPS does not guarantee nonmissing measures.

The outer-join universe can include SVI-only historical county codes. This may make Q3's retained rows differ from the Q1 PLACES universe. Such rows are explicitly flagged and listed; they are not assigned prevalence or mapped to new codes automatically. Connecticut planning-region versus historical-county FIPS, and any other county-equivalent changes, must be assessed from actual unmatched lists. Do not resolve them by averaging tract/county percentiles. If precise geography harmonization is needed, obtain compatible official county releases or a defensible separate crosswalk procedure before claiming complete national comparability.

## Q4

**Question.** Which of the four SVI themes show the strongest associations with chronic disease prevalence, and do these relationships differ across conditions?

### Plan

**Unit and Data.** The same county-level merged snapshot as Q3, with `RPL_THEME1` (Socioeconomic Status), `RPL_THEME2` (Household Characteristics), `RPL_THEME3` (Racial and Ethnic Minority Status), and `RPL_THEME4` (Housing Type and Transportation). No independently rebuilt merge or tract analysis.

**Transformations.** For each of four themes × five conditions, select the two columns and remove only rows missing either member for that calculation. Rank both remaining variables with average ranks for ties, then compute Pearson correlation of the two rank vectors (Spearman rho). Keep n alongside each coefficient. Export the full 4 × 5 matrix, a matching n matrix and all 20 tidy rows. No population weighting, imputation or within-state re-ranking.

**How it answers the question.** Columns allow comparison of theme association across conditions; rows allow comparison of conditions within a theme. Strength refers to absolute rho, while the sign distinguishes positive and negative associations. No strongest theme is named before real calculations. Different coefficients may use different county samples, so differences are descriptive and are not tests of coefficient differences.

**Views — future plan only.** Labeled 4 × 5 correlation matrix with a fixed diverging scale from −1 to +1, numeric coefficients and n on inspection. A selected cell may open a county scatterplot. Missing/undefined values need an explicit label rather than a zero-colored cell.

**Interaction — future plan only.** Select a theme-condition cell to display the corresponding scatterplot and valid n; hover to see theme definitions; optionally highlight NYC using the shared flag. An exploratory state filter would need separately precomputed summaries or an explicitly implemented future calculation; the current exported coefficients are national.

**Risks.** Shared model inputs may contribute to association. Negative Theme 3 correlation would not indicate a protective causal effect of minority identity. Pair-specific n, spatial autocorrelation, correlated themes and outcome-estimation uncertainty limit comparisons. The 20 coefficients are descriptive; no p-values or significance claims are produced.

### Data Table

The actual full 4 × 5 correlation matrix and n matrix appear in the generated-results section and the executed notebook. All 20 theme-condition pairs in this supplied snapshot have 2,956 valid counties.

### Table Details — Column Definitions

| Output / column | Type / unit | Definition |
| --- | --- | --- |
| Matrix `theme` | Text | Four official theme field identifiers; row labels are stored as a normal CSV column |
| Matrix `DIABETES`, `CHD`, `BPHIGH`, `OBESITY`, `COPD` | Number, −1 to +1 | Unweighted pairwise-complete Spearman rho for adjusted prevalence |
| Tidy `theme` | Text | `RPL_THEME1`–`RPL_THEME4` |
| Tidy `disease` | Text | CDC measure identifier matching the corresponding `{disease}_adj` field |
| Tidy `correlation` | Number, nullable | Spearman rho; missing for insufficient/constant pairs |
| Tidy `n_counties` | Integer | Number of counties with both values present in that pair |
| Count matrix disease columns | Integer | Same valid counts arranged as 4 × 5 |

### Table Details — Calculations

For each theme–condition pair, let P contain counties with both fields nonmissing. Compute average ranks separately within P, then rho = PearsonCorr(rank(theme), rank(adjusted prevalence)). The implementation uses pandas ranking followed by Pearson correlation and therefore needs no extra SciPy dependency. Ties in already-ranked SVI values and rounded prevalence values are handled using average ranks. Fewer than three usable counties or a constant field gives an undefined coefficient, not zero; n remains recorded. This minimum is a practical guard for this workflow.

The population column is context only. Every eligible county has equal weight. The national correlations include NYC counties with complete pairs. Unmatched or partially missing counties remain in Q3 and can only enter the pairs they support.

### Table Details — Checks

Exactly four rows and five disease columns in the coefficient matrix; exactly 20 unique theme–disease tidy records; identical matrix/tidy values; every n recomputed from the Q3 two-column nonmissing mask; all defined coefficients within −1 to +1. No inference about causality, individual risk, statistical significance, or ranking differences beyond descriptive associations.

## Data validity and interpretation limits

- **Years are different.** 2025 is the PLACES release label, not the observation year. CDC's 2025 release documentation assigns the five selected conditions to 2023 BRFSS-based estimates and uses 2023 county population / ACS 2019–2023 inputs. SVI 2022 uses ACS 2018–2022. This is a cross-period descriptive association, not a synchronized panel or temporal causal study. Uploaded file identities and definitions must still be confirmed against the original official download.
- **Modeled outcomes.** PLACES uses multilevel regression and poststratification. These are estimates rather than direct county observations. Published 95% CIs are retained; the point-estimate Spearman calculations do not propagate the modeling uncertainty or correlation between estimates. A population count must not be treated as a survey sample size.
- **Overlapping inputs.** CDC lists individual age, sex, race/ethnicity and education, county adult poverty below 150% of the federal poverty threshold, and geographic random effects. SVI Theme 1 includes poverty and education; Theme 2 includes age structure; Theme 3 includes racial/ethnic composition. Definitions and levels differ, but the information overlaps. Age adjustment does not remove all of this dependence. Theme 4 has less direct definitional overlap with these listed inputs; it is not guaranteed independent, unbiased or weaker/stronger.
- **Ecological and spatial dependence.** A county association is not an individual-level relationship. Nearby counties share environments and may have dependent estimates, so treating counties as independent for significance testing would be questionable. This stage produces descriptive coefficients without p-values, spatial adjustment or causal claims.
- **Missingness and geography.** Pairwise deletion changes the analysis sample. Missing states can affect how representative the national pattern is. Original missingness and cleaning-induced NA are audited separately. County-equivalent boundaries/vintages may differ; unmatched records remain visible.
- **National percentile context.** SVI values are relative rankings, not disease probabilities or absolute deprivation measures. State-specific rankings cannot be concatenated as substitutes for national rankings. Do not recompute the national rankings after excluding missing outcome counties.

## Inputs and execution

Place the two original CDC exports under `data/raw/` using these project filenames (renaming the file is acceptable; do not edit its contents):

1. `places_2025_county_gis.csv`: [CDC PLACES 2025 County GIS-Friendly](https://data.cdc.gov/d/i46a-9kgh), [CSV export](https://data.cdc.gov/api/views/i46a-9kgh/rows.csv?accessType=DOWNLOAD). Needed fields: `CountyFIPS`, `StateAbbr`, `CountyName`, optional `TotalPop18plus`, and each of the five `{measure}_AdjPrev` / `{measure}_Adj95CI` pairs.
2. `svi_2022_us_county.csv`: [CDC/ATSDR documentation page](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html), [official data selector](https://svi.cdc.gov/dataDownloads/data-download.html). Select **2022 / United States / Counties / CSV**. Needed fields: `FIPS` (or `STCNTY`), `ST_ABBR`, `COUNTY`, `RPL_THEMES`, `RPL_THEME1`–`RPL_THEME4`. Do not upload the US tract file or a state-ranked export. The current documentation webpage may not expose a downloadable county CSV; if unavailable, request the original official export from the teammate rather than substitute synthetic or re-ranked data.

If available, add the existing teammate file as `data/processed/q1_county_prevalence.csv`. It is inspected and never overwritten. Its absence prevents exact verification of Q1 geographic scope even though the documented column conventions are aligned to Startup.

Open `notebooks/q3_q4_transformation.ipynb` in Google Colab and follow its upload/download instructions. No local Python installation is required. The notebook is self-contained, with ordinary pandas code and no external repo imports; Colab can upload original CSVs and export the completed project ZIP. If the official SVI selector supplies a direct county CSV link, set `SVI_CSV_URL` to that exact link rather than guessing an endpoint. For local use with pandas installed, from BioVis run `python src/q3_q4_transform.py --root . --no-download`.

## Output contract and future integration

Successful execution writes UTF-8 CSVs with no pandas index and empty fields for missing values:

- `q3_county_svi.csv`: shared county table, five point estimates and ten CI columns, overall + four theme ranks, population, NYC flags and join status.
- `q3_national_summary.csv`: five overall-SVI associations with n.
- `q4_correlations.csv`: full 4 × 5 rho matrix plus a `theme` column.
- `q4_correlations_tidy.csv`: all 20 theme / disease / correlation / n records.
- `data/processed/` contains only the four final CSVs above. The 12-row presentation sample is selected directly from `q3_county_svi.csv`; Q4 sample sizes are read from `q4_correlations_tidy.csv`. Unmatched counties, missingness, cleaning issues, scope checks, raw schema, validation and provenance are retained in `docs/validation/`. No separate sample or counts CSV is exported.

The four primary CSVs support the planned views; validation records in `docs/validation/` preserve provenance without cluttering `data/processed/`. Outputs can be loaded through Observable `FileAttachment` in a future project. Use an explicit row parser for `county_fips` to preserve its five-character text form; parse numeric blanks as null rather than zero and parse the boolean field explicitly. Do not apply an automatic numeric type conversion to FIPS. No Observable Framework configuration, Python data loader or frontend dependency is included.

## AI disclosure for the final README

AI (OpenAI Codex/ChatGPT) assisted in reading the supplied project materials and writing/reviewing the Python/pandas transformation code, Colab notebook and preprocessing documentation. Empirical values must be computed from the original official CDC PLACES and CDC/ATSDR SVI files. No synthetic observations or fabricated correlations are used. See the current run status above and the source manifest to distinguish code preparation from completed data processing; source identity and results require human review. Future sketches/visualizations and the final report are outside this task.

## Sources

- [CDC PLACES county GIS-friendly 2025 dataset and dictionary](https://data.cdc.gov/d/i46a-9kgh).
- [CDC PLACES 2025 current release notes](https://www.cdc.gov/places/current-release-notes/).
- [CDC PLACES methodology](https://www.cdc.gov/places/methodology/).
- [CDC PLACES FAQ: interpreting modeled estimates](https://www.cdc.gov/places/faqs/index.html).
- [CDC/ATSDR SVI data and documentation](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html).
- [CDC SVI official selector: US vs state ranking universes](https://svi.cdc.gov/dataDownloads/data-download.html).
- [SVI 2022 technical documentation](https://svi.cdc.gov/map/data/docs/SVI2022Documentation_5.17.2024.pdf), especially pp. 2–5 (missing values, national rankings, ACS period).

## Actual run outputs

<!-- GENERATED_RESULTS_START -->

Actual run completed at 2026-11-02T20:47:33.524736+00:00. These tables are generated from the cached raw CSVs.

#### Q3 Data Table — fixed 12-county documentation sample

NYC five counties plus seven named counties chosen for geographical/contextual breadth, not statistical representativeness. These rows are selected directly from data/processed/q3_county_svi.csv, which also contains adult population, all CIs, four themes and join status.

| county_fips | state | county | DIABETES_adj | CHD_adj | BPHIGH_adj | OBESITY_adj | COPD_adj | RPL_THEMES | is_nyc | borough |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 36005 | NY | Bronx | 14.8000 | 6.3000 | 34.6000 | 33.7000 | 6.4000 | 0.9965 | True | Bronx |
| 36047 | NY | Kings | 11.1000 | 5.1000 | 28.8000 | 25.0000 | 5.4000 | 0.8874 | True | Brooklyn |
| 36061 | NY | New York | 8.4000 | 4.4000 | 25.8000 | 19.5000 | 4.1000 | 0.7283 | True | Manhattan |
| 36081 | NY | Queens | 12.2000 | 4.9000 | 29.8000 | 23.8000 | 4.6000 | 0.8024 | True | Queens |
| 36085 | NY | Richmond | 10.1000 | 4.8000 | 30.3000 | 30.0000 | 5.2000 | 0.5956 | True | Staten Island |
| 06037 | CA | Los Angeles | 11.6000 | 4.8000 | 28.4000 | 26.4000 | 4.5000 | 0.8629 | False | NA |
| 17031 | IL | Cook | 10.7000 | 4.7000 | 28.9000 | 31.0000 | 5.2000 | 0.7964 | False | NA |
| 48201 | TX | Harris | 13.2000 | 5.5000 | 32.9000 | 37.1000 | 5.5000 | 0.9201 | False | NA |
| 04013 | AZ | Maricopa | 9.6000 | 5.0000 | 28.6000 | 30.6000 | 5.2000 | 0.7130 | False | NA |
| 12086 | FL | Miami-Dade | 13.3000 | 5.7000 | 30.3000 | 29.3000 | 4.7000 | 0.8810 | False | NA |
| 28049 | MS | Hinds | 15.3000 | 6.1000 | 45.7000 | 44.6000 | 7.0000 | 0.9154 | False | NA |
| 01001 | AL | Autauga | 11.4000 | 5.6000 | 38.2000 | 39.5000 | 6.4000 | 0.2663 | False | NA |

Q3 overall SVI Spearman correlations:

| svi_measure | disease | correlation | n_counties |
| --- | --- | --- | --- |
| RPL_THEMES | DIABETES | 0.7514 | 2956 |
| RPL_THEMES | CHD | 0.6188 | 2956 |
| RPL_THEMES | BPHIGH | 0.6000 | 2956 |
| RPL_THEMES | OBESITY | 0.3408 | 2956 |
| RPL_THEMES | COPD | 0.4964 | 2956 |

#### Q4 Data Table — Spearman correlation matrix

| theme | DIABETES | CHD | BPHIGH | OBESITY | COPD |
| --- | --- | --- | --- | --- | --- |
| RPL_THEME1 | 0.7859 | 0.7088 | 0.6641 | 0.3753 | 0.6155 |
| RPL_THEME2 | 0.5555 | 0.4764 | 0.4421 | 0.3321 | 0.3852 |
| RPL_THEME3 | 0.5081 | 0.1626 | 0.3100 | 0.0691 | -0.0164 |
| RPL_THEME4 | 0.4278 | 0.3545 | 0.3241 | 0.1679 | 0.2685 |

Pairwise valid county counts:

| theme | DIABETES | CHD | BPHIGH | OBESITY | COPD |
| --- | --- | --- | --- | --- | --- |
| RPL_THEME1 | 2956 | 2956 | 2956 | 2956 | 2956 |
| RPL_THEME2 | 2956 | 2956 | 2956 | 2956 | 2956 |
| RPL_THEME3 | 2956 | 2956 | 2956 | 2956 | 2956 |
| RPL_THEME4 | 2956 | 2956 | 2956 | 2956 | 2956 |

Q4 complete tidy table:

| theme | disease | correlation | n_counties |
| --- | --- | --- | --- |
| RPL_THEME1 | DIABETES | 0.7859 | 2956 |
| RPL_THEME1 | CHD | 0.7088 | 2956 |
| RPL_THEME1 | BPHIGH | 0.6641 | 2956 |
| RPL_THEME1 | OBESITY | 0.3753 | 2956 |
| RPL_THEME1 | COPD | 0.6155 | 2956 |
| RPL_THEME2 | DIABETES | 0.5555 | 2956 |
| RPL_THEME2 | CHD | 0.4764 | 2956 |
| RPL_THEME2 | BPHIGH | 0.4421 | 2956 |
| RPL_THEME2 | OBESITY | 0.3321 | 2956 |
| RPL_THEME2 | COPD | 0.3852 | 2956 |
| RPL_THEME3 | DIABETES | 0.5081 | 2956 |
| RPL_THEME3 | CHD | 0.1626 | 2956 |
| RPL_THEME3 | BPHIGH | 0.3100 | 2956 |
| RPL_THEME3 | OBESITY | 0.0691 | 2956 |
| RPL_THEME3 | COPD | -0.0164 | 2956 |
| RPL_THEME4 | DIABETES | 0.4278 | 2956 |
| RPL_THEME4 | CHD | 0.3545 | 2956 |
| RPL_THEME4 | BPHIGH | 0.3241 | 2956 |
| RPL_THEME4 | OBESITY | 0.1679 | 2956 |
| RPL_THEME4 | COPD | 0.2685 | 2956 |

#### Actual validation

| metric | value |
| --- | --- |
| merged_counties | 3144.0000 |
| matched_counties | 3143.0000 |
| places_only_counties | 0.0000 |
| svi_only_counties | 1.0000 |
| fips_match_rate_places_denominator | 1.0000 |
| fips_match_rate_svi_denominator | 0.9997 |
| duplicate_fips_merged | 0.0000 |
| explicit_scope_exclusions | 0.0000 |

Raw source counts:

| dataset | rows | duplicate_full_rows |
| --- | --- | --- |
| places | 3143 | 0 |
| svi | 3144 | 0 |

Missing values (non-NYC borough blanks are expected):

| column | n_missing |
| --- | --- |
| county_fips | 0 |
| state | 0 |
| county | 0 |
| pop18plus | 1 |
| DIABETES_adj | 188 |
| DIABETES_adj_lo | 188 |
| DIABETES_adj_hi | 188 |
| CHD_adj | 188 |
| CHD_adj_lo | 188 |
| CHD_adj_hi | 188 |
| BPHIGH_adj | 188 |
| BPHIGH_adj_lo | 188 |
| BPHIGH_adj_hi | 188 |
| OBESITY_adj | 188 |
| OBESITY_adj_lo | 188 |
| OBESITY_adj_hi | 188 |
| COPD_adj | 188 |
| COPD_adj_lo | 188 |
| COPD_adj_hi | 188 |
| RPL_THEMES | 0 |
| RPL_THEME1 | 0 |
| RPL_THEME2 | 0 |
| RPL_THEME3 | 0 |
| RPL_THEME4 | 0 |
| is_nyc | 0 |
| borough | 3139 |
| join_status | 0 |

Q1 alignment/reuse status: `{"exists": false, "reused": false, "scope_verified": false, "reason": "Q1 file was not provided; independently use official PLACES. Q1 scope/field convention comparison remains pending."}`

Full checks, anomaly records, out-of-scope records, unmatched FIPS and source hashes are in the exported audit files.

<!-- GENERATED_RESULTS_END -->
