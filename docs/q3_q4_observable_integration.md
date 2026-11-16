# Q3/Q4 Observable integration and validation

The charts were adapted from Xinyu Liu's supplied `017c96d6d00c9f53.js` export of [Milestone 3: First Draft](https://observablehq.com/@xinyu-liu3/milestone-3-first-draft). The preprocessing, selectors, correlation table, scatterplot and heatmap cells were inspected. The public JavaScript endpoint initially exposed only the notebook heading, so implementation began after the author supplied the full export and its CSV attachment.

Source export SHA-256: `17aa3ccc717b6d90c37da505981d6a4bc94feec47266235aa5ec46da77748dff`.

Attachment `q3_county_svi.csv` SHA-256: `b2948a1266fc50749f15468e4cf528f852431cda77aa4cbe127d2b2a80bffa6e`.

The supplied attachment and the existing website county data have identical SVI and disease values for all 3,144 FIPS rows. All 25 disease/SVI combinations contain 2,956 valid counties, including all five NYC counties. No dataset, data loader, correlation table, dependency or lockfile was changed.

The notebook's scatter dimensions, margins, scales, padded y-domain, axes, title, legend, gray circle styling, red diamond styling and horizontal leader lines were retained in `d3-visualisations/shared/Scatter.jsx`. NYC abbreviations use a middle baseline at the diamond's exact y-coordinate. Nearby labels move right in 28-unit steps, as in the notebook, without vertical movement. Native county tooltips are retained, alongside the dashboard hover card and pinning.

The heatmap retains the notebook's band scales, full theme names, disease labels, four-decimal numbers, selected-cell outline and legend. Its fixed color scale is `[-1, 0, 1]` mapped to `#2166AC`, `#F7F7F7`, `#B2182B`. The negative COPD/theme-3 coefficient displays as `-0.0164`, with the near-neutral fill `rgb(243, 245, 246)`.

React continues to own shared state. Q3's SVI selector and Q4 cell clicks use `scatterX`; disease selections use `cond`. Q3 initially shows overall SVI. Q4 initially uses theme 1 when the shared selection is overall SVI, retaining a selected cell in its four-theme matrix; choosing a cell sets the shared theme and condition for both views. Both tabs render the same shared Scatter component. National correlations use the existing full-sample Spearman calculation and reproduce every notebook coefficient at four decimal places. Hover, pins and brushes do not enter that calculation.

Histogram brushing keeps all county marks at their original opacity and adds hollow teal highlights above the NYC marks. Pins use a separate dark outline. No hover dimming is applied. The existing Q1 histogram and its shared brush state are retained. Chart styles and layout changes target Q3/Q4 only. At narrow widths, chart containers scroll horizontally with a visible hint; SVG text remains inside its original viewBox rather than shrinking into unreadable labels.

Validation on 2026-11-16:

| Check | Result |
| --- | --- |
| `npm test` | 15 passed, 0 failed, including all existing checks and three new Q3/Q4 data regressions |
| `npm run build` | Passed |
| `GITHUB_ACTIONS=true npm run build` | Passed; generated asset paths use `/BioVis/` |
| Chrome at 1440 px | All 25 Q3 selections checked; all 20 Q4 cells clicked |
| Chrome at 768 and 390 px | All 20 Q4 cells clicked at each width; all five Q3 diseases checked |
| County observations | 2,951 gray circles plus five NYC diamonds for every selection |
| NYC labels and leader lines | Five correct abbreviations, exact y alignment, only horizontal lines, no label collisions or SVG text clipping |
| Heatmap values | All 20 values match the export and recomputed county correlations |
| Selection interactions | Cell clicks and keyboard activation update the scatter, its correlation and its selected outline; Q3 reflects the shared selection |
| Hover, pinning and brushing | Actual mouse hover, clicks and histogram drag checked; Q1/Q3 brush sharing checked; national correlation unchanged |
| Overlapping marks | Brushed circles near NYC remain identifiable; highlight layer is above diamonds and does not intercept pointer events |
| Narrow layout | All NYC labels accessible by horizontal scrolling; no page-level horizontal overflow |
| Runtime errors | None during Q3/Q4 checks or ordinary Q1/Q2/Q5/Q6 navigation after map animations finish |
| Scope | Q1/Q2/Q5/Q6 source, navigation, processed data and frozen Milestone 2 records unchanged |

An initial broad browser run failed its no-runtime-errors assertion when rapidly switching from Q2 to Q5 before Q2's zoom animation completed. The same `Cannot read properties of null (reading 'setAttribute')` error was reproduced in a separate, unchanged checkout of `main` at `25fe20a`, with the stack pointing to `d3-visualisations/q2/TractChoro.jsx`. Q2 was left unchanged as requested. The final ordinary-navigation smoke check allowed animations to finish and passed. The rapid-navigation issue remains outside this PR.

`README.md` and `d3-visualisations/README.md` were read before edits. `Repo.md` is absent from the checked-out main branch.
