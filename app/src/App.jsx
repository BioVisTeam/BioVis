// Shell: header with the nav, and the active page. Each page is one file in src/tabs/.
import { QUESTION_TABS } from "./lib/constants.js";
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

const PAGES = {
  overview: Overview, q1: Q1, q2: Q2, q3: Q3, q4: Q4, q5: Q5, q6: Q6, methods: Methods, ai: AiUse,
};
const NAV = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Questions" },
  { id: "methods", label: "Data & Methods" },
  { id: "ai", label: "AI use" },
];

export default function App() {
  const { state, set } = useAppState();
  const Page = PAGES[state.tab] || Overview;
  const go = (id) => set({ tab: id, hover: null });
  const inQuestions = state.tab.startsWith("q");
  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap nav-row">
          <button className="brand" onClick={() => go("overview")} aria-label="BioVis, go to Overview">
            BioVis
          </button>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) =>
              n.id === "questions" ? (
                <div className="nav-group" key={n.id}>
                  <button className={inQuestions ? "nav-word current" : "nav-word"} aria-haspopup="true">
                    {n.label}
                  </button>
                  <div className="nav-panel" role="menu">
                    {QUESTION_TABS.map((q) => (
                      <button key={q.id} role="menuitem" className={state.tab === q.id ? "nav-item current" : "nav-item"}
                        onClick={() => go(q.id)}>
                        <span className="nav-item-q">{q.short}</span>
                        <span>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button key={n.id} className={state.tab === n.id ? "nav-word current" : "nav-word"}
                  aria-current={state.tab === n.id ? "page" : undefined} onClick={() => go(n.id)}>
                  {n.label}
                </button>
              ),
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="page">
        <div className="wrap">
          <Page />
        </div>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <p>
            Associations, not causes. Modeled estimates from CDC PLACES 2025 and CDC/ATSDR SVI 2022.
            Run locally with <code>npm install</code>, then <code>npm run dev</code>.
          </p>
        </div>
      </footer>
    </div>
  );
}
