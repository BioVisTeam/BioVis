// Q5: reference lines at the top 10% of each axis, and quadrant counts.
// Tracts under 500 adults are left out of the cut-offs and the counts.
import * as d3 from "d3";

// Points for one condition: { id, borough, x (crude %), y (affected adults), small }.
// The five standard conditions come from the dashboard tract rows.
export function q5Points(tracts, cond) {
  return tracts
    .filter((t) => t[cond] != null && t[`${cond}_affected`] != null)
    .map((t) => ({ id: t.id, borough: t.borough, x: t[cond], y: t[`${cond}_affected`], small: t.small }));
}

// Asthma comes from the Milestone 2 table q5.csv (blank = missing).
export function parseAsthmaCsv(text) {
  const n = (v) => (v === "" || v == null ? null : +v);
  return d3.csvParse(text, (r) => {
    const adults = n(r.TotalPop18plus);
    return {
      id: String(r.TractFIPS).padStart(11, "0"), borough: r.Borough,
      x: n(r.CASTHMA_CrudePrev), y: n(r.CASTHMA_EstCount), small: adults != null && adults < 500,
    };
  }).filter((p) => p.x != null && p.y != null);
}

export function q5Summary(tracts, cond) {
  return q5SummaryOfPoints(q5Points(tracts, cond));
}

export function q5SummaryOfPoints(points) {
  const elig = points.filter((p) => !p.small);
  const xCut = d3.quantile(elig.map((p) => p.x), 0.9);
  const yCut = d3.quantile(elig.map((p) => p.y), 0.9);
  const q = { highRateManyPeople: 0, highRateFewPeople: 0, manyPeopleModerateRate: 0, neither: 0 };
  for (const p of elig) {
    const hiX = p.x >= xCut, hiY = p.y >= yCut;
    if (hiX && hiY) q.highRateManyPeople++;
    else if (hiX) q.highRateFewPeople++;
    else if (hiY) q.manyPeopleModerateRate++;
    else q.neither++;
  }
  return { eligible: elig.length, xCut, yCut, quadrants: q };
}
