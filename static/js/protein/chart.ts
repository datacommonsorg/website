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

import { getProteinInteractionGraphData } from "./data_processing_utils";
import { DiseaseAssociationType, InteractingProteinType } from "./page";
import { ProteinVarType } from "./page";
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

export interface InteractionGraphData {
  nodeData: ProteinNode[];
  linkData: InteractionLink[];
}

// interface for variant gene associations for plotting error bars
export interface VarGeneDataPoint {
  associationID: string;
  id: string;
  name: string;
  value: number;
  lower: number;
  upper: number;
}

type Datum =
  | ProteinNumData
  | ProteinNode
  | InteractionLink
  | DiseaseAssociationType;

const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const PROTEIN_REDIRECT = "/bio/protein/";
export const GRAPH_BROWSER_REDIRECT = "/browser/";
const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// bar width for tissue
const TISSUE_BAR_WIDTH = 12;
// bar width for the rest of the graphs
const BAR_WIDTH = 35;
// bar chart color for most of the charts
const BAR_COLOR = "maroon";

// Brightness settings on mouseover
// horizontal barcharts
const DEFAULT_BRIGHTEN_PERCENTAGE = "112%";
// protein-tissue interaction bars
const PTI_BRIGHTEN_PERCENTAGE = "107%";
// protein-protein interaction graph nodes and links
const PPI_BRIGHTEN_PERCENTAGE = "105%";

// tooltip constant for all charts
const TOOL_TIP = d3.select("#main").append("div").attr("class", "tooltip");
// length of side bar for error plot for variant-gene associations
const ERROR_SIDE_BAR_LENGTH = 5;
// number by which x axis domain is increased/decreased for x scale to fit all error bars well
const X_AXIS_LIMIT = 0.5;
// inner bar padding constant for protein interactions chart with less than 10 data values
const INNER_BAR_PADDING = 0.1;
// constants for positioning the tissue legends
const TISSUE_LEGEND_START_POSITION = 10;
const TISSUE_LEGEND_PADDING = 130;
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

// dictionary mapping tissues to organs
const TISSUE_ORGAN_DICT = {
  AdiposeTissue: "Endocrine",
  AdrenalGland: "Kidney and Urinary Bladder",
  Appendix: "Gastrointestinal tract",
  BoneMarrow: "Lymphoid",
  Breast: "Reproductive",
  Bronchus: "Lung",
  Cartilage: "Connective tissue",
  Caudate: "Brain",
  Cerebellum: "Brain",
  CerebralCortex: "Brain",
  CervixUterine: "Reproductive",
  ChoroidPlexus: "Brain",
  Colon: "Gastrointestinal tract",
  DorsalRaphe: "Brain",
  Duodenum: "Gastrointestinal tract",
  Endometrium1: "Reproductive",
  Endometrium2: "Reproductive",
  Epididymis: "Reproductive",
  Esophagus: "Gastrointestinal tract",
  Eye: "Eye",
  FallopianTube: "Reproductive",
  Gallbladder: "Liver and Gall Bladder",
  Hair: "Skin",
  HeartMuscle: "Heart",
  Hippocampus: "Brain",
  Hypothalamus: "Brain",
  Kidney: "Kidney and Urinary Bladder",
  LactatingBreast: "Reproductive",
  Liver: "Liver and Gall Bladder",
  Lung: "Lung",
  LymphNode: "Lymphoid",
  Nasopharynx: "Lung",
  OralMucosa: "Skin",
  Ovary: "Reproductive",
  Pancreas: "Pancreas",
  ParathyroidGland: "Thyroid",
  PituitaryGland: "Endocrine",
  Placenta: "Reproductive",
  Prostate: "Reproductive",
  Rectum: "Gastrointestinal tract",
  Retina: "Eye",
  SalivaryGland: "Gastrointestinal tract",
  SeminalVesicle: "Reproductive",
  SkeletalMuscle: "Connective tissue",
  Skin: "Skin",
  Skin1: "Skin",
  Skin2: "Skin",
  SmallIntestine: "Gastrointestinal tract",
  SmoothMuscle: "Connective tissue",
  SoftTissue1: "Soft Tissue",
  SoftTissue2: "Soft Tissue",
  SoleOfFoot: "Skin",
  Spleen: "Lymphoid",
  Stomach1: "Gastrointestinal tract",
  Stomach2: "Gastrointestinal tract",
  SubstantiaNiagra: "Brain",
  Testis: "Reproductive",
  Thymus: "Lymphoid",
  ThyroidGland: "Thyroid",
  Tonsil: "Lymphoid",
  UrinaryBladder: "Kidney and Urinary Bladder",
  Vagina: "Reproductive",
};

