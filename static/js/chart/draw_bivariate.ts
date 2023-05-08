/**
 * Copyright 2022 Google LLC
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
import React from "react";

import { NamedPlace } from "../shared/types";
import { getStringOrNA } from "../utils/number_utils";
import { drawD3Map, getProjection } from "./draw_d3_map";
import { Point } from "./draw_scatter";
import { GeoJsonData, GeoJsonFeatureProperties } from "./types";

/**
 * Creates and manages bivariate chart rendering.
 */

const LEGEND_ARROW_LENGTH = 5;
const LEGEND_ARROW_WIDTH = 6;
const LEGEND_TITLE_FONT_WEIGHT = 600;
const MIN_LEGEND_CELL_SIZE = 8;
const LEGEND_CELL_SIZE_SCALE = 0.01;
const LEGEND_MARKER_WIDTH = 9;
const LEGEND_MARKER_HEIGHT = 9;
const LEGEND_AXIS_STROKE_COLOR = "black";
const NUM_QUANTILES = 6;
const MAP_COLORS = [
  "#E8E8E8",
  "#CCE2E2",
  "#AFDBDB",
  "#93D5D5",
  "#76CECE",
  "#5AC8C8",
  "#E0CEDC",
  "#C4C8D6",
  "#A8C2D0",
  "#8CBBCA",
  "#70B5C4",
  "#54AFBE",
  "#D7B3D0",
  "#BCADCA",
  "#A0A7C4",
  "#85A1BF",
  "#699BB9",
  "#4E95B3",
  "#CF99C4",
  "#B493BF",
  "#998DB9",
  "#7D88B4",
  "#6282AE",
  "#477CA9",
  "#C67EB8",
  "#AB78B3",
  "#9173AE",
  "#766DA8",
  "#5C68A3",
  "#41629E",
  "#BE64AC",
  "#A45FA7",
  "#8A59A2",
  "#6F549E",
  "#554E99",
  "#3B4994",
];

/**
 * Draw the legend for the map view
 * @param colorScale the color scale used for the map
 * @param svgWidth the width of the map
 * @param xLabel the label for the x stat var
 * @param yLabel the label for the y stat var
 * @param xRange the range of the x values
 * @param yRange the range of the y values
 * @param xUnit the unit for the x values
 * @param yUnit the unit for the y values
 */
function drawMapLegend(
  legendRef: React.RefObject<HTMLDivElement>,
  colorScale: d3.ScaleLinear<string, number>,
  svgWidth: number,
  xLabel: string,
  yLabel: string,
  xRange: [number, number],
  yRange: [number, number],
  xUnit?: string,
  yUnit?: string
): void {
  const container = d3.select(legendRef.current);
  container.selectAll("*").remove();
  const legendSvg = container.append("svg").attr("width", svgWidth);
  const legendContainer = legendSvg.append("g");
  const legendLabels = legendContainer
    .append("text")
    .attr("font-size", "0.7rem");
  const legend = legendContainer.append("g").attr("transform", "rotate(45)");
  const legendCellSize = Math.max(
    svgWidth * LEGEND_CELL_SIZE_SCALE,
    MIN_LEGEND_CELL_SIZE
  );

  const mapLegendGridValues = Array<number[]>();
  for (let x = NUM_QUANTILES - 1; x >= 0; x--) {
    const row = [];
    for (let y = NUM_QUANTILES - 1; y >= 0; y--) {
      row.push(x + y * NUM_QUANTILES);
    }
    mapLegendGridValues.push(row);
  }
  // draw the legend grid
  legend
    .selectAll(".row")
    .data(mapLegendGridValues)
    .enter()
    .append("g")
    .attr(
      "transform",
      (_, i) =>
        `translate(${LEGEND_ARROW_LENGTH}, ${
          i * legendCellSize + LEGEND_ARROW_LENGTH
        })`
    )
    .selectAll(".cell")
    .data((_, i) => mapLegendGridValues[i])
    .enter()
    .append("rect")
    .attr("width", legendCellSize)
    .attr("height", legendCellSize)
    .attr("x", (_, i) => i * legendCellSize)
    .attr("fill", (d) => colorScale(d));

  // add the arrowhead marker definition
  legend
    .append("defs")
    .append("marker")
    .attr("id", "arrow")
    .attr("refX", LEGEND_ARROW_LENGTH - 2)
    .attr("refY", LEGEND_ARROW_WIDTH / 2)
    .attr("markerWidth", LEGEND_MARKER_WIDTH)
    .attr("markerHeight", LEGEND_MARKER_HEIGHT)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr(
      "d",
      d3.line()([
        [0, 0],
        [0, LEGEND_ARROW_WIDTH],
        [LEGEND_ARROW_LENGTH, LEGEND_ARROW_WIDTH / 2],
      ])
    )
    .attr("stroke", LEGEND_AXIS_STROKE_COLOR);

  // draw the two axis on the legend
  legend
    .append("path")
    .attr(
      "d",
      d3.line()([
        [
          legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH,
          legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH,
        ],
        [legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH, 0],
      ])
    )
    .attr("stroke", LEGEND_AXIS_STROKE_COLOR)
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrow)");

  legend
    .append("path")
    .attr(
      "d",
      d3.line()([
        [
          legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH,
          legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH,
        ],
        [0, legendCellSize * NUM_QUANTILES + LEGEND_ARROW_LENGTH],
      ])
    )
    .attr("stroke", LEGEND_AXIS_STROKE_COLOR)
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrow)");

  // draw the labels
  const xUnitString = xUnit ? ` (${xUnit})` : "";
  const yUnitString = yUnit ? ` (${yUnit})` : "";
  const yLabelTitle = legendLabels
    .append("tspan")
    .text(yLabel + yUnitString)
    .attr("x", 0)
    .attr("y", 0)
    .attr("font-weight", LEGEND_TITLE_FONT_WEIGHT);
  const yLabelRange = legendLabels
    .append("tspan")
    .text(`${getStringOrNA(yRange[0])} to ${getStringOrNA(yRange[1])}`)
    .attr("x", 0)
    .attr("y", 15);
  const yLabelLength = Math.max(
    yLabelTitle.node().getBBox().width,
    yLabelRange.node().getBBox().width
  );
  legendLabels
    .append("tspan")
    .text(xLabel + xUnitString)
    .attr("x", yLabelLength + NUM_QUANTILES * legendCellSize)
    .attr("y", 0)
    .attr("font-weight", LEGEND_TITLE_FONT_WEIGHT);
  legendLabels
    .append("tspan")
    .text(`${getStringOrNA(xRange[0])} to ${getStringOrNA(xRange[1])}`)
    .attr("x", yLabelLength + NUM_QUANTILES * legendCellSize)
    .attr("y", 15);

  // move the legend labels to the left and down so that the legend is in the
  // of the labels
  legendLabels.attr(
    "transform",
    `translate(-${yLabelLength + (NUM_QUANTILES / 2) * legendCellSize}, ${
      legend.node().getBoundingClientRect().height
    })`
  );

  const legendSvgClientRect = legendSvg.node().getBoundingClientRect();
  const legendContainerClientRect = legendContainer
    .node()
    .getBoundingClientRect();

  // Move the entire legend against the right side of the svg container
  const legendContainerShiftX =
    legendSvgClientRect.width -
    legendContainerClientRect.width +
    (legendSvgClientRect.x - legendContainerClientRect.x);
  legendContainer.attr("transform", `translate(${legendContainerShiftX},0)`);
  // Set the svg height to be the legend height
  legendSvg.attr(
    "height",
    legendContainer.node().getBoundingClientRect().height
  );
}

