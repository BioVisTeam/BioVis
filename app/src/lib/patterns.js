// SVG patterns for "missing is never zero": hatched gray for no estimate (counties),
// dots for no tract estimate, white hatch for tracts under 500 adults.
import { MISSING } from "./constants.js";

export const FILL_MISSING = "url(#hatch-missing)";
export const FILL_DOTS = "url(#dots-missing)";
export const FILL_SMALL = "url(#hatch-small)";

export function ensureDefs(svg) {
  if (!svg.select("defs.biovis-defs").empty()) return;
  const defs = svg.append("defs").attr("class", "biovis-defs");
  const pat = (id) =>
    defs.append("pattern").attr("id", id).attr("patternUnits", "userSpaceOnUse")
      .attr("width", 6).attr("height", 6).attr("patternTransform", "rotate(45)");
  pat("hatch-missing").call((p) => {
    p.append("rect").attr("width", 6).attr("height", 6).attr("fill", MISSING);
    p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", "#7d7c75").attr("stroke-width", 2);
  });
  pat("hatch-small").call((p) => {
    p.append("rect").attr("width", 6).attr("height", 6).attr("fill", "#ffffff");
    p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", "#8a8980").attr("stroke-width", 1.6);
  });
  pat("dots-missing").call((p) => {
    p.append("rect").attr("width", 6).attr("height", 6).attr("fill", "#fcfcfb");
    p.append("circle").attr("cx", 3).attr("cy", 3).attr("r", 1.2).attr("fill", "#7d7c75");
  });
}
