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
  formatYAxisTicks,
} from "./base";

import i18next from "i18next";
import Backend from "i18next-http-backend";
import Cache from "i18next-localstorage-cache";
import postProcessor from "i18next-sprintf-postprocessor";
import LanguageDetector from "i18next-browser-languagedetector";

i18next
  .use(Backend)
  .use(Cache)
  .use(LanguageDetector)
  .use(postProcessor)
  .init(
    {
      lng: "es",
      resources: {
        es: {
          translation: {
            "San Jose": "San Jose",
            Fremont: "Fremont",
            "San Francisco": "San Francisco",
            "Mountain View": "Vista desde la Montaña",
            "Very-Long-City-Name": "Nombre-Ciudad-Muy-Largo",
            "Multi several very long city name long":
              "Varios nombres de ciudades muy largos largos",
            "very very very long place name": "nombre de lugar muy muy largo",
            "such a long name that it needs to span 4 lines":
              "un nombre tan largo que necesita abarcar 4 líneas",
            "Santa Clara County": "Condado de Santa Clara",
            Nevada: "Nevada",
            California: "California",
            "United States": "Estados Unidos",
            January: "Enero",
            February: "Febrero",
            March: "Marzo",
            April: "Abril",
            May: "Mayo",
            June: "Junio",
            July: "Julio",
            August: "Agosto",
            September: "Septiembre",
            October: "Octubre",
            November: "Noviembre",
            December: "Diciembre",
            Total: "Total",
            Male: "Masculino",
            "label-1": "etiqueta-1",
            "label-2": "etiqueta-2",
          },
        },
      },
    },
    function (err, t) {}
  );

const NUM_X_TICKS = 5;
const NUM_Y_TICKS = 5;
const MARGIN = { top: 20, right: 10, bottom: 30, left: 40, yAxis: 3, grid: 5 };
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

// Max Y value used for y domains for charts that have only 0 values.
const MAX_Y_FOR_ZERO_CHARTS = 10;

