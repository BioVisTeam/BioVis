// NYC tract choropleth (Mercator, fitted to the five boroughs). Used by Q2 and the Q6 NYC scope.
// styleFor(tractId) -> { fill, opacity }. focusIds zooms to a set of tracts (a borough).
import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { ensureDefs } from "../lib/patterns.js";
import { useAppState } from "../state/AppState.jsx";

export default function TractChoro({ geo, styleFor, focusIds = null, width = 520, height = 480, ariaLabel }) {
  const ref = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const pathsRef = useRef(null);
  const { state, set, togglePin } = useAppState();
  const projection = useMemo(() => d3.geoMercator().fitSize([width, height], geo), [geo, width, height]);

  useEffect(() => {
    const svg = d3.select(ref.current);
    ensureDefs(svg);
    const zoom = d3.zoom().scaleExtent([1, 30]).on("zoom", (e) => gRef.current.setAttribute("transform", e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);
    return () => svg.on(".zoom", null);
  }, []);

  useEffect(() => {
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();
    const path = d3.geoPath(projection);
    pathsRef.current = g.append("g").selectAll("path").data(geo.features, (f) => f.properties.GEOID).join("path")
      .attr("d", path).attr("stroke", "#fff").attr("stroke-width", 0.3).attr("vector-effect", "non-scaling-stroke")
      .on("mouseenter", (e, f) => set({ hover: { id: f.properties.GEOID, kind: "tract" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, f) => togglePin(f.properties.GEOID, "tract"));
  }, [geo, projection, set, togglePin]);

  useEffect(() => {
    if (!pathsRef.current) return;
    pathsRef.current.attr("fill", (f) => styleFor(f.properties.GEOID).fill)
      .attr("opacity", (f) => styleFor(f.properties.GEOID).opacity);
  }, [styleFor, geo]);

  // Outline the hovered and pinned tract.
  useEffect(() => {
    if (!pathsRef.current) return;
    const hId = state.hover?.kind === "tract" ? state.hover.id : null;
    const pId = state.pinned?.kind === "tract" ? state.pinned.id : null;
    pathsRef.current
      .attr("stroke", (f) => (f.properties.GEOID === hId || f.properties.GEOID === pId ? "#111" : "#fff"))
      .attr("stroke-width", (f) => (f.properties.GEOID === hId ? 1.6 : f.properties.GEOID === pId ? 1.2 : 0.3));
  }, [state.hover, state.pinned, geo]);

  // Zoom to a borough, or back to all of NYC.
  useEffect(() => {
    const svg = d3.select(ref.current);
    const path = d3.geoPath(projection);
    if (!focusIds) {
      svg.transition().duration(600).call(zoomRef.current.transform, d3.zoomIdentity);
      return;
    }
    const ids = new Set(focusIds);
    const feats = geo.features.filter((f) => ids.has(f.properties.GEOID));
    if (!feats.length) return;
    const [[x0, y0], [x1, y1]] = path.bounds({ type: "FeatureCollection", features: feats });
    const k = Math.min(30, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    svg.transition().duration(750).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-cx, -cy),
    );
  }, [focusIds, geo, projection, width, height]);

  return <svg ref={ref} className="chart map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
    <g ref={gRef} />
  </svg>;
}
