/**
 * Copyright 2021 Google LLC
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
  DragBehavior,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3";
import _ from "lodash";

import { InteractingProteinType } from "./page";
import { ProteinVarType } from "./page";
import { getProteinInteractionGraphData } from "./data_processing_utils";
// interface for protein page datatypes which return number values
export interface ProteinNumData {
  name: string;
  value: number;
}

// interface for protein page datatypes which return string values
export interface ProteinStrData {
  name: string;
  value: string;
}

// interfaces for protein-protein interaction chart

export interface Node {
  id: string;
  name: string;
  value?: number;
}

// d3-force will add x,y,vx,vy data to ProteinNode after initialization
// https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L13
export interface ProteinNode extends Node, SimulationNodeDatum {
  depth: number;
  species: string;
}

// https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L24
export interface InteractionLink extends SimulationLinkDatum<ProteinNode> {
  score: number;
}

export interface InteractionGraphData{
  nodeData: ProteinNode[],
  linkData: InteractionLink[]
}

// interface for variant gene associations for plotting error bars
export interface VarGeneDataPoint {
  id: string;
  name: string;
  value: number;
  lower: number;
  upper: number;
}

const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// bar chart color for most of the charts
const BAR_COLOR = "maroon";
// tooltip constant for all charts
const BRIGHTEN_PERCENTAGE = "105%"
const TOOL_TIP = d3.select("#main").append("div").attr("class", "tooltip");
// length of side bar for error plot for variant-gene associations
const ERROR_SIDE_BAR_LENGTH = 5;
// number by which x axis domain is increased/decreased for x scale to fit all error bars well
const X_AXIS_LIMIT = 0.5;
// Dictionary mapping the tissue score to its label
const TISSUE_SCORE_TO_LABEL = {
  0: "NotDetected",
  1: "Low",
  2: "Medium",
  3: "High",
};
// Dictionary mapping the tissue expression string to its value
const TISSUE_VAL_TO_SCORE = {
  ProteinExpressionNotDetected: 0,
  ProteinExpressionLow: 1,
  ProteinExpressionMedium: 2,
  ProteinExpressionHigh: 3,
};
// color dictionary for tissue score
const TISSUE_COLOR_DICT = {
  AdiposeTissue: "khaki",
  AdrenalGland: "bisque",
  Appendix: "peru",
  BoneMarrow: "lightyellow",
  Breast: "mistyrose",
  Bronchus: "tomato",
  Cartilage: "seashell",
  Caudate: "lightcoral",
  Cerebellum: "lightcoral",
  CerebralCortex: "lightcoral",
  CervixUterine: "mistyrose",
  ChoroidPlexus: "lightcoral",
  Colon: "maroon",
  DorsalRaphe: "lightcoral",
  Duodenum: "maroon",
  Endometrium1: "mistyrose",
  Endometrium2: "mistyrose",
  Epididymis: "mistyrose",
  Esophagus: "chocolate",
  Eye: "coral",
  FallopianTube: "mistyrose",
  Gallbladder: "rosybrown",
  Hair: "salmon",
  HeartMuscle: "brown",
  Hippocampus: "lightcoral",
  Hypothalamus: "lightcoral",
  Kidney: "bisque",
  LactatingBreast: "mistyrose",
  Liver: "darksalmon",
  Lung: "tomato",
  LymphNode: "indianred",
  Nasopharynx: "tomato",
  OralMucosa: "darkorange",
  Ovary: "mistyrose",
  Pancreas: "orangered",
  ParathyroidGland: "snow",
  PituitaryGland: "sienna",
  Placenta: "mistyrose",
  Prostate: "mistyrose",
  Rectum: "maroon",
  Retina: "coral",
  SalivaryGland: "lightsalmon",
  SeminalVesicle: "mistyrose",
  SkeletalMuscle: "linen",
  Skin: "peachpuff",
  Skin1: "peachpuff",
  Skin2: "peachpuff",
  SmallIntestine: "ivory",
  SmoothMuscle: "red",
  SoftTissue1: "burlywood",
  SoftTissue2: "burlywood",
  SoleOfFoot: "peachpuff",
  Spleen: "tan",
  Stomach1: "darkred",
  Stomach2: "darkred",
  SubstantiaNiagra: "lightcoral",
  Testis: "mistyrose",
  Thymus: "indianred",
  ThyroidGland: "snow",
  Tonsil: "saddlebrown",
  UrinaryBladder: "sandybrown",
  Vagina: "mistyrose",
};
// tissue specific colors
const ERROR_BAR_VAR_COLOR = {
  Pancreas: "peachpuff",
  Thyroid: "lightcoral",
  "Whole Blood": "firebrick",
};
// tool tip left position
const TOOL_TIP_LEFT_POSITION = 230;
// number to select top data points for large data
const NUM_DATA_POINTS = 10;
// number to decide the ticks to be displayed
const NUM_TICKS = 10;
// graph specific dimensions
const GRAPH_HEIGHT_S = 200;
const GRAPH_HEIGHT_M = 400;
const GRAPH_HEIGHT_L = 500;
const GRAPH_WIDTH_S = 660;
const GRAPH_WIDTH_M = 700;
const GRAPH_WIDTH_L = 760;
const GRAPH_WIDTH_XL = 860;
// error point position
const ERROR_POINT_POSITION_X1 = 450;
const ERROR_POINT_POSITION_X2 = 470;
const ERROR_POINT_POSITION_Y1 = 10;
const ERROR_POINT_POSITION_Y2 = 30;
const ERROR_POINT_POSITION_Y3 = 50;


// style of node representations in interaction graph viz's
const NODE_STYLE = {
  circles: {
    fillColors: ["mistyrose", "peachpuff", "lightCoral", "lightsalmon"],
    radius: 15,
    stroke: {
      color: "#fff",
      opacity: 1,
      width: 1.5,
    },
  },
  labels: {
    font: {
      color: "#222",
      name: "public sans",
      size: "8px",
    },
  },
};

// style of link representations in interaction graph viz's
const LINK_STYLE = {
  length: 100,
  stroke: {
    color: "#AAA",
    linecap: "round",
    opacity: 1,
    scoreWidthMultiplier: 8,
  },
};

// https://stackoverflow.com/a/69610045
function brighten(): void {
  d3.select(this).style("filter", `brightness(${BRIGHTEN_PERCENTAGE})`)
}

function unbrighten(): void {
  d3.select(this).style("filter", "brightness(100%)")
}

/**
 * Gets the left and top coordinates of a rect element and positions the tooltip accordingly
 * @param left_position
 * @param top_position
 */
