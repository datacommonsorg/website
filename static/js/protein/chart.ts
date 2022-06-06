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

//import styles from './protein.scss';
import { InteractingProteinType } from "./page";
import { ProteinVarType } from "./page";
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const HEIGHT = 224;
const WIDTH = 500;
const MARGIN = { top: 30, right: 30, bottom: 90, left: 160 };
// bar chart color for most of the charts
const BAR_COL = "maroon";
// tooltip style
const TOOL_TIP = d3
  .select("div")
  .append("div")
  .style("opacity", 0)
  .attr("class", "tooltip")
  .attr("width", 10)
  .attr("height", 10)
  .style("background", "rgba(0, 0, 0, 0.8")
  .style("line-height", 1)
  .style("font-weight", "bold")
  .style("padding", "12px")
  .style("border", "solid")
  .style("border-radius", "1px")
  .style("color", "#fff")
  .style("box-sizing", "border-box")
  .style("display", "inline")
  .style("font-size", "8px")
  .style("position", "absolute")
  .style("text-align", "center");
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

/**
 * Draw bar chart for tissue score.
 */
export function drawTissueScoreChart(id: string, data: ProteinStrData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // reformats data to convert tissue score from string to number
  let reformattedData = [] as ProteinNumData[];
  reformattedData = data.map((item) => {
    return {
      name: item.name,
      value: TISSUE_VAL_TO_SCORE[item.value],
    };
  });

  // groups the tissues of a similar origin and sorts them in ascending order

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
  const height = 200 - MARGIN.top - MARGIN.bottom;
  const width = 860 - MARGIN.left - MARGIN.right;

  const svg = d3
    .select("#tissue-score-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");

  const mouseover = function (d) {
    const tissueName = d.name;
    const tissueValue = TISSUE_SCORE_TO_LABEL[d.value];
    TOOL_TIP.html(
      "Name: " + tissueName + "<br>" + "Expression: " + tissueValue
    ).style("opacity", 1);
  };

  const mousemove = function (d) {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 220 + "px"
    );
  };

  const mouseout = function (d) {
    const tissueName = d.name;
    const tissueValue = TISSUE_SCORE_TO_LABEL[d.value];
    TOOL_TIP.html(
      "Name: " + tissueName + "<br>" + "Expression: " + tissueValue
    ).style("opacity", 0);
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
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 50) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Tissue Name");

  // y-axis for the graph - tissue score
  const y = d3.scaleLinear().domain([0, 3]).range([height, 0]);
  svg.append("g").call(
    d3
      .axisLeft(y)
      .ticks(4)
      .tickFormat((d) => TISSUE_SCORE_TO_LABEL[String(d)])
  );
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Expression Score");
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
    .style("fill", function (d) {
      return TISSUE_COLOR_DICT[d.name];
    })
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}

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
  // formats the protein name by removing the parent protein name
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
  // reformats the data by removing the parent protein name and renaming the interacting proteins
  let reformattedData = [] as ProteinNumData[];
  reformattedData = data.map((item) => {
    return {
      name: formatProteinName(item.name),
      value: item.value,
    };
  });
  // removes duplicates from the data
  const seen = new Set();
  reformattedData = reformattedData.filter((entry) => {
    const duplicate = seen.has(entry.name);
    seen.add(entry.name);
    return !duplicate;
  });
  const height = 400 - MARGIN.top - MARGIN.bottom;
  const width = 700 - MARGIN.left - MARGIN.right;
  // sorts the data in descending order
  reformattedData.sort((a, b) => {
    return b.value - a.value;
  });
  // slice the array to display the first 10 interactions only
  if (reformattedData.length >= 10) {
    reformattedData = reformattedData.slice(0, 10);
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

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 550 + "px"
    );
  };
  const mouseout = function (d) {
    const proteinName = d.name;
    const confidenceScore = d.value;
    TOOL_TIP.html(
      "Protein Name: " +
        proteinName +
        "<br>" +
        "Confidence Score: " +
        confidenceScore
    ).style("opacity", 0);
  };
  const bars = svg.append("g");
  // plots x-axis for the graph - protein names
  const x = d3.scaleLinear().domain([0, 1]).range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Confidence Score (IntactMiScore)");
  // plots y-axis for the graph - protein-protein interaction score
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatProteinName)).raise();
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Interacting protein name");

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
    .style("fill", BAR_COL)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}

