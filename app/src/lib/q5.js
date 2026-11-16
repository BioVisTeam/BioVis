// Q5: reference lines at the top 10% of each axis, and quadrant counts.
// Tracts under 500 adults are left out of the cut-offs and the counts.
import * as d3 from "d3";

export function q5Summary(tracts, cond) {
  const elig = tracts.filter((t) => !t.small && t[cond] != null && t[`${cond}_affected`] != null);
  const xCut = d3.quantile(elig.map((t) => t[cond]), 0.9);
  const yCut = d3.quantile(elig.map((t) => t[`${cond}_affected`]), 0.9);
  const q = { highRateManyPeople: 0, highRateFewPeople: 0, manyPeopleModerateRate: 0, neither: 0 };
  for (const t of elig) {
    const hiX = t[cond] >= xCut, hiY = t[`${cond}_affected`] >= yCut;
    if (hiX && hiY) q.highRateManyPeople++;
    else if (hiX) q.highRateFewPeople++;
    else if (hiY) q.manyPeopleModerateRate++;
    else q.neither++;
  }
  return { eligible: elig.length, xCut, yCut, quadrants: q };
}
