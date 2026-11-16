// Q6: "places for closer review". Plan.md section 6 is the spec.
//
// Eligible  = crude estimate present AND at least 500 adults (nationally).
// Criteria, each "top X%" among eligible tracts (cutoffs are national):
//   prevalence  crude % >= the (1 - X) quantile
//   adults      estimated affected adults >= the (1 - X) quantile
//   svi         RPL_THEMES >= 1 - X (SVI is already a national percentile)
// Selected  = meets at least k of the 3 criteria.
// A tract with no SVI can still meet the other two; it is shown as "SVI not available",
// never as "not selected".
import * as d3 from "d3";
import { SMALL_TRACT_ADULTS } from "./constants.js";

export function q6Compute(tracts, cond, X, k) {
  const eligible = tracts.filter((t) => t[cond] != null && t.pop18plus >= SMALL_TRACT_ADULTS);
  const affected = (t) => t[`${cond}_affected`];
  const cutPrev = d3.quantile(eligible.map((t) => t[cond]), 1 - X);
  const cutAdults = d3.quantile(eligible.map(affected), 1 - X);
  const cutSvi = 1 - X;

  const eligibleIds = new Set();
  const overlap = {}; // key like "PA" for prevalence + adults
  const perCounty = new Map();
  let selected = 0, sviMissing = 0;
  const state = new Map(); // tract id -> category, used by the NYC map

  for (const t of eligible) {
    eligibleIds.add(t.id);
    const p = t[cond] >= cutPrev;
    const a = affected(t) >= cutAdults;
    const hasSvi = t.RPL_THEMES != null;
    const s = hasSvi && t.RPL_THEMES >= cutSvi;
    const met = (p ? 1 : 0) + (a ? 1 : 0) + (s ? 1 : 0);
    const key = (p ? "P" : "") + (a ? "C" : "") + (s ? "S" : "");
    if (key) overlap[key] = (overlap[key] || 0) + 1;
    if (!hasSvi) sviMissing++;
    const isSel = met >= k;
    if (isSel) {
      selected++;
      perCounty.set(t.county, (perCounty.get(t.county) || 0) + 1);
    }
    state.set(t.id, isSel ? "selected" : hasSvi ? "not selected" : "SVI not available");
  }
  for (const t of tracts) if (!eligibleIds.has(t.id)) state.set(t.id, "not eligible");

  return {
    tracts: tracts.length,
    eligible: eligible.length,
    excluded: tracts.length - eligible.length,
    sviMissing,
    selected,
    cutoffs: { prevalence: cutPrev, adults: cutAdults, svi: cutSvi },
    overlap: { P: overlap.P || 0, C: overlap.C || 0, S: overlap.S || 0, PC: overlap.PC || 0, PS: overlap.PS || 0, CS: overlap.CS || 0, PCS: overlap.PCS || 0 },
    perCounty,
    state,
  };
}
