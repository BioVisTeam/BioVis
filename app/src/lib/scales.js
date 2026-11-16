// Colour scales: five equal-count classes (quintiles) per measure, as in the M2 sketches.
import * as d3 from "d3";
import { BLUES } from "./constants.js";
import { quintileBreaks } from "./data.js";

export function makeScale(values) {
  const v = values.filter((x) => x != null && !Number.isNaN(x));
  const breaks = quintileBreaks(v);
  const color = d3.scaleThreshold().domain(breaks).range(BLUES);
  return {
    breaks,
    min: d3.min(v),
    max: d3.max(v),
    fill: (x) => (x == null || Number.isNaN(x) ? null : color(x)),
    // Printed under legends: the five class ranges.
    ranges() {
      const edges = [this.min, ...breaks, this.max];
      return edges.slice(0, -1).map((lo, i) => [lo, edges[i + 1]]);
    },
  };
}
