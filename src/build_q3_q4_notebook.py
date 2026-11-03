"""Build the standalone notebook from the canonical pipeline using only stdlib.

This is a maintenance utility, not a dependency for running the Colab notebook.
Only the dependency/input preflight is executed during this build. No downstream
execution counts or empirical outputs are invented.
"""
import ast
import contextlib
import hashlib
import io
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "src/q3_q4_transform.py"
source = PIPELINE.read_text(encoding="utf-8")
tree = ast.parse(source)
functions = {n.name: ast.get_source_segment(source, n) for n in tree.body if isinstance(n, ast.FunctionDef)}
first_function = next(n for n in tree.body if isinstance(n, ast.FunctionDef))
prefix = "\n".join(source.splitlines()[:first_function.lineno - 1]).rstrip()
cells = []


def md(text):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": text.strip() + "\n"})


def code(text):
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": text.strip() + "\n"})


def defs(*names):
    code("\n\n\n".join(functions[name] for name in names))


md("""
# BioVis · Q3/Q4 Data Transformation

**Unit: one US county/county equivalent.** Q3 joins chronic-disease prevalence to overall SVI and highlights NYC; Q4 reuses that snapshot for four themes × five conditions. No plots or sketches are produced.

**Execution evidence:** saved code-cell outputs show the actual run state. The delivered executed notebook uses the two user-supplied CDC CSVs; source hashes, raw counts, merged counts, complete tables and validation appear below and in the exported manifest. Regenerating this notebook with the maintenance builder clears downstream outputs until it is run again. No Q1 CSV was supplied or required.

## 1. Data Loading

Run in **Google Colab** (pandas is preinstalled). No local environment or repository clone is required. All pipeline functions are included below. For GitHub review, save the executed notebook from Colab after the run; the saved outputs will show the actual DataFrames.

**Obtain the two original CSVs:**

1. [PLACES 2025 county GIS-friendly](https://data.cdc.gov/d/i46a-9kgh): export the full CSV, retaining adjusted estimates and CI strings.
2. [SVI official selector](https://svi.cdc.gov/dataDownloads/data-download.html): **2022 → United States → Counties → CSV**. Use the original official county export; never a tract file or state-specific rankings. If the official selector no longer offers the download, obtain the original official file from the teammate. Stop if unavailable.
3. Optionally provide `q1_county_prevalence.csv` for safe reuse/scope comparison.

Choose `INPUT_MODE = 'upload'` below for Colab's file picker; upload both original CDC files together, optionally including Q1. The code recognizes the datasets by their actual headers and caches them with project-standard names. `INPUT_MODE = 'download'` fetches PLACES and needs an exact official `SVI_CSV_URL` obtained from the selector. `INPUT_MODE = 'cached'` uses files already in `data/raw/`. Direct SVI endpoints are deliberately not guessed.

Raw files are never silently overwritten. An uploaded file's schema cannot prove its release year or national ranking universe; confirm these in the CDC download selector and retain the original export.
""")
preflight = '''from pathlib import Path
import importlib.util
import sys

IN_COLAB = importlib.util.find_spec("google.colab") is not None if importlib.util.find_spec("google") else False
INPUT_MODE = "upload" if IN_COLAB else "cached"  # upload | download | cached
SVI_CSV_URL = None  # exact official US COUNTY CSV URL, if available

if IN_COLAB:
    PROJECT_ROOT = Path("/content/BioVis")
else:
    here = Path.cwd()
    PROJECT_ROOT = here.parent if here.name == "notebooks" else (here / "BioVis" if (here / "BioVis").is_dir() else here)
for folder in ["data/raw", "data/processed", "docs/validation", "src", "notebooks"]:
    (PROJECT_ROOT / folder).mkdir(parents=True, exist_ok=True)

print("Runtime:", "Google Colab" if IN_COLAB else "Local Python")
print("Python:", sys.version.split()[0])
print("pandas installed:", importlib.util.find_spec("pandas") is not None)
print("Input mode:", INPUT_MODE)
for name in ["places_2025_county_gis.csv", "svi_2022_us_county.csv"]:
    print(name, "present" if (PROJECT_ROOT / "data/raw" / name).exists() else "MISSING")
print("Optional Q1:", "present" if (PROJECT_ROOT / "data/processed/q1_county_prevalence.csv").exists() else "not supplied")
print("No empirical transformation is claimed by this preflight.")'''
code(preflight)
preflight_cell = cells[-1]
md("The following helpers inspect schema, preserve source strings and cache full official CSVs. They are copied from the standalone `src/q3_q4_transform.py`; no `pip install` is necessary in Colab.")
code(prefix + '\n\npd.set_option("display.max_columns", 40)\npd.set_option("display.max_rows", 80)')
defs("utc_now", "json_write", "file_sha256", "read_raw", "col", "inspect_frame", "download_csv", "load_sources")
code('''# Optional Colab upload: identify the datasets using actual headers.
if INPUT_MODE not in {"upload", "download", "cached"}:
    raise ValueError("INPUT_MODE must be upload, download or cached")
if INPUT_MODE == "upload":
    if not IN_COLAB:
        raise RuntimeError("Upload mode uses Google Colab; locally use cached or download mode")
    from google.colab import files
    import io
    uploaded = files.upload()  # choose both original CSVs and optionally the Q1 CSV
    destinations = set()
    for original_name, payload in uploaded.items():
        header = pd.read_csv(io.BytesIO(payload), nrows=1, dtype="string").columns
        names = {str(c).strip().casefold() for c in header}
        if Path(original_name).name.casefold() == "q1_county_prevalence.csv":
            dest = PROJECT_ROOT / "data/processed/q1_county_prevalence.csv"
        elif {"countyfips", "diabetes_adjprev", "diabetes_adj95ci"}.issubset(names):
            dest = PROJECT_ROOT / "data/raw" / RAW_NAMES["places"]
        elif {"rpl_themes", "rpl_theme1", "rpl_theme2", "rpl_theme3", "rpl_theme4"}.issubset(names) and ({"fips", "stcnty"} & names):
            dest = PROJECT_ROOT / "data/raw" / RAW_NAMES["svi"]
        else:
            raise ValueError(f"Cannot identify {original_name}; inspect its actual headers: {list(header)}")
        if dest in destinations:
            raise ValueError(f"Multiple uploads map to {dest.name}; upload exactly one of each dataset")
        destinations.add(dest)
        if dest.exists() and dest.read_bytes() != payload:
            raise FileExistsError(f"A different cached file already exists at {dest}; choose a fresh project folder or explicitly manage that snapshot")
        dest.write_bytes(payload)
        print("Cached:", original_name, "->", dest.relative_to(PROJECT_ROOT))

try:
    frames, q1, provenance, inspection, raw_summary = load_sources(
        PROJECT_ROOT, download=INPUT_MODE == "download", svi_url=SVI_CSV_URL)
except Exception as exc:
    json_write(PROJECT_ROOT / "docs/validation/last_attempt.json", {
        "status": "blocked_or_failed", "observed_utc": utc_now(),
        "error_type": type(exc).__name__, "error": str(exc),
        "note": "No new empirical results were generated by this attempt."})
    raise

from IPython.display import display
display(raw_summary)
display(inspection)  # actual field names, read dtypes and numeric-parseability counts
for dataset, raw in frames.items():
    print(dataset, "actual columns:", list(raw.columns))
    display(raw.head())
if q1 is not None:
    print("Q1 candidate inspected; source file will not be overwritten")
    display(q1.head())''')

