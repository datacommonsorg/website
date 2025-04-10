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
 * Utility/Helper functions for drawing various chart tiles
 */

import * as d3 from "d3";
import _ from "lodash";

import { formatNumber, localizeLink } from "../i18n/i18n";
import {
  GA_EVENT_PLACE_CHART_CLICK,
  GA_PARAM_PLACE_CHART_CLICK,
  GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
  triggerGAEvent,
} from "../shared/ga_events";
import { StatVarInfo } from "../shared/stat_var";
import { DataGroup, Style, wrap } from "./base";
import {
  AXIS_TEXT_FILL,
  HIGHLIGHT_TIMEOUT,
  LEGEND,
  LEGEND_HIGHLIGHT_CLASS,
  MARGIN,
  NUM_X_TICKS,
  NUM_Y_TICKS,
  TEXT_FONT_FAMILY,
  TOOLTIP_ID,
} from "./draw_constants";

const AXIS_GRID_FILL = "#999";
// max number of characters a unit can have and still be shown next to ticks
// When a unit is longer, we show the unit as an axes label instead
export const MAX_UNIT_LENGTH = 5;
const ROTATE_MARGIN_BOTTOM = 75;
const TICK_SIZE = 6;
const LEGEND_CIRCLE_RADIUS = 5;
const LEGEND_CIRCLE_PADDING = 2;
const LEGEND_ITEM_PADDING = 3;

/**
 * Adds tooltip element within a given container.
 *
 * @param container container to add tooltip element to.
 * @returns tooltip element that was added
 */
export function addTooltip(
  container: d3.Selection<HTMLDivElement, any, any, any>
): d3.Selection<HTMLDivElement, any, any, any> {
  const tooltipRef = _.uniqueId(`${TOOLTIP_ID}-`);
  container
    .attr("style", "position: relative")
    .append("div")
    .attr("id", tooltipRef)
    .attr("class", "draw-tooltip")
    .attr("style", "position: absolute; display: none; z-index: 1");
  return container.select(`#${tooltipRef}`);
}

/**
 * Adds an X-Axis to the svg chart. Tick labels will be wrapped if necessary (unless shouldRotate).
 *
 * @param axis: d3-selection with an SVG element to add the x-axis to
 * @param chartHeight: The height of the SVG chart
 * @param xScale: d3-scale for the x-axis
 * @param shouldRotate: true if the x-ticks should be rotated (no wrapping applied).
 * @param labelToLink: optional map of [label] -> link for each ordinal tick
 * @param tickFormatFn: function to format tick label
 * @param numTicks: number of ticks to display
 *
 * @return the height of the x-axis bounding-box.
 */
export function addXAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartHeight: number,
  xScale: d3.AxisScale<any>,
  shouldRotate?: boolean,
  labelToLink?: { [label: string]: string },
  singlePointLabel?: string,
  apiRoot?: string,
  tickFormatFn?: (arg: any, index: any) => string,
  numTicks?: number
): number {
  let d3Axis = d3
    .axisBottom(xScale)
    .ticks(numTicks || NUM_X_TICKS)
    .tickSize(TICK_SIZE)
    .tickSizeOuter(0);
  if (tickFormatFn) {
    d3Axis.tickFormat(tickFormatFn);
  }
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
        const link = `${apiRoot || ""}${(<SVGElement>this).dataset.link}`;
        const localizedUrl = localizeLink(link);
        window.open(localizedUrl, "_blank");
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

  // Add "part" attributes for web component styling
  axis.selectAll(".domain").attr("part", "x-axis");
  axis.selectAll("text").attr("part", "x-axis-text");
  axis.selectAll(".tick line").attr("part", "x-axis-tick");

  return axisHeight;
}

/**
 * Adds a Y-Axis to the svg chart.
 *
 * @param axis: d3-selection with an SVG element to add the y-axis to
 * @param chartWidth: The width of the SVG chart
 * @param yScale: d3-scale for the y-ayis
 * @param textFontFamily name of font-family to set axes-labels to
 * @param unit: optional unit for the tick values
 *
 * @return the width of the y-axis bounding-box. The x-coordinate of the grid starts at this value.
 */
