/**
 * Copyright 2021 Google LLC
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

import React, { Component } from "react";
import { formatNumber } from "../../i18n/i18n";
import { ProvenanceSummary } from "../../shared/types";

interface ProvenancePropType {
  provId: string;
  summary: ProvenanceSummary;
}

class Provenance extends Component<ProvenancePropType, unknown> {
  render(): JSX.Element {
    return (
      <div className="card p-0">
        <div className="provenance-summary">
          <h4>{this.props.summary.importName}</h4>
          <div className="detail-text">
            <div>
              dcid:{" "}
              <a
                href={`/browser/${this.props.provId}`}
                target="_blank"
                rel="noreferrer"
              >
                {this.props.provId}
              </a>
            </div>
            <div>Total observations: {this.props.summary.numObservations}</div>
            <div>Total time series: {this.props.summary.numTimeSeries}</div>
            {this.props.summary.releaseFrequency && (
              <div>
                Release frequency: {this.props.summary.releaseFrequency}
              </div>
            )}
          </div>
        </div>
        <table className="node-table">
          <tbody>
            <tr key="header">
              <th className="series-key-column">Series Key</th>
              <th className="number-column">Total Observations</th>
              <th className="number-column">Observed Places</th>
              <th>Date Range</th>
              <th className="type-column">Place Types</th>
            </tr>
            {this.props.summary.seriesSummary.map((element, index) => {
              return (
                <tr key={JSON.stringify(element.seriesKey)}>
                  <td className="series-key-column">
                    {Object.keys(element.seriesKey).length === 0 && (
                      <div>--</div>
                    )}
                    <div className="detail-text">
                      {element.seriesKey.measurementMethod && (
                        <div>
                          Measurement method:{" "}
                          {element.seriesKey.measurementMethod}
                        </div>
                      )}
                      {element.seriesKey.observationPeriod && (
                        <div>
                          Observation period:{" "}
                          {element.seriesKey.observationPeriod}
                        </div>
                      )}
                      {element.seriesKey.scalingFactor && (
                        <div>
                          Scaling factor: {element.seriesKey.scalingFactor}
                        </div>
                      )}
                      {element.seriesKey.unit && (
                        <div>Unit: {element.seriesKey.unit}</div>
                      )}
                      {element.seriesKey.isDcAggregate && (
                        <div className="dc-aggregate">
                          Data Commons Aggregate
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="number-column">
                    {formatNumber(element.numObservations)}
                  </td>
                  <td className="number-column">
                    {formatNumber(element.numTimeSeries)}
                  </td>
                  <td>
                    <span>{element.earliestDate}</span>
                    <span id="date-range-separator"> – </span>
                    <span>{element.latestDate}</span>
                  </td>
                  <td className="type-column">
                    <div>
                      {this.getPlaceTypes(index).map((placeType) => {
                        return <div key={placeType}>{placeType}</div>;
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  private getPlaceTypes(i: number): Array<string> {
    const placeTypes = [];
    for (const placeType in this.props.summary.seriesSummary[i]
      .placeTypeSummary) {
      placeTypes.push(placeType);
    }
    placeTypes.sort();
    return placeTypes;
  }
}

export { Provenance, ProvenancePropType };
