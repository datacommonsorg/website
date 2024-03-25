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
 * Functions to draw a line tile
 */

import * as d3 from "d3";
import _ from "lodash";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { formatNumber } from "../i18n/i18n";
import { StatVarInfo } from "../shared/stat_var";
import { Boundary } from "../shared/types";
import { DataGroup, getColorFn, PlotParams, shouldFillInValues } from "./base";
import {
  LEGEND,
  LEGEND_HIGHLIGHT_CLASS,
  MARGIN,
  NUM_X_TICKS,
  NUM_Y_TICKS,
  SVGNS,
  TEXT_FONT_FAMILY,
  XLINKNS,
} from "./draw_constants";
import {
  addChartTitle,
  addTooltip,
  addXAxis,
  addYAxis,
  appendLegendElem,
  appendSvgLegendElem,
  buildInChartLegend,
  computeRanges,
  getLegendKeyFn,
  getRowLabels,
  updateXAxis,
} from "./draw_utils";
import { GroupLineChartOptions, LineChartOptions } from "./types";

// if building a datagroup dictionary and the place for a datagroup is
// unknown, use this as the place.
const DATAGROUP_UNKNOWN_PLACE = "unknown";
const HIGHLIGHTING_DOT_R = 5;
// Max Y value used for y domains for charts that have only 0 values.
const MAX_Y_FOR_ZERO_CHARTS = 10;
const MIN_POINTS_FOR_DOTS_ON_LINE_CHART = 12;
const YLABEL = {
  topMargin: 10,
  height: 15,
};
// min distance between bottom of the tooltip and a datapoint
const TOOLTIP_BOTTOM_OFFSET = 5;
const HIGHLIGHT_DATE_CLASS = "highlight-date";

/**
 * Gets the html content of a tooltip
 *
 * @param dataGroupsDict mapping of place to datagroups from which the html content will be generated from.
 * @param highlightedTime the timepoint we are showing a tooltip for.
 * @param dataLabels: mapping of place to mapping of datagroup to row label
 * @param unit units for the data.
 */
function getTooltipContent(
  dataGroupsDict: { [place: string]: DataGroup[] },
  highlightedTime: number,
  rowLabels: { [place: string]: { [dataGroup: string]: string } },
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
          ? formatNumber(dataPoint.value, unit)
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
 * Position and show the tooltip.
 *
 * @param contentHTML innerHTML of the tooltip as a string.
 * @param tooltipDiv div containing the tooltip.
 * @param datapointX x coordinate of the datapoint that the tooltip is being shown for.
 * @param datapointY y coordinate of the datapoint that the tooltip is being shown for.
 * @param relativeBoundary tooltip boundary relative to its container element.
 */
export function showTooltip(
  contentHTML: string,
  tooltipDiv: d3.Selection<HTMLDivElement, any, any, any>,
  datapointX: number,
  datapointY: number,
  relativeBoundary: Boundary
): void {
  const rect = (tooltipDiv.node() as HTMLDivElement).getBoundingClientRect();
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
  tooltipDiv.html(contentHTML);
  tooltipDiv.style("left", left + "px").style("top", top + "px");
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
  unit?: string,
  statVarInfo?: { [key: string]: StatVarInfo }
): void {
  const listOfTimePoints: number[] = Array.from(setOfTimePoints);
  listOfTimePoints.sort((a, b) => a - b);
  const tooltip = addTooltip(container);
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
      // Hide any dots that were originally highlighted on the chart
      container.selectAll(`.${HIGHLIGHT_DATE_CLASS}`).style("display", "none");
      highlightArea.style("opacity", "1");
      tooltip.style("display", "block");
    })
    .on("mouseout", () => {
      // Restore the original highlighted dots
      container.selectAll(`.${HIGHLIGHT_DATE_CLASS}`).style("display", "block");
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
        unit
      );
      showTooltip(
        tooltipContent,
        tooltip,
        dataPointX,
        minDataPointY,
        chartAreaBoundary
      );
    });
}

/**
 * Get the d3 time interval that corresponds with the time scale to use for
 * x-axis labels. Returns undefined if no setting is provided.
 * @param setting time setting set by user
 */
function getTickFormatFn(
  timeScale: string
): (date: Date) => string | undefined {
  if (!timeScale) {
    return;
  }

  switch (timeScale.toLowerCase()) {
    case "year":
      return d3.timeFormat("%Y");
    case "month":
      return d3.timeFormat("%Y-%m");
    case "day":
      return d3.timeFormat("%Y-%m-%d");
    default:
      return;
  }
}

/**
 * Draw line chart.
 * @param svgContainer
 * @param width
 * @param height
 * @param dataGroups
 * @param highlightOnHover
 * @param options
 *
 * @return false if any series in the chart was filled in
 */
