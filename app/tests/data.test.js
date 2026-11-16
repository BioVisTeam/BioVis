// Checks the built data files against the counts and correlations in the repo tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as d3 from "d3";
import { parseCountyCsv, parseTractCsv, quintileBreaks, classOf } from "../src/lib/data.js";
import { spearman } from "../src/lib/stats.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = (...p) => join(here, "..", "..", ...p);
const load = (f) => readFileSync(repo("app", "public", "data", f), "utf8");
const counties = parseCountyCsv(load("county.csv"));
const nyc = parseTractCsv(load("nyc_tracts.csv"));

test("counties: 3,144 rows, 2,956 with diabetes estimates; Loving TX missing", () => {
  assert.equal(counties.length, 3144);
  assert.equal(counties.filter((c) => c.DIABETES != null).length, 2956);
  const loving = counties.find((c) => c.fips === "48301");
  assert.equal(loving.DIABETES, null, "missing is null, not zero");
});

test("NYC tracts: 2,231 with estimates, 21 small", () => {
  assert.equal(nyc.length, 2231);
  assert.equal(nyc.filter((t) => t.small).length, 21);
});

test("diabetes county quintile breaks bracket the plan's median 10.7", () => {
  const v = counties.map((c) => c.DIABETES);
  const b = quintileBreaks(v);
  assert.equal(b.length, 4);
  assert.ok(b[1] < 10.7 && 10.7 < b[2], `breaks ${b}`);
  assert.equal(classOf(null, b), -1, "missing gets no class");
});

test("Spearman rho of overall SVI vs diabetes matches q3_national_summary.csv", () => {
  const pairs = counties.filter((c) => c.DIABETES != null && c.RPL_THEMES != null);
  const r = spearman(pairs.map((c) => c.RPL_THEMES), pairs.map((c) => c.DIABETES));
  assert.ok(Math.abs(r - 0.751382143) < 1e-6, `rho=${r}`);
});

test("Spearman rho of Theme 1 vs diabetes matches q4_correlations.csv", () => {
  const pairs = counties.filter((c) => c.DIABETES != null && c.RPL_THEME1 != null);
  const r = spearman(pairs.map((c) => c.RPL_THEME1), pairs.map((c) => c.DIABETES));
  assert.ok(Math.abs(r - 0.785864984) < 1e-6, `rho=${r}`);
});

test("d3 quantile sorts its input (guards the Q2 class breaks)", () => {
  assert.equal(d3.quantile([5, 1, 3], 0.5), 3);
});
