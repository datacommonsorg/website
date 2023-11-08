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

/**
 * Map drawing functions shared between different kinds of maps
 */

import * as d3 from "d3";
import _ from "lodash";

import { MapChartData } from "../components/tiles/map_tile";
import { formatNumber } from "../i18n/i18n";
import { getStatsVarLabel } from "../shared/stats_var_labels";
import { DataPointMetadata, NamedPlace } from "../shared/types";
import { isTemperatureStatVar, isWetBulbStatVar } from "../tools/shared_util";
import { getColorFn } from "./base";

export const LEGEND_MARGIN_VERTICAL = 6;
export const LEGEND_MARGIN_RIGHT = 5;
export const LEGEND_IMG_WIDTH = 10;
export const HOVER_HIGHLIGHTED_CLASS_NAME = "region-highlighted";
export const LEGEND_TICK_LABEL_MARGIN = 10;
const MIN_COLOR = "#f0f0f0";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";
const TICK_SIZE = 6;
const NUM_TICKS = 4;
const LEGEND_CLASS_NAME = "legend";

// Curated temperature domains.
const TEMP_BASE_DIFF_DOMAIN = [-10, -5, 0, 5, 10];
const TEMP_MODEL_DIFF_DOMAIN = [0, 15];
const TEMP_DOMAIN = [-40, -20, 0, 20, 40];
const TEMP_AGGREGATE_DIFF_DOMAIN = [-30, -15, 0, 15, 30];

/**
 * Generate a blue to red color scale for temperature statistical variables.
 * Used as a helper function for the more general getColorScale().
 *
 * @param statVar name of the stat var we are drawing choropleth for
 * @param domain the domain of the scale. The first number is the min, second
 *               number is the middle, and the last number is the max
 * @returns a blue to red color scale to use with temperature values
 */
function getTemperatureColorScale(
  statVar: string,
  domain?: [number, number, number]
): d3.ScaleLinear<number, number> {
  let domainValues: number[];
  let range: any[] = [
    d3.interpolateBlues(1),
    d3.interpolateBlues(0.8),
    MIN_COLOR,
    d3.interpolateReds(0.8),
    d3.interpolateReds(1),
  ];

  if (statVar.indexOf("Difference") >= 0) {
    if (statVar.indexOf("Base") >= 0) {
      domainValues = domain || TEMP_BASE_DIFF_DOMAIN;
    } else if (statVar.indexOf("Dc Aggregate")) {
      domainValues = domain || TEMP_AGGREGATE_DIFF_DOMAIN;
    } else {
      domainValues = domain || TEMP_MODEL_DIFF_DOMAIN;
    }
  } else {
    domainValues = domain || TEMP_DOMAIN;
  }
  const min = domainValues[0];
  const max = domainValues[domainValues.length - 1];
  if (min >= 0) {
    domainValues = [0, max / 2, max];
    range = [MIN_COLOR, d3.interpolateReds(0.8), d3.interpolateReds(1)];
  } else if (max <= 0) {
    domainValues = [min, min / 2, 0];
    range = [d3.interpolateBlues(1), d3.interpolateBlues(0.8), MIN_COLOR];
  }
  return d3.scaleLinear().domain(domainValues).nice().range(range);
}

/**
 * Generate a color scale using specific color values.
 *
 * @param colors list of colors to use. If only one color is provided, will
 *               generate a scale that varies by luminance. If two colors are
 *               provided, will generate a diverging color scale with the first
 *               color at min value, and second color at high value. Otherwise,
 *               the first three colors will be taken to correspond to
 *               [min, mean, max] values.
 * @param domain the domain of the scale. The first number is the min, second
 *               number is the middle number, and the last number is the max.
 */
function getCustomColorScale(
  colors: string[],
  domain: [number, number, number]
): d3.ScaleLinear<number, number> {
  const midColor = d3.color(colors[0]);
  const rangeValues =
    colors.length == 1
      ? [MIN_COLOR, midColor, midColor.darker(2)]
      : colors.length == 2
      ? [colors[0], MIN_COLOR, colors[1]]
      : colors.slice(0, 3);

  return d3
    .scaleLinear()
    .domain(domain)
    .nice()
    .range(rangeValues as unknown as number[])
    .interpolate(
      d3.interpolateRgb as unknown as (colors: unknown) => (t: number) => number
    );
}

