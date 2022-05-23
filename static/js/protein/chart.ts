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

import { InteractingProteinType } from "./data_processing_utils";
import { ProteinVarType } from "./data_processing_utils";
const SVGNS = "http://www.w3.org/2000/svg";
const XLINKNS = "http://www.w3.org/1999/xlink";
const HEIGHT = 224;
const WIDTH = 500;
const MARGIN = { top: 30, right: 30, bottom: 70, left: 90 };
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
  Duodenum: "firebrick",
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
  // reformats data to convert tissue score from string to number
  let reformattedData = {} as ProteinNumData[];
  reformattedData = data.map((item) => {
    return {
      name: item.name,
      value: TISSUE_VAL_TO_SCORE[item.value],
    };
  });

  // converts the tissue score value to string label
  function formatTick(d) {
    return TISSUE_SCORE_TO_LABEL[d];
  }
  // dictionary mapping tissues to specific colors

  // groups the tissues of a similar origin and sorts them in ascending order
  reformattedData.sort(function (x, y) {
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
  // plots x-axis for the graph - tissue names
  const x = d3
    .scaleBand()
    .range([0, width])
    .domain(
      reformattedData.map(function (d) {
        return d.name;
      })
    )
    .padding(0.15);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // y-axis for the graph - tissue score
  const y = d3.scaleLinear().domain([0, 3]).range([height, 0]);
  svg.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(formatTick));
  // plotting the bars
  svg
    .selectAll("tissue-score-bar")
    .data(reformattedData)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.value))
    .attr("height", function (d) {
      return height - y(d.value);
    })
    .attr("width", x.bandwidth())
    .style("fill", function (d) {
      return TISSUE_COLOR_DICT[d.name];
    })
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("opacity", 0.5);
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("opacity", 1);
    });
}

export function drawProteinInteractionChart(
  id: string,
  data: InteractingProteinType[]
): void {
  // retrieves the parent protein name
  // TODO: create a helper function for reformatting
  const parentProtein = data[1].parent;
  // formats the protein name by removing the parent protein name
  function formatProteinName(d: string) {
    d = d.replace(parentProtein, "");
    d = d.replace(/_+$/, "");
    d = d.replace(/^[_]+/, "");
    // if self-interacting protein, display parent protein name
    if (d === "") {
      d = parentProtein;
    }
    return d;
  }
  // reformats the data by removing the parent protein name and renaming the interacting proteins
  let reformattedData = {} as ProteinNumData[];
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
  const slicedArray = reformattedData.slice(0, 10);
  const arrName = slicedArray.map((x) => {
    return x.name;
  });

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
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  // plots y-axis for the graph - protein-protein interaction score
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatProteinName)).raise();

  // plotting the bars
  bars
    .selectAll("rect")
    .data(slicedArray)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => y(d.name))
    .attr("width", (d) => x(d.value))
    .attr("height", y.bandwidth())
    .style("fill", "peachpuff")
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("fill", "maroon");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("fill", "peachpuff");
    });
}

export function drawDiseaseGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // chart specific margin to display full disease names
  const margin = { top: 70, right: 50, bottom: 40, left: 150 };
  const height = 400 - margin.top - margin.bottom;
  const width = 660 - margin.left - margin.right;
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
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const bars = svg.append("g");
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(slicedArray, (d) => d.value)])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatDiseaseName));

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
    .style("fill", "maroon")
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("fill", "peachpuff");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("fill", "maroon");
    });
}

export function drawVarGeneAssocChart(
  id: string,
  data: ProteinVarType[]
): void {
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
  const width = 660 - MARGIN.left - MARGIN.right;
  // tissue specific colors
  const var_color = {
    Pancreas: "peachpuff",
    Thyroid: "lightcoral",
    "Whole Blood": "firebrick",
  };
  const svg = d3
    .select("#variant-gene-association-chart")
    .append("svg")
    .attr("width", width + MARGIN.left + MARGIN.right)
    .attr("height", height + MARGIN.top + MARGIN.bottom)
    .append("g")
    .attr("transform", "translate(" + MARGIN.left + "," + MARGIN.top + ")");
  // plots the axes
  const x = d3
    .scaleLinear()
    .domain([
      d3.min(reformattedData, (d) => d.lower),
      d3.max(reformattedData, (d) => d.upper),
    ])
    .range([0, width]);
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
  const y = d3
    .scaleBand()
    .range([0, height])
    .domain(
      reformattedData.map(function (d) {
        return d.id;
      })
    )
    .padding(1);
  svg.append("g").call(d3.axisLeft(y));
  // adds the dots and error bars
  svg
    .selectAll("error-bar-line")
    .data(reformattedData)
    .enter()
    .append("line")
    .attr("x1", function (d) {
      return x(d.upper);
    })
    .attr("x2", function (d) {
      return x(d.lower);
    })
    .attr("y1", function (d) {
      return y(d.id);
    })
    .attr("y2", function (d) {
      return y(d.id);
    })
    .attr("stroke", "grey")
    .attr("stroke-width", "1px");
  svg
    .selectAll("error-bar-circle")
    .data(reformattedData)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return x(d.value);
    })
    .attr("cy", function (d) {
      return y(d.id);
    })
    .attr("r", "6")
    .style("fill", function (d) {
      return var_color[d.name];
    });
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
  // formats variant name
  function formatVariant(d: string) {
    // remove the word "GeneticVariantFunctionalCategory" from say "GeneticVariantFunctionalCategorySplice5"
    d = d.substring(32);
    return d;
  }
  const height = 300 - MARGIN.top - MARGIN.bottom;
  const width = 600 - MARGIN.left - MARGIN.right;
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
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));
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
    .style("fill", "peachpuff")
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("fill", "maroon");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("fill", "peachpuff");
    });
}

export function drawVarSigAssocChart(id: string, data: ProteinNumData[]): void {
  // formats the variant name
  function formatVariant(d: string) {
    // removes the word "ClinSig" from say "ClinSigUncertain"
    d = d.substring(7);
    return d;
  }
  // chart specific margin dimensions
  const margin = { top: 70, right: 50, bottom: 40, left: 150 };
  const height = 300 - margin.top - margin.bottom;
  const width = 460 - margin.left - margin.right;

  const arrName = data.map((x) => {
    return x.name;
  });
  const svg = d3
    .select("#variant-significance-association-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
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

  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatVariant));

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
    .style("fill", "peachpuff")
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("fill", "maroon");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("fill", "peachpuff");
    });
}

export function drawChemGeneAssocChart(
  id: string,
  data: ProteinNumData[]
): void {
  // formats chemical-gene associations
  function formatChemName(d: string) {
    // removes the word "RelationshipAssociationType" from say "RelationshipAssociationTypeAssociated"
    d = d.substring(27);
    return d;
  }
  // graph-specific margin dimensions
  const margin = { top: 70, right: 50, bottom: 50, left: 150 };
  const height = 300 - margin.top - margin.bottom;
  const width = 460 - margin.left - margin.right;
  const arrName = data.map((x) => {
    return x.name;
  });
  const svg = d3
    .select("#chemical-gene-association-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

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
  const y = d3.scaleBand().domain(arrName).range([0, height]).padding(0.1);
  svg.append("g").call(d3.axisLeft(y).tickFormat(formatChemName));

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
    .style("fill", "maroon")
    .on("mouseover", function () {
      d3.select(this).transition().duration(50).style("fill", "peachpuff");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(50).style("fill", "maroon");
    });
}
