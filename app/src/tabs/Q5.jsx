// Q5: do the highest-prevalence NYC tracts also have the most affected adults?
// One condition at a time. The "All conditions" option from the Milestone 3 draft was removed by decision:
// adding condition counts would count the same person more than once.
import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { CONDITIONS, COND_LABEL } from "../lib/constants.js";
import { fmt1, fmtInt } from "../lib/format.js";
import { q5Points, q5SummaryOfPoints, parseAsthmaCsv } from "../lib/q5.js";
import { useData } from "../data/DataProvider.jsx";
import TractScatter from "../../../d3-visualisations/q5/TractScatter.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

export default function Q5() {
  const data = useData();
  // Local to Q5: asthma is not one of the dashboard's shared conditions.
  const [cond, setCond] = useState("DIABETES");
  const [asthma, setAsthma] = useState([]);
  useEffect(() => {
    d3.text(`${import.meta.env.BASE_URL}data/q5.csv`).then((t) => setAsthma(parseAsthmaCsv(t)));
  }, []);

  const points = useMemo(
    () => (cond === "CASTHMA" ? asthma : q5Points(data.nycTracts, cond)),
    [data.nycTracts, cond, asthma],
  );
  const summary = useMemo(() => q5SummaryOfPoints(points), [points]);
  const q = summary.quadrants;
  const label = cond === "CASTHMA" ? "Asthma" : COND_LABEL[cond];

  return (
    <Question
      title="Q5. Rate vs affected adults in NYC tracts"
      question="Do the tracts with the highest prevalence also have the most affected adults?"
      answer={`Not always. Among the ${fmtInt(summary.eligible)} NYC tracts with 500 or more adults, ${fmtInt(q.highRateFewPeople)} are in the top 10% for rate but not for number of affected adults, and ${fmtInt(q.highRateManyPeople)} are in the top 10% for both (${label}).`}
      read="Each dot is a NYC tract. The x-axis is the crude prevalence (%), the y-axis is the estimated number of affected adults (crude prevalence times adults 18 and over). Shape and colour both show the borough. Hollow dots are tracts with fewer than 500 adults; they are drawn but not ranked. Dashed lines mark the top 10% of each axis, computed on the ranked tracts only."
      shows={[
        `Quadrant counts for ${label} (ranked tracts): high rate and many people ${fmtInt(q.highRateManyPeople)}; high rate, few people ${fmtInt(q.highRateFewPeople)}; many people, moderate rate ${fmtInt(q.manyPeopleModerateRate)}; neither ${fmtInt(q.neither)}.`,
        `Top-10% cut-offs: rate at or above ${fmt1(summary.xCut)}%; affected adults at or above ${fmtInt(summary.yCut)}.`,
        "Use the Condition menu to switch conditions (asthma is included here from the Milestone 2 table), and the borough boxes to show or hide boroughs.",
      ]}
      caveats={[
        "Affected adults are estimates (prevalence times adults), not counts. Because the count is built from the rate, the two axes are partly linked by construction.",
        "Crude tract values from the PLACES 2025 tract model; the spread is modeled, not measured.",
        "Association, not cause.",
        "Asthma values come from the Milestone 2 Q5 table (q5.csv), not the dashboard's tract file.",
      ]}
    >
      <label>
        Condition{" "}
        <select value={cond} onChange={(e) => setCond(e.target.value)}>
          {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          <option value="CASTHMA">Asthma</option>
        </select>
      </label>
      <div className="q5-main">
        <div>
          <TractScatter tracts={points} xCut={summary.xCut} yCut={summary.yCut}
            ariaLabel={`NYC tracts: ${label} rate against estimated affected adults`} />
        </div>
        <aside className="side">
          <HoverCard kinds={["tract"]} nycOnly />
        </aside>
      </div>
    </Question>
  );
}
