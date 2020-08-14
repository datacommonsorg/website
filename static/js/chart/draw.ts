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

import { DataGroup, DataPoint, PlotParams, Style, getColorFn } from "./base";

const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 40, right: 10, bottom: 30, left: 35, yAxis: 3, grid: 5 };
const LEGEND = {
  ratio: 0.2,
  minTextWidth: 100,
  dashWidth: 30,
  lineMargin: 10,
  marginLeft: 15,
  marginTop: 40,
  defaultColor: "#000",
};
const SOURCE = {
  topMargin: 15,
  height: 20,
};
const LABELTOPMARGIN = 10;

function appendLegendElem(
  elem: string,
  color: d3.ScaleOrdinal<string, string>,
  keys: string[]
): void {
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
    .attr("transform", `translate(${width - MARGIN.right}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS)
        .tickSize(width - MARGIN.grid - MARGIN.right)
        .tickFormat((d) => {
          const yticks = yScale.ticks();
          const p = d3.precisionPrefix(
            yticks[1] - yticks[0],
            yticks[yticks.length - 1]
          );
          let tText = String(d);
          // When the y value is less than one, use the original value.
          // Otherwise 0.3 is formatted into 300m which is confusing to 300M.
          if (d > 1) {
            tText = d3.formatPrefix(`.${p}`, yScale.domain()[1])(d);
          }
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
): void {
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
): void {
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
): void {
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

  const colorFn = getColorFn(keys);

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
    .attr("fill", (d) => colorFn(d.key));

  appendLegendElem(id, colorFn, keys);
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
): void {
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
      .style("stroke", colorFn(dataGroup.label))
      .attr("d", line);

    if (shouldAddDots) {
      svg
        .selectAll(".dot")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("fill", colorFn(dataGroup.label))
        .attr("r", 3);
    }
  }

  if (dataGroups.length > 1) {
    appendLegendElem(id, colorFn, legendText);
  }
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
 * @param statsVarsTitle: object from stats var dcid to display title.
 * @param dataGroupsDict: data groups for plotting.
 * @param plotParams: contains all plot params for chart.
 * @param source: an array of source domain.
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
  source?: string[],
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
    .attr("width", width)
    .attr("height", height + SOURCE.height);

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
  addYAxis(svg, width - MARGIN.right - legendWidth, yScale, unit);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.grid}, ${LABELTOPMARGIN})`)
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
      svg
        .append("path")
        .datum(dataset)
        .attr("class", "line")
        .style("stroke", lineStyle.color)
        .attr("d", line)
        .attr("stroke-width", "1")
        .attr("stroke-dasharray", lineStyle.dash);
    }
  }
  // add source info to the chart
  if (source) {
    const sourceText = "Data source: " + source.filter(Boolean).join(", ");
    svg
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "start")
      .attr(
        "transform",
        `translate(${MARGIN.grid}, ${height + SOURCE.topMargin})`
      )
      .attr("fill", "#808080")
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
        .attr("stroke", LEGEND.defaultColor)
        .attr("stroke-dasharray", `${legendStyle.dash}`);
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
      .attr("fill", `${legendStyle.color}`)
      .call(wrap, legendTextdWidth);
    yOffset += lgGroup.node().getBBox().height + LEGEND.lineMargin;
  }
}

export {
  appendLegendElem,
  drawLineChart,
  drawGroupLineChart,
  drawSingleBarChart,
  drawStackBarChart,
  drawGroupBarChart,
};
