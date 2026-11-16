"""Build per-state tract outlines for the Overview map (zoom anywhere in the US).

Input : data/raw/boundaries/tracts/cb_2023_<state fips>_tract_500k.zip, one per state, from
        https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_<fips>_tract_500k.zip
Output: app/public/data/tracts/<state fips>.geojson, properties = GEOID (11 digits) only,
        coordinates rounded to 5 decimals (same as nyc_tracts.geojson).
Run   : python scripts/build_tract_geo.py [--fetch]   (--fetch downloads missing zips with urllib)
The app treats a missing state file as "no tract layer for that state".
"""
import argparse, glob, os, urllib.request
import geopandas as gpd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_{}_tract_500k.zip"
ap = argparse.ArgumentParser()
ap.add_argument("--src", default=os.path.join(ROOT, "data/raw/boundaries/tracts"))
ap.add_argument("--out", default=os.path.join(ROOT, "app/public/data/tracts"))
ap.add_argument("--fetch", action="store_true")
ap.add_argument("--states", nargs="*", help="state FIPS codes to fetch (with --fetch)")
a = ap.parse_args()
os.makedirs(a.src, exist_ok=True); os.makedirs(a.out, exist_ok=True)

if a.fetch:
    for f in a.states or []:
        z = os.path.join(a.src, f"cb_2023_{f}_tract_500k.zip")
        if not os.path.exists(z):
            urllib.request.urlretrieve(URL.format(f), z)

for z in sorted(glob.glob(os.path.join(a.src, "cb_2023_*_tract_500k.zip"))):
    fips = os.path.basename(z).split("_")[2]
    t = gpd.read_file(f"zip://{z}").to_crs(4326)[["GEOID", "geometry"]]
    t.to_file(os.path.join(a.out, f"{fips}.geojson"), driver="GeoJSON", COORDINATE_PRECISION=5)
    print(fips, len(t), "tracts")
