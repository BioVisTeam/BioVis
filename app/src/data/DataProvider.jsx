// Loads every data file once. The NYC tract outlines load on first use (useNycGeo).
import { createContext, useContext, useEffect, useState } from "react";
import * as d3 from "d3";
import { parseCountyCsv, parseTractCsv } from "../lib/data.js";

const Ctx = createContext(null);
const base = `${import.meta.env.BASE_URL}data/`;

let nycGeoPromise = null;
export function loadNycGeo() {
  if (!nycGeoPromise) nycGeoPromise = d3.json(`${base}nyc_tracts.geojson`);
  return nycGeoPromise;
}

// Per-state tract outlines (public/data/tracts/<state fips>.geojson, built by scripts/build_tract_geo.py).
// Resolves to null when the file is missing (the dev server answers a missing file with HTML, so any failure counts).
// Only in-flight requests are shared: the parsed GeoJSON is large, so the caller keeps what it builds from it.
const stateTractPromises = new Map();
export function loadStateTracts(fips) {
  if (!stateTractPromises.has(fips)) {
    stateTractPromises.set(fips, d3.json(`${base}tracts/${fips}.geojson`).then((g) => (g?.features ? g : null), () => null)
      .finally(() => stateTractPromises.delete(fips)));
  }
  return stateTractPromises.get(fips);
}

export function DataProvider({ children }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      d3.text(`${base}county.csv`),
      d3.text(`${base}nyc_tracts.csv`),
      d3.text(`${base}us_tracts.csv`),
      d3.json(`${base}counties.geojson`),
      d3.text(`${base}q4_correlations.csv`),
    ])
      .then(([countyCsv, nycCsv, usCsv, countyGeo, q4Csv]) => {
        const counties = parseCountyCsv(countyCsv);
        const nycTracts = parseTractCsv(nycCsv);
        const usTracts = parseTractCsv(usCsv);
        setData({
          counties,
          countyById: new Map(counties.map((c) => [c.fips, c])),
          countyGeo,
          nycTracts,
          nycTractById: new Map(nycTracts.map((t) => [t.id, t])),
          usTracts,
          usTractById: new Map(usTracts.map((t) => [t.id, t])),
          q4: d3.csvParse(q4Csv, (r) => ({ theme: r.theme, disease: r.disease, rho: +r.correlation })),
        });
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="notice error">Could not load the data files: {error}</div>;
  if (!data) return <div className="notice">Loading data…</div>;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx);

// Returns the NYC tract outlines once a view asks for them (enabled = true).
export function useNycGeo(enabled = true) {
  const [geo, setGeo] = useState(null);
  useEffect(() => {
    if (enabled && !geo) loadNycGeo().then(setGeo);
  }, [enabled, geo]);
  return geo;
}
