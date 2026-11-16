import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useAppState } from "../../app/src/state/AppState.jsx";

export default function Scatter({ points, sviName, disease, rho, ariaLabel }) {
  const ref = useRef(null);
  const { state, set, togglePin } = useAppState();
  const pinned = state.pinned?.kind === "county" ? state.pinned.id : null;

  useEffect(() => {
    const scatterWidth = 1100;
    const scatterHeight = 610;

    const scatterMargin = {
      top: 95,
      right: 165,
      bottom: 105,
      left: 95
    };

    const scatterInnerWidth =
      scatterWidth - scatterMargin.left - scatterMargin.right;

    const scatterInnerHeight =
      scatterHeight - scatterMargin.top - scatterMargin.bottom;

    const validCounties = points;
    const otherCounties = points.filter(d => !d.nyc);
    const nycCounties = points.filter(d => d.nyc);

    const xAxis = d3.scaleLinear()
      .domain([0, 1])
      .range([0, scatterInnerWidth]);

    const yAxis = d3.scaleLinear()
      .domain([
        d3.min(validCounties, d => d.y) - 1,
        d3.max(validCounties, d => d.y) + 1
      ])
      .nice()
      .range([scatterInnerHeight, 0]);

    const scatterSvg = d3.select(ref.current)
      .call(svg => svg.selectAll("*").remove())
      .attr("width", scatterWidth)
      .attr("height", scatterHeight)
      .attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`);

    const scatterChart = scatterSvg.append("g")
      .attr("transform",
        `translate(${scatterMargin.left}, ${scatterMargin.top})`
      );

    scatterChart.append("rect")
      .attr("width", scatterInnerWidth)
      .attr("height", scatterInnerHeight)
      .attr("fill", "#FAFAFA");

    scatterChart.append("g")
      .attr("transform", `translate(0, ${scatterInnerHeight})`)
      .call(d3.axisBottom(xAxis).ticks(6));

    scatterChart.append("g")
      .call(d3.axisLeft(yAxis));

    scatterChart.append("text")
      .attr("x", scatterInnerWidth / 2)
      .attr("y", -57)
      .attr("text-anchor", "middle")
      .attr("font-size", 21)
      .attr("font-weight", 700)
      .text(`${sviName} vs. ${disease} Prevalence`);

    scatterChart.append("text")
      .attr("x", scatterInnerWidth / 2)
      .attr("y", scatterInnerHeight + 55)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .text(`${sviName} Percentile (0–1)`);

    scatterChart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -scatterInnerHeight / 2)
      .attr("y", -65)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .text(`Age-adjusted ${disease} Prevalence (%)`);

    scatterChart.selectAll("circle.county")
      .data(otherCounties)
      .enter()
      .append("circle")
      .attr("class", "county")
      .attr("cx", d => xAxis(d.x))
      .attr("cy", d => yAxis(d.y))
      .attr("r", 1.6)
      .attr("fill", "#6B7280")
      .attr("opacity", 0.4)
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => set({ hover: { id: d.id, kind: "county" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (event, d) => togglePin(d.id, "county"))
      .append("title")
      .text(d =>
        `${d.county}, ${d.state}
    ${sviName}: ${d.x.toFixed(4)}
    ${disease}: ${d.y.toFixed(1)}%`
      );

    const nycInfo = {
      "36005": {abbr: "BX", full: "Bronx"},
      "36047": {abbr: "BK", full: "Brooklyn"},
      "36061": {abbr: "MN", full: "Manhattan"},
      "36081": {abbr: "QN", full: "Queens"},
      "36085": {abbr: "SI", full: "Staten Island"}
    };

    const nycSymbol = d3.symbol()
      .type(d3.symbolDiamond)
      .size(65);

    const nycMarks = scatterChart.selectAll("path.nyc")
      .data(nycCounties)
      .enter()
      .append("path")
      .attr("class", "nyc")
      .attr("d", nycSymbol)
      .attr("transform", d =>
        `translate(${xAxis(d.x)},${yAxis(d.y)})`
      )
      .attr("fill", "#C61C30")
      .attr("opacity", 0.65)
      .attr("stroke", "none")
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => set({ hover: { id: d.id, kind: "county" } }))
      .on("mouseleave", () => set({ hover: null }))
      .on("click", (event, d) => togglePin(d.id, "county"));

    nycMarks.append("title")
      .text(d =>
        `${nycInfo[d.id].full}
    ${sviName}: ${d.x.toFixed(4)}
    ${disease}: ${d.y.toFixed(1)}%`
      );


    const labels = nycCounties
      .map(d => ({
        x: xAxis(d.x),
        y: yAxis(d.y),
        abbr: nycInfo[d.id].abbr
      }))
      .sort((a, b) => a.y - b.y);

    for (let i = 0; i < labels.length; i++) {
      labels[i].labelX = scatterInnerWidth + 28;

      if (i > 0 && labels[i].y - labels[i - 1].y < 15) {
        labels[i].labelX = labels[i - 1].labelX + 28;
      }
    }

    scatterChart.selectAll("line.nyc-leader")
      .data(labels)
      .enter()
      .append("line")
      .attr("class", "nyc-leader")
      .attr("x1", d => d.x)
      .attr("y1", d => d.y)
      .attr("x2", d => d.labelX - 5)
      .attr("y2", d => d.y)
      .attr("stroke", "#C61C30")
      .attr("stroke-width", 0.7)
      .attr("opacity", 0.5)
      .style("pointer-events", "none");

    scatterChart.selectAll("text.nyc-label")
      .data(labels)
      .enter()
      .append("text")
      .attr("x", d => d.labelX)
      .attr("class", "nyc-label")
      .attr("y", d => d.y)
      .attr("dominant-baseline", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#A61B32")
      .style("pointer-events", "none")
      .text(d => d.abbr);


    const highlighted = scatterChart.append("g")
      .attr("class", "brush-highlights")
      .style("pointer-events", "none");

    highlighted.selectAll("circle")
      .data(points.filter(d => d.highlight && !d.nyc))
      .enter().append("circle")
      .attr("cx", d => xAxis(d.x))
      .attr("cy", d => yAxis(d.y))
      .attr("r", 4)
      .attr("fill", "none")
      .attr("stroke", "#007D83")
      .attr("stroke-width", 1.8);

    highlighted.selectAll("path")
      .data(points.filter(d => d.highlight && d.nyc))
      .enter().append("path")
      .attr("d", d3.symbol().type(d3.symbolDiamond).size(110)())
      .attr("transform", d => `translate(${xAxis(d.x)},${yAxis(d.y)})`)
      .attr("fill", "none")
      .attr("stroke", "#007D83")
      .attr("stroke-width", 1.8);

    scatterChart.append("g")
      .attr("class", "pin-highlight")
      .style("pointer-events", "none")
      .selectAll("path")
      .data(points.filter(d => d.id === pinned))
      .enter().append("path")
      .attr("d", d => d3.symbol().type(d.nyc ? d3.symbolDiamond : d3.symbolCircle).size(150)())
      .attr("transform", d => `translate(${xAxis(d.x)},${yAxis(d.y)})`)
      .attr("fill", "none")
      .attr("stroke", "#0F2742")
      .attr("stroke-width", 2.4);

    scatterChart.append("circle")
      .attr("cx", 16)
      .attr("cy", -22)
      .attr("r", 5)
      .attr("fill", "#6B7280");

    scatterChart.append("text")
      .attr("x", 29)
      .attr("y", -18)
      .attr("font-size", 12)
      .text("Other US counties");

    scatterChart.append("path")
      .attr("d", d3.symbol().type(d3.symbolDiamond).size(65)())
      .attr("transform", "translate(200,-22)")
      .attr("fill", "#C61C30")
      .attr("opacity", 0.65)
      .attr("stroke", "none");

    scatterChart.append("text")
      .attr("x", 215)
      .attr("y", -18)
      .attr("font-size", 12)
      .text("NYC's five counties");

    scatterChart.append("text")
      .attr("x", scatterInnerWidth)
      .attr("y", -18)
      .attr("text-anchor", "end")
      .attr("font-size", 13)
      .attr("font-weight", 700)
      .text(
        `National Spearman ρ = ${rho.toFixed(4)}   |   n = ${validCounties.length.toLocaleString()}`
      );

  }, [points, sviName, disease, rho, pinned, set, togglePin]);

  return (
    <>
      <p className="chart-scroll-hint">Scroll horizontally to see the full chart.</p>
      <div className="observable-scroll" tabIndex={0} role="region" aria-label="County scatterplot; scroll horizontally on small screens">
        <svg ref={ref} className="chart scatter observable-chart" role="img" aria-label={ariaLabel} />
      </div>
    </>
  );
}
