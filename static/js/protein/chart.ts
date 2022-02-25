/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as d3 from "d3";

const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

const HEIGHT = 224;
const WIDTH = 500;

/**
 * Draw bar chart for tissue score.
 */
export function drawTissueScoreChart(
  id: string,
  data: { name: string; value: string }[]
): void {
  const tmpData = [
    { name: "Cartilage", value: 3 },
    { name: "Eye", value: 2 },
    { name: "Liver", value: 1 },
    { name: "Skin", value: 0 },
  ];
  const testData = data;
  function convertData(val) {
    if (val == "ProteinExpressionNotDetected") {
      return 0;
    } else if (val == "ProteinExpressionLow") {
      return 1;
    } else if (val == "ProteinExpressionMedium") {
      return 2;
    } else if (val == "ProteinExpressionHigh") {
      return 3;
    }
  }
  const reformat = data.map((item) => {
    const newObj: any = {};
    newObj["name"] = item.name;
    newObj["value"] = convertData(item.value);
    return newObj;
  });

  const size = reformat.map((x) => {
    return x.name;
  });

  const barHeight = 35;
  const margin = { top: 70, right: 50, bottom: 10, left: 50 };
  const height = 400 - margin.top - margin.bottom;
  const width = 460 - margin.left - margin.right;
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(reformat, (d) => d.value)])
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleBand()
    .domain(size)
    .rangeRound([margin.top, height - margin.bottom])
    .padding(0.1);
  function formatTick(d) {
    if (d == 0) {
      return "NotDetected";
    } else if (d == 1) {
      return "Low";
    } else if (d == 2) {
      return "Medium";
    } else if (d == 3) {
      return "High";
    }
  }
  const svg = d3
    .selectAll("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

  svg
    .append("g")
    .selectAll("rect")
    .data(reformat.sort((a, b) => d3.descending(a.value, b.value)))
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value) - x(0))
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      if (d.name == "Eye") {
        return "green";
      } else if (d.name == "Cartilage") {
        return "yellow";
      } else if (d.name == "Liver") {
        return "steelblue";
      } else {
        return "red";
      }
    })
    .on("mouseover", function (d, i) {
      d3.select(this).transition().duration(50).style("opacity", 0.5);
    })
    .on("mouseout", function (d, i) {
      d3.select(this).transition().duration(50).style("opacity", 1);
    });

  svg
    .append("g")
    .attr("fill", "white")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 3)
    .selectAll("text")
    .data(reformat.sort((a, b) => d3.descending(a.value, b.value)))
    .join("text")
    .attr("x", (d) => x(d.value))
    .attr("y", (d, i) => i + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .call((text) =>
      text
        .filter((d) => x(d.value) - x(0) < 20)
        .attr("dx", +2)
        .attr("fill", "black")
        .attr("text-anchor", "start")
    );

  svg
    .append("g")
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).ticks(3).tickFormat(formatTick))
    .call((g) => g.select(".domain").remove())
    .on("mouseover", function () {
      d3.select(this).select("rect").style("fill", "red");
    })
    .on("mouseout", function (d, i) {
      d3.select(this).select("rect").style("fill", "blue");
    });

  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .on("mouseover", function () {
      d3.select(this).select("rect").style("fill", "red");
    })
    .on("mouseout", function (d, i) {
      d3.select(this).select("rect").style("fill", "blue");
    });
}
