// Q1: prevalence across US counties (age-adjusted). One large choropleth, five small multiples,
// a brushable histogram. Hover outlines the same county on every map.
import { useCallback, useMemo } from "react";
import { CONDITIONS, COND_LABEL } from "../lib/constants.js";
import { FILL_MISSING } from "../lib/patterns.js";
import { makeScale } from "../lib/scales.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import CountyChoro from "../charts/CountyChoro.jsx";
import Histogram from "../components/Histogram.jsx";
import Legend from "../components/Legend.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

export default function Q1() {
  const data = useData();
  const { state, set } = useAppState();
  const { cond, brush } = state;
  const brushRange = brush && brush.key === cond ? brush.range : null;

  // One colour scale per condition, built once.
  const scales = useMemo(
    () => Object.fromEntries(CONDITIONS.map((c) => [c.key, makeScale(data.counties.map((x) => x[c.key]))])),
    [data.counties],
  );

  // Fill and opacity for one condition's map. The brush (on the selected condition) dims
  // counties outside its range on every map, so the linked brush works across the five maps.
  const styleFor = useCallback(
    (key) => (fips) => {
      const c = data.countyById.get(fips);
      const v = c ? c[key] : null;
      let opacity = 1;
      if (brush && brush.key === cond && (v == null || v < brush.range[0] || v > brush.range[1])) opacity = 0.15;
      if (v == null) return { fill: FILL_MISSING, opacity };
      return { fill: scales[key].fill(v), opacity };
    },
    [data.countyById, brush, cond, scales],
  );

  const bigStyle = useMemo(() => styleFor(cond), [styleFor, cond]);
  const smallStyles = useMemo(
    () => Object.fromEntries(CONDITIONS.map((c) => [c.key, styleFor(c.key)])),
    [styleFor],
  );
  const values = useMemo(() => data.counties.map((c) => c[cond]), [data.counties, cond]);
  const onBrush = useCallback((range) => set({ brush: range ? { key: cond, range } : null }), [cond, set]);

  return (
    <Question
      title="Q1. Prevalence across US counties"
      question="How does prevalence of five chronic conditions vary across US counties?"
      answer="It varies widely. For diabetes, the middle 80% of counties range from 8.7% to 14.2% (median 10.7%), and Oglala Lakota County, SD, has the highest value of the counties that have estimates for diabetes (23.8%)."
      read="Each map colours counties by five equal-count classes (quintiles) of one condition. Colours compare a county's rank within that condition, not equal prevalence across conditions. Printed class breaks sit under the legend. Hatched gray means no estimate (Kentucky, Pennsylvania and Loving County, TX); missing is never zero. Brush the histogram to keep only counties in a range; counties outside it fade on all five maps."
      shows={[
        "Diabetes: median 10.7% (p10 to p90 8.7 to 14.2%); lowest Douglas, CO (6.0%), highest Oglala Lakota, SD (23.8%).",
        "High blood pressure: median 32.8% (28.4 to 39.8%). Obesity: median 38.2% (31.4 to 43.0%).",
        "Coronary heart disease: median 5.9% (5.0 to 7.0%). COPD: median 6.8% (5.2 to 9.1%).",
        "Oglala Lakota County, SD is the highest county for diabetes, coronary heart disease and COPD.",
      ]}
      caveats={[
        "PLACES values are modeled from survey and census inputs, not counted cases. They are age-adjusted.",
        "2,956 counties have estimates. 187 (Kentucky 120, Pennsylvania 67) do not; Loving County, TX is not in PLACES.",
        "PLACES 2025 and SVI 2022 (ACS 2018-2022) cover different periods.",
      ]}
    >
      <div className="cond-picker">
        {CONDITIONS.map((c) => (
          <button key={c.key} className={c.key === cond ? "pill active" : "pill"} onClick={() => set({ cond: c.key })}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="q1-main">
        <div>
          <h2>{COND_LABEL[cond]}, age-adjusted, by county</h2>
          <CountyChoro geo={data.countyGeo} styleFor={bigStyle} width={720} height={440}
            ariaLabel={`Choropleth of ${COND_LABEL[cond]} by county`} />
          <Legend scale={scales[cond]} title={`${COND_LABEL[cond]} class breaks`} />
        </div>
        <aside className="side">
          <Histogram values={values} xLabel={`${COND_LABEL[cond]} (%)`} brushRange={brushRange} onBrush={onBrush} />
          <HoverCard kinds={["county"]} />
        </aside>
      </div>
      <h2>All five conditions</h2>
      <p className="small-note">Each map uses its own quintiles. The same county is outlined on every map when you hover.</p>
      <div className="small-multiples">
        {CONDITIONS.map((c) => (
          <figure key={c.key}>
            <figcaption>{c.label}</figcaption>
            <CountyChoro geo={data.countyGeo} styleFor={smallStyles[c.key]} width={360} height={220}
              ariaLabel={`${c.label} by county`} />
            <div className="breaks">
              {scales[c.key].breaks.map((b, i) => <span key={i}>{b.toFixed(1)}</span>)}
            </div>
          </figure>
        ))}
      </div>
    </Question>
  );
}
