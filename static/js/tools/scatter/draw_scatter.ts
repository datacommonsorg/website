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

import { wrap } from "../../chart/base";
import { formatNumber } from "../../i18n/i18n";
import { ChartPropsType } from "./chart";
import { Point } from "./chart_loader";

const MARGINS = {
  bottom: 30,
  left: 60,
  right: 30,
  top: 30,
};
const Y_AXIS_WIDTH = 30;
const STROKE_WIDTH = 1.5;
const DEFAULT_FILL = "#FFFFFF";
const DENSITY_LEGEND_FONT_SIZE = "0.7rem";
const DENSITY_LEGEND_TEXT_HEIGHT = 15;
const DENSITY_LEGEND_TEXT_PADDING = 5;
const DENSITY_LEGEND_IMAGE_WIDTH = 10;
const DENSITY_LEGEND_WIDTH = 75;
const R_LINE_LABEL_MARGIN = 3;
const TOOLTIP_OFFSET = 5;

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
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
  const xScale = (log ? d3.scaleLog() : d3.scaleLinear())
    .domain([min, max])
    .range([0, width])
    .nice();
  const xAxis = d3.axisBottom(xScale);
  if (log) {
    xAxis.ticks(5, formatNumber);
  } else {
    xAxis.ticks(10).tickFormat((d) => {
      return formatNumber(d.valueOf());
    });
  }
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
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
  const yScale = (log ? d3.scaleLog() : d3.scaleLinear())
    .domain([min, max])
    .range([height, 0])
    .nice();
  const yAxis = d3.axisLeft(yScale).ticks(10);
  if (log) {
    yAxis.ticks(5, formatNumber);
  } else {
    yAxis.ticks(10).tickFormat((d) => {
      return formatNumber(d.valueOf());
    });
  }
  g.append("g").call(yAxis);
  return yScale;
}

/**
 * Draw quadrant lines at the mean of the x and y values.
 */
