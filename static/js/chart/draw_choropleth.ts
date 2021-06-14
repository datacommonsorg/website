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
import * as geo from "geo-albers-usa-territories";
import { GeoJsonData, GeoJsonFeature, GeoJsonFeatureProperties } from "./types";
import { getColorFn } from "./base";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { formatNumber } from "../i18n/i18n";

const MISSING_DATA_COLOR = "#999";
const TOOLTIP_ID = "tooltip";
const MIN_COLOR = "#f0f0f0";
const GEO_STROKE_COLOR = "#fff";
const HIGHLIGHTED_STROKE_COLOR = "#202020";
const STROKE_WIDTH = "1px";
const HIGHLIGHTED_STROKE_WIDTH = "1.25px";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";
const TICK_SIZE = 6;
const LEGEND_MARGIN_TOP = 4;
const LEGEND_MARGIN_BOTTOM = TICK_SIZE;
const LEGEND_MARGIN_RIGHT = 5;
const LEGEND_IMG_WIDTH = 10;
const NUM_TICKS = 5;
const HIGHLIGHTED_CLASS_NAME = "highlighted";

/**
 * From https://bl.ocks.org/HarryStevens/0e440b73fbd88df7c6538417481c9065
 * scales and translates the projection to allow resizing of the choropleth map
 */
function fitSize(
  width: number,
  height: number,
  object: GeoJsonData,
  projection: d3.GeoProjection,
  path: d3.GeoPath<any, d3.GeoPermissibleObjects>
): void {
  projection.scale(1).translate([0, 0]);
  const b = path.bounds(object);
  const s =
    1 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);
  const translateX = (width - s * (b[1][0] + b[0][0])) / 2;
  const translateY = (height - s * (b[1][1] + b[0][1])) / 2;
  projection.scale(s).translate([translateX, translateY]);
}

