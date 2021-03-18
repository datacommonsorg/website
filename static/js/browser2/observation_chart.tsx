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
 * Component for displaying a line chart for a single source series.
 */

import React from "react";
import * as d3 from "d3";
import axios from "axios";
import { DataGroup } from "../chart/base";
import { drawLineChart } from "../chart/draw";
import { DotDataPoint } from "../chart/types";
import { SourceSeries } from "./util";

// Chart size
const WIDTH = 500;
const HEIGHT = 250;

const URI_PREFIX = "/browser/";
const TOOLTIP_ID = "tooltip";
const MAX_DOTS = 100;
const NO_OBSDCID_ERROR_MESSAGE =
  "Sorry, could not open the browser page for the selected Observation Node.";

interface ObservationChartPropType {
  sourceSeries: SourceSeries;
  idx: number;
  statVarId: string;
  placeDcid: string;
  hasClickableDots: boolean;
}

interface ObservationChartStateType {
  canClickDots: boolean;
  obsDcidMapping: { [date: string]: string };
  errorMessage: string;
}

export class ObservationChart extends React.Component<
  ObservationChartPropType,
  ObservationChartStateType
> {
  constructor(props: ObservationChartPropType) {
    super(props);
    this.state = {
      canClickDots: false,
      obsDcidMapping: {},
      errorMessage: "",
    };
  }

  componentDidMount(): void {
    this.plot();
    if (this.props.hasClickableDots) {
      this.fetchObservationDcidsData();
    }
  }

  render(): JSX.Element {
    return (
      <>
        <div
          id={"svg-container" + this.props.idx}
          className={this.state.canClickDots ? "clickable" : "no-click"}
        />
        {this.state.errorMessage ? (
          <div className="error-message">{this.state.errorMessage}</div>
        ) : null}
      </>
    );
  }

  private plot(): void {
    const values = this.props.sourceSeries.val;
    const sortedValueKeys = Object.keys(values).sort();
    const data = [];
    sortedValueKeys.forEach((key) => {
      data.push({
        label: key,
        value: Number(values[key]),
      });
    });
    if (data.length > MAX_DOTS) {
      document
        .getElementById("svg-container" + this.props.idx)
        .classList.add("hide-dots");
    }
    const dataGroups = [new DataGroup("", data)];
    const svgContainerId: string = "svg-container" + this.props.idx;
    drawLineChart(
      svgContainerId,
      WIDTH,
      HEIGHT,
      dataGroups,
      true,
      this.getUnits(),
      this.props.hasClickableDots ? this.handleDotClick : null
    );
    // show tooltip on hover
    this.addTooltip(svgContainerId);
    d3.select("#" + svgContainerId)
      .selectAll("circle")
      .on("mouseover", this.handleDotHover(svgContainerId))
      .on("mouseleave", this.handleDotLeave(svgContainerId));
  }

  private fetchObservationDcidsData(): void {
    let request = `/api/browser/observation-ids?place=${this.props.placeDcid}&statVar=${this.props.statVarId}`;
    if (this.props.sourceSeries.measurementMethod) {
      request = `${request}&measurementMethod=${this.props.sourceSeries.measurementMethod}`;
    }
    if (this.props.sourceSeries.observationPeriod) {
      request = `${request}&obsPeriod=${this.props.sourceSeries.observationPeriod}`;
    }
    axios.get(request).then((resp) => {
      const data = resp.data;
      this.setState({
        obsDcidMapping: data,
        canClickDots: true,
      });
    });
  }

  private getUnits(): string {
    let units = "";
    if (this.props.sourceSeries["unit"]) {
      units = this.props.sourceSeries["unit"];
    }
    if (
      this.props.sourceSeries["scalingFactor"] &&
      this.props.sourceSeries["scalingFactor"] === "100"
    ) {
      units = "%";
    }
    return units;
  }

  private addTooltip(svgContainerId: string): void {
    d3.select("#" + svgContainerId)
      .attr("style", "position: relative")
      .append("div")
      .attr("id", TOOLTIP_ID)
      .attr("style", "position: absolute; display: none; z-index: 1");
  }

  private handleDotHover = (svgContainerId: string) => (
    dotData: DotDataPoint
  ): void => {
    const tooltipSelect = d3
      .select("#" + svgContainerId)
      .select(`#${TOOLTIP_ID}`);
    const text = `${dotData.label}: ${dotData.value}${this.getUnits()}`;
    const tooltipHeight = (tooltipSelect.node() as HTMLDivElement).clientHeight;
    const offset = 10;
    const leftOffset = offset;
    const topOffset = -tooltipHeight - offset;
    tooltipSelect
      .text(text)
      .style("left", d3.event.offsetX + leftOffset + "px")
      .style("top", d3.event.offsetY + topOffset + "px")
      .style("display", "block");
    this.updateErrorMessage("");
  };

  private handleDotLeave = (svgContainerId: string) => (): void => {
    d3.select("#" + svgContainerId)
      .select(`#${TOOLTIP_ID}`)
      .style("display", "none");
  };

  private handleDotClick = (dotData: DotDataPoint): void => {
    const date = dotData.label;
    const obsDcid = this.state.obsDcidMapping[date];
    if (obsDcid) {
      const uri = URI_PREFIX + obsDcid;
      window.open(uri);
    } else if (this.state.canClickDots) {
      this.updateErrorMessage(NO_OBSDCID_ERROR_MESSAGE)
    }
  };

  private updateErrorMessage(message: string): void {
    this.setState({
      errorMessage: message,
    });
  }
}
