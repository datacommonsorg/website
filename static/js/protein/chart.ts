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
import _ from "lodash";

import { InteractingProteinType } from "./page";
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
const PROTEIN_REDIRECT = "/bio/protein/";
const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// bar width for tissue
const TISSUE_BAR_WIDTH = 12;
// bar width for the rest of the graphs
const BAR_WIDTH = 35;
// bar chart color for most of the charts
const BAR_COLOR = "maroon";
// tooltip constant for all charts
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
  AdiposeTissue: "Sienna",
  AdrenalGland: "sandybrown",
  Appendix: "maroon",
  BoneMarrow: "khaki",
  Breast: "mistyrose",
  Bronchus: "tomato",
  Cartilage: "linen",
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
  Esophagus: "maroon",
  Eye: "coral",
  FallopianTube: "mistyrose",
  Gallbladder: "darksalmon",
  Hair: "peachpuff",
  HeartMuscle: "brown",
  Hippocampus: "lightcoral",
  Hypothalamus: "lightcoral",
  Kidney: "sandybrown",
  LactatingBreast: "mistyrose",
  Liver: "darksalmon",
  Lung: "tomato",
  LymphNode: "khaki",
  Nasopharynx: "tomato",
  OralMucosa: "peachpuff",
  Ovary: "mistyrose",
  Pancreas: "orangered",
  ParathyroidGland: "bisque",
  PituitaryGland: "sienna",
  Placenta: "mistyrose",
  Prostate: "mistyrose",
  Rectum: "maroon",
  Retina: "coral",
  SalivaryGland: "maroon",
  SeminalVesicle: "mistyrose",
  SkeletalMuscle: "linen",
  Skin: "peachpuff",
  Skin1: "peachpuff",
  Skin2: "peachpuff",
  SmallIntestine: "maroon",
  SmoothMuscle: "linen",
  SoftTissue1: "burlywood",
  SoftTissue2: "burlywood",
  SoleOfFoot: "peachpuff",
  Spleen: "khaki",
  Stomach1: "maroon",
  Stomach2: "maroon",
  SubstantiaNiagra: "lightcoral",
  Testis: "mistyrose",
  Thymus: "khaki",
  ThyroidGland: "bisque",
  Tonsil: "khaki",
  UrinaryBladder: "sandybrown",
  Vagina: "mistyrose",
};
// color dictionary for tissue legend
const TISSUE_LEGEND_DICT = {
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
// tool tip left position
const TOOL_TIP_LEFT_POSITION = 230;
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
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 40) + ")"
    )
    .text(labelText);
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

export function drawTissueLegend(id: string, data: ProteinStrData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  const svg = d3
    .select("#tissue-score-legend")
    .append("svg")
    .attr("width", GRAPH_WIDTH_XL)
    .attr("height", GRAPH_HEIGHT_XS);
  const data0 = d3.keys(TISSUE_LEGEND_DICT);
  // slicing the dictionary in half to display the legend in two rows
  const data1 = data0.slice(0, 8);
  const data2 = data0.slice(8, 15);
  // creating circles for the first row in legend
  svg
    .selectAll("mydots1")
    .data(data1)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => {
      return NUM_DATA_POINTS + i * GRAPH_HEIGHT_XS;
    })
    .attr("cy", 50)
    .attr("r", 7)
    .style("fill", (d) => {
      return TISSUE_LEGEND_DICT[d];
    });
  svg
    .selectAll("legend-text1")
    .data(data1)
    .enter()
    .append("text")
    .attr("x", (d, i) => {
      return 2 * NUM_DATA_POINTS + i * GRAPH_HEIGHT_XS;
    })
    .attr("y", 55)
    .style("font-size", "10px")
    .text((d) => {
      return d;
    });
  // creating circles for the second row in legend
  svg
    .selectAll("mydots2")
    .data(data2)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => {
      return NUM_DATA_POINTS + i * GRAPH_HEIGHT_XS;
    })
    .attr("cy", 85)
    .attr("r", 7)
    .style("fill", (d) => {
      return TISSUE_LEGEND_DICT[d];
    });
  svg
    .selectAll("legend-text2")
    .data(data2)
    .enter()
    .append("text")
    .attr("x", (d, i) => {
      return 2 * NUM_DATA_POINTS + i * GRAPH_HEIGHT_XS;
    })
    .attr("y", 90)
    .style("font-size", "10px")
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
    // for the case when a blank entry is added for graph formatting
    if (d.length === 1) {
      d = "";
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
  //Finds the length of the object array
  let arrayLength = Object.keys(reformattedData).length;
  //Formats the graph as per number of entries
  if (arrayLength < 10) {
    let count = 0;
    //If array length is less than 5, add additional elements to make total array length = 5
    if (arrayLength < 5) {
      count = 5 - arrayLength;
    }
    //If array length is less than 10, add additional elements to make total array length = 10
    else {
      count = 10 - arrayLength;
    }
    let i = 0;
    while (i < count) {
      reformattedData.push({ name: i.toString(), value: 0, parent: "" });
      i = i + 1;
    }
  }
  // update the array length
  arrayLength = Object.keys(reformattedData).length;
  let height = null;
  if (arrayLength < 10) {
    height = arrayLength * BAR_WIDTH - MARGIN.top;
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
  if (arrayLength < 10) {
    addXLabel(width, height, "Confidence Score (IntactMiScore)", svg);
  } else {
    addXLabel(width, height, "Confidence Score (IntactMiScore)", svg);
  }
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
    //PROTEIN_REDIRECT
    .on("click", function (d) {
      const proteinId = "bio/" + d.name + "_" + d.parent;
      window.location.href = `${PROTEIN_REDIRECT}${proteinId}`;
    })
    .on("mouseover", mouseover)
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 650))
    .on("mouseout", () => mouseout());
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
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 1050))
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
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 1500))
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
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 2000))
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
    .on("mousemove", () => mousemove(TOOL_TIP_LEFT_POSITION, 2600))
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
