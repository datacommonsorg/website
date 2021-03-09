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
 * Component for displaying a chart for a single source series for a place stat var.
 */

import React from "react";
import _ from "lodash";
import * as d3 from "d3";
import axios from "axios";

// Chart size
const WIDTH = 500;
const HEIGHT = 250;

// Chart margin.
const TOP = 50;
const RIGHT = 230;
const BOTTOM = 50;
const LEFT = 100;

const LINE_STROKE_COLOR = "rgb(31, 119, 180)";
const URI_PREFIX = "/browser2/";
const TOOLTIP_ID = "tooltip";

interface ObservationChartPropType {
  // TODO (chejennifer): get rid of the any type
  sourceSeries: any;
  idx: number;
  statVarId: string;
  placeDcid: string;
}

export class ObservationChart extends React.Component<
  ObservationChartPropType
> {
  constructor(props: ObservationChartPropType) {
    super(props);
  }

  componentDidMount(): void {
    this.plot();
  }

  render(): JSX.Element {
    return (
      <div className="card">
        <div id={this.props.statVarId} className="chart-title">
          <div>
            {this.props.sourceSeries.measurementMethod
              ? "measurementMethod: " +
                this.props.sourceSeries.measurementMethod
              : null}
          </div>
          <div>
            {this.props.sourceSeries.observationPeriod
              ? "observationPeriod: " +
                this.props.sourceSeries.observationPeriod
              : null}
          </div>
          <div>{"provenance: " + this.props.sourceSeries.provenanceDomain}</div>
        </div>
        <div id={"svg-container" + this.props.idx}></div>
      </div>
    );
  }

  private plot(): void {
    const values = this.props.sourceSeries.val;
    if (_.isEmpty(values)) {
      return;
    }
    const plotData = [];
    Object.keys(values).forEach((key) =>
      plotData.push({
        time: Date.parse(key),
        value: Number(values[key]),
        dateString: key,
      })
    );

    const svg = d3
      .select("#svg-container" + this.props.idx)
      .append("svg")
      .attr("width", WIDTH + LEFT + RIGHT)
      .attr("height", HEIGHT + TOP + BOTTOM)
      .append("g")
      .attr("transform", `translate(${LEFT},${TOP})`);

    // Set the ranges
    const x = d3.scaleTime().range([0, WIDTH]);
    const y = d3.scaleLinear().range([HEIGHT, 0]);

    x.domain(d3.extent(plotData, (d) => d.time));

    const yMax = d3.max(plotData, (d) => d.value);
    const yMin = d3.min(plotData, (d) => d.value);

    // When yMax and yMin are almost equal, need have a non-zero range for d3 to
    // plot the y axis.
    // If the min value is 0, then always start from it. Otherwise choose a tick
    // range that covers yMin and yMax.
    if (yMax - yMin < 0.0001) {
      if (Math.abs(yMin) < 0.0001) {
        y.domain([0, yMax + 1]);
      } else {
        y.domain([yMin - 1, yMax + 1]);
      }
    } else if (yMin == 0) {
      y.domain([0, yMax]);
    } else if (yMin < 0) {
      y.domain([(yMin * 4 - yMax) / 3, yMax]);
    } else {
      y.domain([Math.max(0, (yMin * 4 - yMax) / 3), yMax]);
    }

    // define the line.
    const valueline = d3
      .line()
      .x((d) => x(d["time"]))
      .y((d) => y(d["value"]))
      .curve(d3.curveMonotoneX);

    // draw path.
    svg
      .append("path")
      .datum(plotData)
      .attr("class", "line")
      .style("stroke", LINE_STROKE_COLOR)
      .attr("d", valueline);

    // draw dots.
    svg
      .selectAll("dot")
      .data(plotData)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d["time"]))
      .attr("cy", (d) => y(d["value"]))
      .style("fill", LINE_STROKE_COLOR)
      .style("stroke", LINE_STROKE_COLOR)
      .on("mouseover", this.handleDotHover)
      .on("mouseleave", this.handleDotLeave)
      .on("click", this.handleDotClick);

    // draw axis.
    if (plotData[0].dateString.match(/\d\d\d\d-\d\d-\d\d/)) {
      // The default ticks for axisBottom for days of the year sometimes have
      // inconsistent format.
      // Explicitly set the format for days of the year using d3.timeFormat.
      // Check observationDate instead of observationPeriod because
      // observationPeriod is missing for some observations.
      svg
        .append("g")
        .attr("transform", `translate(0,${HEIGHT})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %e")));
    } else {
      svg
        .append("g")
        .attr("transform", `translate(0,${HEIGHT})`)
        .call(d3.axisBottom(x));
    }
    if (plotData[0].value < 10) {
      // TODO(chejennifer): figure out a way to remove sub ticks.
      svg.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format("d")));
    } else {
      // The number of decimals depends on the domain range compared with the
      // Maximum value. When the range is narrow, need more decimals to display
      // the difference.
      const domainDiff = y.domain()[1] - y.domain()[0];
      const decimal = Math.ceil(Math.log10(y.domain()[1] / (domainDiff / 4)));
      svg.append("g").call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat(d3.format(`.${decimal}s`))
      );
    }

    // draw y label.
    const yLabelText = this.getYLabelText();
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - LEFT)
      .attr("x", 0 - HEIGHT / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(yLabelText);

    this.addTooltip();
  }

  private addTooltip() {
    d3.select("#svg-container" + this.props.idx)
      .attr("style", "position: relative")
      .append("div")
      .attr("id", TOOLTIP_ID)
      .attr("style", "position: absolute; display: none; z-index: 1");
  }

  private getYLabelText(): string {
    let yLabelText = "";
    if (this.props.sourceSeries["unit"]) {
      yLabelText = this.props.sourceSeries["unit"];
    }
    if (
      this.props.sourceSeries["scalingFactor"] &&
      this.props.sourceSeries["scalingFactor"] === "100"
    ) {
      yLabelText = "%";
    }
    return yLabelText;
  }

  private handleDotHover = (dataPoint: any): void => {
    const tooltipSelect = d3
      .select("#svg-container" + this.props.idx)
      .select(`#${TOOLTIP_ID}`);
    const text =
      dataPoint.dateString + ": " + dataPoint.value + this.getYLabelText();
    const tooltipHeight = (tooltipSelect.node() as HTMLDivElement).clientHeight;
    const offset = 10;
    const leftOffset = offset;
    const topOffset = -tooltipHeight - offset;
    tooltipSelect
      .text(text)
      .style("left", d3.event.offsetX + leftOffset + "px")
      .style("top", d3.event.offsetY + topOffset + "px")
      .style("display", "block");
  };

  private handleDotLeave = (): void => {
    d3.select("#svg-container" + this.props.idx)
      .select(`#${TOOLTIP_ID}`)
      .style("display", "none");
  };

  private handleDotClick = (dataPoint: any): void => {
    // TODO (chejennifer): might need better way of getting dcid of observation node because this can be very slow
    const date = dataPoint.dateString;
    let request = `/api/browser/observationId?place=${this.props.placeDcid}&stat_var=${this.props.statVarId}&date=${date}`;
    if (this.props.sourceSeries.measurementMethod) {
      request =
        request +
        `&measurement_method=${this.props.sourceSeries.measurementMethod}`;
    }
    if (this.props.sourceSeries.observationPeriod) {
      request =
        request + `&obs_period=${this.props.sourceSeries.observationPeriod}`;
    }
    const obsDcidPromise = axios.get(request).then((resp) => resp.data);
    obsDcidPromise.then((obsDcid) => {
      const uri = URI_PREFIX + obsDcid;
      window.open(uri);
    });
  };
}