export function addYAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartWidth: number,
  yScale: d3.ScaleLinear<number, any>,
  textFontFamily?: string,
  unit?: string
): number {
  const tickLength = chartWidth - MARGIN.right - MARGIN.left;
  const [displayUnit, label] = getDisplayUnitAndLabel(unit);
  axis
    .attr("transform", `translate(${tickLength}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS)
        .tickSize(tickLength)
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), displayUnit);
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
        .attr("class", "tick-label")
        .attr("x", -tickLength)
        .attr("dy", -4)
        .style("fill", AXIS_TEXT_FILL)
        .style("shape-rendering", "crispEdges")
    );

  // Add "part" attributes for web component styling
  axis.selectAll("text").attr("part", "y-axis-text");
  axis.selectAll(".tick line").attr("part", "y-axis-tick");

  // Get maximum length of tick labels
  let maxLabelWidth = MARGIN.left;
  axis.selectAll("text").each(function () {
    maxLabelWidth = Math.max(
      (<SVGSVGElement>this).getBBox().width,
      maxLabelWidth
    );
  });

  // Add an axis label when units are long
  if (label) {
    const yAxisHeight = Math.max(...yScale.range());
    const yAxisLabel = axis
      .append("text")
      .attr("part", "y-axis-label")
      .attr("transform", "rotate(-90)") // rotation swaps x and y attributes
      .attr("x", -yAxisHeight / 2)
      .attr("y", -tickLength)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "hanging")
      .style("fill", AXIS_TEXT_FILL)
      .text(label);
    const axisLabelBBox = yAxisLabel.node().getBBox();
    maxLabelWidth += axisLabelBBox.height;
  }

  // shift tick labels by max length so tick labels don't get cut off
  axis.call((g) =>
    g
      .selectAll(".tick-label")
      .attr("transform", `translate(${maxLabelWidth}, 0)`)
  );

  if (textFontFamily) {
    axis.call((g) => g.selectAll("text").style("font-family", textFontFamily));
  }

  return maxLabelWidth + MARGIN.left + MARGIN.grid;
}

/**
 * Create a function mapping a legend label to a unique ID string, used to match
 * a chart's data representation objects (line, bar, etc) with legend labels.
 * @param labels array of labels present in the legend
 */
export function getLegendKeyFn(labels: string[]): (label: string) => string {
  return function (label: string): string {
    return `legend-index-${labels.indexOf(label)}`;
  };
}

export interface LegendItem {
  dcid?: string;
  label: string;
  link?: string;
  index?: string;
}

/**
 * Adds a non-interactive legend as part of an svg
 * @param svg svg to add the legend to
 * @param legendY the y coordinate on the svg to add the legend at
 * @param legendWidth width of the legend
 * @param color d3 color scale
 * @param keys legend items
 */
export function appendSvgLegendElem(
  svg: d3.Selection<SVGGElement, any, any, any>,
  legendY: number,
  legendWidth: number,
  color: d3.ScaleOrdinal<string, string>,
  keys: LegendItem[]
): void {
  // Add legend group to svg
  const legend = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0, ${legendY})`);
  let yOffset = 0;
  let nextYOffset = 0;
  let xOffset = 0;
  // Add each legend item
  for (const key of keys) {
    const lgGroup = legend
      .append("g")
      .attr("transform", `translate(0, ${yOffset})`);
    const circle = lgGroup
      .append("circle")
      // x coordinate of the center of the circle
      .attr("cx", LEGEND_CIRCLE_RADIUS + LEGEND_CIRCLE_PADDING)
      // y coordinate of the center of the circle
      .attr("cy", LEGEND_CIRCLE_RADIUS)
      .attr("r", LEGEND_CIRCLE_RADIUS)
      .attr("fill", color(key.label));
    const circleWidth = LEGEND_CIRCLE_RADIUS * 2 + LEGEND_CIRCLE_PADDING * 2;
    const text = lgGroup
      .append("text")
      .attr("transform", `translate(${circleWidth}, 0)`)
      // align the bottom of the text with the bottom of the circle
      .attr("dy", "0")
      .attr("y", LEGEND_CIRCLE_RADIUS * 2)
      .text(key.label)
      .style("text-rendering", "optimizedLegibility")
      // wrap text to max width of the width of the legend minus the circle
      .call(wrap, legendWidth - circleWidth);
    const lgGroupWidth = circleWidth + text.node().getBBox().width;
    const lgGroupHeight = Math.max(
      circle.node().getBBox().height,
      text.node().getBBox().height
    );
    // if adding the legend item to the current line will overflow, update x
    // and y offset to the start of the next line
    if (xOffset + lgGroupWidth > legendWidth) {
      yOffset = nextYOffset;
      xOffset = 0;
    }
    lgGroup.attr("transform", `translate(${xOffset}, ${yOffset})`);
    // xOffset for the next item will be the current offset + width of the
    // current item
    xOffset += lgGroupWidth + LEGEND_ITEM_PADDING;
    // If current y offset + height of the current item is greater than the
    // nextYOffset, update nextYOffset
    nextYOffset = Math.max(nextYOffset, yOffset + lgGroupHeight);
  }
  // Update the height of the svg to include the height of the legend
  svg.attr("height", legendY + nextYOffset);
}

/**
 * Adds a legend to the parent element
 * @param elem parent element
 * @param color d3 color scale
 * @param key legend items
 * @param svg svg element to find corresponding bars/lines/etc. in
 * @param apiRoot root to use for links in legend items
 */
