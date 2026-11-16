// Q4: themes (rows) by conditions (columns), Spearman rho in every cell.
// Diverging scale fixed at -1 to +1 with a gray midpoint. Clicking a cell sets the scatter.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { DIVERGING } from "../lib/constants.js";

const W = 560, H = 250, M = { t: 60, r: 10, b: 10, l: 170 };

export default function CorrHeatmap({ rows, cols, valueOf, selected, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const color = d3.scaleLinear().domain([-1, -0.5, 0, 0.5, 1]).range(DIVERGING);
    const cw = (W - M.l - M.r) / cols.length, ch = (H - M.t - M.b) / rows.length;

    cols.forEach((c, j) => {
      svg.append("text").attr("x", M.l + cw * j + cw / 2).attr("y", M.t - 14).attr("text-anchor", "middle")
        .attr("font-size", 12).text(c.label);
    });
    rows.forEach((r, i) => {
      svg.append("text").attr("x", M.l - 10).attr("y", M.t + ch * i + ch / 2 + 4).attr("text-anchor", "end")
        .attr("font-size", 12).text(r.label);
      cols.forEach((c, j) => {
        const v = valueOf(r.key, c.key);
        const isSel = selected.theme === r.key && selected.cond === c.key;
        const g = svg.append("g").style("cursor", "pointer").on("click", () => onPick(r.key, c.key));
        g.append("rect").attr("x", M.l + cw * j + 2).attr("y", M.t + ch * i + 2)
          .attr("width", cw - 4).attr("height", ch - 4).attr("fill", v == null ? "#d9d8d2" : color(v))
          .attr("stroke", isSel ? "#111" : "none").attr("stroke-width", 2.5);
        g.append("text").attr("x", M.l + cw * j + cw / 2).attr("y", M.t + ch * i + ch / 2 + 5)
          .attr("text-anchor", "middle").attr("font-size", 13)
          .attr("fill", v != null && Math.abs(v) > 0.6 ? "#fff" : "#111")
          .text(v == null ? "n/a" : v.toFixed(2));
      });
    });
  }, [rows, cols, valueOf, selected, onPick]);
  return <svg ref={ref} className="chart heatmap" role="img" aria-label="Heatmap of Spearman correlations between SVI themes and conditions" />;
}
