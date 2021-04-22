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
import { randDomId } from "../shared/util";

const NO_MMETHOD_KEY = "no_mmethod";
const NO_OBSPERIOD_KEY = "no_obsPeriod";
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
    this.fetchObsDcidMap();
  }

  render(): JSX.Element {
    return (
      <div id={this.containerId} className="loading-spinner-container">
        {!_.isEmpty(this.state.errorMessage) && (
          <div id={"error-message"}>{this.state.errorMessage}</div>
        )}
        {!_.isEmpty(this.state.infoMessage) && (
          <div id={"info-message"}>{this.state.infoMessage}</div>
        )}
        {this.state.data.map((sourceSeries, index) => {
          const unit = getUnit(sourceSeries);
          const mmethod = sourceSeries.measurementMethod
            ? sourceSeries.measurementMethod
            : NO_MMETHOD_KEY;
          const obsPeriod = sourceSeries.observationPeriod
            ? sourceSeries.observationPeriod
            : NO_OBSPERIOD_KEY;
          const dateToDcid =
            mmethod in this.state.obsDcidMapping
              ? this.state.obsDcidMapping[mmethod][obsPeriod]
              : {};
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
                statVarName={this.props.statVarName}
                dateToDcid={dateToDcid}
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

  private fetchObsDcidMap(): void {
    axios
      .get(
        `/api/browser/observation-ids-map?place=${this.props.placeDcid}&statVar=${this.props.statVarId}`
      )
      .then((resp) => {
        this.setState({
          obsDcidMapping: resp.data,
        });
      })
      .catch(() => {
        this.setState({
          obsDcidMapping: {},
        });
      });
  }
}
