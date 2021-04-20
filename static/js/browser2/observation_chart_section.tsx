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
 * Component for rendering the observation charts for a place stat var.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";
import { ObservationChart } from "./observation_chart";
import { getUnit, loadSpinner, removeSpinner, SourceSeries } from "./util";

const LOADING_CONTAINER_ID = "observation-chart-section";

interface ObservationChartSectionPropType {
  placeDcid: string;
  statVarId: string;
  placeName: string;
}

interface ObservationChartSectionStateType {
  data: Array<SourceSeries>;
  infoMessage: string;
  errorMessage: string;
}

export class ObservationChartSection extends React.Component<
  ObservationChartSectionPropType,
  ObservationChartSectionStateType
> {
  constructor(props: ObservationChartSectionPropType) {
    super(props);
    this.state = {
      data: [],
      infoMessage: "",
      errorMessage: "",
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    return (
      <div id={LOADING_CONTAINER_ID} className="loading-spinner-container">
        {!_.isEmpty(this.state.errorMessage) && (
          <div id={"error-message"}>{this.state.errorMessage}</div>
        )}
        {!_.isEmpty(this.state.infoMessage) && (
          <div id={"info-message"}>{this.state.infoMessage}</div>
        )}
        {this.state.data.map((sourceSeries, index) => {
          const unit = getUnit(sourceSeries);
          return (
            <div className="card" key={this.props.statVarId + index}>
              <div className="chart-title">
                <div>
                  {sourceSeries.measurementMethod
                    ? "measurementMethod: " + sourceSeries.measurementMethod
                    : null}
                </div>
                <div>
                  {sourceSeries.observationPeriod
                    ? "observationPeriod: " + sourceSeries.observationPeriod
                    : null}
                </div>
                <div>{unit ? "unit: " + unit : null}</div>
              </div>
              <ObservationChart
                sourceSeries={sourceSeries}
                idx={index}
                statVarId={this.props.statVarId}
                placeDcid={this.props.placeDcid}
                canClickObs={true}
              />
              <div>{"provenance: " + sourceSeries.provenanceDomain}</div>
            </div>
          );
        })}
        <div id="browser-screen" className="screen">
          <div id="spinner"></div>
        </div>
      </div>
    );
  }

  private fetchData(): void {
    loadSpinner(LOADING_CONTAINER_ID);
    axios
      .get(
        `/api/stats/all?places=${this.props.placeDcid}&statVars=${this.props.statVarId}`
      )
      .then((resp) => {
        removeSpinner(LOADING_CONTAINER_ID);
        const sourceSeries =
          resp.data.placeData[this.props.placeDcid].statVarData[
            this.props.statVarId
          ].sourceSeries;
        this.setState({
          data: sourceSeries,
          infoMessage: _.isEmpty(sourceSeries)
            ? `No charts for ${this.props.statVarId} in ${this.props.placeName}`
            : "",
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving observation charts data.",
        });
      });
  }
}
