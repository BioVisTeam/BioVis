"""Slide-sized (16:9) versions of the sketches, no in-figure titles (titles live on the slide).
Original doc: Milestone 2 sketches for Q1 and Q2, generated with matplotlib from the processed tables.
Run after build_tables.py:  python src/make_sketches.py [--county-geo PATH]
Boundaries: Census 2023 cartographic files (county 1:20m, NY tracts 1:500k) in data/raw/.
"""
import argparse
from pathlib import Path
import numpy as np, pandas as pd, geopandas as gpd
import matplotlib as mpl
mpl.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parents[1]
P, FIG = ROOT / "data/processed", ROOT / "figures"
ap = argparse.ArgumentParser()
ap.add_argument("--county-geo", default=str(ROOT / "data/raw/boundaries/cb_2023_us_county_20m.zip"))
ap.add_argument("--tract-geo", default=str(ROOT / "data/raw/boundaries/cb_2023_36_tract_500k.zip"))
args = ap.parse_args()

SURF, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df"
RAMP = ["#b7d3f6", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"]  # sequential blue 150/250/400/550/700
MISSING = "#d9d8d2"
LABEL = {"DIABETES": "Diabetes", "CHD": "Coronary heart disease", "BPHIGH": "High blood pressure", "OBESITY": "Obesity", "COPD": "COPD"}
BORO = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]
mpl.rcParams.update({"figure.facecolor": SURF, "axes.facecolor": SURF, "savefig.facecolor": SURF, "text.color": INK,
                     "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2, "axes.edgecolor": GRID,
                     "font.size": 12, "axes.titlesize": 14, "axes.titleweight": "bold", "hatch.linewidth": 0.6})


def style(ax):
    for s in ("top", "right"): ax.spines[s].set_visible(False)
    ax.grid(axis="y", color=GRID, lw=.8); ax.set_axisbelow(True)


def callouts(fig, lines, y=0.015):
    fig.text(0.015, y, "INTERACTION\n" + "\n".join("•  " + l for l in lines), fontsize=8.5, color=INK2, va="bottom", linespacing=1.5)


q1 = pd.read_csv(P / "q1_county_prevalence.csv", dtype={"county_fips": str}).assign(county_fips=lambda d: d.county_fips.str.zfill(5))
t = pd.read_csv(P / "q2_nyc_tracts.csv", dtype={"tract_fips": str, "county_fips": str})

# =============================================================== Q1 sketch: one county choropleth per condition (small multiples)
import textwrap
from matplotlib.patches import Rectangle
gdf = gpd.read_file("zip://" + args.county_geo if args.county_geo.endswith(".zip") else args.county_geo)
gdf["county_fips"] = gdf["GEOID"]
gdf = gdf[~gdf.county_fips.str[:2].isin(["72"])]  # Puerto Rico: no PLACES estimates, left out
cols = ["county_fips", "missing_estimates"] + [f"{k}_quintile" for k in LABEL]
from shapely import affinity
g = gdf.merge(q1[cols], on="county_fips", how="left")
st = g.county_fips.str[:2]
lower = g[~st.isin(["02", "15"])].to_crs(5070)
minx, miny, maxx, maxy = lower.total_bounds
W_, H_ = maxx - minx, maxy - miny
def inset(sub, crs, scale, x_frac, y_off):
    """AlbersUSA-style inset: reproject, scale, move below the contiguous US."""
    sub = sub.to_crs(crs).copy()
    bx0, by0, bx1, by1 = sub.total_bounds
    sub["geometry"] = sub.geometry.apply(lambda geom: affinity.translate(
        affinity.scale(geom, xfact=scale, yfact=scale, origin=(bx0, by0)),
        xoff=minx + x_frac * W_ - bx0, yoff=miny - y_off - by0))
    return sub.set_crs(5070, allow_override=True)
