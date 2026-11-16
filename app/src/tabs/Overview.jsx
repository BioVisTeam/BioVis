// Overview: the main map explorer. Colour by one measure, filter by overall SVI, brush the histogram.
import { useMemo } from "react";
import { CONDITIONS, SVI_MEASURES, MEASURE_LABEL, SMALL_TRACT_ADULTS } from "../lib/constants.js";
import { makeScale } from "../lib/scales.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";
import UsMap from "../charts/UsMap.jsx";
import Histogram from "../components/Histogram.jsx";
import Legend from "../components/Legend.jsx";
import HoverCard from "../components/HoverCard.jsx";

const MEASURES = [...CONDITIONS, ...SVI_MEASURES];
const num = (v) => (v === "" || v == null ? null : +v);

export default function Overview() {
  const data = useData();
  const { state, set } = useAppState();
  const { measure, view, filter, showMissing, flagSmall, brush, stateFilter } = state;
  const isCond = CONDITIONS.some((c) => c.key === measure);
  const unit = isCond ? "%" : "";

  const countyScale = useMemo(() => makeScale(data.counties.map((c) => c[measure])), [data.counties, measure]);
  const tractPool = useMemo(
    () => data.nycTracts.filter((t) => !t.small).map((t) => t[measure]),
    [data.nycTracts, measure],
  );
  const tractScale = useMemo(() => makeScale(tractPool), [tractPool]);

  const histValues = useMemo(
    () => (view === "tract" ? data.nycTracts.filter((t) => !t.small).map((t) => t[measure]) : data.counties.map((c) => c[measure])),
    [view, data, measure],
  );
  const brushRange = brush && brush.key === measure ? brush.range : null;
  const onBrush = (range) => set({ brush: range ? { key: measure, range } : null });
  const states = useMemo(() => [...new Set(data.counties.map((c) => c.state))].sort(), [data.counties]);

  return (
    <div className="overview">
      <section className="intro">
        <h2>Overview: the county map</h2>
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
          a range. Filter by overall SVI to dim places outside a range. Scroll or drag to zoom; zoom to NYC (scale 8 or
          more) to load tracts, or switch View to Tract. Hover a place for its values; click a county to pin it. Clicking
          an NYC county opens Q2.
        </p>
      </section>

      <div className="filter-bar">
        <label>Colour by
          <select value={measure} onChange={(e) => set({ measure: e.target.value, brush: null })}>
            {MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </label>
        <label>View
          <select value={view} onChange={(e) => set({ view: e.target.value })}>
            <option value="county">County (age-adjusted)</option>
            <option value="tract">Tract, NYC only (crude)</option>
          </select>
        </label>
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

      <div className="overview-grid">
        <UsMap countyScale={countyScale} tractScale={tractScale} />
        <aside className="side">
          <Legend
            scale={view === "tract" ? tractScale : countyScale}
            title={`${MEASURE_LABEL[measure]} · ${view === "tract" ? "NYC tracts, crude" : "counties"}`}
            unit={unit}
            note={view === "tract"
              ? `Tract classes come from NYC tracts with 500 or more adults. Tracts under ${SMALL_TRACT_ADULTS} adults are hatched white.`
              : "Counties use age-adjusted values. Quintile breaks are computed from the counties with data."}
          />
          <Histogram values={histValues} xLabel={`${MEASURE_LABEL[measure]}${unit}`} brushRange={brushRange} onBrush={onBrush} />
          <HoverCard />
        </aside>
      </div>

      <p className="note">Tract data covers NYC only in this draft. National tract geometry is planned for Milestone 4.</p>
    </div>
  );
}
