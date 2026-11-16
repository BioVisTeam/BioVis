// Shell: header with the nav, and the active page. Each page is one file in src/tabs/.
import { useEffect, useRef, useState } from "react";
import { QUESTION_TABS } from "./lib/constants.js";
import { useAppState } from "./state/AppState.jsx";
import Landscape from "./components/Landscape.jsx";
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

// Questions menu. Open state is explicit: hover opens after 150ms, click toggles, Escape and
// outside clicks close, choosing an item closes and navigates. The panel touches the word's box.
function QuestionsMenu({ label, current, tab, go }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null), timer = useRef(0);
  const later = (v, ms) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(v), ms); };
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); ref.current?.querySelector(".nav-word")?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const hoverable = (e) => e.pointerType === "mouse";
  return (
    <div className="nav-group" ref={ref}
      onPointerEnter={(e) => hoverable(e) && later(true, 150)}
      onPointerLeave={(e) => hoverable(e) && later(false, 250)}>
      <button className={current ? "nav-word current" : "nav-word"} aria-haspopup="true" aria-expanded={open}
        onClick={() => { clearTimeout(timer.current); setOpen((o) => !o); }}>
        {label}
      </button>
      <div className={open ? "nav-panel open" : "nav-panel"} role="menu"><div className="nav-panel-in">
        {QUESTION_TABS.map((q) => (
          <button key={q.id} role="menuitem" tabIndex={open ? 0 : -1} className={tab === q.id ? "nav-item current" : "nav-item"}
            onClick={() => { clearTimeout(timer.current); setOpen(false); go(q.id); }}>
            <span className="nav-item-q">{q.short}</span>
            <span>{q.label}</span>
          </button>
        ))}
      </div></div>
    </div>
  );
}

export default function App() {
  const { state, set } = useAppState();
  const Page = PAGES[state.tab] || Overview;
  const go = (id) => set({ tab: id, hover: null });
  const inQuestions = state.tab.startsWith("q");
  return (
    <div className="app">
      <div className="bg-scape"><Landscape id="bg" /></div>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap nav-row">
          <button className="brand" onClick={() => go("overview")} aria-label="BioVis, go to Overview">
            BioVis
          </button>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) =>
              n.id === "questions" ? (
                <QuestionsMenu key={n.id} label={n.label} current={inQuestions} tab={state.tab} go={go} />
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
