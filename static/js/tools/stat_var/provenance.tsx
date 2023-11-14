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

/**
 * Provenance table component for Stat Var Explorer.
 */

import React, { Component } from "react";

import { formatNumber } from "../../i18n/i18n";
import { ProvenanceSummary } from "../../shared/types";
import { urlToDisplayText } from "../../shared/util";

interface ProvenancePropType {
  provId: string;
  summary: ProvenanceSummary;
  url: string;
}

class Provenance extends Component<ProvenancePropType, unknown> {
  render(): JSX.Element {
    return (
      <div className="card p-0">
        <div className="provenance-summary">
          <h4>{this.props.summary.importName}</h4>
          <ul className="detail-text">
            <li>
              dcid:{" "}
              <a
                href={`/browser/${this.props.provId}`}
                target="_blank"
                rel="noreferrer"
              >
                {this.props.provId}
              </a>
            </li>
            {this.props.url && (
              <li>
                Source:{" "}
                <a href={this.props.url} target="_blank" rel="noreferrer">
                  {urlToDisplayText(this.props.url)}
                </a>
              </li>
            )}
            <li>
              Total observations:{" "}
              {formatNumber(this.props.summary.observationCount, "", true)}
            </li>
            <li>
              Total time series:{" "}
              {formatNumber(this.props.summary.timeSeriesCount, "", true)}
            </li>
            {this.props.summary.releaseFrequency && (
              <li>Release frequency: {this.props.summary.releaseFrequency}</li>
            )}
          </ul>
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
                    <ul className="detail-text">
                      {element.seriesKey.measurementMethod && (
                        <li>
                          Measurement method:{" "}
                          {element.seriesKey.measurementMethod}
                        </li>
                      )}
                      {element.seriesKey.observationPeriod && (
                        <li>
                          Observation period:{" "}
                          {element.seriesKey.observationPeriod}
                        </li>
                      )}
                      {element.seriesKey.scalingFactor && (
                        <li>
                          Scaling factor: {element.seriesKey.scalingFactor}
                        </li>
                      )}
                      {element.seriesKey.unit && (
                        <li>Unit: {element.seriesKey.unit}</li>
                      )}
                      {element.seriesKey.isDcAggregate && (
                        <li className="dc-aggregate">Data Commons Aggregate</li>
                      )}
                    </ul>
                  </td>
                  <td className="number-column">
                    {formatNumber(element.observationCount, "", true)}
                  </td>
                  <td className="number-column">
                    {formatNumber(element.timeSeriesCount, "", true)}
                  </td>
                  <td>
                    <span>{element.earliestDate}</span>
                    <span id="date-range-separator"> – </span>
                    <span>{element.latestDate}</span>
                  </td>
                  <td className="type-column">
                    <ul>
                      {this.getPlaceTypes(index).map((placeType) => {
                        return <li key={placeType}>{placeType}</li>;
                      })}
                    </ul>
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
