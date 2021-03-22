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
import { DataGroup, DataPoint } from "../chart/base";
import { drawLineChart } from "../chart/draw";
import { DotDataPoint } from "../chart/types";
import { SourceSeries } from "./util";

// Chart size
const WIDTH = 500;
const HEIGHT = 250;

const URI_PREFIX = "/browser/";
const TOOLTIP_ID = "tooltip";
// Only show dots when there's only a single data point
const MAX_DOTS = 1;
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
  dateToDcid: { [date: string]: string };
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
      dateToDcid: {},
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
    let svgContainerClass = this.state.canClickDots ? "clickable" : "no-click";
    if (Object.keys(this.props.sourceSeries.val).length > MAX_DOTS) {
      svgContainerClass = svgContainerClass + " hide-dots";
    }
    return (
      <>
        <div
          id={"svg-container" + this.props.idx}
          className={svgContainerClass}
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
    const svgContainerId: string = "svg-container" + this.props.idx;
    const dataGroups = [new DataGroup("", data)];
    this.addTooltip(svgContainerId);
    drawLineChart(
      svgContainerId,
      WIDTH,
      HEIGHT,
      dataGroups,
      true,
      true,
      TOOLTIP_ID,
      this.getUnits(),
      this.props.hasClickableDots ? this.handleDotClick : null,
      this.handleDotHighlight(svgContainerId)
    );
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
        canClickDots: true,
        dateToDcid: data,
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

  private handleDotHighlight = (svgContainerId: string) => (
    dotData: DataPoint,
    datapointX: number,
    datapointY: number,
    leftMargin: number,
    bottomMargin: number
  ): void => {
    const text = `${dotData.label}: ${dotData.value} ${this.getUnits()}`;
    const tooltipSelect = d3
      .select("#" + svgContainerId)
      .select(`#${TOOLTIP_ID}`)
      .text(text);
    const rect = (tooltipSelect.node() as HTMLDivElement).getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const topOffset = 5;
    let left = datapointX - width / 2;
    if (left < leftMargin) {
      left = leftMargin;
    } else if (left + width > WIDTH) {
      left = WIDTH - width;
    }
    let top = 0;
    if (height > datapointY - topOffset) {
      top = HEIGHT - bottomMargin - height;
    }
    tooltipSelect.style("left", left + "px").style("top", top + "px");
    this.updateErrorMessage("");
  };

  private handleDotClick = (dotData: DotDataPoint): void => {
    const date = dotData.label;
    const obsDcid = this.state.dateToDcid[date];
    if (obsDcid) {
      const uri = URI_PREFIX + obsDcid;
      window.open(uri);
    } else if (this.state.canClickDots) {
      this.updateErrorMessage(NO_OBSDCID_ERROR_MESSAGE);
    }
  };

  private updateErrorMessage(message: string): void {
    this.setState({
      errorMessage: message,
    });
  }
}