export function drawDiseaseGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // chart specific margin to display full disease names
  //const margin = { top: 70, right: 50, bottom: 40, left: 150 };
  const height = 400 - MARGIN.top - MARGIN.bottom;
  const width = 660 - MARGIN.left - MARGIN.right;
  // removes unnecessary quotes from disease names
  function formatDiseaseName(d: string) {
    d = d.replace(/['"]+/g, "");
    return d;
  }
  // slices the array to show top 10 disease-gene associations
  const slicedArray = data.slice(0, 10);
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

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 1050 + "px"
    );
  };
  const mouseout = function (d) {
    const diseaseName = formatDiseaseName(d.name);
    const assocScore = d.value;
    TOOL_TIP.html(
      "Disease Name: " +
        diseaseName +
        "<br>" +
        "Association Score: " +
        assocScore
    ).style("opacity", 0);
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
    .call(d3.axisBottom(x).ticks(10));
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Association Score");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg
    .append("g")
    .call(d3.axisLeft(y).tickFormat(formatDiseaseName))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-25)")
    .style("text-anchor", "end");
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Disease Name");
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
    .style("fill", BAR_COL)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}

export function drawVarGeneAssocChart(
  id: string,
  data: ProteinVarType[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  let reformattedData = [] as VarGeneDataPoint[];
  // reformats the input data into required format for error bars
  reformattedData = data.map((item) => {
    const confInterval = item.interval.split(/[\s,]+/);
    const objLower = confInterval[0].substring(1);
    const objUpper = confInterval[1].substring(1);
    return {
      id: item.id.substring(4),
      name: item.name,
      value: parseFloat(item.value),
      lower: parseFloat(objLower),
      upper: parseFloat(objUpper),
    };
  });
  const height = 400 - MARGIN.top - MARGIN.bottom;
  const width = 760 - MARGIN.left - MARGIN.right;
  // tissue specific colors
  const var_color = {
    Pancreas: "peachpuff",
    Thyroid: "lightcoral",
    "Whole Blood": "firebrick",
  };

  reformattedData.sort(function (x, y) {
    const a = var_color[x.name];
    const b = var_color[y.name];
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
  reformattedData = reformattedData.slice(0, 10);
  const mouseover = function (d) {
    const variantName = d.id;
    const logScore = d.value;
    TOOL_TIP.html(
      "Variant ID: " + variantName + "<br>" + "Log2 Fold Change: " + logScore
    ).style("opacity", 1);
  };

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 1550 + "px"
    );
  };
  const mouseout = function (d) {
    const variantName = d.id;
    const logScore = d.value;
    TOOL_TIP.html(
      "Variant ID: " + variantName + "<br>" + "Log2 Fold Change: " + logScore
    ).style("opacity", 0);
  };
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([
      d3.min(reformattedData, (d) => d.lower) - 0.5,
      d3.max(reformattedData, (d) => d.upper) + 0.5,
    ])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Log 2 Allelic Fold Change");
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(reformattedData.map((d) => d.id))
    .padding(1);
  svg.append("g").call(d3.axisLeft(y));
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Variant ID");
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
    .style("fill", (d) => var_color[d.name])
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
  svg
    .selectAll("error-bar-left-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", function (d) {
      return x(d.lower);
    })
    .attr("x2", function (d) {
      return x(d.lower);
    })
    .attr("y1", function (d) {
      return y(d.id) - 5;
    })
    .attr("y2", function (d) {
      return y(d.id) + 5;
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");
  svg
    .selectAll("error-bar-right-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", function (d) {
      return x(d.upper);
    })
    .attr("x2", function (d) {
      return x(d.upper);
    })
    .attr("y1", function (d) {
      return y(d.id) - 5;
    })
    .attr("y2", function (d) {
      return y(d.id) + 5;
    })
    .attr("stroke", "black")
    .attr("stroke-width", "1px");

  // adds circles for each of the mean error values
  svg
    .append("circle")
    .attr("cx", 450)
    .attr("cy", 10)
    .attr("r", 6)
    .style("fill", "peachpuff");
  svg
    .append("circle")
    .attr("cx", 450)
    .attr("cy", 30)
    .attr("r", 6)
    .style("fill", "lightcoral");
  svg
    .append("circle")
    .attr("cx", 450)
    .attr("cy", 50)
    .attr("r", 6)
    .style("fill", "firebrick");
  // adds legend with all three tissues displayed and their respective colors
  svg
    .append("text")
    .attr("x", 470)
    .attr("y", 10)
    .text("Pancreas")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
  svg
    .append("text")
    .attr("x", 470)
    .attr("y", 30)
    .text("Thyroid")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
  svg
    .append("text")
    .attr("x", 470)
    .attr("y", 50)
    .text("Whole Blood")
    .style("font-size", "15px")
    .attr("alignment-baseline", "middle");
}

export function drawVarTypeAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // formats variant name
  function formatVariant(d: string) {
    // remove the word "GeneticVariantFunctionalCategory" from say "GeneticVariantFunctionalCategorySplice5"
    // if condition for - GeneticVariantFunctionalCDSIndel, maybe a bug that needs to be fixed on the backend
    if (d == "GeneticVariantFunctionalCDSIndel") {
      d = d.substring(24);
    } else {
      d = d.substring(32);
    }
    return d;
  }
  const height = 500 - MARGIN.top - MARGIN.bottom;
  const width = 660 - MARGIN.left - MARGIN.right;
  // sorting the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });
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

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 2050 + "px"
    );
  };
  const mouseout = function (d) {
    const varCategory = d.name;
    const varCount = d.value;
    TOOL_TIP.html(
      "Variant Functional Category: " +
        formatVariant(varCategory) +
        "<br>" +
        "Count: " +
        varCount
    ).style("opacity", 0);
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
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Count");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Variant Functional Category");
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
    .style("fill", BAR_COL)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}

