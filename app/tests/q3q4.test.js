import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as d3 from "d3";
import { parseCountyCsv } from "../src/lib/data.js";
import { spearman } from "../src/lib/stats.js";
import { Q3Q4_CONDITIONS, SVI_NAMES, THEMES } from "../src/lib/q3q4.js";

const counties = parseCountyCsv(readFileSync(new URL("../public/data/county.csv", import.meta.url), "utf8"));
const correlations = d3.csvParse(readFileSync(new URL("../public/data/q4_correlations.csv", import.meta.url), "utf8"));
const overall = ["0.7514", "0.6188", "0.6000", "0.3408", "0.4964"];
const matrix = [
  ["0.7859", "0.7088", "0.6641", "0.3753", "0.6155"],
  ["0.5555", "0.4764", "0.4421", "0.3321", "0.3852"],
  ["0.5081", "0.1626", "0.3100", "0.0691", "-0.0164"],
  ["0.4278", "0.3545", "0.3241", "0.1679", "0.2685"],
];

test("all 25 notebook selections contain 2,956 finite county pairs and all five NYC counties", () => {
  for (const svi of Object.keys(SVI_NAMES)) {
    for (const { key } of Q3Q4_CONDITIONS) {
      const pairs = counties.filter(c => Number.isFinite(c[svi]) && Number.isFinite(c[key]));
      assert.equal(pairs.length, 2956, `${svi}, ${key}`);
      assert.equal(new Set(pairs.map(c => c.fips)).size, 2956);
      assert.equal(pairs.filter(c => c.isNyc).length, 5);
      assert.ok(pairs.every(c => c[svi] >= 0 && c[svi] <= 1));
    }
  }
});

test("all five overall SVI correlations reproduce the notebook at four decimals", () => {
  Q3Q4_CONDITIONS.forEach(({ key }, i) => {
    const pairs = counties.filter(c => Number.isFinite(c.RPL_THEMES) && Number.isFinite(c[key]));
    assert.equal(spearman(pairs.map(c => c.RPL_THEMES), pairs.map(c => c[key])).toFixed(4), overall[i]);
  });
});

test("all 20 heatmap coefficients match both the notebook and the county scatter data", () => {
  assert.equal(correlations.length, 20);
  THEMES.forEach(({ key: svi }, i) => {
    Q3Q4_CONDITIONS.forEach(({ key }, j) => {
      const matches = correlations.filter(r => r.theme === svi && r.disease === key);
      assert.equal(matches.length, 1);
      assert.equal(+matches[0].n_counties, 2956);
      assert.equal((+matches[0].correlation).toFixed(4), matrix[i][j]);
      const pairs = counties.filter(c => Number.isFinite(c[svi]) && Number.isFinite(c[key]));
      const rho = spearman(pairs.map(c => c[svi]), pairs.map(c => c[key]));
      assert.ok(Math.abs(rho - +matches[0].correlation) < 1e-9);
      assert.equal(rho.toFixed(4), matrix[i][j]);
    });
  });
});
