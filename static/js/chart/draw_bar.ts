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
 * Functions to draw the different variations of bar tile
 */

import * as d3 from "d3";
import _ from "lodash";

import { ASYNC_ELEMENT_CLASS } from "../constants/css_constants";
import { formatNumber } from "../i18n/i18n";
import { Boundary } from "../shared/types";
import { DataGroup, getColorFn } from "./base";
import {
  AXIS_TEXT_FILL,
  MARGIN,
  NUM_Y_TICKS,
  SVGNS,
  TEXT_FONT_FAMILY,
  XLINKNS,
} from "./draw_constants";
import {
  addTooltip,
  addXAxis,
  addYAxis,
  appendLegendElem,
  getDisplayUnitAndLabel,
  updateXAxis,
} from "./draw_utils";
import { ChartOptions, HorizontalBarChartOptions } from "./types";

// Horizontal bar chart default style
export const HORIZONTAL_BAR_CHART = {
  barHeight: 30,
  marginBottom: 10,
  marginLeft: 80,
  marginRight: 30,
  marginTop: 30,
};
// Extra amount to shift axes tick labels by to account for the actual tick line
const TICK_LABEL_PADDING = 10;
// distance in both x and y a tooltip should be from mouse location, in px
const TOOLTIP_OFFSET = 10;

/**
 * Get the content to display in a tooltip for a given chart element
 * @param element chart element to get tooltip content for
 */
function getTooltipContent(
  element: d3.Selection<d3.BaseType, any, any, any>
): string {
  const data = element.data().at(0);
  const value = formatNumber(data.value);
  const unit = data.unit ? ` ${data.unit}` : "";
  return `
  ${data.place}<br />
  ${data.statVar} (${data.date}): ${value}${unit}
  `;
}

/**
 * Get the top and left position of the tooltip.
 * Places the tooltip opposite to where the mouse is relative to the chart
 * boundary. Ex: if mouse is in top left, tooltip is to the bottom right.
 *
 * @param mouseX X-coord of mouse location
 * @param mouseY Y-coord of mouse location
 * @param tooltipHeight height of the tooltip, in px
 * @param tooltipWidth width of the tooltip, in px
 * @param relativeBoundary Boundary the tooltip should be confined to
 * @returns top and left position, in that order
 */
function getTooltipPositionByMouseQuadrant(
  mouseX: number,
  mouseY: number,
  tooltipHeight: number,
  tooltipWidth: number,
  relativeBoundary: Boundary
): [number, number] {
  let top = 0;
  let left = 0;
  const yMidpoint = (relativeBoundary.bottom - relativeBoundary.top) / 2;
  const xMidpoint = (relativeBoundary.right - relativeBoundary.left) / 2;
  if (mouseX < xMidpoint) {
    if (mouseY < yMidpoint) {
      // Mouse in top left corner, place tooltip to bottom right
      top = mouseY + TOOLTIP_OFFSET;
      left = mouseX + TOOLTIP_OFFSET;
    } else {
      // Mouse in bottom left corner, place tooltip to top right
      top = mouseY - tooltipHeight - TOOLTIP_OFFSET;
      left = mouseX + TOOLTIP_OFFSET;
    }
  } else {
    if (mouseY < yMidpoint) {
      // Mouse in top right corner, place tooltip to bottom left
      top = mouseY + TOOLTIP_OFFSET;
      left = mouseX - tooltipWidth - TOOLTIP_OFFSET;
    } else {
      // Mouse in bottom right corner, place tooltip to top left
      top = mouseY - tooltipHeight - TOOLTIP_OFFSET;
      left = mouseX - tooltipWidth - TOOLTIP_OFFSET;
    }
  }
  return [top, left];
}

/**
 * Position and show the tooltip.
 *
 * @param tooltipDiv tooltip's div element
 * @param datapointX x coordinate of the datapoint that the tooltip is being shown for.
 * @param datapointY y coordinate of the datapoint that the tooltip is being shown for.
 * @param relativeBoundary tooltip boundary relative to its container element.
 */
