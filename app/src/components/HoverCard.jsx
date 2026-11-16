// Shows the hovered place, or the pinned one when nothing is hovered. `kinds` lists what the page
// shows ("county", "tract"); a pin of another kind is ignored. nycOnly: tract pins must be NYC tracts.
import { CONDITIONS, COND_LABEL, SVI_MEASURES, THEME_SHORT, SMALL_TRACT_ADULTS } from "../lib/constants.js";
import { ci, fmt1, fmt2, fmtInt } from "../lib/format.js";
import { useAppState } from "../state/AppState.jsx";
import { useData } from "../data/DataProvider.jsx";

export default function HoverCard({ kinds = ["county", "tract"], nycOnly = false }) {
  const { state } = useAppState();
  const data = useData();
  const p = state.pinned;
  const pin = p && kinds.includes(p.kind) && !(nycOnly && p.kind === "tract" && !data.nycTractById.has(p.id)) ? p : null;
  const target = state.hover || pin;
  const pinnedNote = !state.hover && pin
    ? <p className="card-pinned">Pinned. Click the place again to unpin.</p>
    : null;
  if (!target) {
    const what = kinds.length > 1 ? "place" : kinds[0];
    return <div className="card muted">Hover a {what} to see its values. Click a {kinds.length > 1 ? "county or tract" : kinds[0]} to pin it; click it again to unpin.</div>;
  }

  if (target.kind === "county") {
    const c = data.countyById.get(target.id);
    if (!c) return null;
    return (
      <div className="card">
        {pinnedNote}
        <div className="card-title">{c.county} County, {c.state}{c.borough ? ` (NYC: ${c.borough})` : ""}</div>
        {CONDITIONS.map((m) => (
          <div className="card-row" key={m.key}>
            <span>{m.label}</span>
            <span>
              {c[m.key] == null ? "no estimate" : `${fmt1(c[m.key])}%`}
              {c[m.key] != null && <small> {ci(c[`${m.key}_lo`], c[`${m.key}_hi`])}</small>}
            </span>
          </div>
        ))}
        <div className="card-row"><span>Adults 18+</span><span>{fmtInt(c.pop18plus)}</span></div>
        <div className="card-row"><span>Overall SVI</span><span>{fmt2(c.RPL_THEMES)}</span></div>
        {["RPL_THEME1", "RPL_THEME2", "RPL_THEME3", "RPL_THEME4"].map((k) => (
          <div className="card-row small" key={k}><span>{THEME_SHORT[k]}</span><span>{fmt2(c[k])}</span></div>
        ))}
        <p className="card-note">Age-adjusted values. Missing means no PLACES estimate, not zero.</p>
      </div>
    );
  }

  const t = data.nycTractById.get(target.id) || data.usTractById.get(target.id);
  if (!t) return null;
  const v = t[state.cond];
  const county = t[`${state.cond}_county`];
  return (
    <div className="card">
        {pinnedNote}
      <div className="card-title">Tract {t.id}{t.borough ? `, ${t.borough}` : ""}</div>
      <div className="card-row">
        <span>{COND_LABEL[state.cond]} (crude)</span>
        <span>{v == null ? "no estimate" : `${fmt1(v)}%`}</span>
      </div>
      {v != null && <div className="card-row small"><span>95% CI</span><span>{ci(t[`${state.cond}_lo`], t[`${state.cond}_hi`])}</span></div>}
      <div className="card-row"><span>Adults 18+</span><span>{fmtInt(t.pop18plus)}</span></div>
      {t.pop18plus < SMALL_TRACT_ADULTS && <div className="card-row warn"><span>Under 500 adults</span><span>excluded from statistics</span></div>}
      {v != null && county != null && (
        <div className="card-row"><span>Difference from county (crude)</span><span>{fmt1(v - county)} points</span></div>
      )}
      <div className="card-row"><span>Overall SVI</span><span>{fmt2(t.RPL_THEMES)}</span></div>
      {SVI_MEASURES.slice(1).map((m) => (
        <div className="card-row small" key={m.key}><span>{THEME_SHORT[m.key]}</span><span>{fmt2(t[m.key])}</span></div>
      ))}
    </div>
  );
}