function mousemove(leftPosition: number, topPosition: number) {
  TOOL_TIP.style("left", d3.event.offsetX + leftPosition + "px").style(
    "top",
    d3.event.offsetY + topPosition + "px"
  );
}
/**
 * Sets the opacity of the tooltip as zero, to hide it when the user hovers over other elements
 */
function mouseout() {
  TOOL_TIP.style("opacity", 0);
}
/**
 * Adds the x label to a graph based on user's input of width and height for label position, labelText for what the label reads, and svg for selecting the chart where the label is added
 * @param width
 * @param height
 * @param labelText
 * @param svg
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
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 50) + ")"
    )
    .text(labelText);
}

function interactionGraphTicked(links: d3.Selection<d3.BaseType | SVGLineElement, InteractionLink, SVGGElement, unknown>, nodes: d3.Selection<SVGGElement, ProteinNode, SVGGElement, unknown>): void {
  // update node and link positions

  // type assertions needed because x,y info added after initialization
  // https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L24
  links
    .attr(
      "x1",
      (linkSimulationDatum) =>
        (linkSimulationDatum.source as SimulationNodeDatum).x
    )
    .attr(
      "y1",
      (linkSimulationDatum) =>
        (linkSimulationDatum.source as SimulationNodeDatum).y
    )
    .attr(
      "x2",
      (linkSimulationDatum) =>
        (linkSimulationDatum.target as SimulationNodeDatum).x
    )
    .attr(
      "y2",
      (linkSimulationDatum) =>
        (linkSimulationDatum.target as SimulationNodeDatum).y
    );

  // same here
  // https://github.com/tomwanzek/d3-v4-definitelytyped/blob/06ceb1a93584083475ecb4fc8b3144f34bac6d76/src/d3-force/index.d.ts#L13
  nodes.attr(
    "transform",
    (nodeSimulationDatum) =>
      `translate(${(nodeSimulationDatum as SimulationNodeDatum).x}, ${
        (nodeSimulationDatum as SimulationNodeDatum).y
      })`
  );
}

function dragNode(
  simulation: Simulation<ProteinNode, InteractionLink>
): DragBehavior<Element, SimulationNodeDatum, SimulationNodeDatum> {
  // return handler for dragging a node in an interaction graph
  // Reference for alphaTarget: https://stamen.com/forcing-functions-inside-d3-v4-forces-and-layout-transitions-f3e89ee02d12/

  function dragstarted(nodeDatum: ProteinNode): void {
    if (!d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    } // start up simulation
    nodeDatum.fx = nodeDatum.x;
    nodeDatum.fy = nodeDatum.y;
  }

  function dragged(nodeDatum: ProteinNode): void {
    nodeDatum.fx = d3.event.x;
    nodeDatum.fy = d3.event.y;
  }

  function dragended(nodeDatum: ProteinNode): void {
    if (!d3.event.active) {
      simulation.alphaTarget(0);
    } // cool down simulation
    nodeDatum.fx = null;
    nodeDatum.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

/**
 * Adds the y label to a graph based on user's input of width and height for label position, labelText for what the label reads, and svg for selecting the chart where the label is added
 * @param width
 * @param height
 * @param labelText
 * @param svg
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

/**
 * Draws the bar chart for protein-tissue association
 * @param id
 * @param data
 * @returns
 */
