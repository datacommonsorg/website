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
import { urlToDomain } from "../shared/util";

import {
  DataGroup,
  DataPoint,
  PlotParams,
  Style,
  getColorFn,
  shouldFillInValues,
  wrap,
} from "./base";
import { formatNumber } from "../i18n/i18n";
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
const SOURCE = {
  topMargin: 15,
  height: 20,
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

const MIN_POINTS_FOR_DOTS_ON_LINE_CHART = 12;
const TOOLTIP_ID = "draw-tooltip";
// min distance between bottom of the tooltip and a datapoint
const TOOLTIP_BOTTOM_OFFSET = 5;
const HIGHLIGHTING_DOT_R = 5;

interface Boundary {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function appendLegendElem(
  elem: string,
  color: d3.ScaleOrdinal<string, string>,
  keys: {
    label: string;
    link?: string;
  }[]
): void {
  d3.select("#" + elem)
    .append("div")
    .attr("class", "legend")
    .selectAll("div")
    .data(keys)
    .join("div")
    .attr("style", (d) => `background: ${color(d.label)}`)
    .append("a")
    .text((d) => d.label)
    .attr("href", (d) => d.link || null);
}

/**
 * Adds tooltip element within a given container.
 *
 * @param containerId container to add tooltip element to.
 */
function addTooltip(containerId: string): void {
  d3.select("#" + containerId)
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
  containerId: string,
  datapointX: number,
  datapointY: number,
  relativeBoundary: Boundary
): void {
  const tooltipSelect = d3
    .select(`#${containerId}`)
    .select(`#${TOOLTIP_ID}`)
    .html(contentHTML);
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
 * Gets the timepoint that the mouse is hovering at. Calculation from https://bl.ocks.org/Qizly/8f6ba236b79d9bb03a80.
 *
 * @param containerId
 * @param xScale
 * @param listOfTimePoints
 */
function getHighlightedTime(
  containerId: string,
  xScale: d3.ScaleTime<number, number>,
  listOfTimePoints: number[]
): number {
  const mouseX = d3.mouse(
    d3.select(`#${containerId}`).node() as HTMLElement
  )[0];
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
 * @param containerId id of the div containing the line chart to add highlighting for.
 * @param dataGroups datagroups of the line chart of interest.
 * @param colorFn color scale that returns a color for a given string.
 * @param listOfTimePoints all the timepoints in the datagroups.
 * @param highlightArea svg element to hold the elements for highlighting points.
 * @param chartAreaBoundary boundary of the chart of interest relative to its container.
 * @param unit units of the data of the chart of interest.
 */
function addHighlightOnHover(
  xScale: d3.ScaleTime<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  containerId: string,
  dataGroups: DataGroup[],
  colorFn: d3.ScaleOrdinal<string, string>,
  listOfTimePoints: number[],
  highlightArea: d3.Selection<SVGGElement, any, any, any>,
  chartAreaBoundary: Boundary,
  unit?: string
): void {
  const svg = d3.select(`#${containerId}`).select("svg");
  addTooltip(containerId);
  for (const dataGroup of dataGroups) {
    highlightArea
      .append("circle")
      .attr("r", HIGHLIGHTING_DOT_R)
      .style("fill", colorFn(dataGroup.label))
      .style("stroke", "#fff")
      .datum(dataGroup);
  }
  const tooltip = d3.select(`#${containerId}`).select(`#${TOOLTIP_ID}`);
  highlightArea.style("opacity", "0");
  const highlightLine = highlightArea
    .append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 0)
    .attr("y2", chartAreaBoundary.bottom)
    .style("stroke", "#3B3B3B")
    .style("stroke-opacity", "0.5");

  svg
    .on("mouseover", () => {
      highlightArea.style("opacity", "1");
      tooltip.style("display", "block");
    })
    .on("mouseout", () => {
      highlightArea.style("opacity", "0");
      tooltip.style("display", "none");
    })
    .on("mousemove", () => {
      const highlightedTime = getHighlightedTime(
        containerId,
        xScale,
        listOfTimePoints
      );
      const highlightDots = highlightArea.selectAll("circle");
      const dataPointX = xScale(highlightedTime);
      let maxDataPointY = 0;
      highlightDots
        .attr("transform", (d: DataGroup) => {
          const dataPoint = d.value.find(
            (dataPoint) =>
              new Date(dataPoint.label).getTime() === highlightedTime
          );
          if (dataPoint) {
            const dataPointY = yScale(dataPoint.value);
            maxDataPointY = Math.max(maxDataPointY, dataPointY);
            return `translate(${dataPointX},${dataPointY})`;
          }
        })
        .style("opacity", (d: DataGroup) => {
          const dataPoint = d.value.find(
            (data) => new Date(data.label).getTime() === highlightedTime
          );
          if (dataPoint && dataPoint.value) {
            return "1";
          } else {
            return "0";
          }
        });
      highlightLine.attr("transform", () => {
        return `translate(${dataPointX},0)`;
      });
      let tooltipContent = "";
      for (const dataGroup of dataGroups) {
        const dataPoint = dataGroup.value.find(
          (val) => new Date(val.label).getTime() === highlightedTime
        );
        if (dataPoint) {
          // TODO(chejennifer): place and timeline explorer will need i18n functions for the tooltip text.
          // Also need to update formatting of the tooltip content for place and timeline explorer.
          tooltipContent =
            tooltipContent +
            `${dataPoint.label}: ${dataPoint.value} ${unit ? unit : ""}<br/>`;
        }
      }
      showTooltip(
        tooltipContent,
        containerId,
        dataPointX,
        maxDataPointY,
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
  labelToLink?: { [label: string]: string }
): number {
  const d3Axis = d3.axisBottom(xScale).ticks(NUM_X_TICKS).tickSizeOuter(0);
  if (shouldRotate && typeof xScale.bandwidth == "function") {
    if (xScale.bandwidth() < 5) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 5 == 0));
    } else if (xScale.bandwidth() < 15) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 3 == 0));
    }
  }

  axis
    .attr("transform", `translate(0, ${chartHeight - MARGIN.bottom})`)
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

  if (shouldRotate) {
    axis
      .attr("transform", `translate(0, ${chartHeight - ROTATE_MARGIN_BOTTOM})`)
      .selectAll("text")
      .style("text-anchor", "end")
      .style("text-rendering", "optimizedLegibility")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-35)");
  } else if (typeof xScale.bandwidth === "function") {
    const text = axis.selectAll("text");
    text
      .style("fill", AXIS_TEXT_FILL)
      .style("font-family", TEXT_FONT_FAMILY)
      .style("text-rendering", "optimizedLegibility")
      .call(wrap, xScale.bandwidth());

    if (!text.filter("[wrap-overflow='1']").empty()) {
      // Rotate text if overflow occurs even after wrapping.
      text.style("text-anchor", "end").each(function (d, i) {
        const t = this as SVGTextElement;
        const bbox = t.getBBox();
        t.setAttribute(
          "transform",
          `translate(-${bbox.height / 2 + 0}, 3) rotate(-45)`
        );
      });
    }
  }

  let axisHeight = axis.node().getBBox().height;
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
  yScale: d3.AxisScale<any>,
  chartWidth?: number
): void {
  const xDomain = xAxis.select(".domain");
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
 * @param unit: optional unit for the tick values
 *
 * @return the width of the y-axis bounding-box. The x-coordinate of the grid starts at this value.
 */
function addYAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartWidth: number,
  yScale: d3.ScaleLinear<any, any>,
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
          return formatNumber(d.valueOf(), unit);
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
        .style("font-family", TEXT_FONT_FAMILY)
        .style("shape-rendering", "crispEdges")
    );

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
 * @param unit
 */
