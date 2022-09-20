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

import {
  addXLabel,
  addYLabel,
  getElementIDFunc,
  handleMouseEvents,
  MARGIN,
  NUM_DATA_POINTS,
} from "../bio_charts_utils";
import {
  DiseaseGeneAssociationData,
  DiseaseSymptomAssociationData,
} from "./types";
// graph specific dimensions
const GRAPH_HEIGHT = 400;
const GRAPH_WIDTH = 760;
// number by which y axis domain is increased/decreased for y scale to fit all error bars well
const Y_AXIS_LIMIT = 0.5;
// dimension of tissue legend dots
const LEGEND_CIRCLE_RADIUS = 4;
// length of the error bar cap for disease-gene associations chart
const ERROR_BAR_CAP_LENGTH = 10;

//TODO: Create a type.ts file and move all interfaces there

/**
 * Draws the disease-gene association charts for the disease of interest
 * @param id the div id where the chart is rendered on the page
 * @param data the disease data passed into the function
 */
export function drawDiseaseGeneAssocChart(
  id: string,
  data: DiseaseGeneAssociationData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }

  const height = GRAPH_HEIGHT - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH - MARGIN.left - MARGIN.right;
  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  // slicing the data to display 10 values only
  const slicedData = data.slice(0, NUM_DATA_POINTS);
  // plots the axes
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(
      slicedData.map((d) => {
        return d.name;
      })
    )
    .padding(1);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end");
  addXLabel(width, height, "Gene Names", svg);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(slicedData, (d) => d.upperInterval) + Y_AXIS_LIMIT])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));
  addYLabel(height, "Confidence Score", svg);
  // the lines
  svg
    .selectAll("disease-gene-line")
    .data(slicedData)
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
  svg
    .selectAll("disease-gene-upper-line")
    .data(slicedData)
    .enter()
    .append("line")
    .attr("x1", (d) => {
      return x(d.name) - ERROR_BAR_CAP_LENGTH / 2;
    })
    .attr("x2", (d) => {
      return x(d.name) + ERROR_BAR_CAP_LENGTH / 2;
    })
    .attr("y1", (d) => {
      return y(d.upperInterval);
    })
    .attr("y2", (d) => {
      return y(d.upperInterval);
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");
  svg
    .selectAll("disease-gene-lower-line")
    .data(slicedData)
    .enter()
    .append("line")
    .attr("x1", (d) => {
      return x(d.name) - ERROR_BAR_CAP_LENGTH / 2;
    })
    .attr("x2", (d) => {
      return x(d.name) + ERROR_BAR_CAP_LENGTH / 2;
    })
    .attr("y1", (d) => {
      return y(d.lowerInterval);
    })
    .attr("y2", (d) => {
      return y(d.lowerInterval);
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");
  const circleIDFunc = getElementIDFunc(id, "circle");
  // the circles
  svg
    .selectAll("disease-gene-circle")
    .data(slicedData)
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
      (d) => `Gene Name: ${d.name}<br>Confidence Score: ${d.score}`
    );
}

/**
 * Draws the disease-symptom association charts for the disease of interest
 * @param id the div id where the chart is rendered on the page
 * @param data the disease data passed into the function
 */
export function drawDiseaseSymptomAssociationChart(
  id: string,
  data: DiseaseSymptomAssociationData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  const height = GRAPH_HEIGHT - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH - MARGIN.left - MARGIN.right;
  const svg = d3
    .select(`#${id}`)
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  // slicing the data to display 10 values only
  const slicedData = data.slice(0, NUM_DATA_POINTS);
  // sorts the data in descreasing order
  slicedData.sort((a, b) => {
    return b.oddsRatio - a.oddsRatio;
  });
  // plots the axes
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(
      slicedData.map((d) => {
        return d.name;
      })
    )
    .padding(1);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-30)")
    .style("text-anchor", "end");
  addXLabel(width, height + 15, "Symptom Names", svg);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(slicedData, (d) => d.oddsRatio) + Y_AXIS_LIMIT])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));
  addYLabel(height, "Odds Ratio Associatiom Score", svg);
  const circleIDFunc = getElementIDFunc(id, "circle");
  // the circles
  svg
    .selectAll("disease-symptom-circle")
    .data(slicedData)
    .enter()
    .append("circle")
    .attr("cx", (d) => {
      return x(d.name);
    })
    .attr("cy", (d) => {
      return y(d.oddsRatio);
    })
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .attr("id", (d, i) => circleIDFunc(i))
    .style("fill", "maroon")
    .call(
      handleMouseEvents,
      circleIDFunc,
      (d) => `Symptom: ${d.name}<br>Odds Ratio Association: ${d.oddsRatio}`
    );
}
