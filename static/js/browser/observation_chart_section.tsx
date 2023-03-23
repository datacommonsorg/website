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

import axios from "axios";
import _ from "lodash";
import React from "react";

import {
  Series,
  SeriesAllApiResponse,
  StatMetadata,
} from "../shared/stat_types";
import { loadSpinner, randDomId, removeSpinner } from "../shared/util";
import { stringifyFn } from "../utils/axios";
import { getUnit } from "../utils/stat_metadata_utils";
import { ObservationChart } from "./observation_chart";

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
  seriesList: Series[];
  facets: Record<string, StatMetadata>;
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
      errorMessage: "",
      facets: {},
      infoMessage: "",
      obsDcidMapping: {},
      seriesList: [],
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
        {this.state.seriesList.map((series, index) => {
          const metadata = this.state.facets[series.facet];
          const unit = getUnit(metadata);
          return (
            <div className="card" key={this.props.statVarId + index}>
              <div className="chart-title">
                {metadata.measurementMethod && (
                  <p className="metadata">
                    measurementMethod: {metadata.measurementMethod}
                  </p>
                )}
                {metadata.observationPeriod && (
                  <p className="metadata">
                    observationPeriod: {metadata.observationPeriod}
                  </p>
                )}
                {unit && <p className="metadata">unit: {unit}</p>}
              </div>
              <ObservationChart
                series={series}
                metadata={metadata}
                idx={index}
                statVarId={this.props.statVarId}
                placeDcid={this.props.placeDcid}
                canClickObs={true}
                statVarName={this.props.statVarName}
              />
              <p className="metadata">provenance: {metadata.provenanceUrl}</p>
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
      .get<SeriesAllApiResponse>("/api/observations/series/all", {
        params: {
          entities: [this.props.placeDcid],
          variables: [this.props.statVarId],
        },
        paramsSerializer: stringifyFn,
      })
      .then((resp) => {
        removeSpinner(this.containerId);
        const observationSeries: SeriesAllApiResponse = resp.data;
        const facets = observationSeries.facets;
        const seriesList =
          observationSeries.data[this.props.statVarId][this.props.placeDcid];
        const filteredSeries: Series[] = [];
        if (!_.isEmpty(seriesList)) {
          for (const series of seriesList) {
            const mm = facets[series.facet].measurementMethod;
            if (!(mm && IGNORED_SOURCE_SERIES_MMETHODS.has(mm))) {
              filteredSeries.push(series);
            }
          }
        }
        this.setState({
          seriesList: filteredSeries,
          facets: facets,
          infoMessage: _.isEmpty(filteredSeries)
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