function drawHistogram(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataPoints: DataPoint[],
  unit?: string
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

  const leftWidth = addYAxis(tempYAxis, chartWidth, y, unit);

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(xAxis, chartHeight, x, true);

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  addYAxis(yAxis, chartWidth, y, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y, chartWidth);

  const color = getColorFn(["A"])("A"); // we only need one color

  chart
    .append("g")
    .selectAll("rect")
    .data(dataPoints)
    .join("rect")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(Math.max(0, d.value)))
    .attr("width", x.bandwidth())
    .attr("height", (d) => Math.abs(y(0) - y(d.value)))
    .attr("fill", color);
}

/**
 * Draw single bar chart.
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataPoints
 * @param unit
 */
function drawSingleBarChart(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataPoints: DataPoint[],
  unit?: string
): void {
  /*
  TODO(beets): Fix me with negative value update, or delete me.
  const textList = dataPoints.map((dataPoint) => dataPoint.label);
  const values = dataPoints.map((dataPoint) => dataPoint.value);
  const color = getColorFn(textList);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([MARGIN.left, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(svg, chartHeight, x);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(values)])
    .nice()
    .rangeRound([chartHeight - bottomHeight, MARGIN.top]);

  addYAxis(svg, chartWidth, y, unit);

  svg
    .append("g")
    .selectAll("rect")
    .data(dataPoints)
    .join("rect")
    .classed("g-bar", true)
    .attr("data-dcid", (d) => d.dcid)
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) => color(d.label));
    */
}

