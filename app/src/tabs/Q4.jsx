// Q4: which SVI themes show the strongest association with each condition.
// Heatmap of Spearman rho (from the repo's q4_correlations.csv). Clicking a cell redraws the scatter.
import { useCallback, useMemo } from "react";
import { CONDITIONS, COND_LABEL, NYC_FIPS, THEME_SHORT } from "../lib/constants.js";
import { spearman } from "../lib/stats.js";
import { fmt2 } from "../lib/format.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import CorrHeatmap from "../../../d3-visualisations/q4/CorrHeatmap.jsx";
import Scatter from "../../../d3-visualisations/shared/Scatter.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

const THEMES = [
  { key: "RPL_THEME1", label: "1. Socioeconomic" },
  { key: "RPL_THEME2", label: "2. Household characteristics" },
  { key: "RPL_THEME3", label: "3. Racial and ethnic minority" },
  { key: "RPL_THEME4", label: "4. Housing type and transport" },
];

export default function Q4() {
  const data = useData();
  const { state, set } = useAppState();
  const { cond, scatterX } = state;

  const lookup = useMemo(
    () => new Map(data.q4.map((r) => [`${r.theme}|${r.disease}`, r.rho])),
    [data.q4],
  );
  const valueOf = useCallback((theme, c) => lookup.get(`${theme}|${c}`) ?? null, [lookup]);
  const selected = useMemo(() => ({ theme: scatterX, cond }), [scatterX, cond]);
  const onPick = useCallback((theme, c) => set({ scatterX: theme, cond: c }), [set]);

  const pairs = useMemo(
    () => data.counties.filter((c) => c[cond] != null && c[scatterX] != null),
    [data.counties, cond, scatterX],
  );
  const rho = useMemo(
    () => spearman(pairs.map((c) => c[scatterX]), pairs.map((c) => c[cond])),
    [pairs, cond, scatterX],
  );
  const points = useMemo(
    () => pairs.map((c) => ({ id: c.fips, x: c[scatterX], y: c[cond], nyc: NYC_FIPS.includes(c.fips), label: c.borough || "" })),
    [pairs, cond, scatterX],
  );
  const yMax = useMemo(() => Math.max(...pairs.map((c) => c[cond])), [pairs, cond]);
  const themeName = THEMES.find((t) => t.key === scatterX)?.label ?? THEME_SHORT[scatterX];

  return (
    <Question
      title="Q4. Which SVI themes associate most with each condition"
      question="Which SVI themes are most strongly associated with each chronic condition across counties?"
      answer={`Theme 1 (socioeconomic) has the strongest association with diabetes (rho 0.79). Theme 3 (racial and ethnic minority status) is about zero for COPD (rho -0.02).`}
      read="Rows are the four SVI themes, columns the five conditions, and each cell prints the Spearman rho across counties. The colour scale runs from -1 (blue) through gray at 0 to +1 (red) and is fixed, so cells are comparable. Click a cell to draw that theme against that condition in the scatter below."
      shows={[
        "Theme 1 (socioeconomic) is the strongest across conditions: diabetes 0.79, CHD 0.71, high blood pressure 0.66, COPD 0.62, obesity 0.38.",
        "Theme 3 (racial and ethnic minority status) is strong for diabetes (0.51) but near zero for obesity (0.07) and COPD (-0.02).",
        "Theme 4 (housing type and transport) ranges from 0.17 (obesity) to 0.43 (diabetes). It is not a PLACES model input, but its associations are not uniformly the weakest.",
      ]}
      caveats={[
        "Association, not cause. Theme 1 includes below-150% poverty and no high-school diploma, both repeated in PLACES inputs; theme 3 includes minority status and race/ethnicity groups. These overlaps are discussed in Q3 and Data & Methods.",
        "The matrix is fixed at national values; highlighting in the scatter does not change it.",
      ]}
    >
      <CorrHeatmap rows={THEMES} cols={CONDITIONS} valueOf={valueOf} selected={selected} onPick={onPick} />
      <h2>{themeName} vs {COND_LABEL[cond]}</h2>
      <div className="q4-scatter">
        <Scatter points={points} xDomain={[0, 1]} yDomain={[0, yMax]} xLabel={`${themeName} (percentile, 0 to 1)`}
          yLabel={`${COND_LABEL[cond]}, age-adjusted (%)`} ariaLabel={`Scatter of ${COND_LABEL[cond]} against ${themeName}`} />
        <aside className="side">
          <p className="stat">Spearman rho = <strong>{fmt2(rho)}</strong>, n = {pairs.length.toLocaleString("en-US")} counties</p>
          <HoverCard kinds={["county"]} />
        </aside>
      </div>
    </Question>
  );
}