export function positionTooltip(
  tooltipDiv: d3.Selection<HTMLDivElement, any, any, any>,
  datapointX: number,
  datapointY: number,
  relativeBoundary: Boundary
): void {
  const rect = (tooltipDiv.node() as HTMLDivElement).getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const [top, left] = getTooltipPositionByMouseQuadrant(
    datapointX,
    datapointY,
    height,
    width,
    relativeBoundary
  );
  tooltipDiv.style("left", left + "px").style("top", top + "px");
}

/**
 * Adds highlighting and showing a tooltip on hover for bar charts
 *
 * @param chartAreaBoundary boundary of the chart of interest relative to its container.
 * @param container the div element that holds the bar chart we are adding highlighting for.
 * @param svg the svg element that holds the drawn chart elements
 */
function addHighlightOnHover(
  chartAreaBoundary: Boundary,
  container: d3.Selection<HTMLDivElement, any, any, any>,
  svg: d3.Selection<SVGSVGElement, any, any, any>
): void {
  const tooltip = addTooltip(container);
  let hideFn: ReturnType<typeof setTimeout> = null;

  // define tooltip mouse behavior
  const mouseoverFn = function () {
    if (hideFn) {
      clearTimeout(hideFn);
    }
    tooltip.style("display", "block");
    const tooltipContent = getTooltipContent(d3.select(this));
    tooltip.html(tooltipContent);
    // highlight just the bar or lollipop selected
    svg.selectAll("rect, circle").style("opacity", 0.5);
    d3.select(this).style("opacity", 1);
  };
  const mouseoutFn = function () {
    // Slightly delay hiding tooltip and resetting styling so quickly mousing
    // over a stream of bars doesn't result in the tooltip flickering in and out
    hideFn = setTimeout(() => {
      svg.selectAll("rect, circle").style("opacity", 1);
      tooltip.style("display", "none");
    }, 200);
  };
  const mousemoveFn = function () {
    const [mouseX, mouseY] = d3.mouse(container.node() as HTMLElement);
    positionTooltip(tooltip, mouseX, mouseY, chartAreaBoundary);
  };

  // Add tooltip to bars and lollipop circles
  svg
    .selectAll("rect, circle")
    .on("mouseover", mouseoverFn)
    .on("mouseout", mouseoutFn)
    .on("mousemove", mousemoveFn);
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
export function drawStackBarChart(
  containerElement: HTMLDivElement,
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
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
  const data = [];
  for (const dataGroup of dataGroups) {
    const curr: { [property: string]: any } = { label: dataGroup.label };
    for (const dataPoint of dataGroup.value) {
      curr[dataPoint.label] = dataPoint.value;
      curr.dcid = dataPoint.dcid;
      curr.date = dataPoint.date;
      curr.value = dataPoint.value;
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
    TEXT_FONT_FAMILY,
    options?.unit
  );

  const x = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(
    xAxis,
    chartHeight,
    x,
    false,
    labelToLink,
    null,
    options?.apiRoot
  );

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  addYAxis(yAxis, chartWidth, y, TEXT_FONT_FAMILY, options?.unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const colorOrder = options?.statVarColorOrder || keys;
  const colorFn = getColorFn(colorOrder, options?.colors);

  const setData = (d: d3.Series<{ [key: string]: number }, string>) => {
    return d.map((item) => ({
      date: item.data.date,
      place: item.data.label,
      statVar: d.key,
      unit: options?.unit,
      value: item.data.value,
      ...item,
    }));
  };

  if (options?.lollipop) {
    // How much to shift stems so they plot at center of band
    const xShift = x.bandwidth() / 2;

    // draw lollipop stems
    chart
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("stroke", (d) => colorFn(d.key))
      .selectAll("line")
      .data(setData)
      .join("line")
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("data-d", (d) => d.data.value)
      .attr("stroke-width", 2)
      .attr("x1", (d) => x(String(d.data.label)) + xShift)
      .attr("x2", (d) => x(String(d.data.label)) + xShift)
      .attr("y1", (d) => y(d[0]))
      .attr("y2", (d) => y(d[1]));

    // draw circles
    chart
      .append("g")
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", (d) => colorFn(d.key))
      .selectAll("circle")
      .data(setData)
      .join("circle")
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("data-d", (d) => d.data.value)
      .attr("r", 6)
      .attr("cx", (d) => x(String(d.data.label)) + xShift)
      .attr("cy", (d) => y(d[1]));
  } else {
    // draw bars
    chart
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", (d) => colorFn(d.key))
      .selectAll("rect")
      .data(setData)
      .join("rect")
      .classed("g-bar", true)
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("x", (d) => x(String(d.data.label)))
      .attr("y", (d) => (Number.isNaN(d[1]) ? y(d[0]) : y(d[1])))
      .attr("width", x.bandwidth())
      .attr("height", (d) => (Number.isNaN(d[1]) ? 0 : y(d[0]) - y(d[1])));
  }

  if (options?.showTooltipOnHover) {
    const chartAreaBoundary = {
      bottom: chartHeight - bottomHeight,
      left: leftWidth,
      right: chartWidth - MARGIN.right,
      top: 0,
    };
    addHighlightOnHover(chartAreaBoundary, container, svg);
  }

  appendLegendElem(
    containerElement,
    colorFn,
    dataGroups[0].value.map((dp) => ({
      dcid: dp.dcid,
      label: dp.label,
      link: dp.link,
    })),
    options?.apiRoot
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}

/**
 * Helper function for plotting dataGroups with rectangular bars.
 * Used by bar charts to render data in classic bar style.
 * @param chart SVG element to draw bars in
 * @param colorFn color scale mapping legend labels to colors
 * @param dataGroups grouped data values to plot
 * @param xScale main scale for x-axis values
 * @param xSubScale sub-scale for a single group of bars
 * @param yScale  scale for y-axis values
 * @param unit data's unit of measurement to show in tooltip
 */
function drawBars(
  chart: d3.Selection<SVGElement, unknown, null, undefined>,
  colorFn: d3.ScaleOrdinal<string, string, never>,
  dataGroups: DataGroup[],
  xScale: d3.ScaleBand<string>,
  xSubScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number, never>,
  unit?: string
): void {
  chart
    .append("g")
    .selectAll("g")
    .data(dataGroups)
    .join("g")
    .attr("transform", (dg) => `translate(${xScale(dg.label)},0)`)
    .selectAll("rect")
    .data((dg) =>
      dg.value.map((dp) => ({
        statVar: dp.label,
        value: dp.value,
        dcid: dp.dcid,
        place: dg.label,
        date: dp.date,
        unit,
      }))
    )
    .join("rect")
    .classed("g-bar", true)
    .attr("part", (d) =>
      [
        "series",
        `series-place-${d.dcid}`,
        `series-variable-${d.statVar}`,
        `series-place-${d.dcid}-variable-${d.statVar}`,
      ].join(" ")
    )
    .attr("data-dcid", (d) => d.dcid)
    .attr("x", (d) => xSubScale(d.statVar))
    .attr("y", (d) => yScale(Math.max(0, d.value)))
    .attr("width", xSubScale.bandwidth())
    .attr("height", (d) => Math.abs(yScale(0) - yScale(d.value)))
    .attr("fill", (d) => colorFn(d.statVar));
}

/**
 * Helper function for horizontally plotting dataGroups in a set of axes.
 *
 * @param chart SVG element to draw lollipops in
 * @param colorFn color scale mapping legend labels to colors
 * @param dataGroups grouped data values to plot
 * @param xScale main scale for x-axis values
 * @param xSubScale sub-scale for a single group of lollipops
 * @param yScale  scale for y-axis values
 * @param useLollipop whether to use lollipop style
 * @param unit data's unit of measurement to show in tooltip
 */
function drawHorizontalGroupedBars(
  chart: d3.Selection<SVGElement, unknown, null, undefined>,
  colorFn: d3.ScaleOrdinal<string, string, never>,
  dataGroups: DataGroup[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleBand<string>,
  useLollipop?: boolean,
  unit?: string
): void {
  const numGroups = dataGroups[0].value.length;
  const setData = (dg: DataGroup) => {
    return dg.value.map((dgv) => ({
      dataGroupValue: dgv,
      label: dg.label,
      statVar: dgv.label,
      value: dgv.value,
      place: dg.label,
      date: dgv.date,
      unit,
    }));
  };
  if (useLollipop) {
    // Max allowable stem spacing
    const maxStemSpacing = yScale.bandwidth() / (numGroups + 1);
    // How far apart each stem should be
    const stemSpacing = Math.min(15, maxStemSpacing);
    // How far down bandwidth to start drawing stems
    const bandwidthPadding =
      ((numGroups + 1) * (maxStemSpacing - stemSpacing)) / 2;
    // draw lollipop stems
    chart
      .append("g")
      .selectAll("g")
      .data(dataGroups)
      .join("g")
      .selectAll("line")
      .data(setData)
      .join("line")
      .attr("data-dcid", (item) => item.dataGroupValue.dcid)
      .attr("data-d", (item) => item.dataGroupValue.value)
      .attr("part", (item) =>
        [
          "series",
          `series-place-${item.dataGroupValue.dcid}`,
          `series-variable-${item.label}`,
          `series-place-${item.dataGroupValue.dcid}-variable-${item.label}`,
        ].join(" ")
      )
      .attr("stroke", (item) => colorFn(item.dataGroupValue.label))
      .attr("stroke-width", 2)
      .attr("x1", xScale(0))
      .attr("x2", (item) => xScale(item.dataGroupValue.value))
      .attr(
        "y1",
        (item, i) =>
          yScale(item.label) + (i + 1) * stemSpacing + bandwidthPadding
      )
      .attr(
        "y2",
        (item, i) =>
          yScale(item.label) + (i + 1) * stemSpacing + bandwidthPadding
      );

    // draw circles
    chart
      .append("g")
      .selectAll("g")
      .data(dataGroups)
      .join("g")
      .selectAll("line")
      .data(setData)
      .join("circle")
      .attr("data-dcid", (item) => item.dataGroupValue.dcid)
      .attr("data-d", (item) => item.dataGroupValue.value)
      .attr("part", (item) =>
        [
          "series",
          `series-place-${item.dataGroupValue.dcid}`,
          `series-variable-${item.label}`,
          `series-place-${item.dataGroupValue.dcid}-variable-${item.label}`,
        ].join(" ")
      )
      .attr("fill", (item) => colorFn(item.dataGroupValue.label))
      .attr("cx", (item) => xScale(item.dataGroupValue.value))
      .attr(
        "cy",
        (item, i) =>
          yScale(item.label) + (i + 1) * stemSpacing + bandwidthPadding
      )
      .attr("r", Math.min(6, stemSpacing));
  } else {
    // Draw grouped horizontal bars
    const barHeight = yScale.bandwidth() / numGroups;
    chart
      .append("g")
      .selectAll("g")
      .data(dataGroups)
      .enter()
      .append("g")
      .selectAll("rect")
      .data(setData)
      .join("rect")
      .attr("fill", (item) => colorFn(item.dataGroupValue.label))
      .classed("g-bar", true)
      .attr("data-dcid", (item) => item.dataGroupValue.dcid)
      .attr("part", (item) =>
        [
          "series",
          `series-place-${item.dataGroupValue.dcid}`,
          `series-variable-${item.label}`,
          `series-place-${item.dataGroupValue.dcid}-variable-${item.label}`,
        ].join(" ")
      )
      .attr("x", xScale(0))
      .attr("y", (item, i) => yScale(item.label) + i * barHeight)
      .attr("width", (item) => xScale(item.dataGroupValue.value) - xScale(0))
      .attr("height", barHeight);
  }
}

/**
 * Helper function for horizontally stacking dataGroups in a set of axes.
 *
 * @param chart SVG element to draw lollipops in
 * @param colorFn color scale mapping legend labels to colors
 * @param series data values to plot
 * @param xScale main scale for x-axis values
 * @param xSubScale sub-scale for a single group of lollipops
 * @param yScale  scale for y-axis values
 * @param useLollipop whether to use lollipop style
 * @param unit data's unit of measurement to show in tooltip
 */
function drawHorizontalStackedBars(
  chart: d3.Selection<SVGElement, unknown, null, undefined>,
  colorFn: d3.ScaleOrdinal<string, string, never>,
  series: d3.Series<{ [key: string]: number }, string>[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleBand<string>,
  useLollipop?: boolean,
  unit?: string
): void {
  const setData = (d: d3.Series<{ [key: string]: number }, string>) => {
    return d.map((dp) => ({
      date: dp.data.date,
      place: dp.data.label,
      statVar: d.key,
      unit,
      value: dp.data.value,
      ...dp,
    }));
  };
  if (useLollipop) {
    // How much to shift stems so they plot at center of band
    const yShift = yScale.bandwidth() / 2;

    // draw lollipop stems
    chart
      .append("g")
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("stroke", (d) => colorFn(d.key))
      .selectAll("line")
      .data(setData)
      .join("line")
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("data-d", (d) => d.data.value)
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("stroke-width", 2)
      .attr("x1", (d) => xScale(d[0]))
      .attr("x2", (d) => xScale(d[1]))
      .attr("y1", (d) => yScale(String(d.data.label)) + yShift)
      .attr("y2", (d) => yScale(String(d.data.label)) + yShift);

    // draw circles
    chart
      .append("g")
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", (d) => colorFn(d.key))
      .selectAll("circle")
      .data(setData)
      .join("circle")
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("data-d", (d) => d.data.value)
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("cx", (d) => xScale(d[1]))
      .attr("cy", (d) => yScale(String(d.data.label)) + yShift)
      .attr("r", 6);
  } else {
    // Draw horizontal bars, stacked
    chart
      .append("g")
      .selectAll("g")
      .data(series)
      .enter()
      .append("g")
      .attr("fill", (d) => colorFn(d.key))
      .selectAll("rect")
      .data(setData)
      .join("rect")
      .classed("g-bar", true)
      .attr("data-dcid", (d) => d.data.dcid)
      .attr("data-d", (d) => d.data.value)
      .attr("part", (d) =>
        [
          "series",
          `series-place-${d.data.dcid}`,
          `series-variable-${d.statVar}`,
          `series-place-${d.data.dcid}-variable-${d.statVar}`,
        ].join(" ")
      )
      .attr("x", (d) => xScale(d[0]))
      .attr("y", (d) => yScale(String(d.data.label)))
      .attr("width", (d) => xScale(d[1]) - xScale(d[0]))
      .attr("height", yScale.bandwidth());
  }
}

/**
 * Helper function for plotting dataGroups with lollipops (stem and circle).
 * Used by bar charts to render data in lollipop style.
 * @param chart SVG element to draw lollipops in
 * @param colorFn color scale mapping legend labels to colors
 * @param dataGroups grouped data values to plot
 * @param xScale main scale for x-axis values
 * @param xSubScale sub-scale for a single group of lollipops
 * @param yScale  scale for y-axis values
 * @param unit data's unit of measurement to show in tooltip
 */
function drawLollipops(
  chart: d3.Selection<SVGElement, unknown, null, undefined>,
  colorFn: d3.ScaleOrdinal<string, string, never>,
  dataGroups: DataGroup[],
  xScale: d3.ScaleBand<string>,
  xSubScale: d3.ScaleBand<string>,
  yScale: d3.ScaleLinear<number, number, never>,
  unit?: string
): void {
  const setData = (dg: DataGroup) => {
    return dg.value.map((dp) => ({
      statVar: dp.label,
      value: dp.value,
      dcid: dp.dcid,
      place: dg.label,
      date: dp.date,
      unit,
    }));
  };
  // draw lollipop stems
  chart
    .append("g")
    .selectAll("g")
    .data(dataGroups)
    .join("g")
    .attr("transform", (dg) => `translate(${xScale(dg.label)},0)`)
    .selectAll("line")
    .data(setData)
    .join("line")
    .attr("part", (d) =>
      [
        "series",
        `series-place-${d.dcid}`,
        `series-variable-${d.statVar}`,
        `series-place-${d.dcid}-variable-${d.statVar}`,
      ].join(" ")
    )
    .attr("data-dcid", (d) => d.dcid)
    .attr("data-d", (d) => d.value)
    .attr("stroke", (d) => colorFn(d.statVar))
    .attr("stroke-width", 2)
    .attr("x1", (d) => xSubScale(d.statVar) + xSubScale.bandwidth() / 2)
    .attr("x2", (d) => xSubScale(d.statVar) + xSubScale.bandwidth() / 2)
    .attr("y1", yScale(0))
    .attr("y2", (d) => yScale(d.value));

  // draw circles
  chart
    .append("g")
    .selectAll("g")
    .data(dataGroups)
    .join("g")
    .attr("transform", (dg) => `translate(${xScale(dg.label)},0)`)
    .selectAll("circle")
    .data(setData)
    .join("circle")
    .attr("part", (d) =>
      [
        "series",
        `series-place-${d.dcid}`,
        `series-variable-${d.statVar}`,
        `series-place-${d.dcid}-variable-${d.statVar}`,
      ].join(" ")
    )
    .attr("data-dcid", (d) => d.dcid)
    .attr("data-d", (d) => d.value)
    .attr("fill", (d) => colorFn(d.statVar))
    .attr("cx", (d) => xSubScale(d.statVar) + xSubScale.bandwidth() / 2)
    .attr("cy", (d) => yScale(d.value))
    .attr("r", 6);
}

/**
 * Draw group bar chart.
 * @param containerElement Div element chart will be drawn in
 * @param id id of the chart
 * @param chartWidth width of chart
 * @param chartHeight height of chart
 * @param dataGroups data values to plot
 * @param options chart options
 */
export function drawGroupBarChart(
  containerElement: HTMLDivElement,
  id: string,
  chartWidth: number,
  chartHeight: number,
  dataGroups: DataGroup[],
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
    TEXT_FONT_FAMILY,
    options?.unit
  );

  const x0 = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([leftWidth, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);
  const bottomHeight = addXAxis(
    xAxis,
    chartHeight,
    x0,
    false,
    labelToLink,
    null,
    options?.apiRoot
  );

  const x1 = d3
    .scaleBand()
    .domain(keys)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  // Update and redraw the y-axis based on the new x-axis height.
  y.rangeRound([chartHeight - bottomHeight, MARGIN.top]);
  tempYAxis.remove();
  addYAxis(yAxis, chartWidth, y, TEXT_FONT_FAMILY, options?.unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

  const colorOrder = options?.statVarColorOrder || keys;
  const colorFn = getColorFn(colorOrder, options.colors);

  if (options?.lollipop) {
    drawLollipops(chart, colorFn, dataGroups, x0, x1, y, options?.unit);
  } else {
    drawBars(chart, colorFn, dataGroups, x0, x1, y, options?.unit);
  }

  if (options?.showTooltipOnHover) {
    const chartAreaBoundary = {
      bottom: chartHeight - bottomHeight,
      left: leftWidth,
      right: chartWidth - MARGIN.right,
      top: 0,
    };
    addHighlightOnHover(chartAreaBoundary, container, svg);
  }

  appendLegendElem(
    containerElement,
    colorFn,
    dataGroups[0].value.map((dp) => ({
      dcid: dp.dcid,
      label: dp.label,
      link: dp.link,
    })),
    options?.apiRoot
  );
  svg.attr("class", ASYNC_ELEMENT_CLASS);
}

/**
 * Draw horizontally stacked bar chart.
 * @param containerElement
 * @param chartWidth
 * @param dataGroups
 * @param options
 */
export function drawHorizontalBarChart(
  containerElement: HTMLDivElement,
  chartWidth: number,
  dataGroups: DataGroup[],
  options?: HorizontalBarChartOptions
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
      curr.date = dataPoint.date;
      curr.value = dataPoint.value;
    }
    data.push(curr);
  }

  const series = d3.stack().keys(keys).offset(d3.stackOffsetDiverging)(data);
  // clear old chart to redraw over
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  // Specify the chart’s dimensions based on a bar’s height.
  const barHeight = options?.style?.barHeight || HORIZONTAL_BAR_CHART.barHeight;
  let marginTop = HORIZONTAL_BAR_CHART.marginTop;
  const marginRight = HORIZONTAL_BAR_CHART.marginRight;
  const marginBottom = HORIZONTAL_BAR_CHART.marginBottom;
  const marginLeft =
    options?.style?.yAxisMargin || HORIZONTAL_BAR_CHART.marginLeft;
  const numGroups = dataGroups[0].value.length;
  const height = options?.stacked
    ? Math.ceil((dataGroups.length + 0.1) * barHeight) +
      marginTop +
      marginBottom
    : Math.ceil((dataGroups.length + 0.1) * barHeight * numGroups) +
      marginTop +
      marginBottom;
  const colorOrder = options?.statVarColorOrder || keys;
  const color = getColorFn(colorOrder, options?.colors);
  const [displayUnit, label] = getDisplayUnitAndLabel(options?.unit);

  // Create the SVG container.
  const svg = d3
    .create("svg")
    .attr("class", ASYNC_ELEMENT_CLASS) // for render verification in test cases
    .attr("width", chartWidth)
    .attr("height", height)
    .attr("viewBox", `0, 0, ${chartWidth}, ${height}`)
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Attach SVG node to the parent container
  // The node must be attached before any getBBox() calls.
  containerElement.append(svg.node());

  if (label) {
    // Add x-axis label in the top-middle of the axis
    svg
      .append("text")
      .attr("id", "x-axis-label")
      .attr("part", "x-axis-label")
      .attr("x", chartWidth / 2)
      .attr("y", 0)
      .attr("fill", AXIS_TEXT_FILL)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "hanging")
      .text(label);

    // Adjust top margin to account for any x-axis labels
    const xAxisLabelHeight = (
      svg.select("#x-axis-label").node() as SVGGraphicsElement
    ).getBBox().height;
    marginTop += xAxisLabelHeight;
  }

  const y = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([marginTop, height - marginBottom])
    .padding(0.15);

  // y axis
  const yAxis = svg
    .append("g")
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .call((g) =>
      g
        .selectAll("text")
        .style("fill", AXIS_TEXT_FILL)
        .style("shape-rendering", "crispEdges")
    );

  // Get maximum length of tick labels
  let maxLabelWidth = marginLeft;
  if (!options.style.yAxisMargin) {
    yAxis.selectAll("text").each(function () {
      maxLabelWidth = Math.max(
        (<SVGSVGElement>this).getBBox().width,
        maxLabelWidth
      );
    });
    // TODO (juliawu): This is set to account for tick length. We should
    //                 calculate this instead of using a set number.
    maxLabelWidth += TICK_LABEL_PADDING;
    // Limit label width to 1/2 the width of the chart
    // incase labels are extremely long
    maxLabelWidth = Math.min(maxLabelWidth, chartWidth / 2);
  }
  // shift tick labels by max length so tick labels don't get cut off
  yAxis.attr("transform", `translate(${maxLabelWidth}, 0)`);

  const x = d3
    .scaleLinear()
    .domain([
      0,
      options?.stacked
        ? d3.max(series, (d) => d3.max(d, (d) => d[1]))
        : d3.max(dataGroups, (dg) => d3.max(dg.value, (dgv) => dgv.value)),
    ])
    .nice()
    .rangeRound([maxLabelWidth, chartWidth - marginRight]);

  // x axis
  svg
    .append("g")
    .attr("transform", `translate(0,${marginTop})`)
    .call(
      d3
        .axisTop(x)
        .ticks(NUM_Y_TICKS)
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), displayUnit);
        })
    )
    .call((g) =>
      g
        .selectAll("text")
        .style("fill", AXIS_TEXT_FILL)
        .style("shape-rendering", "crispEdges")
    )
    .call((g) => g.select(".domain").remove());

  if (options?.stacked) {
    // Stacked bar chart
    drawHorizontalStackedBars(
      svg,
      color,
      series,
      x,
      y,
      options?.lollipop,
      options?.unit
    );
  } else {
    // Grouped bar chart
    drawHorizontalGroupedBars(
      svg,
      color,
      dataGroups,
      x,
      y,
      options?.lollipop,
      options?.unit
    );
  }

  if (options?.showTooltipOnHover) {
    const chartAreaBoundary = {
      bottom: height - MARGIN.bottom,
      left: maxLabelWidth,
      right: chartWidth - MARGIN.right,
      top: 0,
    };
    addHighlightOnHover(chartAreaBoundary, container, svg);
  }

  // Legend
  appendLegendElem(
    containerElement,
    color,
    dataGroups[0].value.map((dp) => ({
      dcid: dp.dcid,
      label: dp.label,
      link: dp.link,
    })),
    options?.apiRoot
  );
}
