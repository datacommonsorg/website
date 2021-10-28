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

/**
 * Chart component for plotting a scatter plot.
 */

import axios from "axios";
import * as d3 from "d3";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";
import ReactDOMServer from "react-dom/server";
import { Card, Row } from "reactstrap";

import { drawChoropleth } from "../../chart/draw_choropleth";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { USA_PLACE_DCID } from "../../shared/constants";
import { NamedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { urlToDomain } from "../../shared/util";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../shared_util";
import { Point } from "./chart_loader";
import { DisplayOptionsWrapper, PlaceInfo } from "./context";
import { drawScatter } from "./draw_scatter";
import { ScatterChartType } from "./util";

interface ChartPropsType {
  points: { [placeDcid: string]: Point };
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  xPerCapita: boolean;
  yPerCapita: boolean;
  xStatVar: string;
  yStatVar: string;
  xUnits?: string;
  yUnits?: string;
  placeInfo: PlaceInfo;
  display: DisplayOptionsWrapper;
}

const DOT_REDIRECT_PREFIX = "/tools/timeline";
const SVG_CONTAINER_ID = "scatter-plot-container";
const MAP_LEGEND_CONTAINER_ID = "legend-container";
const MAP_LEGEND_ARROW_LENGTH = 5;
const MAP_LEGEND_ARROW_WIDTH = 6;
const MAP_LEGEND_TITLE_FONT_WEIGHT = 600;
const MAP_MIN_LEGEND_CELL_SIZE = 8;
const MAP_LEGEND_CELL_SIZE_SCALE = 0.01;
const MAP_LEGEND_MARKER_WIDTH = 9;
const MAP_LEGEND_MARKER_HEIGHT = 9;
const MAP_LEGEND_AXIS_STROKE_COLOR = "black";
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
const MAP_NUM_QUANTILES = 6;
const CONTAINER_ID = "chart";

function Chart(props: ChartPropsType): JSX.Element {
  const svgContainerRef = useRef<HTMLDivElement>();
  const tooltipRef = useRef<HTMLDivElement>();
  const chartContainerRef = useRef<HTMLDivElement>();
  const sources: Set<string> = new Set();
  const [geoJson, setGeoJson] = useState(null);
  const [geoJsonFetched, setGeoJsonFetched] = useState(false);
  Object.values(props.points).forEach((point) => {
    sources.add(point.xSource);
    sources.add(point.ySource);
    if (props.xPerCapita && point.xPopSource) {
      sources.add(point.xPopSource);
    }
    if (props.yPerCapita && point.yPopSource) {
      sources.add(point.yPopSource);
    }
  });
  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  // Tooltip needs to start off hidden
  d3.select(tooltipRef.current)
    .style("visibility", "hidden")
    .style("position", "fixed");

  // Fetch geojson in the background when component is first mounted.
  useEffect(() => {
    axios
      .get(
        `/api/choropleth/geojson?placeDcid=${props.placeInfo.enclosingPlace.dcid}&placeType=${props.placeInfo.enclosedPlaceType}`
      )
      .then((resp) => {
        setGeoJson(resp.data);
        setGeoJsonFetched(true);
      })
      .catch(() => setGeoJsonFetched(true));
  }, []);

  function replot() {
    if (svgContainerRef.current) {
      clearSVGs();
      plot(svgContainerRef, tooltipRef, props, geoJson);
    }
  }

  // Replot when data or chart width changes on sv widget toggle.
  useEffect(() => {
    if (props.display.chartType === ScatterChartType.MAP && !geoJsonFetched) {
      loadSpinner(CONTAINER_ID);
      return;
    } else {
      removeSpinner(CONTAINER_ID);
    }
    const resizeObserver = new ResizeObserver(() => {
      // TODO: Debounce
      if (!_.isEmpty(props.points)) {
        replot();
      }
    });
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    return () => {
      resizeObserver.unobserve(chartContainerRef.current);
    };
  }, [chartContainerRef, props, geoJsonFetched]);

  // Replot when window size changes (this is needed only for height changes now).
  // TODO: Collapse this with ResizeObserver above (needs a way to listen to
  // chart div height changes).
  useEffect(() => {
    function _handleWindowResize() {
      // TODO: Debounce
      replot();
    }
    window.addEventListener("resize", _handleWindowResize);
    return () => {
      window.removeEventListener("resize", _handleWindowResize);
    };
  }, [props]);

  return (
    <div id="chart" className="container-fluid" ref={chartContainerRef}>
      <Row>
        <Card id="no-padding">
          <div className="chart-title">
            <h3>{props.yLabel}</h3>
            <span>vs</span>
            <h3>{props.xLabel}</h3>
          </div>
          <div>
            <div id={SVG_CONTAINER_ID} ref={svgContainerRef}></div>
            <div id={MAP_LEGEND_CONTAINER_ID}></div>
          </div>
          <div id="tooltip" ref={tooltipRef} />
          <div className="provenance">Data from {sourcesJsx}</div>
        </Card>
      </Row>
      <div id="scatter-chart-screen" className="screen">
        <div id="spinner"></div>
      </div>
    </div>
  );
}

/**
 * Clear the svgs from each div container that contains an svg.
 */
function clearSVGs(): void {
  d3.select(`#${SVG_CONTAINER_ID}`).selectAll("*").remove();
  d3.select(`#${MAP_LEGEND_CONTAINER_ID}`).selectAll("*").remove();
}

/**
 * Formats a number, or returns "N/A" if not an number.
 * If the number is a float, keeps three non-zero decimal places.
 * eg. 0.000346546758 -> 0.000357
 * @param num
 */
function getStringOrNA(num: number): string {
  return _.isNil(num)
    ? "N/A"
    : Number.isInteger(num)
    ? num.toString()
    : num.toFixed(2 - Math.floor(Math.log(Math.abs(num % 1)) / Math.log(10)));
}

/**
 * Plots the chart which could either be a scatter plot or map.
 * @param svgContainerRef Ref for the container to plot the chart within
 * @param tooltipRef Ref for the tooltip div
 * @param props Options and information about the chart
 */
function plot(
  svgContainerRef: React.MutableRefObject<HTMLDivElement>,
  tooltipRef: React.MutableRefObject<HTMLDivElement>,
  props: ChartPropsType,
  geoJsonData: GeoJsonData
): void {
  const svgContainerRealWidth = svgContainerRef.current.offsetWidth;
  // TODO: Use CSS to set the height of the chart so it's visible (< 1 vh).
  const scatterHeight = Math.min(
    window.innerHeight * 0.6,
    svgContainerRealWidth
  );
  const scatterWidth = svgContainerRealWidth;
  const chartHeight = scatterHeight;
  if (props.display.chartType === ScatterChartType.SCATTER) {
    drawScatter(
      svgContainerRef,
      tooltipRef,
      scatterWidth,
      chartHeight,
      props,
      redirectAction,
      getTooltipElement
    );
  } else {
    if (_.isEmpty(geoJsonData)) {
      alert(`Sorry, there was an error loading map view.`);
      props.display.setChartType(ScatterChartType.SCATTER);
      return;
    }
    const xVals = Array.from(
      Object.values(props.points),
      (point) => point.xVal
    );
    const yVals = Array.from(
      Object.values(props.points),
      (point) => point.yVal
    );
    const xScale = d3
      .scaleQuantize()
      .domain(d3.extent(xVals))
      .range(d3.range(MAP_NUM_QUANTILES));
    const yScale = d3
      .scaleQuantize()
      .domain(d3.extent(yVals))
      .range(d3.range(MAP_NUM_QUANTILES));
    const colorScale = d3
      .scaleLinear<string, number>()
      .domain(d3.range(MAP_NUM_QUANTILES * MAP_NUM_QUANTILES))
      .range(MAP_COLORS);
    const dataPoints = {};
    Object.values(props.points).forEach((point) => {
      dataPoints[point.place.dcid] =
        xScale(point.xVal) + yScale(point.yVal) * MAP_NUM_QUANTILES;
    });
    drawMapLegend(
      colorScale,
      svgContainerRealWidth,
      props.xLabel,
      props.yLabel,
      d3.extent(xVals),
      d3.extent(yVals),
      props.xUnits,
      props.yUnits
    );
    drawChoropleth(
      SVG_CONTAINER_ID,
      geoJsonData,
      chartHeight,
      svgContainerRealWidth,
      dataPoints,
      "",
      colorScale,
      (geoDcid: GeoJsonFeatureProperties) => {
        redirectAction(props.xStatVar, props.yStatVar, geoDcid.geoDcid);
      },
      getMapTooltipHtml(
        props.points,
        props.xLabel,
        props.yLabel,
        props.xPerCapita,
        props.yPerCapita
      ),
      () => true,
      false,
      shouldShowMapBoundaries(
        props.placeInfo.enclosingPlace,
        props.placeInfo.enclosedPlaceType
      ),
      isChildPlaceOf(
        props.placeInfo.enclosingPlace.dcid,
        USA_PLACE_DCID,
        props.placeInfo.parentPlaces
      )
    );
  }
}

/**
 * Get the tooltip element for a given a point
 * @param point the point to get the tooltip element for
 * @param xLabel the xLabel for the tooltip element
 * @param yLabel the yLabel for the tooltip element
 * @param xPerCapita whether the x is per capita
 * @param yPerCapita whether the y is per capita
 */
function getTooltipElement(
  point: Point,
  xLabel: string,
  yLabel: string,
  xPerCapita: boolean,
  yPerCapita: boolean
): JSX.Element {
  let xSource = urlToDomain(point.xSource);
  if (xPerCapita && point.xPopSource) {
    const xPopDomain = urlToDomain(point.xPopSource);
    if (xPopDomain !== xSource) {
      xSource += `, ${xPopDomain}`;
    }
  }
  let ySource = urlToDomain(point.ySource);
  if (yPerCapita && point.yPopSource) {
    const yPopDomain = urlToDomain(point.yPopSource);
    if (yPopDomain !== ySource) {
      ySource += `, ${yPopDomain}`;
    }
  }
  const showXPopDateMessage =
    xPerCapita && point.xPopDate && !point.xDate.includes(point.xPopDate);
  const showYPopDateMessage =
    yPerCapita && point.yPopDate && !point.yDate.includes(point.yPopDate);
  return (
    <>
      <header>
        <b>{point.place.name || point.place.dcid}</b>
      </header>
      {xLabel}({point.xDate}): {getStringOrNA(point.xVal)}
      <br />
      {yLabel} ({point.yDate}): {getStringOrNA(point.yVal)} <br />
      <footer>
        {xLabel} data from: {xSource}
        <br />
        {yLabel} data from: {ySource}
        <br />
        {showXPopDateMessage && (
          <>
            <sup>*</sup> {xLabel} uses population data from: {point.xPopDate}
          </>
        )}
        {showYPopDateMessage && (
          <>
            <sup>*</sup> {yLabel} uses population data from: {point.yPopDate}
          </>
        )}
      </footer>
    </>
  );
}

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
  colorScale: d3.ScaleLinear<string, number>,
  svgWidth: number,
  xLabel: string,
  yLabel: string,
  xRange: [number, number],
  yRange: [number, number],
  xUnit?: string,
  yUnit?: string
): void {
  const legendSvg = d3
    .select(`#${MAP_LEGEND_CONTAINER_ID}`)
    .append("svg")
    .attr("width", svgWidth);
  const legendContainer = legendSvg.append("g");
  const legendLabels = legendContainer
    .append("text")
    .attr("font-size", "0.7rem");
  const legend = legendContainer.append("g").attr("transform", "rotate(45)");
  const legendCellSize = Math.max(
    svgWidth * MAP_LEGEND_CELL_SIZE_SCALE,
    MAP_MIN_LEGEND_CELL_SIZE
  );

  const mapLegendGridValues = Array<number[]>();
  for (let x = MAP_NUM_QUANTILES - 1; x >= 0; x--) {
    const row = [];
    for (let y = MAP_NUM_QUANTILES - 1; y >= 0; y--) {
      row.push(x + y * MAP_NUM_QUANTILES);
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
        `translate(${MAP_LEGEND_ARROW_LENGTH}, ${
          i * legendCellSize + MAP_LEGEND_ARROW_LENGTH
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
    .attr("refX", MAP_LEGEND_ARROW_LENGTH - 2)
    .attr("refY", MAP_LEGEND_ARROW_WIDTH / 2)
    .attr("markerWidth", MAP_LEGEND_MARKER_WIDTH)
    .attr("markerHeight", MAP_LEGEND_MARKER_HEIGHT)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr(
      "d",
      d3.line()([
        [0, 0],
        [0, MAP_LEGEND_ARROW_WIDTH],
        [MAP_LEGEND_ARROW_LENGTH, MAP_LEGEND_ARROW_WIDTH / 2],
      ])
    )
    .attr("stroke", MAP_LEGEND_AXIS_STROKE_COLOR);

  // draw the two axis on the legend
  legend
    .append("path")
    .attr(
      "d",
      d3.line()([
        [
          legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH,
          legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH,
        ],
        [legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH, 0],
      ])
    )
    .attr("stroke", MAP_LEGEND_AXIS_STROKE_COLOR)
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrow)");

  legend
    .append("path")
    .attr(
      "d",
      d3.line()([
        [
          legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH,
          legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH,
        ],
        [0, legendCellSize * MAP_NUM_QUANTILES + MAP_LEGEND_ARROW_LENGTH],
      ])
    )
    .attr("stroke", MAP_LEGEND_AXIS_STROKE_COLOR)
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
    .attr("font-weight", MAP_LEGEND_TITLE_FONT_WEIGHT);
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
    .attr("x", yLabelLength + MAP_NUM_QUANTILES * legendCellSize)
    .attr("y", 0)
    .attr("font-weight", MAP_LEGEND_TITLE_FONT_WEIGHT);
  legendLabels
    .append("tspan")
    .text(`${getStringOrNA(xRange[0])} to ${getStringOrNA(xRange[1])}`)
    .attr("x", yLabelLength + MAP_NUM_QUANTILES * legendCellSize)
    .attr("y", 15);

  // move the legend labels to the left and down so that the legend is in the
  // of the labels
  legendLabels.attr(
    "transform",
    `translate(-${yLabelLength + (MAP_NUM_QUANTILES / 2) * legendCellSize}, ${
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

function redirectAction(
  xStatVar: string,
  yStatVar: string,
  placeDcid: string
): void {
  const uri = `${DOT_REDIRECT_PREFIX}#place=${placeDcid}&statsVar=${xStatVar}__${yStatVar}`;
  window.open(uri);
}

const getMapTooltipHtml = (
  points: { [placeDcid: string]: Point },
  xLabel: string,
  yLabel: string,
  xPerCapita: boolean,
  yPerCapita: boolean
) => (place: NamedPlace) => {
  const point = points[place.dcid];
  if (_.isEmpty(point)) {
    return (
      `<header><b>${place.name || place.dcid}</b></header>` + "Data Missing"
    );
  }
  const element = getTooltipElement(
    point,
    xLabel,
    yLabel,
    xPerCapita,
    yPerCapita
  );
  return ReactDOMServer.renderToStaticMarkup(element);
};

export { Chart, ChartPropsType };
