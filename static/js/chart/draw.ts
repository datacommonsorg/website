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

import {
  DataGroup,
  DataPoint,
  PlotParams,
  Style,
  getColorFn,
  shouldFillInValues,
} from "./base";

const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 20, right: 10, bottom: 30, left: 35, yAxis: 3, grid: 5 };
const ROTATE_MARGIN_BOTTOM = 75; // margin bottom to use for histogram
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
const YLABEL = {
  topMargin: 10,
  height: 15,
};
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";

const TEXT_FONT_FAMILY = "Roboto";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";

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

function getWrapLineSeparator(line: string[]): string {
  return line.length > 0
    ? line[line.length - 1].slice(-1) === "-"
      ? ""
      : " "
    : "";
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
    const words = text
      .text()
      .split(/(?<=[-\s])/)
      .filter((w) => w.trim() != "")
      .reverse();
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
      let separator = getWrapLineSeparator(line);
      line.push(word);
      tspan.text(line.join(separator));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        separator = getWrapLineSeparator(line);
        tspan.text(line.join(separator));
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

/**
 * Adds an X-Axis to the svg chart. Tick labels will be wrapped if necessary (unless shouldRotate).
 *
 * @param svg: d3-selection with an SVG element to add the x-axis to
 * @param chartHeight: The height of the SVG chart
 * @param chartWidth: The width of the SVG chart
 * @param xScale: d3-scale for the x-axis
 * @param shouldRotate: true if the x-ticks should be rotated (no wrapping applied).
 *
 * @return the height of the x-axis bounding-box.
 */
function addXAxis(
  svg: d3.Selection<SVGElement, any, any, any>,
  chartHeight: number,
  xScale: d3.AxisScale<any>,
  shouldRotate?: boolean
): number {
  const d3Axis = d3.axisBottom(xScale).ticks(NUM_X_TICKS).tickSizeOuter(0);
  if (shouldRotate && typeof xScale.bandwidth == "function") {
    if (xScale.bandwidth() < 5) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 5 == 0));
    } else if (xScale.bandwidth() < 15) {
      d3Axis.tickValues(xScale.domain().filter((v, i) => i % 3 == 0));
    }
  }

  const axis = svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0, ${chartHeight - MARGIN.bottom})`)
    .style("stroke", AXIS_GRID_FILL)
    .style("stroke-width", "0.5px")
    .call(d3Axis)
    .call((g) => g.select(".domain").remove());

  if (shouldRotate) {
    axis
      .attr("transform", `translate(0, ${chartHeight - ROTATE_MARGIN_BOTTOM})`)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-35)");
  } else if (typeof xScale.bandwidth === "function") {
    axis
      .selectAll(".tick text")
      .style("fill", AXIS_TEXT_FILL)
      .style("font-family", TEXT_FONT_FAMILY)
      .style("shape-rendering", "crispEdges")
      .call(wrap, xScale.bandwidth());
  }

  let axisHeight = axis.node().getBBox().height;
  if (axisHeight > MARGIN.bottom) {
    axis.attr("transform", `translate(0, ${chartHeight - axisHeight})`);
  } else {
    axisHeight = MARGIN.bottom;
  }
  return axisHeight;
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
          if (d > 1 || d < -1) {
            tText = d3
              .formatPrefix(
                `.${p}`,
                yScale.domain()[1]
              )(d)
              .replace(/G/, "B");
          }
          const dollar = unit === "$" ? "$" : "";
          const percent = unit === "%" ? "%" : "";
          const grams = unit === "g" ? "g" : "";
          return `${dollar}${tText}${percent}${grams}`;
        })
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .selectAll("line")
        .style("stroke", AXIS_GRID_FILL)
        .style("stroke-width", "0.5")
    )
    .call((g) =>
      g
        .selectAll(".tick:not(:first-of-type) line")
        .attr("class", "grid-line")
        .style("stroke-opacity", "0.5")
        .style("stroke-dasharray", "2, 2")
    )
    .call((g) =>
      g
        .selectAll(".tick text")
        .attr("x", -width + MARGIN.left + MARGIN.yAxis)
        .attr("dy", -4)
        .style("fill", AXIS_TEXT_FILL)
        .style("font-family", TEXT_FONT_FAMILY)
        .style("shape-rendering", "crispEdges")
    );
}

/**
 * Draw histogram. Used for ranking pages.
 * @param id
 * @param width
 * @param height
 * @param dataPoints
 * @param unit
 */
function drawHistogram(
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
    .rangeRound([height - ROTATE_MARGIN_BOTTOM, MARGIN.top]);

  const color = getColorFn(["A"])("A"); // we only need one color

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height);

  addXAxis(svg, height, x, true);
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

  const series = d3.stack().keys(keys)(data);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const x = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(svg, chartHeight, x);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d3.max(d, (d1) => d1[1]))])
    .nice()
    .rangeRound([chartHeight - bottomHeight, MARGIN.top]);

  addYAxis(svg, chartWidth, y, unit);

  const color = getColorFn(keys);

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
    .classed("g-bar", true)
    .attr("data-dcid", (d) => d.data.dcid)
    .attr("x", (d) => x(String(d.data.label)))
    .attr("y", (d) => (Number.isNaN(d[1]) ? y(d[0]) : y(d[1])))
    .attr("width", x.bandwidth())
    .attr("height", (d) => (Number.isNaN(d[1]) ? 0 : y(d[0]) - y(d[1])));

  appendLegendElem(id, color, keys);
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
  const x0 = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const x1 = d3
    .scaleBand()
    .domain(keys)
    .rangeRound([0, x0.bandwidth()])
    .padding(0.05);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const bottomHeight = addXAxis(svg, chartHeight, x0);

  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  const y = d3
    .scaleLinear()
    .domain([0, maxV])
    .nice()
    .rangeRound([chartHeight - bottomHeight, MARGIN.top]);

  addYAxis(svg, chartWidth, y, unit);

  const colorFn = getColorFn(keys);

  svg
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
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("fill", (d) => colorFn(d.key));

  appendLegendElem(id, colorFn, keys);

  // Add link to place name labels.
  svg
    .select(".x.axis")
    .selectAll(".tick text")
    .filter(function (this) {
      return !!labelToLink[d3.select(this).text()];
    })
    .attr("class", "place-tick")
    .style("cursor", "pointer")
    .style("text-decoration", "underline")
    .on("click", function (this) {
      window.open(labelToLink[d3.select(this).text()], "_blank");
    });
}

/**
 * Draw line chart.
 * @param id
 * @param width
 * @param height
 * @param dataGroups
 * @param unit
 *
 * @return false if any series in the chart was filled in
 */
function drawLineChart(
  id: string,
  width: number,
  height: number,
  dataGroups: DataGroup[],
  unit?: string
): boolean {
  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  let minV = Math.min(...dataGroups.map((dataGroup) => dataGroup.min()));
  if (minV > 0) {
    minV = 0;
  }

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
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
    dataGroup.label ? dataGroup.label : "A"
  );
  const colorFn = getColorFn(legendText);

  let hasFilledInValues = false;
  for (const dataGroup of dataGroups) {
    const dataset = dataGroup.value.map((dp) => {
      return [new Date(dp.label).getTime(), dp.value];
    });
    const hasGap = shouldFillInValues(dataset);
    hasFilledInValues = hasFilledInValues || hasGap;
    const shouldAddDots = dataset.length < 12;

    const line = d3
      .line()
      .defined((d) => d[1] !== null) // Ignore points that are null
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]));

    if (hasGap) {
      // Draw a second line behind the main line with a different styling to
      // fill in gaps.
      svg
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

    svg
      .append("path")
      .datum(dataset)
      .attr("class", "line")
      .style("stroke", colorFn(dataGroup.label))
      .attr("d", line)
      .style("fill", "none")
      .style("stroke-width", "2.5px")
      .style("stroke", colorFn(dataGroup.label));

    if (shouldAddDots) {
      svg
        .append("g")
        .selectAll(".dot")
        .data(dataset)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xScale(d[0]))
        .attr("cy", (d) => yScale(d[1]))
        .attr("r", (d) => (d[1] === null ? 0 : 3))
        .style("fill", colorFn(dataGroup.label))
        .style("stroke", "#fff");
    }
  }

  appendLegendElem(id, colorFn, legendText);
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
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height + SOURCE.height);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right - legendWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top + YLABEL.height])
    .nice(NUM_Y_TICKS);

  addXAxis(svg, height, xScale);
  addYAxis(svg, width - legendWidth, yScale, unit);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.grid}, ${YLABEL.topMargin})`)
    .style("font-size", "12px")
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
  drawGroupBarChart,
  drawGroupLineChart,
  drawHistogram,
  drawLineChart,
  drawSingleBarChart,
  drawStackBarChart,
};
