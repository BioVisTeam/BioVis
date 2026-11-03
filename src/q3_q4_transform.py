"""CDC county data transformation only; Python 3.10+, pandas 2+.

Run from the repository root: python src/q3_q4_transform.py --root .
The notebook contains the same implementation for standalone Colab execution.
No plots, imputation, population weighting, or tract-rank aggregation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

PLACES_ID = "i46a-9kgh"
PLACES_URL = f"https://data.cdc.gov/api/views/{PLACES_ID}/rows.csv?accessType=DOWNLOAD"
SVI_PORTAL = "https://svi.cdc.gov/dataDownloads/data-download.html"
DISEASES = ["DIABETES", "CHD", "BPHIGH", "OBESITY", "COPD"]
THEMES = {
    "RPL_THEME1": "Socioeconomic Status",
    "RPL_THEME2": "Household Characteristics",
    "RPL_THEME3": "Racial and Ethnic Minority Status",
    "RPL_THEME4": "Housing Type and Transportation",
}
RANKS = ["RPL_THEMES", *THEMES]
NYC = {"36005": "Bronx", "36047": "Brooklyn", "36061": "Manhattan",
       "36081": "Queens", "36085": "Staten Island"}
SAMPLE_FIPS = [*NYC, "06037", "17031", "48201", "04013", "12086", "28049", "01001"]
US_STATES = set("01 02 04 05 06 08 09 10 11 12 13 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 44 45 46 47 48 49 50 51 53 54 55 56".split())
MISSING_TOKENS = {"", "na", "n/a", "null", "none", "nan", "suppressed", "*", "**", "--", "-", "—"}
RAW_NAMES = {"places": "places_2025_county_gis.csv", "svi": "svi_2022_us_county.csv"}
VALUE_COLS = [f"{d}_adj" for d in DISEASES]
HEALTH_COLS = [f"{d}_adj{s}" for d in DISEASES for s in ("", "_lo", "_hi")]


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def json_write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def file_sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_raw(path):
    """Read strings before cleaning so leading zeros and source missing tokens survive."""
    df = pd.read_csv(path, dtype="string", keep_default_na=False, encoding="utf-8-sig")
    original = list(df.columns)
    df.columns = df.columns.str.strip()
    if df.columns.duplicated().any():
        raise ValueError(f"Duplicate column names after trimming in {path}: {original}")
    if df.empty:
        raise ValueError(f"No data rows in {path}")
    return df


def col(df, *candidates, required=True):
    lookup = {str(c).casefold(): c for c in df.columns}
    for candidate in candidates:
        if candidate.casefold() in lookup:
            return lookup[candidate.casefold()]
    if required:
        raise ValueError(f"Missing required column {candidates}; actual columns: {list(df.columns)}")
    return None


def inspect_frame(df, dataset):
    """Report as-read dtypes separately from inferred numeric content."""
    records = []
    for name in df:
        s = df[name].astype("string").str.strip()
        numeric = pd.to_numeric(s, errors="coerce")
        records.append({"dataset": dataset, "column": name, "read_dtype": str(df[name].dtype),
                        "source_blank_count": int(s.eq("").sum()),
                        "numeric_parseable_count": int(numeric.notna().sum()),
                        "distinct_values": int(s.nunique(dropna=False))})
    return pd.DataFrame(records)


def download_csv(url, dest):
    """Atomically cache a complete CSV; never replace an existing raw snapshot."""
    dest = Path(dest)
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "BioVis-academic-transformation/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = response.read()
        final_url = response.geturl()
    # Parse before writing: CDC block pages must not become a raw-data cache.
    import io
    probe = pd.read_csv(io.BytesIO(payload), dtype="string", nrows=2)
    if len(probe.columns) < 5 or probe.empty:
        raise ValueError(f"The URL did not return a nonempty tabular CDC CSV: {url}")
    temp = dest.with_suffix(".download")
    temp.write_bytes(payload)
    temp.replace(dest)
    source_record = dest.parents[2] / "docs/validation/sources" / dest.with_suffix(".source.json").name
    json_write(source_record, {
        "requested_url": url, "resolved_url": final_url, "retrieved_utc": utc_now(),
        "sha256": file_sha256(dest), "bytes": dest.stat().st_size,
    })


def load_sources(root, download=True, svi_url=None):
    """Inspect the optional teammate file first. Never modify it."""
    root = Path(root)
    q1_path = root / "data/processed/q1_county_prevalence.csv"
    q1 = read_raw(q1_path) if q1_path.exists() else None
    frames, provenance, failures = {}, {}, []
    for dataset, filename in RAW_NAMES.items():
        path = root / "data/raw" / filename
        url = PLACES_URL if dataset == "places" else svi_url
        if not path.exists() and download and url:
            try:
                download_csv(url, path)
            except Exception as exc:
                failures.append(f"{dataset} download: {type(exc).__name__}: {exc}")
        if not path.exists():
            failures.append(f"Missing {path}. " + (
                f"Download CDC PLACES 2025 County GIS-Friendly ({PLACES_ID})." if dataset == "places" else
                f"At {SVI_PORTAL} choose 2022 / United States / Counties / CSV; upload the national county file, not tracts or individual-state rankings."))
            continue
        frames[dataset] = read_raw(path)
        sidecar = root / "docs/validation/sources" / path.with_suffix(".source.json").name
        provenance[dataset] = {
            "path": str(path.relative_to(root)), "sha256": file_sha256(path),
            "bytes": path.stat().st_size, "rows": len(frames[dataset]),
            "columns": list(frames[dataset].columns), "observed_utc": utc_now(),
            "download_record": json.loads(sidecar.read_text()) if sidecar.exists() else None,
            "source_identity": (f"Expected official PLACES 2025 county GIS CSV ({PLACES_ID})" if dataset == "places" else
                                "Expected official SVI 2022 US county CSV, national rankings"),
            "identity_note": "Schema checks alone cannot authenticate an uploaded file's year or ranking universe; retain the original CDC download and source record.",
        }
    if failures:
        raise FileNotFoundError("\n".join(failures))
    inspections = [inspect_frame(df, name) for name, df in frames.items()]
    if q1 is not None:
        inspections.append(inspect_frame(q1, "q1_candidate"))
        provenance["q1_candidate"] = {"path": str(q1_path.relative_to(root)), "sha256": file_sha256(q1_path), "rows": len(q1)}
    raw_summary = pd.DataFrame([
        {"dataset": name, "rows": len(df), "columns": len(df.columns),
         "duplicate_full_rows": int(df.duplicated().sum())} for name, df in frames.items()
    ])
    return frames, q1, provenance, pd.concat(inspections, ignore_index=True), raw_summary


def normalize_fips(series, label):
    s = series.astype("string").str.strip().str.replace(r"\.0+$", "", regex=True)
    bad = ~s.str.fullmatch(r"\d{4,5}", na=False)
    if bad.any():
        examples = series[bad].head(10).tolist()
        raise ValueError(f"{label}: invalid county FIPS ({int(bad.sum())} rows): {examples}. "
                         "County identifiers must have 4 or 5 digits before zero-padding; 11-digit tracts are rejected.")
    s = s.str.zfill(5)
    if s.str.endswith("000").any():
        raise ValueError(f"{label}: found state/national aggregate code ending in 000")
    if s.duplicated().any():
        raise ValueError(f"{label}: duplicate county FIPS; no automatic deduplication: {s[s.duplicated(False)].tolist()[:20]}")
    return s


def text_values(s):
    s = s.astype("string").str.strip()
    return s.mask(s.str.casefold().isin(MISSING_TOKENS))


def numeric_clean(s, fips, dataset, field, issues, lo=0, hi=None, integer=False, record_missing=True):
    raw = s.astype("string").str.strip()
    missing = raw.isna() | raw.str.casefold().isin(MISSING_TOKENS)
    numeric_text = raw.str.replace(r"(?<=\d),(?=\d{3}(?:\D|$))", "", regex=True)
    num = pd.to_numeric(numeric_text.mask(missing), errors="coerce").astype("Float64")
    sentinel = num.eq(-999).fillna(False)
    parse_error = ~missing & num.isna()
    invalid = num.notna() & ~sentinel & (~num.ge(lo) | (num.gt(hi) if hi is not None else False))
    if integer:
        invalid = invalid | (num.notna() & ~sentinel & num.mod(1).ne(0))
    for reason, mask in [("source_missing", missing), ("sentinel_-999", sentinel),
                         ("numeric_parse_error", parse_error), ("out_of_range_or_noninteger", invalid)]:
        if reason == "source_missing" and not record_missing:
            continue
        for idx in s.index[mask.fillna(False)]:
            issues.append({"dataset": dataset, "county_fips": str(fips.loc[idx]), "field": field,
                           "raw_value": None if pd.isna(raw.loc[idx]) else str(raw.loc[idx]), "reason": reason})
    return num.mask(missing | sentinel | parse_error | invalid)


def parse_ci(s, fips, dataset, disease, issues):
    raw = s.astype("string").str.strip()
    # CDC GIS-friendly intervals are strings such as (8.2, 9.3).
    pattern = r"^\s*[\[(]?\s*(-?\d+(?:\.\d+)?)\s*[,–-]\s*(-?\d+(?:\.\d+)?)\s*[\])]?\s*$"
    extracted = raw.str.extract(pattern)
    missing = raw.isna() | raw.str.casefold().isin(MISSING_TOKENS) | raw.isin(["-999", "-999.0"])
    malformed = ~missing & extracted[0].isna()
    for idx in raw.index[malformed]:
        issues.append({"dataset": dataset, "county_fips": str(fips.loc[idx]), "field": f"{disease}_adj_ci",
                       "raw_value": str(raw.loc[idx]), "reason": "malformed_ci"})
    # Keep one record of the original interval for every missing/invalid CI.
    for idx in raw.index[missing]:
        issues.append({"dataset": dataset, "county_fips": str(fips.loc[idx]), "field": f"{disease}_adj_ci",
                       "raw_value": None if pd.isna(raw.loc[idx]) else str(raw.loc[idx]), "reason": "source_missing_or_sentinel_ci"})
    bounds = []
    for i, suffix in enumerate(["lo", "hi"]):
        bounds.append(numeric_clean(extracted[i], fips, dataset, f"{disease}_adj_{suffix}", issues, hi=100, record_missing=False))
    return bounds


def clean_sources(frames):
    issues, exclusions = [], []
    p, s = frames["places"], frames["svi"]
    pfips = normalize_fips(p[col(p, "CountyFIPS")], "PLACES")
    sfips = normalize_fips(s[col(s, "FIPS", "STCNTY")], "SVI")
    # If the file includes both, they must identify the same counties, never tracts.
    if col(s, "STCNTY", required=False) and col(s, "FIPS", required=False):
        stcnty = normalize_fips(s[col(s, "STCNTY")], "SVI STCNTY")
        if not sfips.equals(stcnty):
            raise ValueError("SVI FIPS and STCNTY disagree; confirm a county CSV was supplied")
    if pfips.str[:2].nunique() < 40 or sfips.str[:2].nunique() < 40:
        raise ValueError("Expected national county CSVs, but fewer than 40 state FIPS prefixes were found")
    places = pd.DataFrame({"county_fips": pfips,
                           "state": text_values(p[col(p, "StateAbbr")]),
                           "county": text_values(p[col(p, "CountyName")])})
    adult_col = col(p, "TotalPop18plus", required=False)
    places["pop18plus"] = (numeric_clean(p[adult_col], pfips, "places", "pop18plus", issues, integer=True)
                                   if adult_col else pd.Series(pd.NA, index=p.index, dtype="Float64"))
    for disease in DISEASES:
        places[f"{disease}_adj"] = numeric_clean(p[col(p, f"{disease}_AdjPrev")], pfips, "places", f"{disease}_adj", issues, hi=100)
        lower, upper = parse_ci(p[col(p, f"{disease}_Adj95CI")], pfips, "places", disease, issues)
        # Inconsistent uncertainty bounds are missing, without discarding the estimate/county.
        point = places[f"{disease}_adj"]
        bad_order = (lower.notna() & upper.notna() & lower.gt(upper))
        outside = point.notna() & ((lower.notna() & point.lt(lower)) | (upper.notna() & point.gt(upper)))
        bad = (bad_order | outside).fillna(False)
        for idx in p.index[bad]:
            issues.append({"dataset": "places", "county_fips": str(pfips.loc[idx]), "field": f"{disease}_adj_ci",
                           "raw_value": str(p.loc[idx, col(p, f"{disease}_Adj95CI")]), "reason": "ci_order_or_estimate_outside_ci"})
        places[f"{disease}_adj_lo"] = lower.mask(bad)
        places[f"{disease}_adj_hi"] = upper.mask(bad)
    svi = pd.DataFrame({"county_fips": sfips,
                        "svi_state": text_values(s[col(s, "ST_ABBR")]),
                        "svi_county": text_values(s[col(s, "COUNTY")])})
    for rank in RANKS:
        svi[rank] = numeric_clean(s[col(s, rank)], sfips, "svi", rank, issues, hi=1)
    cleaned = {}
    for label, df in [("places", places), ("svi", svi)]:
        in_scope = df.county_fips.str[:2].isin(US_STATES)
        for fips in df.loc[~in_scope, "county_fips"]:
            exclusions.append({"dataset": label, "county_fips": fips, "reason": "Outside 50 states + DC; not in US national SVI ranking universe"})
        cleaned[label] = df.loc[in_scope].copy()
    return cleaned, pd.DataFrame(issues, columns=["dataset", "county_fips", "field", "raw_value", "reason"]), pd.DataFrame(exclusions, columns=["dataset", "county_fips", "reason"])


def check_q1(q1, places):
    """Reuse only verified identical values; record scope differences without changing files."""
    report = {"exists": q1 is not None, "reused": False, "scope_verified": False}
    differences = pd.DataFrame(columns=["county_fips", "scope_status"])
    if q1 is None:
        report["reason"] = "Q1 file was not provided; independently use official PLACES. Q1 scope/field convention comparison remains pending."
        return places, report, differences
    try:
        fips_col = col(q1, "county_fips", "CountyFIPS")
        candidate = q1.copy()
        candidate["county_fips"] = normalize_fips(q1[fips_col], "Q1")
        qa, pa = set(candidate.county_fips), set(places.county_fips)
        differences = pd.DataFrame([
            *({"county_fips": f, "scope_status": "q1_only"} for f in sorted(qa - pa)),
            *({"county_fips": f, "scope_status": "official_places_only"} for f in sorted(pa - qa)),
        ], columns=["county_fips", "scope_status"])
        report.update({"q1_counties": len(qa), "official_places_counties": len(pa),
                       "q1_only_count": len(qa - pa), "official_places_only_count": len(pa - qa),
                       "scope_verified": qa == pa})
        missing = [c for c in HEALTH_COLS if c not in candidate]
        report["missing_canonical_fields"] = missing
        if missing or qa != pa:
            report["reason"] = "Q1 fields/scope differ. Use official PLACES; all scope differences are exported. Team reconciliation is required before claiming Q1 alignment."
            return places, report, differences
        candidate = candidate.set_index("county_fips").sort_index()
        official = places.set_index("county_fips").sort_index()
        for c in HEALTH_COLS:
            candidate[c] = pd.to_numeric(candidate[c], errors="coerce").astype("Float64")
        pd.testing.assert_frame_equal(candidate[HEALTH_COLS], official[HEALTH_COLS],
                                      check_dtype=False, check_exact=False, rtol=0, atol=1e-9)
        official.loc[:, HEALTH_COLS] = candidate[HEALTH_COLS]
        report.update({"reused": True, "reason": "Q1 point estimates and CIs match the official release and full geographic scope; verified values reused; source file untouched."})
        return official.reset_index(), report, differences
    except (ValueError, AssertionError) as exc:
        report["reason"] = f"Q1 cannot be safely reused: {exc}"
        return places, report, differences


def merge_counties(cleaned, q1=None):
    places, q1_report, scope_diff = check_q1(q1, cleaned["places"])
    merged = places.merge(cleaned["svi"], on="county_fips", how="outer", validate="one_to_one", indicator=True)
    merged["join_status"] = merged.pop("_merge").astype("string").replace({"both": "matched", "left_only": "places_only", "right_only": "svi_only"})
    merged["state"] = merged.state.combine_first(merged.svi_state)
    merged["county"] = merged.county.combine_first(merged.svi_county)
    merged["is_nyc"] = merged.county_fips.isin(NYC)
    merged["borough"] = merged.county_fips.map(NYC).astype("string")
    state_conflicts = merged.loc[merged.svi_state.notna() & merged.state.notna() & merged.svi_state.ne(merged.state),
                                 ["county_fips", "state", "svi_state"]]
    if not state_conflicts.empty:
        raise ValueError(f"State abbreviations conflict across sources: {state_conflicts.to_dict('records')}")
    merged = merged.drop(columns=["svi_state", "svi_county"]).sort_values("county_fips").reset_index(drop=True)
    return merged, q1_report, scope_diff


def correlations(df, predictors):
    """Spearman rho = Pearson correlation of within-pair average ranks.

    Rank after pairwise deletion; otherwise missingness changes ranks incorrectly.
    No weights, imputation, p-values, or causal interpretations.
    """
    records = []
    for theme in predictors:
        for disease in DISEASES:
            pair = df[[theme, f"{disease}_adj"]].dropna()
            n = len(pair)
            rho = None
            if n >= 3 and pair.nunique().min() > 1:
                value = pair.rank(method="average").astype(float).corr(method="pearson").iloc[0, 1]
                rho = float(value) if math.isfinite(value) else None
            records.append({"theme": theme, "disease": disease, "correlation": rho, "n_counties": n})
    return pd.DataFrame(records)


def q3_transform(merged):
    # Retain all 4 theme ranks here so Q4 uses exactly the same merged snapshot.
    q3 = merged[["county_fips", "state", "county", "pop18plus", *HEALTH_COLS,
                 *RANKS, "is_nyc", "borough", "join_status"]].copy()
    summary = correlations(q3, ["RPL_THEMES"]).rename(columns={"theme": "svi_measure"})
    sample = q3.set_index("county_fips").reindex(SAMPLE_FIPS)
    missing_sample = sample["county"].isna()
    if missing_sample.any():
        raise ValueError(f"Fixed documentation sample counties absent or unnamed: {sample.index[missing_sample].tolist()}")
    return q3, summary, sample.reset_index()


def q4_transform(q3):
    tidy = correlations(q3, THEMES)
    matrix = tidy.pivot(index="theme", columns="disease", values="correlation").reindex(index=THEMES, columns=DISEASES)
    counts = tidy.pivot(index="theme", columns="disease", values="n_counties").reindex(index=THEMES, columns=DISEASES)
    return matrix, tidy, counts


def validate(frames, cleaned, merged, q3, summary, matrix, tidy, issues, exclusions, q1_report):
    checks = []
    def check(name, passed, detail):
        checks.append({"check": name, "passed": bool(passed), "detail": detail})
    check("unique_merged_fips", not merged.county_fips.duplicated().any(), len(merged))
    check("five_digit_fips", merged.county_fips.str.fullmatch(r"\d{5}").all(), "5-digit strings")
    check("national_states_only", merged.county_fips.str[:2].isin(US_STATES).all(), "50 states + DC")
    check("all_source_counties_retained", set(merged.county_fips) == set(cleaned["places"].county_fips) | set(cleaned["svi"].county_fips), "Outer join; no county removed for missing values")
    check("nyc_five_present", set(NYC).issubset(set(merged.county_fips)), sorted(NYC))
    nyc = merged[merged.is_nyc]
    check("nyc_all_sources_matched", len(nyc) == 5 and nyc.join_status.eq("matched").all(), "Five NYC FIPS must occur in both sources")
    check("nyc_boroughs_only", q3.loc[q3.is_nyc, "borough"].notna().all() and q3.loc[~q3.is_nyc, "borough"].isna().all(), "Official county names retained; borough labels added separately")
    population = q3.pop18plus.dropna()
    check("adult_population_valid", (population.ge(0) & population.mod(1).eq(0)).all(), "Nullable nonnegative integer; context only")
    for c in HEALTH_COLS + RANKS:
        hi = 1 if c in RANKS else 100
        check(f"range_{c}", q3[c].dropna().between(0, hi).all(), f"Nonmissing range [0, {hi}]")
    for d in DISEASES:
        a, lo, hi = (q3[f"{d}_adj{s}"] for s in ("", "_lo", "_hi"))
        valid = ((lo.isna() | hi.isna() | lo.le(hi)) & (a.isna() | lo.isna() | a.ge(lo)) & (a.isna() | hi.isna() | a.le(hi)))
        check(f"ci_order_{d}", valid.fillna(False).all(), "lower <= estimate <= upper when available")
    check("q4_shape", matrix.shape == (4, 5) and len(tidy) == 20, list(matrix.shape))
    check("q4_unique_pairs", not tidy.duplicated(["theme", "disease"]).any(), "20 distinct theme-disease pairs")
    check("q4_matrix_tidy_agree", all(
        (pd.isna(row.correlation) and pd.isna(matrix.loc[row.theme, row.disease])) or
        (not pd.isna(row.correlation) and row.correlation == matrix.loc[row.theme, row.disease])
        for row in tidy.itertuples()), "All 20 matrix cells agree with tidy rows")
    check("q3_five_correlations", len(summary) == 5, len(summary))
    combined = pd.concat([summary.rename(columns={"svi_measure": "theme"}), tidy], ignore_index=True)
    for row in combined.itertuples():
        expected = int(q3[[row.theme, f"{row.disease}_adj"]].notna().all(axis=1).sum())
        check(f"pair_n_{row.theme}_{row.disease}", row.n_counties == expected, expected)
    check("rho_range", combined.correlation.dropna().between(-1, 1).all(), "[-1, 1]")
    matched = int(merged.join_status.eq("matched").sum())
    info = {
        "run_utc": utc_now(), "status": "completed" if all(c["passed"] for c in checks) else "validation_failed",
        "raw": {k: {"rows": len(v), "duplicate_full_rows": int(v.duplicated().sum())} for k, v in frames.items()},
        "in_scope": {k: len(v) for k, v in cleaned.items()},
        "merged_counties": len(merged), "matched_counties": matched,
        "places_only_counties": int(merged.join_status.eq("places_only").sum()),
        "svi_only_counties": int(merged.join_status.eq("svi_only").sum()),
        "fips_match_rate_places_denominator": matched / len(cleaned["places"]),
        "fips_match_rate_svi_denominator": matched / len(cleaned["svi"]),
        "fips_match_rate_union_denominator": matched / len(merged),
        "duplicate_fips_after_cleaning": {k: int(v.county_fips.duplicated().sum()) for k, v in cleaned.items()},
        "duplicate_fips_merged": int(merged.county_fips.duplicated().sum()),
        "missing_counts": {c: int(n) for c, n in q3.isna().sum().items()},
        "issue_counts": {str(k): int(v) for k, v in issues.reason.value_counts().items()},
        "explicit_scope_exclusions": len(exclusions), "q1": q1_report,
        "observed_ranges": {c: {"min": None if q3[c].dropna().empty else float(q3[c].min()),
                                 "max": None if q3[c].dropna().empty else float(q3[c].max())} for c in HEALTH_COLS + RANKS},
        "nyc": {f: {"present": bool(merged.county_fips.eq(f).any()), "borough": b} for f, b in NYC.items()},
        "correlations": combined.astype(object).where(combined.notna(), None).to_dict("records"),
        "checks": checks,
    }
    if not all(c["passed"] for c in checks):
        failed = [c["check"] for c in checks if not c["passed"]]
        raise ValueError(f"Validation failed; processed CSVs not exported: {failed}")
    return info, pd.DataFrame(checks)


def markdown_table(df, digits=4):
    # Avoid an optional tabulate dependency in Colab.
    def fmt(v):
        if pd.isna(v):
            return "NA"
        if isinstance(v, float):
            return f"{v:.{digits}f}"
        return str(v).replace("|", "\\|").replace("\n", " ")
    lines = ["| " + " | ".join(map(str, df.columns)) + " |", "| " + " | ".join(["---"] * len(df.columns)) + " |"]
    lines.extend("| " + " | ".join(fmt(v) for v in row) + " |" for row in df.itertuples(index=False, name=None))
    return "\n".join(lines)


def write_results_section(root, sample, summary, matrix, tidy, counts, audit):
    notes = root / "q3_q4_transformation_notes.md"
    if not notes.exists():
        raise FileNotFoundError("Keep q3_q4_transformation_notes.md with the repository; it contains definitions and limitations.")
    marker = "<!-- GENERATED_RESULTS_START -->"
    endmarker = "<!-- GENERATED_RESULTS_END -->"
    text = notes.read_text(encoding="utf-8")
    if marker not in text or endmarker not in text:
        raise ValueError("Notes results markers missing")
    section = (
        f"\n\nActual run completed at {audit['run_utc']}. These tables are generated from the cached raw CSVs.\n\n"
        "#### Q3 Data Table — fixed 12-county documentation sample\n\n"
        "NYC five counties plus seven named counties chosen for geographical/contextual breadth, not statistical representativeness. "
        "These rows are selected directly from data/processed/q3_county_svi.csv, which also contains adult population, all CIs, four themes and join status.\n\n"
        + markdown_table(sample[["county_fips", "state", "county", *VALUE_COLS, "RPL_THEMES", "is_nyc", "borough"]])
        + "\n\nQ3 overall SVI Spearman correlations:\n\n" + markdown_table(summary)
        + "\n\n#### Q4 Data Table — Spearman correlation matrix\n\n" + markdown_table(matrix.reset_index())
        + "\n\nPairwise valid county counts:\n\n" + markdown_table(counts.reset_index())
        + "\n\nQ4 complete tidy table:\n\n" + markdown_table(tidy)
        + "\n\n#### Actual validation\n\n"
        + markdown_table(pd.DataFrame([
            {"metric": key, "value": audit[key]} for key in ["merged_counties", "matched_counties", "places_only_counties", "svi_only_counties",
             "fips_match_rate_places_denominator", "fips_match_rate_svi_denominator", "duplicate_fips_merged", "explicit_scope_exclusions"]]))
        + "\n\nRaw source counts:\n\n" + markdown_table(pd.DataFrame([{"dataset": k, **v} for k, v in audit["raw"].items()]))
        + "\n\nMissing values (non-NYC borough blanks are expected):\n\n"
        + markdown_table(pd.DataFrame([{"column": k, "n_missing": v} for k, v in audit["missing_counts"].items()]))
        + "\n\nQ1 alignment/reuse status: `" + json.dumps(audit["q1"], ensure_ascii=False).replace("`", "'") + "`\n\n"
        + "Full checks, anomaly records, out-of-scope records, unmatched FIPS and source hashes are in the exported audit files.\n\n"
    )
    before, rest = text.split(marker, 1)
    _, after = rest.split(endmarker, 1)
    result = before + marker + section + endmarker + after
    status_start, status_end = "<!-- RUN_STATUS_START -->", "<!-- RUN_STATUS_END -->"
    if status_start in result and status_end in result:
        before_status, rest_status = result.split(status_start, 1)
        _, after_status = rest_status.split(status_end, 1)
        result = (before_status + status_start + f"\n\n**Current status: empirical transformation completed at {audit['run_utc']}; implemented validation checks passed.**\n\n"
                  "Actual computed results are in the generated-results section. Source hashes and download records are in the run manifest. "
                  "An uploaded file's release year and national ranking universe still require confirmation against the original CDC export. "
                  "Q1 alignment status is recorded separately and may remain unresolved.\n\n" + status_end + after_status)
    notes.write_text(result, encoding="utf-8")


def export_results(root, q3, summary, sample, matrix, tidy, counts, audit, checks,
                   issues, exclusions, scope_diff, inspection, raw_summary, provenance):
    root = Path(root)
    out = root / "data/processed"
    out.mkdir(parents=True, exist_ok=True)
    validation_dir = root / "docs/validation"
    validation_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "q3_county_svi.csv": q3, "q3_national_summary.csv": summary,
        "q4_correlations.csv": matrix.reset_index(), "q4_correlations_tidy.csv": tidy,
    }
    diagnostics = {
        "unmatched_counties.csv": q3.loc[q3.join_status.ne("matched"), ["county_fips", "state", "county", "join_status"]],
        "missingness.csv": pd.DataFrame([{"column": c, "n_missing": n, "n_counties": len(q3)} for c, n in audit["missing_counts"].items()]),
        "cleaning_issues.csv": issues, "scope_exclusions.csv": exclusions,
        "q1_scope_differences.csv": scope_diff, "raw_schema.csv": inspection,
        "raw_summary.csv": raw_summary, "validation_checks.csv": checks,
    }
    # Write notes first to catch missing documentation templates before CSV export.
    write_results_section(root, sample, summary, matrix, tidy, counts, audit)
    for filename, df in outputs.items():
        df.to_csv(out / filename, index=False, encoding="utf-8", na_rep="", float_format="%.10g")
    for filename, df in diagnostics.items():
        df.to_csv(validation_dir / filename, index=False, encoding="utf-8", na_rep="", float_format="%.10g")
    json_write(validation_dir / "validation.json", audit)
    manifest = {"run_utc": audit["run_utc"], "status": audit["status"], "sources": provenance,
                "software": {"python": sys.version.split()[0], "pandas": pd.__version__},
                "parameters": {"scope": "Union of official county FIPS in 50 states + DC", "join": "outer one_to_one",
                               "correlation": "Spearman; pairwise complete; average ranks for ties", "weighted": False,
                               "places_release": 2025, "svi_release": 2022,
                               "nyc_borough_map": NYC, "sample_fips": SAMPLE_FIPS},
                "outputs": {name: {"rows": len(df), "sha256": file_sha256(out / name)} for name, df in outputs.items()},
                "validation_files": {name: {"rows": len(df), "sha256": file_sha256(validation_dir / name)} for name, df in diagnostics.items()}}
    json_write(validation_dir / "run_manifest.json", manifest)
    (validation_dir / "last_attempt.json").unlink(missing_ok=True)
    return list(outputs)


def run(root, download=True, svi_url=None):
    root = Path(root).resolve()
    frames, q1, provenance, inspection, raw_summary = load_sources(root, download, svi_url)
    cleaned, issues, exclusions = clean_sources(frames)
    merged, q1_report, scope_diff = merge_counties(cleaned, q1)
    q3, summary, sample = q3_transform(merged)
    matrix, tidy, counts = q4_transform(q3)
    audit, checks = validate(frames, cleaned, merged, q3, summary, matrix, tidy, issues, exclusions, q1_report)
    files = export_results(root, q3, summary, sample, matrix, tidy, counts, audit, checks,
                           issues, exclusions, scope_diff, inspection, raw_summary, provenance)
    return {"q3": q3, "summary": summary, "sample": sample, "matrix": matrix, "tidy": tidy,
            "counts": counts, "audit": audit, "files": files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--no-download", action="store_true", help="Use cached/uploaded CSVs only")
    parser.add_argument("--svi-url", default=None, help="Exact official US county CSV URL obtained from the CDC download selector; no guessed endpoint")
    args = parser.parse_args()
    try:
        result = run(args.root, not args.no_download, args.svi_url)
    except Exception as exc:
        failure = {"status": "blocked_or_failed", "observed_utc": utc_now(), "error_type": type(exc).__name__, "error": str(exc),
                   "note": "No successful new data transformation is claimed. Existing outputs, if any, may belong to an earlier run."}
        json_write(args.root / "docs/validation/last_attempt.json", failure)
        print(json.dumps(failure, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1
    print(result["sample"][["county_fips", "county", *VALUE_COLS, "RPL_THEMES"]].to_string(index=False))
    print(result["matrix"].to_string())
    print(json.dumps({k: result["audit"][k] for k in ["status", "merged_counties", "matched_counties", "places_only_counties", "svi_only_counties"]}, indent=2))
    print("\n".join(result["files"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