/**
 * Generates a color scale to be used for drawing choropleth map and legend.
 * NOTE: Only return linear scales.
 *
 * @param statVar name of the stat var we are drawing choropleth for
 * @param dataValues the values we are using to plot our choropleth
 * @param color the color to use as the middle color in the scale
 * @param domain the domain of the scale. The first number is the min, second
 *               number is the middle number, and the last number is the max.
 * @param customColorRange specific colors to use for the scale. See
 *                         getCustomColorScale() for specifics.
 */
export function getColorScale(
  statVar: string,
  minValue: number,
  meanValue: number,
  maxValue: number,
  color?: string,
  domain?: [number, number, number],
  customColorRange?: string[]
): d3.ScaleLinear<number, number> {
  if (customColorRange) {
    // If a specific set of colors is provided, use those colors
    return getCustomColorScale(customColorRange, [
      minValue,
      meanValue,
      maxValue,
    ]);
  }

  if (isTemperatureStatVar(statVar)) {
    // Special handling of temperature stat vars, which need blue to red scale
    return getTemperatureColorScale(statVar, domain);
  }

  const label = getStatsVarLabel(statVar);
  const maxColor = color
    ? d3.color(color)
    : isWetBulbStatVar(statVar)
    ? d3.color(d3.interpolateReds(1)) // Use a red scale for wet-bulb temps
    : d3.color(getColorFn([label])(label));
  let domainValues: number[] = domain;
  if (!domainValues) {
    domainValues = [minValue, meanValue, maxValue];
    // domain values should always be smallest to largest
    domainValues.sort((a, b) => a - b);
    const formattedMin = formatNumber(domainValues[0]);
    const formattedMax = formatNumber(domainValues[2]);
    // If the max and min values are different but the formatted versions of
    // those numbers are equal, round the min number down and round the max
    // number up so we don't display mulitple of the same numbers on the legend.
    // (max and min will always show up on the legend).
    if (formattedMin === formattedMax && domainValues[0] !== domainValues[2]) {
      const decimalIdx = formattedMin.indexOf(".");
      if (decimalIdx < 0) {
        domainValues[0] =
          domainValues[0] < 0
            ? Math.ceil(domainValues[0])
            : Math.floor(domainValues[0]);
        domainValues[2] =
          domainValues[2] < 0
            ? Math.floor(domainValues[2])
            : Math.ceil(domainValues[2]);
      } else {
        const numDecimals = formattedMin.length - 1 - decimalIdx;
        const scale = Math.pow(10, numDecimals - 1);
        domainValues[0] =
          domainValues[0] < 0
            ? Math.ceil(domainValues[0] * scale) / scale
            : Math.floor(domainValues[0] * scale) / scale;
        domainValues[2] =
          domainValues[2] < 0
            ? Math.floor(domainValues[2] * scale) / scale
            : Math.ceil(domainValues[2] * scale) / scale;
      }
    }
  }
  const rangeValues =
    domainValues.length == 3
      ? [MIN_COLOR, maxColor, maxColor.darker(2)]
      : [MIN_COLOR, maxColor.darker(2)];
  return d3
    .scaleLinear()
    .domain(domainValues)
    .nice()
    .range(rangeValues as unknown as number[])
    .interpolate(
      d3.interpolateHslLong as unknown as (
        a: unknown,
        b: unknown
      ) => (t: number) => number
    );
}

const genScaleImg = (
  color: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  height: number
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = height;
  const context = canvas.getContext("2d");
  for (let i = 0; i < height; ++i) {
    // yScale maps from color domain values to height values. Therefore, to get
    // the color at a certain height, we want to first get the color domain
    // value for that height and then get the color for that value.
    const colorDomainVal = yScale.invert(i);
    context.fillStyle = color(colorDomainVal) as unknown as string;
    context.fillRect(0, i, 1, 1);
  }
  return canvas;
};

/**
 * Add a legend to a svg element and return the width
 * @param svg svg to add the legend to
 * @param height height of the legend
 * @param color color scale to use for the legend
 * @param unit unit for the values on the legend
 * @param label label for the legend bar
 * @param variableId id to give the legend bar
 * @returns
 */
