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
import { removeLoadingMessage, SourceSeries } from "./util";

interface ObservationChartSectionPropType {
  placeDcid: string;
  statVarId: string;
  placeName: string;
}

interface ObservationChartSectionStateType {
  data: Array<SourceSeries>;
  infoMessage: string;
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
    };
  }

  componentDidMount(): void {
    this.fetchData();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.data)) {
      return <div id={"info-message"}>{this.state.infoMessage}</div>;
    }
    return (
      <>
        {this.state.data.map((sourceSeries, index) => {
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
                <div>{"provenance: " + sourceSeries.provenanceDomain}</div>
              </div>
              <ObservationChart
                sourceSeries={sourceSeries}
                idx={index}
                statVarId={this.props.statVarId}
                placeDcid={this.props.placeDcid}
                canClickDots={true}
              />
            </div>
          );
        })}
      </>
    );
  }

  private fetchData(): void {
    axios
      .get(
        `/api/stats/all?places=${this.props.placeDcid}&statVars=${this.props.statVarId}`
      )
      .then((resp) => {
        removeLoadingMessage();
        const sourceSeries =
          resp.data.placeData[this.props.placeDcid].statVarData[
            this.props.statVarId
          ].sourceSeries;
        this.setState({
          data: sourceSeries,
          infoMessage: _.isEmpty(sourceSeries)
            ? this.props.statVarId +
              " is not a statistical variable for " +
              this.props.placeName
            : "",
        });
      })
      .catch(() => {
        removeLoadingMessage();
      });
  }
}
