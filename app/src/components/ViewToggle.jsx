// Tract level control: Auto (tracts appear when zoomed in), County (never), Tract (always).
// Reads and writes state.view, so the filter bar and the map frame stay in step.
import { useAppState } from "../state/AppState.jsx";

const OPTIONS = [
  ["auto", "Auto", "Tracts appear when you zoom in"],
  ["county", "County", "Counties only, even when zoomed in"],
  ["tract", "Tract", "Tract outlines at any zoom"],
];

export default function ViewToggle() {
  const { state, set } = useAppState();
  return (
    <div className="seg" role="group" aria-label="Tract level">
      {OPTIONS.map(([key, label, tip]) => (
        <button key={key} type="button" className={`pill${state.view === key ? " active" : ""}`}
          aria-pressed={state.view === key} title={tip} onClick={() => set({ view: key })}>{label}</button>
      ))}
    </div>
  );
}