export function generateLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  height: number,
  color: d3.ScaleLinear<number, number>,
  unit: string,
  label?: string,
  variableId?: string
): number {
  // Build a scale from color.domain() to the canvas height (from [height, 0]).
  // NOTE: This assumes the color domain is linear.
  const yScaleRange = [];
  const heightBucket = height / (color.domain().length - 1);
  for (
    let i = 0, currBucket = 0;
    i < color.domain().length;
    i++, currBucket += heightBucket
  ) {
    yScaleRange.unshift(currBucket);
  }
  const yScale = d3.scaleLinear().domain(color.domain()).range(yScaleRange);

  const legend = svg.append("g").attr("class", LEGEND_CLASS_NAME);
  const colorBar = legend.append("g");
  colorBar
    .append("image")
    .attr("id", `legend-img-${variableId}`)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", LEGEND_IMG_WIDTH)
    .attr("height", height)
    .attr("preserveAspectRatio", "none")
    .attr("xlink:href", genScaleImg(color, yScale, height).toDataURL());

  // set tick values to show first tick at the start of the legend and last tick
  // at the very bottom of the legend.
  let tickValues = [yScale.invert(0), yScale.invert(height)];
  const formattedTickValues = tickValues.map((tick) =>
    formatNumber(tick, unit)
  );
  tickValues = tickValues.concat(
    color.ticks(NUM_TICKS).filter((tick) => {
      const formattedTick = formatNumber(tick, unit);
      const tickHeight = yScale(tick);
      return (
        formattedTickValues.indexOf(formattedTick) === -1 &&
        tickHeight > LEGEND_TICK_LABEL_MARGIN &&
        tickHeight < height - LEGEND_TICK_LABEL_MARGIN
      );
    })
  );
  colorBar
    .append("g")
    .attr("id", "legend-axis")
    .call(
      d3
        .axisRight(yScale)
        .tickSize(TICK_SIZE)
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), unit);
        })
        .tickValues(tickValues)
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

  let legendWidth = (
    colorBar.select("#legend-axis").node() as SVGGraphicsElement
  ).getBBox().width;

  // Add label to color bar
  if (label) {
    const colorBarLabel = legend
      .append("text")
      .attr("part", "map-legend-label")
      .attr("transform", "rotate(-90)") // rotation swaps x and y attributes
      .attr("x", -height / 2)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "hanging")
      .style("fill", AXIS_TEXT_FILL)
      .text(label);
    const colorBarLabelBBox = colorBarLabel.node().getBBox();
    legendWidth += colorBarLabelBBox.height;
    colorBar.attr("transform", `translate(${colorBarLabelBBox.height}, 0)`);
  }

  return legendWidth;
}

/**
 * Generate a svg that contains a single color scale legend
 *
 * @param containerElement element to draw the legend in
 * @param height height of the legend
 * @param legendData list of colorScale+unit+labels to add to legend
 * @param marginLeft left margin of the legend
 *
 * @return width of the svg including the margins
 */
export function generateLegendSvg(
  containerElement: HTMLDivElement,
  height: number,
  legendData: {
    colorScale: d3.ScaleLinear<number, number>;
    unit: string;
    label?: string;
  }[],
  marginLeft: number
): number {
  const container = d3.select(containerElement);
  container.selectAll("*").remove();

  let totalLegendWidth = 0;
  legendData.forEach((scale, idx) => {
    const svg = container.append("svg");
    const id = scale.label ? scale.label.replaceAll(" ", "-") : `${idx}`;
    const legendWidth =
      generateLegend(
        svg,
        height,
        scale.colorScale,
        scale.unit,
        scale.label,
        id
      ) + marginLeft;
    svg
      .attr("width", legendWidth)
      .attr("height", height + LEGEND_MARGIN_VERTICAL * 2)
      .select(`.${LEGEND_CLASS_NAME}`)
      .attr("transform", `translate(0, ${LEGEND_MARGIN_VERTICAL})`);
    totalLegendWidth += legendWidth;
  });
  return totalLegendWidth;
}

/**
 * Draw legend with color bars for all variables in the map
 * @param chartData chart data being plotted by the map
 * @param height height of the legend being drawn
 * @param legendContainer DOM element holding the legend
 * @param colors mapping of variable to color scale to use
 * @returns the width of the drawn legend in pixels and mapping of variables
 *          to computed color scales
 */
