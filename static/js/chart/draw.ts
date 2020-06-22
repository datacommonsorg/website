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

import * as _SVG from "@svgdotjs/svg.js";
import * as d3 from "d3";

import {
  DataGroup,
  DataPoint,
  BarLayout,
  Range,
  computeCoordinate,
} from "./base";
import { drawBarXTicks } from "./xtick";
import {
  Y_TICK_MARGIN,
  computeYTickWidth,
  drawYTicks,
  getYTick,
} from "./ytick";

const TOP_MARGIN = 10;
const BAR_GAP_RATIO = 0.25;
const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 20, right: 10, bottom: 30, left: 35, yAxis: 3 };

// Colors - 500 level colors from the Google Material palette
const COLORS = [
  "#4285F4",
  "#EA4335",
  "#FBBC04",
  "#34A853",
  "#FA7B17",
  "#F439A0",
  "#A142F4",
  "#24C1E0",
];

function getColorFn(labels: string[]) {
  let k = labels.length;
  k = k < 3 || k > 11 ? 10 : k;  // Spectral colors exist for k = 3 -> 11
  return d3
    .scaleOrdinal<string, string>()
    .domain(labels)
    .range(d3.quantize(d3.interpolateSpectral, k));
}

function appendLegendElem(
  elem: string, color: d3.ScaleOrdinal<string, string>, keys: string[]) {
  d3.select("#" + elem)
    .append("div")
    .attr("class", "legend")
    .selectAll("div")
    .data(keys)
    .join("div")
    .attr("style", (d) => `background: ${color(d)}`)
    .append("span")
    .text((d) => d);
}

