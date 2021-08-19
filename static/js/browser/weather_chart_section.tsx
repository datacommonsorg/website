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

import React from "react";
import axios from "axios";
import _ from "lodash";
import { ObservationChart } from "./observation_chart";
import { getUnit, loadSpinner, removeSpinner } from "./util";
import { SourceSeries } from "./types";

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
  data: { [weatherProp: string]: SourceSeries };
  errorMessage: string;
}

export class WeatherChartSection extends React.Component<
  WeatherChartSectionPropType,
  WeatherChartSectionStateType
> {
  constructor(props: WeatherChartSectionPropType) {
    super(props);
    this.state = {
      data: {},
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
        {Object.keys(this.state.data).map((measuredProperty, index) => {
          const unit = getUnit(this.state.data[measuredProperty]);
          let title = measuredProperty;
          if (unit) {
            title = title + ` (${unit})`;
          }
          const sourceSeries = this.state.data[measuredProperty];
          return (
            <div className="card" key={measuredProperty}>
              <div className="chart-title">
                <p className="metadata">{title}</p>
              </div>
              <ObservationChart
                sourceSeries={sourceSeries}
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
    for (const period of ["Daily", "Monthly"]) {
      weatherPromises.concat(
        WEATHER_PROPERTY_NAMES.map((prop) => {
          return axios
            .get(
              `/weather?dcid=${this.props.dcid}&prop=${prop}&period=${period}`
            )
            .then((resp) => resp.data);
        })
      );
    }
    loadSpinner(LOADING_CONTAINER_ID);
    Promise.all(weatherPromises)
      .then((weatherPromisesData) => {
        const propToSourceSeries = {};
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
            provenanceDomain,
            unit: weatherData[0].unit,
            val: values,
          };
          propToSourceSeries[weatherData[0].measuredProperty] = sourceSeries;
        });
        removeSpinner(LOADING_CONTAINER_ID);
        this.setState({
          data: propToSourceSeries,
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