md("""
## 2. Data Cleaning

Use Q1's documented fields: `pop18plus`, `{m}_adj`, `{m}_adj_lo`, `{m}_adj_hi`. County FIPS is text padded to five digits. Duplicate/malformed identifiers stop execution; 11-digit tract files are rejected. Source blanks and `-999` become NA, never zero. Other invalid values are audited and masked. CI strings are parsed and checked against point estimates. Keep original raw files and the cell-level cleaning audit. Only explicitly out-of-scope territories are separated, with reasons; missing estimates do not remove counties.
""")
defs("normalize_fips", "text_values", "numeric_clean", "parse_ci", "clean_sources")
code('''cleaned, issues, exclusions = clean_sources(frames)
display(cleaned["places"].head())
display(cleaned["svi"].head())
display(pd.DataFrame([{"dataset": k, "in_scope_counties": len(v), "duplicate_fips": int(v.county_fips.duplicated().sum())} for k, v in cleaned.items()]))
display(issues.groupby(["dataset", "reason"], dropna=False).size().rename("n_cells").reset_index())
display(issues.head(20))
display(exclusions)''')

md("""
## 3. County-Level Merging

Reuse Q1's adjusted values/CIs only when they match the official PLACES release and FIPS universe, including missingness. Otherwise use the independently processed official data and document the mismatch. Never edit the teammate file.

An outer one-to-one join retains every in-scope source county, including unmatched codes and missing values. `join_status` distinguishes source coverage from complete observations. SVI-only county equivalents may extend the Q1 row universe; examine all unmatched records before claiming geography compatibility. No geographic crosswalk or averaging of rankings is applied.
""")
defs("check_q1", "merge_counties")
code('''merged, q1_report, scope_diff = merge_counties(cleaned, q1)
display(merged.head(12))
display(merged.join_status.value_counts(dropna=False).rename_axis("join_status").reset_index(name="n_counties"))
display(merged.loc[merged.join_status.ne("matched"), ["county_fips", "state", "county", "join_status"]])
display(pd.DataFrame([q1_report]))
display(scope_diff)
print("Merged counties:", len(merged))''')

