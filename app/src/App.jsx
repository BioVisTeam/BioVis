// Shell: header, tab navigation and the active tab. Each tab is one file in src/tabs/.
import { TABS } from "./lib/constants.js";
import { useAppState } from "./state/AppState.jsx";
import Overview from "./tabs/Overview.jsx";
import Q1 from "./tabs/Q1.jsx";
import Q2 from "./tabs/Q2.jsx";
import Q3 from "./tabs/Q3.jsx";
import Q4 from "./tabs/Q4.jsx";
import Q5 from "./tabs/Q5.jsx";
import Q6 from "./tabs/Q6.jsx";
import Methods from "./tabs/Methods.jsx";
import AiUse from "./tabs/AiUse.jsx";

const PANELS = {
  overview: Overview, q1: Q1, q2: Q2, q3: Q3, q4: Q4, q5: Q5, q6: Q6, methods: Methods, ai: AiUse,
};

export default function App() {
  const { state, set } = useAppState();
  const Panel = PANELS[state.tab] || Overview;
  return (
    <div className="app">
      <header className="site-header">
        <div>
          <h1>Chronic disease and social vulnerability</h1>
          <p className="sub">BioVis · Team 15 · Pratyush Chatterjee, Nouf Aljomiha, Xinyu Liu · Milestone 3 draft</p>
        </div>
      </header>
      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={state.tab === t.id}
            className={state.tab === t.id ? "tab active" : "tab"}
            onClick={() => set({ tab: t.id, hover: null })}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="panel" role="tabpanel">
        <Panel />
      </main>
      <footer className="site-footer">
        Association, not cause. Modeled estimates from CDC PLACES 2025 and CDC/ATSDR SVI 2022. Run locally with
        <code> npm install </code> then <code> npm run dev </code>.
      </footer>
    </div>
  );
}
