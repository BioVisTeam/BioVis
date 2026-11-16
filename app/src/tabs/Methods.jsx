// Data & Methods: sources, units, rules, limitations. Numbers quoted here come from the repo tables.
export default function Methods() {
  return (
    <article className="prose">
      <h1>Data and methods</h1>

      <h3>Sources (with access)</h3>
      <ul>
        <li>CDC PLACES county (2025 release): <a href="https://data.cdc.gov/d/i46a-9kgh">data.cdc.gov/d/i46a-9kgh</a></li>
        <li>CDC PLACES census tract (2025 release): <a href="https://data.cdc.gov/d/yjkw-uj5s">data.cdc.gov/d/yjkw-uj5s</a></li>
        <li>CDC/ATSDR Social Vulnerability Index 2022 (ACS 2018-2022): <a href="https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html">atsdr.cdc.gov SVI data download</a></li>
        <li>Census 2023 cartographic boundary files (counties 20m; census tracts 500k resolution, all states): <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html">census.gov cartographic boundary files</a></li>
      </ul>
      <p>The app's data files (<code>app/public/data/</code>) are built by <code>scripts/build_web_data.py</code> from the two large national files in <code>data/raw_local/</code>, which is not committed (too large for GitHub). The repo's M2 tables live in <code>data/processed/</code>.</p>

      <h3>Units</h3>
      <ul>
        <li>National views are at county level. County prevalence is <strong>age-adjusted</strong>. Tract outlines appear when you zoom in on the Overview map (or with the Tract level control); they are crude, so read them as rough.</li>
        <li>Tract prevalence is <strong>crude</strong>. Never compare a tract value with a county's age-adjusted value; Q2 compares tracts with the county's crude value.</li>
        <li>Q6 selects across US tracts; the map summarises them by county, and individual tracts are drawn for NYC (see Q6).</li>
      </ul>

      <h3>Rules</h3>
      <ul>
        <li><strong>Small tracts:</strong> under 500 adults are flagged (white hatch), kept on the map, and left out of statistics and the Q6 selection. One rule everywhere.</li>
        <li><strong>Missing is never zero.</strong> Kentucky, Pennsylvania and Loving County, TX (no PLACES row) are hatched gray. NYC tracts with no estimate are dotted gray.</li>
        <li><strong>Classes:</strong> equal-count quintiles of the values shown on each map. Breaks are printed under the legend.</li>
        <li><strong>Wording:</strong> association, not cause. Q6 uses "places for closer review".</li>
      </ul>

      <h3>PLACES and SVI overlap</h3>
      <p>
        The PLACES model uses individual age, sex, race/ethnicity and education (BRFSS), county-level share below 150% of the
        federal poverty level (ACS), and state and county random effects. Several SVI factors repeat these inputs:
        below-150% poverty (theme 1), age 65 and over and 17 and under (theme 2), minority status and race/ethnicity groups
        (theme 3), and no high-school diploma (theme 1, related). Factors not in the model include unemployment, housing
        cost burden, no insurance, disability, single-parent households, limited English, and theme 4 (housing and transport).
        So a PLACES-SVI correlation partly restates shared inputs. The text says "associated with", never "explained by".
      </p>

      <h3>Data periods</h3>
      <p>PLACES 2025 release vs SVI 2022 (ACS 2018-2022). This is a limitation and is stated in each question.</p>

      <h3>Statistics</h3>
      <ul>
        <li>Q3 and Q4 use the <strong>Spearman rank correlation</strong> across counties with both values (n = 2,956 for the five conditions). The repo's tables (q3_national_summary.csv, q4_correlations.csv) use the same measure; the app's tests check two of them.</li>
        <li>Q5 cut-offs and quadrant counts use tracts with 500 or more adults.</li>
        <li>Estimated affected adults = crude prevalence × adults 18 and over, unrounded in calculations and rounded when shown.</li>
      </ul>

      <h3>Counts from the build</h3>
      <ul>
        <li>Counties: 3,144 in the boundary file; 2,956 with PLACES estimates. 188 do not: Kentucky 120, Pennsylvania 67 and Loving County, TX.</li>
        <li>US tracts: 83,522 in the PLACES tract file; 4,707 with no estimates (PA 3,408, KY 1,299); 235 with no SVI.</li>
        <li>NYC tracts: 2,324 polygons; 2,231 with estimates (93 dotted gray); 21 under 500 adults; 10 without SVI.</li>
      </ul>

      <h3>Limitations and open items</h3>
      <ul>
        <li>Modeled estimates, not measured counts. Confidence intervals are wide for small tracts.</li>
        <li>The M2 record is kept on the <code>milestone-2</code> branch and tag <code>m2-submission</code>, and the M2 PDF is in <code>docs/milestones/m2/</code>.</li>
      </ul>
    </article>
  );
}
