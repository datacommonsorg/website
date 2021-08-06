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
  // TODO: convert data to tmpData format.
  const tmpData = [{ x1: 20, x2: 60, y1: 30, y2: 50 }];
  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", WIDTH)
    .attr("height", HEIGHT);

  svg
    .append("g")
    .selectAll("rect")
    .data(tmpData)
    .enter()
    .append("rect")
    .attr("x", (d) => d.x1)
    .attr("y", (d) => d.y1)
    .attr("width", (d) => d.x2 - d.x1)
    .attr("height", (d) => d.y2 - d.y1)
    .attr("fill", "teal");
}