function addXAxis(svg, height, xScale) {
  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height - MARGIN.bottom})`)
    .call(d3.axisBottom(xScale)
    .ticks(NUM_X_TICKS)
    .tickSizeOuter(0))
    .call((g) => g.select(".domain").remove())
}

function addYAxis(svg, width, yScale) {
  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${width - MARGIN.right},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS, "1s")
        .tickSize(width - 10 - MARGIN.right)
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick:not(:first-of-type) line").attr("class", "grid-line")
    )
    .call((g) =>
      g.selectAll(".tick text")
      .attr("x", -width + MARGIN.left + MARGIN.yAxis)
      .attr("dy", -4));
    );
}

/**
 * Function to draw bars based on the data values.
 */
function drawBars(
  canvas: any,
  layout: BarLayout,
  dataPoints: DataPoint[],
  valueRange: Range
) {
  for (let i = 0; i < dataPoints.length; i++) {
    let barX =
      layout.xRange.low + layout.barGap + i * (layout.barGap + layout.barWidth);
    // Pick the Y coordinate by factoring in the data value relative to limit.
    let barY = computeCoordinate(
      dataPoints[i].value,
      valueRange,
      layout.yRange
    );
    let barHeight = layout.yRange.high - barY;
    let barElem = canvas.rect(layout.barWidth, barHeight).attr({
      x: barX,
      y: barY,
      fill: COLORS[i],
    });
    barElem.addClass("highlight-target color-" + COLORS[i]);
  }
}

/**
 * Draw single bar chart.
 * @param parentId
 * @param parentWidth
 * @param parentHeight
 * @param dataPoints
 * @param unit
 */
function drawSingleBarChart(
  parentId: string,
  parentWidth: number,
  parentHeight: number,
  dataPoints: DataPoint[],
  unit?: string
) {
  let textList = dataPoints.map((dataPoint) => dataPoint.label);
  let values = dataPoints.map((dataPoint) => dataPoint.value);
  let yTick = getYTick(new Range(0, Math.max(...values)));
  yTick.unit = unit;
  let yTickWidth = computeYTickWidth(yTick);
  // Create canvas.
  const canvas = _SVG
    .SVG()
    .addTo("#" + parentId)
    .size(parentWidth, parentHeight);
  // Create initial layout.
  let xRange = new Range(yTickWidth + Y_TICK_MARGIN, parentWidth);
  let yRange = new Range(TOP_MARGIN, parentHeight);
  let numBars = dataPoints.length;
  let width = xRange.high - xRange.low;
  // Use 20% as bar gap.
  let barGap = Math.round((width / numBars) * BAR_GAP_RATIO);
  // Account for gaps between bars, before the first bar and after last bar.
  let barWidth = (width - (numBars + 1) * barGap) / numBars;
  let layout = new BarLayout(xRange, yRange, barGap, barWidth);
  // Draw X ticks.
  let xTicksHeight = drawBarXTicks(canvas, layout, textList);
  // Update layout.
  layout.yRange.high -= xTicksHeight;
  // Draw Y ticks.
  drawYTicks(canvas, layout, yTick);
  // Draw bars.
  drawBars(canvas, layout, dataPoints, yTick.valueRange);
}

/**
 * Draw stack bar chart.
 *
 * @param id
 * @param width
 * @param height
 * @param dataGroups
 * @param unit
 */
function drawStackBarChart(
  id: string,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  unit?: string
) {
  const keys = dataGroups[0].value.map((dp) => dp.label);

  let data = [];
  for (let dataGroup of dataGroups) {
    let curr = {"label": dataGroup.label}
    for (let dataPoint of dataGroup.value) {
      curr[dataPoint.label] = dataPoint.value;
    }
    data.push(curr);
  }

  let series = d3.stack().keys(keys)(data);

  let x = d3.scaleBand()
    .domain(dataGroups.map(dg => dg.label))
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  let y = d3
    .scaleLinear()
    .domain([0, d3.max(series, d => d3.max(d, d => d[1]))]).nice()
    .nice()
    .rangeRound([height - MARGIN.bottom, MARGIN.top]);

  let color = getColorFn(keys);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x);
  addYAxis(svg, width, y);

  svg.append("g")
    .selectAll("g")
    .data(series)
    .enter().append("g")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
      .attr("x", (d) =>x(String(d.data.label)))
      .attr("y", d => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", d => y(d[0]) - y(d[1]));

  appendLegendElem(id, color, keys);
}

/**
 * Draw group bar chart.
 *
 * @param id
 * @param width
 * @param height
 * @param dataGroups
 * @param unit
 */
function drawGroupBarChart(
  id: string,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  unit?: string
) {
  let keys = dataGroups[0].value.map((dp) => dp.label);
  let x0 = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  let x1 = d3
    .scaleBand()
    .domain(keys)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  let maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  let y = d3
    .scaleLinear()
    .domain([0, maxV])
    .nice()
    .rangeRound([height - MARGIN.bottom, MARGIN.top]);


  let color = getColorFn(keys);

  let svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x0);
  addYAxis(svg, width, y);
  svg
    .append("g")
    .selectAll("g")
    .data(dataGroups)
    .join("g")
    .attr("transform", (dg) => `translate(${x0(dg.label)},0)`)
    .selectAll("rect")
    .data((dg) => dg.value.map((dp) => ({ key: dp.label, value: dp.value })))
    .join("rect")
    .attr("x", (d) => x1(d.key))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) => color(d.key));


  appendLegendElem(id, color, keys);
}

/**
 * Draw line chart.
 * @param id
 * @param width
 * @param height
 * @param dataGroups
 * @param unit
 */
function drawLineChart(
  id: string,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  unit?: string
) {
  let minV = 0;
  let maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));

  let svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  let xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right]);

  let yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top])
    .nice(NUM_Y_TICKS);

  addXAxis(svg, height, xScale);
  addYAxis(svg, width, yScale);

  let legendText = dataGroups.map((dataGroup) => dataGroup.label ? dataGroup.label: 'a');
  let colorFn = getColorFn(legendText);

  for (let i = 0; i < dataGroups.length; i++) {
    let dataGroup = dataGroups[i];
    let dataset = dataGroup.value.map(function (dp) {
      return [new Date(dp.label).getTime(), dp.value];
    });
    let shouldAddDots = dataset.length < 12;
    let color = colorFn(dataGroup.label);

    let line = d3
      .line()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    if (shouldAddDots) {
      line = line.curve(d3.curveMonotoneX);
    }

    svg
      .append("path")
      .datum(dataset)
      .attr("class", "line")
      .style("stroke", color)
      .attr("d", line);

    if (shouldAddDots) {
      svg
        .selectAll(".dot")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d, i) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("fill", color)
        .attr("r", 3);
    }
  }

  if (dataGroups.length > 1) {
    appendLegendElem(id, colorFn, legendText);
  }
}

export {
  drawBars,
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
};