export function appendLegendElem(
  elem: HTMLElement,
  color: d3.ScaleOrdinal<string, string>,
  keys: LegendItem[],
  apiRoot?: string
): void {
  const legendContainer = d3
    .select(elem)
    .append("div")
    .attr("part", "legend")
    .attr("class", "legend-basic");

  const legendItem = legendContainer
    .selectAll("div")
    .data(keys)
    .join("div")
    .attr("class", "legend-item")
    .attr("id", (d) => d.index || null);

  legendItem
    .append("div")
    .attr("class", "legend-color")
    .attr("part", (d) => `legend-color legend-color-${d.dcid || d.label}`)
    .attr("style", (d) => `background: ${color(d.label)}`);

  legendItem
    .append("a")
    .attr("class", "legend-link")
    .attr("title", (d) => d.label)
    .text((d) => d.label)
    .attr("href", (d) => (d.link ? `${apiRoot || ""}${d.link}` : null))
    // Triggered when stat var legend chip is clicked: sends data to google analytics.
    .on("click", () =>
      triggerGAEvent(GA_EVENT_PLACE_CHART_CLICK, {
        [GA_PARAM_PLACE_CHART_CLICK]: GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
      })
    );

  // Add highlighting to svg chart area when mousing over legend
  const svg = d3.select(elem).select("svg");
  if (svg) {
    // define mouse behavior functions
    let hideFn: ReturnType<typeof setTimeout> = null;
    const highlightSelector = `.${LEGEND_HIGHLIGHT_CLASS}`;
    const mouseoverFn = function (): void {
      if (hideFn) {
        clearTimeout(hideFn);
      }
      const selector = this.id ? `.${this.id}` : null;
      svg.selectAll(highlightSelector).style("opacity", 0.3);
      svg.selectAll(selector).style("opacity", 1);
    };
    const mouseoutFn = function (): void {
      // Slightly delay resetting styling so that quickly mousing over a stream
      // of legend items doesn't result in the chart flickering
      hideFn = setTimeout(() => {
        svg.selectAll(highlightSelector).style("opacity", 1);
      }, HIGHLIGHT_TIMEOUT);
    };

    // Add mouse behavior functions on hover to legend items
    legendContainer
      .selectAll(".legend-item")
      .on("mouseover", mouseoverFn)
      .on("mouseout", mouseoutFn);
  }
}

/**
 * Generate in-chart legend.
 *
 * @param legend: The legend svg selection.
 * @param params: An object keyed by legend text with value of legend style.
 * @param legendTextWidth: The width of the legend text.
 * @param statVarInfo: object from stat var dcid to its info struct.
 */
export function buildInChartLegend(
  legend: d3.Selection<SVGGElement, any, any, any>,
  params: { [key: string]: Style },
  legendTextWidth: number
): void {
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

/**
 * Returns an array of [min, max] value from the data groups (similar to d3.extent)
 *
 * @param dataGroupsDict
 */
export function computeRanges(dataGroupsDict: {
  [geoId: string]: DataGroup[];
}): number[] {
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
 * Given a dataGroupsDict, gets the row label for each combination of place and
 * data group.
 *
 * @param dataGroupsDict mapping of place to datagroups from which the row
 *                       labels will be generated
 * @param dataGroups list of all datagroups
 * @param statVarInfo mapping of stat var to information such as its title
 */
export function getRowLabels(
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
 * Get the display strings for units and axes labels, based on the unit provided
 * in the KG.
 *
 * If the raw unit from the KG is too long, the unit is instead used as an axes
 * label which helps avoid overly long or overlapping tick labels.
 *
 * @param unit measurement unit of the variable to plot, from the KG.
 * @returns a string to display next to each value, and a string to use as an
 *          axes label, in that order.
 */
export function getDisplayUnitAndLabel(
  unit: string | undefined
): [string, string] {
  let label = "";
  let displayUnit = unit;
  if (unit && unit.length > MAX_UNIT_LENGTH) {
    label = unit;
    if (unit.startsWith("%") || unit.toLowerCase().startsWith("percent")) {
      displayUnit = "%"; //leave percent sign with the number
    } else {
      displayUnit = "";
    }
  }
  return [displayUnit, label];
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
export function updateXAxis(
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
 * Adds a chart title to the top of the svg and returns the height of the chart
 * title that was added.
 * @param svg svg to add title to
 * @param titleText text of the title to add
 * @param width width of the svg
 * @returns height of the chart title that was added
 */
export function addChartTitle(
  svg: d3.Selection<SVGGElement, any, any, any>,
  titleText: string,
  width: number
): number {
  const titleElement = svg
    .append("g")
    .attr("class", "chart-title")
    .append("text")
    .attr("y", 0)
    .attr("dominant-baseline", "hanging")
    .text(titleText)
    .call(wrap, width);
  return titleElement.node().getBBox().height;
}
