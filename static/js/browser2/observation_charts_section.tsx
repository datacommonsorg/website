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
 * Component for rendering the in and out arc sections of the page.
 */

import React from "react";
import axios from "axios";
import _ from "lodash";
import { ObservationChart } from "./observation_chart";

interface ObservationChartSectionPropType {
  placeDcid: string;
  statVarId: string;
  placeName: string;
}

interface ObservationChartSectionStateType {
  data: Array<any>;
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
            <ObservationChart
              sourceSeries={sourceSeries}
              idx={index}
              statVarId={this.props.statVarId}
              placeDcid={this.props.placeDcid}
              key={this.props.statVarId + index}
            />
          );
        })}
      </>
    );
  }

  private fetchData(): void {
    const statsPromise = axios
      .get(
        `/api/stats/all?places=${this.props.placeDcid}&stat_vars=${this.props.statVarId}`
      )
      .then((resp) => resp.data);
    statsPromise
      .then((data) => {
        this.removeLoadingMessage();
        const sourceSeries =
          data.placeData[this.props.placeDcid].statVarData[this.props.statVarId]
            .sourceSeries;
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
        this.removeLoadingMessage();
      });
  }

  private removeLoadingMessage(): void {
    const loadingElem = document.getElementById("page-loading");
    if (loadingElem) {
      loadingElem.style.display = "none";
    }
  }
}
