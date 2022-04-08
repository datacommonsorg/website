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

const HEIGHT = 400;
const WIDTH = 500;
const MARGIN = { top: 70, right: 50, bottom: 10, left: 50 };

const TISSUE_SCORE_TO_LABEL = {
  0: "NotDetected",
  1: "Low",
  2: "Medium",
  3: "High",
};
const TISSUE_VAL_TO_SCORE = {
  ProteinExpressionNotDetected: 0,
  ProteinExpressionLow: 1,
  ProteinExpressionMedium: 2,
  ProteinExpressionHigh: 3,
};

// interface for protein page datatypes which return number values
export interface ProteinPropDataNumType {
  name: string;
  value: number;
}

// interface for protein page datatypes which return string values
export interface ProteinPropDataStrType {
  name: string;
  value: string;
}
/**
 * Draw bar chart for tissue score.
 */
export function drawTissueScoreChart(
  id: string,
  data: { name: string; value: string }[]
): void {
  let reformattedData = {} as ProteinPropDataNumType[];
  reformattedData = data.map((item) => {
    return {
      name: item.name,
      value: TISSUE_VAL_TO_SCORE[item.value],
    };
  });

  const arr_name = reformattedData.map((x) => {
    return x.name;
  });

  const height = HEIGHT - MARGIN.top - MARGIN.bottom;
  const width = WIDTH - MARGIN.left - MARGIN.right;
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(reformattedData, (d) => d.value)])
    .range([MARGIN.left, width - MARGIN.right]);
  const y = d3
    .scaleBand()
    .domain(arr_name)
    .rangeRound([MARGIN.top, height - MARGIN.bottom])
    .padding(0.1);
  function formatTick(d) {
    return TISSUE_SCORE_TO_LABEL[d];
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
    .data(reformattedData.sort((a, b) => d3.descending(a.value, b.value)))
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
    .data(reformattedData.sort((a, b) => d3.descending(a.value, b.value)))
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
    .attr("transform", `translate(0,${MARGIN.top})`)
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
    .attr("transform", `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(50).tickSizeOuter(0))
    .on("mouseover", function () {
      d3.select(this).select("rect").style("fill", "red");
    })
    .on("mouseout", function (d, i) {
      d3.select(this).select("rect").style("fill", "blue");
    });
}