md("""
## 4. Q3 Transformation

The shared table retains all five disease estimates, their CIs, adult population, overall and theme SVI ranks, and NYC flags. Borough names follow Q2; the original county names are retained separately. The fixed 12-row sample contains all five NYC counties and seven other named counties, selected for contextual breadth rather than statistical representativeness.

Compute five overall-SVI Spearman correlations using pairwise complete observations. Rank **after** selecting the complete pair and use average ranks for ties. Each county has equal weight; NYC contributes to the national pairs when complete. No population weighting, imputation or causal interpretation.
""")
defs("correlations", "q3_transform")
code('''q3, summary, sample = q3_transform(merged)
display(q3.head(12))
display(sample)  # full real sample, including all ten CI bounds
display(summary)
display(q3.loc[q3.is_nyc, ["county_fips", "county", "borough", "RPL_THEMES", *VALUE_COLS, "join_status"]])''')

md("""
## 5. Q4 Correlation Analysis

Reuse Q3 directly. Four themes × five conditions yield 20 coefficients. Spearman rho is the Pearson correlation of within-pair average ranks. Pair-specific n accompanies each coefficient. Undefined correlations (fewer than three pairs or constant values) remain missing, not zero. These descriptive associations do not prove causation or significance; theme differences may reflect different complete-case samples.

Theme 1: Socioeconomic Status; Theme 2: Household Characteristics; Theme 3: Racial and Ethnic Minority Status; Theme 4: Housing Type and Transportation.
""")
defs("q4_transform")
code('''matrix, tidy, counts = q4_transform(q3)
display(matrix)   # complete 4 x 5 coefficient matrix, no chart
display(counts)   # corresponding effective n matrix
display(tidy)     # all 20 theme / disease / correlation / n records''')

md("""
## 6. Validation

Check raw/merged county counts, FIPS match rates with explicit denominators, duplicate FIPS, retention of in-scope counties, NYC five-county presence, valid ranges, CI ordering, missingness and all 25 pairwise n. Matrix and tidy values must agree. Out-of-range values are made missing with original values in the audit. Structural FIPS checks do not independently validate every code against a census boundary vintage.

**Interpretation limits:** PLACES 2025 is a release label; these five conditions use 2023 BRFSS-based estimates, whereas SVI 2022 uses ACS 2018–2022. PLACES outcomes are model-based. PLACES inputs (age, race/ethnicity, education and county poverty among others) overlap with SVI themes. County ecological associations, spatial dependence and unpropagated model-estimation uncertainty limit interpretation. Missing estimates can restrict national representativeness. This stage performs no spatial modeling, p-value testing or causal inference.

Startup's reported 3,143 PLACES counties / 187 missing estimates are comparison context; the code calculates actual counts instead of forcing agreement. In the supplied files, SVI includes Loving County TX (`48301`), absent from PLACES. The outer join keeps it as `svi_only`; 187 KY/PA counties plus Loving therefore have missing disease estimates in the shared 3,144-row table. Inspect the actual tables below when rerunning with a different snapshot.
""")
defs("validate")
code('''audit, checks = validate(frames, cleaned, merged, q3, summary, matrix, tidy, issues, exclusions, q1_report)
display(checks)
display(pd.DataFrame([{"metric": k, "value": audit[k]} for k in [
    "merged_counties", "matched_counties", "places_only_counties", "svi_only_counties",
    "fips_match_rate_places_denominator", "fips_match_rate_svi_denominator",
    "fips_match_rate_union_denominator", "duplicate_fips_merged"]]))
display(q3.isna().sum().rename("n_missing").rename_axis("column").reset_index())
display(pd.DataFrame(audit["observed_ranges"]).T)
display(pd.DataFrame(audit["correlations"]))
display(issues.loc[issues.reason.isin(["numeric_parse_error", "out_of_range_or_noninteger", "malformed_ci", "ci_order_or_estimate_outside_ci"])])
display(pd.DataFrame([{"state": state, "n_counties": len(g), **{c: int(g[c].isna().sum()) for c in VALUE_COLS}} for state, g in q3.groupby("state", dropna=False)]))''')

