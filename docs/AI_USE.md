# AI-use statement (Team 15)

This is the full statement. The same text is in the app's AI use tab. Rows marked **TO COMPLETE** must be filled in by the person named; they are not guessed.

**Tools and models.** Claude (Anthropic) through Claude Code, model Claude Haiku 5.5 (`claude-haiku-5-5`), used by Pratyush Chatterjee for the Milestone 3 app scaffold, D3 charts, calculations and tests. Nouf Aljomiha and Xinyu Liu: **TO COMPLETE** with the tool, model and use for your own work (Q5/Q6 and Q3/Q4 documentation names Claude and Codex/ChatGPT respectively; confirm).

**Where AI was used**
- App shell, data loading, shared state and the React code for every tab: Claude (Pratyush).
- D3 charts in `app/src/charts/`: Claude (Pratyush). Run in a browser and checked for errors; a line-by-line code review is still to do.
- Calculations in `app/src/lib/` (quantiles, Spearman, Q5 quadrants, Q6 selection): Claude (Pratyush), with tests against the repo tables and `plan.md`.
- Write-up text in each question tab and in Data & Methods: drafted with Claude, to be edited by the team.
- Data scripts (`scripts/build_web_data.py`) and the Milestone 2 sketches: **TO COMPLETE** (team members who built them).
- Planning: `plan.md` was drafted with Claude and reviewed by the team.

**Manual work.** The choice of questions and units; the decisions in `plan.md` section 0 (five conditions, NYC-only tracts at tract level, one small-tract rule of 500 adults, association wording); checking numbers against source files.

**How the AI output was checked.** `npm test` runs the data and Q6 checks: the Q6 default counts (5,318 US and 300 NYC at k = 2) and overlap counts against `plan.md`; county and tract counts; Spearman values in the repo tables; Q5 quadrant totals. The production build and a headless browser run of every tab found no errors. Visual review of each tab on a second laptop: **TO COMPLETE**.

**Each question tab** ends with an AI notice naming what Claude wrote and what still needs checking.