export function drawTissueScoreChart(id: string, data: ProteinStrData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  let reformattedData = [] as ProteinNumData[];
  //reformats the data by converting the expression value to number from string type
  reformattedData = data.map((item) => {
    return {
      name: item.name,
      value: TISSUE_VAL_TO_SCORE[item.value],
    };
  });

  //groups the tissues of a similar origin and sorts them in ascending order
  reformattedData.sort((x, y) => {
    const a = TISSUE_COLOR_DICT[x.name];
    const b = TISSUE_COLOR_DICT[y.name];
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    if (a === b) {
      if (x.value < y.value) {
        return -1;
      } else {
        return 1;
      }
    }
  });

  // specifying graph specific dimensions
  const height = GRAPH_HEIGHT_S - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_XL - MARGIN.left - MARGIN.right;

  const svg = d3
    .select("#tissue-score-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

  //Adds required text to the tooltip, namely the tissue name and its corresponding expression score
  const mouseover = function (d) {
    const tissueName = d.name;
    const tissueValue = TISSUE_SCORE_TO_LABEL[d.value];
    TOOL_TIP.html(
      "Name: " + tissueName + "<br>" + "Expression: " + tissueValue
    ).style("opacity", 1);
  };

  // plots x-axis for the graph - tissue names
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(reformattedData.map((d) => d.name))
    .padding(0.15);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  addXLabel(width, height, "Tissue Name", svg);
  // plots y-axis for the graph - tissue names
  const y = d3.scaleLinear().domain([0, 3]).range([height, 0]);
  svg.append("g").call(
    d3
      .axisLeft(y)
      .ticks(4)
      .tickFormat((d) => TISSUE_SCORE_TO_LABEL[String(d)])
  );
  // Adds the y-axis text label
  addYLabel(height, "Expression Score", svg);
  // plotting the bars
  svg
    .selectAll("tissue-score-bar")
    .data(reformattedData)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => height - y(d.value))
    .attr("width", x.bandwidth())
    .style("fill", (d) => TISSUE_COLOR_DICT[d.name])
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 220))
    .on("mouseout", () => mouseout());
}

