"""Write markdown sample tables for the Milestone 2 report -> docs/sample_tables.md"""
from pathlib import Path
import pandas as pd
ROOT = Path(__file__).resolve().parents[1]; P = ROOT / "data/processed"; (ROOT / "docs").mkdir(exist_ok=True)
md = lambda df: df.to_markdown(index=False)
q1 = pd.read_csv(P / "q1_county_prevalence.csv", dtype={"county_fips": str}); q1["county_fips"] = q1.county_fips.str.zfill(5)
q1["DIABETES_quintile"] = q1.DIABETES_quintile.astype("Int64")
t = pd.read_csv(P / "q2_nyc_tracts.csv", dtype={"tract_fips": str})
s1 = pd.read_csv(P / "q1_national_summary.csv"); s2 = pd.read_csv(P / "q2_nyc_borough_summary.csv")
a = q1[q1.county_fips.isin(["01001", "06037", "08031", "36061", "46102", "21001", "42101"])][
    ["county_fips", "state", "county", "pop18plus", "DIABETES_adj", "DIABETES_adj_lo", "DIABETES_adj_hi", "DIABETES_quintile", "CHD_adj", "OBESITY_adj"]]
b = t.sort_values("tract_fips").groupby("borough").head(2).sort_values("tract_fips")[
    ["tract_fips", "borough", "pop18plus", "small_pop_flag", "DIABETES_crude", "DIABETES_crude_lo", "DIABETES_crude_hi", "DIABETES_county_crude", "DIABETES_minus_county"]]
out = ["# Sample tables for Milestone 2 report\n", "## Q1 · county table (sample rows; includes KY and PA rows to show missing data)\n", md(a.astype(object).where(a.notna(), "NA")),
       "\n## Q1 · national summary (age-adjusted, per measure)\n", md(s1),
       "\n## Q2 · NYC tract table (sample rows)\n", md(b),
       "\n## Q2 · borough summary, diabetes (tracts with 500+ adults)\n", md(s2[s2.measure == "Diabetes"].drop(columns="measure"))]
(ROOT / "docs/sample_tables.md").write_text("\n".join(out)); print("ok")
