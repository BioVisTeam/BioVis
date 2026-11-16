// Static county choropleth (Albers, Alaska and Hawaii as insets). Used by Q1 maps and the Q6 US map.
// styleFor(fips) returns { fill, opacity }. The hovered and pinned county get an outline.
import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { ensureDefs } from "../lib/patterns.js";
import { useAppState } from "../state/AppState.jsx";

export default function CountyChoro({ geo, styleFor, width = 600, height = 380, ariaLabel, onClick, linked = true }) {
  const ref = useRef(null);
  const pathsRef = useRef(null);
  const { state, set } = useAppState();
  const projection = useMemo(() => d3.geoAlbersUsa().fitSize([width, height], geo), [geo, width, height]);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    ensureDefs(svg);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    const path = d3.geoPath(projection);
    pathsRef.current = svg.append("g").selectAll("path").data(geo.features).join("path")
      .attr("d", path)
      .attr("class", "county")
      .attr("stroke", "#ffffff").attr("stroke-width", 0.3)
      .on("mouseenter", (e, f) => linked && set({ hover: { id: f.properties.GEOID, kind: "county" } }))
      .on("mouseleave", () => linked && set({ hover: null }))
      .on("click", (e, f) => onClick && onClick(f.properties.GEOID));
  }, [geo, projection, width, height, linked, onClick, set]);

  useEffect(() => {
    if (!pathsRef.current) return;
    pathsRef.current
      .attr("fill", (f) => styleFor(f.properties.GEOID).fill)
      .attr("opacity", (f) => styleFor(f.properties.GEOID).opacity);
  }, [styleFor, geo]);

  // Outline the hovered county everywhere it is drawn (no re-projection, just a stroke).
  useEffect(() => {
    if (!pathsRef.current) return;
    const hovered = state.hover?.kind === "county" ? state.hover.id : null;
    const pinned = state.pinned?.kind === "county" ? state.pinned.id : null;
    pathsRef.current
      .attr("stroke", (f) => (f.properties.GEOID === hovered ? "#111" : f.properties.GEOID === pinned ? "#111" : "#ffffff"))
      .attr("stroke-width", (f) => (f.properties.GEOID === hovered ? 1.8 : f.properties.GEOID === pinned ? 1.4 : 0.3));
  }, [state.hover, state.pinned, geo]);

  return <svg ref={ref} className="chart map" role="img" aria-label={ariaLabel} />;
}