export function drawLegendSvg(
  chartData: MapChartData,
  height: number,
  legendContainer: HTMLDivElement,
  colors?: { [variable: string]: string[] }
): [
  number,
  {
    [variable: string]: d3.ScaleLinear<number, number, never>;
  }
] {
  // mapping of variable to values for computing color scale
  const allValuesByVariable: { [variable: string]: number[] } = {};
  const variableNames: { [variable: string]: string } = {};
  const units: { [variable: string]: string } = {};
  const colorScales: {
    [variable: string]: d3.ScaleLinear<number, number, never>;
  } = {};
  for (const layer of chartData.layerData) {
    // Build variable -> values mapping for color scale calculations
    // Assumes each place and variable combination will only ever have 1 unique
    // value.
    allValuesByVariable[layer.variable.statVar] = Object.values(
      layer.dataValues
    );
    variableNames[layer.variable.statVar] = layer.variable.name;
    units[layer.variable.statVar] = layer.unit;
  }

  // Calculate color scales for each variable and add legends
  const legendData: {
    colorScale: d3.ScaleLinear<number, number, never>;
    unit: string;
    label?: string;
  }[] = [];
  const shouldShowLabels = Object.keys(allValuesByVariable).length > 1;
  for (const variable in allValuesByVariable) {
    // calculate color scale based on max/min values across all layers
    const dataValues = allValuesByVariable[variable];
    const customColors = colors && colors[variable];
    const label = shouldShowLabels && variableNames[variable];
    const colorScale = getColorScale(
      variable,
      d3.min(dataValues),
      d3.mean(dataValues),
      d3.max(dataValues),
      undefined,
      undefined,
      customColors
    );
    colorScales[variable] = colorScale;
    legendData.push({
      colorScale,
      label,
      unit: units[variable],
    });
  }

  // add legend
  const legendWidth = generateLegendSvg(
    legendContainer,
    height,
    legendData,
    10
  );

  return [legendWidth, colorScales];
}

/**
 * Gets the id to use for the path for a specific place
 * @param placeDcid the dcid of the place the path is drawing
 */
export function getPlacePathId(placeDcid: string): string {
  if (_.isEmpty(placeDcid)) {
    return "";
  }
  return placeDcid.replaceAll("/", "-").replaceAll(".", "_");
}

/**
 * Toggles the highlight for a place
 * @param containerElement the container element to do the toggle on
 * @param placeDcid the place to toggle the highlight for
 * @param shouldHighlight to toggle on or off
 */
export function highlightPlaceToggle(
  containerElement: HTMLElement,
  placeDcid: string,
  shouldHighlight: boolean
) {
  const container = d3.select(containerElement);
  const region = container
    .select(`#${getPlacePathId(placeDcid)}`)
    .raise()
    .classed(HOVER_HIGHLIGHTED_CLASS_NAME, shouldHighlight);
  if (region.size()) {
    container.classed(HOVER_HIGHLIGHTED_CLASS_NAME, shouldHighlight);
  }
}

/**
 * Create function that generates tooltip content
 * @param chartData geojson and observation data for all layers of the map
 */
export function getTooltipHtmlFn(
  chartData: MapChartData
): (place: NamedPlace) => string {
  // build mapping of all values, metadata, and variable units
  // for a place/variable, to show in tooltip
  const allDataValues: { [placeDcid: string]: { [variable: string]: number } } =
    {};
  const allMetadataValues: {
    [placeDcid: string]: { [variable: string]: DataPointMetadata };
  } = {};
  const units: { [variable: string]: string } = {};
  for (const layer of chartData.layerData) {
    units[layer.variable.statVar] = layer.unit;
    for (const place in layer.dataValues) {
      if (!(place in allDataValues)) {
        allDataValues[place] = {};
      }
      allDataValues[place][layer.variable.statVar] = layer.dataValues[place];

      if (!(place in allMetadataValues)) {
        allMetadataValues[place] = {};
      }
      allMetadataValues[place][layer.variable.statVar] = layer.metadata[place];
    }
  }

  const getTooltipHtml = (place: NamedPlace) => {
    const tooltipLines: string[] = [place.name];
    if (place.dcid in allDataValues) {
      const placeValues = allDataValues[place.dcid];
      for (const variable in placeValues) {
        let value = "Data Unavailable.";
        const unit = units[variable];
        // shows upto 2 precision digits for very low values
        if (
          Math.abs(placeValues[variable]) < 1 &&
          Math.abs(placeValues[variable]) > 0
        ) {
          const dataValue = placeValues[variable];
          value = formatNumber(Number(dataValue.toPrecision(2)), unit);
        } else {
          value = formatNumber(
            Math.round((placeValues[variable] + Number.EPSILON) * 100) / 100,
            unit
          );
        }
        const date = ` (${
          allMetadataValues[place.dcid][variable].placeStatDate
        })`;
        tooltipLines.push(`${variable}: ${value}${date}`);
      }
    }
    return tooltipLines.join("<br />");
  };

  return getTooltipHtml;
}
