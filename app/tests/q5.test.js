// Q5 quadrant counts must add up to the ranked tracts (small tracts are not ranked).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseTractCsv } from "../src/lib/data.js";
import { q5Summary } from "../src/lib/q5.js";

const here = dirname(fileURLToPath(import.meta.url));
const nyc = parseTractCsv(readFileSync(join(here, "..", "public", "data", "nyc_tracts.csv"), "utf8"));

test("Q5 quadrants add up to the ranked NYC tracts for every condition", () => {
  for (const cond of ["DIABETES", "CHD", "BPHIGH", "OBESITY", "COPD"]) {
    const s = q5Summary(nyc, cond);
    const q = s.quadrants;
    assert.equal(q.highRateManyPeople + q.highRateFewPeople + q.manyPeopleModerateRate + q.neither, s.eligible, cond);
    assert.ok(s.eligible > 2000, `${cond} eligible ${s.eligible}`);
  }
});

test("Q5 diabetes quadrant counts match the app's live numbers", () => {
  const q = q5Summary(nyc, "DIABETES").quadrants;
  assert.equal(q.highRateManyPeople, 97);
  assert.equal(q.highRateFewPeople, 129);
});

test("asthma points come from q5.csv with 11-digit ids", async () => {
  const { parseAsthmaCsv } = await import("../src/lib/q5.js");
  const rows = parseAsthmaCsv(readFileSync(join(here, "..", "public", "data", "q5.csv"), "utf8"));
  assert.ok(rows.every((r) => /^\d{11}$/.test(r.id)));
  assert.ok(rows.filter((r) => !r.small).length > 1000);
});
