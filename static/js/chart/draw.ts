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
import moment from "moment";

import {
  DataGroup,
  DataPoint,
  BarLayout,
  Layout,
  Range,
  computeCoordinate,
} from "./base";
import { drawBarXTicks, getLineXTick, drawLineXTicks } from "./xtick";
import {
  Y_TICK_MARGIN,
  computeYTickWidth,
  drawYTicks,
  getYTick,
} from "./ytick";

const TOP_MARGIN = 10;
const SIDE_MARGIN = 15;
const BAR_GAP_RATIO = 0.25;
const GROUP_BAR_GAP = 1;
const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 10, right: 10, bottom: 30, left: 30 };

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

enum BarType {
  Stack = 1,
  Group = 2,
}

function getColorFn(size) {
  return d3
    .scaleOrdinal()
    .range(d3.quantize(d3.interpolateHcl("#362142", "#f4e153"), size));
}

function appendLegendElem(elem: string, color, keys: string[]) {
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

function createLegend(textList: string[]): Element {
  let legendElem = document.createElement("div");
  legendElem.classList.add("legend-box");
  for (let i = 0; i < textList.length; i++) {
    let textElem = document.createElement("div");
    textElem.textContent = textList[i];
    textElem.classList.add("legend-text");
    textElem.style.color = COLORS[i];
    legendElem.appendChild(textElem);
  }
  return legendElem;
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

function drawStackBars(
  canvas: any,
  layout: BarLayout,
  dataGroups: DataGroup[],
  valueRange: Range
) {
  for (let i = 0; i < dataGroups.length; i++) {
    let y1 = layout.yRange.high;
    let barX =
      layout.xRange.low + layout.barGap + i * (layout.barGap + layout.barWidth);
    let sumValue = 0;
    for (let j = 0; j < dataGroups[i].value.length; j++) {
      sumValue += dataGroups[i].value[j].value;
      let h = computeCoordinate(sumValue, valueRange, layout.yRange);
      canvas.rect(layout.barWidth, y1 - h).attr({
        x: barX,
        y: h,
        fill: COLORS[j],
      });
      y1 = h;
    }
  }
}

function drawGroupBars(
  canvas: any,
  layout: BarLayout,
  dataGroups: DataGroup[],
  valueRange: Range
) {
  for (let i = 0; i < dataGroups.length; i++) {
    let barX =
      layout.xRange.low + layout.barGap + i * (layout.barGap + layout.barWidth);
    let n = dataGroups[i].value.length;
    let innerBarWidth = (layout.barWidth - (n - 1) * GROUP_BAR_GAP) / n;
    for (let j = 0; j < n; j++) {
      let y = computeCoordinate(
        dataGroups[i].value[j].value,
        valueRange,
        layout.yRange
      );
      canvas.rect(innerBarWidth, layout.yRange.high - y).attr({
        x: barX,
        y: y,
        fill: COLORS[j],
      });
      barX += innerBarWidth + GROUP_BAR_GAP;
    }
  }
}

/**
 * Function to draw lines based on the data values.
 */
function drawLines(
  canvas: any,
  layout: Layout,
  dataGroups: DataGroup[],
  xValueRange: Range,
  yValueRange: Range
) {
  for (let i = 0; i < dataGroups.length; i++) {
    for (let j = 0; j < dataGroups[i].value.length - 1; j++) {
      let p1 = dataGroups[i].value[j];
      let p2 = dataGroups[i].value[j + 1];
      let x1 = computeCoordinate(
        moment.utc(p1.label).unix(),
        xValueRange,
        layout.xRange
      );
      let y1 = computeCoordinate(p1.value, yValueRange, layout.yRange);
      let x2 = computeCoordinate(
        moment.utc(p2.label).unix(),
        xValueRange,
        layout.xRange
      );
      let y2 = computeCoordinate(p2.value, yValueRange, layout.yRange);
      canvas.line(x1, y1, x2, y2).stroke({ width: 2, color: COLORS[i] });
    }
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
 * @param parentId
 * @param parentWidth
 * @param parentHeight
 * @param dataGroups
 * @param unit
 */
function drawStackBarChart(
  parentId: string,
  parentWidth: number,
  parentHeight: number,
  dataGroups: DataGroup[],
  unit?: string
) {
  drawComplexBarChart(
    parentId,
    parentWidth,
    parentHeight,
    dataGroups,
    BarType.Stack,
    unit
  );
}

/**
 * Draw complex (stack or group) bar chart.
 *
 * @param parentId
 * @param parentWidth
 * @param parentHeight
 * @param dataGroups
 * @param unit
 */
function drawComplexBarChart(
  parentId: string,
  parentWidth: number,
  parentHeight: number,
  dataGroups: DataGroup[],
  barType: BarType,
  unit?: string
) {
  let parentElement = document.getElementById(parentId);
  // Pick one group and use the data point label as text list.
  let textList = dataGroups[0].value.map((dataPoint) => dataPoint.label);
  let values;
  if (barType == BarType.Stack) {
    values = dataGroups.map((dataGroup) => dataGroup.sum());
  } else if (barType == BarType.Group) {
    values = dataGroups.map((dataGroup) => dataGroup.max());
  }
  let maxValue = Math.max(...values);
  let yTick = getYTick(new Range(0, maxValue));
  yTick.unit = unit;

  let yTickWidth = computeYTickWidth(yTick);
  // Draw legend and compute the height.
  // Add legend to the container box in the end.
  let legendElem = createLegend(textList);
  parentElement.appendChild(legendElem);
  let bbox = legendElem.getBoundingClientRect();
  let legendHeight = bbox.height;
  parentElement.removeChild(legendElem);
  // Create canvas.
  const canvas = _SVG
    .SVG()
    .addTo("#" + parentId)
    .size(parentWidth, parentHeight - legendHeight);
  // Create initial layout.
  let xRange = new Range(yTickWidth + Y_TICK_MARGIN, parentWidth);
  let yRange = new Range(TOP_MARGIN, parentHeight - legendHeight);
  let numBars = dataGroups.length;
  let width = xRange.high - xRange.low;
  let barGap = Math.round((width / numBars) * BAR_GAP_RATIO);
  // Account for gaps between bars, before the first bar and after last bar.
  let barWidth = (width - (numBars + 1) * barGap) / numBars;
  let layout = new BarLayout(xRange, yRange, barGap, barWidth);
  // Draw X ticks.
  let xTickText = dataGroups.map((dataGroup) => dataGroup.label);
  let xTicksHeight = drawBarXTicks(canvas, layout, xTickText);
  // Update layout.
  layout.yRange.high -= xTicksHeight;
  // Draw Y ticks.
  drawYTicks(canvas, layout, yTick);

  // Draw bars.
  if (barType == BarType.Stack) {
    drawStackBars(canvas, layout, dataGroups, yTick.valueRange);
  } else if (barType == BarType.Group) {
    drawGroupBars(canvas, layout, dataGroups, yTick.valueRange);
  }
  parentElement.appendChild(legendElem);
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
    .paddingInner(0.1);

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

  let yAxis = (g) =>
    g
      .attr("transform", `translate(${MARGIN.left},0)`)
      .call(d3.axisLeft(y).ticks(5, "s"))
      .call((g) =>
        g
          .select(".tick:last-of-type text")
          .clone()
          .attr("x", 3)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
      );

  let xAxis = (g) =>
    g
      .attr("transform", `translate(0,${height - MARGIN.bottom})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0));

  let color = getColorFn(keys.length);

  let svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

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
    .attr("fill", (d) => String(color(d.key)));

  svg.append("g").attr("class", "x axis").call(xAxis);
  svg.append("g").attr("class", "y axis").call(yAxis);

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

  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height - MARGIN.bottom})`)
    .call(d3.axisBottom(xScale).ticks(NUM_X_TICKS));

  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${MARGIN.left},0)`)
    .call(
      d3
        .axisRight(yScale)
        .ticks(NUM_Y_TICKS, "1s")
        .tickSize(width - MARGIN.left - MARGIN.right)
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick:not(:first-of-type) line").attr("class", "grid-line")
    )
    .call((g) => g.selectAll(".tick text").attr("x", -25));

  for (let i = 0; i < dataGroups.length; i++) {
    let dataGroup = dataGroups[i];
    let dataset = dataGroup.value.map(function (dp) {
      return [new Date(dp.label).getTime(), dp.value];
    });
    let shouldAddDots = dataset.length < 12;

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
      .style("stroke", COLORS[i])
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
        .attr("fill", COLORS[i])
        .attr("r", 3);
    }
  }

  if (dataGroups.length > 1) {
    let legendText = dataGroups.map((dataGroup) => dataGroup.label);
    let color = getColorFn(legendText.length);
    appendLegendElem(id, color, legendText);
  }
}

export {
  createLegend,
  drawBars,
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
};