/**
 * Properties of the bivariate map to be drawn.
 */
export interface BivariateProperties {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  xLog: boolean;
  yLog: boolean;
  placeDcid: string;
  isUsaPlace: boolean;
  showMapBoundaries: boolean;
}

/**
 * Draws a bivariate map.
 * @param containerId the id of the element to draw the bivariate map in
 * @param legendRef the ref for the legend
 * @param points the values to draw the map for
 * @param geoJson the geojson data for drawing the bivariate chart
 * @param properties properties of the map to draw
 * @param redirectAction function to run when a map region is clicked
 * @param getTooltipHtml function to get the html to show in the tooltip
 */
export function drawBivariate(
  containerRef: React.RefObject<HTMLDivElement>,
  legendRef: React.RefObject<HTMLDivElement>,
  points: { [placeDcid: string]: Point },
  geoJson: GeoJsonData,
  properties: BivariateProperties,
  redirectAction: (geoDcid: GeoJsonFeatureProperties) => void,
  getTooltipHtml: (place: NamedPlace) => string
): void {
  const xVals = Array.from(Object.values(points), (point) =>
    properties.xLog ? Math.log10(point.xVal) : point.xVal
  );
  const yVals = Array.from(Object.values(points), (point) =>
    properties.yLog ? Math.log10(point.yVal) : point.yVal
  );
  const xScale = d3
    .scaleQuantize()
    .domain(d3.extent(xVals))
    .range(d3.range(NUM_QUANTILES));
  const yScale = d3
    .scaleQuantize()
    .domain(d3.extent(yVals))
    .range(d3.range(NUM_QUANTILES));
  const colorScale = d3
    .scaleLinear<string, number>()
    .domain(d3.range(NUM_QUANTILES * NUM_QUANTILES))
    .range(MAP_COLORS);
  const dataPoints = {};
  Object.values(points).forEach((point) => {
    const xVal = properties.xLog ? Math.log10(point.xVal) : point.xVal;
    const yVal = properties.yLog ? Math.log10(point.yVal) : point.yVal;
    dataPoints[point.place.dcid] = xScale(xVal) + yScale(yVal) * NUM_QUANTILES;
  });
  drawMapLegend(
    legendRef,
    colorScale,
    properties.width,
    properties.xLabel,
    properties.yLabel,
    d3.extent(Object.values(points), (point) => point.xVal),
    d3.extent(Object.values(points), (point) => point.yVal),
    properties.xUnit,
    properties.yUnit
  );
  const projection = getProjection(
    properties.isUsaPlace,
    properties.placeDcid,
    properties.width,
    properties.height,
    geoJson
  );
  drawD3Map(
    containerRef.current,
    geoJson,
    properties.height,
    properties.width,
    dataPoints,
    colorScale,
    redirectAction,
    getTooltipHtml,
    () => true,
    properties.showMapBoundaries,
    projection
  );
}
