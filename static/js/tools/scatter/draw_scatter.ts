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

import { wrap } from "../../chart/base";
import * as d3 from "d3";
import { formatNumber } from "../../i18n/i18n";
import { Point } from "./chart_loader";
import ReactDOM from "react-dom";
import { ChartPropsType } from "./chart";

const MARGINS = {
  bottom: 30,
  left: 60,
  right: 30,
  top: 30,
};
const Y_AXIS_WIDTH = 30;

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
 * Adds a hidden tooltip that becomse visible when hovering over a point
 * describing the point.
 * @param tooltip
 * @param dots
 * @param xLabel
 * @param yLabel
 */
function addTooltip(
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
    div
      .style("left", d3.event.pageX + 15 + "px")
      .style("top", d3.event.pageY - 28 + "px")
      .style("visibility", "visible");
  };
  const onTooltipMouseout = () => {
    div.style("visibility", "hidden");
  };
  dots.on("mouseover", onTooltipMouseover).on("mouseout", onTooltipMouseout);
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
  redirectAction: (
    xStatVar: string,
    yStatVar: string,
    placeDcid: string
  ) => void,
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
  const width = chartWidth - MARGINS.left - MARGINS.right - yAxisWidth;

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

  if (props.showQuadrants) {
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
    .attr("stroke-width", 1.5)
    .attr("fill", "#FFFFFF")
    .style("opacity", "0.7")
    .on("click", (point: Point) =>
      redirectAction(props.xStatVar, props.yStatVar, point.place.dcid)
    );

  if (props.showLabels) {
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

  addTooltip(
    tooltipRef,
    dots,
    props.xLabel,
    props.yLabel,
    getTooltipElement,
    props.xPerCapita,
    props.yPerCapita
  );
}