export function drawVarSigAssocChart(id: string, data: ProteinNumData[]): void {
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  // formats the variant name
  function formatVariant(d: string) {
    // removes the word "ClinSig" from say "ClinSigUncertain"
    d = d.substring(7);
    return d;
  }
  // chart specific margin dimensions
  const height = 500 - MARGIN.top - MARGIN.bottom;
  const width = 660 - MARGIN.left - MARGIN.right;
  // sorting the data in descreasing order
  data.sort((a, b) => {
    return b.value - a.value;
  });
  const arrName = data.map((x) => {
    return x.name;
  });
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

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 2650 + "px"
    );
  };
  const mouseout = function (d) {
    const clinicalCategory = d.name;
    const varCount = d.value;
    TOOL_TIP.html(
      "Variant Clinical Significance: " +
        formatVariant(clinicalCategory) +
        "<br>" +
        "Count: " +
        varCount
    ).style("opacity", 0);
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
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Count");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Variant Clinical Significance");
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
    .style("fill", BAR_COL)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}

export function drawChemGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  console.log("check1");
  // checks if the data is empty or not
  if (_.isEmpty(data)) {
    return;
  }
  console.log("check2");
  // formats chemical-gene associations
  function formatChemName(d: string) {
    // removes the word "RelationshipAssociationType" from say "RelationshipAssociationTypeAssociated"
    d = d.substring(27);
    return d;
  }
  const height = 200 - MARGIN.top - MARGIN.bottom;
  const width = 660 - MARGIN.left - MARGIN.right;
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
  const mouseover = function (d) {
    const assocName = formatChemName(d.name);
    const count = d.value;
    TOOL_TIP.html(
      "Association Type: " + assocName + "<br>" + "Count: " + count
    ).style("opacity", 1);
  };

  const mousemove = function () {
    TOOL_TIP.style("left", d3.mouse(this)[0] + 380 + "px").style(
      "top",
      d3.mouse(this)[1] + 3250 + "px"
    );
  };
  const mouseout = function (d) {
    const assocName = formatChemName(d.name);
    const count = d.value;
    TOOL_TIP.html(
      "Association Type: " + assocName + "<br>" + "Count: " + count
    ).style("opacity", 0);
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
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // Adds the x-axis text label
  svg
    .append("text")
    .attr(
      "transform",
      "translate(" + width / 2 + " ," + (height + MARGIN.top + 10) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Count");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatChemName));
  // Adds the y-axis text label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - MARGIN.left)
    .attr("x", 0 - height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Drug-Gene Relationship");
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
    .style("fill", BAR_COL)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);
}
