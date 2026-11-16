// Checks the Q6 worked default against plan.md section 6 (diabetes, X = 10%, k = 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseTractCsv } from "../src/lib/data.js";
import { q6Compute } from "../src/lib/q6.js";

const here = dirname(fileURLToPath(import.meta.url));
const load = (f) => readFileSync(join(here, "..", "public", "data", f), "utf8");
const us = parseTractCsv(load("us_tracts.csv"));
const nyc = parseTractCsv(load("nyc_tracts.csv"));
const isNycId = (id) => id.startsWith("36") && ["005", "047", "061", "081", "085"].includes(id.slice(2, 5));

test("US default counts match plan.md", () => {
  assert.equal(us.length, 83522);
  const r = q6Compute(us, "DIABETES", 0.1, 2);
  assert.equal(r.eligible, 78615);
  assert.equal(r.excluded, 4907);
  assert.equal(r.sviMissing, 179);
  assert.equal(r.selected, 5318);
  assert.ok(Math.abs(r.cutoffs.prevalence - 17.5) < 0.05, `prev cutoff ${r.cutoffs.prevalence}`);
  assert.ok(Math.abs(r.cutoffs.adults - 586) < 1, `adult cutoff ${r.cutoffs.adults}`);
  assert.ok(Math.abs(r.cutoffs.svi - 0.9) < 1e-9);
});

test("US single-criterion and overlap counts match plan.md", () => {
  const r1 = q6Compute(us, "DIABETES", 0.1, 1);
  assert.equal(r1.selected, 17433, "OR (k=1)");
  const r3 = q6Compute(us, "DIABETES", 0.1, 3);
  assert.equal(r3.selected, 1191, "AND (k=3)");
  const o = r1.overlap;
  assert.deepEqual(
    { S: o.S, C: o.C, P: o.P, CS: o.CS, PS: o.PS, PC: o.PC, PCS: o.PCS },
    { S: 3714, C: 4767, P: 3634, CS: 960, PS: 2223, PC: 944, PCS: 1191 },
  );
});

test("NYC default counts match plan.md (same national cutoffs)", () => {
  assert.equal(nyc.length, 2231);
  const r = q6Compute(us, "DIABETES", 0.1, 2);
  const nycSelected = [...r.state].filter(([id, s]) => isNycId(id) && s === "selected").length;
  const nycEligible = [...r.state].filter(([id, s]) => isNycId(id) && s !== "not eligible").length;
  assert.equal(nycEligible, 2210);
  assert.equal(nycSelected, 300);
});

test("threshold change updates the count", () => {
  const a = q6Compute(us, "CHD", 0.05, 2).selected;
  const b = q6Compute(us, "CHD", 0.25, 2).selected;
  assert.ok(b > a, "wider threshold selects more tracts");
});
