// Q5: NYC tracts. x = crude prevalence (%), y = estimated affected adults.
// Colour and shape both encode borough, so colour is not the only cue. Tracts under 500
// adults are hollow and not ranked. Dashed lines mark the top 10% of each axis.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BOROUGHS } from "../lib/constants.js";
import { useAppState } from "../state/AppState.jsx";

const W = 600, H = 380, M = { t: 14, r: 16, b: 48, l: 64 };
const BOROUGH_STYLE = {
  Bronx: { color: "#0072B2", shape: d3.symbolCircle },
  Brooklyn: { color: "#E69F00", shape: d3.symbolSquare },
  Manhattan: { color: "#009E73", shape: d3.symbolTriangle },
  Queens: { color: "#CC79A7", shape: d3.symbolDiamond },
  "Staten Island": { color: "#56B4E9", shape: d3.symbolCross },
};

export default function TractScatter({ tracts, xCut, yCut, ariaLabel }) {
  const ref = useRef(null);
  const { set } = useAppState();
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const pts = tracts.filter((t) => t.x != null && t.y != null);
    const x = d3.scaleLinear().domain([0, d3.max(pts, (p) => p.x)]).nice().range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain([0, d3.max(pts, (p) => p.y)]).nice().range([H - M.b, M.t]);
    svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(7));
    svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text("Crude prevalence (%)");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(H - M.b + M.t) / 2).attr("y", 16)
      .attr("text-anchor", "middle").text("Estimated affected adults (count)");

    if (xCut != null) {
      svg.append("line").attr("x1", x(xCut)).attr("x2", x(xCut)).attr("y1", M.t).attr("y2", H - M.b)
        .attr("stroke", "#666").attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", x(xCut) + 4).attr("y", M.t + 10).attr("font-size", 10).text("top 10% rate");
    }
    if (yCut != null) {
      svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(yCut)).attr("y2", y(yCut))
        .attr("stroke", "#666").attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", W - M.r - 4).attr("y", y(yCut) - 4).attr("font-size", 10).attr("text-anchor", "end")
        .text("top 10% adults");
    }

    svg.append("g").selectAll("path").data(pts).join("path")
      .attr("transform", (p) => `translate(${x(p.x)},${y(p.y)})`)
      .attr("d", (p) => d3.symbol(BOROUGH_STYLE[p.borough].shape, 70)())
      .attr("fill", (p) => (p.small ? "none" : BOROUGH_STYLE[p.borough].color))
      .attr("stroke", (p) => BOROUGH_STYLE[p.borough].color).attr("stroke-width", (p) => (p.small ? 1.4 : 0.6))
      .attr("opacity", (p) => (p.small ? 0.9 : 0.7))
      .on("mouseenter", (e, p) => set({ hover: { id: p.id, kind: "tract" } }))
      .on("mouseleave", () => set({ hover: null }))
      .append("title").text((p) => `${p.borough}, tract ${p.id}${p.small ? " (under 500 adults, not ranked)" : ""}`);
  }, [tracts, xCut, yCut, set]);

  return (
    <>
      <svg ref={ref} className="chart scatter" role="img" aria-label={ariaLabel} />
      <div className="legend-inline">
        {BOROUGHS.map((b) => (
          <span key={b} className="legend-key">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <path d={d3.symbol(BOROUGH_STYLE[b].shape, 40)()} fill={BOROUGH_STYLE[b].color} />
            </svg>
            {b}
          </span>
        ))}
        <span className="legend-key">hollow = under 500 adults</span>
      </div>
    </>
  );
}
