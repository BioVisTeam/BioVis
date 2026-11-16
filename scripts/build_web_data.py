"""Build the data files the M3 React + D3 dashboard loads (app/public/data/).

Run from the repo root:
    python scripts/build_web_data.py --raw data/raw_local

Inputs
  repo:   data/processed/q1_county_prevalence.csv, q3_county_svi.csv, q2_nyc_tracts.csv,
          data/raw/boundaries/cb_2023_us_county_20m.zip, cb_2023_36_tract_500k.zip
  --raw:  places_tract_2025.csv (PLACES 2025 tract, all states, data.cdc.gov/d/yjkw-uj5s)
          svi_2022_tract.csv     (CDC/ATSDR SVI 2022 US tract)
          Both are too big for GitHub; keep them in a git-ignored folder.

Outputs (app/public/data/)
  counties.geojson      3,144 county polygons (no Puerto Rico), key GEOID
  nyc_tracts.geojson    2,324 NYC tract polygons, key GEOID
  county.csv            one row per county: PLACES age-adjusted (5 conditions) + SVI overall + 4 themes
  nyc_tracts.csv        one row per NYC tract with PLACES: crude prevalence, CI, county crude, SVI
  us_tracts.csv         one row per US tract with PLACES: crude prevalence (5) + adults + SVI (Q6)
  q4_correlations.csv   20 Spearman rho values (copied from Q3/Q4 build)
"""
import argparse
import json
import os
import shutil

import geopandas as gpd
import numpy as np
import pandas as pd

M = ["DIABETES", "CHD", "BPHIGH", "OBESITY", "COPD"]
THEMES = ["RPL_THEMES", "RPL_THEME1", "RPL_THEME2", "RPL_THEME3", "RPL_THEME4"]
NYC = ["36005", "36047", "36061", "36081", "36085"]
MIN_ADULTS = 500  # one small-population rule for every tract view (Q2, Q5, Q6)


