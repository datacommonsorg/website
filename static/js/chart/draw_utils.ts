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

import {
  GA_EVENT_PLACE_CHART_CLICK,
  GA_PARAM_PLACE_CHART_CLICK,
  GA_VALUE_PLACE_CHART_CLICK_STAT_VAR_CHIP,
  triggerGAEvent,
} from "../shared/ga_events";
import { StatVarInfo } from "../shared/stat_var";
import { Boundary } from "../shared/types";
import { DataGroup, Style, wrap } from "./base";
import {
  AXIS_TEXT_FILL,
  LEGEND,
  MARGIN,
  NUM_Y_TICKS,
  TEXT_FONT_FAMILY,
  TOOLTIP_ID,
} from "./draw_constants";

const AXIS_GRID_FILL = "#999";
// max number of characters a unit can have and still be shown next to ticks
// When a unit is longer, we show the unit as an axes label instead
export const MAX_UNIT_LENGTH = 5;
const NUM_X_TICKS = 5;
const ROTATE_MARGIN_BOTTOM = 75;
const TICK_SIZE = 6;
// min distance between bottom of the tooltip and a datapoint
const TOOLTIP_BOTTOM_OFFSET = 5;

/**
 * Adds tooltip element within a given container.
 *
 * @param containerId container to add tooltip element to.
 */
export function addTooltip(
  container: d3.Selection<HTMLDivElement, any, any, any>
): void {
  container
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 1");
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
export function addXAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartHeight: number,
  xScale: d3.AxisScale<any>,
  shouldRotate?: boolean,
  labelToLink?: { [label: string]: string },
  singlePointLabel?: string,
  apiRoot?: string
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
        window.open(
          `${apiRoot || ""}${(<SVGElement>this).dataset.link}`,
          "_blank"
        );
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
 * @param formatNumberFn function to use to format numbers
 * @param textFontFamily name of font-family to set axes-labels to
 * @param unit: optional unit for the tick values
 *
 * @return the width of the y-axis bounding-box. The x-coordinate of the grid starts at this value.
 */
export function addYAxis(
  axis: d3.Selection<SVGGElement, any, any, any>,
  chartWidth: number,
  yScale: d3.ScaleLinear<number, any>,
  formatNumberFn: (value: number, unit?: string) => string,
  textFontFamily?: string,
  unit?: string
) {
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
          return formatNumberFn(d.valueOf(), displayUnit);
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
 * Adds a legend to the parent element
 * @param elem parent element
 * @param color d3 color scale
 * @param key legend items
 * @param marginLeft [optional] legend offset
 */
export function appendLegendElem(
  elem: HTMLElement,
  color: d3.ScaleOrdinal<string, string>,
  keys: {
    dcid?: string;
    label: string;
    link?: string;
  }[],
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
    .attr("class", "legend-item");

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

/**
 * Returns an array of [min, max] value from the data groups (similar to d3.extent)
 *
 * @param dataGroupsDict
 */
export function computeRanges(dataGroupsDict: {
  [geoId: string]: DataGroup[];
}) {
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
    if (unit.startsWith("% of ")) {
      label = unit.slice("% of ".length);
      displayUnit = "%"; //leave percent sign with the number
    } else {
      label = unit;
      displayUnit = "";
    }
  }
  return [displayUnit, label];
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
export function showTooltip(
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
