// Q2: what the county average hides inside NYC. Tract map + borough box plots, crude values.
import { useCallback, useMemo } from "react";
import * as d3 from "d3";
import { BOROUGHS, CONDITIONS, COND_LABEL, SURFACE } from "../lib/constants.js";
import { FILL_DOTS, FILL_SMALL } from "../lib/patterns.js";
import { makeScale } from "../lib/scales.js";
import { fmt1, pct } from "../lib/format.js";
import { useAppState } from "../state/AppState.jsx";
import { useData, useNycGeo } from "../data/DataProvider.jsx";
import TractChoro from "../charts/TractChoro.jsx";
import Boxplots from "../charts/Boxplots.jsx";
import Legend from "../components/Legend.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

export default function Q2() {
  const data = useData();
  const nycGeo = useNycGeo(true);
  const { state, set } = useAppState();
  const { cond, borough, brush } = state;
  const key = `q2:${cond}`;
  const brushRange = brush && brush.key === key ? brush.range : null;

  // NYC-wide quintiles over tracts with 500 or more adults and an estimate.
  const eligible = useMemo(() => data.nycTracts.filter((t) => !t.small && t[cond] != null), [data.nycTracts, cond]);
  const scale = useMemo(() => makeScale(eligible.map((t) => t[cond])), [eligible, cond]);
  const boxTracts = useMemo(
    () => eligible.map((t) => ({ id: t.id, borough: t.borough, value: t[cond], countyValue: t[`${cond}_county`] })),
    [eligible, cond],
  );
  const yMax = useMemo(() => d3.max(eligible, (t) => t[cond]), [eligible, cond]);
  const focusIds = useMemo(
    () => (borough ? data.nycTracts.filter((t) => t.borough === borough).map((t) => t.id) : null),
    [borough, data.nycTracts],
  );

  const styleFor = useCallback((id) => {
    const t = data.nycTractById.get(id);
    // Outlines with no row in nyc_tracts.csv are the 93 tracts with no PLACES estimate: dotted.
    if (!t) return { fill: FILL_DOTS, opacity: 1 };
    const v = t[cond];
    let opacity = 1;
    if (borough && t.borough !== borough) opacity = 0.2;
    if (brushRange && !t.small && (v == null || v < brushRange[0] || v > brushRange[1])) opacity = Math.min(opacity, 0.15);
    if (t.small) return { fill: FILL_SMALL, opacity };
    if (v == null) return { fill: FILL_DOTS, opacity };
    return { fill: scale.fill(v), opacity };
  }, [data.nycTractById, cond, borough, brushRange, scale]);

  const onBrush = useCallback((range) => set({ brush: range ? { key, range } : null }), [key, set]);
  const onBorough = useCallback((b) => set({ borough: b }), [set]);

  // Live borough table: the numbers the write-up quotes.
  const rows = BOROUGHS.map((b) => {
    const v = eligible.filter((t) => t.borough === b).map((t) => t[cond]);
    const county = data.nycTracts.find((t) => t.borough === b && t[`${cond}_county`] != null)?.[`${cond}_county`];
    const far = county == null || !v.length ? null : (100 * v.filter((x) => Math.abs(x - county) > 3).length) / v.length;
    return { b, n: v.length, county, min: d3.min(v), max: d3.max(v), far };
  });

  return (
    <Question
      title="Q2. What a county average hides inside NYC"
      question="Within NYC, how much do census tracts differ from the county value?"
      answer="A lot. In Manhattan, the diabetes county value is 8.9%, but tracts run from 1.7% to 28.8%, and 54% of Manhattan tracts sit more than 3 points from the county value."
      read="The map colours NYC tracts by five equal-count classes across all NYC tracts with 500 or more adults (crude values). White hatch: fewer than 500 adults, excluded from statistics. Dotted: no estimate. The box plots show each borough's tracts on one y-scale: dots are tracts, the box is the middle 50%, whiskers run from p10 to p90, and the red diamond is the county value. Drag down the box plot to brush a range of values; tracts in the range are highlighted on the map. Click a borough name to zoom to it. Hover a tract for its value, CI, adults and difference from the county."
      shows={[
        "Tracts are compared with the county's crude value, never with its age-adjusted value (Q1).",
        "Manhattan diabetes: county 8.9%; tracts 1.7% to 28.8%; 54% of tracts more than 3 points from the county value.",
        "Other boroughs (diabetes, county value): Bronx 16.1%, Brooklyn 12.0%, Queens 14.3%, Staten Island 11.9%. The live table below gives the same comparison for the selected condition.",
      ]}
      caveats={[
        "Tract values are crude and come from a model applied to census block counts; the page has no tract-level input. The spread is modeled variation from tract demographics, not measured tract disease.",
        "Tract confidence intervals are wide for small tracts; 21 NYC tracts with under 500 adults are excluded.",
        "Q2 covers NYC only, by design. The Overview map also shows tract outlines for other states when you zoom in.",
      ]}
    >
      <div className="cond-picker">
        {CONDITIONS.map((c) => (
          <button key={c.key} className={c.key === cond ? "pill active" : "pill"} onClick={() => set({ cond: c.key, brush: null })}>
            {c.label}
          </button>
        ))}
        {borough && <button className="pill" onClick={() => set({ borough: null })}>Show all NYC</button>}
      </div>
      <div className="q2-main">
        <div>
          <h2>{COND_LABEL[cond]}, crude, NYC tracts</h2>
          {nycGeo ? (
            <TractChoro geo={nycGeo} styleFor={styleFor} focusIds={focusIds} ariaLabel={`NYC tracts, ${COND_LABEL[cond]}`} />
          ) : <div className="notice">Loading NYC tract outlines…</div>}
          <Legend scale={scale} title={`${COND_LABEL[cond]}, crude, NYC tracts (500+ adults)`}
            note="White hatch: under 500 adults. Dotted: no estimate." />
        </div>
        <div>
          <h2>Tracts by borough, same y-scale</h2>
          <Boxplots tracts={boxTracts} yMax={yMax} brushRange={brushRange} onBrush={onBrush}
            borough={borough} onBorough={onBorough} ariaLabel={`Box plots of ${COND_LABEL[cond]} by NYC borough`} />
          <HoverCard kinds={["tract"]} nycOnly />
        </div>
      </div>
      <h2>Borough summary, {COND_LABEL[cond]} (live)</h2>
      <table className="units">
        <thead>
          <tr><th>Borough</th><th>Tracts</th><th>County (crude)</th><th>Tract min</th><th>Tract max</th><th>More than 3 points from county</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.b}>
              <td>{r.b}</td><td>{r.n}</td><td>{pct(r.county)}</td><td>{pct(r.min)}</td><td>{pct(r.max)}</td>
              <td>{r.far == null ? "n/a" : `${fmt1(r.far)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small-note">Conditions: {CONDITIONS.map((c) => c.label).join(", ")}.</p>
    </Question>
  );
}