def svi_tract(raw):
    s = pd.read_csv(os.path.join(raw, "svi_2022_tract.csv"), dtype={"FIPS": str}, usecols=["FIPS"] + THEMES)
    s["FIPS"] = s["FIPS"].str.zfill(11)
    for c in THEMES:
        s[c] = s[c].where(s[c] >= 0)  # -999 means missing
    return s.rename(columns={"FIPS": "tract_fips"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw_local")
    ap.add_argument("--out", default="app/public/data")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    # 1. geometry
    c = gpd.read_file("zip://data/raw/boundaries/cb_2023_us_county_20m.zip")
    c = c[c.GEOID.str[:2] != "72"][["GEOID", "NAME", "STUSPS", "geometry"]]
    c.to_file(os.path.join(a.out, "counties.geojson"), driver="GeoJSON", COORDINATE_PRECISION=4)
    t = gpd.read_file("zip://data/raw/boundaries/cb_2023_36_tract_500k.zip")
    t = t[t.GEOID.str[:5].isin(NYC)][["GEOID", "geometry"]]
    t.to_file(os.path.join(a.out, "nyc_tracts.geojson"), driver="GeoJSON", COORDINATE_PRECISION=5)

    # 2. county table: PLACES (Q1) + SVI (Q3/Q4) in one row
    q1 = pd.read_csv("data/processed/q1_county_prevalence.csv", dtype={"county_fips": str})
    q3 = pd.read_csv("data/processed/q3_county_svi.csv", dtype={"county_fips": str})
    keep = ["county_fips"] + THEMES + ["is_nyc", "borough"]
    county = q3[["county_fips", "state", "county"]].merge(q1.drop(columns=["state", "county"]), on="county_fips", how="left")
    county = county.merge(q3[keep], on="county_fips", how="left")
    county["missing_estimates"] = county["DIABETES_adj"].isna()
    county.to_csv(os.path.join(a.out, "county.csv"), index=False)

    # 3. US tracts (Q6) from the full PLACES tract file
    cols = ["StateAbbr", "CountyFIPS", "TractFIPS", "TotalPop18plus"] + [f"{m}_CrudePrev" for m in M]
    p = pd.read_csv(os.path.join(a.raw, "places_tract_2025.csv"), dtype=str, usecols=cols)
    p["TotalPop18plus"] = pd.to_numeric(p["TotalPop18plus"].str.replace(",", ""), errors="coerce")
    for m in M:
        p[f"{m}_CrudePrev"] = pd.to_numeric(p[f"{m}_CrudePrev"], errors="coerce")
    us = p.rename(columns={"StateAbbr": "state", "CountyFIPS": "county_fips", "TractFIPS": "tract_fips",
                           "TotalPop18plus": "pop18plus", **{f"{m}_CrudePrev": f"{m}_crude" for m in M}})
    us["tract_fips"] = us["tract_fips"].str.zfill(11)
    us["county_fips"] = us["county_fips"].str.zfill(5)
    svi = svi_tract(a.raw)
    us = us.merge(svi, on="tract_fips", how="left")
    us["small_pop_flag"] = us["pop18plus"] < MIN_ADULTS
    us.to_csv(os.path.join(a.out, "us_tracts.csv"), index=False)

    # 4. NYC tracts (Q2, Q5, NYC part of Q6): Q2 table + SVI
    q2 = pd.read_csv("data/processed/q2_nyc_tracts.csv", dtype={"tract_fips": str, "county_fips": str})
    nyc = q2.merge(svi, on="tract_fips", how="left")
    nyc.to_csv(os.path.join(a.out, "nyc_tracts.csv"), index=False)

    # 5. Q4 correlations
    shutil.copy("data/processed/q4_correlations_tidy.csv", os.path.join(a.out, "q4_correlations.csv"))

    # 6. checks + Q6 worked default (printed; numbers go in the write-up)
    print("counties.geojson features:", len(c), "| county.csv rows:", len(county),
          "| with estimates:", int((~county.missing_estimates).sum()))
    print("nyc_tracts.geojson features:", len(t), "| nyc_tracts.csv rows:", len(nyc),
          "| NYC tracts missing SVI:", int(nyc.RPL_THEMES.isna().sum()))
    print("us_tracts.csv rows:", len(us), "| states:", us.state.nunique(),
          "| missing SVI:", int(us.RPL_THEMES.isna().sum()))
    for m in M:
        print(f"  {m}: tracts missing crude prevalence = {int(us[f'{m}_crude'].isna().sum())}")
    report = {}
    for scope, d in [("US", us), ("NYC", us[us.county_fips.isin(NYC)])]:
        report[scope] = q6_default(d, "DIABETES")
    print(json.dumps(report, indent=2))
    for f in sorted(os.listdir(a.out)):
        print(f"  {f}: {os.path.getsize(os.path.join(a.out, f)) / 1e6:.2f} MB")


def q6_default(d, m, top=0.10):
    """Worked Q6 default: top 10% on each criterion among eligible tracts; selected = meets >= k."""
    d = d.copy()
    n_all = len(d)
    elig = d[f"{m}_crude"].notna() & (d["pop18plus"] >= MIN_ADULTS)
    d = d[elig].copy()
    d["count"] = d[f"{m}_crude"] / 100 * d["pop18plus"]
    prev_cut = d[f"{m}_crude"].quantile(1 - top)
    count_cut = d["count"].quantile(1 - top)
    svi_cut = 1 - top  # SVI is already a national percentile (0-1)
    d["prev_top"] = d[f"{m}_crude"] >= prev_cut
    d["count_top"] = d["count"] >= count_cut
    d["svi_known"] = d["RPL_THEMES"].notna()
    d["svi_top"] = d["RPL_THEMES"] >= svi_cut  # NaN -> False; reported separately as not evaluable
    d["criteria_met"] = d[["prev_top", "count_top", "svi_top"]].sum(axis=1)
    combo = d.groupby(["prev_top", "count_top", "svi_top"]).size()
    return {
        "condition": m,
        "tracts_in_file": n_all,
        "eligible (estimate and >= 500 adults)": int(len(d)),
        "excluded": int(n_all - len(d)),
        "svi_missing_among_eligible": int((~d.svi_known).sum()),
        "cutoffs": {"prevalence_%": round(float(prev_cut), 1), "est_adults": round(float(count_cut)),
                    "svi_percentile": svi_cut},
        "selected_by_each": {"prevalence": int(d.prev_top.sum()), "count": int(d.count_top.sum()),
                             "svi": int(d.svi_top.sum())},
        "meets_at_least_1 (OR)": int((d.criteria_met >= 1).sum()),
        "meets_at_least_2": int((d.criteria_met >= 2).sum()),
        "meets_all_3 (AND)": int((d.criteria_met == 3).sum()),
        "overlap_combinations (prev,count,svi)": {"".join("Y" if v else "n" for v in k): int(n)
                                                  for k, n in combo.items()},
    }


if __name__ == "__main__":
    main()
