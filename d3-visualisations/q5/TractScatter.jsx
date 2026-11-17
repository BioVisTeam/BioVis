// D3 for review. Used by: Q5. Encodes: NYC tracts: prevalence vs affected adults.
// D3: linear scales, symbol shapes per borough, data join, threshold lines. React owns the container; D3 draws inside useEffect.
// ---
// Q5: NYC tracts. x = crude prevalence (%), y = estimated affected adults.
// Colour and shape both encode borough, so colour is not the only cue. Tracts under 500
// adults are hollow and not ranked. Dashed lines mark the top 10% of each axis.
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { BOROUGHS, MUTED, HILITE, PIN_W } from "../../app/src/lib/constants.js";
import { useAppState } from "../../app/src/state/AppState.jsx";

const W = 600, H = 380, M = { t: 14, r: 16, b: 48, l: 64 };
const BOROUGH_STYLE = {
  Bronx: { color: "#56B4E9", shape: d3.symbolCircle },
  Brooklyn: { color: "#E69F00", shape: d3.symbolSquare },
  Manhattan: { color: "#33d1a1", shape: d3.symbolTriangle },
  Queens: { color: "#e59bc4", shape: d3.symbolDiamond },
  "Staten Island": { color: "#F0E442", shape: d3.symbolCross },
};

export default function TractScatter({ tracts, xCut, yCut, ariaLabel }) {
  const ref = useRef(null);
  const { state, set, togglePin } = useAppState();
  const [shown, setShown] = useState(BOROUGHS);
  const toggle = (b) => setShown((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]));
  const pinned = state.pinned?.kind === "tract" ? state.pinned.id : null;
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const all = tracts.filter((t) => t.x != null && t.y != null);
    const pts = all.filter((p) => shown.includes(p.borough)); // axes use all boroughs so they stay put
    const x = d3.scaleLinear().domain([0, d3.max(all, (p) => p.x)]).nice().range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain([0, d3.max(all, (p) => p.y)]).nice().range([H - M.b, M.t]);
    svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(7));
    svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text("Crude prevalence (%)");
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(H - M.b + M.t) / 2).attr("y", 16)
      .attr("text-anchor", "middle").text("Estimated affected adults (count)");

    if (xCut != null) {
      svg.append("line").attr("x1", x(xCut)).attr("x2", x(xCut)).attr("y1", M.t).attr("y2", H - M.b)
        .attr("stroke", MUTED).attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", x(xCut) + 4).attr("y", M.t + 10).attr("font-size", 10).text("top 10% rate");
    }
    if (yCut != null) {
      svg.append("line").attr("x1", M.l).attr("x2", W - M.r).attr("y1", y(yCut)).attr("y2", y(yCut))
        .attr("stroke", MUTED).attr("stroke-dasharray", "4 3");
      svg.append("text").attr("x", W - M.r - 4).attr("y", y(yCut) - 4).attr("font-size", 10).attr("text-anchor", "end")
        .text("top 10% adults");
    }

    const dots = svg.append("g").selectAll("path").data(pts).join("path")
      .attr("transform", (p) => `translate(${x(p.x)},${y(p.y)})`)
      .attr("d", (p) => d3.symbol(BOROUGH_STYLE[p.borough].shape, 70)())
      .attr("fill", (p) => (p.small ? "none" : BOROUGH_STYLE[p.borough].color))
      .attr("stroke", (p) => BOROUGH_STYLE[p.borough].color).attr("stroke-width", (p) => (p.small ? 1.4 : 0.6))
      .attr("opacity", (p) => (p.small ? 0.9 : 0.7)).style("cursor", "pointer")
      .on("mouseenter", (e, p) => set({ hover: { id: p.id, kind: "tract" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, p) => togglePin(p.id, "tract"));
    dots.append("title").text((p) => `${p.borough}, tract ${p.id}${p.small ? " (under 500 adults, not ranked)" : ""}`);
    // Pinned tract: bigger symbol with the highlight outline, on top.
    dots.filter((p) => p.id === pinned).attr("d", (p) => d3.symbol(BOROUGH_STYLE[p.borough].shape, 260)())
      .attr("stroke", HILITE).attr("stroke-width", PIN_W).attr("opacity", 1).raise();
  }, [tracts, xCut, yCut, shown, set, togglePin, pinned]);

  return (
    <>
      <svg ref={ref} className="chart scatter" role="img" aria-label={ariaLabel} />
      <div className="legend-inline">
        {BOROUGHS.map((b) => (
          <label key={b} className="legend-key" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={shown.includes(b)} onChange={() => toggle(b)} />
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <path d={d3.symbol(BOROUGH_STYLE[b].shape, 40)()} fill={BOROUGH_STYLE[b].color} />
            </svg>
            {b}
          </label>
        ))}
        <span className="legend-key">hollow = under 500 adults</span>
      </div>
    </>
  );
}
