// Q6: how the set of "places for closer review" changes with the criterion and threshold.
// Selection runs on all US tracts. The map shows selected tracts per county (US) or
// individual NYC tracts (NYC scope). The wording is "places for closer review", never "priority of care".
import { useMemo } from "react";
import { COND_LABEL, CONDITIONS, BLUES, NYC_FIPS, SURFACE, NOT_SELECTED } from "../lib/constants.js";
import { FILL_DOTS, FILL_MISSING } from "../../../d3-visualisations/shared/patterns.js";
import { makeScale } from "../lib/scales.js";
import { fmtInt } from "../lib/format.js";
import { q6Compute } from "../lib/q6.js";
import { useAppState } from "../state/AppState.jsx";
import { useData, useNycGeo } from "../data/DataProvider.jsx";
import CountyChoro from "../../../d3-visualisations/q1/CountyChoro.jsx";
import TractChoro from "../../../d3-visualisations/q2/TractChoro.jsx";
import OverlapBars from "../../../d3-visualisations/q6/OverlapBars.jsx";
import Legend from "../components/Legend.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

const NYC_SELECTED = BLUES[3];

export default function Q6() {
  const data = useData();
  const { state, setQ6 } = useAppState();
  const { cond, X, k, scope } = state.q6;
  const nycGeo = useNycGeo(scope === "NYC");

  const r = useMemo(() => q6Compute(data.usTracts, cond, X / 100, k), [data.usTracts, cond, X, k]);
  const cutP = r.cutoffs.prevalence, cutA = r.cutoffs.adults;

  // US map: selected tracts per county. Colours use quintiles of the non-zero counts.
  const countScale = useMemo(
    () => makeScale([...r.perCounty.values()]),
    [r],
  );
  const countyStyle = useMemo(() => (fips) => {
    const n = r.perCounty.get(fips) || 0;
    if (!data.countyById.has(fips)) return { fill: FILL_MISSING, opacity: 1 };
    if (n === 0) return { fill: SURFACE, opacity: 1 };
    return { fill: countScale.fill(n), opacity: 1 };
  }, [r, data.countyById, countScale]);

  // NYC map: four categories, encoded by colour and pattern.
  const tractStyle = useMemo(() => (id) => {
    const s = r.state.get(id);
    if (s === "selected") return { fill: NYC_SELECTED, opacity: 1 };
    if (s === "not selected") return { fill: NOT_SELECTED, opacity: 1 };
    if (s === "SVI not available") return { fill: FILL_MISSING, opacity: 1 };
    return { fill: FILL_DOTS, opacity: 1 };
  }, [r]);

  // NYC counts from the same selection (the tracts whose county is one of the five NYC counties).
  const nyc = useMemo(() => {
    let selected = 0, eligible = 0;
    for (const [id, s] of r.state) {
      if (!NYC_FIPS.includes(id.slice(0, 5))) continue;
      if (s !== "not eligible") eligible++;
      if (s === "selected") selected++;
    }
    return { selected, eligible };
  }, [r]);

  const readText = "Eligible = a crude estimate and at least 500 adults. Three criteria, each the top X% among eligible tracts nationally: prevalence (crude %), affected adults (estimated count), and overall SVI. A tract is selected when it meets at least k of the three (k = 1 is 'any', k = 3 is 'all'). A tract with no SVI can still meet the other two; it is counted as 'SVI not available', never as 'not selected'. Change the condition, the threshold X and k to see the counts, the overlap bars and the map update.";
  const pct1 = (x) => `${(x * 100).toFixed(0)}%`;
  const sel = (n) => `${fmtInt(n)}`;

  return (
    <Question
      title="Q6. Places for closer review"
      question="How does the set of places for closer review change with the criterion and the threshold?"
      answer={`With the default (diabetes, top 10%, at least 2 of 3 criteria), ${sel(r.selected)} of the ${sel(r.eligible)} eligible US tracts are selected. Each criterion alone picks about 8,000 tracts, but only 1,191 meet all three. The criterion you choose changes the answer more than the threshold does.`}
      shows={[
        `Default cut-offs (${COND_LABEL[cond]}, X = ${X}%): prevalence at or above ${cutP.toFixed(1)}%; affected adults at or above ${fmtInt(cutA)}; SVI at or above ${r.cutoffs.svi.toFixed(2)}.`,
        `Eligible ${sel(r.eligible)} of ${sel(r.tracts)} tracts; excluded ${sel(r.excluded)} (no estimate or under 500 adults); eligible with SVI missing ${sel(r.sviMissing)}.`,
        `Meets the prevalence criterion ${sel(r.overlap.P + r.overlap.PC + r.overlap.PS + r.overlap.PCS)}; the affected-adults criterion ${sel(r.overlap.C + r.overlap.PC + r.overlap.CS + r.overlap.PCS)}; the SVI criterion ${sel(r.overlap.S + r.overlap.PS + r.overlap.CS + r.overlap.PCS)}. The criteria overlap, so these do not add up.`,
        `NYC, same national cut-offs: ${sel(nyc.selected)} selected of ${sel(nyc.eligible)} eligible NYC tracts.`,
      ]}
      caveats={[
        "Scope: Q6 selects across all US tracts. Its US map summarises the selected tracts by county and NYC tracts are shown individually. National tract outlines are on the Overview map.",
        "Missing SVI is shown as its own category. Tracts without a PLACES estimate (PA, KY) are excluded, not counted as not selected.",
        "The criteria partly restate PLACES and SVI inputs (the overlap in Data & Methods). Places for closer review are an exploratory screen, not a judgement about care or priority.",
      ]}
    >
      <div className="q6-controls">
        <label>Condition
          <select value={cond} onChange={(e) => setQ6({ cond: e.target.value })}>
            {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </label>
        <label>Top X%: <strong>{X}%</strong>
          <input type="range" min="1" max="25" step="1" value={X} onChange={(e) => setQ6({ X: +e.target.value })} />
        </label>
        <fieldset>
          <legend>Criteria met (k)</legend>
          {[1, 2, 3].map((n) => (
            <label key={n} className="radio">
              <input type="radio" name="k" checked={k === n} onChange={() => setQ6({ k: n })} />
              {n} {n === 1 ? "(any)" : n === 3 ? "(all)" : "(at least)"}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Map scope</legend>
          <label className="radio"><input type="radio" name="scope" checked={scope === "US"} onChange={() => setQ6({ scope: "US" })} /> US (counties)</label>
          <label className="radio"><input type="radio" name="scope" checked={scope === "NYC"} onChange={() => setQ6({ scope: "NYC" })} /> NYC (tracts)</label>
        </fieldset>
      </div>

      <div className="counts-panel" aria-live="polite">
        <div><span>Tracts in file</span><strong>{fmtInt(r.tracts)}</strong></div>
        <div><span>Eligible</span><strong>{fmtInt(r.eligible)}</strong></div>
        <div><span>Selected (meets at least {k})</span><strong>{fmtInt(r.selected)}</strong></div>
        <div><span>Excluded</span><strong>{fmtInt(r.excluded)}</strong></div>
        <div><span>Eligible, SVI not available</span><strong>{fmtInt(r.sviMissing)}</strong></div>
        <div><span>Selected share of eligible</span><strong>{pct1(r.selected / r.eligible)}</strong></div>
      </div>

      <div className="q6-main">
        <div>
          <h2>Overlap of the three criteria (eligible tracts)</h2>
          <OverlapBars overlap={r.overlap} ariaLabel="Overlap of prevalence, affected adults and SVI criteria" />
          <section className="q6-read">
            <h2>How to read it</h2>
            <p>{readText}</p>
          </section>
        </div>
        <div>
          <h2>{scope === "US" ? "Selected tracts per county" : "NYC tracts by selection status"}</h2>
          {scope === "US" ? (
            <CountyChoro geo={data.countyGeo} styleFor={countyStyle} width={620} height={380} linked
              ariaLabel="Selected tracts per county" />
          ) : nycGeo ? (
            <TractChoro geo={nycGeo} styleFor={tractStyle} width={480} height={420} ariaLabel="NYC tracts by selection status" />
          ) : <div className="notice">Loading NYC tract outlines…</div>}
          {scope === "US" ? (
            <Legend scale={countScale} title="Selected tracts per county (non-zero classes)" unit="" fmt={(v) => fmtInt(Math.round(v))}
              note="Counties with no selected tract are light; hatched gray: no county record." />
          ) : (
            <div className="legend">
              <div className="legend-title">NYC tracts</div>
              <div className="legend-row"><span className="swatch" style={{ background: NYC_SELECTED }} /> selected</div>
              <div className="legend-row"><span className="swatch" style={{ background: NOT_SELECTED }} /> not selected</div>
              <div className="legend-row"><span className="swatch hatched" /> SVI not available</div>
              <div className="legend-row"><span className="swatch dotted" /> not eligible (no estimate or under 500 adults)</div>
            </div>
          )}
          <HoverCard />
        </div>
      </div>
    </Question>
  );
}