ak = inset(g[st == "02"], 3338, 0.32, 0.02, 0.17 * H_ + 0.0 * H_)
hi = inset(g[st == "15"], "ESRI:102007", 1.0, 0.27, 0.10 * H_)
g = pd.concat([lower, ak, hi], ignore_index=True)
no_est = g[g.missing_estimates.ne(False)]  # KY, PA (no estimates) plus any boundary row absent from PLACES
fig = plt.figure(figsize=(16, 8.6))
W, H = 0.30, 0.42
pos = [(0.015, 0.50), (0.350, 0.50), (0.685, 0.50), (0.015, 0.02), (0.350, 0.02)]
for (x0, y0), k in zip(pos, LABEL):
    ax = fig.add_axes([x0, y0 + 0.035, W, H - 0.04])
    has = g[f"{k}_quintile"].notna()
    g[has].plot(ax=ax, color=[RAMP[int(i) - 1] for i in g.loc[has, f"{k}_quintile"]], edgecolor=SURF, linewidth=.1)
    no_est.plot(ax=ax, facecolor=MISSING, edgecolor="#8e8d86", hatch="////", linewidth=.1)
    ax.set_axis_off(); ax.set_title(LABEL[k], loc="left", fontsize=16, fontweight="bold")
    ed = q1[f"{k}_adj"].quantile([0, .2, .4, .6, .8, 1]).values
    kb = fig.add_axes([x0 + 0.01, y0 + 0.002, W - 0.02, 0.05]); kb.set_xlim(0, 5); kb.set_ylim(0, 1); kb.set_axis_off()
    for i in range(5):
        kb.add_patch(Rectangle((i, .5), 1, .42, fc=RAMP[i], ec=SURF, lw=1))
        kb.text(i, .12, f"{ed[i]:.1f}", fontsize=11, ha="center", va="center", color=INK2)
    kb.text(5, .12, f"{ed[5]:.1f}", fontsize=11, ha="center", va="center", color=INK2)
kx, ky = 0.685, 0.02
fig.text(kx, ky + 0.40, "HOW TO READ", fontsize=12, fontweight="bold", color=INK2, va="top")
notes = ["One map per condition, drawn the same way. Light = the lowest fifth of counties for that condition, dark = the highest fifth.",
         "The numbers under each map are its class breaks. They differ because the conditions run on different scales.",
         "Values are age-adjusted % of adults, for 3,143 counties (CDC PLACES, 2025 release)."]
fig.text(kx, ky + 0.36, "\n".join(textwrap.fill("•  " + n, 52, subsequent_indent="    ") for n in notes), fontsize=12.5, color=INK2, va="top", linespacing=1.4)
fig.legend(handles=[Patch(fc=MISSING, ec="#8e8d86", hatch="////", label="No estimate in release: all of KY and PA, and Loving Co., TX")],
           loc="lower left", bbox_to_anchor=(kx - 0.005, ky), frameon=False, fontsize=11)
fig.savefig(FIG / "slides" / "q1_map_slide.png", dpi=170); plt.close(fig)
print("saved Q1 map")

# Q1 small multiples: distributions for the 5 outcomes
fig, axs = plt.subplots(1, 5, figsize=(16, 6.2)); fig.subplots_adjust(top=.9, bottom=.14, wspace=.3, left=.05, right=.99)
for ax, mm in zip(axs, LABEL):
    style(ax); vv = q1[f"{mm}_adj"].dropna()
    ax.hist(vv, bins=35, color=RAMP[2], edgecolor=SURF, linewidth=.5)
    ax.axvline(vv.median(), color=INK, lw=1.2)
    ax.axvspan(vv.quantile(.1), vv.quantile(.9), color=RAMP[0], alpha=.35, zorder=0)
    ax.set_title(LABEL[mm], loc="left", fontsize=10); ax.set_xlabel("Adj. prevalence (%)")
    ax.text(.98, .93, f"median {vv.median():.1f}\np10–p90 {vv.quantile(.1):.1f}–{vv.quantile(.9):.1f}", transform=ax.transAxes, ha="right", va="top", fontsize=11, color=INK2)
