# Team 15 — BioVis
Pratyush Chatterjee, Nouf Aljomiha, Xinyu Liu

**Scope check:** Q1–Q4 are much more clearly scoped, and dropping the gap score from the core helps. The report still conflicts about whether Q6 is NYC-only or national tract-level analysis; settle that before expanding the interface.

## Summary

You compare chronic-disease prevalence and social vulnerability using national counties and NYC tract detail, with prevalence-versus-affected-population and threshold comparisons. The PDF contains processed samples and sketches for all six questions, but later Q5/Q6 sections diverge from the opening scope and some of their derived fields remain pending.

## What's working

- The report explicitly addresses the modeled nature of PLACES, overlapping SVI inputs, differing data periods, and association rather than causation.
- Q1/Q2 distinguish age-adjusted county estimates from crude tract comparisons, retain uncertainty, and document missing estimates.
- Q3/Q4 reuse one joined county table and one selected scatterplot; the correlation matrix retains pairwise counts and fixed national coefficients.

## Response to Milestone 1 feedback

1. **Units and responsive scope — partly addressed.** The opening table gives national counties and NYC tracts, with on-demand tract loading. Later Q5/Q6 plans and samples include US-wide tracts, and the linked Q5/Q6 repository documentation explicitly makes Q6 national. The M1 issue is therefore not fully resolved: choose and document one scope per question consistently.
2. **PLACES/SVI overlap and gap score — addressed.** You identify overlapping demographic inputs, explain the interpretive consequence, and remove the gap score from the core. That is a useful response; do not reintroduce it until the six main comparisons work.
3. **Own sketches and data periods — substantially improved, with disclosure to complete.** The PDF provides detailed sketches and real table samples, rather than reusing the earlier synthetic mockups. It states the period mismatch. Add an explicit report-level disclosure of the assistance used to create the current code, analysis, and designs; the repository statements do not replace the required notices in the report.
4. **Association wording and threshold view — partly addressed.** The title and most questions now use association language, and Q6 stays central. Later descriptions of “priority of care” still imply more than an exploratory threshold screen establishes; frame them as places for closer review.

## Points to think through before Milestone 3

### Data handling & understanding

1. **Unify scope, condition set, and formulas.** Q1–Q4 cover diabetes, CHD, high blood pressure, obesity, and COPD; the Q5/Q6 repository notes substitute asthma for obesity. Q5's plan also names ACCESS2 in a generic count formula, while later notes correctly restrict counts to condition measures with suitable denominators. Make the final five measures, geographic scope, and per-measure formulas agree across report, tables, code, and controls.
2. **Do not label summed conditions as unique affected residents.** The Q5 “All” option adds condition counts, so someone with multiple conditions can contribute repeatedly. The repository notes recognize this. Call it condition cases per adult or remove the aggregate; use a single condition to answer the affected-resident question without that ambiguity.
3. **Demonstrate the threshold calculation.** The Q6 sample has blank count/prevalence/SVI flags and criteria_met values, and the repository says these are added later. Show a worked default selection, the eligible denominator, missing-SVI treatment, and how a threshold change updates the count and overlap. Uncomputed flags are not processed selection results.

### Question-by-question feedback

| Question | Data and sketch feedback / next step |
|---|---|
| Q1 National prevalence | County samples, missingness, quintiles, and histograms are well specified. Explain that colors compare ranks within each condition, not equal prevalence across diseases. |
| Q2 NYC variation | Compare crude tract estimates with crude county values as planned. Keep CI/population details and use one small-population exclusion rule consistently. |
| Q3 Overall SVI | The sample/counts and shared scatter design support an association comparison. Retain the modeled-input caveat and clarify that highlighting does not recalculate national correlation. |
| Q4 SVI themes | The 4×5 matrix and pairwise n are clear. Use named themes and numeric labels, and let a cell reveal its underlying county distribution. |
| Q5 Prevalence/count | The scatter supports the single-condition question. Match the conditions and geography to the common scope; correct the meaning of “All” and keep counts explicitly estimated. |
| Q6 Thresholds | The sketch establishes a control layout, but computed default flags and selected-count/overlap results are still needed. Define AND/OR/number-of-criteria logic and handle missing values separately from not selected. |

### Project setup & sharing

- **Repository:** A substantial local copy and question-specific documentation are present. The PDF refers to a submitted repository link without giving a clear URL in its text.
- **Confirmed submitted link and instructor access:** Repository access confirmed for `kimryan0416`.
- **Data access:** Source URLs are supplied in the PDF and linked repository documentation. Replace the literal `BRANCH_NAME` placeholder in the Q5/Q6 Colab URL and provide a working milestone entry point.
- **AI disclosure:** Q3/Q4 documentation names Codex/ChatGPT; Q5/Q6 documentation names Claude for code/writing. A substantive AI-use statement was not found in the submitted PDF. Consolidate the team-wide disclosure, including Q1/Q2 and sketches, and add report notices. This updated description must include which model(s) were used, where they were used, for what purposes, and which works were performed by the AI and which were manual work. Add this disclosure to your README in your project repository too. 

## Recommended design direction

Keep one county map/histogram/scatter selection for Q1/Q3/Q4, with a clear transition to NYC tract detail. If Q6 stays national, explicitly revise the opening scope and test that larger geometry independently; otherwise reuse the NYC layer.

## Optional extension

The gap score remains optional. Resolve the six-question consistency issues first.

## Milestone 3 (Due Nov 16)

Submit a write-up accessible through your GitHub repository, with the team name and members, a brief introduction, and, for each domain question, the question, a working D3 visualization and its code, and an explanation of what it shows. Put clear access and run instructions in the README or an obvious project page. Included interactions should work; basic implementation comes before polish. Organize the views in a readable narrative with clear sections or navigation.

Keep the submitted M2 content as a separate milestone record; do not overwrite it. Include an easily findable AI-use statement, even if none was used. If AI was used, identify the models/tools, where they helped, and how much was AI-assisted versus your own work, with notices in the write-up where appropriate.

Prioritize consistent question scopes/condition names, a working Q6 default calculation, and the shared county dashboard before additional national tract rendering.

## Milestones

*Dates from the M1 feedback; M3 requirements from the M3 assignment.*

| Milestone | Due | Deliverable |
|---|---|---|
| 1. Proposal | Oct 19 | Done |
| 2. Data analysis & sketches | Nov 2 | Done |
| 3. First draft | Nov 16 | Repository-accessible write-up with D3 views, code, findings, and run instructions |
| 4. Second draft | Nov 30 | Complete article: title, introduction, data, questions and findings, conclusion |
| 5. Final submission | Dec 7 | Final notebook or interface, code repository with documentation, team contribution statement |
| Presentation | Dec 11 | 10 minutes + Q&A |
