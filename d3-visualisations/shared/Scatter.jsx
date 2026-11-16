// D3 for review. Used by: Q3, Q4 (shared). Encodes: scatter of two measures, highlighted subset.
// D3: linear scales, data join, symbols. React owns the container; D3 draws inside useEffect.
// ---
// Generic scatter for Q3, Q4 and the county part of Q5. Points come in ready-made;
// a highlighted subset stays solid and the rest fade. NYC marks are diamonds with labels.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { MARK, BAR, SEAM, INK, HILITE, PIN_W } from "../../app/src/lib/constants.js";
import { useAppState } from "../../app/src/state/AppState.jsx";

const W = 560, H = 360, M = { t: 14, r: 16, b: 44, l: 52 };

export default function Scatter({ points, xDomain, yDomain, xLabel, yLabel, ariaLabel }) {
  const ref = useRef(null);
  const { state, set, togglePin } = useAppState();
  const pinned = state.pinned?.kind === "county" ? state.pinned.id : null;
  const anyHighlight = points.some((p) => p.highlight);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const x = d3.scaleLinear().domain(xDomain).range([M.l, W - M.r]);
    const y = d3.scaleLinear().domain(yDomain).nice().range([H - M.b, M.t]);
    svg.append("g").attr("transform", `translate(0,${H - M.b})`).call(d3.axisBottom(x).ticks(6));
    svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6));
    svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 6).attr("text-anchor", "middle").text(xLabel);
    svg.append("text").attr("transform", "rotate(-90)").attr("x", -(H - M.b + M.t) / 2).attr("y", 14)
      .attr("text-anchor", "middle").text(yLabel);

    const dim = (p) => (anyHighlight && !p.highlight ? 0.12 : 0.75);
    const regular = points.filter((p) => !p.nyc);
    const dots = svg.append("g").selectAll("circle").data(regular).join("circle")
      .attr("cx", (p) => x(p.x)).attr("cy", (p) => y(p.y)).attr("r", 3)
      .attr("fill", BAR).attr("opacity", dim).style("cursor", "pointer")
      .on("mouseenter", (e, p) => set({ hover: { id: p.id, kind: "county" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, p) => togglePin(p.id, "county"));

    const nyc = points.filter((p) => p.nyc);
    const g = svg.append("g").selectAll("g").data(nyc).join("g")
      .attr("transform", (p) => `translate(${x(p.x)},${y(p.y)})`)
      .on("mouseenter", (e, p) => set({ hover: { id: p.id, kind: "county" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, p) => togglePin(p.id, "county")).style("cursor", "pointer");
    g.append("path").attr("d", d3.symbol(d3.symbolDiamond, 90)()).attr("fill", MARK).attr("stroke", SEAM);
    g.append("text").attr("x", 8).attr("y", 4).attr("font-size", 11).attr("fill", INK).text((p) => p.label);
    // Pinned county: bigger point with the highlight outline, on top, full opacity.
    dots.filter((p) => p.id === pinned).attr("r", 6).attr("stroke", HILITE).attr("stroke-width", PIN_W).attr("opacity", 1).raise();
    g.filter((p) => p.id === pinned).raise().select("path").attr("stroke", HILITE).attr("stroke-width", PIN_W);
  }, [points, xDomain, yDomain, xLabel, yLabel, anyHighlight, set, togglePin, pinned]);

  return <svg ref={ref} className="chart scatter" role="img" aria-label={ariaLabel} />;
}
