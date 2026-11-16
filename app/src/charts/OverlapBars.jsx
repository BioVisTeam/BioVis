// Q6 overlap bars (UpSet style): one bar per non-empty combination of criteria,
// with a dot matrix underneath showing which criteria each bar uses.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BAR, MISSING } from "../lib/constants.js";

const W = 560, H = 330, M = { t: 24, r: 12, b: 84, l: 150 };
const ROWS = [
  { key: "P", label: "Prevalence" },
  { key: "C", label: "Affected adults" },
  { key: "S", label: "SVI" },
];
const COMBOS = ["P", "C", "S", "PC", "PS", "CS", "PCS"];

export default function OverlapBars({ overlap, ariaLabel }) {
  const ref = useRef(null);
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const items = COMBOS.map((k) => ({ key: k, count: overlap[k] || 0 }))
      .sort((a, b) => b.count - a.count);
    const cw = (W - M.l - M.r) / items.length;
    const barBottom = H - M.b - 80;
    const y = d3.scaleLinear().domain([0, d3.max(items, (d) => d.count) || 1]).range([barBottom, M.t + 14]);

    items.forEach((d, i) => {
      const cx = M.l + cw * i + cw / 2;
      svg.append("rect").attr("x", cx - cw * 0.3).attr("y", y(d.count)).attr("width", cw * 0.6)
        .attr("height", barBottom - y(d.count)).attr("fill", BAR);
      svg.append("text").attr("x", cx).attr("y", y(d.count) - 4).attr("text-anchor", "middle")
        .attr("font-size", 11).text(d.count.toLocaleString("en-US"));
      const members = [...d.key];
      const yBase = H - M.b - 80 + 22;
      const rowY = (k) => yBase + ROWS.findIndex((r) => r.key === k) * 18;
      if (members.length > 1) {
        svg.append("line").attr("x1", cx).attr("x2", cx)
          .attr("y1", rowY(members[0])).attr("y2", rowY(members[members.length - 1])).attr("stroke", BAR).attr("stroke-width", 2);
      }
      ROWS.forEach((r) => {
        svg.append("circle").attr("cx", cx).attr("cy", rowY(r.key)).attr("r", 5)
          .attr("fill", members.includes(r.key) ? BAR : MISSING);
      });
    });
    ROWS.forEach((r) => {
      svg.append("text").attr("x", M.l - 10).attr("y", H - M.b - 80 + 26 + ROWS.findIndex((x) => x.key === r.key) * 18)
        .attr("text-anchor", "end").attr("font-size", 11).text(r.label);
    });
    svg.append("text").attr("x", 0).attr("y", 14).attr("text-anchor", "start").attr("font-size", 11)
      .text("Tracts meeting exactly this set of criteria");
  }, [overlap]);
  return <svg ref={ref} className="chart overlap" role="img" aria-label={ariaLabel} />;
}
