// Brushable histogram: 35 bins, median line, p10-p90 band, its own x-scale.
// A brush the user drags calls onBrush. A selection moved by React state does not
// (d3 gives no sourceEvent for programmatic moves), so the two never loop.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BAR, BAR_SOFT, INK, MUTED } from "../lib/constants.js";
import { ensureDefs } from "../lib/patterns.js";

const W = 320, H = 150, M = { t: 10, r: 10, b: 28, l: 44 };

export default function Histogram({ values, xLabel, brushRange, onBrush }) {
  const ref = useRef(null);
  const scaleRef = useRef(null);
  const brushRef = useRef(null);
  const gRef = useRef(null);
  const onBrushRef = useRef(onBrush);
  onBrushRef.current = onBrush;

  // Draw bins, axes and the brush whenever the values change.
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    ensureDefs(svg);
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const v = values.filter((x) => x != null);
    if (!v.length) return;
    const x = d3.scaleLinear().domain(d3.extent(v)).nice().range([M.l, W - M.r]);
    scaleRef.current = x;
    const bins = d3.bin().domain(x.domain()).thresholds(35)(v);
    const y = d3.scaleLinear().domain([0, d3.max(bins, (b) => b.length)]).nice().range([H - M.b, M.t]);
    const p10 = d3.quantile(v, 0.1), p90 = d3.quantile(v, 0.9), med = d3.quantile(v, 0.5);

    svg.append("rect").attr("x", x(p10)).attr("y", M.t).attr("width", x(p90) - x(p10))
      .attr("height", H - M.b - M.t).attr("fill", BAR_SOFT).attr("opacity", 0.35);
    svg.append("g").selectAll("rect").data(bins).join("rect")
      .attr("x", (b) => x(b.x0) + 1).attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 2))
      .attr("y", (b) => y(b.length)).attr("height", (b) => y(0) - y(b.length))
      .attr("fill", BAR);
    svg.append("line").attr("x1", x(med)).attr("x2", x(med)).attr("y1", M.t).attr("y2", H - M.b)
      .attr("stroke", INK).attr("stroke-dasharray", "3 2");
    svg.append("g").attr("transform", `translate(0,${H - M.b})`)
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0)).call((g) => g.selectAll("text").attr("font-size", 10));
    svg.append("g").attr("transform", `translate(${M.l},0)`)
      .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0)).call((g) => g.selectAll("text").attr("font-size", 10));
    svg.append("text").attr("x", (M.l + W - M.r) / 2).attr("y", H - 2).attr("text-anchor", "middle")
      .attr("font-size", 11).text(xLabel);
    svg.append("text").attr("x", M.l + 4).attr("y", M.t + 10).attr("font-size", 10).attr("fill", MUTED)
      .text("dashed = median; shaded = p10 to p90");

    brushRef.current = d3.brushX().extent([[M.l, M.t], [W - M.r, H - M.b]]).on("end", (e) => {
      if (!e.sourceEvent) return;
      onBrushRef.current(e.selection ? [x.invert(e.selection[0]), x.invert(e.selection[1])] : null);
    });
    gRef.current = svg.append("g").attr("class", "brush").call(brushRef.current);
  }, [values, xLabel]);

  // Keep the drawn selection in step with the shared brush.
  useEffect(() => {
    const x = scaleRef.current;
    if (!gRef.current || !x) return;
    gRef.current.call(brushRef.current.move, brushRange ? [x(brushRange[0]), x(brushRange[1])] : null);
  }, [brushRange, values]);

  return <svg ref={ref} className="chart histogram" role="img" aria-label={`Histogram of ${xLabel}`} />;
}
