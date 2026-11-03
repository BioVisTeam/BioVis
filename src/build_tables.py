"""Milestone 2: build processed tables for Q1 (national county variation) and Q2 (NYC within-county variation).

Inputs  (data/raw/):  places_2025_county_gis.csv, places_2025_tract_nyc.csv (NYC rows only, see extract_nyc_tracts.py)
Outputs (data/processed/): q1_county_prevalence.csv, q1_national_summary.csv,
                           q2_nyc_tracts.csv, q2_nyc_borough_summary.csv
Run:  python src/build_tables.py
"""
import re
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, OUT = ROOT / "data/raw", ROOT / "data/processed"
OUT.mkdir(parents=True, exist_ok=True)

# Five health outcomes named in the proposal (PLACES column prefix -> label)
MEASURES = {"DIABETES": "Diabetes", "CHD": "Coronary heart disease", "BPHIGH": "High blood pressure",
            "OBESITY": "Obesity", "COPD": "COPD"}
NYC = {"36005": "Bronx", "36047": "Brooklyn", "36061": "Manhattan", "36081": "Queens", "36085": "Staten Island"}
SMALL_POP_18 = 500  # tracts with fewer than 500 adults are flagged and excluded from distribution stats

CI = re.compile(r"\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)")


def num(s):  # "14,369" -> 14369
    return pd.to_numeric(s.astype(str).str.replace(",", "", regex=False), errors="coerce")


def ci(s):  # "( 8.2, 11.5)" -> (8.2, 11.5)
    x = s.astype("string").str.extract(CI).astype(float)
    return x[0], x[1]


def load(name, **kw):
    df = pd.read_csv(RAW / name, dtype={"CountyFIPS": str, "TractFIPS": str}, **kw)
    df.columns = [c.strip() for c in df.columns]  # one header has a trailing tab
    for c in ("TotalPopulation", "TotalPop18plus"):
        df[c] = num(df[c])
    return df


# ---------------------------------------------------------------- Q1: county, age-adjusted
cty = load("places_2025_county_gis.csv")
q1 = cty[["CountyFIPS", "StateAbbr", "CountyName", "TotalPopulation", "TotalPop18plus"]].copy()
q1.columns = ["county_fips", "state", "county", "pop", "pop18plus"]
for m in MEASURES:
    q1[f"{m}_adj"] = cty[f"{m}_AdjPrev"]
    q1[f"{m}_adj_lo"], q1[f"{m}_adj_hi"] = ci(cty[f"{m}_Adj95CI"])
    # 5 equal-count classes; same rule for every measure so maps are comparable. NaN stays NaN (shown as missing)
    q1[f"{m}_quintile"] = (pd.qcut(q1[f"{m}_adj"], 5, labels=False) + 1).astype("Int64")
q1["missing_estimates"] = q1["DIABETES_adj"].isna()
q1 = q1.sort_values("county_fips").reset_index(drop=True)
q1.to_csv(OUT / "q1_county_prevalence.csv", index=False)

rows = []
for m, label in MEASURES.items():
    v = q1[f"{m}_adj"].dropna()
    hi, lo = q1.loc[v.idxmax()], q1.loc[v.idxmin()]
    rows.append(dict(measure=label, n_counties=len(v), n_missing=int(q1[f"{m}_adj"].isna().sum()),
                     min=v.min(), p10=v.quantile(.1), median=v.median(), p90=v.quantile(.9), max=v.max(),
                     p90_minus_p10=v.quantile(.9) - v.quantile(.1),
                     lowest_county=f"{lo.county}, {lo.state}", highest_county=f"{hi.county}, {hi.state}"))
pd.DataFrame(rows).round(1).to_csv(OUT / "q1_national_summary.csv", index=False)

# ---------------------------------------------------------------- Q2: NYC tracts, crude (tract file has no age-adjusted values)
trt = load("places_2025_tract_nyc.csv")
t = trt[trt.CountyFIPS.isin(NYC)].copy()
geo = t["Geolocation"].str.extract(r"POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)").astype(float)
out = pd.DataFrame({"tract_fips": t.TractFIPS, "county_fips": t.CountyFIPS, "borough": t.CountyFIPS.map(NYC),
                    "pop": t.TotalPopulation, "pop18plus": t.TotalPop18plus,
                    "lon": geo[0], "lat": geo[1]})
out["small_pop_flag"] = out.pop18plus < SMALL_POP_18
cnyc = cty[cty.CountyFIPS.isin(NYC)].set_index("CountyFIPS")
for m in MEASURES:
    out[f"{m}_crude"] = t[f"{m}_CrudePrev"].values
    out[f"{m}_crude_lo"], out[f"{m}_crude_hi"] = ci(t[f"{m}_Crude95CI"])
    out[f"{m}_ci_width"] = out[f"{m}_crude_hi"] - out[f"{m}_crude_lo"]
    out[f"{m}_county_crude"] = out.county_fips.map(cnyc[f"{m}_CrudePrev"])  # the "county average" a county map would show
    out[f"{m}_minus_county"] = out[f"{m}_crude"] - out[f"{m}_county_crude"]
out = out.sort_values("tract_fips").reset_index(drop=True)
out.to_csv(OUT / "q2_nyc_tracts.csv", index=False)

rows = []
keep = out[~out.small_pop_flag]
for m, label in MEASURES.items():
    for fips, b in NYC.items():
        g = keep[keep.county_fips == fips]
        v = g[f"{m}_crude"]
        rows.append(dict(measure=label, borough=b, n_tracts=len(v), county_estimate=g[f"{m}_county_crude"].iloc[0],
                         tract_min=v.min(), tract_p10=v.quantile(.1), tract_median=v.median(),
                         tract_p90=v.quantile(.9), tract_max=v.max(),
                         p90_minus_p10=v.quantile(.9) - v.quantile(.1),
                         pct_tracts_gt3pts_from_county=100 * (v.sub(g[f"{m}_county_crude"]).abs() > 3).mean(),
                         pct_tracts_above_county=100 * (v > g[f"{m}_county_crude"]).mean()))
pd.DataFrame(rows).round(1).to_csv(OUT / "q2_nyc_borough_summary.csv", index=False)

print("Q1 rows", len(q1), "| missing counties", int(q1.missing_estimates.sum()), q1[q1.missing_estimates].state.value_counts().to_dict())
print("Q2 tracts", len(out), "| flagged small-pop", int(out.small_pop_flag.sum()), "| lat/lon missing", int(out.lat.isna().sum()))
