// AI-use statement (plan.md section 8). The same text is in docs/AI_USE.md.
// Rows marked TO COMPLETE must be filled in by the person named there; they are not guessed.
export default function AiUse() {
  return (
    <article className="prose">
      <h2>AI-use statement (Team 15)</h2>
      <p>
        <strong>Tools and models.</strong> Claude (Anthropic) through Claude Code, model Claude Haiku 5.5 (claude-haiku-5-5),
        used by Pratyush Chatterjee for the app scaffold, the D3 charts, the calculations and the tests in this milestone.
        Nouf Aljomiha and Xinyu Liu: TO COMPLETE with the tool, model and use for your own work.
      </p>
      <p><strong>Where AI was used.</strong></p>
      <ul>
        <li>App shell, data loading, shared state, and the React code for every tab: Claude (Pratyush).</li>
        <li>D3 charts in <code>app/src/charts/</code>: Claude (Pratyush), then reviewed by running the app. A line-by-line review is still to do.</li>
        <li>Calculations in <code>app/src/lib/</code> (quantiles, Spearman, Q5 and Q6 counts): Claude (Pratyush), with tests against the repo tables and plan.md.</li>
        <li>Write-up text in each question tab and in Data &amp; Methods: drafted with Claude, then to be edited by the team.</li>
        <li>Data scripts (<code>scripts/build_web_data.py</code>) and the M2 sketches: TO COMPLETE (team members who built them).</li>
        <li>Planning: <code>plan.md</code> was drafted with Claude and reviewed by the team.</li>
      </ul>
      <p>
        <strong>Manual work.</strong> The choice of questions and units, the decisions in plan.md section 0 (five conditions,
        NYC-only tracts, one small-tract rule, association wording), and the checks of numbers against source files.
      </p>
      <p>
        <strong>How the AI output was checked.</strong> <code>npm test</code> runs ten checks: the Q6 default counts (5,318 US,
        300 NYC at k = 2) and overlap counts against plan.md, the county and tract counts, and the Spearman values in the repo tables.
        The app was run with <code>npm run dev</code> and <code>npm run build</code>. Visual checks in a browser: TO COMPLETE.
      </p>
      <p>
        <strong>Each question tab</strong> ends with a line of this form: "AI assistance: Claude helped write the code and the text; we checked the numbers against the tables."
      </p>
    </article>
  );
}
