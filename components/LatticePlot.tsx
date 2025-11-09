
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface LatticePlotProps {
  n: string;
  s: string;
}

export const LatticePlot: React.FC<LatticePlotProps> = ({ n, s }) => {
  const d3Container = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!d3Container.current) return;
    
    const N = Number(n);
    const S = Number(s);
    if (isNaN(N) || isNaN(S) || N <= 0) return;

    const svg = d3.select(d3Container.current);
    svg.selectAll("*").remove(); // Clear previous plot

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = d3Container.current.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Determine the domain for x-axis. S should be visible.
    const maxVisibleX = Math.max(S, N > 1 ? Math.ceil(Math.sqrt(N)) * 1.5 : 10, 10);
    const x = d3.scaleLinear().domain([0, maxVisibleX]).range([0, width]);
    const y = d3.scaleLinear().domain([0, maxVisibleX]).range([height, 0]);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .append("text")
      .attr("y", 35)
      .attr("x", width / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text("x");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -35)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .text("y");

    // Hyperbola data
    const hyperbolaData = d3.range(0.1, maxVisibleX, 0.1).map(px => ({
      x: px,
      y: N / px,
    })).filter(p => p.y <= maxVisibleX);

    // Line data
    const lineData = [{x: 0, y: S}, {x: S, y: 0}];

    // Draw hyperbola
    g.append("path")
      .datum(hyperbolaData)
      .attr("fill", "none")
      .attr("stroke", "#8884d8")
      .attr("stroke-width", 2.5)
      .attr("d", d3.line<any>().x(d => x(d.x)).y(d => y(d.y)));

    // Draw line
    g.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "#82ca9d")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.line<any>().x(d => x(d.x)).y(d => y(d.y)));

    // Check for integer factors from S
    const discriminant = S * S - 4 * N;
    if (discriminant >= 0) {
      const D = Math.sqrt(discriminant);
      if (Number.isInteger(D)) {
        const x1 = (S + D) / 2;
        const y1 = (S - D) / 2;
        
        g.append("circle").attr("cx", x(x1)).attr("cy", y(y1)).attr("r", 6).attr("fill", "red");
        g.append("circle").attr("cx", x(y1)).attr("cy", y(x1)).attr("r", 6).attr("fill", "red");

        g.append("text")
         .attr("x", x(x1) + 10)
         .attr("y", y(y1))
         .text(`(${x1}, ${y1})`)
         .attr("font-size", "12px")
         .attr("fill", "red");
      }
    }

  }, [n, s]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Geometric Visualization (xy = N)</h3>
      <svg
        ref={d3Container}
        width="100%"
        height="400"
      />
    </div>
  );
};
