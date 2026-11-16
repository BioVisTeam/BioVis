// Q5: do the highest-prevalence NYC tracts also have the most affected adults?
import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { COND_LABEL } from "../lib/constants.js";
import { fmt1, fmtInt } from "../lib/format.js";
import { q5Summary } from "../lib/q5.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import TractScatter from "../charts/TractScatter.jsx";
import HoverCard from "../components/HoverCard.jsx";
import Question from "../components/Question.jsx";

export default function Q5() {
  const data = useData();
  const { state } = useAppState();
  const { cond } = state;

  // Load q5.csv from the public folder for the scatterplot
  const [rows, setRows] = useState(null);
  useEffect(() => {
    d3.csv(import.meta.env.BASE_URL + "data/q5.csv", d3.autoType).then(setRows);
  }, []);

  const summary = useMemo(() => q5Summary(data.nycTracts, cond), [data.nycTracts, cond]);
  const q = summary.quadrants;

  return (
    <Question
      title="Q5. Rate vs affected adults in NYC tracts"
      question="Do the tracts with the highest prevalence also have the most affected adults?"
      answer={`Not always. Among the ${fmtInt(summary.eligible)} NYC tracts with 500 or more adults, ${fmtInt(q.highRateFewPeople)} are in the top 10% for rate but not for number of affected adults, and ${fmtInt(q.highRateManyPeople)} are in the top 10% for both (${COND_LABEL[cond]}).`}
      read="Each dot is a NYC tract. The x-axis is the crude prevalence (%), the y-axis is the estimated number of affected adults (crude prevalence times adults 18 and over). Shape and colour both show the borough. Hollow dots are tracts with fewer than 500 adults; they are drawn but not ranked. Dashed lines mark the top 10% of each axis, computed on the ranked tracts only."
      shows={[
        `Quadrant counts for ${COND_LABEL[cond]} (ranked tracts): high rate and many people ${fmtInt(q.highRateManyPeople)}; high rate, few people ${fmtInt(q.highRateFewPeople)}; many people, moderate rate ${fmtInt(q.manyPeopleModerateRate)}; neither ${fmtInt(q.neither)}.`,
        `Top-10% cut-offs: rate at or above ${fmt1(summary.xCut)}%; affected adults at or above ${fmtInt(summary.yCut)}.`,
        "Use the Condition dropdown to switch conditions, and the borough checkboxes to choose which boroughs to compare. 'All' adds the five condition counts together, so a person with more than one condition is counted more than once.",
      ]}
      caveats={[
        "Affected adults are estimates (prevalence times adults), not counts. Because the count is built from the rate, the two axes are partly linked by construction.",
        "Crude tract values from the PLACES 2025 tract model; the spread is modeled, not measured.",
        "Association, not cause.",
      ]}
    >
      <div className="q5-main">
        <div>
          {rows ? (
            <TractScatter rows={rows} ariaLabel="NYC tracts: prevalence against estimated affected adults" />
          ) : (
            <p>Loading tract data...</p>
          )}
        </div>
        <aside className="side">
          <HoverCard kinds={["tract"]} nycOnly />
        </aside>
      </div>
    </Question>
  );
}