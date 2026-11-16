// One shared state for every view (plan.md section 3). Hover, brush, condition and
// Q6 settings live here, so a change in one view updates the others.
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const INITIAL = {
  tab: "overview",
  cond: "DIABETES",        // shared condition for Q1, Q2, Q3, Q5, Q6
  measure: "DIABETES",     // Overview "colour by" measure
  view: "county",          // Overview: county | tract
  filter: null,            // Overview filter by overall SVI: { lo, hi } or null
  stateFilter: "All",      // Overview: dims counties outside one state
  showMissing: true,
  flagSmall: true,
  brush: null,             // { key, range: [lo, hi] } from a histogram or box-plot brush
  hover: null,             // { id, kind: "county" | "tract" }
  pinned: null,            // { id, kind } pinned by a click
  borough: null,           // Q2 borough selected by click
  scatterX: "RPL_THEME1",  // Q4 cell click sets the theme on the scatter x-axis
  q6: { cond: "DIABETES", X: 10, k: 2, scope: "US" }, // X is a percentage (1 to 25)
};

const Ctx = createContext(null);

export function StateProvider({ children }) {
  const [state, setState] = useState(INITIAL);
  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  // Click a place to pin it; click the same place again to unpin.
  const togglePin = useCallback((id, kind) => setState((s) => ({ ...s, pinned: s.pinned?.id === id ? null : { id, kind } })), []);
  const setQ6 = useCallback((patch) => setState((s) => ({ ...s, q6: { ...s.q6, ...patch } })), []);
  const value = useMemo(() => ({ state, set, setQ6, togglePin }), [state, set, setQ6, togglePin]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAppState = () => useContext(Ctx);
