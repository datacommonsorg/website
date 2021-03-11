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
import { SourceSeries } from "./util";

const WEATHER_PROPERTY_NAMES = [
  "temperature",
  "visibility",
  "rainfall",
  "snowfall",
  "barometricPressure",
];

interface WeatherChartSectionPropType {
  dcid: string;
}

interface WeatherChartSectionStateType {
  data: { [weatherProp: string]: SourceSeries };
}

export class WeatherChartSection extends React.Component<
  WeatherChartSectionPropType,
  WeatherChartSectionStateType
> {
  constructor(props: WeatherChartSectionPropType) {
    super(props);
    this.state = {
      data: {},
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.data)) {
      return null;
    }
    return (
      <>
        {Object.keys(this.state.data).map((measuredProperty, index) => {
          return (
            <div className="card" key={measuredProperty}>
              <div className="chart-title">{measuredProperty}</div>
              <ObservationChart
                sourceSeries={this.state.data[measuredProperty]}
                idx={index}
                statVarId={measuredProperty}
                placeDcid={this.props.dcid}
                canClickDots={false}
              />
            </div>
          );
        })}
      </>
    );
  }

  private fetchData(): void {
    const weatherPromises = WEATHER_PROPERTY_NAMES.map((prop) => {
      return axios
        .get(`/weather?dcid=${this.props.dcid}&prop=${prop}`)
        .then((resp) => resp.data);
    });
    Promise.all(weatherPromises).then((weatherPromisesData) => {
      const propToSourceSeries = {};
      weatherPromisesData.forEach((weatherData) => {
        if (_.isEmpty(weatherData)) {
          return;
        }
        const values = {};
        weatherData.forEach((data) => {
          values[data.observationDate] = data.meanValue;
        });
        const sourceSeries = {
          unit: weatherData[0].unit,
          provenanceDomain: "",
          val: values,
        };
        propToSourceSeries[weatherData[0].measuredProperty] = sourceSeries;
      });
      this.setState({
        data: propToSourceSeries,
      });
    });
  }
}
