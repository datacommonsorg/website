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
 * Functions to draw a gauge tile
 */

import * as d3 from "d3";
import _ from "lodash";

import { GaugeChartData } from "../components/tiles/gauge_tile";
import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { formatNumber } from "../i18n/i18n";
import { SVGNS, XLINKNS } from "./draw_constants";
import { appendLegendElem } from "./draw_utils";
import { ChartOptions } from "./types";

/**
 * Draw gauge chart.
 * @param containerElement HTML div to draw chart in
 * @param chartWidth width of the chart area
 * @param data data to plot
 * @param minChartHeight minimum height of the chart area
 */
export function drawGaugeChart(
  containerElement: HTMLDivElement,
  chartWidth: number,
  data: GaugeChartData,
  minChartHeight: number,
  options?: ChartOptions
): void {
  if (_.isEmpty(data)) {
    return;
  }

  /**
   * Chart settings
   * TODO(juliawu): Allow these constants to be set with an optional argument
   */
  // Angles, in radians, arc should cover
  const arcMin = -Math.PI / 2;
  const arcMax = Math.PI / 2;
  // color to use for unfilled portion of the arc
  const backgroundArcColor = "#ddd";
  // color scale for [low, med, high] values
  const colorOptions = options?.colors
    ? options?.colors
    : ["#d63031", "#fdcb6e", "#00b894"]; // red, yellow, green

  // minimum thickness of the arc, in px
  const minArcThickness = 10;
  // how thickness of arc should scale with chart's width
  // The larger the number, the thicker the arc
  const arcThicknessRatio = 0.05;
  // 0 to 1, compared to chart width, how wide should the arc be
  const arcWidthRatio = 2 / 3;

  // Compute arc and label text sizes based on settings
  const arcStrokeWidth = Math.max(
    chartWidth * arcThicknessRatio,
    minArcThickness
  );
  const outerRadius = 0.5 * arcWidthRatio * chartWidth;
  const innerRadius = outerRadius - arcStrokeWidth;
  const chartHeight = Math.max(outerRadius, minChartHeight);
  const labelTextSize = innerRadius / 3;
  const dataDomain = [
    data.range.min,
    (data.range.max - data.range.min) / 2,
    data.range.max,
  ];
  const arcScale = d3
    .scaleLinear()
    .domain(dataDomain)
    .range([arcMin, 0, arcMax]);
  const colorScale = d3
    .scaleLinear<string>()
    .domain(dataDomain)
    .range(colorOptions);
  const arc = d3
    .arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .startAngle(arcMin);

  // clear old chart to redraw over
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  // create svg container
  const svg = container
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("class", ASYNC_ELEMENT_CLASS);

  // draw chart and center in svg container
  const chart = svg
    .append("g")
    .attr("class", "arc")
    .attr(
      "transform",
      `translate(${chartWidth / 2}, ${(chartHeight + outerRadius) / 2})`
    );

  // create background arc
  chart
    .append("path")
    .attr("class", "bg-arc")
    .datum({ endAngle: arcMax })
    .style("fill", backgroundArcColor)
    .attr("d", arc);

  // create data arc
  chart
    .append("path")
    .attr("class", "data-arc")
    .datum({
      endAngle: arcScale(data.value),
      startAngle: arcMin,
    })
    .attr("d", arc)
    .style("fill", colorScale(data.value));

  // add label in middle, under arc
  const arcCentroid = arc.centroid({
    endAngle: arcMax,
    startAngle: arcMin,
    innerRadius,
    outerRadius,
  });
  chart
    .append("text")
    .attr("class", "arc-label")
    .datum({ value: data.value })
    .attr("x", arcCentroid[0])
    .attr("y", -1 * labelTextSize)
    .style("alignment-baseline", "central")
    .style("text-anchor", "middle")
    .style("font-size", `${labelTextSize}px`)
    .text((d) => formatNumber(d.value));

  appendLegendElem(
    containerElement,
    d3
      .scaleOrdinal<string, string>()
      .domain([data.statVar])
      .range([colorScale(data.value)]),
    [
      {
        label: data.statVarName,
      },
    ],
    options?.apiRoot
  );
}