// color dictionary mapping organs to colors
const ORGAN_COLOR_DICT = {
  Endocrine: "sienna",
  Eye: "coral",
  Reproductive: "mistyrose",
  Lung: "tomato",
  "Connective tissue": "linen",
  Brain: "lightcoral",
  "Gastrointestinal tract": "maroon",
  "Liver and Gall Bladder": "darksalmon",
  Heart: "brown",
  Lymphoid: "khaki",
  Pancreas: "orangered",
  Thyroid: "bisque",
  Skin: "peachpuff",
  "Soft Tissue": "burlywood",
  "Kidney and Urinary Bladder": "sandybrown",
};
// tissue specific colors
const ERROR_BAR_VAR_COLOR = {
  Pancreas: "peachpuff",
  Thyroid: "lightcoral",
  "Whole Blood": "firebrick",
};
// number to select top data points for large data
const NUM_DATA_POINTS = 10;
// number to decide the ticks to be displayed
const NUM_TICKS = 10;
// graph specific dimensions
const GRAPH_HEIGHT_XS = 130;
const GRAPH_HEIGHT_S = 200;
const GRAPH_HEIGHT_M = 400;
const GRAPH_WIDTH_S = 660;
const GRAPH_WIDTH_M = 700;
const GRAPH_WIDTH_L = 760;
const GRAPH_WIDTH_XL = 1050;
// error point position
const ERROR_POINT_POSITION_X1 = 500;
const ERROR_POINT_POSITION_X2 = 550;
const ERROR_POINT_POSITION_Y1 = 10;
const ERROR_POINT_POSITION_Y2 = 30;
const ERROR_POINT_POSITION_Y3 = 50;
// dimension of tissue legend dots
const LEGEND_CIRCLE_RADIUS = 7;

// interaction graph offset
const INTERACTION_GRAPH_X_OFFSET = -150;
const INTERACTION_GRAPH_Y_OFFSET = -25;

// style of node representations in interaction graph viz's
const NODE_FILL_COLORS = [
  "mistyrose",
  "peachpuff",
  "lightCoral",
  "lightsalmon",
];

// style of link representations in interaction graph viz's
const LINK_STYLE = {
  length: 100,
  stroke: {
    scoreWidthMultiplier: 8,
  },
};

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
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 40) + ")"
    )
    .text(labelText);
}

/**
 * Given link and node d3 Selections, update their x,y positions according to their associated data.
 */
