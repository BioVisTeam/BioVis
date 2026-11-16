import { useCallback, useMemo } from "react";
import { COND_LABEL, NYC_FIPS } from "../lib/constants.js";
import { spearman } from "../lib/stats.js";
import { SVI_NAMES, Q3Q4_CONDITIONS } from "../lib/q3q4.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import Scatter from "../../../d3-visualisations/shared/Scatter.jsx";
import Histogram from "../../../d3-visualisations/shared/Histogram.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";
import CondPicker from "../components/CondPicker.jsx";

export default function Q3() {
  const data = useData();
  const { state, set } = useAppState();
  const { cond, brush, scatterX } = state;
  const sviName = SVI_NAMES[scatterX];
  const disease = Q3Q4_CONDITIONS.find(c => c.key === cond).label;
  const brushRange = brush && brush.key === cond ? brush.range : null;

  const pairs = useMemo(
    () => data.counties.filter((c) => Number.isFinite(c[cond]) && Number.isFinite(c[scatterX])),
    [data.counties, cond, scatterX],
  );
  const rho = useMemo(
    () => spearman(pairs.map((c) => c[scatterX]), pairs.map((c) => c[cond])),
    [pairs, cond, scatterX],
  );
  const points = useMemo(
    () =>
      pairs.map((c) => ({
        id: c.fips,
        x: c[scatterX],
        y: c[cond],
        nyc: NYC_FIPS.includes(c.fips),
        county: c.county,
        state: c.state,
        highlight: !!brushRange && c[cond] >= brushRange[0] && c[cond] <= brushRange[1],
      })),
    [pairs, cond, scatterX, brushRange],
  );
  const allValues = useMemo(() => data.counties.map((c) => c[cond]), [data.counties, cond]);
  const onBrush = useCallback((range) => set({ brush: range ? { key: cond, range } : null }), [cond, set]);

  return (
    <Question
      title="Q3. Prevalence and SVI across counties"
      question="How is prevalence associated with social vulnerability (SVI), and where does NYC sit?"
      answer={`${sviName} and ${COND_LABEL[cond].toLowerCase()} prevalence have a national Spearman rho of ${rho.toFixed(4)} across ${pairs.length.toLocaleString("en-US")} counties.`}
      read="Each dot is a county: the selected SVI percentile on the x-axis (0 to 1, higher is more vulnerable) and the age-adjusted prevalence on the y-axis. NYC's five counties are red diamonds with labels. The histogram below uses the same brush as Q1: brushing a range outlines the counties in that range here. Gray dots retain their original opacity. The rho printed above is computed on the full national sample and does not change when you brush."
      shows={[
        "Spearman rho, overall SVI vs prevalence (national): diabetes 0.7514, CHD 0.6188, high blood pressure 0.6000, COPD 0.4964, obesity 0.3408.",
        "Diabetes has the strongest association; obesity the weakest.",
        "NYC's five counties are drawn as labelled red diamonds, so you can see where they fall against the national pattern.",
      ]}
      caveats={[
        "Association, not cause. Some SVI factors repeat PLACES model inputs: below 150% poverty (theme 1), age 65 and over and 17 and under (theme 2), and minority status (theme 3). So part of this correlation restates shared inputs.",
        "Modeled prevalence estimates; counties without an estimate (KY, PA, Loving TX) are not drawn.",
        "PLACES 2025 vs SVI 2022 data periods.",
      ]}
    >
      <CondPicker />
      <div className="filter-bar">
        <label>SVI measure
          <select value={scatterX} onChange={event => set({ scatterX: event.target.value })}>
            {Object.entries(SVI_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="q3-main">
        <div>
          <Scatter points={points} sviName={sviName} disease={disease} rho={rho}
            ariaLabel={`Scatter of ${COND_LABEL[cond]} against ${sviName}`} />
          <p className="stat">Spearman rho = <strong>{rho.toFixed(4)}</strong>, n = {pairs.length.toLocaleString("en-US")} counties (national, fixed)</p>
        </div>
        <aside className="side">
          <Histogram values={allValues} xLabel={`${COND_LABEL[cond]} (%)`} brushRange={brushRange} onBrush={onBrush} />
          <HoverCard kinds={["county"]} />
        </aside>
      </div>
    </Question>
  );
}
