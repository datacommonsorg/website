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
import { getUnit, removeLoadingMessage, SourceSeries } from "./util";

const NO_MMETHOD_KEY = "no_mmethod";
const NO_OBSPERIOD_KEY = "no_obsPeriod";

interface ObservationChartSectionPropType {
  placeDcid: string;
  statVarId: string;
  placeName: string;
  statVarName?: string;
}

interface ObservationChartSectionStateType {
  data: Array<SourceSeries>;
  infoMessage: string;
  obsDcidMapping: {
    [mmethod: string]: { [obsPeriod: string]: { [date: string]: string } };
  };
}

export class ObservationChartSection extends React.Component<
  ObservationChartSectionPropType,
  ObservationChartSectionStateType
> {
  constructor(props: ObservationChartSectionPropType) {
    super(props);
    this.state = {
      data: [],
      infoMessage: "Loading Charts...",
      obsDcidMapping: {},
    };
  }

  componentDidMount(): void {
    this.fetchData();
    this.fetchObsDcidMap();
  }

  render(): JSX.Element {
    if (_.isEmpty(this.state.data)) {
      return <div id={"info-message"}>{this.state.infoMessage}</div>;
    }
    return (
      <>
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
            ? `No charts for ${this.props.statVarId} in ${this.props.placeName}`
            : "",
        });
      })
      .catch(() => {
        removeLoadingMessage();
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
