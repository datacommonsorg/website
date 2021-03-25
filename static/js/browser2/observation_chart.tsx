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
import axios from "axios";
import { DataGroup } from "../chart/base";
import { drawLineChart } from "../chart/draw";
import { DotDataPoint } from "../chart/types";
import { getUnit, SourceSeries } from "./util";

// Chart size
const WIDTH = 500;
const HEIGHT = 250;

const URI_PREFIX = "/browser/";
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
        <div id={this.svgContainerId} className={svgContainerClass} />
        {this.state.errorMessage ? (
          <div className="error-message">{this.state.errorMessage}</div>
        ) : null}
      </>
    );
  }

  private svgContainerId = "svg-container" + this.props.idx;

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
    const dataGroups = [new DataGroup("", data)];
    drawLineChart(
      this.svgContainerId,
      WIDTH,
      HEIGHT,
      dataGroups,
      true,
      true,
      getUnit(this.props.sourceSeries),
      this.props.hasClickableDots ? this.handleDotClick : null
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
  
  private handleDotClick = (dotData: DotDataPoint): void => {
    const date = dotData.label;
    const obsDcid = this.state.dateToDcid[date];
    this.updateErrorMessage("");
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