function drawChoropleth(
  containerId: string,
  geoJson: GeoJsonData,
  chartHeight: number,
  chartWidth: number,
  dataValues: {
    [placeDcid: string]: number;
  },
  unit: string,
  statVar: string,
  canClick: boolean,
  getRedirectLink: (geoDcid: GeoJsonFeatureProperties) => string
): void {
  const label = getStatsVarLabel(statVar);
  const maxColor = d3.color(getColorFn([label])(label));
  const colorScale = d3
    .scaleLinear()
    .domain(d3.extent(Object.values(dataValues)))
    .nice()
    .range(([MIN_COLOR, maxColor, maxColor.darker(2)] as unknown) as number[])
    .interpolate(
      (d3.interpolateHslLong as unknown) as (
        a: unknown,
        b: unknown
      ) => (t: number) => number
    );

  // Add svg for the map to the div holding the chart.
  const domContainerId = `#${containerId}`;
  const svg = d3
    .select(domContainerId)
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const legendWidth = generateLegend(
    svg,
    chartWidth,
    chartHeight,
    colorScale,
    unit
  );
  const map = svg.append("g").attr("class", "map");

  // Combine path elements from D3 content.
  const mapContent = map.selectAll("path").data(geoJson.features);

  const projection = geo.geoAlbersUsaTerritories();
  const geomap = d3.geoPath().projection(projection);

  // Scale and center the map
  fitSize(chartWidth - legendWidth, chartHeight, geoJson, projection, geomap);

  // Build map objects.
  const mapObjects = mapContent
    .enter()
    .append("path")
    .attr("d", geomap)
    .attr("class", (geo: GeoJsonFeature) => {
      // highlight the place of the current page
      if (geo.properties.geoDcid === geoJson.properties.current_geo) {
        return HIGHLIGHTED_CLASS_NAME;
      }
    })
    .attr("fill", (d: GeoJsonFeature) => {
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
    .attr("stroke-width", STROKE_WIDTH)
    .attr("stroke", GEO_STROKE_COLOR)
    .on("mouseover", onMouseOver(domContainerId, canClick))
    .on("mouseout", onMouseOut(domContainerId))
    .on("mousemove", onMouseMove(domContainerId, dataValues, unit));
  if (canClick) {
    mapObjects.on("click", onMapClick(domContainerId, getRedirectLink));
  }

  // style highlighted region and bring to the front
  d3.select(domContainerId)
    .select("." + HIGHLIGHTED_CLASS_NAME)
    .raise()
    .attr("stroke-width", HIGHLIGHTED_STROKE_WIDTH)
    .attr("stroke", HIGHLIGHTED_STROKE_COLOR);
  addTooltip(domContainerId);
}

const onMouseOver = (domContainerId: string, canClick: boolean) => (
  _,
  index
): void => {
  const container = d3.select(domContainerId);
  // show highlighted border and show cursor as a pointer
  if (canClick) {
    container.select("#geoPath" + index).classed("region-highlighted", true);
  }
  // show tooltip
  container.select(`#${TOOLTIP_ID}`).style("display", "block");
};

const onMouseOut = (domContainerId: string) => (_, index): void => {
  mouseOutAction(domContainerId, index);
};

const onMouseMove = (
  domContainerId: string,
  dataValues: { [placeDcid: string]: number },
  unit: string
) => (e) => {
  const geoProperties = e["properties"];
  const placeName = geoProperties.name;
  let value = "Data Missing";
  if (dataValues[geoProperties.geoDcid]) {
    value = formatNumber(
      Math.round((dataValues[geoProperties.geoDcid] + Number.EPSILON) * 100) /
        100,
      unit
    );
  }
  const tooltipSelect = d3.select(domContainerId).select(`#${TOOLTIP_ID}`);
  const text = placeName + ": " + value;
  const tooltipHeight = (tooltipSelect.node() as HTMLDivElement).clientHeight;
  const offset = 5;
  const leftOffset = offset;
  const topOffset = -tooltipHeight - offset;
  tooltipSelect
    .text(text)
    .style("left", d3.event.offsetX + leftOffset + "px")
    .style("top", d3.event.offsetY + topOffset + "px");
};

const onMapClick = (
  domContainerId: string,
  getRedirectLink: (properties: GeoJsonFeatureProperties) => string
) => (geo: GeoJsonFeature, index) => {
  const redirectLink = getRedirectLink(geo.properties);
  window.open(redirectLink, "_blank");
  mouseOutAction(domContainerId, index);
};

function mouseOutAction(domContainerId: string, index: number) {
  const container = d3.select(domContainerId);
  container.select("#geoPath" + index).classed("region-highlighted", false);
  container.select(`#${TOOLTIP_ID}`).style("display", "none");
}

function addTooltip(domContainerId: string) {
  d3.select(domContainerId)
    .attr("style", "position: relative")
    .append("div")
    .attr("id", TOOLTIP_ID)
    .attr("style", "position: absolute; display: none; z-index: 10");
}

/**
 * Draw a color scale legend.
 * @param color The d3 linearScale that encodes the color gradient to be
 *        plotted.
 *
 * @return the width of the legend
 */
function generateLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  chartWidth: number,
  chartHeight: number,
  color: d3.ScaleLinear<number, number>,
  unit: string
) {
  const height = chartHeight - LEGEND_MARGIN_TOP - LEGEND_MARGIN_BOTTOM;
  const n = Math.min(color.domain().length, color.range().length);

  const legend = svg.append("g").attr("class", "legend");

  legend
    .append("image")
    .attr("id", "legend-img")
    .attr("x", 0)
    .attr("y", LEGEND_MARGIN_TOP)
    .attr("width", LEGEND_IMG_WIDTH)
    .attr("height", height)
    .attr("preserveAspectRatio", "none")
    .attr(
      "xlink:href",
      genScaleImg(
        color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
      ).toDataURL()
    );

  const yScale = d3.scaleLinear().domain(color.domain()).range([0, height]);

  legend
    .append("g")
    .attr("transform", `translate(0, ${LEGEND_MARGIN_TOP})`)
    .call(
      d3
        .axisRight(yScale)
        .tickSize(TICK_SIZE)
        .ticks(NUM_TICKS)
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), unit);
        })
    )
    .call((g) =>
      g
        .selectAll(".tick line")
        .attr("x2", LEGEND_IMG_WIDTH + LEGEND_MARGIN_RIGHT)
        .attr("fill", AXIS_TEXT_FILL)
        .attr("stroke", AXIS_GRID_FILL)
    )
    .call((g) =>
      g
        .selectAll(".tick text")
        .attr("transform", `translate(${LEGEND_IMG_WIDTH}, 0)`)
    )
    .call((g) => g.select(".domain").remove());

  const legendWidth = legend.node().getBBox().width;
  legend.attr("transform", `translate(${chartWidth - legendWidth}, 0)`);
  return legendWidth;
}

const genScaleImg = (
  color: d3.ScaleLinear<number, number>,
  n = 256
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = n;
  const context = canvas.getContext("2d");
  for (let i = 0; i < n; ++i) {
    context.fillStyle = (color(i / (n - 1)) as unknown) as string;
    context.fillRect(0, i, 1, 1);
  }
  return canvas;
};

export { drawChoropleth };
