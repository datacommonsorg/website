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

import { getStatsVarLabel } from "../shared/stats_var_labels";
import { isTemperatureStatVar, isWetBulbStatVar } from "../tools/shared_util";
import { getColorFn } from "./base";

const MIN_COLOR = "#f0f0f0";
const AXIS_TEXT_FILL = "#2b2929";
const AXIS_GRID_FILL = "#999";
const TICK_SIZE = 6;
const LEGEND_MARGIN_RIGHT = 5;
const LEGEND_IMG_WIDTH = 10;
const NUM_TICKS = 4;
export const HOVER_HIGHLIGHTED_CLASS_NAME = "region-highlighted";
const LEGEND_CLASS_NAME = "legend";
const LEGEND_TICK_LABEL_MARGIN = 10;

// Curated temperature domains.
const TEMP_BASE_DIFF_DOMAIN = [-10, -5, 0, 5, 10];
const TEMP_MODEL_DIFF_DOMAIN = [0, 15];
const TEMP_DOMAIN = [-40, -20, 0, 20, 40];
const TEMP_AGGREGATE_DIFF_DOMAIN = [-30, -15, 0, 15, 30];

/**
 * Generates a color scale to be used for drawing choropleth map and legend.
 * NOTE: Only return linear scales.
 *
 * @param statVar name of the stat var we are drawing choropleth for
 * @param dataValues the values we are using to plot our choropleth
 * @param color the color to use as the middle color in the scale
 * @param domain the domain of the scale. The first number is the min, second
 *               number is the middle number, and the last number is the max.
 */
export function getColorScale(
  statVar: string,
  minValue: number,
  meanValue: number,
  maxValue: number,
  color?: string,
  domain?: [number, number, number]
): d3.ScaleLinear<number, number> {
  const label = getStatsVarLabel(statVar);
  const maxColor = color
    ? d3.color(color)
    : isWetBulbStatVar(statVar)
    ? d3.color(d3.interpolateReds(1))
    : d3.color(getColorFn([label])(label));
  let domainValues: number[] = domain || [minValue, meanValue, maxValue];
  if (isTemperatureStatVar(statVar)) {
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
 * @param formatNumberFn function to use to format numbers
 * @returns
 */
export function generateLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  height: number,
  color: d3.ScaleLinear<number, number>,
  unit: string,
  formatNumberFn: (value: number, unit?: string) => string
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
  legend
    .append("image")
    .attr("id", "legend-img")
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
    formatNumberFn(tick, unit)
  );
  tickValues = tickValues.concat(
    color.ticks(NUM_TICKS).filter((tick) => {
      const formattedTick = formatNumberFn(tick, unit);
      const tickHeight = yScale(tick);
      return (
        formattedTickValues.indexOf(formattedTick) === -1 &&
        tickHeight > LEGEND_TICK_LABEL_MARGIN &&
        tickHeight < height - LEGEND_TICK_LABEL_MARGIN
      );
    })
  );
  legend
    .append("g")
    .call(
      d3
        .axisRight(yScale)
        .tickSize(TICK_SIZE)
        .tickFormat((d) => {
          return formatNumberFn(d.valueOf(), unit);
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

  const legendWidth = legend.node().getBBox().width;
  return legendWidth;
}

/**
 * Generate a svg that contains a color scale legend
 *
 * @param containerElement element to draw the legend in
 * @param height height of the legend
 * @param colorScale the color scale to use for the legend
 * @param unit unit of measurement
 * @param marginLeft left margin of the legend
 * @param formatNumberFn function to use to format numbers
 *
 * @return width of the svg including the margins
 */
export function generateLegendSvg(
  containerElement: HTMLDivElement,
  height: number,
  colorScale: d3.ScaleLinear<number, number>,
  unit: string,
  marginLeft: number,
  formatNumberFn: (value: number, unit?: string) => string
): number {
  const container = d3.select(containerElement);
  container.selectAll("*").remove();
  const svg = container.append("svg");
  const legendWidth =
    generateLegend(svg, height, colorScale, unit, formatNumberFn) + marginLeft;
  svg
    .attr("width", legendWidth)
    .attr("height", height + TICK_SIZE * 2)
    .select(`.${LEGEND_CLASS_NAME}`)
    .attr("transform", `translate(${marginLeft}, ${TICK_SIZE})`);
  return legendWidth;
}

export function getPlacePathId(placeDcid: string): string {
  if (_.isEmpty(placeDcid)) {
    return "";
  }
  return placeDcid.replaceAll("/", "-");
}
