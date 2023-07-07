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

import * as d3 from "d3";
import _ from "lodash";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import {
  GA_EVENT_PLACE_CHART_CLICK,
  GA_PARAM_PLACE_CHART_CLICK,
  GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
  triggerGAEvent,
} from "../shared/ga_events";
import { StatVarInfo } from "../shared/stat_var";
import { Boundary } from "../shared/types";
import {
  DataGroup,
  DataPoint,
  getColorFn,
  PlotParams,
  shouldFillInValues,
  Style,
  wrap,
} from "./base";
import { DotDataPoint } from "./types";

const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = {
  top: 20, // margin between chart and top edge
  right: 10, // margin between chart and right edge
  bottom: 30, // margin between chart and bottom edge
  left: 0, // margin between chart and left edge
  grid: 10, // margin between y-axis and chart content
};
const ROTATE_MARGIN_BOTTOM = 75; // margin bottom to use for histogram
const LEGEND = {
  ratio: 0.2,
  minTextWidth: 100,
  dashWidth: 30,
  lineMargin: 10,
  marginLeft: 10,
  marginTop: 40,
  defaultColor: "#000",
};
const YLABEL = {
  topMargin: 10,
  height: 15,
};
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

const TEXT_FONT_FAMILY = "Roboto";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";

// Max Y value used for y domains for charts that have only 0 values.
const MAX_Y_FOR_ZERO_CHARTS = 10;
// Max width in pixels for a bar in a histogram
const MAX_HISTOGRAM_BAR_WIDTH = 75;
const MIN_POINTS_FOR_DOTS_ON_LINE_CHART = 12;
const TOOLTIP_ID = "draw-tooltip";
// min distance between bottom of the tooltip and a datapoint
const TOOLTIP_BOTTOM_OFFSET = 5;
const HIGHLIGHTING_DOT_R = 5;
// if building a datagroup dictionary and the place for a datagroup is
// unknown, use this as the place.
const DATAGROUP_UNKNOWN_PLACE = "unknown";
const TICK_SIZE = 6;

function appendLegendElem(
  elem: HTMLElement,
  color: d3.ScaleOrdinal<string, string>,
  keys: {
    label: string;
    link?: string;
  }[]
): void {
  d3.select(elem)
    .append("div")
    .attr("class", "legend")
    .selectAll("div")
    .data(keys)
    .join("div")
    .attr("style", (d) => `background: ${color(d.label)}`)
    .append("a")
    .text((d) => d.label)
    .attr("href", (d) => d.link || null)
    // Triggered when stat var legend chip is clicked: sends data to google analytics.
    .on("click", () =>
      triggerGAEvent(GA_EVENT_PLACE_CHART_CLICK, {
        [GA_PARAM_PLACE_CHART_CLICK]: GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
      })
    );
}

/**
 * Adds tooltip element within a given container.
 *
 * @param containerId container to add tooltip element to.
 */
function addTooltip(
  container: d3.Selection<HTMLDivElement, any, any, any>
): void {
  container
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 1");
}

/**
 * Position and show the tooltip.
 *
 * @param contentHTML innerHTML of the tooltip as a string.
 * @param containerId id of the div containing the tooltip.
 * @param datapointX x coordinate of the datapoint that the tooltip is being shown for.
 * @param datapointY y coordinate of the datapoint that the tooltip is being shown for.
 * @param relativeBoundary tooltip boundary relative to its container element.
 */
function showTooltip(
  contentHTML: string,
  container: d3.Selection<HTMLDivElement, any, any, any>,
  datapointX: number,
  datapointY: number,
  relativeBoundary: Boundary
): void {
  const tooltipSelect = container.select(`#${TOOLTIP_ID}`).html(contentHTML);
  const rect = (tooltipSelect.node() as HTMLDivElement).getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  // center tooltip over the datapoint. If this causes the tooltip to overflow the boundary,
  // place the tooltip against the respective boundary.
  let left = datapointX - width / 2;
  if (left < relativeBoundary.left) {
    left = relativeBoundary.left;
  } else if (left + width > relativeBoundary.right) {
    left = relativeBoundary.right - width;
  }
  // place the tooltip against the top of the chart area unless there is too little space between it
  // and the datapoint, then place the tooltip against the bottom of the chart area
  let top = 0;
  if (height > datapointY - TOOLTIP_BOTTOM_OFFSET) {
    top = relativeBoundary.bottom - height;
  }
  tooltipSelect.style("left", left + "px").style("top", top + "px");
}

/**
 * Given a dataGroupsDict, gets the row label for each combination of place and
 * data group.
 *
 * @param dataGroupsDict mapping of place to datagroups from which the row
 *                       labels will be generated
 * @param dataGroups list of all datagroups
 * @param statVarInfo mapping of stat var to information such as its title
 */