/**
 * Draw stack bar chart.
 *
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataGroups
 * @param unit
 */
function drawStackBarChart(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
  unit?: string
): void {
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

  const y = d3
    .scaleLinear()
    .domain([
      d3.min([0, d3.min(series, (d) => d3.min(d, (d1) => d1[0]))]),
      d3.max(series, (d) => d3.max(d, (d1) => d1[1])),
    ])
    .nice()
    .rangeRound([chartHeight - MARGIN.bottom, MARGIN.top]);

  const leftWidth = addYAxis(tempYAxis, chartWidth, y, unit);

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
  addYAxis(yAxis, chartWidth, y, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y, chartWidth);

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
    id,
    color,
    dataGroups[0].value.map((dp) => ({
      label: dp.label,
      link: dp.link,
    }))
  );
}

/**
 * Draw group bar chart.
 *
 * @param id
 * @param chartWidth
 * @param chartHeight
 * @param dataGroups
 * @param unit
 */
function drawGroupBarChart(
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
  unit?: string
): void {
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

  const y = d3
    .scaleLinear()
    .domain([minV, maxV])
    .nice()
    .rangeRound([chartHeight - MARGIN.bottom, MARGIN.top]);
  const leftWidth = addYAxis(tempYAxis, chartWidth, y, unit);

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
  addYAxis(yAxis, chartWidth, y, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y, chartWidth);

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
    id,
    colorFn,
    dataGroups[0].value.map((dp) => ({
      label: dp.label,
      link: dp.link,
    }))
  );
}

/**
 * Draw line chart.
 * @param id
 * @param width
 * @param height
 * @param dataGroups
 * @param showAllDots
 * @param highlightOnHover
 * @param unit
 * @param handleDotClick
 *
 * @return false if any series in the chart was filled in
 */
