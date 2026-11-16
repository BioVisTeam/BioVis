// Overview map: county choropleth with zoom and pan (d3.zoom). Zooming into NYC
// (k >= 8 and the view overlaps the NYC box), or View = Tract, draws NYC tracts on the
// same projection. Paths are never re-projected; zoom only changes one transform.
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { NYC_FIPS, SURFACE } from "../lib/constants.js";
import { FILL_MISSING, FILL_DOTS, FILL_SMALL, ensureDefs } from "../lib/patterns.js";
import { useAppState } from "../state/AppState.jsx";
import { useData, useNycGeo } from "../data/DataProvider.jsx";

const W = 960, H = 600;
const NYC_ZOOM = 8;

export default function UsMap({ countyScale, tractScale }) {
  const data = useData();
  const { state, set } = useAppState();
  const { measure, view, filter, showMissing, flagSmall, brush, hover, pinned, stateFilter } = state;
  const svgRef = useRef(null), gRef = useRef(null), zoomRef = useRef(null);
  const countyPaths = useRef(null), tractPaths = useRef(null);
  const [zoomOn, setZoomOn] = useState(false);
  const showTracts = view === "tract" || zoomOn;
  const nycGeo = useNycGeo(showTracts);

  const projection = useMemo(() => d3.geoAlbersUsa().fitSize([W, H], data.countyGeo), [data.countyGeo]);
  const nycBox = useMemo(() => {
    const feats = data.countyGeo.features.filter((f) => NYC_FIPS.includes(f.properties.GEOID));
    return d3.geoBounds({ type: "FeatureCollection", features: feats });
  }, [data.countyGeo]);
  // NYC box on screen before zoom, used to test whether the view overlaps NYC.
  const nycScreen = useMemo(() => {
    const a = projection(nycBox[0]), b = projection(nycBox[1]);
    return { x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), y0: Math.min(a[1], b[1]), y1: Math.max(a[1], b[1]) };
  }, [projection, nycBox]);

  // Zoom and pan. Runs once; reads the latest state through refs where needed.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    ensureDefs(svg);
    const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", (e) => gRef.current.setAttribute("transform", e.transform))
      .on("end", (e) => {
        const t = e.transform;
        const sx0 = t.k * nycScreen.x0 + t.x, sx1 = t.k * nycScreen.x1 + t.x;
        const sy0 = t.k * nycScreen.y0 + t.y, sy1 = t.k * nycScreen.y1 + t.y;
        const overlaps = sx1 >= 0 && sx0 <= W && sy1 >= 0 && sy0 <= H;
        setZoomOn(t.k >= NYC_ZOOM && overlaps);
      });
    zoomRef.current = zoom;
    svg.call(zoom);
    return () => svg.on(".zoom", null);
  }, [nycScreen]);

  // County and tract paths. Drawn once per geometry, styled below.
  useEffect(() => {
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();
    const path = d3.geoPath(projection);
    countyPaths.current = g.append("g").selectAll("path").data(data.countyGeo.features).join("path")
      .attr("d", path).attr("stroke", "#fff").attr("stroke-width", 0.3).attr("vector-effect", "non-scaling-stroke")
      .on("mouseenter", (e, f) => set({ hover: { id: f.properties.GEOID, kind: "county" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (e, f) => {
        const id = f.properties.GEOID;
        const c = data.countyById.get(id);
        if (c?.isNyc) set({ pinned: { id, kind: "county" }, tab: "q2", borough: c.borough });
        else set({ pinned: { id, kind: "county" } });
      });
    tractPaths.current = g.append("g").attr("class", "tracts");
  }, [projection, data]);

  // Tract outlines are drawn once NYC tract geometry has loaded.
  useEffect(() => {
    if (!nycGeo || !tractPaths.current) return;
    const path = d3.geoPath(projection);
    d3.select(tractPaths.current.node()).selectAll("path").data(nycGeo.features, (f) => f.properties.GEOID).join("path")
      .attr("d", path).attr("stroke", "#fff").attr("stroke-width", 0.2).attr("vector-effect", "non-scaling-stroke")
      .on("mouseenter", (e, f) => set({ hover: { id: f.properties.GEOID, kind: "tract" } }))
      .on("mouseleave", () => set({ hover: null }));
  }, [nycGeo, projection, set]);

  // Styles: fill and opacity only, so brushing and filtering never re-draw paths.
  const countyStyle = useMemo(() => (fips) => {
    const c = data.countyById.get(fips);
    const v = c ? c[measure] : null;
    let op = 1;
    if (filter && (c?.RPL_THEMES == null || c.RPL_THEMES < filter.lo || c.RPL_THEMES > filter.hi)) op = 0.15;
    if (stateFilter !== "All" && c?.state !== stateFilter) op = 0.15;
    if (brush && brush.key === measure && (v == null || v < brush.range[0] || v > brush.range[1])) op = 0.15;
    if (showTracts && c?.isNyc) return { fill: SURFACE, opacity: 0 };
    if (v == null) return { fill: showMissing ? FILL_MISSING : SURFACE, opacity: op };
    return { fill: countyScale.fill(v), opacity: op };
  }, [data.countyById, measure, filter, stateFilter, brush, showMissing, showTracts, countyScale]);

  const tractStyle = useMemo(() => (id) => {
    const t = data.nycTractById.get(id);
    // Outlines with no row in nyc_tracts.csv have no PLACES estimate: dotted gray.
    if (!t) return { fill: showMissing ? FILL_DOTS : SURFACE, opacity: 1 };
    const v = t[measure];
    let op = 1;
    if (filter && (t.RPL_THEMES == null || t.RPL_THEMES < filter.lo || t.RPL_THEMES > filter.hi)) op = 0.15;
    if (brush && brush.key === measure && (v == null || v < brush.range[0] || v > brush.range[1])) op = 0.15;
    if (flagSmall && t.small) return { fill: FILL_SMALL, opacity: op };
    if (v == null) return { fill: showMissing ? FILL_DOTS : SURFACE, opacity: op };
    return { fill: tractScale.fill(v), opacity: op };
  }, [data.nycTractById, measure, filter, brush, flagSmall, showMissing, tractScale]);

  useEffect(() => {
    if (!countyPaths.current) return;
    countyPaths.current.attr("fill", (f) => countyStyle(f.properties.GEOID).fill)
      .attr("opacity", (f) => countyStyle(f.properties.GEOID).opacity);
  }, [countyStyle]);

  useEffect(() => {
    if (!tractPaths.current) return;
    d3.select(tractPaths.current.node()).selectAll("path")
      .attr("fill", (f) => tractStyle(f.properties.GEOID).fill)
      .attr("opacity", (f) => tractStyle(f.properties.GEOID).opacity);
  }, [tractStyle, nycGeo]);

  // Outline the hovered and pinned place on the map.
  useEffect(() => {
    const hId = hover?.kind === "county" ? hover.id : null, pId = pinned?.kind === "county" ? pinned.id : null;
    if (countyPaths.current) {
      countyPaths.current
        .attr("stroke", (f) => (f.properties.GEOID === hId || f.properties.GEOID === pId ? "#111" : "#fff"))
        .attr("stroke-width", (f) => (f.properties.GEOID === hId ? 1.6 : f.properties.GEOID === pId ? 1.2 : 0.3));
    }
    if (tractPaths.current) {
      const tId = hover?.kind === "tract" ? hover.id : null;
      d3.select(tractPaths.current.node()).selectAll("path")
        .attr("stroke", (f) => (f.properties.GEOID === tId ? "#111" : "#fff"))
        .attr("stroke-width", (f) => (f.properties.GEOID === tId ? 1.4 : 0.2));
    }
  }, [hover, pinned, nycGeo]);

  const zoomToNyc = () => {
    const [cx, cy] = projection(d3.geoCentroid({ type: "FeatureCollection", features: data.countyGeo.features.filter((f) => NYC_FIPS.includes(f.properties.GEOID)) }));
    const k = 10;
    d3.select(svgRef.current).transition().duration(750)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-cx, -cy));
  };
  const resetZoom = () => {
    d3.select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="map-wrap">
      <div className="map-buttons">
        <button onClick={zoomToNyc}>Zoom to NYC</button>
        <button onClick={resetZoom}>Reset map</button>
        <span className="muted">
          {showTracts ? "NYC tracts shown (crude values)" : "Zoom to NYC (scale 8 or more) to load tracts"}
        </span>
      </div>
      <svg ref={svgRef} className="chart map" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="US county map with zoom. Hatched gray: no estimate.">
        <g ref={gRef} />
      </svg>
    </div>
  );
}
