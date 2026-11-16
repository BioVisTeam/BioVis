// D3 for review. Used by: Q2. Encodes: per-borough box plots with jittered tract dots.
// D3: linear scales, quantiles, data joins, d3-brush on the y axis. React owns the container; D3 draws inside useEffect.
// ---
// Q2 borough box plots. One panel per borough, all on the same y-scale for a condition.
// Dots are tracts (jittered), box = middle 50%, whiskers = p10 to p90, red diamond = county value.
// A y-range brush highlights those tracts on the map. Clicking a borough name selects it.
import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BOROUGHS, MARK, MUTED, BAR_SOFT, INK, SEAM, BAR, HILITE, PIN_W } from "../../app/src/lib/constants.js";
import { useAppState } from "../../app/src/state/AppState.jsx";

const W = 560, H = 380, M = { t: 14, r: 12, b: 64, l: 44 };
const inRange = (v, r) => r && v >= r[0] && v <= r[1];

export default function Boxplots({ tracts, yMax, brushRange, onBrush, borough, onBorough, ariaLabel }) {
  const ref = useRef(null);
  const brushRef = useRef(null);
  const gBrushRef = useRef(null);
  const yRef = useRef(null);
  const dotsRef = useRef(null);
  const onBrushRef = useRef(onBrush);
  onBrushRef.current = onBrush;
  const { state, set, togglePin } = useAppState();
  const pinned = state.pinned?.kind === "tract" ? state.pinned.id : null;

  // Draw the panels once per data set (not on every brush move).
  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([H - M.b, M.t]);
    yRef.current = y;
    const pw = (W - M.l - M.r) / BOROUGHS.length;
    svg.append("g").attr("transform", `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(6));

    // Brush first, so the dots stay on top and remain hoverable.
    brushRef.current = d3.brushY().extent([[M.l, M.t], [W - M.r, H - M.b]]).on("end", (e) => {
      if (!e.sourceEvent) return;
      if (!e.selection) return onBrushRef.current(null);
      onBrushRef.current([y.invert(e.selection[1]), y.invert(e.selection[0])]);
    });
    gBrushRef.current = svg.append("g").attr("class", "brush").call(brushRef.current);

    dotsRef.current = [];
    BOROUGHS.forEach((name, i) => {
      const cx = M.l + pw * i + pw / 2;
      const bw = pw * 0.45;
      const rows = tracts.filter((t) => t.borough === name);
      const v = rows.map((t) => t.value);
      const g = svg.append("g");

      g.append("rect").attr("x", M.l + pw * i).attr("y", H - M.b + 2).attr("width", pw).attr("height", M.b - 4)
        .attr("fill", "transparent").style("cursor", "pointer")
        .on("click", () => onBorough(borough === name ? null : name));
      g.append("text").attr("x", cx).attr("y", H - M.b + 18).attr("text-anchor", "middle")
        .attr("font-size", 12).attr("font-weight", borough === name ? 700 : 400).text(name);
      if (!v.length) {
        g.append("text").attr("x", cx).attr("y", H / 2).attr("text-anchor", "middle").attr("font-size", 11).text("no estimates");
        return;
      }
      g.append("text").attr("x", cx).attr("y", H - M.b + 34).attr("text-anchor", "middle").attr("font-size", 10).attr("fill", MUTED)
        .text(`tracts ${d3.min(v).toFixed(1)} to ${d3.max(v).toFixed(1)}`);

      const p10 = d3.quantile(v, 0.1), p25 = d3.quantile(v, 0.25), med = d3.quantile(v, 0.5);
      const p75 = d3.quantile(v, 0.75), p90 = d3.quantile(v, 0.9);
      g.append("line").attr("x1", cx).attr("x2", cx).attr("y1", y(p90)).attr("y2", y(p10)).attr("stroke", MUTED);
      for (const w of [p10, p90]) {
        g.append("line").attr("x1", cx - bw / 3).attr("x2", cx + bw / 3).attr("y1", y(w)).attr("y2", y(w)).attr("stroke", MUTED);
      }
      g.append("rect").attr("x", cx - bw / 2).attr("y", y(p75)).attr("width", bw).attr("height", Math.max(1, y(p25) - y(p75)))
        .attr("fill", BAR_SOFT).attr("stroke", MUTED);
      g.append("line").attr("x1", cx - bw / 2).attr("x2", cx + bw / 2).attr("y1", y(med)).attr("y2", y(med))
        .attr("stroke", INK).attr("stroke-width", 2);

      // Jitter is deterministic (index based), so the plot does not move on re-draw.
      const dots = g.append("g").selectAll("circle").data(rows).join("circle")
        .attr("cx", (t, j) => cx + ((((j * 37) % 100) / 100) - 0.5) * bw * 0.9)
        .attr("cy", (t) => y(t.value)).attr("r", 2.2)
        .on("mouseenter", (e, t) => set({ hover: { id: t.id, kind: "tract" } }))
        .on("mouseleave", () => set({ hover: null }))
        .on("click", (e, t) => togglePin(t.id, "tract"));
      dots.append("title").text((t) => `Tract ${t.id}: ${t.value.toFixed(1)}%`);
      dotsRef.current.push(dots);

      // County marker: to the right of the box, or to the left for the last panel so the label stays inside the plot.
      const county = rows.find((t) => t.countyValue != null)?.countyValue;
      if (county != null) {
        const left = i === BOROUGHS.length - 1;
        const dx = left ? -(bw / 2 + 6) : bw / 2 + 6;
        g.append("path").attr("d", d3.symbol(d3.symbolDiamond, 110)()).attr("fill", MARK).attr("stroke", SEAM)
          .attr("transform", `translate(${cx + dx},${y(county)})`);
        g.append("text").attr("x", cx + dx + (left ? -7 : 7)).attr("y", y(county) + 4).attr("font-size", 10)
          .attr("fill", MARK).attr("text-anchor", left ? "end" : "start")
          .text(`county ${county.toFixed(1)}`);
      }
    });
  }, [tracts, yMax, borough, onBorough, set, togglePin]);

  // Highlight tracts inside the brushed range (colour and opacity only).
  useEffect(() => {
    (dotsRef.current || []).forEach((sel) => {
      sel.attr("r", 2.2).attr("stroke", "none").attr("fill", (t) => (inRange(t.value, brushRange) ? MARK : BAR))
        .attr("opacity", (t) => (brushRange && !inRange(t.value, brushRange) ? 0.25 : 0.8));
    });
    // Pinned tract: bigger dot with the highlight outline, on top.
    (dotsRef.current || []).forEach((sel) => {
      sel.filter((t) => t.id === pinned).attr("r", 5).attr("stroke", HILITE).attr("stroke-width", PIN_W).attr("opacity", 1).raise();
    });
  }, [brushRange, tracts, yMax, borough, pinned]);

  // Keep the drawn brush in step with the shared y-range.
  useEffect(() => {
    const y = yRef.current;
    if (!gBrushRef.current || !y) return;
    gBrushRef.current.call(brushRef.current.move, brushRange ? [y(brushRange[1]), y(brushRange[0])] : null);
  }, [brushRange, yMax, borough, tracts]);

  return <svg ref={ref} className="chart boxplots" role="img" aria-label={ariaLabel} />;
}
