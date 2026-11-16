// Q3: prevalence vs overall SVI across counties, with NYC marked. Spearman rho is computed
// on the national sample; highlighting or brushing does not change it.
import { useCallback, useMemo } from "react";
import { COND_LABEL, NYC_FIPS } from "../lib/constants.js";
import { spearman } from "../lib/stats.js";
import { fmt2 } from "../lib/format.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import Scatter from "../components/Scatter.jsx";
import Histogram from "../components/Histogram.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";
import CondPicker from "../components/CondPicker.jsx";

export default function Q3() {
  const data = useData();
  const { state, set } = useAppState();
  const { cond, brush } = state;
  const brushRange = brush && brush.key === cond ? brush.range : null;

  const pairs = useMemo(
    () => data.counties.filter((c) => c[cond] != null && c.RPL_THEMES != null),
    [data.counties, cond],
  );
  const rho = useMemo(
    () => spearman(pairs.map((c) => c.RPL_THEMES), pairs.map((c) => c[cond])),
    [pairs, cond],
  );
  const points = useMemo(
    () =>
      pairs.map((c) => ({
        id: c.fips,
        x: c.RPL_THEMES,
        y: c[cond],
        nyc: NYC_FIPS.includes(c.fips),
        label: c.borough || "",
        highlight: !!brushRange && c[cond] >= brushRange[0] && c[cond] <= brushRange[1],
      })),
    [pairs, cond, brushRange],
  );
  const yMax = useMemo(() => Math.max(...pairs.map((c) => c[cond])), [pairs, cond]);
  const allValues = useMemo(() => data.counties.map((c) => c[cond]), [data.counties, cond]);
  const onBrush = useCallback((range) => set({ brush: range ? { key: cond, range } : null }), [cond, set]);

  return (
    <Question
      title="Q3. Prevalence and overall SVI across counties"
      question="How is prevalence associated with overall social vulnerability (SVI), and where does NYC sit?"
      answer={`Counties with higher overall SVI tend to have higher ${COND_LABEL[cond].toLowerCase()} prevalence. The Spearman rho for ${COND_LABEL[cond].toLowerCase()} is ${fmt2(rho)} across ${pairs.length.toLocaleString("en-US")} counties.`}
      read="Each dot is a county: overall SVI on the x-axis (0 to 1, higher is more vulnerable) and the age-adjusted prevalence on the y-axis. NYC's five counties are red diamonds with labels. The histogram on the right uses the same brush as Q1: brushing a range highlights the counties in that range here, and fades the rest. The rho printed above is computed on the full national sample and does not change when you brush."
      shows={[
        "Spearman rho, overall SVI vs prevalence (national): diabetes 0.75, CHD 0.62, high blood pressure 0.60, COPD 0.50, obesity 0.34.",
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
      <div className="q3-main">
        <div>
          <h2>{COND_LABEL[cond]} vs overall SVI, counties</h2>
          <Scatter points={points} xDomain={[0, 1]} yDomain={[0, yMax]} xLabel="Overall SVI (0 to 1)"
            yLabel={`${COND_LABEL[cond]}, age-adjusted (%)`} ariaLabel={`Scatter of ${COND_LABEL[cond]} against overall SVI`} />
          <p className="stat">Spearman rho = <strong>{fmt2(rho)}</strong>, n = {pairs.length.toLocaleString("en-US")} counties (national, fixed)</p>
        </div>
        <aside className="side">
          <Histogram values={allValues} xLabel={`${COND_LABEL[cond]} (%)`} brushRange={brushRange} onBrush={onBrush} />
          <HoverCard kinds={["county"]} />
        </aside>
      </div>
    </Question>
  );
}