axs[0].set_ylabel("Counties")
fig.savefig(FIG / "slides" / "q1_dist_slide.png", dpi=170); plt.close(fig)

# =============================================================== Q2 sketch: NYC tract map + borough box plots, diabetes
m = "DIABETES"
keep = t[~t.small_pop_flag]; small = t[t.small_pop_flag]
qe = keep[f"{m}_crude"].quantile([0, .2, .4, .6, .8, 1]).values
cls = np.clip(np.searchsorted(qe[1:-1], keep[f"{m}_crude"], side="right"), 0, 4)
tr_geo = gpd.read_file("zip://" + args.tract_geo if args.tract_geo.endswith(".zip") else args.tract_geo)
tr_geo = tr_geo[tr_geo.COUNTYFP.isin(["005", "047", "061", "081", "085"])].to_crs(2263)
tg = tr_geo.merge(t[["tract_fips", "small_pop_flag", f"{m}_crude"]], left_on="GEOID", right_on="tract_fips", how="left")
has_val = tg[f"{m}_crude"].notna()
tg["cls"] = np.where(has_val, np.clip(np.searchsorted(qe[1:-1], tg[f"{m}_crude"].fillna(0), side="right"), 0, 4), -1)
fig = plt.figure(figsize=(16, 8.8))
axm = fig.add_axes([0.0, 0.2, 0.47, 0.78])
flag = tg.small_pop_flag.eq(True)
ok = tg[has_val & ~flag]
ok.plot(ax=axm, color=[RAMP[int(i)] for i in ok.cls], edgecolor=SURF, linewidth=.2)
tg[flag].plot(ax=axm, facecolor="white", edgecolor=INK, hatch="////", linewidth=.5)
tg[~has_val].plot(ax=axm, facecolor=MISSING, edgecolor="#8e8d86", hatch="....", linewidth=.2)
axm.set_axis_off()
NAMES = {"005": "Bronx", "047": "Brooklyn", "061": "Manhattan", "081": "Queens", "085": "Staten Island"}
for cf, row in tr_geo.dissolve("COUNTYFP").iterrows():
    pt = row.geometry.representative_point()
    axm.text(pt.x, pt.y, NAMES[cf].upper(), fontsize=10, color=INK, ha="center", fontweight="bold", bbox=dict(boxstyle="round,pad=.15", fc=SURF, ec="none", alpha=.8))
hs = [Patch(fc=RAMP[i], label=f"{qe[i]:.1f} – {qe[i+1]:.1f}%") for i in range(5)]
hs.append(Patch(fc="white", ec=INK, hatch="////", label=f"Under 500 adults ({len(small)} tracts): shown, not in statistics"))
hs.append(Patch(fc=MISSING, ec="#8e8d86", hatch="....", label=f"No PLACES estimate ({int((~has_val).sum())} tracts)"))
fig.legend(handles=hs, title="Crude prevalence, NYC tract quintiles", loc="lower left", bbox_to_anchor=(0.01, 0.0), ncol=2, frameon=False, fontsize=11, title_fontsize=12, alignment="left")

