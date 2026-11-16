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
