// Overview: the main map explorer. Colour by one measure, filter by overall SVI, brush the histogram.
import { useMemo } from "react";
import { CONDITIONS, SVI_MEASURES, MEASURE_LABEL, SMALL_TRACT_ADULTS } from "../lib/constants.js";
import { makeScale } from "../lib/scales.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import Landscape from "../components/Landscape.jsx";
import UsMap from "../../../d3-visualisations/overview/UsMap.jsx";
import Histogram from "../../../d3-visualisations/shared/Histogram.jsx";
import Legend from "../components/Legend.jsx";
import HoverCard from "../components/HoverCard.jsx";
import ViewToggle from "../components/ViewToggle.jsx";

const MEASURES = [...CONDITIONS, ...SVI_MEASURES];
const num = (v) => (v === "" || v == null ? null : +v);

export default function Overview() {
  const data = useData();
  const { state, set } = useAppState();
  const { measure, view, filter, showMissing, flagSmall, brush, stateFilter } = state;
  const isCond = CONDITIONS.some((c) => c.key === measure);
  const unit = isCond ? "%" : "";

  const countyScale = useMemo(() => makeScale(data.counties.map((c) => c[measure])), [data.counties, measure]);
  const usTractScale = useMemo(
    () => makeScale(data.usTracts.filter((t) => !t.small).map((t) => t[measure])),
    [data.usTracts, measure],
  );

  const histValues = useMemo(
    () => (view === "tract" ? data.usTracts.filter((t) => !t.small).map((t) => t[measure]) : data.counties.map((c) => c[measure])),
    [view, data, measure],
  );
  const brushRange = brush && brush.key === measure ? brush.range : null;
  const onBrush = (range) => set({ brush: range ? { key: measure, range } : null });
  const countiesWithEstimates = useMemo(
    () => data.counties.filter((c) => CONDITIONS.some((k) => c[k.key] != null)).length,
    [data.counties],
  );
  const states = useMemo(() => [...new Set(data.counties.map((c) => c.state))].sort(), [data.counties]);

  return (
    <div className="overview">
      <section className="hero">
        <div className="hero-scape"><Landscape id="hero" /></div>
        <div className="hero-copy">
          <h1>Chronic disease and social vulnerability</h1>
          <p className="lead">Explore where chronic disease and social vulnerability meet, from every US county down to census tracts.</p>
          <div className="hero-row">
            <button className="btn-primary" onClick={() => document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Explore the map
            </button>
            <span className="chip"><strong>{countiesWithEstimates.toLocaleString("en-US")}</strong> counties with estimates</span>
            <span className="chip"><strong>{data.nycTracts.length.toLocaleString("en-US")}</strong> NYC tracts</span>
          </div>
        </div>
      </section>

      <section className="intro">
        <p>
          Three questions are answered here: how prevalence differs across US counties (age-adjusted, PLACES 2025),
          how overall social vulnerability (SVI 2022) and its four themes differ across counties, and how NYC tracts
          (crude values) spread inside the boroughs. Each map colours places by five equal-count classes (quintiles) of
          one measure, so colours compare a place's rank within that measure. These are associations, not causes.
        </p>
        <table className="units">
          <thead><tr><th>Question</th><th>Unit</th><th>Geography</th></tr></thead>
          <tbody>
            <tr><td>Q1 Prevalence across counties</td><td>County, age-adjusted</td><td>Whole US</td></tr>
            <tr><td>Q2 Tract spread inside NYC</td><td>Census tract, crude</td><td>NYC's 5 counties</td></tr>
            <tr><td>Q3 Prevalence vs overall SVI</td><td>County</td><td>US, NYC highlighted</td></tr>
            <tr><td>Q4 SVI themes vs prevalence</td><td>County</td><td>US</td></tr>
            <tr><td>Q5 Rate vs affected adults</td><td>Tract, crude (adults estimated)</td><td>NYC</td></tr>
            <tr><td>Q6 Places for closer review</td><td>County (tracts summarised)</td><td>US; NYC tracts drawn</td></tr>
          </tbody>
        </table>
        <p className="how">
          <strong>How to use the map.</strong> Pick a measure to colour by. Brush the histogram to keep only the places in
          a range. Filter by overall SVI to dim places outside a range. Scroll or drag to zoom. Tract outlines load
          automatically when you zoom in (scale 8 or more); Tract level lets you choose: Auto, County only, or Tract
          at any zoom. Hover a place for its values; click a county or tract to pin it, and click it again to unpin.
          Clicking an NYC county opens Q2.
        </p>
      </section>

      <div className="filter-bar">
        <label>Colour by
          <select value={measure} onChange={(e) => set({ measure: e.target.value, brush: null })}>
            {MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <div className="seg-label"><span className="muted">Tract level</span><ViewToggle /></div>
        <label className="check">
          <input type="checkbox" checked={!!filter}
            onChange={(e) => set({ filter: e.target.checked ? { lo: 0.5, hi: 1 } : null })} />
          Filter by overall SVI
        </label>
        {filter && (
          <>
            <label>from <input type="number" step="0.05" min="0" max="1" value={filter.lo}
              onChange={(e) => set({ filter: { ...filter, lo: num(e.target.value) ?? 0 } })} /></label>
            <label>to <input type="number" step="0.05" min="0" max="1" value={filter.hi}
              onChange={(e) => set({ filter: { ...filter, hi: num(e.target.value) ?? 1 } })} /></label>
          </>
        )}
        <label>State
          <select value={stateFilter} onChange={(e) => set({ stateFilter: e.target.value })}>
            <option value="All">All</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={showMissing}
          onChange={(e) => set({ showMissing: e.target.checked })} /> show missing (hatched)</label>
        <label className="check"><input type="checkbox" checked={flagSmall}
          onChange={(e) => set({ flagSmall: e.target.checked })} /> flag tracts under {SMALL_TRACT_ADULTS} adults</label>
      </div>

      <div className="overview-grid" id="map">
        <UsMap countyScale={countyScale} usTractScale={usTractScale} />
        <aside className="side">
          <Legend
            scale={view === "tract" ? usTractScale : countyScale}
            title={`${MEASURE_LABEL[measure]} · ${view === "tract" ? "tracts, crude" : "counties"}`}
            unit={unit}
            note={view === "tract"
              ? `Tract classes come from all US tracts with ${SMALL_TRACT_ADULTS} or more adults. Tracts under ${SMALL_TRACT_ADULTS} adults are hatched white.`
              : "Counties use age-adjusted values. Quintile breaks are computed from the counties with data. Tract outlines, when shown, use their own classes (all US tracts, crude)."}
          />
          <Histogram values={histValues} xLabel={`${MEASURE_LABEL[measure]}${unit}`} brushRange={brushRange} onBrush={onBrush} />
          <HoverCard />
        </aside>
      </div>

      <p className="note">Tract outlines load automatically when you zoom in, for every state. Choose County to turn them off. Tract values are crude (not age-adjusted), so compare them with care and not with the county values.</p>
    </div>
  );
}