function interactionGraphTicked(
  links: d3.Selection<
    d3.BaseType | SVGLineElement,
    InteractionLink,
    SVGGElement,
    unknown
  >,
  nodes: d3.Selection<SVGGElement, ProteinNode, SVGGElement, unknown>
): void {
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

/**
 * Given a d3 Simulation, return handler for dragging a node in an interaction graph.
 */
function dragNode(
  simulation: Simulation<ProteinNode, InteractionLink>
): DragBehavior<Element, SimulationNodeDatum, SimulationNodeDatum> {
  // Reference for alphaTarget: https://stamen.com/forcing-functions-inside-d3-v4-forces-and-layout-transitions-f3e89ee02d12/

  function dragstarted(nodeDatum: ProteinNode): void {
    if (!d3.event.active) {
      // start up simulation
      simulation.alphaTarget(0.3).restart();
    }
    nodeDatum.fx = nodeDatum.x;
    nodeDatum.fy = nodeDatum.y;
  }

  function dragged(nodeDatum: ProteinNode): void {
    nodeDatum.fx = d3.event.x;
    nodeDatum.fy = d3.event.y;
  }

  function dragended(nodeDatum: ProteinNode): void {
    if (!d3.event.active) {
      // cool down simulation
      simulation.alphaTarget(0);
    }
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
 * Draws the legend for the tissue score chart if the data exists.
 * @param id
 * @param data
 * @returns
 */
export function drawTissueLegend(id: string, data: ProteinStrData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  const svg = d3
    .select("#" + id)
    .append("svg")
    .attr("width", GRAPH_WIDTH_XL)
    .attr("height", GRAPH_HEIGHT_XS);
  const organTypes = d3.keys(ORGAN_COLOR_DICT);
  // slicing the dictionary in half to display the legend in two rows
  const dictSliceNumber = (organTypes.length + 1) / 2;
  const dataRowOne = organTypes.slice(0, dictSliceNumber);
  const dataRowTwo = organTypes.slice(dictSliceNumber, organTypes.length);
  // creating circles for the first row in legend
  svg
    .selectAll("legend-dots")
    .data(dataRowOne)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => {
      return TISSUE_LEGEND_START_POSITION + i * TISSUE_LEGEND_PADDING;
    })
    .attr("cy", 50)
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .style("fill", (d) => {
      return ORGAN_COLOR_DICT[d];
    });
  svg
    .selectAll("legend-text")
    .data(dataRowOne)
    .enter()
    .append("text")
    .attr("x", (d, i) => {
      return 2 * TISSUE_LEGEND_START_POSITION + i * TISSUE_LEGEND_PADDING;
    })
    .attr("y", 55)
    .attr("class", "legend-label")
    .text((d) => {
      return d;
    });
  // creating circles for the second row in legend
  svg
    .selectAll("legend-dots")
    .data(dataRowTwo)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => {
      return TISSUE_LEGEND_START_POSITION + i * TISSUE_LEGEND_PADDING;
    })
    .attr("cy", 85)
    .attr("r", LEGEND_CIRCLE_RADIUS)
    .style("fill", (d) => {
      return ORGAN_COLOR_DICT[d];
    });
  svg
    .selectAll("legend-text")
    .data(dataRowTwo)
    .enter()
    .append("text")
    .attr("x", (d, i) => {
      return 2 * TISSUE_LEGEND_START_POSITION + i * TISSUE_LEGEND_PADDING;
    })
    .attr("y", 90)
    .attr("class", "legend-label")
    .text((d) => {
      return d;
    });
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
    const a = TISSUE_ORGAN_DICT[x.name];
    const b = TISSUE_ORGAN_DICT[y.name];
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
  // finding length of the object array
  const arrayLength = Object.keys(reformattedData).length;
  // specifying graph specific dimensions - using number of data points
  const height = GRAPH_HEIGHT_S - MARGIN.top - MARGIN.bottom;
  const width = arrayLength * TISSUE_BAR_WIDTH - MARGIN.left - MARGIN.right;

  const svg = d3
    .select("#tissue-score-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

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

  const barIDFunc = getElementIDFunc(id, "bar");
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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", (d) => ORGAN_COLOR_DICT[TISSUE_ORGAN_DICT[d.name]])
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) => `Name: ${d.name}<br>Expression: ${TISSUE_SCORE_TO_LABEL[d.value]}`,
      PTI_BRIGHTEN_PERCENTAGE
    );
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
  //Extracts protein specie name
  function extractSpecieName(d: string) {
    d = d.replace(parentProtein, "");
    d = d.replace(/_+$/, "");
    d = d.replace(/^[_]+/, "");
    // retrieves the specie name
    d = d.split("_")[1];
    if (d === "") {
      d = parentProtein;
    }
    return d;
  }
  let reformattedData = [] as InteractingProteinType[];

  //Reformats the data by renaming the interacting proteins
  reformattedData = data.map((item) => {
    return {
      name: formatProteinName(item.name),
      value: item.value,
      parent: extractSpecieName(item.name),
    };
  });
  const seen = new Set();
  //Removes duplicates from the data
  reformattedData = reformattedData.filter((entry) => {
    const duplicate = seen.has(entry.name);
    seen.add(entry.name);
    return !duplicate;
  });
  //Formats the graph as per number of entries
  // update the array length
  let height: number;
  const arrayLength = Object.keys(reformattedData).length;
  //Formats the graph as per number of entries
  if (arrayLength < 10) {
    // fix a minimum height
    height = GRAPH_HEIGHT_S;
  } else {
    height = NUM_DATA_POINTS * BAR_WIDTH - MARGIN.top - MARGIN.bottom;
  }
  //Decides the graph height as per the number of entities present in the array
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
  // calculate inner bar padding for number of data points less than 10
  const barPadding =
    INNER_BAR_PADDING * (NUM_DATA_POINTS - reformattedData.length);
  const svg = d3
    .select("#protein-confidence-score-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

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
  let y = null;
  if (arrayLength < NUM_DATA_POINTS) {
    // use inner bar padding
    y = d3
      .scaleBand()
      .domain(arrName)
      .range([0, height])
      .padding(0.1)
      .paddingInner(barPadding);
  } else {
    // no padding required
    y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  }
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatProteinName)).raise();
  // Adds the y-axis text label
  addYLabel(height, "Interacting protein name", svg);

  const barIDFunc = getElementIDFunc(id, "bar");

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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", BAR_COLOR)
    //PROTEIN_REDIRECT
    .on("click", function (d) {
      const proteinId = "bio/" + d.name + "_" + d.parent;
      window.open(PROTEIN_REDIRECT + proteinId);
    })
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) => `Protein Name: ${d.name}<br>Confidence Score: ${d.value}`
    );
}

