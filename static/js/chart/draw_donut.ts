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
 * Functions to draw a donut tile
 */

import * as d3 from "d3";
import _ from "lodash";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { DataGroup, DataPoint, getColorFn } from "./base";
import { SVGNS, XLINKNS } from "./draw_constants";
import { appendLegendElem } from "./draw_utils";
import { ChartOptions } from "./types";

/**
 * Draw donut chart.
 * @param containerElement Div element to draw chart in
 * @param chartWidth width of chart
 * @param chartHeight height of chart
 * @param dataGroups data to plot
 * @param drawAsPie whether to draw as full pie chart instead of donut
 */
export function drawDonutChart(
  containerElement: HTMLDivElement,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
  drawAsPie: boolean,
  options?: ChartOptions
): void {
  if (_.isEmpty(dataGroups)) {
    return;
  }
  const labelToLink = {};
  for (const dataGroup of dataGroups) {
    labelToLink[dataGroup.label] = dataGroup.link;
  }
  const keys = dataGroups[0].value.map((dp) => dp.label);
  const colorFn = getColorFn(keys, options?.colors);
  // minimum thickness of the donut, in px
  const minArcThickness = 10;
  // how thickness of donut should scale with donut's radius
  // The larger the number, the thicker the donut
  const arcThicknessRatio = 0.15;
  // how much space to leave on each side of donut, in px
  const margin = 20;

  // Compute donut size based on settings
  const outerRadius = Math.min(chartWidth, chartHeight) / 2 - margin;
  const arcStrokeWidth = Math.max(
    outerRadius * arcThicknessRatio,
    minArcThickness
  );
  const innerRadius = drawAsPie ? 0 : outerRadius - arcStrokeWidth;
  const arc = d3
    .arc<d3.PieArcDatum<DataPoint>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  // Compute position of each group on the donut
  const pie = d3.pie<void, DataPoint>().value((d) => {
    return d.value;
  });
  const donutData = pie(dataGroups[0].value);

  // clear old chart to redraw over
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  // create svg container
  const svg = container
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // draw donut and center in svg container
  const chart = svg
    .append("g")
    .attr("class", "arc")
    .attr("transform", `translate(${chartWidth / 2}, ${chartHeight / 2})`);

  // plot data
  chart
    .selectAll("g")
    .data(donutData)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => {
      return colorFn(d.data.label);
    })
    .attr("part", (d) =>
      ["series", `series-variable-${d.data.label}`].join(" ")
    );

  appendLegendElem(
    containerElement,
    colorFn,
    dataGroups[0].value.map((dp) => ({
      label: dp.label,
      link: dp.link,
    }))
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}