function getRowLabels(
  dataGroupsDict: { [place: string]: DataGroup[] },
  dataGroups: string[],
  statVarInfo?: { [key: string]: StatVarInfo }
): { [place: string]: { [sv: string]: string } } {
  const places = Object.keys(dataGroupsDict);
  const labels = {};
  for (const place of places) {
    labels[place] = {};
    for (const dataGroup of Array.from(dataGroups)) {
      let rowLabel = "";
      if (dataGroups.length > 1) {
        let statVarLabel = dataGroup;
        if (statVarInfo && dataGroup in statVarInfo) {
          statVarLabel = statVarInfo[dataGroup].title || dataGroup;
        }
        rowLabel += statVarLabel;
      }
      if (places.length > 1) {
        rowLabel += _.isEmpty(rowLabel) ? `${place}` : ` (${place})`;
      }
      labels[place][dataGroup] = rowLabel;
    }
  }
  return labels;
}
/**
 * Gets the html content of a tooltip
 *
 * @param dataGroupsDict mapping of place to datagroups from which the html content will be generated from.
 * @param highlightedTime the timepoint we are showing a tooltip for.
 * @param dataLabels: mapping of place to mapping of datagroup to row label
 * @param formatNumberFn function to use to format numbers
 * @param unit units for the data.
 */
function getTooltipContent(
  dataGroupsDict: { [place: string]: DataGroup[] },
  highlightedTime: number,
  rowLabels: { [place: string]: { [dataGroup: string]: string } },
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string
): string {
  let tooltipDate = "";
  let tooltipContent = "";
  const places = Object.keys(dataGroupsDict);
  for (const place of places) {
    for (const dataGroupLabel in rowLabels[place]) {
      const dataGroup = dataGroupsDict[place].find(
        (datagroup) => datagroup.label === dataGroupLabel
      );
      const rowLabel = rowLabels[place][dataGroupLabel];
      let displayValue = "N/A";
      if (!dataGroup) {
        tooltipContent += `${rowLabel}: ${displayValue}<br/>`;
        continue;
      }
      const dataPoint = dataGroup.value.find(
        (val) => val.time === highlightedTime
      );
      if (dataPoint) {
        tooltipDate = dataPoint.label;
        displayValue = !_.isNull(dataPoint.value)
          ? `${formatNumberFn(dataPoint.value)} ${unit}`
          : "N/A";
        tooltipContent += `${rowLabel}: ${displayValue}<br/>`;
      }
    }
  }
  if (places.length === 1 && dataGroupsDict[places[0]].length === 1) {
    return tooltipDate + tooltipContent;
  } else {
    return `${tooltipDate}<br/>` + tooltipContent;
  }
}

/**
 * Gets the timepoint that the mouse is hovering at. Calculation from https://bl.ocks.org/Qizly/8f6ba236b79d9bb03a80.
 *
 * @param containerId
 * @param xScale
 * @param listOfTimePoints
 */
function getHighlightedTime(
  xScale: d3.ScaleTime<number, number>,
  listOfTimePoints: number[],
  mouseX: number
): number {
  const mouseTime = xScale.invert(mouseX).getTime();
  listOfTimePoints.sort((a, b) => a - b);
  let idx = d3.bisect(listOfTimePoints, mouseTime);
  if (idx > 0 && idx < listOfTimePoints.length) {
    idx =
      listOfTimePoints[idx] - mouseTime > mouseTime - listOfTimePoints[idx - 1]
        ? idx - 1
        : idx;
  } else if (idx === listOfTimePoints.length) {
    idx = idx - 1;
  }
  return listOfTimePoints[idx];
}

/**
 * Adds highlighting and showing a tooltip on hover for a line chart.
 *
 * @param xScale time scale corresponding to the x-axis.
 * @param yScale linear scale corresponding to the y-axis.
 * @param container the div element that holds the line chart we are adding highlighting for.
 * @param dataGroupsDict dictionary of place to datagroups of the line chart of interest.
 * @param colorFn color function that returns a color for a given place and datagroup.
 * @param setOfTimePoints all the timepoints in the dataGroupsDict.
 * @param highlightArea svg element to hold the elements for highlighting points.
 * @param chartAreaBoundary boundary of the chart of interest relative to its container.
 * @param formatNumberFn function to use to format numbers
 * @param unit units of the data of the chart of interest.
 */
