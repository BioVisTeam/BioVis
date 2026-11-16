// D3 for review. Used by: Overview. Encodes: US county map with tract view on zoom.
// D3: d3-geo Albers projection and path, d3-zoom (one transform), colour scales, canvas Path2D for tracts. React owns the container; D3 draws inside useEffect.
// ---
// Overview map. Counties are SVG (about 3,100 paths) and zoom with one transform on a group.
// Tracts are drawn on a canvas: a Path2D per tract (built once per state file), redrawn per
// animation frame while zooming, with off-screen tracts skipped. Hover and click on tracts are
// found with a grid index on the tract bounding boxes plus isPointInPath, not DOM events.
// A second canvas holds the hover and pin outlines, so hovering never repaints the tracts.
// Tract level (state.view): auto = tracts at zoom 8 or more, county = never, tract = always.
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { NYC_FIPS, SURFACE, SEAM, HILITE, MISSING, MISSING_LINE, HOVER_W, PIN_W } from "../../app/src/lib/constants.js";
import { FILL_MISSING, FILL_DOTS, FILL_SMALL, ensureDefs } from "../shared/patterns.js";
import { useAppState } from "../../app/src/state/AppState.jsx";
import { useData, useNycGeo, loadStateTracts } from "../../app/src/data/DataProvider.jsx";
import { addOutlines } from "../shared/outline.js";
import ViewToggle from "../../app/src/components/ViewToggle.jsx";

const W = 960, H = 600, S = 2;       // viewBox size and canvas pixels per viewBox unit
const TRACT_ZOOM = 8;
const CELL = 4;                       // grid cell (projected units) for tract hit-testing
const GX = Math.ceil(W / CELL) + 1;

// One canvas pattern per SVG pattern id, drawn at S pixels per unit.
function makePatterns(ctx) {
  const tile = (draw) => {
    const c = document.createElement("canvas"); c.width = c.height = 6 * S;
    const x = c.getContext("2d"); x.scale(S, S); draw(x);
    return ctx.createPattern(c, "repeat");
  };
  const hatch = (bg, line, w) => tile((x) => {
    x.fillStyle = bg; x.fillRect(0, 0, 6, 6); x.strokeStyle = line; x.lineWidth = w;
    x.beginPath(); for (const d of [-6, 0, 6]) { x.moveTo(d, 6); x.lineTo(d + 6, 0); } x.stroke();
  });
  return {
    [FILL_MISSING]: hatch(MISSING, MISSING_LINE, 2),
    [FILL_SMALL]: hatch(SURFACE, "#c9e6e6", 1.6),
    [FILL_DOTS]: tile((x) => { x.fillStyle = SURFACE; x.fillRect(0, 0, 6, 6); x.fillStyle = MISSING_LINE; x.beginPath(); x.arc(3, 3, 1.2, 0, 7); x.fill(); }),
  };
}
const FLAT = { [FILL_MISSING]: MISSING, [FILL_SMALL]: "#c9e6e6", [FILL_DOTS]: SURFACE }; // sub-pixel tracts

// GeoJSON features -> { id, p: Path2D, x0, y0, x1, y1 } in projected units. The GeoJSON is then dropped.
function prep(geo, projection) {
  const out = [];
  for (const f of geo.features) {
    const p = new Path2D();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    const ctx = {
      moveTo(x, y) { grow(x, y); p.moveTo(x, y); }, lineTo(x, y) { grow(x, y); p.lineTo(x, y); },
      closePath() { p.closePath(); }, arc() {}, rect() {},
    };
    d3.geoPath(projection, ctx)(f);
    if (x0 !== Infinity) out.push({ id: f.properties.GEOID, p, x0, y0, x1, y1 });
  }
  return out;
}

const prepared = {}; // fips -> prepared tracts (or null), kept across tab changes so a state is fetched once

