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
import { wrap } from "../../chart/base";

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
  showQuadrants: boolean;
  showLabels: boolean;
}

const DOT_REDIRECT_PREFIX = "/tools/timeline";
const SVG_CONTAINER_ID = "scatter-plot-container";
const MARGINS = {
  bottom: 30,
  left: 60,
  right: 30,
  top: 30,
};
const Y_AXIS_WIDTH = 30;

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
 * Adds title to the plot and returns the height of the added title.
 * @param titleSelection d3 selection with an SVG element to add the title to
 * @param width width of the plot
 * @param yLabel y-label of the plot
 * @param xLabel x-label of the plot
 */
function addPlotTitle(
  titleSelection: d3.Selection<SVGGElement, any, any, any>,
  width: number,
  yLabel: string,
  xLabel: string
): number {
  const plotTitle = titleSelection
    .append("text")
    .attr("class", "plot-title")
    .attr("y", 0)
    .attr("transform", `translate(${width / 2}, ${MARGINS.top})`)
    .attr("text-anchor", "middle")
    .style("font-size", "1.1em")
    .text(`${yLabel} vs ${xLabel}`)
    .call(wrap, width);
  return plotTitle.node().getBBox().height;
}

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
  const svgContainerRealWidth = svgContainerRef.current.offsetWidth;
  const svgContainerMaxWidth = window.innerHeight * 0.65;
  const svgContainerWidth = Math.min(
    svgContainerRealWidth,
    svgContainerMaxWidth
  );
  const svgContainerHeight = svgContainerWidth;
  const svgXTranslation =
    svgContainerWidth < svgContainerRealWidth
      ? (svgContainerRealWidth - svgContainerWidth) / 2
      : 0;
  const svg = d3
    .select(svgRef.current)
    .attr("id", "scatterplot")
    .attr("width", svgContainerWidth)
    .attr("height", svgContainerHeight)
    .attr("transform", `translate(${svgXTranslation},0)`);

  // TODO: Handle log domain 0.
  const xMinMax = d3.extent(props.points, (point) => point.xVal);
  const yMinMax = d3.extent(props.points, (point) => point.yVal);

  const plotTitle = svg.append("g").attr("class", "plot-title");
  const titleHeight = addPlotTitle(
    plotTitle,
    svgContainerWidth,
    props.yLabel,
    props.xLabel
  );

  let height = svgContainerHeight - titleHeight - MARGINS.top - MARGINS.bottom;
  const minXAxisHeight = 30;
  const yAxisLabel = svg.append("g").attr("class", "y-axis-label");
  const yAxisWidth = addYLabel(
    yAxisLabel,
    height - minXAxisHeight,
    titleHeight + MARGINS.top,
    props.yLabel,
    props.yUnits
  );
  const width = svgContainerWidth - MARGINS.left - MARGINS.right - yAxisWidth;

  const xAxisLabel = svg.append("g").attr("class", "x-axis-label");
  const xAxisHeight = addXLabel(
    xAxisLabel,
    width,
    MARGINS.left + yAxisWidth,
    svgContainerHeight,
    props.xLabel,
    props.xUnits
  );
  height = height - xAxisHeight;

  const g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${MARGINS.left + yAxisWidth},${MARGINS.top + titleHeight})`
    );

  const xScale = addXAxis(g, props.xLog, height, width, xMinMax[0], xMinMax[1]);
  const yScale = addYAxis(g, props.yLog, height, yMinMax[0], yMinMax[1]);

  if (props.showQuadrants) {
    const quadrant = g.append("g");
    const xMean = d3.mean(props.points, (point) => point.xVal);
    const yMean = d3.mean(props.points, (point) => point.yVal);
    addQuadrants(quadrant, xScale, yScale, xMean, yMean, width, height);
  }

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

  if (props.showLabels) {
    g.append("g")
      .attr("class", "dot-label")
      .selectAll("text")
      .data(props.points)
      .enter()
      .append("text")
      .attr("dy", "0.35em")
      .attr("x", (point) => xScale(point.xVal) + 7)
      .attr("y", (point) => yScale(point.yVal))
      .text((point) => point.place.name);
  }

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
    const showXPopDateMessage =
      xPerCapita && point.xPopDate && !point.xDate.includes(point.xPopDate);
    const showYPopDateMessage =
      yPerCapita && point.yPopDate && !point.yDate.includes(point.yPopDate);
    ReactDOM.render(
      <>
        <header>
          <b>{point.place.name || point.place.dcid}</b>
        </header>
        {xLabel}({point.xDate}): {getStringOrNA(point.xVal)}
        <br />
        {yLabel} ({point.yDate}): {getStringOrNA(point.yVal)} <br />
        <footer>
          {xLabel} data from: {xSource}
          <br />
          {yLabel} data from: {ySource}
          <br />
          {showXPopDateMessage && (
            <>
              <sup>*</sup> {xLabel} uses population data from: {point.xPopDate}
            </>
          )}
          {showYPopDateMessage && (
            <>
              <sup>*</sup> {yLabel} uses population data from: {point.yPopDate}
            </>
          )}
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
