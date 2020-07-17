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

import { DataGroup, DataPoint } from "./base";

import { randDomId } from "./../util";

const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 20, right: 10, bottom: 30, left: 35, yAxis: 3 };
// The middleAdjustment here is to avoid line being like underscore, and move the line into middle place.
const LEGEND = {
  ratio: 0.2,
  minWidth: 150,
  height: 20,
  middleAdjustment: 5,
  leftMarginForChart: 50,
};

/**
 * Return an array of dashes.
 */
function getDashes(n: number): string[] {
  let dashes: string[];
  dashes = [""];
  if (dashes.length === n) return dashes;
  for (let sum = 10; ; sum += 6) {
    let left = sum / 2;
    let right = sum / 2;
    while (left >= 3) {
      dashes.push("" + left + ", " + right);
      if (dashes.length === n) return dashes;
      left -= 2;
      right += 2;
    }
  }
}

function getColorFn(labels: string[]): d3.ScaleOrdinal<string, string> {
  let range;
  if (labels.length === 1) {
    range = ["#930000"];
  } else if (labels.length === 2) {
    range = ["#930000", "#3288bd"];
  } else {
    range = d3.quantize(
      d3.interpolateRgbBasis([
        "#930000",
        "#d30000",
        "#f46d43",
        "#fdae61",
        "#fee08b",
        "#66c2a5",
        "#3288bd",
        "#5e4fa2",
      ]),
      labels.length
    );
  }
  return d3.scaleOrdinal<string, string>().domain(labels).range(range);
}

function appendLegendElem(
  elem: string,
  color: d3.ScaleOrdinal<string, string>,
  keys: string[]
) {
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

/**
 * From https://bl.ocks.org/mbostock/7555321
 * Wraps axis text by fitting as many words per line as would fit a given width.
 */
function wrap(
  texts: d3.Selection<SVGTextElement, any, any, any>,
  width: number
) {
  texts.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const y = text.attr("y");
    const dy = parseFloat(text.attr("dy"));
    let tspan = text
      .text(null)
      .append("tspan")
      .attr("x", 0)
      .attr("y", y)
      .attr("dy", dy + "em");
    let word: string;
    word = words.pop();
    while (word) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", 0)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
      word = words.pop();
    }
  });
}