/**
 * Draws graph visualization of a neighborhood of the protein-protein interaction network centered at the page protein.
 */
export function drawProteinInteractionGraph(
  chartID: string,
  data: InteractingProteinType[]
): void {
  /*
  References:
    1) Force-directed layout Observable: https://observablehq.com/@d3/force-directed-graph
    2) Andrew Chen's force-directed layout with text labels tutorial: https://www.youtube.com/watch?v=1vHjMxe-4kI
  */

  const { nodeData, linkData } = getProteinInteractionGraphData(data);

  const height = GRAPH_HEIGHT_M - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_M - MARGIN.left - MARGIN.right;

  const svg = d3
    .select(`#${chartID}`)
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)
    .append("g")
    .attr(
      "transform",
      `translate(${MARGIN.left + INTERACTION_GRAPH_X_OFFSET}, ${
        MARGIN.top + INTERACTION_GRAPH_Y_OFFSET
      })`
    );

  const nodeIDs = nodeData.map((node) => node.id);
  const nodeDepths = nodeData.map((node) => node.depth);
  const nodeColors = d3.scaleOrdinal(nodeDepths, NODE_FILL_COLORS);

  // force display layout
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(linkData).id(({ index }) => nodeIDs[index]);
  forceLink.distance(LINK_STYLE.length);

  const linkIDFunc = getElementIDFunc(chartID, "link");
  // add links first so nodes appear over links
  const links = svg
    .append("g")
    .selectAll("line")
    .data(linkData)
    .join("line")
    .attr(
      "stroke-width",
      (link) => LINK_STYLE.stroke.scoreWidthMultiplier * link.score
    )
    .attr("class", "interaction-link")
    .attr("id", (d, i) => linkIDFunc(i))
    .call(
      handleMouseEvents,
      linkIDFunc,
      (d) =>
        `Source: ${(d.source as ProteinNode).name}<br>Target: ${
          (d.target as ProteinNode).name
        }<br>Confidence: ${d.score}`,
      PPI_BRIGHTEN_PERCENTAGE
    );

  const simulation = d3
    .forceSimulation(nodeData)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .on("tick", () => interactionGraphTicked(links, nodes));

  const nodeIDFunc = getElementIDFunc(chartID, "node");
  // container for circles and labels
  const nodes = svg
    .append("g")
    .selectAll("g")
    .data(nodeData)
    .enter()
    .append("g")
    .call(dragNode(simulation))
    .call(
      handleMouseEvents,
      nodeIDFunc,
      (d) => `Name: ${d.name}<br>Species: ${d.species}`,
      PPI_BRIGHTEN_PERCENTAGE
    );

  // node circles
  nodes
    .append("circle")
    .attr("class", "protein-node-circle")
    .attr("fill", (node) => nodeColors(node.depth))
    .attr("id", (node, i) => nodeIDFunc(i));

  // node labels
  nodes
    .append("text")
    .text(({ name }) => name)
    .attr("class", "protein-node-label");
}

