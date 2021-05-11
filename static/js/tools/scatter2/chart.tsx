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

import ReactDOM from "react-dom";
import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { Container, Row, Card } from "reactstrap";
import * as d3 from "d3";
import { Point } from "./chart_loader";
import { urlToDomain } from "../../shared/util";
import { formatNumber } from "../../i18n/i18n";

interface ChartPropsType {
  points: Array<Point>;
  xLabel: string;
  yLabel: string;
  xLog: boolean;
  yLog: boolean;
  xPerCapita: boolean;
  yPerCapita: boolean;
  xStatVar: string;
  yStatVar: string;
  xUnits?: string;
  yUnits?: string;
}

const DOT_REDIRECT_PREFIX = "/tools/timeline";
const SVG_CONTAINER_ID = "scatter-plot-container";

function Chart(props: ChartPropsType): JSX.Element {
  const svgRef = useRef<SVGSVGElement>();
  const svgContainerRef = useRef<HTMLDivElement>();
  const tooltip = useRef<HTMLDivElement>();
  const sources: Set<string> = new Set();
  const [chartWidth, setChartWidth] = useState(0);
  props.points.forEach((point) => {
    sources.add(point.xSource);
    sources.add(point.ySource);
    if (props.xPerCapita && point.xPopSource) {
      sources.add(point.xPopSource);
    }
    if (props.yPerCapita && point.yPopSource) {
      sources.add(point.yPopSource);
    }
  });
  const sourceList: string[] = Array.from(sources);
  const seenSourceDomains = new Set();
  const sourcesJsx = sourceList.map((source, index) => {
    const domain = urlToDomain(source);
    if (seenSourceDomains.has(domain)) {
      return null;
    }
    seenSourceDomains.add(domain);
    return (
      <span key={source}>
        {index > 0 ? ", " : ""}
        <a href={source}>{domain}</a>
      </span>
    );
  });
  // Replot when data changes.
  useEffect(() => {
    plot(svgRef, svgContainerRef, tooltip, props);
  }, [props]);

  useEffect(() => {
    function _handleWindowResize() {
      if (svgContainerRef.current) {
        const width = svgContainerRef.current.offsetWidth;
        if (width !== chartWidth) {
          setChartWidth(width);
          plot(svgRef, svgContainerRef, tooltip, props);
        }
      }
    }
    window.addEventListener("resize", _handleWindowResize);
    return () => {
      window.removeEventListener("resize", _handleWindowResize);
    };
  }, [props]);
  return (
    <Container id="chart">
      <Row>
        <Card id="no-padding">
          <div id={SVG_CONTAINER_ID} ref={svgContainerRef}>
            <svg ref={svgRef}></svg>
          </div>
          <div id="tooltip" ref={tooltip} />
          <div className="provenance">Data from {sourcesJsx}</div>
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
  svgRef: React.MutableRefObject<SVGElement>,
  svgContainerRef: React.MutableRefObject<HTMLDivElement>,
  tooltip: React.MutableRefObject<HTMLDivElement>,
  props: ChartPropsType
): void {
  d3.select(svgRef.current).selectAll("*").remove();
  const svgContainerWidth = Math.max(svgContainerRef.current.offsetWidth, 400);
  const svgContainerHeight = Math.max(300, svgContainerWidth / 3);
  const svg = d3
    .select(svgRef.current)
    .attr("id", "scatterplot")
    .attr("width", svgContainerWidth)
    .attr("height", svgContainerHeight);

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(props.points, (point) => point.xVal);
  const yMinMax = d3.extent(props.points, (point) => point.yVal);

  const margin = {
    top: 50,
    right: 30,
    bottom: 60,
    left: 90,
  };

  const width = svgContainerWidth - margin.left - margin.right;
  const height = svgContainerHeight - margin.top - margin.bottom;

  const g = svg
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
    xMinMax[1],
    props.xUnits
  );
  const yScale = addYAxis(
    g,
    props.yLog,
    props.yPerCapita,
    props.yLabel,
    height,
    margin.left,
    yMinMax[0],
    yMinMax[1],
    props.yUnits
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
    .style("opacity", "0.7")
    .on("click", handleDotClick(props.xStatVar, props.yStatVar));

  addTooltip(
    tooltip,
    dots,
    props.xLabel,
    props.yLabel,
    props.xPerCapita,
    props.yPerCapita
  );
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
  max: number,
  unit?: string
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
        .tickFormat((d) => {
          return formatNumber(d.valueOf(), unit);
        })
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
  max: number,
  unit?: string
): d3.ScaleLinear<number, number> | d3.ScaleLogarithmic<number, number> {
  const yScale = (log ? d3.scaleLog() : d3.scaleLinear())
    .domain([min, max])
    .range([height, 0])
    .nice();
  g.append("g").call(
    d3
      .axisLeft(yScale)
      .ticks(log ? 5 : 10, d3.format(perCapita ? ".3f" : "d"))
      .tickFormat((d) => {
        return formatNumber(d.valueOf(), unit);
      })
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
  yLabel: string,
  xPerCapita: boolean,
  yPerCapita: boolean
): void {
  const div = d3
    .select(tooltip.current)
    .style("visibility", "hidden")
    .style("position", "fixed");
  const onTooltipMouseover = (point: Point) => {
    let xSource = urlToDomain(point.xSource);
    if (xPerCapita && point.xPopSource) {
      const xPopDomain = urlToDomain(point.xPopSource);
      if (xPopDomain !== xSource) {
        xSource += `, ${xPopDomain}`;
      }
    }
    let ySource = urlToDomain(point.ySource);
    if (yPerCapita && point.yPopSource) {
      const yPopDomain = urlToDomain(point.yPopSource);
      if (yPopDomain !== ySource) {
        ySource += `, ${yPopDomain}`;
      }
    }
    ReactDOM.render(
      <>
        <title>{point.place.name || point.place.dcid}</title>
        {xLabel}({point.xDate}): {getStringOrNA(point.xVal)}
        <br />
        {yLabel} ({point.yDate}): {getStringOrNA(point.yVal)} <br />
        <footer>
          {xLabel} data from: {xSource}
          <br />
          {yLabel} data from: {ySource}
        </footer>
      </>,
      tooltip.current
    );
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

const handleDotClick = (xStatVar: string, yStatVar: string) => (
  point: Point
) => {
  const uri = `${DOT_REDIRECT_PREFIX}#place=${point.place.dcid}&statsVar=${xStatVar}__${yStatVar}`;
  window.open(uri);
};

export { Chart, ChartPropsType };
