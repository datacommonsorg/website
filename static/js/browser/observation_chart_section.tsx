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

import { getUnit, loadSpinner, removeSpinner } from "./util";

import { ObservationChart } from "./observation_chart";
import React from "react";
import { SourceSeries } from "../shared/stat_types";
import _ from "lodash";
import axios from "axios";
import _ from "lodash";
import React from "react";

import { randDomId } from "../shared/util";
import { ObservationChart } from "./observation_chart";
import { SourceSeries } from "./types";
import { getUnit, loadSpinner, removeSpinner } from "./util";

const IGNORED_SOURCE_SERIES_MMETHODS = new Set([
  "GoogleKGHumanCurated",
  "HumanCuratedStats",
]);

interface ObservationChartSectionPropType {
  placeDcid: string;
  statVarId: string;
  placeName: string;
  statVarName?: string;
}

interface ObservationChartSectionStateType {
  data: Array<SourceSeries>;
  infoMessage: string;
  errorMessage: string;
  obsDcidMapping: {
    [mmethod: string]: { [obsPeriod: string]: { [date: string]: string } };
  };
}

export class ObservationChartSection extends React.Component<
  ObservationChartSectionPropType,
  ObservationChartSectionStateType
> {
  private containerId: string;
  constructor(props: ObservationChartSectionPropType) {
    super(props);
    this.state = {
      data: [],
      errorMessage: "",
      infoMessage: "",
      obsDcidMapping: {},
    };
    this.containerId = randDomId();
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    return (
      <div
        id={this.containerId}
        className="loading-spinner-container chart-section"
      >
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
                {sourceSeries.measurementMethod && (
                  <p className="metadata">
                    measurementMethod: {sourceSeries.measurementMethod}
                  </p>
                )}
                {sourceSeries.observationPeriod && (
                  <p className="metadata">
                    observationPeriod: {sourceSeries.observationPeriod}
                  </p>
                )}
                {unit && <p className="metadata">unit: {unit}</p>}
              </div>
              <ObservationChart
                sourceSeries={sourceSeries}
                idx={index}
                statVarId={this.props.statVarId}
                placeDcid={this.props.placeDcid}
                canClickObs={true}
                statVarName={this.props.statVarName}
              />
              <p className="metadata">
                provenance: {sourceSeries.provenanceDomain}
              </p>
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
    loadSpinner(this.containerId);
    axios
      .get(
        `/api/stats/all?places=${this.props.placeDcid}&statVars=${this.props.statVarId}`
      )
      .then((resp) => {
        removeSpinner(this.containerId);
        const sourceSeries =
          resp.data.placeData[this.props.placeDcid].statVarData[
            this.props.statVarId
          ].sourceSeries;
        const filteredSourceSeries = sourceSeries.filter(
          (series) =>
            !series.measurementMethod ||
            !IGNORED_SOURCE_SERIES_MMETHODS.has(series.measurementMethod)
        );
        this.setState({
          data: filteredSourceSeries,
          infoMessage: _.isEmpty(filteredSourceSeries)
            ? `No charts for ${this.props.statVarId} in ${this.props.placeName}`
            : "",
        });
      })
      .catch(() => {
        removeSpinner(this.containerId);
        this.setState({
          errorMessage: "Error retrieving observation charts data.",
        });
      });
  }
}