function addHighlightOnHover(
  xScale: d3.ScaleTime<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  container: d3.Selection<HTMLDivElement, any, any, any>,
  dataGroupsDict: { [place: string]: DataGroup[] },
  colorFn: (place: string, dataGroup: DataGroup) => string,
  setOfTimePoints: Set<number>,
  highlightArea: d3.Selection<SVGGElement, any, any, any>,
  chartAreaBoundary: Boundary,
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string,
  statVarInfo?: { [key: string]: StatVarInfo }
): void {
  const listOfTimePoints: number[] = Array.from(setOfTimePoints);
  listOfTimePoints.sort((a, b) => a - b);
  addTooltip(container);
  for (const place in dataGroupsDict) {
    const dataGroups = dataGroupsDict[place];
    for (const dataGroup of dataGroups) {
      highlightArea
        .append("circle")
        .attr("r", HIGHLIGHTING_DOT_R)
        .style("fill", colorFn(place, dataGroup))
        .style("stroke", "#fff")
        .datum(dataGroup);
    }
  }
  const tooltip = container.select(`#${TOOLTIP_ID}`);
  highlightArea.style("opacity", "0");
  const highlightLine = highlightArea
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", chartAreaBoundary.bottom)
    .style("stroke", "#3B3B3B")
    .style("stroke-opacity", "0.5");
  const dataGroups: Set<string> = new Set();
  for (const place of Object.keys(dataGroupsDict)) {
    dataGroupsDict[place].forEach((dataGroup) =>
      dataGroups.add(dataGroup.label)
    );
  }
  const rowLabels = getRowLabels(
    dataGroupsDict,
    Array.from(dataGroups),
    statVarInfo
  );
  container
    .on("mouseover", () => {
      highlightArea.style("opacity", "1");
      tooltip.style("display", "block");
    })
    .on("mouseout", () => {
      highlightArea.style("opacity", "0");
      tooltip.style("display", "none");
    })
    .on("mousemove", () => {
      const mouseX = d3.mouse(container.node() as HTMLElement)[0];
      if (mouseX > chartAreaBoundary.right) {
        highlightArea.style("opacity", "0");
        tooltip.style("display", "none");
        return;
      }
      const highlightedTime = getHighlightedTime(
        xScale,
        listOfTimePoints,
        mouseX
      );
      const highlightDots = highlightArea.selectAll("circle");
      const dataPointX = xScale(highlightedTime);
      let minDataPointY = chartAreaBoundary.bottom;
      highlightDots
        .attr("transform", (d: DataGroup) => {
          const dataPoint = d.value.find((val) => val.time === highlightedTime);
          if (dataPoint) {
            const dataPointY = yScale(dataPoint.value);
            minDataPointY = Math.min(minDataPointY, dataPointY);
            return `translate(${dataPointX},${dataPointY})`;
          }
        })
        .style("opacity", (d: DataGroup) => {
          const dataPoint = d.value.find((val) => val.time === highlightedTime);
          if (dataPoint && dataPoint.value !== null) {
            return "1";
          } else {
            return "0";
          }
        });
      highlightLine.attr("transform", () => {
        return `translate(${dataPointX},0)`;
      });
      const tooltipContent = getTooltipContent(
        dataGroupsDict,
        highlightedTime,
        rowLabels,
        formatNumberFn,
        unit
      );
      showTooltip(
        tooltipContent,
        container,
        dataPointX,
        minDataPointY,
        chartAreaBoundary
      );
    });
}

/**
 * Adds an X-Axis to the svg chart. Tick labels will be wrapped if necessary (unless shouldRotate).
 *
 * @param axis: d3-selection with an SVG element to add the x-axis to
 * @param chartHeight: The height of the SVG chart
 * @param xScale: d3-scale for the x-axis
 * @param shouldRotate: true if the x-ticks should be rotated (no wrapping applied).
 * @param labelToLink: optional map of [label] -> link for each ordinal tick
 *
 * @return the height of the x-axis bounding-box.
 */
function addXAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartHeight: number,
  xScale: d3.AxisScale<any>,
  shouldRotate?: boolean,
  labelToLink?: { [label: string]: string },
  singlePointLabel?: string
): number {
  let d3Axis = d3
    .axisBottom(xScale)
    .ticks(NUM_X_TICKS)
    .tickSize(TICK_SIZE)
    .tickSizeOuter(0);
  if (singlePointLabel) {
    d3Axis = d3Axis.tickFormat(() => {
      return singlePointLabel;
    });
  }
  if (shouldRotate && typeof xScale.bandwidth == "function") {
    if (xScale.bandwidth() < 5) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 5 == 0));
    } else if (xScale.bandwidth() < 15) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 3 == 0));
    }
  }

  let heightFromBottom = MARGIN.bottom;
  axis
    .attr("transform", `translate(0, ${chartHeight - heightFromBottom})`)
    .call(d3Axis)
    .call((g) =>
      g
        .selectAll("line")
        .attr("stroke", AXIS_GRID_FILL)
        .attr("stroke-width", "0.5")
    );

  if (labelToLink) {
    axis
      .selectAll(".tick text")
      .attr("data-link", (label: string) => {
        return label in labelToLink ? labelToLink[label] : null;
      })
      .attr("class", "place-tick")
      .style("cursor", "pointer")
      .style("text-decoration", "underline")
      .on("click", function () {
        window.open((<SVGElement>this).dataset.link, "_blank");
      });
  }

  let rotatedAngle = 0;
  if (shouldRotate) {
    heightFromBottom = ROTATE_MARGIN_BOTTOM;
    rotatedAngle = -35;
    axis
      .attr("transform", `translate(0, ${chartHeight - heightFromBottom})`)
      .selectAll("text")
      .style("text-anchor", "end")
      .style("text-rendering", "optimizedLegibility")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", `rotate(${rotatedAngle})`);
  } else if (typeof xScale.bandwidth === "function") {
    const text = axis.selectAll("text");
    text
      .style("fill", AXIS_TEXT_FILL)
      .style("font-family", TEXT_FONT_FAMILY)
      .style("text-rendering", "optimizedLegibility")
      .call(wrap, xScale.bandwidth());

    if (!text.filter("[wrap-overflow='1']").empty()) {
      // Rotate text if overflow occurs even after wrapping.
      rotatedAngle = -45;
      text.style("text-anchor", "end").each(function () {
        const t = this as SVGTextElement;
        const bbox = t.getBBox();
        t.setAttribute(
          "transform",
          `translate(-${bbox.height / 2 + 0}, 3) rotate(${rotatedAngle})`
        );
      });
    }
  }

  let axisHeight = 0;
  // Get the height of the text in the axis by finding the max height out of
  // each individual axis label.
  axis.selectAll("text").each(function () {
    const currentNode = this as SVGTextElement;
    const bbox = currentNode.getBBox();
    let currentHeight = bbox.height;
    // If the label has been rotated, calculate the height of the new bounding
    // box of the rotated label.
    // calculation from: https://stackoverflow.com/questions/3231176/how-to-get-size-of-a-rotated-rectangle
    if (rotatedAngle !== 0) {
      const rotationAngleRad = rotatedAngle * (Math.PI / 180);
      currentHeight =
        Math.abs(bbox.width * Math.sin(rotationAngleRad)) +
        Math.abs(bbox.height * Math.cos(rotationAngleRad));
    }
    axisHeight = Math.max(currentHeight, axisHeight);
  });
  axisHeight += TICK_SIZE;
  if (axisHeight > MARGIN.bottom) {
    axis.attr("transform", `translate(0, ${chartHeight - axisHeight})`);
  } else {
    axisHeight = MARGIN.bottom;
  }
  return axisHeight;
}