/**
 * Draws the bar chart for protein-protein interaction
 * @param id
 * @param data
 * @returns
 */
export function drawProteinInteractionChart(
  id: string,
  data: InteractingProteinType[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // retrieves the parent protein name
  // TODO: create a helper function for reformatting
  const parentProtein = data[0].parent;
  //Formats the protein name by removing the parent protein name
  function formatProteinName(d: string) {
    d = d.replace(parentProtein, "");
    d = d.replace(/_+$/, "");
    d = d.replace(/^[_]+/, "");
    // strips the specie name
    d = d.split("_")[0];
    // if self-interacting protein, display parent protein name
    if (d === "") {
      d = parentProtein;
    }
    return d;
  }
  let reformattedData = [] as ProteinNumData[];

  //Reformats the data by renaming the interacting proteins
  reformattedData = data.map((item) => {
    return {
      name: formatProteinName(item.name),
      value: item.value,
    };
  });
  const seen = new Set();
  //Removes duplicates from the data

  reformattedData = reformattedData.filter((entry) => {
    const duplicate = seen.has(entry.name);
    seen.add(entry.name);
    return !duplicate;
  });
  const height = GRAPH_HEIGHT_M - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_M - MARGIN.left - MARGIN.right;
  //Sorts the data in descending order
  reformattedData.sort((a, b) => {
    return b.value - a.value;
  });
  //Slices the array to display the first 10 protein interactions only

  if (reformattedData.length >= NUM_DATA_POINTS) {
    reformattedData = reformattedData.slice(0, NUM_DATA_POINTS);
  }
  const arrName = reformattedData.map((x) => {
    return x.name;
  });

  const svg = d3
    .select("#protein-confidence-score-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  //Adds required text to the tooltip, namely the interacting protein name and its corresponding interaction confidence score
  const mouseover = function (d) {
    const proteinName = d.name;
    const confidenceScore = d.value;
    TOOL_TIP.html(
      "Protein Name: " +
        proteinName +
        "<br>" +
        "Confidence Score: " +
        confidenceScore
    ).style("opacity", 1);
  };
  const bars = svg.append("g");
  // plots x-axis for the graph - protein names
  const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(NUM_TICKS))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  addXLabel(width, height, "Confidence Score (IntactMiScore)", svg);
  // plots y-axis for the graph - protein-protein interaction score
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatProteinName)).raise();
  // Adds the y-axis text label
  addYLabel(height, "Interacting protein name", svg);
  // plotting the bars
  bars
    .selectAll("rect")
    .data(reformattedData)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", BAR_COLOR)
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 560))
    .on("mouseout", () => mouseout());
}