function addXAxis(
  svg: d3.Selection<SVGElement, any, any, any>,
  height: number,
  xScale: d3.AxisScale<any>
) {
  const axis = svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${height - MARGIN.bottom})`)
    .call(d3.axisBottom(xScale).ticks(NUM_X_TICKS).tickSizeOuter(0))
    .call((g) => g.select(".domain").remove());

  if (typeof xScale.bandwidth === "function") {
    axis.selectAll(".tick text").call(wrap, xScale.bandwidth());
  }
}

function addYAxis(
  svg: d3.Selection<SVGElement, any, any, any>,
  width: number,
  yScale: d3.ScaleLinear<any, any>,
  unit?: string
) {
  svg
    .append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${width - MARGIN.right},0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS)
        .tickSize(width - 5 - MARGIN.right)
        .tickFormat((d) => {
          const yticks = yScale.ticks();
          const p = d3.precisionPrefix(
            yticks[1] - yticks[0],
            yticks[yticks.length - 1]
          );
          const tText = d3.formatPrefix(`.${p}`, yScale.domain()[1])(d);
          const dollar = unit === "$" ? "$" : "";
          const percent = unit === "%" ? "%" : "";
          return `${dollar}${tText}${percent}`;
        })
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g.selectAll(".tick:not(:first-of-type) line").attr("class", "grid-line")
    )
    .call((g) =>
      g
        .selectAll(".tick text")
        .attr("x", -width + MARGIN.left + MARGIN.yAxis)
        .attr("dy", -4)
    );
}

/**
 * Draw single bar chart.
 * @param id
 * @param width
 * @param height
 * @param dataPoints
 * @param unit
 */
function drawSingleBarChart(
  id: string,
  width: number,
  height: number,
  dataPoints: DataPoint[],
  unit?: string
) {
  const textList = dataPoints.map((dataPoint) => dataPoint.label);
  const values = dataPoints.map((dataPoint) => dataPoint.value);

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(values)])
    .nice()
    .rangeRound([height - MARGIN.bottom, MARGIN.top]);

  const color = getColorFn(textList);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x);
  addYAxis(svg, width, y, unit);

  svg
    .append("g")
    .selectAll("rect")
    .data(dataPoints)
    .join("rect")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) => color(d.label));
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

  const data = [];
  for (const dataGroup of dataGroups) {
    const curr: { [property: string]: any } = { label: dataGroup.label };
    for (const dataPoint of dataGroup.value) {
      curr[dataPoint.label] = dataPoint.value;
    }
    data.push(curr);
  }

  const series = d3.stack().keys(keys)(data);

  const x = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d3.max(d, (d1) => d1[1]))])
    .nice()
    .rangeRound([height - MARGIN.bottom, MARGIN.top]);

  const color = getColorFn(keys);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x);
  addYAxis(svg, width, y, unit);

  svg
    .append("g")
    .selectAll("g")
    .data(series)
    .enter()
    .append("g")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    .data((d) => d)
    .join("rect")
    .attr("x", (d) => x(String(d.data.label)))
    .attr("y", (d) => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(d[0]) - y(d[1]));

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
  const keys = dataGroups[0].value.map((dp) => dp.label);
  const x0 = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const x1 = d3
    .scaleBand()
    .domain(keys)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  const y = d3
    .scaleLinear()
    .domain([0, maxV])
    .nice()
    .rangeRound([height - MARGIN.bottom, MARGIN.top]);

  const color = getColorFn(keys);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x0);
  addYAxis(svg, width, y, unit);
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
  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  let minV = Math.min(...dataGroups.map((dataGroup) => dataGroup.min()));
  if (minV > 0) {
    minV = 0;
  }

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right]);

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top])
    .nice(NUM_Y_TICKS);

  addXAxis(svg, height, xScale);
  addYAxis(svg, width, yScale, unit);

  const legendText = dataGroups.map((dataGroup) =>
    dataGroup.label ? dataGroup.label : "a"
  );
  const colorFn = getColorFn(legendText);

  for (const dataGroup of dataGroups) {
    const dataset = dataGroup.value.map((dp) => {
      return [new Date(dp.label).getTime(), dp.value];
    });
    const shouldAddDots = dataset.length < 12;
    const color = colorFn(dataGroup.label);

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

interface PlotParams {
  // Label to color.
  colors: { [key: string]: string };
  // Label to dash style.
  dashes: { [key: string]: string };
}

/**
 * Return color and dash style given place names and stats names.
 */
function computePlotParams(
  placeNames: string[],
  statsNames: string[]
): PlotParams {
  const colors = {};
  const dashes = {};
  const colorFn = getColorFn(statsNames);
  const dashFn = getDashes(placeNames.length);
  for (const statsName of statsNames) {
    colors[statsName] = colorFn(statsName);
  }
  for (let i = 0; i < placeNames.length; i++) {
    dashes[placeNames[i]] = dashFn[i];
  }
  return {
    colors,
    dashes,
  };
}

interface Range {
  // min value of the range.
  minV: number;
  // max value of the range.
  maxV: number;
}

/**
 * Return a Range object defined above.
 *
 * @param dataGroupsDict
 */
function computeRanges(dataGroupsDict: { [geoId: string]: DataGroup[] }) {
  let range: Range;
  range = {
    minV: 0,
    maxV: 0,
  };

  let dataGroups: DataGroup[];
  let maxV = 0;
  for (const geoId in dataGroupsDict) {
    dataGroups = dataGroupsDict[geoId];
    maxV = Math.max(
      maxV,
      Math.max(...dataGroups.map((dataGroup) => dataGroup.max()))
    );
  }
  range.maxV = maxV;
  return range;
}

/**
 * Draw a group of lines chart with in-chart legend given a dataGroupsDict with different geoIds.
 *
 * @param id: DOM id.
 * @param width: width for the chart.
 * @param height: height for the chart.
 * @param dataGroupsDict: {[place: string]: DataGroup[]}.
 * @param plotParams: contains all plot params for chart.
 * @param unit
 */
function drawGroupLineChart(
  id: string,
  width: number,
  height: number,
  dataGroupsDict: { [place: string]: DataGroup[] },
  plotParams: PlotParams,
  unit?: string
) {
  let dataGroups = Object.values(dataGroupsDict)[0];

  // Adjust the width of in-chart legends.
  const legendWidth = Math.max(width * LEGEND.ratio, LEGEND.minWidth);
  const yRange = computeRanges(dataGroupsDict);
  const minV = yRange.minV;
  const maxV = yRange.maxV;

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right - legendWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top])
    .nice(NUM_Y_TICKS);

  addXAxis(svg, height, xScale);
  addYAxis(svg, width, yScale, unit);

  for (const place in dataGroupsDict) {
    dataGroups = dataGroupsDict[place];
    for (const dataGroup of dataGroups) {
      const dataset = dataGroup.value.map((dp) => [
        new Date(dp.label).getTime(),
        dp.value,
      ]);

      const line = d3
        .line()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]));

      svg
        .append("path")
        .datum(dataset)
        .attr("class", "line")
        .style("stroke", plotParams.colors[dataGroup.label])
        .attr("d", line)
        .attr("stroke-width", "2")
        .attr("stroke-dasharray", plotParams.dashes[place]);
    }
  }

  const legendId = randDomId();
  svg
    .append("g")
    .attr("id", legendId)
    .attr(
      "transform",
      `translate(${width - legendWidth}, ${LEGEND.leftMarginForChart})`
    );

  buildInChartLegend(legendId, plotParams);
}

/**
 * Generate in-chart legend.
 *
 * @param id: This is the id for the chart legend element.
 * @param plotParams: It contains all colors and dashes for geoIds and statVars.
 */
function buildInChartLegend(id: string, plotParams: PlotParams) {
  const legend = d3.select("#" + id);
  if (Object.keys(plotParams.dashes).length === 1) {
    // Only have one geoId. Then different statsVars should have different colors.
    const statsVars = Object.keys(plotParams.colors);
    for (let i = 0; i < statsVars.length; i++) {
      legend
        .append("g")
        .attr("transform", `translate(0, ${LEGEND.height * i})`)
        .append("text")
        .attr("x", "40")
        .attr("y", `${LEGEND.height * i}`)
        .text(statsVars[i])
        .style("font-size", "14")
        .attr("fill", `${plotParams.colors[statsVars[i]]}`);
    }
  } else {
    // Have multiple goeIds. Then different geoIds should have different dashes.
    const placeNames = Object.keys(plotParams.dashes);
    for (let i = 0; i < placeNames.length; i++) {
      const placeName = placeNames[i];
      legend
        .append("g")
        .attr("transform", `translate(0, ${LEGEND.height * i})`);
      legend
        .append("line")
        .attr("stroke-width", 2)
        .attr("x1", "0")
        .attr("y1", `${LEGEND.height * i - LEGEND.middleAdjustment}`)
        .attr("x2", "30")
        .attr("y2", `${LEGEND.height * i - LEGEND.middleAdjustment}`)
        // Default color to be black here.
        .attr("stroke", "#000000")
        .attr("stroke-dasharray", `${plotParams.dashes[placeName]}`);
      legend
        .append("text")
        .attr("x", "40")
        .attr("y", `${LEGEND.height * i}`)
        .text(placeName)
        .style("font-size", "14");
    }
  }
}

export {
  getDashes,
  appendLegendElem,
  getColorFn,
  computePlotParams,
  drawLineChart,
  drawGroupLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
};
