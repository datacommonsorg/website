/**
 * Copyright 2023 Google LLC
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

/**
 * Functions for drawing a histogram tile
 */

import * as d3 from "d3";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { DataPoint, getColorFn } from "./base";
import { MARGIN, SVGNS, XLINKNS } from "./draw_constants";
import { addXAxis, addYAxis, updateXAxis } from "./draw_utils";
import { HistogramOptions } from "./types";

// Max width in pixels for a bar in a histogram
const MAX_HISTOGRAM_BAR_WIDTH = 75;

/**
 * Draw histogram. Used for ranking pages. Labels will not be translated - expects translated place names as labels.
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataPoints
 * @param formatNumberFn
 * @param unit
 */
export function drawHistogram(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataPoints: DataPoint[],
  formatNumberFn: (value: number, unit?: string) => string,
  options?: HistogramOptions
): void {
  const textList = dataPoints.map((dataPoint) => dataPoint.label);
  const values = dataPoints.map((dataPoint) => dataPoint.value);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const yAxis = svg.append("g").attr("class", "y axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const xAxis = svg.append("g").attr("class", "x axis");
  const tempYAxis = svg.append("g");

  const yExtent = d3.extent(values);
  const y = d3
    .scaleLinear()
    .domain([Math.min(0, yExtent[0]), yExtent[1]])
    .rangeRound([chartHeight - MARGIN.bottom, MARGIN.top]);

  // Don't set TEXT_FONT_FAMILY for histograms, this causes some resizing
  // of axis labels that results in the labels being cut-off.
  // TODO (juliawu): identify why this is and fix root cause.
  const leftWidth = addYAxis(
    tempYAxis,
    chartWidth,
    y,
    formatNumberFn,
    null,
    options?.unit
  );

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.5);

  const bottomHeight = addXAxis(
    xAxis,
    chartHeight,
    x,
    true,
    null,
    null,
    options?.apiRoot
  );

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  // Don't set TEXT_FONT_FAMILY for histograms, this causes some resizing
  // of axis labels that results in the labels being cut-off.
  // TODO (juliawu): identify why this is and fix root cause.
  addYAxis(yAxis, chartWidth, y, formatNumberFn, undefined, options?.unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const color = options?.fillColor ? options.fillColor : getColorFn(["A"])("A"); // we only need one color

  chart
    .append("g")
    .selectAll("rect")
    .data(dataPoints)
    .join("rect")
    .attr("x", (d) => {
      return (
        x(d.label) +
        // shift label if max bar width is used instead of original bandwidth
        (x.bandwidth() - Math.min(x.bandwidth(), MAX_HISTOGRAM_BAR_WIDTH)) / 2
      );
    })
    .attr("y", (d) => y(Math.max(0, d.value)))
    .attr("width", Math.min(x.bandwidth(), MAX_HISTOGRAM_BAR_WIDTH))
    .attr("height", (d) => Math.abs(y(0) - y(d.value)))
    .attr("fill", color);

  svg.attr("class", ASYNC_ELEMENT_CLASS);
}