/**
 * Updates X-Axis after initial render (with wrapping) and Y-Axis scaling.
 * Mostly updates the domain path to be set to y(0).
 *
 * @param g: d3-selection with an G element that contains the X-Axis
 * @param xHeight: The height of the X-Axis
 * @param chartHeight: The height of the SVG chart
 * @param yScale: d3-scale for the Y-axis
 * @param chartWidth: The width of the SVG chart
 */
function updateXAxis(
  xAxis: d3.Selection<SVGGElement, any, any, any>,
  xAxisHeight: number,
  chartHeight: number,
  yScale: d3.AxisScale<any>
): void {
  const xDomain = xAxis.select(".domain");
  if (yScale.domain()[0] > 0) {
    xDomain.remove();
    return;
  }
  const xDomainPath = xDomain.attr("d");
  xDomain
    .attr("d", xDomainPath.replace(/^M[^,]+,/, `M${MARGIN.left},`))
    .attr("stroke", AXIS_GRID_FILL)
    .attr(
      "transform",
      `translate(0, ${yScale(0) + xAxisHeight - chartHeight})`
    );
}

/**
 * Adds a Y-Axis to the svg chart.
 *
 * @param axis: d3-selection with an SVG element to add the y-axis to
 * @param chartWidth: The width of the SVG chart
 * @param yScale: d3-scale for the y-ayis
 * @param formatNumberFn function to use to format numbers
 * @param textFontFamily name of font-family to set axes-labels to
 * @param unit: optional unit for the tick values
 *
 * @return the width of the y-axis bounding-box. The x-coordinate of the grid starts at this value.
 */
function addYAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartWidth: number,
  yScale: d3.ScaleLinear<any, any>,
  formatNumberFn: (value: number, unit?: string) => string,
  textFontFamily?: string,
  unit?: string
) {
  const tickLength = chartWidth - MARGIN.right - MARGIN.left;
  axis
    .attr("transform", `translate(${tickLength}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS)
        .tickSize(tickLength)
        .tickFormat((d) => {
          return formatNumberFn(d.valueOf(), unit);
        })
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll("line")
        .attr("class", "grid-line")
        .style("stroke", AXIS_GRID_FILL)
        .style("stroke-width", "0.5")
        .style("stroke-opacity", "0.5")
        .style("stroke-dasharray", "2, 2")
    )
    .call((g) =>
      g
        .selectAll("text")
        .attr("x", -tickLength)
        .attr("dy", -4)
        .style("fill", AXIS_TEXT_FILL)
        .style("shape-rendering", "crispEdges")
    );

  if (textFontFamily) {
    axis.call((g) => g.selectAll("text").style("font-family", textFontFamily));
  }
  let maxLabelWidth = 0;
  axis.selectAll("text").each(function () {
    maxLabelWidth = Math.max(
      (<SVGSVGElement>this).getBBox().width,
      maxLabelWidth
    );
  });
  axis.call((g) =>
    g.selectAll("text").attr("transform", `translate(${maxLabelWidth}, 0)`)
  );

  return maxLabelWidth + MARGIN.left + MARGIN.grid;
}

/**
 * Draw histogram. Used for ranking pages. Labels will not be translated - expects translated place names as labels.
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataPoints
 * @param formatNumberFn
 * @param unit
 */
function drawHistogram(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataPoints: DataPoint[],
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string,
  fillColor?: string
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
    undefined,
    unit
  );

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.5);

  const bottomHeight = addXAxis(xAxis, chartHeight, x, true);

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  // Don't set TEXT_FONT_FAMILY for histograms, this causes some resizing
  // of axis labels that results in the labels being cut-off.
  // TODO (juliawu): identify why this is and fix root cause.
  addYAxis(yAxis, chartWidth, y, formatNumberFn, undefined, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const color = fillColor ? fillColor : getColorFn(["A"])("A"); // we only need one color

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

/**
 * Draw stack bar chart.
 *
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataGroups
 * @param formatNumberFn
 * @param unit
 */
function drawStackBarChart(
  containerElement: HTMLDivElement,
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string
): void {
  if (_.isEmpty(dataGroups)) {
    return;
  }
  const labelToLink = {};
  for (const dataGroup of dataGroups) {
    labelToLink[dataGroup.label] = dataGroup.link;
  }

  const keys = dataGroups[0].value.map((dp) => dp.label);
  const data = [];
  for (const dataGroup of dataGroups) {
    const curr: { [property: string]: any } = { label: dataGroup.label };
    for (const dataPoint of dataGroup.value) {
      curr[dataPoint.label] = dataPoint.value;
      curr.dcid = dataPoint.dcid;
    }
    data.push(curr);
  }

  const series = d3.stack().keys(keys).offset(d3.stackOffsetDiverging)(data);
  // clear old chart to redraw over
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  const svg = d3
    .select(containerElement)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const yAxis = svg.append("g").attr("class", "y axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const xAxis = svg.append("g").attr("class", "x axis");
  const tempYAxis = svg.append("g");

  const y = d3
    .scaleLinear()
    .domain([
      d3.min([0, d3.min(series, (d) => d3.min(d, (d1) => d1[0]))]),
      d3.max(series, (d) => d3.max(d, (d1) => d1[1])),
    ])
    .nice()
    .rangeRound([chartHeight - MARGIN.bottom, MARGIN.top]);

  const leftWidth = addYAxis(
    tempYAxis,
    chartWidth,
    y,
    formatNumberFn,
    TEXT_FONT_FAMILY,
    unit
  );

  const x = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(xAxis, chartHeight, x, false, labelToLink);

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  addYAxis(yAxis, chartWidth, y, formatNumberFn, TEXT_FONT_FAMILY, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const color = getColorFn(keys);

  chart
    .selectAll("g")
    .data(series)
    .enter()
    .append("g")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    .data((d) => d)
    .join("rect")
    .classed("g-bar", true)
    .attr("data-dcid", (d) => d.data.dcid)
    .attr("x", (d) => x(String(d.data.label)))
    .attr("y", (d) => (Number.isNaN(d[1]) ? y(d[0]) : y(d[1])))
    .attr("width", x.bandwidth())
    .attr("height", (d) => (Number.isNaN(d[1]) ? 0 : y(d[0]) - y(d[1])));

  appendLegendElem(
    containerElement,
    color,
    dataGroups[0].value.map((dp) => ({
      label: dp.label,
      link: dp.link,
    }))
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}

/**
 * Draw group bar chart.
 * @param containerElement
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataGroups
 * @param formatNumberFn
 * @param unit
 */
function drawGroupBarChart(
  containerElement: HTMLDivElement,
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string
): void {
  if (_.isEmpty(dataGroups)) {
    return;
  }
  const labelToLink = {};
  for (const dataGroup of dataGroups) {
    labelToLink[dataGroup.label] = dataGroup.link;
  }
  const keys = dataGroups[0].value.map((dp) => dp.label);
  const minV = Math.min(
    0,
    Math.min(...dataGroups.map((dataGroup) => dataGroup.min()))
  );
  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  if (maxV === undefined || minV === undefined) {
    return;
  }

  // clear old chart to redraw over
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const yAxis = svg.append("g").attr("class", "y axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const xAxis = svg.append("g").attr("class", "x axis");
  const tempYAxis = svg.append("g");

  const y = d3
    .scaleLinear()
    .domain([minV, maxV])
    .nice()
    .rangeRound([chartHeight - MARGIN.bottom, MARGIN.top]);
  const leftWidth = addYAxis(
    tempYAxis,
    chartWidth,
    y,
    formatNumberFn,
    TEXT_FONT_FAMILY,
    unit
  );

  const x0 = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);
  const bottomHeight = addXAxis(xAxis, chartHeight, x0, false, labelToLink);

  const x1 = d3
    .scaleBand()
    .domain(keys)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  addYAxis(yAxis, chartWidth, y, formatNumberFn, TEXT_FONT_FAMILY, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const colorFn = getColorFn(keys);

  chart
    .append("g")
    .selectAll("g")
    .data(dataGroups)
    .join("g")
    .attr("transform", (dg) => `translate(${x0(dg.label)},0)`)
    .selectAll("rect")
    .data((dg) =>
      dg.value.map((dp) => ({ key: dp.label, value: dp.value, dcid: dp.dcid }))
    )
    .join("rect")
    .classed("g-bar", true)
    .attr("data-dcid", (d) => d.dcid)
    .attr("x", (d) => x1(d.key))
    .attr("y", (d) => y(Math.max(0, d.value)))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => Math.abs(y(0) - y(d.value)))
    .attr("data-d", (d) => d.value)
    .attr("fill", (d) => colorFn(d.key));

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

/**
 * Draw line chart.
 * @param svgContainer
 * @param width
 * @param height
 * @param dataGroups
 * @param showAllDots
 * @param highlightOnHover
 * @param formatNumberFn
 * @param unit
 * @param handleDotClick
 *
 * @return false if any series in the chart was filled in
 */
function drawLineChart(
  svgContainer: HTMLDivElement,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  showAllDots: boolean,
  highlightOnHover: boolean,
  formatNumberFn: (value: number, unit?: string) => string,
  unit?: string,
  handleDotClick?: (dotData: DotDataPoint) => void
): boolean {
  if (_.isEmpty(dataGroups)) {
    return true;
  }
  let maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  let minV = Math.min(...dataGroups.map((dataGroup) => dataGroup.min()));
  if (minV > 0) {
    minV = 0;
  }
  if (maxV == 0) {
    maxV = MAX_Y_FOR_ZERO_CHARTS;
  }

  const svg = d3
    .select(svgContainer)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height);

  const xAxis = svg.append("g").attr("class", "x axis");
  const yAxis = svg.append("g").attr("class", "y axis");
  const highlight = svg.append("g").attr("class", "highlight");
  const chart = svg.append("g").attr("class", "chart-area");

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top])
    .nice(NUM_Y_TICKS);
  const leftWidth = addYAxis(
    yAxis,
    width,
    yScale,
    formatNumberFn,
    TEXT_FONT_FAMILY,
    unit
  );

  const xScale = d3
    .scaleTime()
    .domain(
      d3.extent(
        dataGroups.flatMap((dg) => dg.value),
        (d) => d.time
      )
    )
    .range([leftWidth, width - MARGIN.right]);

  let singlePointLabel = null;
  if (dataGroups[0].value.length === 1) {
    singlePointLabel = dataGroups[0].value[0].label;
  }
  const bottomHeight = addXAxis(
    xAxis,
    height,
    xScale,
    null,
    null,
    singlePointLabel
  );
  updateXAxis(xAxis, bottomHeight, height, yScale);

  const legendText = dataGroups.map((dataGroup) =>
    dataGroup.label ? dataGroup.label : "A"
  );
  const colorFn = getColorFn(legendText);

  let hasFilledInValues = false;
  const timePoints = new Set<number>();
  for (const dataGroup of dataGroups) {
    const dataset = dataGroup.value.map((dp) => {
      if (dp.time) {
        timePoints.add(dp.time);
      }
      return [dp.time, dp.value];
    });
    const hasGap = shouldFillInValues(dataset);
    hasFilledInValues = hasFilledInValues || hasGap;
    const shouldAddDots =
      dataset.length < MIN_POINTS_FOR_DOTS_ON_LINE_CHART || showAllDots;
    const line = d3
      .line()
      .defined((d) => d[1] !== null) // Ignore points that are null
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    if (hasGap) {
      // Draw a second line behind the main line with a different styling to
      // fill in gaps.
      chart
        .append("path")
        .datum(dataset.filter(line.defined())) // Only plot points that are defined
        .attr("class", "line fill")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke-width", "2.5px")
        .style("stroke", colorFn(dataGroup.label))
        .style("opacity", 0.4)
        .style("stroke-dasharray", 2);
    }

    chart
      .append("path")
      .datum(dataset)
      .attr("class", "line")
      .style("stroke", colorFn(dataGroup.label))
      .attr("d", line)
      .style("fill", "none")
      .style("stroke-width", "2.5px")
      .style("stroke", colorFn(dataGroup.label));

    if (shouldAddDots) {
      const dots = chart
        .append("g")
        .selectAll(".dot")
        .data(dataGroup.value)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xScale(d.time))
        .attr("cy", (d) => yScale(d.value))
        .attr("r", (d) => (d.value === null ? 0 : 3))
        .style("fill", colorFn(dataGroup.label))
        .style("stroke", "#fff");
      if (handleDotClick) {
        dots.on("click", handleDotClick);
      }
    }
  }

  if (highlightOnHover) {
    const chartAreaBoundary = {
      bottom: height - bottomHeight,
      left: leftWidth,
      right: width - MARGIN.right,
      top: 0,
    };
    const dataGroupsDict = { [DATAGROUP_UNKNOWN_PLACE]: dataGroups };
    const container: d3.Selection<HTMLDivElement, any, any, any> =
      d3.select(svgContainer);
    const highlightColorFn = (_: string, dataGroup: DataGroup) => {
      return colorFn(dataGroup.label);
    };

    addHighlightOnHover(
      xScale,
      yScale,
      container,
      dataGroupsDict,
      highlightColorFn,
      timePoints,
      highlight,
      chartAreaBoundary,
      formatNumberFn,
      unit
    );
  }

  appendLegendElem(
    svgContainer,
    colorFn,
    dataGroups.map((dg) => ({
      label: dg.label,
      link: dg.link,
    }))
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
  return !hasFilledInValues;
}

/**
 * Returns an array of [min, max] value from the data groups (similar to d3.extent)
 *
 * @param dataGroupsDict
 */
function computeRanges(dataGroupsDict: { [geoId: string]: DataGroup[] }) {
  let dataGroups: DataGroup[];
  let minV = Number.MAX_VALUE;
  let maxV = Number.MIN_VALUE;
  for (const geoId in dataGroupsDict) {
    dataGroups = dataGroupsDict[geoId];
    maxV = Math.max(
      maxV,
      Math.max(...dataGroups.map((dataGroup) => dataGroup.max()))
    );
    minV = Math.min(
      minV,
      Math.min(...dataGroups.map((dataGroup) => dataGroup.min()))
    );
  }
  return [minV, maxV];
}

/**
 * Draw a group of lines chart with in-chart legend given a dataGroupsDict with different geoIds.
 *
 * @param selector selector for the container to draw the chart in
 * @param width: width for the chart.
 * @param height: height for the chart.
 * @param statVarInfos: object from stat var dcid to its info struct.
 * @param dataGroupsDict: data groups for plotting.
 * @param plotParams: contains all plot params for chart.
 * @param formatNumberFn function to use to format numbers
 * @param yLabel label for the y axis
 * @param unit the unit of the measurement.
 * @param modelsDataGroupsDict dict of place to data groups for model datagroups
 */
function drawGroupLineChart(
  selector: string | HTMLDivElement,
  width: number,
  height: number,
  statVarInfos: { [key: string]: StatVarInfo },
  dataGroupsDict: { [place: string]: DataGroup[] },
  plotParams: PlotParams,
  formatNumberFn: (value: number, unit?: string) => string,
  ylabel?: string,
  unit?: string,
  modelsDataGroupsDict?: { [place: string]: DataGroup[] }
): void {
  // Get a non-empty array as dataGroups
  const dataGroupsAll = Object.values(dataGroupsDict).filter(
    (x) => x.length > 0
  );

  let container: d3.Selection<any, any, any, any>;
  if (typeof selector === "string") {
    container = d3.select("#" + selector);
  } else if (selector instanceof HTMLDivElement) {
    container = d3.select(selector);
  } else {
    return;
  }

  container.selectAll("svg").remove();

  const svg = container
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height);

  if (_.isEmpty(dataGroupsAll)) {
    return;
  }
  const legendTextWidth = Math.max(width * LEGEND.ratio, LEGEND.minTextWidth);
  let legendWidth =
    Object.keys(dataGroupsDict).length > 1 &&
    Object.keys(statVarInfos).length > 1
      ? LEGEND.dashWidth + legendTextWidth
      : legendTextWidth;
  legendWidth += LEGEND.marginLeft;

  // Adjust the width of in-chart legends.
  let yRange = computeRanges(dataGroupsDict);
  if (!_.isEmpty(modelsDataGroupsDict)) {
    const modelsRange = computeRanges(modelsDataGroupsDict);
    yRange = [
      Math.min(yRange[0], modelsRange[0]),
      Math.max(yRange[1], modelsRange[1]),
    ];
  }

  const minV = yRange[0];
  let maxV = yRange[1];
  if (minV === maxV) {
    maxV = minV + 1;
  }

  const yAxis = svg.append("g").attr("class", "y axis");
  const xAxis = svg.append("g").attr("class", "x axis");
  const highlight = svg.append("g").attr("class", "highlight");
  const chart = svg.append("g").attr("class", "chart-area");
  const tempYAxis = svg.append("g");

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top + YLABEL.height])
    .nice(NUM_Y_TICKS);

  const leftWidth = addYAxis(
    tempYAxis,
    width - legendWidth,
    yScale,
    formatNumberFn,
    TEXT_FONT_FAMILY,
    unit
  );

  const chartWidth = width - MARGIN.right - legendWidth;
  const allDataPoints = dataGroupsAll
    .flat()
    .map((x) => x.value)
    .flat();
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(allDataPoints, (d) => d.time))
    .range([leftWidth, chartWidth]);

  let singlePointLabel = null;
  if (allDataPoints.length === 1) {
    singlePointLabel = allDataPoints[0].label;
  }

  const bottomHeight = addXAxis(
    xAxis,
    height,
    xScale,
    null,
    null,
    singlePointLabel
  );

  // Update and redraw the y-axis based on the new x-axis height.
  const yPosBottom = height - bottomHeight;
  const yPosTop = MARGIN.top + YLABEL.height;
  yScale.rangeRound([yPosBottom, yPosTop]);
  tempYAxis.remove();
  addYAxis(
    yAxis,
    width - legendWidth,
    yScale,
    formatNumberFn,
    TEXT_FONT_FAMILY,
    unit
  );
  updateXAxis(xAxis, bottomHeight, height, yScale);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.left}, ${YLABEL.topMargin})`)
    .style("font-size", "12px")
    .style("text-rendering", "optimizedLegibility")
    .text(ylabel);

  if (!_.isEmpty(modelsDataGroupsDict)) {
    for (const place in modelsDataGroupsDict) {
      const dGroups = modelsDataGroupsDict[place];
      for (const dataGroup of dGroups) {
        const dataset = dataGroup.value
          .map((dp) => {
            return [dp.time, dp.value];
          })
          .filter((dp) => {
            return dp[1] !== null;
          });
        const line = d3
          .line()
          .x((d) => xScale(d[0]))
          .y((d) => yScale(d[1]));
        const key = place + dataGroup.label.split("-")[0];
        let color = "#ccc";
        color = plotParams.lines[key].color; // super brittle - relies on how new sv's are built for model mmethods

        chart
          .append("path")
          .datum(dataset)
          .attr("class", "line")
          .attr("d", line)
          .style("fill", "none")
          .style("stroke", color)
          .style("stroke-width", "5px")
          .style("stroke-linecap", "round")
          .style("stroke-linejoin", "round")
          .style("opacity", ".1");
      }
    }
  }

  const timePoints = new Set<number>();
  for (const place in dataGroupsDict) {
    const dGroups = dataGroupsDict[place];
    for (const dataGroup of dGroups) {
      const dataset = dataGroup.value
        .map((dp) => {
          timePoints.add(dp.time);
          return [dp.time, dp.value];
        })
        .filter((dp) => {
          return dp[1] !== null;
        });
      const line = d3
        .line()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));
      const lineStyle = plotParams.lines[place + dataGroup.label];

      if (dataset.length > 1) {
        chart
          .append("path")
          .datum(dataset)
          .attr("class", "line")
          .attr("d", line)
          .style("fill", "none")
          .style("stroke", lineStyle.color)
          .style("stroke-width", "2px")
          .style("stroke-dasharray", lineStyle.dash)
          .style("stroke-linecap", "round")
          .style("stroke-linejoin", "round");
      } else {
        chart
          .append("g")
          .selectAll(".dot")
          .data(dataGroup.value)
          .enter()
          .append("circle")
          .attr("class", "dot")
          .attr("cx", (d) => xScale(d.time))
          .attr("cy", (d) => yScale(d.value))
          .attr("r", (d) => (d.value === null ? 0 : 3))
          .style("fill", lineStyle.color)
          .style("stroke", "#fff");
      }
    }
  }

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - legendWidth + LEGEND.marginLeft}, ${
        LEGEND.marginTop
      })`
    );
  buildInChartLegend(legend, plotParams.legend, legendTextWidth);

  // Add highlight on hover
  const chartAreaBoundary = {
    bottom: height - bottomHeight,
    left: leftWidth,
    right: width - legendWidth + LEGEND.marginLeft,
    top: 0,
  };
  const highlightColorFn = (place: string, dataGroup: DataGroup) => {
    return plotParams.lines[place + dataGroup.label].color;
  };
  addHighlightOnHover(
    xScale,
    yScale,
    container,
    dataGroupsDict,
    highlightColorFn,
    timePoints,
    highlight,
    chartAreaBoundary,
    formatNumberFn,
    unit,
    statVarInfos
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}

/**
 * Draw donut chart.
 * @param containerElement Div element to draw chart in
 * @param chartWidth width of chart
 * @param chartHeight height of chart
 * @param dataGroups data to plot
 */
function drawDonutChart(
  containerElement: HTMLDivElement,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[]
): void {
  if (_.isEmpty(dataGroups)) {
    return;
  }
  const labelToLink = {};
  for (const dataGroup of dataGroups) {
    labelToLink[dataGroup.label] = dataGroup.link;
  }
  const keys = dataGroups[0].value.map((dp) => dp.label);
  const colorFn = getColorFn(keys);
  // minimum thickness of the donut, in px
  const minArcThickness = 10;
  // how thickness of donut should scale with donut's radius
  // The larger the number, the thicker the donut
  const arcThicknessRatio = 0.1;
  // how much space to leave on each side of donut, in px
  const margin = 20;

  // Compute donut size based on settings
  const outerRadius = Math.min(chartWidth, chartHeight) / 2 - margin;
  const arcStrokeWidth = Math.max(
    outerRadius * arcThicknessRatio,
    minArcThickness
  );
  const innerRadius = outerRadius - arcStrokeWidth;
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
    });

  console.log(donutData);

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

/**
 * Generate in-chart legend.
 *
 * @param legend: The legend svg selection.
 * @param params: An object keyed by legend text with value of legend style.
 * @param legendTextWidth: The width of the legend text.
 * @param statVarInfo: object from stat var dcid to its info struct.
 */
function buildInChartLegend(
  legend: d3.Selection<SVGGElement, any, any, any>,
  params: { [key: string]: Style },
  legendTextWidth: number
) {
  let yOffset = 0;
  for (const label in params) {
    // Create a group to hold dash line and legend text.
    const legendStyle = params[label];
    const lgGroup = legend
      .append("g")
      .attr("transform", `translate(0, ${yOffset})`);
    let dashWidth = 0;
    if (legendStyle.dash !== undefined) {
      // Draw the dash line.
      lgGroup
        .append("line")
        .attr("class", "legend-line")
        .attr("x1", "0")
        .attr("x2", `${LEGEND.dashWidth - 3}`)
        .style("stroke", LEGEND.defaultColor)
        .style("stroke-dasharray", `${legendStyle.dash}`);
      dashWidth = LEGEND.dashWidth;
    }
    // Draw the text.
    lgGroup
      .append("text")
      .attr("class", "legend-text")
      .attr("transform", `translate(${dashWidth}, 0)`)
      .attr("y", "0.3em")
      .attr("dy", "0")
      .text(label)
      .style("text-rendering", "optimizedLegibility")
      .style("fill", `${legendStyle.color}`)
      .call(wrap, legendTextWidth)
      .on("click", () => {
        if (legendStyle.legendLink) {
          window.open(legendStyle.legendLink);
        }
      });
    yOffset += lgGroup.node().getBBox().height + LEGEND.lineMargin;
  }
}

export {
  appendLegendElem,
  drawDonutChart,
  drawGroupBarChart,
  drawGroupLineChart,
  drawHistogram,
  drawLineChart,
  drawStackBarChart,
};
