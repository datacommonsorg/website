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
 * Component for rendering charts for various weather related properties.
 */

import axios from "axios";
import _ from "lodash";
import React from "react";

import { SourceSeries } from "../shared/stat_types";
import { loadSpinner, removeSpinner } from "../shared/util";
import { ObservationChart } from "./observation_chart";
import { getUnit } from "./util";

const WEATHER_PROPERTY_NAMES = [
  "temperature",
  "visibility",
  "rainfall",
  "snowfall",
  "barometricPressure",
];
const LOADING_CONTAINER_ID = "weather-chart-section";

interface WeatherChartSectionPropType {
  dcid: string;
  provDomain: { [key: string]: URL };
}

interface WeatherChartSectionStateType {
  data: SourceSeries[];
  errorMessage: string;
}

export class WeatherChartSection extends React.Component<
  WeatherChartSectionPropType,
  WeatherChartSectionStateType
> {
  constructor(props: WeatherChartSectionPropType) {
    super(props);
    this.state = {
      data: [],
      errorMessage: "",
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (!_.isEmpty(this.state.errorMessage)) {
      return <div className="error-message">{this.state.errorMessage}</div>;
    }
    return (
      <div
        id={LOADING_CONTAINER_ID}
        className="loading-spinner-container chart-section"
      >
        {this.state.data.map((sourceSeries, index) => {
          const unit = getUnit(sourceSeries);
          const measuredProperty = sourceSeries.mprop;
          let title = measuredProperty;
          if (unit) {
            title = title + ` (${unit})`;
          }
          return (
            <div className="card" key={measuredProperty + index}>
              <div className="chart-title">
                <p className="metadata">{title}</p>
              </div>
              <ObservationChart
                sourceSeries={sourceSeries}
                key={index}
                idx={index}
                statVarId={measuredProperty}
                placeDcid={this.props.dcid}
                canClickObs={false}
              />
              {!_.isEmpty(sourceSeries.provenanceDomain) && (
                <p className="metadata">
                  provenance: {sourceSeries.provenanceDomain}
                </p>
              )}
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
    const weatherPromises = [];
    for (const prop of WEATHER_PROPERTY_NAMES) {
      for (const period of ["Daily", "Monthly"]) {
        weatherPromises.push(
          axios
            .get(
              `/weather?dcid=${this.props.dcid}&prop=${prop}&period=${period}`
            )
            .then((resp) => resp.data)
        );
      }
    }
    loadSpinner(LOADING_CONTAINER_ID);
    Promise.all(weatherPromises)
      .then((weatherPromisesData) => {
        const allSourceSeries = [];
        weatherPromisesData.forEach((weatherData) => {
          if (_.isEmpty(weatherData)) {
            return;
          }
          const values = {};
          let provId = "";
          weatherData.forEach((data) => {
            values[data.observationDate] = data.meanValue;
            if (_.isEmpty(provId)) {
              provId = data.provId;
            }
          });
          const provenanceDomain =
            provId in this.props.provDomain
              ? this.props.provDomain[provId]
              : "";
          const sourceSeries = {
            mprop: weatherData[0].measuredProperty,
            provenanceDomain,
            unit: weatherData[0].unit,
            val: values,
          };
          allSourceSeries.push(sourceSeries);
        });
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          data: allSourceSeries,
        });
      })
      .catch(() => {
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          errorMessage: "Error retrieving weather data.",
        });
      });
  }
}