function translate(text: string): string {
  if (i18next.t(text)) {
    text = i18next.t(text);
  }
  return text;
}
function translate_key(key: { label: string; link?: string }) {
  key.label = translate(key.label);
}
function appendLegendElem(
  elem: string,
  color: d3.ScaleOrdinal<string, string>,
  keys: {
    label: string;
    link?: string;
  }[]
): void {
  keys.forEach(translate_key);
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
    const words = translate(text.text())
      .replace("-", "-#") // Handle e.g. "ABC-AB A" -> "ABC-", "AB" "A"
      .split(/[ #]/)
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
      word = word.trim();
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
    axis
      .selectAll(".tick text")
      .style("fill", AXIS_TEXT_FILL)
      .style("font-family", TEXT_FONT_FAMILY)
      .style("text-rendering", "optimizedLegibility")
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

/**
 * Updates X-Axis after initial render (with wrapping) and Y-Axis scaling.
 * Mostly updates the domain path to be set to y(0).
 *
 * @param g: d3-selection with an G element that contains the X-Axis
 * @param xHeight: The height of the X-Axis
 * @param chartHeight: The height of the SVG chart
 * @param yScale: d3-scale for the Y-axis
 */
function updateXAxis(
  xAxis: d3.Selection<SVGGElement, any, any, any>,
  xAxisHeight: number,
  chartHeight: number,
  yScale: d3.AxisScale<any>
): void {
  const xDomain = xAxis.select(".domain");
  const xDomainPath = xDomain.attr("d");
  xDomain
    .attr("d", xDomainPath.replace(`M${MARGIN.left}`, "M5"))
    .attr("stroke", AXIS_GRID_FILL)
    .attr(
      "transform",
      `translate(0, ${yScale(0) + xAxisHeight - chartHeight})`
    );
}

function addYAxis(
  g: d3.Selection<SVGGElement, any, any, any>,
  width: number,
  yScale: d3.ScaleLinear<any, any>,
  unit?: string
) {
  g.attr("transform", `translate(${width - MARGIN.right}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .ticks(NUM_Y_TICKS)
        .tickSize(width - MARGIN.grid - MARGIN.right)
        .tickFormat((d) => {
          return formatYAxisTicks(d, yScale, unit);
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
        .selectAll(".tick line")
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
  const textList = dataPoints.map((dataPoint) => translate(dataPoint.label));
  const values = dataPoints.map((dataPoint) => dataPoint.value);

  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("xmlns", SVGNS)
    .attr("xmlns:xlink", XLINKNS)
    .attr("width", width)
    .attr("height", height);

  const yAxis = svg.append("g").attr("class", "y axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const xAxis = svg.append("g").attr("class", "x axis");

  const x = d3
    .scaleBand()
    .domain(textList)
    .rangeRound([MARGIN.left, width - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(xAxis, height, x, true);

  const yExtent = d3.extent(values);
  const y = d3
    .scaleLinear()
    .domain([Math.min(0, yExtent[0]), yExtent[1]])
    .rangeRound([height - bottomHeight, MARGIN.top]);

  const color = getColorFn(["A"])("A"); // we only need one color

  addYAxis(yAxis, width, y, unit);
  updateXAxis(xAxis, bottomHeight, height, y);

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

  const x = d3
    .scaleBand()
    .domain(dataGroups.map((dg) => dg.label))
    .rangeRound([MARGIN.left, chartWidth - MARGIN.right])
    .paddingInner(0.1)
    .paddingOuter(0.1);

  const bottomHeight = addXAxis(xAxis, chartHeight, x, false, labelToLink);

  const y = d3
    .scaleLinear()
    .domain([
      d3.min([0, d3.min(series, (d) => d3.min(d, (d1) => d1[0]))]),
      d3.max(series, (d) => d3.max(d, (d1) => d1[1])),
    ])
    .nice()
    .rangeRound([chartHeight - bottomHeight, MARGIN.top]);

  addYAxis(yAxis, chartWidth, y, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

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

  const yAxis = svg.append("g").attr("class", "y axis");
  const chart = svg.append("g").attr("class", "chart-area");
  const xAxis = svg.append("g").attr("class", "x axis");

  const bottomHeight = addXAxis(xAxis, chartHeight, x0, false, labelToLink);

  const minV = Math.min(
    0,
    Math.min(...dataGroups.map((dataGroup) => dataGroup.min()))
  );
  const maxV = Math.max(...dataGroups.map((dataGroup) => dataGroup.max()));
  const y = d3
    .scaleLinear()
    .domain([minV, maxV])
    .nice()
    .rangeRound([chartHeight - bottomHeight, MARGIN.top]);

  addYAxis(yAxis, chartWidth, y, unit);
  updateXAxis(xAxis, bottomHeight, chartHeight, y);

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

  const yAxis = svg.append("g").attr("class", "y axis");
  const xAxis = svg.append("g").attr("class", "x axis");
  const chart = svg.append("g").attr("class", "chart-area");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right]);

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top])
    .nice(NUM_Y_TICKS);

  const bottomHeight = addXAxis(xAxis, height, xScale);
  addYAxis(yAxis, width, yScale, unit);
  updateXAxis(xAxis, bottomHeight, height, yScale);

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
      chart
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

  const yAxis = svg.append("g").attr("class", "y axis");
  const xAxis = svg.append("g").attr("class", "x axis");
  const chart = svg.append("g").attr("class", "chart-area");

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(dataGroups[0].value, (d) => new Date(d.label).getTime()))
    .range([MARGIN.left, width - MARGIN.right - legendWidth]);

  const yScale = d3
    .scaleLinear()
    .domain([minV, maxV])
    .range([height - MARGIN.bottom, MARGIN.top + YLABEL.height])
    .nice(NUM_Y_TICKS);

  const bottomHeight = addXAxis(xAxis, height, xScale);
  addYAxis(yAxis, width - legendWidth, yScale, unit);
  updateXAxis(xAxis, bottomHeight, height, yScale);

  // add ylabel
  svg
    .append("text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("transform", `translate(${MARGIN.grid}, ${YLABEL.topMargin})`)
    .style("font-size", "12px")
    .style("text-rendering", "optimizedLegibility")
    .text(translate(ylabel));

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
  if (source) {
    const sourceText = "Data source: " + source.filter(Boolean).join(", ");
    svg
      .append("text")
      .attr("class", "label")
      .attr(
        "transform",
        `translate(${MARGIN.grid}, ${height + SOURCE.topMargin})`
      )
      .style("fill", "#808080")
      .style("font-size", "12px")
      .style("text-anchor", "start")
      .style("text-rendering", "optimizedLegibility")
      .text(translate(sourceText));
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
      .text(translate(label))
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
};