export function drawProteinInteractionGraph(
  elementID: string,
  data: InteractingProteinType[]
): void {
  /*
  References:
    1) Force-directed layout Observable: https://observablehq.com/@d3/force-directed-graph
    2) Andrew Chen's force-directed layout with text labels tutorial: https://www.youtube.com/watch?v=1vHjMxe-4kI
  */

  const {nodeData, linkData} = getProteinInteractionGraphData(data);
  
  const height = 400 - MARGIN.top - MARGIN.bottom;
  const width = 700 - MARGIN.left - MARGIN.right;

  const svg = d3
    .select(`#${elementID}`)
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)
    .append("g")
    .attr("transform", `translate(${MARGIN.left - 150}, ${MARGIN.top - 25})`)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic");

  const nodeIDs = nodeData.map((node) => node.id);
  const nodeDepths = nodeData.map((node) => node.depth);
  const nodeColors = d3.scaleOrdinal(nodeDepths, NODE_STYLE.circles.fillColors);
  console.log('colors', nodeColors)
  console.log('linkcolor', LINK_STYLE.stroke.color, d3.rgb(LINK_STYLE.stroke.color).toString())

  // force display layout
  const forceNode = d3.forceManyBody();
  const forceLink = d3
    .forceLink(linkData)
    .id(({ index }) => `${nodeIDs[index]}`);
  forceLink.distance(LINK_STYLE.length);

  const simulation = d3
    .forceSimulation(nodeData)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .on("tick", () => interactionGraphTicked(links, nodes));

  const links = svg // links first so nodes appear over links
    .append("g")
    .attr("stroke", LINK_STYLE.stroke.color)
    .attr("stroke-opacity", LINK_STYLE.stroke.opacity)
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr(
      "stroke-width",
      (link) => LINK_STYLE.stroke.scoreWidthMultiplier * link.score
    )
    .attr("stroke-linecap", LINK_STYLE.stroke.linecap)
    .on("mouseover", brighten)
    .on("mouseleave", unbrighten);

  const nodes = svg // container for circles and labels
    .append("g")
    .selectAll("g")
    .data(nodeData)
    .enter()
    .append("g")
    .call(dragNode(simulation))
    .on("mouseover", brighten)
    .on("mouseleave", unbrighten);

  const nodeCircles = nodes
    .append("circle")
    .attr("stroke", NODE_STYLE.circles.stroke.color)
    .attr("stroke-opacity", NODE_STYLE.circles.stroke.opacity)
    .attr("stroke-width", NODE_STYLE.circles.stroke.width)
    .attr("r", NODE_STYLE.circles.radius)
    .attr("fill", (node) => nodeColors(node.depth));

  const nodeLabels = nodes
    .append("text")
    .attr("fill", NODE_STYLE.labels.font.color)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style(
      "font",
      `${NODE_STYLE.labels.font.size} ${NODE_STYLE.labels.font.name}`
    )
    .text(({ name }) => `${name}`);

}

/**
 * Draws the bar chart for disease-gene association
 * @param id
 * @param data
 * @returns
 */
export function drawDiseaseGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // chart specific margin to display full disease names
  const height = GRAPH_HEIGHT_M - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  // Removes unnecessary quotes from disease names
  function formatDiseaseName(d: string) {
    d = d.replace(/['"]+/g, "");
    return d;
  }
  //Slices the array to display the first 10 disease-gene associations only
  const slicedArray = data.slice(0, NUM_DATA_POINTS);
  slicedArray.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = slicedArray.map((x) => {
    return x.name;
  });
  const svg = d3
    .select("#disease-gene-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  // Adds required text to the tooltip, namely the disease name and its corresponding association score
  const mouseover = function (d) {
    const diseaseName = formatDiseaseName(d.name);
    const assocScore = d.value;
    TOOL_TIP.html(
      "Disease Name: " +
        diseaseName +
        "<br>" +
        "Association Score: " +
        assocScore
    ).style("opacity", 1);
  };

  const bars = svg.append("g");
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(slicedArray, (d) => d.value)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(NUM_TICKS));
  // Adds the x-axis text label
  addXLabel(width, height, "Association Score", svg);
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg
    .append("g")
    .call(d3.axisLeft(y).tickFormat(formatDiseaseName))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-25)")
    .style("text-anchor", "end");
  // Adds the y-axis text label
  addYLabel(height, "Disease Name", svg);
  // plots the bars
  bars
    .selectAll("rect")
    .data(slicedArray)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", BAR_COLOR)
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 1100))
    .on("mouseout", () => mouseout());
}

/**
 * Draws the error plot for variant-gene association
 * @param id
 * @param data
 * @returns
 */
