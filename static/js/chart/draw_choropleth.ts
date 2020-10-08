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

/**
 * Creates and manages choropleth rendering.
 */

import * as d3 from "d3";

const CHOROPLETH_MIN_DATAPOINTS = 9;
const blues = [
  "#f7fbff",
  "#deebf7",
  "#c6dbef",
  "#9ecae1",
  "#6baed6",
  "#4292c6",
  "#2171b5",
  "#08519c",
  "#08306b",
];
const MISSING_DATA_COLOR = "grey";
const TOOLTIP_ID = "tooltip";

function drawChoropleth(
  containerId: string,
  geoJson: any,
  chartHeight: number,
  chartWidth: number,
  dataValues: {
    [placeDcid: string]: number;
  },
  unit: string
): void {
  const colorVals = determineColorPalette(dataValues);
  const colorScale = d3
    .scaleLinear()
    .domain(colorVals)
    .range((blues as unknown) as number[]);

  // Add svg for the map to the div holding the chart.
  d3.select("#" + containerId)
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .append("g")
    .attr("class", "map");

  // Combine path elements from D3 content.
  const mapContent = d3
    .select("#" + containerId + " g.map")
    .selectAll("path")
    .data(geoJson.features);

  // Scale and center the map.
  const projection = d3
    .geoAlbersUsa()
    .fitSize([chartWidth, chartHeight], geoJson);
  const geomap = d3.geoPath().projection(projection);

  // Build map objects.
  mapContent
    .enter()
    .append("path")
    .attr("d", geomap)
    // Add CSS class to each path for border outlining.
    .attr("class", "border")
    // fill with the colors that match each value.
    .attr("fill", (d: { properties: { geoDcid: string } }) => {
      if (
        d.properties.geoDcid in dataValues &&
        dataValues[d.properties.geoDcid]
      ) {
        const value = dataValues[d.properties.geoDcid];
        return colorScale(value);
      } else {
        return MISSING_DATA_COLOR;
      }
    })
    .attr("id", (_, index) => {
      return "geoPath" + index;
    })
    .on("mouseover", onMouseOver(containerId))
    .on("mouseout", onMouseOut(containerId))
    .on("mousemove", onMouseMove(containerId, dataValues, unit));

  generateLegend(containerId, colorScale, unit);
  addTooltip(containerId);
}

const onMouseOver = (containerId: string) => (_, index): void => {
  // show highlighted border
  d3.select("#geoPath" + index)
    .classed("border", false)
    .classed("border-highlighted", true);
  // show tooltip
  d3.select("#" + containerId + " #" + TOOLTIP_ID).style("display", "block");
};

const onMouseOut = (containerId: string) => (_, index): void => {
  d3.select("#geoPath" + index)
    .classed("border", true)
    .classed("border-highlighted", false);
  d3.select("#" + containerId + " #" + TOOLTIP_ID).style("display", "none");
};

const onMouseMove = (
  containerId: string,
  dataValues: { [placeDcid: string]: number },
  unit: string
) => (e) => {
  const geoProperties = e["properties"];
  const placeName = geoProperties.name;
  let value = "Data Missing";
  if (dataValues[geoProperties.geoDcid]) {
    value = (
      Math.round((dataValues[geoProperties.geoDcid] + Number.EPSILON) * 100) /
      100
    ).toLocaleString();
    if (unit) {
      value = unit == "$" ? unit + value : value + unit;
    }
  }
  const text = placeName + ": " + value;
  const tooltipHeight = document.getElementById(containerId).querySelector(`[id=${TOOLTIP_ID}]`).clientHeight;
  const leftOffset = 5;
  const topOffset = -tooltipHeight - 5;
  d3.select("#" + containerId + " #tooltip")
    .text(text)
    .style("left", d3.event.offsetX + leftOffset + "px")
    .style("top", d3.event.offsetY + topOffset + "px");
};

//TODO(chejennifer): use viridis or another standard d3 scale
function determineColorPalette(dataValues: {
  [placeDcid: string]: number;
}): number[] {
  // Create a sorted list of values.
  const values = [];
  for (const key in dataValues) {
    values.push(dataValues[key]);
  }
  values.sort((a, b) => a - b);
  const len = values.length;

  // Find CHOROPLETH_MIN_DATAPOINTS number of values with equal separation from one another.
  const steps = CHOROPLETH_MIN_DATAPOINTS;
  if (len >= steps) {
    const start = 0;
    return d3.range(start, steps).map((d) => {
      return values[Math.floor(((len - 1) * d) / (steps - 1))];
    });
  } else {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
}

function addTooltip(containerId: string) {
  d3.select("#" + containerId)
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 10");
}

/**
 * Draw a color scale legend.
 * @param color The d3 linearScale that encodes the color gradient to be
 *        plotted.
 */
function generateLegend(
  id: string,
  color: d3.ScaleLinear<number, number>,
  unit: string
) {
  // TODO(chejennifer): Make these values relative to container size
  const width = 250;
  const height = 50;
  const tickSize = 6;
  const title = unit ? "Scale (" + unit + ")" : "Scale";
  const marginTop = 18;
  const marginBottom = 16 + tickSize;
  const marginSides = 15;
  const textPadding = 6;
  const numTicks = 5;

  d3.select("#" + id)
    .append("div")
    .attr("class", "choropleth-legend")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const n = Math.min(color.domain().length, color.range().length);
  const svg = d3.select("#" + id + " .choropleth-legend svg");

  svg
    .append("image")
    .attr("id", "legend-img")
    .attr("x", marginSides)
    .attr("y", marginTop)
    .attr("width", width - 2 * marginSides)
    .attr("height", height - marginTop - marginBottom)
    .attr("preserveAspectRatio", "none")
    .attr(
      "xlink:href",
      genScaleImg(
        color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
      ).toDataURL()
    );

  const x = color
    .copy()
    .rangeRound(
      d3.quantize(d3.interpolate(marginSides, width - marginSides), n)
    );

  const dom = color.domain();
  const tickValues = d3.range(numTicks).map((i) => {
    const index = Math.floor((i * (dom.length - 1)) / (numTicks - 1));
    return dom[index];
  });

  svg
    .append("g")
    .attr("transform", `translate(0, ${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSize(tickSize).tickValues(tickValues))
    .call((g) =>
      g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height)
    )
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", marginSides)
        .attr("y", marginTop + marginBottom - height - textPadding)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(title)
    );
}

const genScaleImg = (
  color: d3.ScaleLinear<number, number>,
  n = 256
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = (color(i / (n - 1)) as unknown) as string;
    context.fillRect(i, 0, 1, 1);
  }
  return canvas;
};

export { CHOROPLETH_MIN_DATAPOINTS, drawChoropleth };
