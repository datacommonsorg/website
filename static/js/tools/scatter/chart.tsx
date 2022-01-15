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
import {
  drawScatter,
  Point,
  ScatterPlotOptions,
  ScatterPlotProperties,
} from "../../chart/draw_scatter";
import { GeoJsonData, GeoJsonFeatureProperties } from "../../chart/types";
import { USA_PLACE_DCID } from "../../shared/constants";
import { NamedPlace } from "../../shared/types";
import { loadSpinner, removeSpinner } from "../../shared/util";
import { urlToDomain } from "../../shared/util";
import { getStringOrNA } from "../../utils/number_utils";
import { isChildPlaceOf, shouldShowMapBoundaries } from "../shared_util";
import { DisplayOptionsWrapper, PlaceInfo } from "./context";
import { ScatterChartType } from "./util";

interface ChartPropsType {
  points: { [placeDcid: string]: Point };
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  xPerCapita: boolean;
  yPerCapita: boolean;
  xUnits?: string;
  yUnits?: string;
  placeInfo: PlaceInfo;
  display: DisplayOptionsWrapper;
  sources: Set<string>;
}

const DOT_REDIRECT_PREFIX = "/place/";
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
const DEBOUNCE_INTERVAL_MS = 30;

function Chart(props: ChartPropsType): JSX.Element {
  const svgContainerRef = useRef<HTMLDivElement>();
  const tooltipRef = useRef<HTMLDivElement>();
  const chartContainerRef = useRef<HTMLDivElement>();
  const [geoJson, setGeoJson] = useState(null);
  const [geoJsonFetched, setGeoJsonFetched] = useState(false);
  const xDates: Set<string> = new Set();
  const yDates: Set<string> = new Set();
  Object.values(props.points).forEach((point) => {
    xDates.add(point.xDate);
    yDates.add(point.yDate);
  });
  const xTitle = getTitle(Array.from(xDates), props.xLabel);
  const yTitle = getTitle(Array.from(yDates), props.yLabel);
  const sourcesJsx = getSourcesJsx(props.sources);
  // Tooltip needs to start off hidden
  d3.select(tooltipRef.current)
    .style("visibility", "hidden")
    .style("position", "absolute");

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
    if (!_.isEmpty(props.points)) {
      if (svgContainerRef.current) {
        clearSVGs();
        plot(svgContainerRef, tooltipRef, props, geoJson);
      }
    }
  }

  // Replot when props or chart width changes.
  useEffect(() => {
    const entrySet = new Set();
    if (props.display.chartType === ScatterChartType.MAP && !geoJsonFetched) {
      loadSpinner(CONTAINER_ID);
      return;
    } else {
      removeSpinner(CONTAINER_ID);
      replot();
    }
    // ResizeObserver callback function documentation:
    // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/ResizeObserver
    const debouncedHandler = _.debounce((entries) => {
      if (_.isEmpty(entries)) return;
      if (entrySet.has(entries[0].target)) {
        replot();
      } else {
        entrySet.add(entries[0].target);
      }
    }, DEBOUNCE_INTERVAL_MS);
    const resizeObserver = new ResizeObserver(debouncedHandler);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    return () => {
      resizeObserver.unobserve(chartContainerRef.current);
      debouncedHandler.cancel();
    };
  }, [props, chartContainerRef, geoJsonFetched]);

  return (
    <div id="chart" className="container-fluid" ref={chartContainerRef}>
      <Row>
        <Card id="no-padding">
          <div className="chart-title">
            <h3>{yTitle}</h3>
            <span>vs</span>
            <h3>{xTitle}</h3>
          </div>
          <div className="scatter-chart-container">
            <div id={SVG_CONTAINER_ID} ref={svgContainerRef}></div>
            <div id={MAP_LEGEND_CONTAINER_ID}></div>
            <div id="scatter-tooltip" ref={tooltipRef} />
          </div>
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
  const chartHeight = svgContainerRef.current.offsetHeight;
  const scatterPlotOptions: ScatterPlotOptions = {
    xPerCapita: props.xPerCapita,
    yPerCapita: props.yPerCapita,
    xLog: props.xLog,
    yLog: props.yLog,
    showQuadrants: props.display.showQuadrants,
    showDensity: props.display.showDensity,
    showLabels: props.display.showLabels,
    showRegression: props.display.showRegression,
  };
  const ScatterPlotProperties: ScatterPlotProperties = {
    width: svgContainerRealWidth,
    height: chartHeight,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    xUnit: props.xUnits,
    yUnit: props.yUnits,
  };
  if (props.display.chartType === ScatterChartType.SCATTER) {
    drawScatter(
      svgContainerRef,
      tooltipRef,
      ScatterPlotProperties,
      scatterPlotOptions,
      props.points,
      redirectAction,
      getTooltipElement
    );
  } else {
    if (_.isEmpty(geoJsonData)) {
      alert(`Sorry, there was an error loading map view.`);
      props.display.setChartType(ScatterChartType.SCATTER);
      return;
    }
    const xVals = Array.from(Object.values(props.points), (point) =>
      props.xLog ? Math.log10(point.xVal) : point.xVal
    );
    const yVals = Array.from(Object.values(props.points), (point) =>
      props.yLog ? Math.log10(point.yVal) : point.yVal
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
      d3.extent(Object.values(props.points), (point) => point.xVal),
      d3.extent(Object.values(props.points), (point) => point.yVal),
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
        redirectAction(geoDcid.geoDcid);
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
      ),
      props.placeInfo.enclosingPlace.dcid
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
  let supIndex = 0;
  const xPopDateMessage =
    xPerCapita && point.xPopDate && !point.xDate.includes(point.xPopDate)
      ? ++supIndex
      : null;
  const yPopDateMessage =
    yPerCapita && point.yPopDate && !point.yDate.includes(point.yPopDate)
      ? ++supIndex
      : null;
  return (
    <>
      <header>
        <b>{point.place.name || point.place.dcid}</b>
      </header>
      {xLabel}
      {xPopDateMessage && <sup>{xPopDateMessage}</sup>} ({point.xDate}):{" "}
      <b>{getStringOrNA(point.xVal)}</b>
      <br />
      {yLabel}
      {yPopDateMessage && <sup>{yPopDateMessage}</sup>} ({point.yDate}):{" "}
      <b>{getStringOrNA(point.yVal)}</b>
      <br />
      <footer>
        {xPopDateMessage && (
          <>
            <sup>{xPopDateMessage}</sup> Uses population data from:{" "}
            {point.xPopDate}
            <br />
          </>
        )}
        {yPopDateMessage && (
          <>
            <sup>{yPopDateMessage}</sup> Uses population data from:{" "}
            {point.yPopDate}
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

function redirectAction(placeDcid: string): void {
  const uri = `${DOT_REDIRECT_PREFIX}${placeDcid}`;
  window.open(uri);
}

function getTitle(dates: string[], statVarLabel: string) {
  const minDate = _.min(dates);
  const maxDate = _.max(dates);
  const dateRange =
    minDate === maxDate ? `(${minDate})` : `(${minDate} to ${maxDate})`;
  return `${statVarLabel} ${dateRange}`;
}

function getSourcesJsx(sources: Set<string>): JSX.Element[] {
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
  return sourcesJsx;
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