md("""
## 7. Export

Write only the four final UTF-8 CSVs to data/processed, without an index. Sample rows are selected from q3_county_svi.csv; pairwise n is included in q4_correlations_tidy.csv. Machine-readable provenance/audits go to docs/validation. Blank CSV fields mean missing; never convert them to zero in a visualization. The notes contain Plan / Data Table / Table Details and future view/interaction descriptions only. Actual tables are inserted only after successful validation.

This notebook carries the documentation template and standalone Python script so it can be run without a clone. Existing notes are preserved apart from the marked generated-results block. No Q1 file is overwritten. The final optional Colab ZIP contains outputs, notes and script; use **File → Download → .ipynb** separately to retain this notebook's executed outputs.

**AI disclosure:** AI assisted in preparing the transformation code, notebook and notes from the provided materials. Empirical values must come from official CDC files. No synthetic data or fabricated results are used; human review is required. The exported notes record this statement for the final README.
""")
defs("markdown_table", "write_results_section", "export_results")
template = (ROOT / "q3_q4_transformation_notes.md").read_text(encoding="utf-8")
code("# Embedded reproducibility assets; this cell writes only this task's own files.\n"
     + "NOTES_TEMPLATE = " + repr(template) + "\n"
     + "STANDALONE_SCRIPT = " + repr(source) + "\n"
     + '''notes_path = PROJECT_ROOT / "q3_q4_transformation_notes.md"
if not notes_path.exists():
    notes_path.write_text(NOTES_TEMPLATE, encoding="utf-8")
script_path = PROJECT_ROOT / "src/q3_q4_transform.py"
if not script_path.exists():
    script_path.write_text(STANDALONE_SCRIPT, encoding="utf-8")

output_files = export_results(PROJECT_ROOT, q3, summary, sample, matrix, tidy, counts,
    audit, checks, issues, exclusions, scope_diff, inspection, raw_summary, provenance)
display(pd.DataFrame([{"file": "data/processed/" + name,
                       "bytes": (PROJECT_ROOT / "data/processed" / name).stat().st_size} for name in output_files]))
print("Notes:", notes_path.name)
print("Validation:", audit["status"])
print("Q1 alignment:", q1_report)

# Verify actual CSV round trips preserve FIPS and output layout.
roundtrip = pd.read_csv(PROJECT_ROOT / "data/processed/q3_county_svi.csv", dtype={"county_fips": "string"})
assert roundtrip.county_fips.equals(q3.county_fips.reset_index(drop=True))
assert not any(str(c).startswith("Unnamed:") for c in roundtrip)
saved_matrix = pd.read_csv(PROJECT_ROOT / "data/processed/q4_correlations.csv")
assert saved_matrix.shape == (4, 6) and list(saved_matrix.columns) == ["theme", *DISEASES]
print("CSV round trips: passed")''')
code('''DOWNLOAD_ZIP = False  # set True in Colab to download all generated project files
if DOWNLOAD_ZIP:
    if not IN_COLAB:
        raise RuntimeError("Use the local BioVis directory directly outside Colab")
    import shutil
    from google.colab import files
    archive = shutil.make_archive("/content/BioVis", "zip", PROJECT_ROOT.parent, PROJECT_ROOT.name)
    files.download(archive)
print("Save/download this executed .ipynb from Colab, then commit it with the real CSVs and manifest to GitHub.")''')

# Actually execute the stdlib-only preflight. No other cell receives a fake output.
capture = io.StringIO()
with contextlib.redirect_stdout(capture):
    exec(compile(preflight, "notebook-preflight", "exec"), {})
preflight_cell["execution_count"] = 1
preflight_cell["outputs"] = [{"output_type": "stream", "name": "stdout", "text": capture.getvalue()}]
for i, cell in enumerate(cells):
    cell["id"] = f"biovis-{i:03d}"
    cell["source"] = cell["source"].splitlines(keepends=True)
    if cell["cell_type"] == "code":
        compile("".join(cell["source"]), f"cell-{i}", "exec")
notebook = {"nbformat": 4, "nbformat_minor": 5,
            "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                         "language_info": {"name": "python", "version": "3.10"},
                         "colab": {"name": "q3_q4_transformation.ipynb", "provenance": []},
                         "biovis": {"pipeline_sha256": hashlib.sha256(source.encode()).hexdigest(),
                                    "saved_execution_status": "preflight_only; raw data absent; empirical results uncomputed"}},
            "cells": cells}
target = ROOT / "notebooks/q3_q4_transformation.ipynb"
target.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(capture.getvalue(), end="")
print(f"Notebook generated: {len(cells)} cells; all code cells compile; only preflight executed.")