function drawLineChart(
  id: string,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  showAllDots: boolean,
  highlightOnHover: boolean,
  unit?: string,
  handleDotClick?: (dotData: DotDataPoint) => void
): boolean {
  let maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  let minV = Math.min(...dataGroups.map((dataGroup) => dataGroup.min()));
  if (minV > 0) {
    minV = 0;
  }
  if (maxV == 0) {
    maxV = MAX_Y_FOR_ZERO_CHARTS;
  }

  const svg = d3
    .select("#" + id)
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
  const leftWidth = addYAxis(yAxis, width, yScale, unit);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([leftWidth, width - MARGIN.right]);

  const bottomHeight = addXAxis(xAxis, height, xScale);
  updateXAxis(xAxis, bottomHeight, height, yScale, width);

  const legendText = dataGroups.map((dataGroup) =>
    dataGroup.label ? dataGroup.label : "A"
  );
  const colorFn = getColorFn(legendText);

  let hasFilledInValues = false;
  const timePoints = new Set<number>();
  for (const dataGroup of dataGroups) {
    const dataset = dataGroup.value.map((dp) => {
      const time = new Date(dp.label).getTime();
      timePoints.add(time);
      return [time, dp.value];
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
      const dotsDataset: DotDataPoint[] = dataGroup.value.map((dp) => {
        return {
          label: dp.label,
          time: new Date(dp.label).getTime(),
          value: dp.value,
        };
      });
      const dots = chart
        .append("g")
        .selectAll(".dot")
        .data(dotsDataset)
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
    const listOfTimePoints: number[] = Array.from(timePoints);
    listOfTimePoints.sort((a, b) => a - b);
    const chartAreaBoundary = {
      top: 0,
      bottom: height - bottomHeight,
      left: leftWidth,
      right: width - MARGIN.right,
    };

    addHighlightOnHover(
      xScale,
      yScale,
      id,
      dataGroups,
      colorFn,
      listOfTimePoints,
      highlight,
      chartAreaBoundary,
      unit
    );
  }

  appendLegendElem(
    id,
    colorFn,
    dataGroups.map((dg) => ({
      label: dg.label,
      link: dg.link,
    }))
  );
  return !hasFilledInValues;
}

/**
 * Return a Range object defined above.
 *
 * @param dataGroupsDict
 */
function computeRanges(dataGroupsDict: { [geoId: string]: DataGroup[] }) {
  const range = {
    minV: 0,
    maxV: 0,
  };

  let dataGroups: DataGroup[];
  let maxV = 0;
  let minV = 0; // calculate the min value when its less than 0
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
  range.maxV = maxV;
  range.minV = minV;
  return range;
}

/**
 * Draw a group of lines chart with in-chart legend given a dataGroupsDict with different geoIds.
 *
 * @param id: DOM id.
 * @param width: width for the chart.
 * @param height: height for the chart.
 * @param statsVarsTitle: object from stats var dcid to display title.
 * @param dataGroupsDict: data groups for plotting.
 * @param plotParams: contains all plot params for chart.
 * @param sources: an array of source domain.
 * @param unit the unit of the measurement.
 */
function drawGroupLineChart(
  selector: string | HTMLDivElement,
  width: number,
  height: number,
  statsVarsTitle: { [key: string]: string },
  dataGroupsDict: { [place: string]: DataGroup[] },
  plotParams: PlotParams,
  ylabel?: string,
  sources?: string[],
  unit?: string
): void {
  // Get a non-empty array as dataGroups
  const dataGroupsAll = Object.values(dataGroupsDict).filter(
    (x) => x.length > 0
  );
  let dataGroups = dataGroupsAll[0];
  const legendTextdWidth = Math.max(width * LEGEND.ratio, LEGEND.minTextWidth);
  const legendWidth =
    Object.keys(dataGroupsDict).length > 1 &&
    Object.keys(statsVarsTitle).length > 1
      ? LEGEND.dashWidth + legendTextdWidth
      : legendTextdWidth;

  // Adjust the width of in-chart legends.
  const yRange = computeRanges(dataGroupsDict);
  const minV = yRange.minV;
  let maxV = yRange.maxV;
  if (minV === maxV) {
    maxV = minV + 1;
  }

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
    .attr("height", height + SOURCE.height);

  const yAxis = svg.append("g").attr("class", "y axis");
  const xAxis = svg.append("g").attr("class", "x axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const tempYAxis = svg.append("g");

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top + YLABEL.height])
    .nice(NUM_Y_TICKS);

  const leftWidth = addYAxis(tempYAxis, width - legendWidth, yScale, unit);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([leftWidth, width - MARGIN.right - legendWidth]);

  const bottomHeight = addXAxis(xAxis, height, xScale);

  // Update and redraw the y-axis based on the new x-axis height.
  yScale.rangeRound([height - bottomHeight, MARGIN.top + YLABEL.height]);
  tempYAxis.remove();
  addYAxis(yAxis, width - legendWidth, yScale, unit);
  updateXAxis(xAxis, bottomHeight, height, yScale, width - legendWidth);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.left}, ${YLABEL.topMargin})`)
    .style("font-size", "12px")
    .style("text-rendering", "optimizedLegibility")
    .text(ylabel);

  for (const place in dataGroupsDict) {
    dataGroups = dataGroupsDict[place];
    for (const dataGroup of dataGroups) {
      const dataset = dataGroup.value.map((dp) => [
        new Date(dp.label).getTime(),
        dp.value,
      ]);
      const line = d3
        .line()
        .defined((d) => d[1] != null)
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));
      const lineStyle =
        plotParams.lines[place + statsVarsTitle[dataGroup.label]];
      chart
        .append("path")
        .datum(dataset)
        .attr("class", "line")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", lineStyle.color)
        .style("stroke-width", "2px")
        .style("stroke-dasharray", lineStyle.dash);
    }
  }
  // add source info to the chart
  if (sources) {
    const domains = new Set(
      sources.map((source) => urlToDomain(source)).filter(Boolean)
    );
    const sourceText = "Data source: " + Array.from(domains).join(", ");
    svg
      .append("text")
      .attr("class", "label")
      .attr(
        "transform",
        `translate(${MARGIN.left}, ${height + SOURCE.topMargin})`
      )
      .style("fill", "#808080")
      .style("font-size", "12px")
      .style("text-anchor", "start")
      .style("text-rendering", "optimizedLegibility")
      .text(sourceText);
  }

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${width - legendWidth + LEGEND.marginLeft}, ${
        LEGEND.marginTop
      })`
    );
  buildInChartLegend(legend, plotParams.legend, legendTextdWidth);
}

/**
 * Generate in-chart legend.
 *
 * @param legend: The legend svg selection.
 * @param params: An object keyed by legend text with value of legend style.
 * @param legendTextdWidth: The width of the legend text.
 */
function buildInChartLegend(
  legend: d3.Selection<SVGGElement, any, any, any>,
  params: { [key: string]: Style },
  legendTextdWidth: number
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
      .call(wrap, legendTextdWidth);
    yOffset += lgGroup.node().getBBox().height + LEGEND.lineMargin;
  }
}

export {
  appendLegendElem,
  drawGroupBarChart,
  drawGroupLineChart,
  drawHistogram,
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  wrap,
};
