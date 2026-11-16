// Condition buttons shared by Q1, Q3 and Q5 (the same five conditions everywhere).
import { CONDITIONS } from "../lib/constants.js";
import { useAppState } from "../state/AppState.jsx";

export default function CondPicker() {
  const { state, set } = useAppState();
  return (
    <div className="cond-picker" role="group" aria-label="Condition">
      {CONDITIONS.map((c) => (
        <button key={c.key} className={c.key === state.cond ? "pill active" : "pill"} onClick={() => set({ cond: c.key })}>
          {c.label}
        </button>
      ))}
    </div>
  );
}
