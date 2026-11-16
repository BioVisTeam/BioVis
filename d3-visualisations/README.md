# D3 visualisations (for review)

This folder holds all the D3 chart code of the BioVis dashboard, organised by question. The app in `app/` imports from here (`app/vite.config.js` aliases `d3` and `react` to `app/node_modules` and lets the dev server read this folder).

Every chart follows one pattern: React owns the container element and the state; D3 draws into it inside `useEffect`.

## Index

| Tab | What it shows | File | What D3 does |
|---|---|---|---|
| Overview | US county map, tracts on zoom | `overview/UsMap.jsx` | d3-geo Albers projection and path, d3-zoom (one transform), colour classes, canvas Path2D for tracts |
| Overview, Q1, Q3 | Histogram of a measure, median and p10-p90 band | `shared/Histogram.jsx` | linear scale, `d3.bin`, d3-brush (brush calls `onBrush`) |
| Q1 | County choropleth per condition | `q1/CountyChoro.jsx` | d3-geo projection and path, data join of county paths, hover and pin outlines |
| Q2 | NYC tract choropleth | `q2/TractChoro.jsx` | d3-geo Mercator fitted to the boroughs, data join, zoom to a borough |
| Q2 | Box plots per borough, jittered tract dots | `q2/Boxplots.jsx` | linear scales, quantiles, data joins, d3-brush on the y axis |
| Q3, Q4 | Scatter of two measures, subset highlighted | `shared/Scatter.jsx` | linear scales, data join, symbols |
| Q4 | Theme by condition Spearman correlation heatmap | `q4/CorrHeatmap.jsx` | band scales, diverging colour scale fixed to -1..+1, data join of rects |
| Q5 | NYC tracts: prevalence vs affected adults | `q5/TractScatter.jsx` | linear scales, symbol shape per borough, data join, threshold lines |
| Q6 | Overlap bars (UpSet style) with dot matrix | `q6/OverlapBars.jsx` | band and linear scales, data joins |
| Q6 | US county map and NYC tract map | reuses `q1/CountyChoro.jsx` and `q2/TractChoro.jsx` | as above |

Helpers in `shared/`: `patterns.js` (SVG hatch and dot patterns for missing data), `outline.js` (hover and pin outlines on maps).

## Where the other imports live

These are not moved and stay in `app/src/`: `lib/constants.js` (colours), `lib/data.js`, `lib/scales.js`, `lib/format.js`, `state/AppState.jsx` (shared hover/pin/brush state), `data/DataProvider.jsx` (data loading), and `components/ViewToggle.jsx` (used by the Overview map). The node tests in `app/tests` import only `app/src/lib`.

## Not D3 (left in `app/src/`)

- `components/Legend.jsx`: colour legends, React and HTML.
- Counts, stat cards, hover card, condition pickers, toggles, question layout: React and HTML (`components/`, `tabs/`).
- `components/Landscape.jsx`: decorative background drawn as inline SVG by React.
- Data & Methods and AI use tabs: text only.