axb = fig.add_axes([0.55, 0.27, 0.43, 0.66]); style(axb)
rng = np.random.default_rng(7)
for i, b_ in enumerate(BORO):
    g_ = keep[keep.borough == b_][f"{m}_crude"]
    axb.scatter(i + rng.uniform(-.30, .30, len(g_)), g_, s=7, color=RAMP[2], alpha=.35, linewidth=0)
    q = g_.quantile([.1, .25, .5, .75, .9]).values
    axb.add_patch(plt.Rectangle((i - .17, q[1]), .34, q[3] - q[1], fc=SURF, ec=INK, lw=1.2, alpha=.85, zorder=3))
    axb.plot([i - .17, i + .17], [q[2]] * 2, color=INK, lw=2.2, zorder=4)
    axb.plot([i, i], [q[0], q[1]], color=INK, lw=1.2, zorder=3); axb.plot([i, i], [q[3], q[4]], color=INK, lw=1.2, zorder=3)
    c = keep[keep.borough == b_][f"{m}_county_crude"].iloc[0]
    axb.scatter(i, c, marker="D", s=70, color="#d03b3b", edgecolor=SURF, linewidth=1.5, zorder=5)
    axb.text(i + .22, c, f"{c:.1f}", fontsize=12, va="center", color=INK, fontweight="bold")
axb.set_xticks(range(5)); axb.set_xticklabels([f"{b_}\n{keep[keep.borough==b_][f'{m}_crude'].min():.1f}–{keep[keep.borough==b_][f'{m}_crude'].max():.1f}" for b_ in BORO])
axb.set_xlabel("Second line under each borough: lowest–highest tract value (%)", fontsize=11); axb.set_ylabel("Adults with diabetes (%), crude")
axb.set_title("Tract spread vs. the single county number", loc="left")
axb.legend(handles=[Line2D([], [], marker="D", ls="", color="#d03b3b", label="County estimate (what a county map shows)"),
                    Line2D([], [], marker="o", ls="", color=RAMP[2], alpha=.6, ms=4, label="One census tract"),
                    Line2D([], [], color=INK, lw=2.2, label="Median · box = middle 50% · whiskers = 10th–90th pct.")],
           loc="lower left", bbox_to_anchor=(-0.02, -0.30), frameon=False, fontsize=11)
man = keep[keep.borough == "Manhattan"]
axb.text(1.75, 32.6, f"Manhattan: the county says {man[f'{m}_county_crude'].iloc[0]:.1f}%, but {100*(man[f'{m}_minus_county'].abs()>3).mean():.0f}% of\nits tracts sit more than 3 points away from that number", fontsize=11, color=INK2, va="top")
axb.set_ylim(0, 33)
fig.savefig(FIG / "slides" / "q2_map_slide.png", dpi=170); plt.close(fig)

# Q2 all-measures: box plots, small multiples
fig, axs = plt.subplots(1, 5, figsize=(16, 6.2)); fig.subplots_adjust(top=.9, bottom=.14, wspace=.32, left=.05, right=.99)
for ax, mm in zip(axs, LABEL):
    style(ax)
    for i, b_ in enumerate(BORO):
        gg = keep[keep.borough == b_]; v_ = gg[f"{mm}_crude"]
        ax.scatter(i + rng.uniform(-.3, .3, len(v_)), v_, s=3, color=RAMP[2], alpha=.3, linewidth=0)
        q = v_.quantile([.1, .25, .5, .75, .9]).values
        ax.add_patch(plt.Rectangle((i - .22, q[1]), .44, q[3] - q[1], fc=SURF, ec=INK, lw=1, alpha=.85, zorder=3)); ax.plot([i - .22, i + .22], [q[2]] * 2, color=INK, lw=1.8, zorder=4)
        ax.plot([i, i], [q[0], q[1]], color=INK, lw=1, zorder=3); ax.plot([i, i], [q[3], q[4]], color=INK, lw=1, zorder=3)
        ax.scatter(i, gg[f"{mm}_county_crude"].iloc[0], marker="D", s=34, color="#d03b3b", edgecolor=SURF, linewidth=1, zorder=5)
    ax.set_xticks(range(5)); ax.set_xticklabels(["Bx", "Bk", "Mn", "Qn", "SI"], fontsize=9); ax.set_title(LABEL[mm], loc="left", fontsize=10)
axs[0].set_ylabel("Crude prevalence (%)")
fig.savefig(FIG / "slides" / "q2_boxes_slide.png", dpi=170); plt.close(fig)
print("saved Q2")
