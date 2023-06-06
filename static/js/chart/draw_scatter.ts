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
 * Creates and manages scatter plot rendering.
 */

import * as d3 from "d3";
import * as d3Regression from "d3-regression";
import ReactDOM from "react-dom";

import { ChartQuadrant } from "../constants/scatter_chart_constants";
import { formatNumber } from "../i18n/i18n";
import { NamedPlace } from "../shared/types";
import { SHOW_POPULATION_LOG } from "../tools/scatter/context";
import { wrap } from "./base";

/**
 * Represents a point in the scatter plot.
 */
export interface Point {
  place: NamedPlace;
  xVal: number;
  yVal: number;
  xDate: string;
  yDate: string;
  xPopVal?: number;
  yPopVal?: number;
  xPopDate?: string;
  yPopDate?: string;
}

const MARGINS = {
  bottom: 30,
  left: 60,
  right: 30,
  top: 10,
};
const Y_AXIS_WIDTH = 30;
const STROKE_WIDTH = 1.5;
const DEFAULT_FILL = "#FFFFFF";
const DENSITY_LEGEND_FONT_SIZE = "0.7rem";
const DENSITY_LEGEND_TEXT_HEIGHT = 15;
const DENSITY_LEGEND_TEXT_PADDING = 5;
const DENSITY_LEGEND_IMAGE_WIDTH = 10;
const DENSITY_LEGEND_WIDTH = 75;
const DEFAULT_MAX_POINT_SIZE = 20;
const DEFAULT_POINT_SIZE = 3.5;
const R_LINE_LABEL_MARGIN = 3;
const TOOLTIP_OFFSET = 5;
// When using log scale, can't have zero, so use this value in place of 0. This
// number is chosen because should be smaller than any values in our data.
const MIN_LOGSCALE_VAL = 1e-11;
// Number of sections to break each quadrant into when searching for points to
// highlight
const HIGHLIGHT_QUADRANT_SECTIONS = 4;
// Min number of points in a quadrant to highlight
const MIN_HIGHLIGHT_POINTS = 4;
const MIN_TEXT_LABEL_HEIGHT = 10;
const MIN_TEXT_LABEL_LENGTH = 95;

enum ScaleType {
  LOG,
  SYMLOG,
  LINEAR,
}

type ScatterScale =
  | d3.ScaleSymLog<number, number>
  | d3.ScaleLinear<number, number>
  | d3.ScaleLogarithmic<number, number>;

/**
 * Adds a label for the y-axis
 * @param labelElement d3 selection with an SVG to add the label to
 * @param height height of the plot
 * @param marginTop top margin for the label
 * @param label label text to add
 * @param unit unit text to add to the label
 */
function addYLabel(
  labelElement: d3.Selection<SVGGElement, any, any, any>,
  height: number,
  marginTop: number,
  label: string,
  unit?: string
): number {
  const unitLabelString = unit ? ` (${unit})` : "";
  const yAxisLabel = labelElement
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", 0)
    .text(label + unitLabelString)
    .call(wrap, height)
    .attr(
      "transform",
      `rotate(-90) translate(${-height / 2 - marginTop}, ${
        MARGINS.left - Y_AXIS_WIDTH
      })`
    );
  return yAxisLabel.node().getBBox().height;
}

/**
 * Adds a label for the x-axis
 * @param labelElement d3 selection with an SVG to add the label to
 * @param width width of the plot
 * @param marginLeft left margin for the label
 * @param containerHeight height of container holding the plot
 * @param label label text to add
 * @param unit unit text to add to the label
 */
function addXLabel(
  labelElement: d3.Selection<SVGGElement, any, any, any>,
  width: number,
  marginLeft: number,
  containerHeight: number,
  label: string,
  unit?: string
): number {
  const unitLabelString = unit ? ` (${unit})` : "";
  const padding = 5;
  const xAxisLabel = labelElement
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", 0)
    .text(label + unitLabelString)
    .call(wrap, width);
  const xAxisHeight = xAxisLabel.node().getBBox().height + padding;
  xAxisLabel.attr(
    "transform",
    `translate(${marginLeft + width / 2},${
      containerHeight - xAxisHeight + padding
    })`
  );
  return xAxisHeight;
}

