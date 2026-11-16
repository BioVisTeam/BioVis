import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function CorrHeatmap({ rows, cols, valueOf, selected, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    const heatWidth = 1030;
    const heatHeight = 660;

    const heatMargin = {
      top: 115,
      right: 75,
      bottom: 190,
      left: 285
    };

    const heatInnerWidth =
      heatWidth - heatMargin.left - heatMargin.right;

    const heatInnerHeight =
      heatHeight - heatMargin.top - heatMargin.bottom;

    const xHeat = d3.scaleBand()
      .domain(cols.map(d => d.key))
      .range([0, heatInnerWidth])
      .padding(0.07);

    const yHeat = d3.scaleBand()
      .domain(rows.map(d => d.key))
      .range([0, heatInnerHeight])
      .padding(0.09);

    const heatColor = d3.scaleLinear()
      .domain([-1, 0, 1])
      .range(["#2166AC", "#F7F7F7", "#B2182B"])
      .clamp(true);

    const heatSvg = d3.select(ref.current)
      .call(svg => svg.selectAll("*").remove())
      .attr("width", heatWidth)
      .attr("height", heatHeight)
      .attr("viewBox", `0 0 ${heatWidth} ${heatHeight}`);

    const heatChart = heatSvg.append("g")
      .attr("transform",
        `translate(${heatMargin.left}, ${heatMargin.top})`
      );

    heatSvg.append("text")
      .attr("x", heatWidth / 2)
      .attr("y", 42)
      .attr("text-anchor", "middle")
      .attr("font-size", 18)
      .attr("font-weight", 700)
      .text("Spearman Correlations Between SVI Themes and Chronic Disease Prevalence");

    heatChart.selectAll("text.disease")
      .data(cols.map(d => d.key))
      .enter()
      .append("text")
      .attr("class", "disease")
      .attr("x", d => xHeat(d) + xHeat.bandwidth() / 2)
      .attr("y", -18)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text(d => cols.find(c => c.key === d).label);

    heatChart.selectAll("text.theme")
      .data(rows)
      .enter()
      .append("text")
      .attr("class", "theme")
      .attr("x", -14)
      .attr("y", d => yHeat(d.key) + yHeat.bandwidth() / 2 + 5)
      .attr("text-anchor", "end")
      .attr("font-size", 13)
      .text(d => d.label);

    const q4Data = rows.flatMap(r => cols.map(c => ({
      theme: r.key, disease: c.key, rho: valueOf(r.key, c.key), n: 2956
    })));

    const matrixCells = heatChart.selectAll("g.matrixCell")
      .data(q4Data)
      .enter()
      .append("g")
      .attr("class", "matrixCell")
      .attr("transform", d =>
        `translate(${xHeat(d.disease)},${yHeat(d.theme)})`
      )
      .style("cursor", "pointer")
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-label", d => `${rows.find(r => r.key === d.theme).label}, ${cols.find(c => c.key === d.disease).label}: ${d.rho.toFixed(4)}`)
      .attr("aria-pressed", d => selected.theme === d.theme && selected.cond === d.disease)
      .on("click", (event, d) => onPick(d.theme, d.disease))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPick(d.theme, d.disease);
        }
      });

    matrixCells.append("rect")
      .attr("width", xHeat.bandwidth())
      .attr("height", yHeat.bandwidth())
      .attr("fill", d => heatColor(d.rho))
      .attr("stroke", d =>
        selected.theme === d.theme && selected.cond === d.disease
          ? "#0F2742"
          : "#D1D5DB"
      )
      .attr("stroke-width", d =>
        selected.theme === d.theme && selected.cond === d.disease
          ? 4
          : 1
      );

    matrixCells.append("text")
      .attr("x", xHeat.bandwidth() / 2)
      .attr("y", yHeat.bandwidth() / 2 + 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", 700)
      .attr("fill", d =>
        Math.abs(d.rho) > 0.64 ? "white" : "#111827"
      )
      .text(d => d.rho.toFixed(4));

    matrixCells.append("title")
      .text(d =>
        `${rows.find(r => r.key === d.theme).label} × ${cols.find(c => c.key === d.disease).label}
    Spearman ρ = ${d.rho.toFixed(4)}
    n = ${d.n.toLocaleString()} counties
    Click to update the shared county scatterplot`
      );

    heatChart.append("text")
      .attr("x", heatInnerWidth / 2)
      .attr("y", heatInnerHeight + 38)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .text("Chronic Disease");

    heatChart.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -heatInnerHeight / 2)
      .attr("y", -255)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
      .text("SVI Theme");

    const legendX = (heatInnerWidth - 360) / 2;
    const legendY = heatInnerHeight + 90;

    heatChart.append("text")
      .attr("x", heatInnerWidth / 2)
      .attr("y", legendY - 17)
      .attr("text-anchor", "middle")
      .attr("font-size", 14)
      .attr("font-weight", 700)
      .text("Spearman Rank Correlation (ρ)");

    const legendValues = d3.range(121).map(i => -1 + i / 60);

    heatChart.selectAll("rect.legend")
      .data(legendValues)
      .enter()
      .append("rect")
      .attr("class", "legend")
      .attr("x", (d, i) => legendX + i * 3)
      .attr("y", legendY)
      .attr("width", 3)
      .attr("height", 17)
      .attr("fill", d => heatColor(d));

    heatChart.append("g")
      .attr("transform", `translate(${legendX},${legendY + 18})`)
      .call(
        d3.axisBottom(
          d3.scaleLinear()
            .domain([-1, 1])
            .range([0, 363])
        ).tickValues([-1, -0.5, 0, 0.5, 1])
      );

    heatChart.append("text")
      .attr("x", heatInnerWidth / 2)
      .attr("y", legendY + 65)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .text("Click a cell to update the county scatterplot below. Correlations are national and unweighted (n = 2,956 per pair).");

  }, [rows, cols, valueOf, selected, onPick]);
  return (
    <>
      <p className="chart-scroll-hint">Scroll horizontally to see the full chart.</p>
      <div className="observable-scroll" tabIndex={0} role="region" aria-label="Correlation heatmap; scroll horizontally on small screens">
        <svg ref={ref} className="chart heatmap observable-chart" role="img" aria-label="Heatmap of Spearman correlations between SVI themes and conditions" />
      </div>
    </>
  );
}
