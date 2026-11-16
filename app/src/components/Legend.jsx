// Class breaks are printed under every map, as the M2 sketches do.
import { BLUES } from "../lib/constants.js";
import { fmt1 } from "../lib/format.js";

export default function Legend({ scale, title, unit = "%", note, missingLabel = "No estimate", fmt = fmt1 }) {
  if (!scale) return null;
  const ranges = scale.ranges();
  return (
    <div className="legend">
      <div className="legend-title">{title}</div>
      {ranges.map(([lo, hi], i) => (
        <div className="legend-row" key={i}>
          <span className="swatch" style={{ background: BLUES[i] }} />
          {fmt(lo)} to {fmt(hi)}{unit}
        </div>
      ))}
      <div className="legend-row">
        <span className="swatch hatched" /> {missingLabel}
      </div>
      {note && <p className="legend-note">{note}</p>}
    </div>
  );
}