/**
 * Get a d3 scale given the type of scale, domain, and range
 * @param scaleType type of scale to return
 * @param domainExtent the min and max of the domain
 * @param rangeExtent the min and max of the range
 */
function getScale(
  scaleType: ScaleType,
  domainExtent: [number, number],
  rangeExtent: [number, number]
): ScatterScale {
  let scale;
  let domainMin = domainExtent[0];
  let domainMax = domainExtent[1];
  if (scaleType === ScaleType.SYMLOG) {
    scale = d3.scaleSymlog();
  } else if (scaleType === ScaleType.LOG) {
    scale = d3.scaleLog().clamp(true);
    domainMin = domainMin === 0 ? MIN_LOGSCALE_VAL : domainMin;
    domainMax = domainMax === 0 ? -MIN_LOGSCALE_VAL : domainMax;
  } else {
    scale = d3.scaleLinear();
  }
  scale.domain([domainMin, domainMax]);
  scale.range(rangeExtent);
  scale.nice();
  return scale;
}

/**
 * Add tick formatting for an axis based on the type of scale used
 * @param axis axis to format ticks for
 * @param scaleType type of scale used in the axis
 */
function formatAxisTicks(axis: d3.Axis<d3.AxisDomain>, scaleType: ScaleType) {
  if (scaleType === ScaleType.SYMLOG) {
    axis.tickFormat((d: number) => {
      return formatNumber(d.valueOf());
    });
  } else if (scaleType === ScaleType.LOG) {
    axis.ticks(5, formatNumber);
  } else {
    axis.ticks(10).tickFormat((d: number) => {
      return formatNumber(d.valueOf());
    });
  }
}

/**
 * Adds the x axis to the plot.
 * @param g plot container
 * @param log
 * @param height plot height
 * @param width plot width
 * @param min domain min
 * @param max domain max
 */
function addXAxis(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  log: boolean,
  height: number,
  width: number,
  min: number,
  max: number
): ScatterScale {
  let scaleType = ScaleType.LINEAR;
  if (log) {
    // If using a log scale and there's both positive and negative numbers in
    // the domain, use symlog
    scaleType = min * max < 0 ? ScaleType.SYMLOG : ScaleType.LOG;
  }
  const xScale = getScale(scaleType, [min, max], [0, width]);
  const xAxis = d3.axisBottom(xScale);
  formatAxisTicks(xAxis, scaleType);
  g.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
  return xScale;
}

/**
 * Adds the y axis to the plot.
 * @param g plot container
 * @param log
 * @param height plot height
 * @param min domain min
 * @param max domain max
 */
function addYAxis(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  log: boolean,
  height: number,
  min: number,
  max: number
): ScatterScale {
  let scaleType = ScaleType.LINEAR;
  if (log) {
    // If using a log scale and there's both positive and negative numbers in
    // the domain, use symlog
    scaleType = min * max < 0 ? ScaleType.SYMLOG : ScaleType.LOG;
  }
  const yScale = getScale(scaleType, [min, max], [height, 0]);
  const yAxis = d3.axisLeft(yScale);
  formatAxisTicks(yAxis, scaleType);
  g.append("g").call(yAxis);
  return yScale;
}

/**
 * Draw quadrant lines at the mean of the x and y values.
 */
function addQuadrants(
  quadrant: d3.Selection<SVGGElement, any, any, any>,
  xScale: ScatterScale,
  yScale: ScatterScale,
  xMean: number,
  yMean: number,
  chartWidth: number,
  chartHeight: number
) {
  quadrant
    .append("line")
    .attr("x1", xScale(xMean))
    .attr("x2", xScale(xMean))
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", "red")
    .attr("class", "quadrant-line");

  quadrant
    .append("line")
    .attr("y1", yScale(yMean))
    .attr("y2", yScale(yMean))
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("class", "quadrant-line");

  quadrant
    .append("text")
    .text(`mean (${formatNumber(xMean)}, ${formatNumber(yMean)})`)
    .attr("transform", `translate(${xScale(xMean) + 5}, 5)`)
    .attr("class", "quadrant-label");
}

/**
 * Adds a legend for the density distribution
 * @param svg svg to add the legend to
 * @param contours the density contours to add legend for
 * @param colorScale the color scale to use for the legend
 * @param chartHeight the height of the chart
 * @param marginTop top margin for the legend
 * @param svgWidth the width of the svg to add the legend to
 */
function addDensityLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  contours: d3.ContourMultiPolygon[],
  colorScale: d3.ScaleSequential<string>,
  chartHeight: number,
  marginTop: number,
  svgWidth: number
): void {
  const legend = svg
    .append("g")
    .attr("id", "density-legend")
    .attr("width", DENSITY_LEGEND_WIDTH);
  const legendHeight = chartHeight / 2;

  // add legend title
  legend
    .append("g")
    .append("text")
    .attr("dominant-baseline", "hanging")
    .attr("font-size", DENSITY_LEGEND_FONT_SIZE)
    .text("dense");

  legend
    .append("g")
    .append("text")
    .attr("dominant-baseline", "hanging")
    .attr("font-size", DENSITY_LEGEND_FONT_SIZE)
    .text("sparse")
    .attr(
      "transform",
      `translate(0, ${
        legendHeight - DENSITY_LEGEND_TEXT_HEIGHT + DENSITY_LEGEND_TEXT_PADDING
      })`
    );

  // generate a scale image and append to legend
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = contours.length + 1;
  const context = canvas.getContext("2d");
  for (let i = 0; i <= contours.length; i++) {
    context.fillStyle = colorScale(i);
    context.fillRect(0, i, 1, 1);
  }
  legend
    .append("image")
    .attr("id", "legend-img")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", DENSITY_LEGEND_IMAGE_WIDTH)
    .attr("height", legendHeight - 2 * DENSITY_LEGEND_TEXT_HEIGHT)
    .attr("preserveAspectRatio", "none")
    .attr("xlink:href", canvas.toDataURL())
    .attr("transform", `translate(0, ${DENSITY_LEGEND_TEXT_HEIGHT})`);

  const yPosition = chartHeight / 2 + marginTop - legendHeight / 2;
  legend.attr(
    "transform",
    `translate(${svgWidth - DENSITY_LEGEND_WIDTH}, ${yPosition})`
  );
}

/**
 * Gets the most recent population value for the given point.
 * Returns undefined if no population is set
 * @param point scatter plot Point object
 */
function getPointPopulation(point: Point): number | undefined {
  const xPopDate = point.xPopDate || 0;
  const yPopDate = point.yPopDate || 0;
  return xPopDate > yPopDate ? point.xPopVal : point.yPopVal;
}

/**
 * Calculates scatter plot point size based on population.
 * Returns DEFAULT_POINT_SIZE if population is undefined
 * @param point scatter plot Point object
 * @param pointSizeScale d3 scale for sizing point based on population
 */
function calculatePointSize(
  point: Point,
  pointSizeScale: ScatterScale
): number {
  const population = getPointPopulation(point);
  const pointSize = pointSizeScale(population);
  return pointSize || DEFAULT_POINT_SIZE;
}

/**
 * Adds visualization of density of points in each area
 * @param svg svg with the chart to show density for
 * @param dots the dot elements to color according to density of the area
 * @param xScale the scale to use to calculate x coordinate of data points
 * @param yScale the scale to use to calculate y coordinate of data points
 * @param dataPoints the set of data points to add density for
 * @param chartWidth the width of the chart area
 * @param chartHeight the height of the chart area
 * @param marginTop margin between top of the chart area and the top of the container
 * @param svgWidth width of the svg that holds the chart
 * @param pointSizeScale d3 scale for sizing points based on population values
 */
function addDensity(
  svg: d3.Selection<SVGElement, any, any, any>,
  dots: d3.Selection<SVGCircleElement, Point, SVGGElement, unknown>,
  xScale: ScatterScale,
  yScale: ScatterScale,
  dataPoints: Array<Point>,
  chartWidth: number,
  chartHeight: number,
  marginTop: number,
  svgWidth: number,
  pointSizeScale?: ScatterScale
): void {
  // Generate the multipolygons (contours) to group the dots into areas of
  // varying densities (number of dots per pixel)
  const contours = d3
    .contourDensity<Point>()
    .size([chartWidth, chartHeight])
    .weight((p) => (pointSizeScale ? calculatePointSize(p, pointSizeScale) : 1))
    .x((d) => {
      return xScale(d.xVal);
    })
    .y((d) => {
      return yScale(d.yVal);
    })(dataPoints);

  // Generate a color scale to determine what color the dots in each contour
  // will display
  const densityColorScale = d3
    .scaleSequential(d3.interpolateTurbo)
    .domain([contours.length, 0]);

  // Add a legend to show what each color means
  addDensityLegend(
    svg,
    contours,
    densityColorScale,
    chartHeight,
    marginTop,
    svgWidth
  );

  // color the dots according to which contour it's in
  dots
    .attr("class", "density-dot")
    .attr("fill", (point) => {
      for (let i = contours.length - 1; i >= 0; i--) {
        for (const coord of contours[i].coordinates) {
          const polygon = coord as Array<[]>;
          if (
            d3.polygonContains(polygon[0], [
              xScale(point.xVal),
              yScale(point.yVal),
            ])
          ) {
            return densityColorScale(contours.length - i - 1);
          }
        }
      }
      return densityColorScale(contours.length);
    })
    .attr("stroke-width", 0);
}