function addQuadrants(
  quadrant: d3.Selection<SVGGElement, any, any, any>,
  xScale: d3.ScaleLinear<any, any>,
  yScale: d3.ScaleLinear<any, any>,
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
 */
function addDensityLegend(
  svg: d3.Selection<SVGElement, any, any, any>,
  contours: d3.ContourMultiPolygon[],
  colorScale: d3.ScaleSequential<string>,
  chartHeight: number,
  marginTop: number
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

  const containerWidth = svg.node().getBoundingClientRect().width;
  const yPosition = chartHeight / 2 + marginTop - legendHeight / 2;
  legend.attr(
    "transform",
    `translate(${containerWidth - DENSITY_LEGEND_WIDTH}, ${yPosition})`
  );
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
 */
function addDensity(
  svg: d3.Selection<SVGElement, any, any, any>,
  dots: d3.Selection<SVGCircleElement, Point, SVGGElement, unknown>,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  dataPoints: Array<Point>,
  chartWidth: number,
  chartHeight: number,
  marginTop: number
): void {
  // Generate the multipolygons (contours) to group the dots into areas of
  // varying densities (number of dots per pixel)
  const contours = d3
    .contourDensity<Point>()
    .size([chartWidth, chartHeight])
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
  addDensityLegend(svg, contours, densityColorScale, chartHeight, marginTop);

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
 * Adds a hidden tooltip that becomse visible when hovering over a point
 * describing the point.
 * @param tooltip
 * @param dots
 * @param xLabel
 * @param yLabel
 */
function addTooltip(
  svgContainerRef: React.MutableRefObject<HTMLDivElement>,
  tooltip: React.MutableRefObject<HTMLDivElement>,
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
  const div = d3.select(tooltip.current);
  const onTooltipMouseover = (point: Point) => {
    const element = getTooltipElement(
      point,
      xLabel,
      yLabel,
      xPerCapita,
      yPerCapita
    );

    ReactDOM.render(element, tooltip.current);
    const tooltipHeight = (div.node() as HTMLDivElement).getBoundingClientRect()
      .height;
    const tooltipWidth = (div.node() as HTMLDivElement).getBoundingClientRect()
      .width;
    const containerWidth = (d3
      .select(svgContainerRef.current)
      .node() as HTMLDivElement).getBoundingClientRect().width;
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
  xScale: d3.ScaleLinear<any, any>,
  yScale: d3.ScaleLinear<any, any>,
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
 * Plots a scatter plot.
 * @param svg
 * @param tooltip
 * @param props
 */
export function drawScatter(
  svgContainerRef: React.MutableRefObject<HTMLDivElement>,
  tooltipRef: React.MutableRefObject<HTMLDivElement>,
  chartWidth: number,
  chartHeight: number,
  props: ChartPropsType,
  redirectAction: (placeDcid: string) => void,
  getTooltipElement: (
    point: Point,
    xLabel: string,
    yLabel: string,
    xPerCapita: boolean,
    yPerCapita: boolean
  ) => JSX.Element
): void {
  const svgContainerWidth = svgContainerRef.current.offsetWidth;
  const svgXTranslation =
    chartWidth < svgContainerWidth ? (svgContainerWidth - chartWidth) / 2 : 0;
  const svg = d3
    .select(svgContainerRef.current)
    .append("svg")
    .attr("id", "scatterplot")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("transform", `translate(${svgXTranslation},0)`);

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(Object.values(props.points), (point) => point.xVal);
  const yMinMax = d3.extent(Object.values(props.points), (point) => point.yVal);

  let height = chartHeight - MARGINS.top - MARGINS.bottom;
  const minXAxisHeight = 30;
  const yAxisLabel = svg.append("g").attr("class", "y-axis-label");
  const yAxisWidth = addYLabel(
    yAxisLabel,
    height - minXAxisHeight,
    MARGINS.top,
    props.yLabel,
    props.yUnits
  );
  let width = chartWidth - MARGINS.left - MARGINS.right - yAxisWidth;
  if (props.display.showDensity) {
    width = width - DENSITY_LEGEND_WIDTH;
  }

  const xAxisLabel = svg.append("g").attr("class", "x-axis-label");
  const xAxisHeight = addXLabel(
    xAxisLabel,
    width,
    MARGINS.left + yAxisWidth,
    chartHeight,
    props.xLabel,
    props.xUnits
  );
  height = height - xAxisHeight;

  const g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${MARGINS.left + yAxisWidth},${MARGINS.top})`
    );

  const xScale = addXAxis(g, props.xLog, height, width, xMinMax[0], xMinMax[1]);
  const yScale = addYAxis(g, props.yLog, height, yMinMax[0], yMinMax[1]);

  if (props.display.showQuadrants) {
    const quadrant = g.append("g");
    const xMean = d3.mean(Object.values(props.points), (point) => point.xVal);
    const yMean = d3.mean(Object.values(props.points), (point) => point.yVal);
    addQuadrants(quadrant, xScale, yScale, xMean, yMean, width, height);
  }

  const dots = g
    .selectAll("dot")
    .data(Object.values(props.points))
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("cx", (point) => xScale(point.xVal))
    .attr("cy", (point) => yScale(point.yVal))
    .attr("stroke", "rgb(147, 0, 0)")
    .style("opacity", "0.7")
    .on("click", (point: Point) => redirectAction(point.place.dcid));

  if (props.display.showDensity) {
    addDensity(
      svg,
      dots,
      xScale,
      yScale,
      Object.values(props.points),
      width,
      height,
      MARGINS.top
    );
  } else {
    dots
      .attr("class", "scatter-dot")
      .attr("fill", DEFAULT_FILL)
      .attr("stroke-width", STROKE_WIDTH);
  }

  if (props.display.showLabels) {
    g.append("g")
      .attr("class", "dot-label")
      .selectAll("text")
      .data(Object.values(props.points))
      .enter()
      .append("text")
      .attr("dy", "0.35em")
      .attr("x", (point) => xScale(point.xVal) + 7)
      .attr("y", (point) => yScale(point.yVal))
      .text((point) => point.place.name);
  }

  if (props.display.showRegression) {
    const regressionLine = g.append("g");
    addRegressionLine(regressionLine, xScale, yScale, props.points, xMinMax);
  }

  addTooltip(
    svgContainerRef,
    tooltipRef,
    dots,
    props.xLabel,
    props.yLabel,
    getTooltipElement,
    props.xPerCapita,
    props.yPerCapita
  );
}