/**
 * Draws the bar chart for disease-gene association
 * @param id
 * @param data
 * @returns
 */
export function drawDiseaseGeneAssocChart(
  id: string,
  data: DiseaseAssociationType[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  //Finds the length of the object array
  const arrayLength = Object.keys(data).length;
  let height = null;
  //Decides the graph height as per the number of entities present in the array
  if (arrayLength > 10) {
    height = 10 * BAR_WIDTH - MARGIN.top - MARGIN.bottom;
  } else {
    height = arrayLength * BAR_WIDTH - MARGIN.top - MARGIN.bottom;
  }
  // chart specific margin to display full disease names
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

  const barIDFunc = getElementIDFunc(id, "bar");

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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", BAR_COLOR)
    .on("click", function (d) {
      window.open(GRAPH_BROWSER_REDIRECT + d.id);
    })
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) =>
        `Disease Name: ${formatDiseaseName(d.name)}<br>Association Score: ${
          d.value
        }`
    );
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
      associationID: item.associationID,
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

  const circleIDFunc = getElementIDFunc(id, "circle");
  svg
    .selectAll("error-bar-circle")
    .data(reformattedData)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.value))
    .attr("cy", (d) => y(d.id))
    .attr("r", "6")
    .attr("id", (d, i) => circleIDFunc(i))
    .style("fill", (d) => ERROR_BAR_VAR_COLOR[d.name])
    // variant redirect
    .on("click", function (d) {
      window.open(GRAPH_BROWSER_REDIRECT + d.associationID);
    })
    .call(
      handleMouseEvents,
      circleIDFunc,
      (d) => `Variant ID: ${d.id}<br>Log2 Fold Change: ${d.value}`
    );

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
  //Finds the length of the object array
  const arrayLength = Object.keys(data).length;
  const height = arrayLength * (BAR_WIDTH - 2) - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  //Sorts the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });
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

  const barIDFunc = getElementIDFunc(id, "bar");

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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", BAR_COLOR)
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) =>
        `Variant Functional Category: ${formatVariant(d.name)}<br>Count: ${
          d.value
        }`
    );
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
  //Finds the length of the object array
  const arrayLength = Object.keys(data).length;
  const height = arrayLength * (BAR_WIDTH - 2) - MARGIN.top - MARGIN.bottom;
  const width = GRAPH_WIDTH_S - MARGIN.left - MARGIN.right;
  // sorting the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });

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

  const barIDFunc = getElementIDFunc(id, "bar");
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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", BAR_COLOR)
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) =>
        `Variant Clinical Significance: ${formatVariant(d.name)}<br>Count: ${
          d.value
        }`
    );
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
  //Finds the length of the object array
  const arrayLength = Object.keys(data).length;
  const height = arrayLength * BAR_WIDTH - MARGIN.top;
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

  const barIDFunc = getElementIDFunc(id, "bar");
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
    .attr("id", (d, i) => barIDFunc(i))
    .style("fill", BAR_COLOR)
    .call(
      handleMouseEvents,
      barIDFunc,
      (d) => `Association Type: ${formatChemName(d.name)}<br>Count: ${d.value}`
    );
}
