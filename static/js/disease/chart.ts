/**
 * Copyright 2022 Google LLC
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
import _ from "lodash";
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// graph specific dimensions - not all of them are used in the current graph, but might be used in future graphs
const GRAPH_HEIGHT_XS = 130;
const GRAPH_HEIGHT_S = 200;
const GRAPH_HEIGHT_M = 400;
const GRAPH_WIDTH_S = 660;
const GRAPH_WIDTH_M = 700;
const GRAPH_WIDTH_L = 760;
const GRAPH_WIDTH_XL = 1050;
// number to select top data points for large data
const NUM_DATA_POINTS = 10;
// number by which y axis domain is increased/decreased for y scale to fit all error bars well
const Y_AXIS_LIMIT = 0.5;
// dimension of tissue legend dots
const LEGEND_CIRCLE_RADIUS = 4;
// tooltip constant for all charts
const TOOL_TIP = d3.select("#main").append("div").attr("class", "tooltip");
// horizontal barcharts - default brightness
const DEFAULT_BRIGHTEN_PERCENTAGE = "112%";
type Datum = DiseaseGeneAssociationIntervalData;
/**
 * When mouse first enters element specified by given id, brighten it and update/display the global tooltip.
 */
function onMouseOver(
  elementID: string,
  toolTipText: string,
  brightenPercentage: string = DEFAULT_BRIGHTEN_PERCENTAGE
): void {
  // brighten element: https://stackoverflow.com/a/69610045
  d3.select(`#${elementID}`).style(
    "filter",
    `brightness(${brightenPercentage})`
  );
  // update tooltip text
  TOOL_TIP.html(toolTipText);
  // show tooltip
  TOOL_TIP.style("opacity", 1);
}

/**
 * Update position of global tooltip to track mouse.
 */
function onMouseMove(): void {
  TOOL_TIP.style("left", d3.event.pageX - 60 + "px").style(
    "top",
    d3.event.pageY - 60 + "px"
  );
}

/**
 * When mouse leaves element specified by given id, reset its brightness and hide the global tooltip.
 */
function onMouseOut(elementID: string): void {
  // reset element brightness
  d3.select(`#${elementID}`).style("filter", "brightness(100%)");
  // hide tooltip
  TOOL_TIP.style("opacity", 0);
}

/**
 * On mouse hover, select hovered element and
 *  1) highlight it
 *  2) update the global tooltip
 *  3) show the global tooltip.
 *
 * Unhighlight and hide the global tooltip when the mouse leaves.
 */
function handleMouseEvents(
  selection: d3.Selection<SVGElement, any, any, any>,
  idFunc: (index: number) => string,
  toolTipFunc: (datum: Datum) => string,
  brightenPercentage: string = DEFAULT_BRIGHTEN_PERCENTAGE
): void {
  selection
    .on("mouseover", (d, i) => {
      onMouseOver(idFunc(i), toolTipFunc(d), brightenPercentage);
    })
    .on("mousemove", onMouseMove)
    .on("mouseout", (d, i) => onMouseOut(idFunc(i)));
}

/**
 * Get function that takes an index and returns an ID containing the chart ID, element name, and index.
 */
function getElementIDFunc(
  chartID: string,
  elementName: string
): (index: number) => string {
  return (index) => `${chartID}-${elementName}${index}`;
}
/**
 * Adds the x label to a graph based on user's input of width and height for label position, labelText for what the label reads, and svg for selecting the chart where the label is added
 */
function addXLabel(
  width: number,
  height: number,
  labelText: string,
  svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
) {
  svg
    .attr("class", "axis-label")
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 40) + ")"
    )
    .text(labelText);
}
/**
 * Adds the y label to a graph based on user's input of width and height for label position, labelText for what the label reads, and svg for selecting the chart where the label is added
 */
function addYLabel(
  height: number,
  labelText: string,
  svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>
) {
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .text(labelText);
}

export interface DiseaseGeneAssociationRawData {
  // name of the associated gene
  name: string;
  // confidence score
  score: number;
  // length of the confidence interval
  interval: number;
}
export interface DiseaseGeneAssociationIntervalData {
  // name of the associated gene
  name: string;
  // confidence score
  score: number;
  // lower confidence value = score - (interval/2)
  lowerInterval: number;
  // upper confidence value = score + (interval/2)
  upperInterval: number;
}
/**
 * Draws the disease-gene association charts for the disease of interest
 * @param id
 * @param data
 * @returns
 */
export function drawDiseaseGeneAssocChart(
  id: string,
  data: DiseaseGeneAssociationRawData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  let reformattedData = [] as DiseaseGeneAssociationIntervalData[];
  // reformats the data by converting the confidence interval length to lower and upper confidence values
  reformattedData = data.map((item) => {
    return {
      name: item.name,
      score: Number(item.score),
      lowerInterval: Number(item.score - item.interval / 2),
      upperInterval: Number(item.score) + Number(item.interval / 2),
    };
  });
  //Formats the gene name
  function formatGeneName(d: string) {
    // remove the word "bio/hg38_" from the entire gene name, say "bio/hg38_pRNA"
    d = d.substring(9);
    return d;
  }
  const height = GRAPH_HEIGHT_M - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_L - MARGIN.left - MARGIN.right;
  const svg = d3
    .select("#disease-gene-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  // slicing the data to display 10 values only
  reformattedData = reformattedData.slice(0, NUM_DATA_POINTS);
  // plots the axes
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(
      reformattedData.map(function (d) {
        return d.name;
      })
    )
    .padding(1);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).tickFormat(formatGeneName))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  addXLabel(width, height, "Gene Names", svg);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(reformattedData, (d) => d.upperInterval) + Y_AXIS_LIMIT])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));
  addYLabel(height, "Confidence Score", svg);
  // the lines
  svg
    .selectAll("myline")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", (d) => {
      return x(d.name);
    })
    .attr("x2", (d) => {
      return x(d.name);
    })
    .attr("y1", (d) => {
      return y(d.lowerInterval);
    })
    .attr("y2", (d) => {
      return y(d.upperInterval);
    })
    .attr("stroke", "grey");
  const circleIDFunc = getElementIDFunc(id, "circle");
  // the circles
  svg
    .selectAll("mycircle")
    .data(reformattedData)
    .enter()
    .append("circle")
    .attr("cx", (d) => {
      return x(d.name);
    })
    .attr("cy", (d) => {
      return y(d.score);
    })
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .attr("id", (d, i) => circleIDFunc(i))
    .style("fill", "maroon")
    .call(
      handleMouseEvents,
      circleIDFunc,
      (d) =>
        `Gene Name: ${formatGeneName(d.name)}<br>Confidence Score: ${d.score}`
    );
}