/**
 * Gets a d3 scale to size a list of points based on population
 * @param points Object mapping dcids to scatter plot point values
 * @param logScale set to true to return a log scale, otherwise defaults to linear scale
 */
function getPointSizeScale(
  points: { [placeDcid: string]: Point },
  logScale: boolean
): ScatterScale {
  const populationValues = Object.values(points).map((point) =>
    getPointPopulation(point)
  );
  const populationMin = Math.min(...populationValues);
  const populationMax = Math.max(...populationValues);
  const pointSizeScale = logScale ? d3.scaleLog() : d3.scaleLinear();
  pointSizeScale
    .domain([populationMin, populationMax])
    .range([DEFAULT_POINT_SIZE, DEFAULT_MAX_POINT_SIZE]);
  return pointSizeScale;
}

/**
 * Sizes points by population using a linear or log scale
 * @param dots
 * @param pointSizeScale
 */
function addSizeByPopulation(
  dots: d3.Selection<SVGCircleElement, Point, SVGGElement, unknown>,
  pointSizeScale: ScatterScale
): void {
  dots.attr("r", (point) => calculatePointSize(point, pointSizeScale));
}

/**
 * Adds a hidden tooltip that becomse visible when hovering over a point
 * describing the point.
 * @param tooltip
 * @param dots
 * @param xLabel
 * @param yLabel
 */
function addTooltip(
  svgContainer: HTMLDivElement,
  tooltip: HTMLDivElement,
  dots: d3.Selection<SVGCircleElement, Point, SVGGElement, unknown>,
  xLabel: string,
  yLabel: string,
  getTooltipElement: (
    point: Point,
    xLabel: string,
    yLabel: string,
    xPerCapita: boolean,
    yPerCapita: boolean
  ) => JSX.Element,
  xPerCapita: boolean,
  yPerCapita: boolean
): void {
  const div = d3.select(tooltip).style("visibility", "hidden");
  const onTooltipMouseover = (point: Point) => {
    const element = getTooltipElement(
      point,
      xLabel,
      yLabel,
      xPerCapita,
      yPerCapita
    );

    ReactDOM.render(element, tooltip);
    const tooltipHeight = (div.node() as HTMLDivElement).getBoundingClientRect()
      .height;
    const tooltipWidth = (div.node() as HTMLDivElement).getBoundingClientRect()
      .width;
    const containerWidth = (
      d3.select(svgContainer).node() as HTMLDivElement
    ).getBoundingClientRect().width;
    let left = Math.min(
      d3.event.offsetX + TOOLTIP_OFFSET,
      containerWidth - tooltipWidth
    );
    if (left < 0) {
      left = 0;
      div.style("width", containerWidth + "px");
    } else {
      div.style("width", "fit-content");
    }
    let top = d3.event.offsetY - tooltipHeight - TOOLTIP_OFFSET;
    if (top < 0) {
      top = d3.event.offsetY + TOOLTIP_OFFSET;
    }
    div
      .style("left", left + "px")
      .style("top", top + "px")
      .style("visibility", "visible");
  };
  const onTooltipMouseout = () => {
    div.style("visibility", "hidden");
  };
  dots.on("mouseover", onTooltipMouseover).on("mouseout", onTooltipMouseout);
}

/**
 * Draw regression line.
 */
