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
 * Chart component for plotting a scatter plot.
 */

import React, { useEffect, useRef } from "react";
import _ from "lodash";
import { Container, Row, Card, Badge } from "reactstrap";
import * as d3 from "d3";
import { Point } from "./chart_loader";

interface ChartPropsType {
  points: Array<Point>;
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  xPerCapita: boolean;
  yPerCapita: boolean;
  xProvenance: string;
  yProvenance: string;
}

function Chart(props: ChartPropsType): JSX.Element {
  const svg = useRef<SVGSVGElement>();
  const tooltip = useRef<HTMLDivElement>();

  // Replot when data changes.
  useEffect(() => {
    plot(svg, tooltip, props);
  }, [props]);

  return (
    <Container id="chart">
      <Row>
        <Card id="no-padding">
          <svg ref={svg} />
          <div id="tooltip" ref={tooltip} />
        </Card>
      </Row>
      <Row>
        <Card id="stats">
          <Badge color="light">X Data Source: {props.xProvenance}</Badge>
          <Badge color="light">Y Data Source: {props.yProvenance}</Badge>
          <Badge color="light">X Mean: {getXMean(props.points)}</Badge>
          <Badge color="light">Y Mean: {getYMean(props.points)}</Badge>
          <Badge color="light">
            X Standard Deviation: {getXStd(props.points)}
          </Badge>
          <Badge color="light">
            Y Standard Deviation: {getYStd(props.points)}
          </Badge>
        </Card>
      </Row>
    </Container>
  );
}

/**
 * Formats a number, or returns "N/A" if not an number.
 * If the number is a float, keeps three decimal places.
 * TODO: Need a utility determine decimals places based on value.
 * @param num
 */
function getStringOrNA(num: number): string {
  return _.isNil(num)
    ? "N/A"
    : Number.isInteger(num)
    ? num.toString()
    : num.toFixed(3);
}

/**
 * Returns the mean for x axis.
 * @param points
 */
function getXMean(points: Array<Point>): string {
  return getStringOrNA(d3.mean(points.map((point) => point.xVal)));
}

/**
 * Returns the mean for y axis.
 * @param points
 */
function getYMean(points: Array<Point>): string {
  return getStringOrNA(d3.mean(points.map((point) => point.yVal)));
}

/**
 * Returns the stdev for x axis.
 * @param points
 */
function getXStd(points: Array<Point>): string {
  return getStringOrNA(d3.deviation(points.map((point) => point.xVal)));
}

/**
 * Returns the stdev for y axis.
 * @param points
 */
function getYStd(points: Array<Point>): string {
  return getStringOrNA(d3.deviation(points.map((point) => point.yVal)));
}

/**
 * Plots a scatter plot.
 * @param svg
 * @param tooltip
 * @param props
 */
function plot(
  svg: React.MutableRefObject<SVGElement>,
  tooltip: React.MutableRefObject<HTMLDivElement>,
  props: ChartPropsType
): void {
  d3.select(svg.current).selectAll("*").remove();

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(props.points, (point) => point.xVal);
  const yMinMax = d3.extent(props.points, (point) => point.yVal);

  const margin = {
    top: 50,
    right: 30,
    bottom: 60,
    left: 90,
  };
  const svgWidth = 1200;
  const svgHeight = 430;
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const g = d3
    .select(svg.current)
    .attr("id", "scatterplot")
    .attr("width", "100%")
    .attr("height", "100%")
    // The following two lines make the plot responsive.
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = addXAxis(
    g,
    props.xLog,
    props.xPerCapita,
    props.xLabel,
    height,
    width,
    margin.bottom,
    xMinMax[0],
    xMinMax[1]
  );
  const yScale = addYAxis(
    g,
    props.yLog,
    props.yPerCapita,
    props.yLabel,
    height,
    margin.left,
    yMinMax[0],
    yMinMax[1]
  );

  g.append("text")
    .attr("class", "plot-title")
    .attr("transform", `translate(${width / 2},${-margin.top / 2})`)
    .attr("text-anchor", "middle")
    .style("font-size", "1.1em")
    .text(`${props.yLabel} vs ${props.xLabel}`);

  const dots = g
    .selectAll("dot")
    .data(props.points)
    .enter()
    .append("circle")
    .attr("r", 5)
    .attr("cx", (point) => xScale(point.xVal))
    .attr("cy", (point) => yScale(point.yVal))
    .attr("stroke", "rgb(147, 0, 0)")
    .attr("stroke-width", 1.5)
    .attr("fill", "#FFFFFF")
    .style("opacity", "0.7");

  addTooltip(tooltip, dots, props.xLabel, props.yLabel);
}

/**
 * Adds the x axis to the plot.
 * @param g plot container
 * @param log
 * @param perCapita
 * @param xLabel
 * @param height plot height
 * @param width plot width
 * @param marginBottom plot bottom margin
 * @param min domain min
 * @param max domain max
 */
function addXAxis(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  log: boolean,
  perCapita: boolean,
  xLabel: string,
  height: number,
  width: number,
  marginBottom: number,
  min: number,
  max: number
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
  const xScale = (log ? d3.scaleLog() : d3.scaleLinear())
    .domain([min, max])
    .range([0, width])
    .nice();
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(xScale)
        .ticks(log ? 5 : 10, d3.format(perCapita ? ".3f" : "d"))
    );
  g.append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `translate(${width / 2},${height + marginBottom / 2 + 10})`
    )
    .text(xLabel);
  return xScale;
}

/**
 * Adds the y axis to the plot.
 * @param g plot container
 * @param log
 * @param perCapita
 * @param yLabel
 * @param height plot height
 * @param marginLeft plot left margin
 * @param min domain min
 * @param max domain max
 */
function addYAxis(
  g: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
  log: boolean,
  perCapita: boolean,
  yLabel: string,
  height: number,
  marginLeft: number,
  min: number,
  max: number
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
  const yScale = (log ? d3.scaleLog() : d3.scaleLinear())
    .domain([min, max])
    .range([height, 0])
    .nice();
  g.append("g").call(
    d3.axisLeft(yScale).ticks(log ? 5 : 10, d3.format(perCapita ? ".3f" : "d"))
  );
  g.append("text")
    .attr("text-anchor", "middle")
    .attr(
      "transform",
      `rotate(-90) translate(${-height / 2},${-(marginLeft / 2 + 5)})`
    )
    .text(yLabel);
  return yScale;
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
  yLabel: string
): void {
  const div = d3
    .select(tooltip.current)
    .style("visibility", "hidden")
    .style("position", "fixed");

  const onTooltipMouseover = (point: Point) => {
    const html =
      `${point.place.name || point.place.dcid}<br/>` +
      `${xLabel}: ${getStringOrNA(point.xVal)}<br/>` +
      `${yLabel}: ${getStringOrNA(point.yVal)}`;
    div
      .html(html)
      .style("left", d3.event.pageX + 15 + "px")
      .style("top", d3.event.pageY - 28 + "px")
      .style("visibility", "visible");
  };
  const onTooltipMouseout = () => {
    div.style("visibility", "hidden");
  };
  dots.on("mouseover", onTooltipMouseover).on("mouseout", onTooltipMouseout);
}

export { Chart, ChartPropsType };