export default function UsMap({ countyScale, usTractScale }) {
  const data = useData();
  const { state, set, togglePin } = useAppState();
  const { measure, view: mode, filter, showMissing, flagSmall, brush, pinned, stateFilter } = state;
  const svgRef = useRef(null), gRef = useRef(null), zoomRef = useRef(null);
  const baseRef = useRef(null), overRef = useRef(null);
  const countyPaths = useRef(null), countyEls = useRef(new Map());
  const [t, setT] = useState(d3.zoomIdentity);     // transform when the last gesture ended
  const pending = useRef({});
  const [stateItems, setStateItems] = useState(prepared); // fips -> prepared tracts, or null when the file is missing
  const on = mode === "tract" || (mode === "auto" && t.k >= TRACT_ZOOM);
  const nycGeo = useNycGeo(on);

  const projection = useMemo(() => d3.geoAlbersUsa().fitSize([W, H], data.countyGeo), [data.countyGeo]);
  const nycItems = useMemo(() => (nycGeo ? prep(nycGeo, projection) : null), [nycGeo, projection]);

  // Projected bounds of each county at k = 1, used to find which states are in view.
  const countyBounds = useMemo(() => {
    const path = d3.geoPath(projection);
    return data.countyGeo.features.map((f) => ({ st: f.properties.GEOID.slice(0, 2), b: path.bounds(f) }));
  }, [data.countyGeo, projection]);

  // States in the viewport that need tract files (none when tracts are off).
  const vis = useMemo(() => {
    if (!on) return [];
    const seen = new Set();
    for (const { st, b } of countyBounds) {
      if (b[1][0] * t.k + t.x >= 0 && b[0][0] * t.k + t.x <= W && b[1][1] * t.k + t.y >= 0 && b[0][1] * t.k + t.y <= H) seen.add(st);
    }
    return [...seen].sort();
  }, [on, t, countyBounds]);
  const visKey = vis.join();
  const loadedVis = useMemo(() => vis.filter((f) => stateItems[f]), [visKey, stateItems]); // eslint-disable-line
  const missing = vis.filter((f) => stateItems[f] === null);
  const tractIds = useMemo(() => new Set(loadedVis), [loadedVis]);

  // Lazy-load the tract file of every state in view; a missing file is cached as null.
  useEffect(() => {
    vis.forEach((fp) => {
      if (fp in stateItems || fp in pending.current) return;
      pending.current[fp] = true;
      loadStateTracts(fp).then((g) => {
        prepared[fp] = g ? prep(g, projection) : null;
        setStateItems((m) => ({ ...m, [fp]: prepared[fp] }));
      });
    });
  }, [visKey, stateItems, projection]); // eslint-disable-line

  // Everything the canvas can draw: loaded state files, plus the NYC file until state 36 arrives.
  const items = useMemo(() => {
    if (!on) return [];
    const all = [];
    if (nycItems && !stateItems["36"]) all.push(...nycItems);
    for (const fp of Object.keys(stateItems)) if (stateItems[fp]) all.push(...stateItems[fp]);
    return all;
  }, [on, nycItems, stateItems]);
  // Grid index for hit-testing, and id -> item for pins.
  const index = useMemo(() => {
    const cells = new Map(), byId = new Map();
    for (const it of items) {
      byId.set(it.id, it);
      const cx0 = Math.max(0, Math.floor(it.x0 / CELL)), cx1 = Math.floor(it.x1 / CELL);
      const cy0 = Math.max(0, Math.floor(it.y0 / CELL)), cy1 = Math.floor(it.y1 / CELL);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const k = cy * GX + cx; const a = cells.get(k); if (a) a.push(it); else cells.set(k, [it]);
      }
    }
    return { cells, byId };
  }, [items]);

  // Style per tract, computed once per (measure, filter, brush, missing, small, scale) and cached by id.
  const tractStyle = useMemo(() => {
    const cache = new Map();
    return (id) => {
      let s = cache.get(id);
      if (s) return s;
      const tr = data.usTractById.get(id) || data.nycTractById.get(id);
      if (!tr) s = { fill: showMissing ? FILL_DOTS : SURFACE, opacity: 1 }; // outline without a PLACES estimate
      else {
        const v = tr[measure];
        let op = 1;
        if (filter && (tr.RPL_THEMES == null || tr.RPL_THEMES < filter.lo || tr.RPL_THEMES > filter.hi)) op = 0.15;
        if (brush && brush.key === measure && (v == null || v < brush.range[0] || v > brush.range[1])) op = 0.15;
        if (flagSmall && tr.small) s = { fill: FILL_SMALL, opacity: op };
        else if (v == null) s = { fill: showMissing ? FILL_DOTS : SURFACE, opacity: op };
        else s = { fill: usTractScale.fill(v), opacity: op };
      }
      cache.set(id, s);
      return s;
    };
  }, [data.nycTractById, data.usTractById, measure, filter, brush, flagSmall, showMissing, usTractScale]);

  // ---- canvas drawing (reads refs only, so hover never goes through React renders) ----
  const live = useRef({});
  live.current = { items, index, tractStyle, on, pinned };
  const tRef = useRef(d3.zoomIdentity), hoverRef = useRef(null), patRef = useRef(null);
  const rafRef = useRef(0), needBase = useRef(false), moving = useRef(false);

  const drawOverlay = () => {
    const c = overRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    const { on, index, pinned } = live.current; if (!on) return;
    const tr = tRef.current, k = tr.k;
    ctx.setTransform(S * k, 0, 0, S * k, S * tr.x, S * tr.y);
    ctx.strokeStyle = HILITE; ctx.lineJoin = "round";
    const unit = W / (c.clientWidth || W) / k; // one CSS pixel in projected units
    const hov = hoverRef.current?.kind === "tract" ? hoverRef.current.id : null;
    const pin = pinned?.kind === "tract" ? pinned.id : null;
    for (const [id, w] of [[hov, HOVER_W], [pin, PIN_W]]) {
      const it = id && index.byId.get(id);
      if (!it) continue;
      ctx.lineWidth = w * unit;
      ctx.stroke(it.p);
    }
  };
  const drawBase = () => {
    const c = baseRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
    const { items, tractStyle, on } = live.current; if (!on || !items.length) return;
    const tr = tRef.current, k = tr.k;
    if (!patRef.current) patRef.current = makePatterns(ctx);
    const pm = new DOMMatrix().scale(1 / k); // keep hatch and dots the same size on screen
    for (const p of Object.values(patRef.current)) p.setTransform(pm);
    ctx.setTransform(S * k, 0, 0, S * k, S * tr.x, S * tr.y);
    const vx0 = -tr.x / k, vy0 = -tr.y / k, vx1 = (W - tr.x) / k, vy1 = (H - tr.y) / k;
    const px = 1 / k; // one viewBox unit on screen
    ctx.lineWidth = 0.4 * px; ctx.strokeStyle = SEAM; ctx.lineJoin = "round";
    for (const it of items) {
      if (it.x1 < vx0 || it.x0 > vx1 || it.y1 < vy0 || it.y0 > vy1) continue;
      const st = tractStyle(it.id);
      ctx.globalAlpha = st.opacity;
      const size = Math.max(it.x1 - it.x0, it.y1 - it.y0) * k;
      if (size < 0.8) { // smaller than a pixel: one flat dot
        ctx.fillStyle = FLAT[st.fill] || st.fill;
        ctx.fillRect(it.x0, it.y0, Math.max(px, it.x1 - it.x0), Math.max(px, it.y1 - it.y0));
        continue;
      }
      ctx.fillStyle = patRef.current[st.fill] || st.fill;
      ctx.fill(it.p);
      if (size > 6 && !moving.current) ctx.stroke(it.p); // seams are skipped mid-gesture, redrawn at the end
    }
    ctx.globalAlpha = 1;
  };
  const frame = () => {
    rafRef.current = 0;
    if (needBase.current) { needBase.current = false; drawBase(); }
    drawOverlay();
  };
  const schedule = (base) => {
    if (base) needBase.current = true;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
  };
  useEffect(() => { schedule(true); }, [items, tractStyle, on]); // eslint-disable-line
  useEffect(() => { schedule(false); }, [pinned, index]);        // eslint-disable-line
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }, []);

  // Which tract is under a viewBox point? Candidates come from the grid, then isPointInPath decides.
  const tractAt = (vx, vy) => {
    const { index, on } = live.current; if (!on || !index.cells.size) return null;
    const tr = tRef.current, x = (vx - tr.x) / tr.k, y = (vy - tr.y) / tr.k;
    const cand = index.cells.get(Math.floor(y / CELL) * GX + Math.floor(x / CELL));
    if (!cand) return null;
    const ctx = overRef.current.getContext("2d");
    ctx.setTransform(S * tr.k, 0, 0, S * tr.k, S * tr.x, S * tr.y);
    for (let i = cand.length - 1; i >= 0; i--) {
      const it = cand[i];
      if (x >= it.x0 && x <= it.x1 && y >= it.y0 && y <= it.y1 && ctx.isPointInPath(it.p, S * vx, S * vy)) return it.id;
    }
    return null;
  };
  const toVb = (e) => { const r = svgRef.current.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };

  // ---- county outlines: two overlay paths (hover, pin), see lib/outline.js ----
  const hoverId = useRef(null), pinRef = useRef(null), outlineRef = useRef(null);
  const showOutline = () => outlineRef.current?.(countyEls.current.get(hoverId.current), countyEls.current.get(pinRef.current));
  const hoverCounty = (id) => { hoverId.current = id; showOutline(); };
  const setHover = (id, kind) => {
    const cur = hoverRef.current;
    if ((cur?.id ?? null) === id && (cur?.kind ?? null) === (id ? kind : null)) return;
    hoverRef.current = id ? { id, kind } : null;
    set({ hover: hoverRef.current });
    schedule(false);
  };
  const tractIdsRef = useRef(tractIds); tractIdsRef.current = tractIds;
  const nycItemsRef = useRef(nycItems); nycItemsRef.current = nycItems;
  // A county is covered by tracts when its state file (or, for NYC, the NYC file) is loaded and drawn.
  const covers = (fips) => live.current.on && (tractIdsRef.current.has(fips.slice(0, 2)) || (NYC_FIPS.includes(fips) && !!nycItemsRef.current));

  // Zoom, pan and pointer handling. Runs once; everything it reads is a ref.
  const lastPtr = useRef(null), ptrRaf = useRef(0);
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    ensureDefs(svg);
    const zoom = d3.zoom().scaleExtent([1, 40])
      .on("start", () => { moving.current = true; })
      .on("zoom", (e) => { gRef.current.setAttribute("transform", e.transform); tRef.current = e.transform; schedule(true); })
      .on("end", (e) => { moving.current = false; schedule(true); setT((o) => (o.k === e.transform.k && o.x === e.transform.x && o.y === e.transform.y ? o : e.transform)); })
    zoomRef.current = zoom;
    svg.call(zoom);
    const el = svgRef.current;
    const move = (e) => {
      lastPtr.current = e;
      if (ptrRaf.current) return;
      ptrRaf.current = requestAnimationFrame(() => {
        ptrRaf.current = 0;
        const ev = lastPtr.current; if (!ev || ev.buttons) return;
        const id = tractAt(...toVb(ev));
        if (id) { hoverCounty(null); setHover(id, "tract"); }
        else if (hoverRef.current?.kind === "tract") setHover(null);
      });
    };
    const leave = () => { lastPtr.current = null; if (hoverRef.current?.kind === "tract") setHover(null); };
    // Capture phase: a click on a tract pins the tract and never reaches the county underneath.
    const click = (e) => {
      const id = tractAt(...toVb(e));
      if (id) { e.stopPropagation(); togglePin(id, "tract"); }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("click", click, true);
    return () => {
      svg.on(".zoom", null);
      cancelAnimationFrame(ptrRaf.current); ptrRaf.current = 0;
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); el.removeEventListener("click", click, true);
    };
  }, []); // eslint-disable-line

  // County paths, drawn once per geometry.
  useEffect(() => {
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();
    const path = d3.geoPath(projection);
    countyPaths.current = g.append("g").selectAll("path").data(data.countyGeo.features).join("path")
      .attr("d", path).attr("stroke", SEAM).attr("stroke-width", 0.3).attr("vector-effect", "non-scaling-stroke")
      .on("mouseenter", (e, f) => {
        const id = f.properties.GEOID;
        if (covers(id)) return;
        hoverCounty(id); setHover(id, "county");
      })
      .on("mouseleave", () => { hoverCounty(null); if (hoverRef.current?.kind === "county") setHover(null); })
      .on("click", (e, f) => {
        const id = f.properties.GEOID;
        const c = data.countyById.get(id);
        if (c?.isNyc) set({ pinned: { id, kind: "county" }, tab: "q2", borough: c.borough }); // opens Q2
        else togglePin(id, "county");
      });
    countyEls.current = new Map(countyPaths.current.nodes().map((n) => [n.__data__.properties.GEOID, n]));
    outlineRef.current = addOutlines(g.append("g"));
    showOutline();
  }, [projection, data]); // eslint-disable-line

  // Pinned county outline.
  useEffect(() => {
    pinRef.current = pinned?.kind === "county" ? pinned.id : null;
    showOutline();
  }, [pinned, projection, data]); // eslint-disable-line

  // County fill and opacity.
  const countyStyle = useMemo(() => (fips) => {
    const c = data.countyById.get(fips);
    const v = c ? c[measure] : null;
    let op = 1;
    if (filter && (c?.RPL_THEMES == null || c.RPL_THEMES < filter.lo || c.RPL_THEMES > filter.hi)) op = 0.15;
    if (stateFilter !== "All" && c?.state !== stateFilter) op = 0.15;
    if (brush && brush.key === measure && (v == null || v < brush.range[0] || v > brush.range[1])) op = 0.15;
    if (on && c?.isNyc && nycItems) return { fill: SURFACE, opacity: 0 };
    if (tractIds.has(fips.slice(0, 2))) return { fill: v == null ? SURFACE : countyScale.fill(v), opacity: Math.min(op, 0.18) };
    if (v == null) return { fill: showMissing ? FILL_MISSING : SURFACE, opacity: op };
    return { fill: countyScale.fill(v), opacity: op };
  }, [data.countyById, measure, filter, stateFilter, brush, showMissing, on, nycItems, countyScale, tractIds]);

  useEffect(() => {
    if (!countyPaths.current) return;
    countyPaths.current.attr("fill", (f) => countyStyle(f.properties.GEOID).fill)
      .attr("opacity", (f) => countyStyle(f.properties.GEOID).opacity);
  }, [countyStyle, projection, data]);

  const zoomToNyc = () => {
    const [cx, cy] = projection(d3.geoCentroid({ type: "FeatureCollection", features: data.countyGeo.features.filter((f) => NYC_FIPS.includes(f.properties.GEOID)) }));
    d3.select(svgRef.current).transition().duration(750)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(10).translate(-cx, -cy));
  };
  const resetZoom = () => {
    d3.select(svgRef.current).transition().duration(600).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  const status = mode === "county" ? "Counties only"
    : !on ? "Zoom in (scale 8 or more) to load tracts"
    : loadedVis.length + missing.length < vis.length ? "Loading tract outlines…" : "Tracts shown (crude values)";

  return (
    <div className="map-wrap">
      <div className="map-buttons">
        <button onClick={zoomToNyc}>Zoom to NYC</button>
        <button onClick={resetZoom}>Reset map</button>
        <ViewToggle />
        <span className="muted" aria-live="polite">{status}</span>
      </div>
      {on && missing.length > 0 && <p className="map-note">Tract outlines for this area are not in the build yet.</p>}
      <div className="map-stage">
        <svg ref={svgRef} className="chart map" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label="US county map with zoom. Hatched gray: no estimate.">
          <g ref={gRef} />
        </svg>
        <canvas ref={baseRef} width={W * S} height={H * S} aria-hidden="true" />
        <canvas ref={overRef} width={W * S} height={H * S} aria-hidden="true" />
      </div>
    </div>
  );
}
