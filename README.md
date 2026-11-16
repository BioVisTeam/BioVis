# BioVis · Chronic disease and social vulnerability

CDC PLACES (2025 release), CDC/ATSDR SVI (2022) and Census boundaries. Course project for Information Visualization (Team 15: Pratyush Chatterjee, Nouf Aljomiha, Xinyu Liu; professor Claudio Silva).
All questions ask about association, not cause. National views use counties; tract views are only for NYC.

## Milestone 3 — interactive dashboard (React + D3)

**Live site:** [biovisteam.github.io/BioVis](https://biovisteam.github.io/BioVis/)


The dashboard is in [`app/`](app/). Every chart is D3 v7; React handles layout, tabs and shared state. Tabs: Overview (county map explorer), Q1 to Q6, Data & Methods, and AI use.

**Requirements:** Node.js 18 or newer (20 LTS recommended), https://nodejs.org

```
cd app
npm install
npm run dev        # opens http://localhost:5173
npm test           # data and Q6 checks against the repo tables and plan.md
npm run build      # production build in app/dist/
```

The data the app needs is already in `app/public/data/`. To rebuild it, see [`scripts/build_web_data.py`](scripts/build_web_data.py); it reads two large national files in `data/raw_local/`, which is git-ignored (too large for GitHub).

**Data sources (with access):**
- CDC PLACES county: [data.cdc.gov/d/i46a-9kgh](https://data.cdc.gov/d/i46a-9kgh)
- CDC PLACES census tract: [data.cdc.gov/d/yjkw-uj5s](https://data.cdc.gov/d/yjkw-uj5s)
- CDC/ATSDR SVI 2022: [SVI data download](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html)
- Census 2023 cartographic boundaries: [cartographic boundary files](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html)

**Scope:** five conditions everywhere (diabetes, coronary heart disease, high blood pressure, obesity, COPD). County values are age-adjusted; NYC tract values are crude. Q6 selects across US tracts, and its map summarises them by county; NYC tracts are drawn individually. National tract geometry is planned for Milestone 4.

**Where to look:** [Data & Methods](app/src/tabs/Methods.jsx) (sources, rules, PLACES–SVI overlap).

**Milestone record:** Milestone 2 is kept unchanged on the `milestone-2` branch and the tag `m2-submission`. Its PDF and feedback are in [`docs/milestones/m2/`](docs/milestones/m2/).

## Milestone 2 — Q1/Q2

National county variation (Q1) and NYC within-county variation (Q2): processed tables, matplotlib sketches, reproduction steps and checks:
[Q1/Q2 documentation](docs/README_q1_q2.md). Everything runs from the files in this repo (`pip install -r requirements_q1_q2.txt`).

## Milestone 2 — Q3/Q4

County SVI/disease transformations, executed notebook, static data tables, sources, validation and AI disclosure: [Q3/Q4 documentation](docs/README_q3_q4.md).

Open [the executed transformation notebook](notebooks/q3_q4_transformation.ipynb) in [Google Colab](https://colab.research.google.com/github/BioVisTeam/BioVis/blob/main/notebooks/q3_q4_transformation.ipynb).

## Milestone 2 — Q5/Q6

Tract-level views from PLACES 2025 and SVI 2022. Q5 asks whether the NYC tracts with the highest prevalence also have the most affected residents. Q6 asks how the set of places for closer review across the US changes with the criterion (prevalence, affected population, social vulnerability) and the threshold. Initial data tables, sources, validation and AI disclosure: [Q5/Q6 documentation](docs/README_q5_q6.md).

Open [the transformation notebook](notebooks/Question5&6(Transformation&EDA)_.ipynb) in [Google Colab](https://colab.research.google.com/github/BioVisTeam/BioVis/blob/main/notebooks/Question5%266(Transformation%26EDA)_.ipynb).
