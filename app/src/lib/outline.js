// Hover and pin outlines for SVG maps: two overlay paths above the shapes. They take no pointer
// events and never reorder the shapes, so the shape under the mouse is not touched (moving it in the
// DOM makes the browser drop its hover). Returns show(hoverElement, pinnedElement).
import { HILITE, HOVER_W, PIN_W } from "./constants.js";

export function addOutlines(parent) {
  const mk = (w) => parent.append("path").attr("fill", "none").attr("stroke", HILITE).attr("stroke-width", w)
    .attr("stroke-linejoin", "round").attr("vector-effect", "non-scaling-stroke").attr("pointer-events", "none");
  const hov = mk(HOVER_W), pin = mk(PIN_W);
  return (h, p) => { hov.attr("d", h ? h.getAttribute("d") : null); pin.attr("d", p ? p.getAttribute("d") : null); };
}
