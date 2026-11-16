// Q5: NYC tracts. x = crude prevalence (%), y = estimated affected adults.
// Colour shows borough. Dashed lines mark the top 10% of each axis (tracts with 500+ adults).
//Refs: https://observablehq.com/@observablehq/input-select
//Refs: https://observablehq.com/@observablehq/input-checkbox
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { MUTED, HILITE, PIN_W } from "../lib/constants.js";
import { useAppState } from "../state/AppState.jsx";

const W = 700, H = 550, M = { t: 20, r: 20, b: 60, l: 70 };

// Same names as the Borough column in q5.csv
const boroughs = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
const color = d3.scaleOrdinal().domain(boroughs).range(d3.schemeAccent);

const DISEASES = [
  ["ALL", "All conditions"],
  ["DIABETES", "Diabetes"],
  ["BPHIGH", "High blood pressure"],
  ["CASTHMA", "Asthma"],
  ["COPD", "COPD"],
  ["CHD", "Coronary heart disease"],
];
const CODES = ["DIABETES", "BPHIGH", "CASTHMA", "COPD", "CHD"];

export default function TractScatter({ rows, ariaLabel }) {
  const ref = useRef(null);
  const { state, set, togglePin } = useAppState();
  const pinned = state.pinned?.kind == "tract" ? state.pinned.id : null;

  const [disease, setDisease] = useState("ALL");
  const [shown, setShown] = useState(boroughs);

  const toggleBorough = (b) =>
    setShown((s) => (s.includes(b) ? s.filter((x) => x != b) : [...s, b]));

  useEffect(() => {
    console.log("rows:", rows && rows.length, rows && rows[0]);
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", "0 0 " + W + " " + H);

    // For "All", add up the counts and divide by the adult population
    const data = rows.map((d) => {
      const count = disease == "ALL"
        ? d3.sum(CODES, (k) => d[k + "_EstCount"])
        : d[disease + "_EstCount"];
      const prev = disease == "ALL"
        ? (count / d.TotalPop18plus) * 100
        : d[disease + "_CrudePrev"];
      return { ...d, count, prev };
    });

    // Top 10% cutoffs, using tracts with 500+ adults
    const ranked = data.filter((d) => d.TotalPop18plus >= 500);
    const xCut = d3.quantile(ranked, 0.9, (d) => d.prev);
    const yCut = d3.quantile(ranked, 0.9, (d) => d.count);

    // Scales use every tract so the axes stay put when boroughs are toggled
    const x = d3.scaleLinear()
      .domain(d3.extent(data, (d) => d.prev))
      .range([M.l, W - M.r])
      .nice();

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.count)])
      .range([H - M.b, M.t])
      .nice();

    svg.append("g")
      .attr("transform", "translate(0," + (H - M.b) + ")")
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", "translate(" + M.l + ",0)")
      .call(d3.axisLeft(y));

    // Axis titles
    svg.append("text")
      .attr("x", (W - M.r + M.l) / 2)
      .attr("y", H - 15)
      .attr("text-anchor", "middle")
      .text("Prevalence (%)");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -H / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .text("Estimated Affected Adults");

    // Dashed top 10% lines
    svg.append("line").attr("x1", x(xCut)).attr("x2", x(xCut)).attr("y1", M.t).attr("y2", H - M.b)
      .attr("stroke", MUTED).attr("stroke-dasharray", "4 3");
    svg.append("text").attr("x", x(xCut) + 4).attr("y", M.t + 10).attr("font-size", 10).text("top 10% rate");

    svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(yCut)).attr("y2", y(yCut))
      .attr("stroke", MUTED).attr("stroke-dasharray", "4 3");
    svg.append("text").attr("x", W - M.r - 4).attr("y", y(yCut) - 4).attr("font-size", 10)
      .attr("text-anchor", "end").text("top 10% adults");

    // Only put the boroughs that are checked
    const dots = svg.append("g")
      .selectAll("circle")
      .data(data.filter((d) => shown.includes(d.Borough)))
      .join("circle")
      .attr("cx", (d) => x(d.prev))
      .attr("cy", (d) => y(d.count))
      .attr("r", 3)
      .attr("fill", (d) => color(d.Borough))
      .attr("opacity", 0.6)
      .style("cursor", "pointer")
      .on("mouseenter", (e, d) => set({ hover: { id: d.TractFIPS, kind: "tract" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, d) => togglePin(d.TractFIPS, "tract"));

    dots.append("title").text((d) => [
      "Tract " + d.TractFIPS + " (" + d.Borough + ")",
      "Prevalence: " + d.prev.toFixed(1) + "%",
      "Affected adults: " + Math.round(d.count),
    ].join("\n"));

    // Pinned tract: bigger circle with the highlight outline, on top
    dots.filter((d) => d.TractFIPS == pinned)
      .attr("r", 7)
      .attr("stroke", HILITE)
      .attr("stroke-width", PIN_W)
      .attr("opacity", 1)
      .raise();
  }, [rows, disease, shown, set, togglePin, pinned]);

  return (
    <>
      {/* Condition dropdown. Refs: https://observablehq.com/@observablehq/input-select */}
      <label>
        Condition{" "}
        <select value={disease} onChange={(e) => setDisease(e.target.value)}>
          {DISEASES.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>

      <svg ref={ref} className="chart scatter" role="img" aria-label={ariaLabel} />

      {/* Borough checkboxes (also the legend). Refs: https://observablehq.com/@observablehq/input-checkbox */}
      <div className="legend-inline">
        {boroughs.map((b) => (
          <label key={b} className="legend-key" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={shown.includes(b)} onChange={() => toggleBorough(b)} />
            <svg width="12" height="12" viewBox="-6 -6 12 12">
              <circle r="5" fill={color(b)} />
            </svg>
            {" " + b}
          </label>
        ))}
      </div>
    </>
  );
}

// AI USE: Claude was used to transform this from a observablehq notebook to a React component.
// Also for the Selectall logic.