function addRegressionLine(
  regressionLine: d3.Selection<SVGGElement, any, any, any>,
  xScale: ScatterScale,
  yScale: ScatterScale,
  points: { [placeDcid: string]: Point },
  xMinMax: [number, number]
) {
  const regression = d3Regression
    .regressionLinear()
    .x((point) => point.xVal)
    .y((point) => point.yVal)
    .domain(xMinMax)(Object.values(points));
  const yScaleStart = yScale.domain()[0];
  const xScaleStart = xScale.domain()[0];
  const xIntercept = (yScaleStart - regression.b) / regression.a;
  const yIntercept = regression.predict(xScaleStart);

  // The line should be within the chart space, so update the start and end
  // points of the line if they're outside of the xScale or yScales
  let startX = regression[0][0];
  let startY = regression[0][1];
  if (startY < yScaleStart) {
    startX = xIntercept;
    startY = yScaleStart;
  } else if (startX < xScaleStart) {
    startX = xScaleStart;
    startY = yIntercept;
  }
  let endX = regression[1][0];
  let endY = regression[1][1];
  if (endY < yScaleStart) {
    endX = xIntercept;
    endY = yScaleStart;
  }

  regressionLine
    .append("line")
    .attr("class", "regression-line")
    .attr("x1", xScale(startX))
    .attr("y1", yScale(startY))
    .attr("x2", xScale(endX))
    .attr("y2", yScale(endY));

  const bValueString = Math.abs(regression.b).toFixed(
    2 - Math.floor(Math.log(Math.abs(regression.b % 1)) / Math.log(10))
  );
  const aValueString = regression.a.toFixed(
    2 - Math.floor(Math.log(Math.abs(regression.a % 1)) / Math.log(10))
  );

  const label = regressionLine
    .append("text")
    .text(
      `y = ${aValueString}x ${regression.b > 0 ? "+" : "-"} ${bValueString}`
    )
    .attr("class", "regression-label");
  label.attr(
    "transform",
    `translate(${xScale(endX) - label.node().getBBox().width}, ${
      regression.a > 0
        ? yScale(endY) - R_LINE_LABEL_MARGIN
        : yScale(endY) + R_LINE_LABEL_MARGIN
    })`
  );
}

/**
 * Adds text labels for a list of points
 */
function addTextLabels(
  labelsGroup: d3.Selection<SVGGElement, any, any, any>,
  xScale: ScatterScale,
  yScale: ScatterScale,
  points: Point[]
): void {
  labelsGroup
    .attr("class", "dot-label")
    .selectAll("text")
    .data(points)
    .enter()
    .append("text")
    .attr("dy", "0.35em")
    .attr("x", (point) => xScale(point.xVal) + 7)
    .attr("y", (point) => yScale(point.yVal))
    .text((point) => point.place.name);
}

/**
 * Gets at least MIN_HIGHLIGHT_POINTS points to highlight in each quadrant for a
 * list of quadrants
 *
 * TODO: split this function up into smaller functions
 */