export function drawVarGeneAssocChart(
  id: string,
  data: ProteinVarType[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  let reformattedData = [] as VarGeneDataPoint[];
  //reformats the input data into required format for error bars
  reformattedData = data.map((item) => {
    const confInterval = item.interval.split(/[\s,]+/);
    const objLower = confInterval[0].substring(1);
    const objUpper = confInterval[1].substring(0);
    return {
      id: item.id.substring(4),
      name: item.name,
      value: parseFloat(item.value),
      lower: parseFloat(objLower),
      upper: parseFloat(objUpper),
    };
  });
  const height = GRAPH_HEIGHT_M - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_L - MARGIN.left - MARGIN.right;

  //reformats the data by grouping the error points with similar tissue origin

  reformattedData.sort(function (x, y) {
    const a = ERROR_BAR_VAR_COLOR[x.name];
    const b = ERROR_BAR_VAR_COLOR[y.name];
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    if (a === b) {
      if (x.value < y.value) {
        return -1;
      } else {
        return 1;
      }
    }
  });

  const svg = d3
    .select("#variant-gene-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  reformattedData = reformattedData.slice(0, NUM_DATA_POINTS);
  //Adds required text to the tooltip, namely the variant name and its corresponding log 2 fold change score
  const mouseover = function (d) {
    const variantName = d.id;
    const logScore = d.value;
    TOOL_TIP.html(
      "Variant ID: " + variantName + "<br>" + "Log2 Fold Change: " + logScore
    ).style("opacity", 1);
  };

  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([
      d3.min(reformattedData, (d) => d.lower) - X_AXIS_LIMIT,
      d3.max(reformattedData, (d) => d.upper) + X_AXIS_LIMIT,
    ])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  // Adds the x-axis text label
  addXLabel(width, height, "Log 2 Allelic Fold Change", svg);
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(reformattedData.map((d) => d.id))
    .padding(1);
  svg.append("g").call(d3.axisLeft(y));
  // Adds the y-axis text label
  addYLabel(height, "Variant ID", svg);
  // adds the dots and error bars
  svg
    .selectAll("error-bar-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", (d) => x(d.upper))
    .attr("x2", (d) => x(d.lower))
    .attr("y1", (d) => y(d.id))
    .attr("y2", (d) => y(d.id))
    .attr("stroke", "black")
    .attr("stroke-width", "1px");
  svg
    .selectAll("error-bar-circle")
    .data(reformattedData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.value))
    .attr("cy", (d) => y(d.id))
    .attr("r", "6")
    .style("fill", (d) => ERROR_BAR_VAR_COLOR[d.name])
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 1620))
    .on("mouseout", () => mouseout());
  svg
    .selectAll("error-bar-left-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", (d) => {
      return x(d.lower);
    })
    .attr("x2", (d) => {
      return x(d.lower);
    })
    .attr("y1", (d) => {
      return y(d.id) - ERROR_SIDE_BAR_LENGTH;
    })
    .attr("y2", (d) => {
      return y(d.id) + ERROR_SIDE_BAR_LENGTH;
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");
  svg
    .selectAll("error-bar-right-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", (d) => {
      return x(d.upper);
    })
    .attr("x2", (d) => {
      return x(d.upper);
    })
    .attr("y1", (d) => {
      return y(d.id) - ERROR_SIDE_BAR_LENGTH;
    })
    .attr("y2", (d) => {
      return y(d.id) + ERROR_SIDE_BAR_LENGTH;
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");

  // adds circles for each of the mean error values
  svg
    .append("circle")
    .attr("cx", ERROR_POINT_POSITION_X1)
    .attr("cy", ERROR_POINT_POSITION_Y1)
    .attr("r", 6)
    .style("fill", "peachpuff");
  svg
    .append("circle")
    .attr("cx", ERROR_POINT_POSITION_X1)
    .attr("cy", ERROR_POINT_POSITION_Y2)
    .attr("r", 6)
    .style("fill", "lightcoral");
  svg
    .append("circle")
    .attr("cx", ERROR_POINT_POSITION_X1)
    .attr("cy", ERROR_POINT_POSITION_Y3)
    .attr("r", 6)
    .style("fill", "firebrick");
  // adds legend with all three tissues displayed and their respective colors
  svg
    .append("text")
    .attr("x", ERROR_POINT_POSITION_X2)
    .attr("y", ERROR_POINT_POSITION_Y1)
    .text("Pancreas")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
  svg
    .append("text")
    .attr("x", ERROR_POINT_POSITION_X2)
    .attr("y", ERROR_POINT_POSITION_Y2)
    .text("Thyroid")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
  svg
    .append("text")
    .attr("x", ERROR_POINT_POSITION_X2)
    .attr("y", ERROR_POINT_POSITION_Y3)
    .text("Whole Blood")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
}
/**
 * Draws a barchart with variant functional category and its corresponding counts
 * @param id
 * @param data
 * @returns
 */
export function drawVarTypeAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  //Formats the variant functional category name

  function formatVariant(d: string) {
    // remove the word "GeneticVariantFunctionalCategory" from say "GeneticVariantFunctionalCategorySplice5"
    // if condition for - GeneticVariantFunctionalCDSIndel, its a bug that is being fixed on the backend
    if (d == "GeneticVariantFunctionalCDSIndel") {
      d = d.substring(24);
    } else {
      d = d.substring(32);
    }
    return d;
  }
  const height = GRAPH_HEIGHT_L - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  //Sorts the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });
  //Adds required text to the tooltip, namely the variant functional category name and its count
  const mouseover = function (d) {
    const varCategory = d.name;
    const varCount = d.value;
    TOOL_TIP.html(
      "Variant Functional Category: " +
        formatVariant(varCategory) +
        "<br>" +
        "Count: " +
        varCount
    ).style("opacity", 1);
  };
  const svg = d3
    .select("#variant-type-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  const bars = svg.append("g");
  //plots the axes
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(NUM_TICKS))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  addXLabel(width, height, "Count", svg);
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));
  // Adds the y-axis text label
  addYLabel(height, "Variant Function Category", svg);
  // plots the bars
  bars
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", BAR_COLOR)
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 2150))
    .on("mouseout", () => mouseout());
}
/**
 * Draws a barchart with variant clinical significance and its corresponding counts
 * @param id
 * @param data
 * @returns
 */