export function drawLineChart(
  svgContainer: HTMLDivElement,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  highlightOnHover: boolean,
  options?: LineChartOptions
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
  // wrapper div for chart area, used as bounds for tooltip
  const svgWrapper = d3.select(svgContainer).append("div");
  // create svg
  const svg = svgWrapper
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height);

  const xAxis = svg.append("g").attr("class", "x axis");
  const yAxis = svg.append("g").attr("class", "y axis");
  const highlight = svg.append("g").attr("class", "highlight");
  const chart = svg.append("g").attr("class", "chart-area");

  let marginTop = MARGIN.top;
  if (options?.title) {
    marginTop += addChartTitle(svg, options?.title, width);
  }

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, marginTop])
    .nice(NUM_Y_TICKS);
  const leftWidth = addYAxis(
    yAxis,
    width,
    yScale,
    TEXT_FONT_FAMILY,
    options?.unit
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

  const tickFormatFn = getTickFormatFn(options?.timeScale);

  // If using a custom timescale setting and there are fewer points than
  // NUM_X_TICKS, only use one tick-mark per point. This prevents duplicate
  // dates showing up on the x-axis.
  const numPointsInLongestLine = Math.max(
    ...dataGroups.map((dataGroup) => dataGroup.value.length)
  );
  const numPointsToShow =
    options?.timeScale && Math.min(numPointsInLongestLine, NUM_X_TICKS);

  const bottomHeight = addXAxis(
    xAxis,
    height,
    xScale,
    null,
    null,
    singlePointLabel,
    options?.apiRoot,
    tickFormatFn,
    numPointsToShow
  );
  updateXAxis(xAxis, bottomHeight, height, yScale);

  const legendText = dataGroups.map((dataGroup) =>
    dataGroup.label ? dataGroup.label : "A"
  );
  const legendKeyFn = getLegendKeyFn(legendText);
  const colorFn = getColorFn(legendText, options?.colors);

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
    // If there is a specific date to be highlighted on the chart, don't show
    // any other dots unless options.showAllDots is set.
    const shouldAddDots =
      (!options.highlightDate &&
        dataset.length < MIN_POINTS_FOR_DOTS_ON_LINE_CHART) ||
      options.showAllDots;
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
        .attr("part", () =>
          ["series-fill", `series-fill-variable-${dataGroup.label}`].join(" ")
        )
        .style("fill", "none")
        .style("stroke-width", "2.5px")
        .style("stroke", colorFn(dataGroup.label))
        .style("opacity", 0.4)
        .style("stroke-dasharray", 2);
    }
    chart
      .append("path")
      .datum(dataset)
      .attr(
        "class",
        `line ${LEGEND_HIGHLIGHT_CLASS} ${legendKeyFn(dataGroup.label)}`
      )
      .attr("d", line)
      .attr("part", (d) =>
        ["series", `series-variable-${dataGroup.label}`].join(" ")
      )
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
        .attr(
          "class",
          `dot ${LEGEND_HIGHLIGHT_CLASS} ${legendKeyFn(dataGroup.label)}`
        )
        .attr("cx", (d) => xScale(d.time))
        .attr("cy", (d) => yScale(d.value))
        .attr("part", (d) =>
          ["series-point", `series-point-variable-${dataGroup.label}`].join(" ")
        )
        .attr("r", (d) => (d.value === null ? 0 : 3))
        .style("fill", colorFn(dataGroup.label))
        .style("stroke", "#fff");
      if (options?.handleDotClick) {
        dots.on("click", options?.handleDotClick);
      }
    }

    if (options.highlightDate) {
      const highlightedDot = dataGroup.value.find(
        (dp) =>
          dp.label === options.highlightDate ||
          dp.date === options.highlightDate
      );
      chart
        .insert("circle", ":first-child")
        .attr("class", HIGHLIGHT_DATE_CLASS)
        .attr("r", HIGHLIGHTING_DOT_R)
        .style("fill", colorFn(dataGroup.label))
        .style("stroke", "#fff")
        .attr("cx", xScale(highlightedDot.time))
        .attr("cy", yScale(highlightedDot.value));
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
    const highlightColorFn = (_: string, dataGroup: DataGroup) => {
      return colorFn(dataGroup.label);
    };

    addHighlightOnHover(
      xScale,
      yScale,
      svgWrapper,
      dataGroupsDict,
      highlightColorFn,
      timePoints,
      highlight,
      chartAreaBoundary,
      options?.unit
    );
  }

  const legendItems = dataGroups.map((dg) => ({
    label: dg.label,
    link: dg.link,
    index: legendKeyFn(dg.label),
  }));
  if (options?.useSvgLegend) {
    appendSvgLegendElem(svg, height, width, colorFn, legendItems);
  } else {
    appendLegendElem(svgContainer, colorFn, legendItems, options?.apiRoot);
  }
  svg.attr("class", ASYNC_ELEMENT_CLASS);
  return !hasFilledInValues;
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
 * @param yLabel label for the y axis
 * @param unit the unit of the measurement.
 * @param modelsDataGroupsDict dict of place to data groups for model datagroups
 */
export function drawGroupLineChart(
  selector: string | HTMLDivElement,
  width: number,
  height: number,
  statVarInfos: { [key: string]: StatVarInfo },
  dataGroupsDict: { [place: string]: DataGroup[] },
  plotParams: PlotParams,
  options?: GroupLineChartOptions
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
  if (!_.isEmpty(options?.modelsDataGroupsDict)) {
    const modelsRange = computeRanges(options?.modelsDataGroupsDict);
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
    TEXT_FONT_FAMILY,
    options?.unit
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
    singlePointLabel,
    options?.apiRoot
  );

  // Update and redraw the y-axis based on the new x-axis height.
  const yPosBottom = height - bottomHeight;
  const yPosTop = MARGIN.top + YLABEL.height;
  yScale.rangeRound([yPosBottom, yPosTop]);
  tempYAxis.remove();
  addYAxis(yAxis, width - legendWidth, yScale, TEXT_FONT_FAMILY, options?.unit);
  updateXAxis(xAxis, bottomHeight, height, yScale);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.left}, ${YLABEL.topMargin})`)
    .style("font-size", "12px")
    .style("text-rendering", "optimizedLegibility")
    .text(options?.ylabel);

  if (!_.isEmpty(options?.modelsDataGroupsDict)) {
    for (const place in options?.modelsDataGroupsDict) {
      const dGroups = options?.modelsDataGroupsDict[place];
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
    options?.unit,
    statVarInfos
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}