function getQuadrantHighlightPoints(
  points: Point[],
  xScale: ScatterScale,
  yScale: ScatterScale,
  quadrants: ChartQuadrant[]
): Record<ChartQuadrant, Point[]> {
  const numSectionsPerAxis = HIGHLIGHT_QUADRANT_SECTIONS * 2;
  const xScaleRange = xScale.range();
  const yScaleRange = yScale.range();
  const xSectionLength = (xScaleRange[1] - xScaleRange[0]) / numSectionsPerAxis;
  const ySectionLength = (yScaleRange[0] - yScaleRange[1]) / numSectionsPerAxis;
  // Get the list of points in each section of the chart
  const sectionPoints = {};
  for (const point of points) {
    const x = Math.floor(xScale(point.xVal) / xSectionLength);
    const y = Math.floor(yScale(point.yVal) / ySectionLength);
    if (!sectionPoints[x]) {
      sectionPoints[x] = {};
    }
    if (!sectionPoints[x][y]) {
      sectionPoints[x][y] = [];
    }
    sectionPoints[x][y].push(point);
  }
  // get the top (closest to the chart corner) MIN_HIGHLIGHT_POINTS points in
  // each quadrant.
  const result = {} as Record<ChartQuadrant, Point[]>;
  for (const quadrant of quadrants) {
    // depending on the quadrant traverse x and y axis either in increasing or
    // decreasing value
    const xIncrease =
      quadrant == ChartQuadrant.TOP_RIGHT ||
      quadrant == ChartQuadrant.BOTTOM_RIGHT;
    const yIncrease =
      quadrant == ChartQuadrant.BOTTOM_LEFT ||
      quadrant == ChartQuadrant.BOTTOM_RIGHT;
    // go layer by layer starting at the outside corner of each quadrant and add
    // points until the whole quadrant has been searched or min number of points
    // has been added.
    const points: Point[] = [];
    let layer = 0;
    while (
      layer < HIGHLIGHT_QUADRANT_SECTIONS &&
      points.length < MIN_HIGHLIGHT_POINTS
    ) {
      const startingX = xIncrease ? numSectionsPerAxis - layer - 1 : layer;
      const startingY = yIncrease ? numSectionsPerAxis - layer - 1 : layer;
      // traverse along x of this section
      if (xIncrease) {
        for (let x = startingX; x < numSectionsPerAxis; x++) {
          if (sectionPoints[x] && sectionPoints[x][startingY]) {
            points.push(...sectionPoints[x][startingY]);
          }
        }
      } else {
        for (let x = startingX; x >= 0; x--) {
          if (sectionPoints[x] && sectionPoints[x][startingY]) {
            points.push(...sectionPoints[x][startingY]);
          }
        }
      }
      // traverse along y of this section
      if (yIncrease) {
        for (let y = startingY + 1; y < numSectionsPerAxis; y++) {
          if (sectionPoints[startingX] && sectionPoints[startingX][y]) {
            points.push(...sectionPoints[startingX][y]);
          }
        }
      } else {
        for (let y = startingY - 1; y >= 0; y--) {
          if (sectionPoints[startingX] && sectionPoints[startingX][y]) {
            points.push(...sectionPoints[startingX][y]);
          }
        }
      }
      layer++;
    }
    // filter out points that are too close to other points
    result[quadrant] = points.filter((point, idx) => {
      for (let i = idx - 1; i >= 0; i--) {
        const iPoint = points[i];
        const diffX = xScale(point.xVal) - xScale(iPoint.xVal);
        const diffY = yScale(point.yVal) - yScale(iPoint.yVal);
        if (
          Math.abs(diffX) < MIN_TEXT_LABEL_LENGTH &&
          Math.abs(diffY) < MIN_TEXT_LABEL_HEIGHT
        ) {
          return false;
        }
      }
      return true;
    });
  }
  return result;
}

/**
 * Highlights at least MIN_HIGHLIGHT_POINTS points per quadrant for a list of
 * quadrants.
 */
function addHighlightPoints(
  highlightGroup: d3.Selection<SVGGElement, any, any, any>,
  quadrants: ChartQuadrant[],
  points: Point[],
  xScale: ScatterScale,
  yScale: ScatterScale
): void {
  const quadrantPoints = getQuadrantHighlightPoints(
    points,
    xScale,
    yScale,
    quadrants
  );
  const pointsToLabel = [];
  Object.values(quadrantPoints).forEach((quadrantPoints) => {
    pointsToLabel.push(...quadrantPoints);
  });
  addTextLabels(highlightGroup, xScale, yScale, pointsToLabel);
}

/**
 * Options that can be set for how the scatter plot is drawn.
 */
export interface ScatterPlotOptions {
  xPerCapita: boolean;
  yPerCapita: boolean;
  xLog: boolean;
  yLog: boolean;
  showQuadrants: boolean;
  showDensity: boolean;
  showPopulation: string;
  showLabels: boolean;
  showRegression: boolean;
  highlightPoints: ChartQuadrant[];
}

/**
 * Properties of the scatter plot to be drawn.
 */
export interface ScatterPlotProperties {
  width: number;
  height: number;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
}

/**
 * Draws a scatter plot.
 * @param svgContainer the div element to draw the scatter plot in
 * @param tooltip the div element for the tooltip
 * @param properties the properties of the scatter plot to draw
 * @param options the options that are set for how the scatter plot is drawn
 * @param points the points to plot
 * @param redirectAction function to run when dot on the scatter plot is clicked
 * @param getTooltipElement function to get the element to show in the tooltip
 */
