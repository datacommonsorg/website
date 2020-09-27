/**
 * Copyright 2020 Google LLC
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

import React, { Component } from "react";
import * as d3 from "d3";

interface ScatterChartPropType {
  data: number[][];
}

// interface ScatterChartStateType {
//   statVarX: string;
//   statVarY: string;
//   places: string[];
// }

class ScatterChart extends Component<ScatterChartPropType, unknown> {
  render(): JSX.Element {
    return <div id="chart-svg"></div>;
  }

  componentDidMount() {
    this.plot();
  }

  plot(): void {
    console.log("Plotting");
    const margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40,
    };
    const width = 700 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);
    // Scale the range of the data
    x.domain(
      d3.extent(this.props.data, function (d) {
        return d[0];
      })
    );
    y.domain([
      0,
      d3.max(this.props.data, function (d) {
        return d[1];
      }),
    ]);

    const valueline = d3
      .line()
      .x(function (d) {
        return x(d[0]);
      })
      .y(function (d) {
        return y(d[1]);
      });

    const svg = d3
      .select("#chart-svg")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const path = svg
      .selectAll("dot")
      .data(this.props.data)
      .enter()
      .append("circle")
      .attr("r", 5)
      .attr("cx", function (d) {
        return x(d[0]);
      })
      .attr("cy", function (d) {
        return y(d[1]);
      })
      .attr("stroke", "#32CD32")
      .attr("stroke-width", 1.5)
      .attr("fill", "#FFFFFF");

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));
    svg.append("g").call(
      d3.axisLeft(y).tickFormat(function (d) {
        return "$" + d3.format(".2f")(d);
      })
    );
  }
}

export { ScatterChart };
