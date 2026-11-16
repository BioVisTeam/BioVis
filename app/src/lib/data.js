// Parsing for the files in public/data/. Pure functions so the tests can run them.
// FIPS codes are text and zero-padded. Blank cells are null (missing), never 0.
import * as d3 from "d3";
import { CONDITIONS, SMALL_TRACT_ADULTS } from "./constants.js";

const num = (v) => (v === undefined || v === null || v === "" || v === "NA" ? null : +v);
const bool = (v) => v === "True" || v === "true";
const pad = (v, n) => String(v).padStart(n, "0");
const SVI_KEYS = ["RPL_THEMES", "RPL_THEME1", "RPL_THEME2", "RPL_THEME3", "RPL_THEME4"];

export function parseCounty(d) {
  const o = {
    fips: pad(d.county_fips, 5),
    state: d.state,
    county: d.county,
    pop: num(d.pop),
    pop18plus: num(d.pop18plus),
    isNyc: bool(d.is_nyc),
    borough: d.borough || null,
  };
  for (const c of CONDITIONS) {
    o[c.key] = num(d[`${c.key}_adj`]);
    o[`${c.key}_lo`] = num(d[`${c.key}_adj_lo`]);
    o[`${c.key}_hi`] = num(d[`${c.key}_adj_hi`]);
  }
  for (const k of SVI_KEYS) o[k] = num(d[k]);
  return o;
}

// Works for nyc_tracts.csv (has CIs and county values) and us_tracts.csv (fewer columns).
export function parseTract(d) {
  const o = {
    id: pad(d.tract_fips, 11),
    county: pad(d.county_fips, 5),
    borough: d.borough || null,
    pop18plus: num(d.pop18plus),
    small: bool(d.small_pop_flag),
    lon: num(d.lon),
    lat: num(d.lat),
  };
  for (const c of CONDITIONS) {
    o[c.key] = num(d[`${c.key}_crude`]);
    o[`${c.key}_lo`] = num(d[`${c.key}_crude_lo`]);
    o[`${c.key}_hi`] = num(d[`${c.key}_crude_hi`]);
    o[`${c.key}_county`] = num(d[`${c.key}_county_crude`]);
  }
  for (const k of SVI_KEYS) o[k] = num(d[k]);
  // Estimated affected adults = crude % x adults 18+. Kept unrounded so the Q6 counts match
  // plan.md; round only when displayed.
  for (const c of CONDITIONS) {
    o[`${c.key}_affected`] = o[c.key] == null || o.pop18plus == null ? null : (o[c.key] / 100) * o.pop18plus;
  }
  return o;
}

export const parseCountyCsv = (text) => d3.csvParse(text, parseCounty);
export const parseTractCsv = (text) => d3.csvParse(text, parseTract);

// Five equal-count classes: thresholds at the 20/40/60/80th percentiles of the values.
export function quintileBreaks(values) {
  const v = values.filter((x) => x != null && !Number.isNaN(x));
  return [0.2, 0.4, 0.6, 0.8].map((p) => d3.quantile(v, p));
}

export const classOf = (value, breaks) => (value == null ? -1 : breaks.filter((t) => value > t).length);