export function drawScatter(
  svgContainer: HTMLDivElement,
  tooltip: HTMLDivElement,
  properties: ScatterPlotProperties,
  options: ScatterPlotOptions,
  points: { [placeDcid: string]: Point },
  redirectAction: (placeDcid: string) => void,
  getTooltipElement: (
    point: Point,
    xLabel: string,
    yLabel: string,
    xPerCapita: boolean,
    yPerCapita: boolean
  ) => JSX.Element
): void {
  const container = d3.select(svgContainer);
  container.selectAll("*").remove();
  const svgContainerWidth = svgContainer.offsetWidth;
  const svgXTranslation =
    properties.width < svgContainerWidth
      ? (svgContainerWidth - properties.width) / 2
      : 0;
  const svg = container
    .append("svg")
    .attr("id", "scatterplot")
    .attr("width", properties.width)
    .attr("height", properties.height)
    .attr("transform", `translate(${svgXTranslation},0)`);

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(Object.values(points), (point) => point.xVal);
  const yMinMax = d3.extent(Object.values(points), (point) => point.yVal);

  let height = properties.height - MARGINS.top - MARGINS.bottom;
  const minXAxisHeight = 30;
  const yAxisLabel = svg.append("g").attr("class", "y-axis-label");
  const yAxisWidth = addYLabel(
    yAxisLabel,
    height - minXAxisHeight,
    MARGINS.top,
    properties.yLabel,
    properties.yUnit
  );
  let width = properties.width - MARGINS.left - MARGINS.right - yAxisWidth;
  if (options.showDensity) {
    width = width - DENSITY_LEGEND_WIDTH;
  }

  const xAxisLabel = svg.append("g").attr("class", "x-axis-label");
  const xAxisHeight = addXLabel(
    xAxisLabel,
    width,
    MARGINS.left + yAxisWidth,
    properties.height,
    properties.xLabel,
    properties.xUnit
  );
  height = height - xAxisHeight;

  const g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${MARGINS.left + yAxisWidth},${MARGINS.top})`
    );

  const xScale = addXAxis(
    g,
    options.xLog,
    height,
    width,
    xMinMax[0],
    xMinMax[1]
  );
  const yScale = addYAxis(g, options.yLog, height, yMinMax[0], yMinMax[1]);

  if (options.showQuadrants) {
    const quadrant = g.append("g");
    const xMean = d3.mean(Object.values(points), (point) => point.xVal);
    const yMean = d3.mean(Object.values(points), (point) => point.yVal);
    addQuadrants(quadrant, xScale, yScale, xMean, yMean, width, height);
  }

  const dots = g
    .selectAll("dot")
    .data(Object.values(points))
    .enter()
    .append("circle")
    .attr("cx", (point) => xScale(point.xVal))
    .attr("cy", (point) => yScale(point.yVal))
    .attr("stroke", "rgb(147, 0, 0)")
    .style("opacity", "0.7")
    .on("click", (point: Point) => redirectAction(point.place.dcid));

  const pointSizeScale = options.showPopulation
    ? getPointSizeScale(points, options.showPopulation === SHOW_POPULATION_LOG)
    : null;

  if (options.showDensity) {
    addDensity(
      svg,
      dots,
      xScale,
      yScale,
      Object.values(points),
      width,
      height,
      MARGINS.top,
      properties.width,
      pointSizeScale
    );
  } else {
    dots
      .attr("class", "scatter-dot")
      .attr("fill", DEFAULT_FILL)
      .attr("stroke-width", STROKE_WIDTH);
  }

  if (options.showPopulation) {
    addSizeByPopulation(dots, pointSizeScale);
  } else {
    dots.attr("r", DEFAULT_POINT_SIZE);
  }

  if (options.showLabels) {
    const labelsGroup = g.append("g");
    addTextLabels(labelsGroup, xScale, yScale, Object.values(points));
  }

  if (options.showRegression) {
    const regressionLine = g.append("g");
    addRegressionLine(regressionLine, xScale, yScale, points, xMinMax);
  }

  if (options.highlightPoints) {
    const highlightGroup = g.append("g");
    addHighlightPoints(
      highlightGroup,
      options.highlightPoints,
      Object.values(points),
      xScale,
      yScale
    );
  }

  addTooltip(
    svgContainer,
    tooltip,
    dots,
    properties.xLabel,
    properties.yLabel,
    getTooltipElement,
    options.xPerCapita,
    options.yPerCapita
  );
}