export function drawVarSigAssocChart(id: string, data: ProteinNumData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }

  //Formats the variant clinical significance name
  function formatVariant(d: string) {
    // removes the word "ClinSig" from say "ClinSigUncertain"
    d = d.substring(7);
    return d;
  }
  // chart specific margin dimensions
  const height = GRAPH_HEIGHT_L - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  // sorting the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });
  //Adds required text to the tooltip, namely the variant clinical significance and its count
  const mouseover = function (d) {
    const clinicalCategory = d.name;
    const varCount = d.value;
    TOOL_TIP.html(
      "Variant Clinical Significance: " +
        formatVariant(clinicalCategory) +
        "<br>" +
        "Count: " +
        varCount
    ).style("opacity", 1);
  };

  const svg = d3
    .select("#variant-significance-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  const bars = svg.append("g");
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(NUM_TICKS))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  addXLabel(width, height, "Count", svg);
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));
  // Adds the y-axis text label
  addYLabel(height, "Variant Clinical Significance", svg);
  // plots the bars
  bars
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", BAR_COLOR)
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 2760))
    .on("mouseout", () => mouseout());
}
/**
 * Draws a barchart with chemical gene associations and its corresponding counts
 * @param id
 * @param data
 * @returns
 */
export function drawChemGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  //Formats the chemical-gene association name
  function formatChemName(d: string) {
    // removes the word "RelationshipAssociationType" from say "RelationshipAssociationTypeAssociated"
    d = d.substring(27);
    return d;
  }
  const height = GRAPH_HEIGHT_S - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  const arrName = data.map((x) => {
    return x.name;
  });
  const svg = d3
    .select("#chemical-gene-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  //Adds required text to the tooltip, namely the chemical-gene association category and its count
  const mouseover = function (d) {
    const assocName = formatChemName(d.name);
    const count = d.value;
    TOOL_TIP.html(
      "Association Type: " + assocName + "<br>" + "Count: " + count
    ).style("opacity", 1);
  };

  const bars = svg.append("g");
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(NUM_TICKS))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  addXLabel(width, height, "Count", svg);
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatChemName));
  // Adds the y-axis text label
  addYLabel(height, "Drug-Gene Relationship", svg);
  // plots the bars
  bars
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", BAR_COLOR)
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 3380))
    .on("mouseout", () => mouseout());
}
